-- ============================================================================
-- 88 Title - Transactions: the auditable spine
--
-- One row per completed piece of counter work, tying together the systems that
-- until now stood apart: the check-in queue (which customer walked in), the
-- customer & vehicle records (who / what), the fee & tax engine (the money), and
-- the DPSMV forms (the paperwork). A transaction is the durable, staff-only
-- record of what was collected, for whom, by whom - the thing a daily
-- reconciliation report is built from.
--
-- This migration is idempotent and forward-only: it can be re-run safely
-- (CREATE ... IF NOT EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS before
-- CREATE POLICY, CREATE INDEX IF NOT EXISTS) and it never drops data.
--
-- It depends on:
--   * the dealer-portal migration (20260617120000) for public.is_staff() and
--     public.staff_users - the SAME staff-role helper every back-office feature
--     reuses, unchanged here; and
--   * the records migration (20260623120000) for public.customers /
--     public.vehicles; and
--   * the check-in-queue migration (20260618120000) for public.checkins.
-- Migrations apply in filename order, so all of those already exist.
--
-- ----------------------------------------------------------------------------
-- SECURITY MODEL (read this before changing anything below)
-- ----------------------------------------------------------------------------
-- A transaction row summarizes money and links to customer PII. It is STAFF-ONLY
-- at every layer, the same trust model as customers / vehicles / tax_rates:
--
--   * STAFF (authenticated + in staff_users) - reused is_staff(). May read and
--     write every row. There is no other authenticated reader: a dealer login is
--     authenticated but not staff, so is_staff() is false and RLS returns nothing.
--   * THE PUBLIC (anon) - gets NOTHING. No grant, no policy. Not in any view, not
--     in the realtime publication. A transaction can never reach a customer-facing
--     surface.
--   * The service ("secret") key bypasses RLS and is what the team uses in the
--     Supabase dashboard. The web app authenticates with the publishable/anon key,
--     so every web request is RLS-constrained.
--
-- ----------------------------------------------------------------------------
-- AUDIT SNAPSHOT (why the money fields are frozen)
-- ----------------------------------------------------------------------------
-- The fee & tax figures are captured AT CREATION and never recomputed. Rates
-- change (the LA state rate steps to 4.75% in 2030; parishes add districts), but
-- a transaction must always show what was actually collected on its day. So the
-- taxable amount, the tax, the itemized service_fees (jsonb), their total, and
-- the grand total are stored values, not derived. The statutory $23 public tag
-- fee is its OWN discrete column (statutory_tag_fee_cents), defaulting to 2300,
-- ALWAYS separate, NEVER merged into another amount - the same compliance rule
-- the fee calculator and the customer pricing page follow. Money is integer
-- CENTS throughout, matching the fee engine.
--
-- processed_by references auth.users; wherever it renders it is resolved to a
-- staff display name (staff_users.full_name, then the auth email) by
-- public.staff_display_names() below. A raw UUID is never shown.
-- ============================================================================

create table if not exists public.transactions (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),

  -- WHO processed it. The auth user of the signed-in staff member. Resolved to a
  -- display name at render (never shown raw). Required.
  processed_by            uuid not null references auth.users (id),

  -- The linked systems. All nullable, all ON DELETE SET NULL: a transaction
  -- outlives the customer/vehicle record or check-in it pointed at (deleting one
  -- of those never deletes the money record; the reference is just cleared).
  customer_id             uuid references public.customers (id) on delete set null,
  vehicle_id              uuid references public.vehicles  (id) on delete set null,
  checkin_id              uuid references public.checkins  (id) on delete set null,

  -- WHAT kind of work (a lib/checklists.ts transaction slug, e.g. title-transfer).
  -- Kept as free text on purpose: staff work is not a closed set and this is a
  -- record, not a menu.
  service_type            text not null,

  status                  text not null default 'open'
                            check (status in ('open', 'completed', 'voided')),

  -- FROZEN money snapshot (see header). Integer cents. The pre-tax figures are
  -- nullable (a notary-only job has no vehicle price); the totals default to 0.
  sale_price_cents        int,
  trade_in_cents          int,
  rebate_cents            int,
  taxable_amount_cents    int,
  tax_cents               int,
  parish                  text,

  -- Itemized 88 Title service fees as they stood at capture: [{id,label,amountCents}].
  service_fees            jsonb not null default '[]',
  service_fee_total_cents int  not null default 0,

  -- The statutory $23 public tag fee: always its own discrete line, never merged.
  statutory_tag_fee_cents int  not null default 2300,

  -- taxes + service fees + the statutory tag fee. What was collected at the counter.
  total_collected_cents   int  not null default 0,

  notes                   text,
  completed_at            timestamptz,
  voided_at               timestamptz,
  void_reason             text,

  -- Light bounds on hand-entered text (defense, not validation UX).
  constraint transactions_service_type_len check (char_length(service_type) between 1 and 80),
  constraint transactions_parish_len       check (parish is null or char_length(parish) <= 80),
  constraint transactions_notes_len        check (notes is null or char_length(notes) <= 2000),
  constraint transactions_void_reason_len  check (void_reason is null or char_length(void_reason) <= 500)
);

