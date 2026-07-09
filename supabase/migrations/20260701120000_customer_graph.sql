-- ============================================================================
-- 88 Title - Connect the customer graph
--
-- Three related changes that make a customer record a connected hub instead of a
-- flat row, all staff-only, all forward-only and idempotent (re-runnable):
--
--   CHANGE 1  Renewal capture reaches the customer record. checkins.customer_id
--             already exists (20260623120000) but is rarely set in practice, so
--             renewal_date / marketing_consent captured at check-in never reach a
--             customer. A one-time backfill links existing check-ins to customers
--             by exact email / normalized phone (only when EXACTLY one matches),
--             then seeds each linked customer's renewal profile from its latest
--             renewal-bearing check-in. Going forward the app writes the link when
--             a check-in-originated transaction selects a customer.
--
--   CHANGE 2  Explicit customer <-> vehicle links. Until now the ONLY customer/
--             vehicle association was DERIVED from the transaction spine (no
--             ownership FK, no join table). That is honest history but cannot be
--             edited. This adds public.customer_vehicles: a staff-curated join
--             table the panels UNION with the transaction-derived (implicit) links.
--
--   CHANGE 3  Canonical renewal fields on the customer record. renewal_date +
--             marketing_consent become columns on public.customers - the values a
--             clerk can set directly, seeded by Change 1's backfill and copy-
--             forward. The Renewals view reads these first, falling back to the
--             check-in-derived value only where the profile is still empty.
--
-- Depends on (all applied earlier by filename order):
--   * 20260617120000_dealer_portal.sql         - public.is_staff()
--   * 20260618120000_checkin_queue.sql          - public.checkins (renewal fields)
--   * 20260623120000_customer_vehicle_records   - public.customers / public.vehicles
--
-- ----------------------------------------------------------------------------
-- SECURITY MODEL (unchanged trust model - read before editing)
-- ----------------------------------------------------------------------------
-- Everything here is STAFF-ONLY, the same model as customers / vehicles /
-- transactions:
--   * STAFF (authenticated + in staff_users) - reused is_staff(). Full access.
--   * THE PUBLIC (anon) - NOTHING: no grant, no policy, no view, no realtime. A
--     raw select on customer_vehicles as anon is a hard privilege error.
--   * A dealer login is authenticated but not staff, so is_staff() is false and
--     RLS returns nothing.
--   * The new customers columns inherit the table's existing table-level
--     authenticated grant and the is_staff() RLS; anon has no grant on customers
--     at all, so it can neither read nor write renewal_date / marketing_consent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CHANGE 3 (schema) - canonical renewal fields on customers.
--
-- renewal_date is nullable: NULL means "no renewal on the profile yet" - the
-- signal the reads use to fall back to the check-in-derived value. When it is
-- set, the profile is authoritative and its marketing_consent rides with it.
-- marketing_consent is not-null default false (a customer has or has not
-- consented; there is no third state), matching public.checkins.
-- ----------------------------------------------------------------------------
alter table public.customers
  add column if not exists renewal_date date;
alter table public.customers
  add column if not exists marketing_consent boolean not null default false;

create index if not exists customers_renewal_date_idx
  on public.customers (renewal_date)
  where renewal_date is not null;

comment on column public.customers.renewal_date is
  'Canonical renewal date (YYYY-MM-DD). NULL = not on the profile; reads then fall back to the customer''s latest renewal-bearing check-in. Seeded by the Change 1 backfill / copy-forward.';
comment on column public.customers.marketing_consent is
  'Whether the customer consented to a renewal reminder. Authoritative when renewal_date is set; otherwise the check-in-derived consent is used.';

-- ----------------------------------------------------------------------------
-- CHANGE 2 (schema) - explicit customer <-> vehicle links.
--
-- A staff-curated many-to-many. Distinct from the transaction-derived (implicit)
-- association: this table holds ONLY links a clerk made by hand in a panel, and
-- the panels show them UNION the implicit ones. ON DELETE CASCADE on both FKs: a
-- link is meaningless once either endpoint is gone (the transaction history that
-- outlives a record is a separate, SET NULL relationship). The unique pair makes
-- linking idempotent - re-linking the same two records is a no-op, not a dupe.
-- created_by is attribution only (nullable; ON DELETE SET NULL so removing a
-- staff auth user never deletes the link).
-- ----------------------------------------------------------------------------
create table if not exists public.customer_vehicles (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  vehicle_id  uuid not null references public.vehicles  (id) on delete cascade,
  created_by  uuid references auth.users (id) on delete set null,
  constraint customer_vehicles_unique_pair unique (customer_id, vehicle_id)
);

