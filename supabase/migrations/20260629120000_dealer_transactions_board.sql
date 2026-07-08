-- ============================================================================
-- 88 Title - Dealer transactions become an outstanding-work board
--
-- The dealer portal's transaction scaffold (20260617120000_dealer_portal.sql)
-- grows into the artifact a title clerk actually works from: a board of active
-- work with a real status progression, the stock number a dealership tracks by,
-- a "problem title" attention flag staff can raise, and a structured VIN (with
-- the year/make/model an NHTSA decode returns) alongside the free-text vehicle.
--
-- This migration is ADDITIVE and forward-only: it only adds columns, remaps the
-- legacy status values in place (no data loss), and swaps the status CHECK. It is
-- idempotent (IF NOT EXISTS guards, guarded constraint add) and re-runnable.
--
-- ----------------------------------------------------------------------------
-- STATUS MODEL (this is the crux)
-- ----------------------------------------------------------------------------
-- The progression a dealership recognizes, in order:
--
--   submitted -> received -> in_progress -> ready_for_pickup -> picked_up
--
-- NEEDS-ATTENTION is deliberately NOT a status. It is an orthogonal FLAG
-- (needs_attention boolean + attention_note text) a clerk can raise on a
-- transaction in ANY stage - the "problem title" state - so the work keeps its
-- real position in the pipeline while still shouting for attention. This is the
-- clean successor to the old 'docs_needed' status, which conflated the two.
--
-- Legacy remap (only touches rows still on the old vocabulary):
--   received      -> received      (unchanged)
--   in_progress   -> in_progress   (unchanged)
--   docs_needed   -> in_progress + needs_attention=true (note -> attention_note)
--   ready         -> ready_for_pickup
--   complete      -> picked_up
--
-- The old docs_needed_note column is RETAINED (forward-only never drops data);
-- its contents are copied into attention_note and it is no longer written.
--
-- ----------------------------------------------------------------------------
-- SECURITY (unchanged isolation, tightened writes)
-- ----------------------------------------------------------------------------
-- RLS is untouched: dealers still SELECT/INSERT only their own rows and have NO
-- UPDATE path; staff UPDATE everything (see 20260617120000). The new columns are
-- ordinary columns on the same rows, so row visibility is unchanged.
--
-- One addition hardens the "staff-gated writes for status/attention" rule at the
-- database: a BEFORE INSERT trigger forces every DEALER-originated insert to
-- status='submitted', needs_attention=false, attention_note=null. So even a
-- dealer calling the data API directly cannot file a row that is already "ready"
-- or pre-flagged. Staff inserts (is_staff()) pass through untouched.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. New columns (all additive, all idempotent)
-- ----------------------------------------------------------------------------
alter table public.dealer_transactions
  -- The dealership's own identifier for the deal. First-class: shown everywhere
  -- on the board and the staff console. Dealers speak in stock numbers.
  add column if not exists stock_number text,
  -- The "problem title" flag + the staff note explaining it. Orthogonal to
  -- status; settable only by staff.
  add column if not exists needs_attention boolean not null default false,
  add column if not exists attention_note text,
  -- Structured VIN + the fields an NHTSA vPIC decode returns, stored so the board
  -- can show a real "2021 Toyota Camry" even when the free-text field is terse.
  add column if not exists vin text,
  add column if not exists vehicle_year integer,
  add column if not exists vehicle_make text,
  add column if not exists vehicle_model text;

-- status_updated_at: when the status last moved, for the board's "days since"
-- and staff triage. Added nullable, backfilled to created_at (so existing rows
-- read as "no movement since filing"), then defaulted + NOT NULL. Wrapped so the
-- backfill runs ONLY on first creation and a re-run never clobbers real values.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dealer_transactions'
      and column_name = 'status_updated_at'
  ) then
    alter table public.dealer_transactions add column status_updated_at timestamptz;
    update public.dealer_transactions
      set status_updated_at = created_at
      where status_updated_at is null;
    alter table public.dealer_transactions
      alter column status_updated_at set default now();
    alter table public.dealer_transactions
      alter column status_updated_at set not null;
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- 2. Status remap + new CHECK
-- ----------------------------------------------------------------------------
-- Drop the old inline CHECK (Postgres auto-named it <table>_<column>_check) so
-- the legacy values can be rewritten, then re-add the new one guarded.
alter table public.dealer_transactions
  drop constraint if exists dealer_transactions_status_check;

-- Preserve the "problem" signal: an old docs_needed row keeps its note as an
-- attention_note and re-enters the pipeline at in_progress. coalesce guards a
-- re-run (attention_note already set) and a null docs_needed_note.
update public.dealer_transactions
  set needs_attention = true,
      attention_note = coalesce(attention_note, docs_needed_note)
  where status = 'docs_needed';
update public.dealer_transactions set status = 'in_progress'      where status = 'docs_needed';
update public.dealer_transactions set status = 'ready_for_pickup' where status = 'ready';
update public.dealer_transactions set status = 'picked_up'        where status = 'complete';

-- New rows start at the true beginning of the pipeline.
alter table public.dealer_transactions alter column status set default 'submitted';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'dealer_transactions_status_check'
  ) then
    alter table public.dealer_transactions
      add constraint dealer_transactions_status_check
      check (status in ('submitted', 'received', 'in_progress', 'ready_for_pickup', 'picked_up'));
  end if;
end$$;

comment on column public.dealer_transactions.stock_number is
  'Dealership''s own stock number for the deal. First-class, shown on the board and staff console.';
comment on column public.dealer_transactions.needs_attention is
  'The "problem title" flag. Orthogonal to status; staff-only write. Successor to the old docs_needed status.';
comment on column public.dealer_transactions.attention_note is
  'Staff note explaining a needs_attention flag (what the dealer must resolve). Carries the old docs_needed_note text.';
comment on column public.dealer_transactions.status_updated_at is
  'When status last changed. Backfilled to created_at; bumped by the status-change action. Drives the board''s "days since".';
comment on column public.dealer_transactions.vin is
  'Structured VIN. Decoded (client, NHTSA vPIC) into vehicle_year/make/model; the free-text vehicle_description is kept alongside.';
comment on column public.dealer_transactions.docs_needed_note is
  'DEPRECATED. Superseded by attention_note (data was copied over in 20260629120000). Retained, not dropped, and no longer written.';

create index if not exists dealer_transactions_status_idx
  on public.dealer_transactions (status);

-- ----------------------------------------------------------------------------
-- 3. Staff-gated writes: a BEFORE INSERT guard on dealer-originated rows
-- ----------------------------------------------------------------------------
-- Row visibility and the staff-only UPDATE policy already live in RLS. This adds
-- the missing piece so status/attention are truly staff-gated: a non-staff
-- (dealer) INSERT is normalized to a fresh, unflagged, "submitted" row no matter
-- what the client sent. SECURITY DEFINER with an empty search_path, matching the
-- dealers column-guard trigger in 20260617120000.
create or replace function public.dealer_transactions_guard_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_staff() then
    return new;  -- staff may file at any status / pre-flag attention
  end if;
  new.status := 'submitted';
  new.needs_attention := false;
  new.attention_note := null;
  new.status_updated_at := now();
  return new;
end;
$$;

drop trigger if exists dealer_transactions_guard_insert on public.dealer_transactions;
create trigger dealer_transactions_guard_insert
  before insert on public.dealer_transactions
  for each row
  execute function public.dealer_transactions_guard_insert();

-- No grant changes: the new columns inherit the table-level SELECT/INSERT/UPDATE
-- grants (authenticated) that RLS then constrains; anon still has nothing.
