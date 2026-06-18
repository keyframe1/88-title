-- ============================================================================
-- 88 Title - Staff-only OMV reference codes
-- One table (public.omv_reference) holding the OMV codes a clerk keys in at the
-- terminal, grouped by transaction type. Staff-only at every layer; never anon,
-- never customer-facing, never in the public check-in board.
--
-- This migration is idempotent and forward-only: it can be re-run safely
-- (CREATE ... IF NOT EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS before
-- CREATE POLICY, an INSERT ... ON CONFLICT DO NOTHING seed) and it never drops
-- data. Critically, re-running NEVER overwrites a code the team has filled in:
-- the seed only inserts the empty slots, and DO NOTHING leaves existing rows
-- (including any code typed since) untouched.
--
-- It depends on the dealer-portal migration (20260617120000_dealer_portal.sql)
-- for public.is_staff() - the SAME staff-role helper the dealer portal and the
-- check-in queue console use, reused here unchanged. Migrations are applied in
-- filename order, so is_staff() already exists.
--
-- ----------------------------------------------------------------------------
-- SECURITY MODEL (read this before changing anything below)
-- ----------------------------------------------------------------------------
-- This table is a back-office cheat sheet. It holds no customer PII, but it is
-- still STAFF-ONLY: it should be readable only by an authenticated staff member
-- (the is_staff() gate) and writable only by staff or the service role. It is
-- the same trust model as staff_users / the staff branch of checkins:
--
--   * STAFF (authenticated + in staff_users) - reused is_staff(). May read every
--     row and (for a future in-app editor) insert/update/delete.
--   * THE PUBLIC (anon) - gets NOTHING. No grant, no policy. `select * from
--     public.omv_reference` as anon is a hard privilege error (see the proof in
--     docs/omv-reference.md). The table is not added to any view and not added to
--     the supabase_realtime publication, so it can never reach the public board
--     or an anon realtime payload.
--   * The service ("secret") key bypasses RLS and is what the team uses to edit
--     codes in the Supabase dashboard for now. The web app authenticates with the
--     publishable/anon key, so every web request is RLS-constrained.
--
-- INTENTIONALLY EMPTY AT LAUNCH: the seed creates the labeled slots (so staff can
-- see WHERE each code goes) with every `code` value NULL. Real values are filled
-- in later from the OMV Policy & Procedures manual. No code is invented here.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table. One row = one labeled code slot for one transaction. A transaction can
-- have many rows (e.g. a transaction code, a document-type code, a fee code).
-- ----------------------------------------------------------------------------
create table if not exists public.omv_reference (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- One of the transaction slugs in lib/checklists.ts. Kept in sync by hand
  -- (SQL can't import TS); the CHECK is the enforcement point. Same set the
  -- checkins table constrains.
  transaction_slug text not null
    check (transaction_slug in (
      'title-transfer', 'new-to-louisiana', 'duplicate-title',
      'inherited-vehicle', 'registration-renewal', 'plates', 'notary'
    )),

  -- Short human label for the slot, e.g. "Transaction code" / "Document type
  -- code" / "Fee code". Describes WHAT kind of code goes here, not the code.
  label            text not null,

  -- The OMV code value. NULL = not configured yet (the launch state for every
  -- row). Filled in later from the OMV manual via the Supabase dashboard.
  code             text,

  -- Optional clarifying note shown next to the code (e.g. "use when financed").
  note             text,

  -- Ordering of the slots within a transaction (ascending).
  display_order    int not null default 0,

  -- Light bounds on hand-entered text (defense, not validation UX).
  constraint omv_reference_label_len check (char_length(label) <= 80),
  constraint omv_reference_code_len  check (code is null or char_length(code) <= 80),
  constraint omv_reference_note_len  check (note is null or char_length(note) <= 400),

  -- One slot per (transaction, label). This is the seed's conflict target, so a
  -- re-run is a no-op that preserves any code already typed for that slot.
  constraint omv_reference_slug_label_key unique (transaction_slug, label)
);

create index if not exists omv_reference_slug_order_idx
  on public.omv_reference (transaction_slug, display_order);

comment on table public.omv_reference is
  'Staff-only OMV reference codes by transaction type. Filled in from the OMV Policy & Procedures manual; ships with empty (NULL) code values. Never anon-readable, never in the public board. See docs/omv-reference.md.';
comment on column public.omv_reference.code is
  'The OMV code value. NULL = not configured yet. Populated by hand in the Supabase dashboard.';

-- ----------------------------------------------------------------------------
-- Keep updated_at fresh on every edit, so the dashboard shows when a code last
-- changed. Plain trigger; search_path pinned empty and now() resolves from the
-- always-present pg_catalog (the SECURITY DEFINER hardening convention).
-- ----------------------------------------------------------------------------
create or replace function public.omv_reference_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists omv_reference_set_updated_at on public.omv_reference;
create trigger omv_reference_set_updated_at
  before update on public.omv_reference
  for each row
  execute function public.omv_reference_touch_updated_at();

-- ----------------------------------------------------------------------------
-- Enable RLS. With RLS on and no matching policy, access is denied by default.
-- Every policy is gated on is_staff(); there is no anon policy at all.
-- ----------------------------------------------------------------------------
alter table public.omv_reference enable row level security;

drop policy if exists omv_reference_select_staff on public.omv_reference;
create policy omv_reference_select_staff
  on public.omv_reference for select to authenticated
  using (public.is_staff());

-- Write policies for a future in-app staff editor. Today the team edits in the
-- Supabase dashboard (service role, which bypasses RLS). Either way: staff only.
drop policy if exists omv_reference_insert_staff on public.omv_reference;
create policy omv_reference_insert_staff
  on public.omv_reference for insert to authenticated
  with check (public.is_staff());

drop policy if exists omv_reference_update_staff on public.omv_reference;
create policy omv_reference_update_staff
  on public.omv_reference for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists omv_reference_delete_staff on public.omv_reference;
create policy omv_reference_delete_staff
  on public.omv_reference for delete to authenticated
  using (public.is_staff());

-- ----------------------------------------------------------------------------
-- Grants. RLS is the gate, but privileges still matter. anon gets NOTHING here
-- (so a raw select is a privilege error, independent of RLS); authenticated gets
-- the verbs RLS then constrains to staff.
-- ----------------------------------------------------------------------------
revoke all on table public.omv_reference from anon;
revoke all on table public.omv_reference from authenticated;
grant select, insert, update, delete on table public.omv_reference to authenticated;

revoke all on function public.omv_reference_touch_updated_at() from public;

-- ----------------------------------------------------------------------------
-- Seed the EMPTY slots. Three labeled slots per transaction, every code NULL -
-- the rows exist only so staff can see where the codes will go. NO real OMV code
-- is written here; values are filled in later from the OMV manual.
--
-- ON CONFLICT (transaction_slug, label) DO NOTHING makes this safe to re-run and,
-- crucially, NEVER clobbers a code the team has already entered for an existing
-- slot. Add or rename slots freely in the dashboard; this seed won't fight you.
-- ----------------------------------------------------------------------------
insert into public.omv_reference (transaction_slug, label, display_order)
select t.slug, s.label, s.ord
from (values
  ('title-transfer'),
  ('new-to-louisiana'),
  ('duplicate-title'),
  ('inherited-vehicle'),
  ('registration-renewal'),
  ('plates'),
  ('notary')
) as t(slug)
cross join (values
  ('Transaction code', 1),
  ('Document type code', 2),
  ('Fee code', 3)
) as s(label, ord)
on conflict (transaction_slug, label) do nothing;