-- Day-window range scans for the daily ledger + newest-first browsing; the
-- linkage lookups; and "everything I processed".
create index if not exists transactions_created_idx      on public.transactions (created_at);
create index if not exists transactions_processed_by_idx on public.transactions (processed_by);
create index if not exists transactions_customer_id_idx  on public.transactions (customer_id);
create index if not exists transactions_vehicle_id_idx   on public.transactions (vehicle_id);
create index if not exists transactions_checkin_id_idx   on public.transactions (checkin_id);

comment on table public.transactions is
  'Staff-only auditable transaction spine linking queue + records + fees + forms. Money is FROZEN at creation (audit snapshot, never recomputed). Never anon-readable, never in any view, never in the realtime publication.';
comment on column public.transactions.statutory_tag_fee_cents is
  'The statutory $23 public tag fee, in cents (default 2300). Always its own discrete column, never merged into another amount (the site-wide compliance rule).';
comment on column public.transactions.service_fees is
  'Frozen snapshot of the selected 88 Title service fees at capture: jsonb array of {id,label,amountCents}.';
comment on column public.transactions.processed_by is
  'The auth user who recorded the transaction. Rendered as a staff display name via public.staff_display_names(); never shown as a raw UUID.';

-- ----------------------------------------------------------------------------
-- Enable RLS. With RLS on and no matching policy, access is denied by default.
-- Every policy is gated on is_staff(); there is no anon policy at all.
-- ----------------------------------------------------------------------------
alter table public.transactions enable row level security;

drop policy if exists transactions_select_staff on public.transactions;
create policy transactions_select_staff
  on public.transactions for select to authenticated
  using (public.is_staff());

drop policy if exists transactions_insert_staff on public.transactions;
create policy transactions_insert_staff
  on public.transactions for insert to authenticated
  with check (public.is_staff());

drop policy if exists transactions_update_staff on public.transactions;
create policy transactions_update_staff
  on public.transactions for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists transactions_delete_staff on public.transactions;
create policy transactions_delete_staff
  on public.transactions for delete to authenticated
  using (public.is_staff());

-- ----------------------------------------------------------------------------
-- Grants. RLS is the gate, but privileges still matter. anon gets NOTHING (so a
-- raw select is a privilege error, independent of RLS); authenticated gets the
-- verbs RLS then constrains to staff.
-- ----------------------------------------------------------------------------
revoke all on table public.transactions from anon;
revoke all on table public.transactions from authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;

-- ----------------------------------------------------------------------------
-- Staff display-name resolver.
--
-- processed_by references auth.users, which the web (anon/authenticated) API
-- cannot read directly, and there is no PostgREST FK from transactions to
-- staff_users to embed. So a SECURITY DEFINER helper resolves a batch of auth
-- user ids to display names: staff_users.full_name first, then the auth email as
-- a fallback, then a neutral "Staff" label - so a raw UUID is never surfaced.
--
-- SECURITY DEFINER (owner-run) so it may read auth.users; fixed empty
-- search_path with every name schema-qualified (the SECURITY DEFINER convention
-- throughout this schema). The `where public.is_staff()` clause gates the whole
-- function: a non-staff caller gets zero rows. is_staff() reads the CALLER's
-- auth.uid() (JWT-derived) even inside a definer function, so the gate is correct.
-- Only staff names/emails are ever returned - never customer PII.
-- ----------------------------------------------------------------------------
create or replace function public.staff_display_names(p_ids uuid[])
returns table (auth_user_id uuid, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    coalesce(nullif(btrim(s.full_name), ''), u.email, 'Staff')
  from unnest(coalesce(p_ids, '{}'::uuid[])) as t(id)
  join auth.users u on u.id = t.id
  left join public.staff_users s on s.auth_user_id = u.id
  where public.is_staff();
$$;

comment on function public.staff_display_names(uuid[]) is
  'Resolve a batch of auth user ids to staff display names (staff_users.full_name, then auth email, then "Staff"). SECURITY DEFINER to read auth.users; gated by is_staff() so only staff may call it and only staff names are returned.';

revoke all on function public.staff_display_names(uuid[]) from public;
grant execute on function public.staff_display_names(uuid[]) to authenticated;
