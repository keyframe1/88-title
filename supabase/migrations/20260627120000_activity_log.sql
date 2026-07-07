-- ============================================================================
-- 88 Title - Append-only staff activity log
--
-- One row per staff action that changed back-office state: a customer/vehicle
-- record edited, a check-in advanced or marked arrived, a dealer transaction's
-- status changed, a counter transaction recorded or voided. It is the durable,
-- staff-only "who did what, when" trail that sits beside the transactions spine -
-- the transactions table answers "what money was collected"; this answers "what
-- did staff touch". The daily ledger stays the exportable financial record; this
-- log is a read-only integrity trail (no CSV/export, deliberately).
--
-- APPEND-ONLY BY CONSTRUCTION. There is a SELECT policy and an INSERT policy
-- (both is_staff()), and NO update or delete policy for anyone - and, defense in
-- depth, authenticated is granted only SELECT + INSERT (never UPDATE/DELETE), so
-- a rewrite attempt is a privilege error, not merely an RLS denial. A row, once
-- written, cannot be altered or removed through the web API. (The service key,
-- used only in the dashboard, still bypasses everything - that is the break-glass
-- path and is out of scope for the app's trust model.)
--
-- This migration is idempotent and forward-only: it can be re-run safely
-- (CREATE ... IF NOT EXISTS, DROP POLICY IF EXISTS before CREATE POLICY, CREATE
-- INDEX IF NOT EXISTS) and it never drops data.
--
-- It depends on:
--   * the dealer-portal migration (20260617120000) for public.is_staff() - the
--     SAME staff-role helper every back-office feature reuses, unchanged here; and
--   * the transactions migration (20260625120000) for public.staff_display_names(),
--     which the read side reuses to resolve the actor uuid to a display name (this
--     migration does NOT re-implement name resolution).
-- Migrations apply in filename order, so both already exist.
--
-- ----------------------------------------------------------------------------
-- SECURITY MODEL (read this before changing anything below)
-- ----------------------------------------------------------------------------
-- Every row names a staff actor and may summarize a customer record, so it is
-- STAFF-ONLY at every layer, the same trust model as transactions / customers:
--
--   * STAFF (authenticated + in staff_users) - reused is_staff(). May SELECT
--     every row and INSERT new rows; may NOT update or delete any row.
--   * THE PUBLIC (anon) - gets NOTHING. No grant, no policy. Not in any view, not
--     in the realtime publication. Note: the customer's own self-service arrival
--     ("I'm here") is deliberately NOT logged - it has no staff actor - so anon
--     never needs and never gets any access here.
--   * The service ("secret") key bypasses RLS and is what the team uses in the
--     Supabase dashboard. The web app authenticates with the publishable/anon
--     key, so every web request is RLS-constrained.
--
-- actor references auth.users; wherever it renders it is resolved to a staff
-- display name via public.staff_display_names() (reused from the transactions
-- migration). A raw UUID is never shown.
-- ============================================================================

create table if not exists public.activity_log (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),

  -- WHO acted. The auth user of the signed-in staff member. Required, and always
  -- set server-side from the session (never client-supplied). Resolved to a
  -- display name at render (never shown raw).
  actor       uuid not null references auth.users (id),

  -- A stable machine key for the action, e.g. 'customer.update',
  -- 'checkin.call_up', 'transaction.void'. Free text on purpose (staff work is
  -- not a closed set); the app writes a small, documented vocabulary.
  action      text not null,

  -- Which system the entity_id points into. One of:
  --   customer | vehicle | checkin | transaction | dealer_transaction
  entity_type text not null,

  -- The affected row's id (uuid across every instrumented table). Nullable so a
  -- log line can outlive a since-deleted record, or describe a non-row event.
  entity_id   uuid,

  -- Human-readable one-liner shown in the activity view (already resolved names /
  -- amounts, no lookups needed to display it).
  summary     text not null,

  -- Optional structured context (ticket code, new status, amount, void reason,
  -- an identifying snapshot of a since-deleted record, ...). Never required.
  detail      jsonb,

  -- Light bounds on hand/served text (defense, not validation UX).
  constraint activity_log_action_len      check (char_length(action) between 1 and 80),
  constraint activity_log_entity_type_len check (char_length(entity_type) between 1 and 40),
  constraint activity_log_summary_len     check (char_length(summary) between 1 and 500)
);

-- Access paths, each mapped to a query the read side runs:
--   * the unfiltered reverse-chron feed (newest first);
--   * the entity-type-filtered feed;
--   * one entity's history (the ledger's "History" affordance).
create index if not exists activity_log_created_idx
  on public.activity_log (created_at desc);
create index if not exists activity_log_entity_type_idx
  on public.activity_log (entity_type, created_at desc);
create index if not exists activity_log_entity_idx
  on public.activity_log (entity_type, entity_id, created_at desc);

comment on table public.activity_log is
  'Append-only staff activity trail (who did what, when) across records, queue, dealer + counter transactions. Staff may SELECT and INSERT; no UPDATE/DELETE policy or grant for anyone (append-only by construction). Never anon-readable, never in any view, never in the realtime publication. Customer self-service arrival is intentionally NOT logged (no actor).';
comment on column public.activity_log.actor is
  'The auth user who performed the action. Always set server-side from the session; rendered as a staff display name via public.staff_display_names(), never a raw UUID.';
comment on column public.activity_log.entity_type is
  'customer | vehicle | checkin | transaction | dealer_transaction - which system entity_id points into.';

-- ----------------------------------------------------------------------------
-- Enable RLS. With RLS on and no matching policy, access is denied by default.
-- There are exactly two policies (SELECT + INSERT), both gated on is_staff().
-- There is deliberately NO update policy and NO delete policy: append-only.
-- ----------------------------------------------------------------------------
alter table public.activity_log enable row level security;

drop policy if exists activity_log_select_staff on public.activity_log;
create policy activity_log_select_staff
  on public.activity_log for select to authenticated
  using (public.is_staff());

drop policy if exists activity_log_insert_staff on public.activity_log;
create policy activity_log_insert_staff
  on public.activity_log for insert to authenticated
  with check (public.is_staff());

-- (No activity_log_update_* / activity_log_delete_* policies, on purpose.)

-- ----------------------------------------------------------------------------
-- Grants. anon gets NOTHING (a raw select is a privilege error, independent of
-- RLS). authenticated gets ONLY select + insert - never update or delete - so an
-- attempt to rewrite history fails at the privilege layer even before RLS, for
-- staff and non-staff alike.
-- ----------------------------------------------------------------------------
revoke all on table public.activity_log from anon;
revoke all on table public.activity_log from authenticated;
grant select, insert on table public.activity_log to authenticated;
