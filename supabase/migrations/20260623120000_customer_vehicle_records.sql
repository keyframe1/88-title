-- ============================================================================
-- 88 Title - Staff-only customer & vehicle records
-- The persistent back-office records a clerk enters once and reuses: a customer
-- (name, contact, parish of residence / domicile, and protected ID data) and a
-- vehicle (VIN, year, make, model, body, color - the fields the DPSMV form needs
-- and that an NHTSA VIN decode would populate). Both link to the transaction
-- rows already in the system (checkins, dealer_transactions), so a vehicle and
-- a customer carry their history forward across visits.
--
-- These records feed two consumers: the domicile-based fee & tax engine
-- (lib/tax/, /staff/fees - a stored parish becomes the buyer parish) and the
-- upcoming DPSMV form generator (a stored vehicle's details prefill the form).
--
-- This migration is idempotent and forward-only: it can be re-run safely
-- (CREATE ... IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE, DROP
-- POLICY IF EXISTS before CREATE POLICY) and it never drops data.
--
-- It depends on the dealer-portal migration (20260617120000_dealer_portal.sql)
-- for public.is_staff() - the SAME staff-role helper the dealer portal, the
-- check-in queue console, the OMV reference table, and the tax engine reuse,
-- unchanged here. Migrations apply in filename order, so is_staff(), checkins,
-- and dealer_transactions already exist.
--
-- ----------------------------------------------------------------------------
-- SECURITY MODEL (read this before changing anything below)
-- ----------------------------------------------------------------------------
-- These tables hold customer PII, including ID data, and are the most sensitive
-- data in the system. They are STAFF-ONLY at every layer. Same trust model as
-- staff_users / omv_reference / tax_rates, with extra care for the ID fields:
--
--   * STAFF (authenticated + in staff_users) - reused is_staff(). May read and
--     write every row. There is no other authenticated reader: a dealer login is
--     authenticated but not staff, so is_staff() is false and RLS returns nothing.
--   * THE PUBLIC (anon) - gets NOTHING. No grant, no policy. `select * from
--     public.customers` as anon is a hard privilege error. Neither table is in
--     any view and neither is added to the supabase_realtime publication, so a
--     customer record can NEVER reach the public check-in board, an anon realtime
--     payload, or any customer-facing surface.
--   * The service ("secret") key bypasses RLS and is what the team uses in the
--     Supabase dashboard. The web app authenticates with the publishable/anon
--     key, so every web request is RLS-constrained.
--
-- ID-DATA PROTECTION (defense in depth, layered):
--   1. Isolation - the whole table is staff-only (RLS), with no anon privilege,
--      no view, and no realtime, so the blast radius is the staff console alone.
--   2. Minimal disclosure - id_last4 is a GENERATED column holding only the last
--      four characters of id_number. The DAL's list/search queries select
--      id_last4 (and never id_number or date_of_birth), so browsing records never
--      pulls the full identifier into a response. The full id_number / DOB come
--      back ONLY from getCustomerById() when a clerk opens one record to fill a
--      form - least privilege at the query layer.
--   3. Display masking - the UI shows the masked id (last 4) by default.
--   4. Bounded storage - we store a DL/state-ID number and metadata, not an SSN.
--      If a higher-sensitivity identifier is ever required, the next step is
--      pgcrypto field encryption (pgp_sym_encrypt) of id_number with a key from a
--      DB setting; the column boundary here is drawn so that change is localized.
--
-- ----------------------------------------------------------------------------
-- MATCH-AND-REUSE (repeat customers/vehicles are reused, not duplicated)
-- ----------------------------------------------------------------------------
--   * VEHICLES match on VIN. vin is stored normalized (uppercased, trimmed) and a
--     UNIQUE index on upper(vin) makes the VIN the natural key - two rows can
--     never describe the same VIN. find-or-create looks up by VIN and reuses the
--     existing row (enriching any blank fields, e.g. from an NHTSA decode).
--   * CUSTOMERS match on name. name_key is a GENERATED normalized form of
--     full_name (lowercased, whitespace-collapsed), indexed for fast lookup. A
--     name alone is not unique (two John Smiths), so the app reuses a customer
--     only on name_key PLUS a matching email or phone, and otherwise the clerk
--     searches and picks the right existing record. See lib/records/.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- customers
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Display name as entered. Required (a customer must have a name).
  full_name      text not null,

  -- Normalized match key: lowercased, whitespace-collapsed full_name. Generated
  -- so it can never drift from full_name. Indexed (non-unique: name collisions
  -- are allowed; reuse also requires a matching email/phone - see header).
  name_key       text generated always as
                   (lower(btrim(regexp_replace(full_name, '\s+', ' ', 'g')))) stored,

  -- Contact.
  phone          text,
  email          text,

  -- Residence. parish is the DOMICILE that drives the tax calculation; it is a
  -- free-text parish name meant to match a tax_rates jurisdiction_name so the fee
  -- engine can select it as the buyer parish.
  address_line1  text,
  address_line2  text,
  city           text,
  state          text not null default 'LA',
  postal_code    text,
  parish         text,

  -- ID data (sensitive - see header). id_type is constrained; id_number is the
  -- DL/state-ID number; id_state is the issuing state. id_last4 is generated and
  -- is the ONLY id fragment the list/search queries select.
  id_type        text check (id_type in ('drivers_license', 'state_id', 'passport', 'military_id', 'other')),
  id_number      text,
  id_state       text,
  id_last4       text generated always as (right(id_number, 4)) stored,
  date_of_birth  date,

  notes          text,

  -- Light bounds on hand-entered text (defense, not validation UX).
  constraint customers_full_name_len  check (char_length(full_name) between 1 and 120),
  constraint customers_phone_len      check (phone is null or char_length(phone) <= 40),
  constraint customers_email_len      check (email is null or char_length(email) <= 200),
  constraint customers_addr1_len      check (address_line1 is null or char_length(address_line1) <= 200),
  constraint customers_addr2_len      check (address_line2 is null or char_length(address_line2) <= 200),
  constraint customers_city_len       check (city is null or char_length(city) <= 120),
  constraint customers_state_len      check (char_length(state) <= 40),
  constraint customers_postal_len     check (postal_code is null or char_length(postal_code) <= 12),
  constraint customers_parish_len     check (parish is null or char_length(parish) <= 80),
  constraint customers_id_number_len  check (id_number is null or char_length(id_number) <= 60),
  constraint customers_id_state_len   check (id_state is null or char_length(id_state) <= 40),
  constraint customers_notes_len      check (notes is null or char_length(notes) <= 1000)
);

