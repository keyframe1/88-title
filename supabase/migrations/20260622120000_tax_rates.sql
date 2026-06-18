-- ============================================================================
-- 88 Title - Staff-only tax rate book
-- One table (public.tax_rates) holding the verified motor-vehicle tax rates the
-- back-office fee & tax engine looks up. Rates live in DATA, not in code: the
-- engine reads this table, so neighboring parishes and special districts are
-- added later as plain rows in the Supabase dashboard, with NO code change.
--
-- This migration is idempotent and forward-only: it can be re-run safely
-- (CREATE ... IF NOT EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS before
-- CREATE POLICY, an INSERT ... ON CONFLICT DO NOTHING seed) and it never drops
-- data. Re-running NEVER overwrites a rate the team has edited: the seed only
-- inserts the two baseline rows and DO NOTHING leaves any existing row untouched.
--
-- It depends on the dealer-portal migration (20260617120000_dealer_portal.sql)
-- for public.is_staff() - the SAME staff-role helper the dealer portal, the
-- check-in queue console, and the OMV reference table reuse, unchanged here.
-- Migrations are applied in filename order, so is_staff() already exists.
--
-- ----------------------------------------------------------------------------
-- SECURITY MODEL (read this before changing anything below)
-- ----------------------------------------------------------------------------
-- This is a back-office rate book. It holds no customer PII, but it is still
-- STAFF-ONLY: readable only by an authenticated staff member (the is_staff()
-- gate) and writable only by staff or the service role. Same trust model as
-- staff_users / omv_reference:
--
--   * STAFF (authenticated + in staff_users) - reused is_staff(). May read every
--     row and (for a future in-app editor) insert/update/delete.
--   * THE PUBLIC (anon) - gets NOTHING. No grant, no policy. `select * from
--     public.tax_rates` as anon is a hard privilege error. The table is in no
--     view and is NOT added to the supabase_realtime publication, so it can
--     never reach the public board or an anon realtime payload. The customer
--     fee page (components/ServiceFeeCalculator.tsx) shows service fees only and
--     never reads this table - there is no public tax surface anywhere.
--   * The service ("secret") key bypasses RLS and is what the team uses to edit
--     rates in the Supabase dashboard. The web app authenticates with the
--     publishable/anon key, so every web request is RLS-constrained.
--
-- ----------------------------------------------------------------------------
-- DATA MODEL (so parishes / districts are addable without code)
-- ----------------------------------------------------------------------------
-- One row = one jurisdiction's rate, effective from a date. The engine resolves
-- the CURRENT rate per jurisdiction as the row with the greatest effective_date
-- that is on or before "today", so a rate change is a NEW row, never an edit.
--
--   * jurisdiction_level: 'state' | 'parish' | 'district'.
--   * jurisdiction_name : 'Louisiana', 'Jefferson', 'Orleans', 'Kenner Veterans
--                          Blvd', ... (human-readable; drives the parish menu).
--   * parent_jurisdiction: NULL for state and parish rows; for a 'district' row
--                          it is the parish the district sits inside (e.g.
--                          'Jefferson'). This is the ONLY linkage the engine
--                          needs to offer a district as an optional add-on once
--                          that parish is chosen - so a new district is just a
--                          row with parent_jurisdiction set, no code change.
--   * rate              : a PERCENT (4.45 means 4.45%), not a fraction. Stored
--                          this way so it reads correctly when edited by hand in
--                          the dashboard. The engine divides by 100.
--   * effective_date    : when this rate took effect (the engine picks the
--                          latest one not in the future).
--   * note              : free-text provenance / caveat shown to staff.
--
-- Tax is DOMICILE-BASED: the engine takes the BUYER'S parish of residence and
-- looks up THAT parish's rate plus the state rate. None of that lives here; this
-- table just supplies the rates. See lib/tax/ for the lookup + calculation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table
-- ----------------------------------------------------------------------------
create table if not exists public.tax_rates (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  jurisdiction_level  text not null
    check (jurisdiction_level in ('state', 'parish', 'district')),

  -- Human-readable jurisdiction name. Drives the staff parish menu and the
  -- itemized breakdown labels.
  jurisdiction_name   text not null,

  -- The parish a district sits inside. NULL for state/parish rows; required for
  -- district rows. The invariant below enforces exactly that, so the data model
  -- is self-describing for whoever adds rows in the dashboard.
  parent_jurisdiction text,

  -- Rate as a PERCENT (4.45 = 4.45%). The engine divides by 100.
  rate                numeric(7, 4) not null
    check (rate >= 0 and rate <= 100),

  -- When this rate took effect. The engine resolves the current rate per
  -- jurisdiction as the latest effective_date on or before today.
  effective_date      date not null default current_date,

  -- Free-text provenance / caveat (e.g. statute, "confirm effective date").
  note                text,

  -- A district must name its parent parish; state/parish rows must not. Written
  -- as a boolean equality so both directions are enforced by one check.
  constraint tax_rates_district_has_parent
    check ((jurisdiction_level = 'district') = (parent_jurisdiction is not null)),

  -- Light bounds on hand-entered text (defense, not validation UX).
  constraint tax_rates_name_len   check (char_length(jurisdiction_name) <= 80),
  constraint tax_rates_parent_len check (parent_jurisdiction is null or char_length(parent_jurisdiction) <= 80),
  constraint tax_rates_note_len   check (note is null or char_length(note) <= 400),

  -- One rate per (jurisdiction, parent, effective_date). NULLS NOT DISTINCT so
  -- two state/parish rows with a NULL parent on the same date still collide
  -- (Postgres would otherwise treat NULLs as distinct and allow duplicates).
  -- This is the seed's conflict target, so a re-run is a no-op that preserves
  -- any rate the team has already entered.
  constraint tax_rates_jurisdiction_effective_key
    unique nulls not distinct
    (jurisdiction_level, jurisdiction_name, parent_jurisdiction, effective_date)
);