create index if not exists customer_vehicles_customer_idx
  on public.customer_vehicles (customer_id);
create index if not exists customer_vehicles_vehicle_idx
  on public.customer_vehicles (vehicle_id);

comment on table public.customer_vehicles is
  'Staff-curated explicit customer<->vehicle links (a hand-made many-to-many). The panels show these UNION the transaction-derived implicit links. Staff-only; never anon-readable, never in any view, never in the realtime publication.';

alter table public.customer_vehicles enable row level security;

drop policy if exists customer_vehicles_select_staff on public.customer_vehicles;
create policy customer_vehicles_select_staff
  on public.customer_vehicles for select to authenticated
  using (public.is_staff());

drop policy if exists customer_vehicles_insert_staff on public.customer_vehicles;
create policy customer_vehicles_insert_staff
  on public.customer_vehicles for insert to authenticated
  with check (public.is_staff());

drop policy if exists customer_vehicles_delete_staff on public.customer_vehicles;
create policy customer_vehicles_delete_staff
  on public.customer_vehicles for delete to authenticated
  using (public.is_staff());

-- No UPDATE policy: a link has no editable fields (you unlink and relink). With
-- RLS on and no UPDATE policy, an UPDATE is denied by default - intentional.

revoke all on table public.customer_vehicles from anon;
revoke all on table public.customer_vehicles from authenticated;
grant select, insert, delete on table public.customer_vehicles to authenticated;

-- ----------------------------------------------------------------------------
-- CHANGE 1 (backfill A) - link existing check-ins to customers.
--
-- For every not-yet-linked check-in that carries a contact, find the customers
-- matching on exact email (case-insensitive) OR normalized phone (digits only).
-- Set customer_id only when EXACTLY ONE distinct customer matches; a check-in
-- that matches two or more customers is left unlinked and counted as ambiguous
-- (a clerk links it deliberately later). Idempotent: only touches rows where
-- customer_id IS NULL, so a second run links only newly-eligible rows.
-- ----------------------------------------------------------------------------
do $$
declare
  linked_count    int := 0;
  ambiguous_count int := 0;
begin
  drop table if exists _cg_checkin_match;
  create temporary table _cg_checkin_match as
  with ck as (
    select id,
           nullif(lower(btrim(email)), '')                        as email_key,
           nullif(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '') as phone_key
    from public.checkins
    where customer_id is null
  ),
  cu as (
    select id,
           nullif(lower(btrim(email)), '')                        as email_key,
           nullif(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '') as phone_key
    from public.customers
  )
  select ck.id as checkin_id,
         array_agg(distinct cu.id) as customer_ids
  from ck
  join cu
    on (ck.email_key is not null and cu.email_key = ck.email_key)
    or (ck.phone_key is not null and cu.phone_key = ck.phone_key)
  where ck.email_key is not null or ck.phone_key is not null
  group by ck.id;

  update public.checkins ch
     set customer_id = m.customer_ids[1]
    from _cg_checkin_match m
   where ch.id = m.checkin_id
     and array_length(m.customer_ids, 1) = 1;
  get diagnostics linked_count = row_count;

  select count(*) into ambiguous_count
    from _cg_checkin_match
   where array_length(customer_ids, 1) > 1;

  drop table if exists _cg_checkin_match;

  raise notice 'CHANGE 1 backfill: linked % check-in(s) to a customer; % skipped as ambiguous (multiple matches).',
    linked_count, ambiguous_count;
end $$;

-- ----------------------------------------------------------------------------
-- CHANGE 1 (backfill B) - seed each customer's renewal profile.
--
-- For every customer whose profile renewal is still empty (renewal_date IS NULL),
-- copy the renewal_date + marketing_consent from their LATEST renewal-bearing
-- linked check-in. Only fills the empty ones, so it never overwrites a value a
-- clerk set and is safe to re-run.
-- ----------------------------------------------------------------------------
do $$
declare seeded_count int := 0;
begin
  with latest as (
    select distinct on (ch.customer_id)
           ch.customer_id,
           ch.renewal_date,
           ch.marketing_consent
    from public.checkins ch
    where ch.customer_id is not null
      and ch.renewal_date is not null
    order by ch.customer_id, ch.created_at desc
  )
  update public.customers c
     set renewal_date      = latest.renewal_date,
         marketing_consent = latest.marketing_consent
    from latest
   where c.id = latest.customer_id
     and c.renewal_date is null;
  get diagnostics seeded_count = row_count;

  raise notice 'CHANGE 1 backfill: seeded renewal profile on % customer(s) from their latest check-in.',
    seeded_count;
end $$;