create index if not exists customers_name_key_idx  on public.customers (name_key);
create index if not exists customers_parish_idx     on public.customers (parish);
create index if not exists customers_phone_idx      on public.customers (phone);
create index if not exists customers_email_idx      on public.customers (email);
create index if not exists customers_created_idx    on public.customers (created_at desc);

comment on table public.customers is
  'Staff-only customer records (PII, incl. protected ID data). Domicile parish drives the fee engine; read by lib/records. Never anon-readable, never in any view, never in the realtime publication.';
comment on column public.customers.parish is
  'Parish of residence (domicile). Free text meant to match a tax_rates jurisdiction_name so the fee engine can use it as the buyer parish.';
comment on column public.customers.id_number is
  'Sensitive: DL/state-ID number. Selected only by getCustomerById (single-record form-fill), never by list/search. Masked in the UI. See migration header for the protection model.';
comment on column public.customers.id_last4 is
  'Generated last 4 of id_number. The only id fragment list/search queries select, so browsing records never pulls the full identifier.';

-- ----------------------------------------------------------------------------
-- vehicles
-- ----------------------------------------------------------------------------
create table if not exists public.vehicles (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- VIN is the natural key. Stored normalized (uppercased, trimmed) by the app;
  -- the UNIQUE index on upper(vin) enforces one row per VIN regardless of casing.
  vin            text not null,

  -- DPSMV form fields, also what an NHTSA VIN decode returns.
  year           int,
  make           text,
  model          text,
  body_style     text,
  color          text,

  notes          text,

  constraint vehicles_vin_len    check (char_length(vin) between 5 and 17),
  constraint vehicles_year_range check (year is null or (year between 1900 and 2100)),
  constraint vehicles_make_len   check (make is null or char_length(make) <= 60),
  constraint vehicles_model_len  check (model is null or char_length(model) <= 60),
  constraint vehicles_body_len   check (body_style is null or char_length(body_style) <= 60),
  constraint vehicles_color_len  check (color is null or char_length(color) <= 40),
  constraint vehicles_notes_len  check (notes is null or char_length(notes) <= 1000)
);

-- The VIN is unique case-insensitively. This is the match-and-reuse key.
create unique index if not exists vehicles_vin_unique_idx on public.vehicles (upper(vin));
create index if not exists vehicles_make_model_idx on public.vehicles (make, model);
create index if not exists vehicles_created_idx on public.vehicles (created_at desc);

comment on table public.vehicles is
  'Staff-only vehicle records (VIN, year, make, model, body, color). VIN is the unique match key. Feeds the DPSMV form. Never anon-readable, never in any view, never in the realtime publication.';
comment on column public.vehicles.vin is
  'Vehicle identification number, stored normalized (uppercased, trimmed). Unique case-insensitively (vehicles_vin_unique_idx); the match-and-reuse key.';