-- The engine reads the whole (small) book per request and resolves in memory,
-- but these keep ordering / current-rate scans cheap as the table grows.
create index if not exists tax_rates_level_name_idx
  on public.tax_rates (jurisdiction_level, jurisdiction_name);
create index if not exists tax_rates_effective_idx
  on public.tax_rates (effective_date desc);

comment on table public.tax_rates is
  'Staff-only motor-vehicle tax rates by jurisdiction (state/parish/district). Read by the back-office fee & tax engine (lib/tax). Add parishes/districts as rows; never anon-readable, never in the public board.';
comment on column public.tax_rates.rate is
  'Rate as a PERCENT, e.g. 4.45 means 4.45%. The engine divides by 100.';
comment on column public.tax_rates.parent_jurisdiction is
  'For a district row, the parish it sits inside (e.g. Jefferson). NULL for state/parish rows.';
comment on column public.tax_rates.effective_date is
  'When this rate took effect. The engine uses the latest effective_date on or before today; a rate change is a new row.';

-- ----------------------------------------------------------------------------
-- Keep updated_at fresh on every edit. Plain trigger; search_path pinned empty,
-- now() resolves from the always-present pg_catalog (the hardening convention
-- the omv_reference touch trigger uses).
-- ----------------------------------------------------------------------------
create or replace function public.tax_rates_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tax_rates_set_updated_at on public.tax_rates;
create trigger tax_rates_set_updated_at
  before update on public.tax_rates
  for each row
  execute function public.tax_rates_touch_updated_at();

-- ----------------------------------------------------------------------------
-- Enable RLS. With RLS on and no matching policy, access is denied by default.
-- Every policy is gated on is_staff(); there is no anon policy at all.
-- ----------------------------------------------------------------------------
alter table public.tax_rates enable row level security;

drop policy if exists tax_rates_select_staff on public.tax_rates;
create policy tax_rates_select_staff
  on public.tax_rates for select to authenticated
  using (public.is_staff());

-- Write policies for a future in-app staff editor. Today the team edits in the
-- Supabase dashboard (service role, which bypasses RLS). Either way: staff only.
drop policy if exists tax_rates_insert_staff on public.tax_rates;
create policy tax_rates_insert_staff
  on public.tax_rates for insert to authenticated
  with check (public.is_staff());

drop policy if exists tax_rates_update_staff on public.tax_rates;
create policy tax_rates_update_staff
  on public.tax_rates for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists tax_rates_delete_staff on public.tax_rates;
create policy tax_rates_delete_staff
  on public.tax_rates for delete to authenticated
  using (public.is_staff());

-- ----------------------------------------------------------------------------
-- Grants. RLS is the gate, but privileges still matter. anon gets NOTHING here
-- (so a raw select is a privilege error, independent of RLS); authenticated gets
-- the verbs RLS then constrains to staff.
-- ----------------------------------------------------------------------------
revoke all on table public.tax_rates from anon;
revoke all on table public.tax_rates from authenticated;
grant select, insert, update, delete on table public.tax_rates to authenticated;

revoke all on function public.tax_rates_touch_updated_at() from public;

-- ----------------------------------------------------------------------------
-- Seed the two VERIFIED baseline rates. State motor-vehicle tax 4.45% and the
-- Jefferson Parish local rate 4.75% (combined 9.20% for a Jefferson-domiciled
-- buyer, the most common case). NO other parish or district is invented here -
-- the team adds Orleans / St. Tammany / St. Bernard / St. Charles and any
-- Jefferson special district (Kenner Veterans Blvd, Harahan, airport) as rows
-- later in the dashboard.
--
-- ON CONFLICT DO NOTHING makes this safe to re-run and never clobbers an edited
-- rate. effective_date is a documented baseline; confirm/adjust in office.
-- ----------------------------------------------------------------------------
insert into public.tax_rates
  (jurisdiction_level, jurisdiction_name, parent_jurisdiction, rate, effective_date, note)
values
  ('state', 'Louisiana', null, 4.45, date '2018-07-01',
   'Louisiana state motor-vehicle sales/use tax. 4.45% since Act 1 (2018).'),
  ('parish', 'Jefferson', null, 4.75, date '2018-07-01',
   'Jefferson Parish combined local rate. Seeded baseline; confirm effective date in office.')
on conflict (jurisdiction_level, jurisdiction_name, parent_jurisdiction, effective_date)
  do nothing;