-- ----------------------------------------------------------------------------
-- updated_at touch triggers. Plain triggers; search_path pinned empty, now()
-- resolves from the always-present pg_catalog (the omv/tax hardening convention).
-- ----------------------------------------------------------------------------
create or replace function public.records_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row
  execute function public.records_touch_updated_at();

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row
  execute function public.records_touch_updated_at();

-- ----------------------------------------------------------------------------
-- Enable RLS. With RLS on and no matching policy, access is denied by default.
-- Every policy is gated on is_staff(); there is no anon policy at all.
-- ----------------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.vehicles  enable row level security;

-- ---- customers -------------------------------------------------------------
drop policy if exists customers_select_staff on public.customers;
create policy customers_select_staff
  on public.customers for select to authenticated
  using (public.is_staff());

drop policy if exists customers_insert_staff on public.customers;
create policy customers_insert_staff
  on public.customers for insert to authenticated
  with check (public.is_staff());

drop policy if exists customers_update_staff on public.customers;
create policy customers_update_staff
  on public.customers for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists customers_delete_staff on public.customers;
create policy customers_delete_staff
  on public.customers for delete to authenticated
  using (public.is_staff());

-- ---- vehicles --------------------------------------------------------------
drop policy if exists vehicles_select_staff on public.vehicles;
create policy vehicles_select_staff
  on public.vehicles for select to authenticated
  using (public.is_staff());

drop policy if exists vehicles_insert_staff on public.vehicles;
create policy vehicles_insert_staff
  on public.vehicles for insert to authenticated
  with check (public.is_staff());

drop policy if exists vehicles_update_staff on public.vehicles;
create policy vehicles_update_staff
  on public.vehicles for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists vehicles_delete_staff on public.vehicles;
create policy vehicles_delete_staff
  on public.vehicles for delete to authenticated
  using (public.is_staff());

-- ----------------------------------------------------------------------------
-- Grants. RLS is the gate, but privileges still matter. anon gets NOTHING on
-- either table (so a raw select is a privilege error, independent of RLS);
-- authenticated gets the verbs RLS then constrains to staff.
-- ----------------------------------------------------------------------------
revoke all on table public.customers from anon;
revoke all on table public.customers from authenticated;
grant select, insert, update, delete on table public.customers to authenticated;

revoke all on table public.vehicles from anon;
revoke all on table public.vehicles from authenticated;
grant select, insert, update, delete on table public.vehicles to authenticated;

revoke all on function public.records_touch_updated_at() from public;

-- ----------------------------------------------------------------------------
-- Link customers & vehicles to the transaction rows already in the system, so a
-- record carries its history forward. Nullable FKs with ON DELETE SET NULL: a
-- transaction outlives the record it pointed at (deleting a customer/vehicle
-- never deletes a transaction). ADD COLUMN IF NOT EXISTS keeps this idempotent.
--
-- These columns are STAFF-WRITABLE only:
--   * checkins is anon-insertable, but anon has only COLUMN-level grants on the
--     original customer-supplied columns; these two new columns are not in that
--     list, so anon can neither set nor read them. The authenticated (staff)
--     grant is table-level, so it already covers the new columns. RLS still
--     limits which rows staff can touch.
--   * dealer_transactions: anon has no privilege at all; the new columns inherit
--     the existing table-level authenticated grant and the is_staff()/dealer RLS.
-- The FK targets (customers, vehicles) are themselves staff-only, so even a
-- leaked id value resolves to nothing without a staff session.
-- ----------------------------------------------------------------------------
alter table public.checkins
  add column if not exists customer_id uuid references public.customers (id) on delete set null;
alter table public.checkins
  add column if not exists vehicle_id  uuid references public.vehicles  (id) on delete set null;

alter table public.dealer_transactions
  add column if not exists customer_id uuid references public.customers (id) on delete set null;
alter table public.dealer_transactions
  add column if not exists vehicle_id  uuid references public.vehicles  (id) on delete set null;

create index if not exists checkins_customer_id_idx           on public.checkins (customer_id);
create index if not exists checkins_vehicle_id_idx            on public.checkins (vehicle_id);
create index if not exists dealer_transactions_customer_id_idx on public.dealer_transactions (customer_id);
create index if not exists dealer_transactions_vehicle_id_idx  on public.dealer_transactions (vehicle_id);

comment on column public.checkins.customer_id is
  'Optional staff-set link to a customers row. Staff-only (anon has no grant on this column); ON DELETE SET NULL.';
comment on column public.checkins.vehicle_id is
  'Optional staff-set link to a vehicles row. Staff-only (anon has no grant on this column); ON DELETE SET NULL.';
