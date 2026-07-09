-- ============================================================================
-- 88 Title — DEMO seed for stakeholder review
--
-- Populates the Dealers tab, the Records views (Customers / Vehicles / Renewals),
-- and a little check-in history with plausible-fake data so a stakeholder can see
-- the back-office consoles full instead of empty.
--
-- HOW TO RUN
--   Paste this whole file into the Supabase dashboard SQL editor and Run. The
--   editor executes as the `postgres` role (a superuser), which is the ONLY way
--   to write these tables: they are staff-only and the project's data-API keys
--   (anon AND the service/secret key) are deliberately unprivileged against them,
--   so a supabase-js seed script cannot do this. See scripts/seed-demo-cleanup.sql
--   to remove everything again.
--
-- WHY SQL (and not a Node script like create-dealer.mjs)
--   Verified live: the SUPABASE_SECRET_KEY resolves to `service_role`, which holds
--   NO grants on dealers/customers/vehicles/checkins/etc. — every data-API write
--   returns `42501 permission denied`. The dashboard SQL editor runs as postgres
--   and bypasses that, matching the team's existing seed_admin.sql workflow.
--
-- IDEMPOTENT & EXACT
--   Every seeded row's id is a fixed, recognizable UUID beginning `d3d05eed-`
--   (reads "d3d0 seed"). No real row can carry that 32-bit prefix (real ids are
--   random), so the leading DELETE cleans exactly the prior demo run and nothing
--   else — you can Run this repeatedly. It NEVER touches a real dealer, customer,
--   Anthony's record, or the real Test Dealership.
--
-- REQUIRES migrations through 20260701120000 (customer graph) applied. Confirmed
-- present on this project.
--
-- Do NOT run this in CI. It writes to the live database.
-- ============================================================================
begin;

-- ----------------------------------------------------------------------------
-- 0. Remove any prior demo rows first (idempotent re-run). Child rows before
--    parents. Matches ONLY the `d3d05eed-` demo id prefix — never a real row.
-- ----------------------------------------------------------------------------
delete from public.customer_vehicles   where id::text like 'd3d05eed-%';
delete from public.checkins            where id::text like 'd3d05eed-%';
delete from public.dealer_transactions where id::text like 'd3d05eed-%';
delete from public.vehicles            where id::text like 'd3d05eed-%';
delete from public.customers           where id::text like 'd3d05eed-%';
delete from public.dealers             where id::text like 'd3d05eed-%';

-- ----------------------------------------------------------------------------
-- 1. Dealers — display-only rows (auth_user_id NULL: no login, no email fires).
--    Contacts are @example.com. One inactive, to show status variety.
-- ----------------------------------------------------------------------------
insert into public.dealers
  (id, created_at, dealership_name, contact_name, contact_email, phone, status)
values
  ('d3d05eed-0001-4000-a000-000000000001', timestamptz '2026-05-02 09:00:00-05',
   'Crescent City Auto Group', 'Marie Thibodeaux', 'titles@crescentcityauto.example.com', '504-555-0110', 'active'),
  ('d3d05eed-0001-4000-a000-000000000002', timestamptz '2026-05-09 09:00:00-05',
   'Riverbend Motors', 'Darnell Boudreaux', 'desk@riverbendmotors.example.com', '504-555-0121', 'active'),
  ('d3d05eed-0001-4000-a000-000000000003', timestamptz '2026-05-16 09:00:00-05',
   'Lakeside Auto Sales', 'Trinh Nguyen', 'office@lakesideauto.example.com', '985-555-0132', 'active'),
  ('d3d05eed-0001-4000-a000-000000000004', timestamptz '2026-05-23 09:00:00-05',
   'Gulf Coast Motorcars', 'Roberto Alvarez', 'titles@gulfcoastmotorcars.example.com', '504-555-0143', 'active'),
  ('d3d05eed-0001-4000-a000-000000000005', timestamptz '2026-05-30 09:00:00-05',
   'Bayou Classic Cars', 'Emily Fontenot', 'hello@bayouclassiccars.example.com', '504-555-0154', 'inactive');

-- ----------------------------------------------------------------------------
-- 2. Customers — varied parishes; mixed renewal_date / marketing_consent so the
--    Renewals view has consented rows to sort, plus a couple of deliberate
--    exclusions (consent off, or no renewal at all). id data on a few to show the
--    masked-id (last 4) in the detail panel. `name_key` / `id_last4` are GENERATED
--    columns — never inserted. `state` defaults to 'LA'.
--
--    Renewals view (consented + has renewal_date, soonest first) will show:
--      Guidry 2026-08-15, Robinson 2026-09-20, Ellender 2026-11-15 (check-in-
--      derived — profile renewal_date left NULL), Delacroix 2026-12-01,
--      Patel 2027-03-10, Washington 2027-05-01.
--    Excluded on purpose: Tran (has a renewal date but marketing_consent=false)
--    and Fontenot (no renewal at all).
-- ----------------------------------------------------------------------------
insert into public.customers
  (id, created_at, full_name, phone, email, address_line1, city, parish, postal_code,
   id_type, id_number, id_state, date_of_birth, renewal_date, marketing_consent, notes)
values
  ('d3d05eed-0003-4000-a000-000000000001', timestamptz '2026-04-10 11:00:00-05',
   'Marcus Guidry', '504-555-0170', 'marcus.guidry@example.com',
   '3410 Cleary Ave', 'Metairie', 'Jefferson', '70002',
   'drivers_license', 'LA0114567', 'LA', date '1988-03-12', date '2026-08-15', true,
   'Prefers a text reminder.'),
  ('d3d05eed-0003-4000-a000-000000000002', timestamptz '2026-04-18 11:00:00-05',
   'Latanya Robinson', '504-555-0181', 'latanya.robinson@example.com',
   '1220 Esplanade Ave', 'New Orleans', 'Orleans', '70119',
   'drivers_license', '004420881', 'LA', date '1979-11-02', date '2026-09-20', true, null),
  ('d3d05eed-0003-4000-a000-000000000003', timestamptz '2026-04-25 11:00:00-05',
   'Hoang Tran', '504-555-0192', 'hoang.tran@example.com',
   '2001 Williams Blvd', 'Kenner', 'Jefferson', '70065',
   null, null, null, null, date '2026-10-05', false,
   'Asked not to be contacted for marketing.'),
  ('d3d05eed-0003-4000-a000-000000000004', timestamptz '2026-05-04 11:00:00-05',
   'Sarah Delacroix', '985-555-0143', 'sarah.delacroix@example.com',
   '68 Lakeshore Dr', 'Mandeville', 'St. Tammany', '70448',
   'state_id', 'S99310142', 'LA', date '1965-06-25', date '2026-12-01', true, null),
  ('d3d05eed-0003-4000-a000-000000000005', timestamptz '2026-05-11 11:00:00-05',
   'James Ellender', '504-555-0165', 'james.ellender@example.com',
   '405 E Judge Perez Dr', 'Chalmette', 'St. Bernard', '70043',
   null, null, null, null, null, false,
   'Renewal captured at check-in (profile left empty on purpose to show the fallback).'),
  ('d3d05eed-0003-4000-a000-000000000006', timestamptz '2026-05-19 11:00:00-05',
   'Priya Patel', '225-555-0176', 'priya.patel@example.com',
   '1710 W Hwy 30', 'Gonzales', 'Ascension', '70737',
   'drivers_license', 'LA7720165', 'LA', date '1991-09-14', date '2027-03-10', true, null),
  ('d3d05eed-0003-4000-a000-000000000007', timestamptz '2026-05-27 11:00:00-05',
   'Devon Washington', '504-555-0187', 'devon.washington@example.com',
   '900 Camp St', 'New Orleans', 'Orleans', '70130',
   null, null, null, null, date '2027-05-01', true, null),
  ('d3d05eed-0003-4000-a000-000000000008', timestamptz '2026-06-03 11:00:00-05',
   'Rachel Fontenot', '985-555-0198', 'rachel.fontenot@example.com',
   '314 Canal Blvd', 'Thibodaux', 'Lafourche', '70301',
   null, null, null, null, null, false, null);

-- ----------------------------------------------------------------------------
-- 3. Vehicles — customer-owned records with valid 17-char VINs (no I/O/Q). VIN is
--    the unique match key; stored uppercased.
-- ----------------------------------------------------------------------------
insert into public.vehicles
  (id, created_at, vin, year, make, model, body_style, color)
values
  ('d3d05eed-0004-4000-a000-000000000001', timestamptz '2026-04-10 11:05:00-05',
   'JTDEPRAE4LJ012340', 2020, 'Toyota', 'Corolla', 'Sedan', 'Silver'),
  ('d3d05eed-0004-4000-a000-000000000002', timestamptz '2026-04-18 11:05:00-05',
   '1HGCV1F30JA012341', 2018, 'Honda', 'Accord', 'Sedan', 'Black'),
  ('d3d05eed-0004-4000-a000-000000000003', timestamptz '2026-04-25 11:05:00-05',
   '1FMCU9G60MU012342', 2021, 'Ford', 'Escape', 'SUV', 'White'),
  ('d3d05eed-0004-4000-a000-000000000004', timestamptz '2026-05-04 11:05:00-05',
   '1G1ZD5ST0KF012343', 2019, 'Chevrolet', 'Malibu', 'Sedan', 'Gray'),
  ('d3d05eed-0004-4000-a000-000000000005', timestamptz '2026-05-11 11:05:00-05',
   '2T3P1RFV5NW012344', 2022, 'Toyota', 'RAV4', 'SUV', 'Blue'),
  ('d3d05eed-0004-4000-a000-000000000006', timestamptz '2026-05-19 11:05:00-05',
   '5N1AT2MT4HC012345', 2017, 'Nissan', 'Rogue', 'SUV', 'Red'),
  ('d3d05eed-0004-4000-a000-000000000007', timestamptz '2026-05-27 11:05:00-05',
   '5NMJBCAE6PH012346', 2023, 'Hyundai', 'Tucson', 'SUV', 'Green'),
  ('d3d05eed-0004-4000-a000-000000000008', timestamptz '2026-06-03 11:05:00-05',
   '3GTU2MEC5GG012347', 2016, 'GMC', 'Sierra 1500', 'Pickup', 'Black');

-- ----------------------------------------------------------------------------
-- 4. Explicit customer <-> vehicle links (public.customer_vehicles). These are
--    the staff-curated links the record panels show as removable. Guidry owns two
--    (Corolla + Sierra); Fontenot has none (a plain record).
-- ----------------------------------------------------------------------------
insert into public.customer_vehicles (id, created_at, customer_id, vehicle_id)
values
  ('d3d05eed-0005-4000-a000-000000000001', timestamptz '2026-06-05 10:00:00-05',
   'd3d05eed-0003-4000-a000-000000000001', 'd3d05eed-0004-4000-a000-000000000001'),
  ('d3d05eed-0005-4000-a000-000000000002', timestamptz '2026-06-05 10:01:00-05',
   'd3d05eed-0003-4000-a000-000000000002', 'd3d05eed-0004-4000-a000-000000000002'),
  ('d3d05eed-0005-4000-a000-000000000003', timestamptz '2026-06-05 10:02:00-05',
   'd3d05eed-0003-4000-a000-000000000003', 'd3d05eed-0004-4000-a000-000000000003'),
  ('d3d05eed-0005-4000-a000-000000000004', timestamptz '2026-06-05 10:03:00-05',
   'd3d05eed-0003-4000-a000-000000000004', 'd3d05eed-0004-4000-a000-000000000004'),
  ('d3d05eed-0005-4000-a000-000000000005', timestamptz '2026-06-05 10:04:00-05',
   'd3d05eed-0003-4000-a000-000000000005', 'd3d05eed-0004-4000-a000-000000000005'),
  ('d3d05eed-0005-4000-a000-000000000006', timestamptz '2026-06-05 10:05:00-05',
   'd3d05eed-0003-4000-a000-000000000006', 'd3d05eed-0004-4000-a000-000000000006'),
  ('d3d05eed-0005-4000-a000-000000000007', timestamptz '2026-06-05 10:06:00-05',
   'd3d05eed-0003-4000-a000-000000000007', 'd3d05eed-0004-4000-a000-000000000007'),
  ('d3d05eed-0005-4000-a000-000000000008', timestamptz '2026-06-05 10:07:00-05',
   'd3d05eed-0003-4000-a000-000000000001', 'd3d05eed-0004-4000-a000-000000000008');

-- ----------------------------------------------------------------------------
-- 5. Check-in history — a few completed visits linked to customers/vehicles.
--    Ellender's is a registration-renewal that carries the renewal the Renewals
--    view falls back to (his customer profile renewal_date is NULL). Past-dated,
--    so the anon check-in throttle (which counts only the last minute/hour) is
--    never approached. ticket_code / session_token use their table defaults.
-- ----------------------------------------------------------------------------
insert into public.checkins
  (id, created_at, name, phone, email, service_type, status,
   renewal_date, marketing_consent, customer_id, vehicle_id)
values
  ('d3d05eed-0006-4000-a000-000000000001', timestamptz '2026-05-02 13:20:00-05',
   'James Ellender', '504-555-0165', 'james.ellender@example.com',
   'registration-renewal', 'complete', date '2026-11-15', true,
   'd3d05eed-0003-4000-a000-000000000005', 'd3d05eed-0004-4000-a000-000000000005'),
  ('d3d05eed-0006-4000-a000-000000000002', timestamptz '2026-06-10 10:40:00-05',
   'Marcus Guidry', '504-555-0170', 'marcus.guidry@example.com',
   'title-transfer', 'complete', null, false,
   'd3d05eed-0003-4000-a000-000000000001', 'd3d05eed-0004-4000-a000-000000000001'),
  ('d3d05eed-0006-4000-a000-000000000003', timestamptz '2026-06-15 15:05:00-05',
   'Latanya Robinson', '504-555-0181', 'latanya.robinson@example.com',
   'registration-renewal', 'complete', date '2026-09-20', true,
   'd3d05eed-0003-4000-a000-000000000002', 'd3d05eed-0004-4000-a000-000000000002'),
  ('d3d05eed-0006-4000-a000-000000000004', timestamptz '2026-06-20 09:30:00-05',
   'Rachel Fontenot', '985-555-0198', 'rachel.fontenot@example.com',
   'duplicate-title', 'complete', null, false,
   'd3d05eed-0003-4000-a000-000000000008', null);

-- ----------------------------------------------------------------------------
-- 6. Dealer transactions — the outstanding-work board. Inserted first with only
--    the stable fields: the BEFORE INSERT guard normalizes every non-staff insert
--    (this session's auth.uid() is NULL) to status='submitted', unflagged. The
--    UPDATE below then sets the REAL status / flags / status_updated_at — UPDATE
--    has no such guard. Dates span ~3 weeks (2026-06-18 .. 2026-07-09) across the
--    whole pipeline; two are flagged with a realistic problem-title note.
-- ----------------------------------------------------------------------------
insert into public.dealer_transactions
  (id, dealer_id, created_at, vehicle_description, transaction_type, stock_number,
   vin, vehicle_year, vehicle_make, vehicle_model, notes)
values
  ('d3d05eed-0002-4000-a000-000000000001', 'd3d05eed-0001-4000-a000-000000000001',
   timestamptz '2026-06-18 09:15:00-05', '2021 Toyota Camry SE', 'Title transfer', 'CC-2201',
   '4T1B11HK1MU123456', 2021, 'Toyota', 'Camry', 'POA on file.'),
  ('d3d05eed-0002-4000-a000-000000000002', 'd3d05eed-0001-4000-a000-000000000001',
   timestamptz '2026-06-30 10:05:00-05', '2019 Honda CR-V EX', 'Title & registration', 'CC-2214',
   '5J6RW2H84KA234567', 2019, 'Honda', 'CR-V', null),
  ('d3d05eed-0002-4000-a000-000000000003', 'd3d05eed-0001-4000-a000-000000000002',
   timestamptz '2026-07-01 14:20:00-05', '2022 Ford F-150 XLT', 'Duplicate title', 'RB-889',
   '1FTFW1E58NF345678', 2022, 'Ford', 'F-150', null),
  ('d3d05eed-0002-4000-a000-000000000004', 'd3d05eed-0001-4000-a000-000000000002',
   timestamptz '2026-07-03 11:45:00-05', '2020 Chevrolet Silverado 1500', 'Out-of-state title', 'RB-901',
   '3GCUYDED4LG456789', 2020, 'Chevrolet', 'Silverado 1500', null),
  ('d3d05eed-0002-4000-a000-000000000005', 'd3d05eed-0001-4000-a000-000000000003',
   timestamptz '2026-07-08 09:40:00-05', '2023 Nissan Altima SV', 'Title transfer', 'LK-1203',
   '1N4BL4BV9PN567890', 2023, 'Nissan', 'Altima', null),
  ('d3d05eed-0002-4000-a000-000000000006', 'd3d05eed-0001-4000-a000-000000000003',
   timestamptz '2026-06-20 13:10:00-05', '2018 Toyota Tacoma SR5', 'Plate transfer', 'LK-1177',
   '3TMCZ5AN9JM678901', 2018, 'Toyota', 'Tacoma', null),
  ('d3d05eed-0002-4000-a000-000000000007', 'd3d05eed-0001-4000-a000-000000000004',
   timestamptz '2026-07-02 15:30:00-05', '2021 Jeep Wrangler Sport', 'Title & registration', 'GC-540',
   '1C4HJXDG7MW789012', 2021, 'Jeep', 'Wrangler', null),
  ('d3d05eed-0002-4000-a000-000000000008', 'd3d05eed-0001-4000-a000-000000000004',
   timestamptz '2026-06-29 10:50:00-05', '2017 BMW 330i', 'Duplicate title', 'GC-528',
   'WBA8B9G59HNU89012', 2017, 'BMW', '330i', null),
  ('d3d05eed-0002-4000-a000-000000000009', 'd3d05eed-0001-4000-a000-000000000001',
   timestamptz '2026-07-06 12:00:00-05', '2020 Hyundai Elantra SEL', 'Title transfer', 'CC-2230',
   '5NPD84LF7LH890123', 2020, 'Hyundai', 'Elantra', null),
  ('d3d05eed-0002-4000-a000-000000000010', 'd3d05eed-0001-4000-a000-000000000002',
   timestamptz '2026-06-24 09:25:00-05', '2016 Ram 1500 Big Horn', 'Lien perfection', 'RB-860',
   '1C6RR7LT8GS901234', 2016, 'Ram', '1500', null),
  ('d3d05eed-0002-4000-a000-000000000011', 'd3d05eed-0001-4000-a000-000000000003',
   timestamptz '2026-06-19 16:15:00-05', '2022 Kia Telluride SX', 'Title & registration', 'LK-1250',
   '5XYP3DHC9NG012345', 2022, 'Kia', 'Telluride', null),
  ('d3d05eed-0002-4000-a000-000000000012', 'd3d05eed-0001-4000-a000-000000000004',
   timestamptz '2026-07-09 08:55:00-05', '2019 Subaru Outback Premium', 'Title transfer', 'GC-505',
   '4S4BSANC1K3012346', 2019, 'Subaru', 'Outback', null);

-- Set the real status / attention across the pipeline (post-insert; see note above).
update public.dealer_transactions as dt set
  status            = v.status,
  needs_attention   = v.needs_attention,
  attention_note    = v.attention_note,
  status_updated_at = v.status_updated_at
from (values
  ('d3d05eed-0002-4000-a000-000000000001'::uuid, 'picked_up',        false, null::text,                                                                                           timestamptz '2026-06-24 15:00:00-05'),
  ('d3d05eed-0002-4000-a000-000000000002'::uuid, 'ready_for_pickup', false, null,                                                                                                 timestamptz '2026-07-07 11:30:00-05'),
  ('d3d05eed-0002-4000-a000-000000000003'::uuid, 'in_progress',      true,  'Title shows a prior lien from Whitney Bank — need the signed lien release before we can transfer.',   timestamptz '2026-07-06 10:10:00-05'),
  ('d3d05eed-0002-4000-a000-000000000004'::uuid, 'received',         false, null,                                                                                                 timestamptz '2026-07-03 11:45:00-05'),
  ('d3d05eed-0002-4000-a000-000000000005'::uuid, 'submitted',        false, null,                                                                                                 timestamptz '2026-07-08 09:40:00-05'),
  ('d3d05eed-0002-4000-a000-000000000006'::uuid, 'picked_up',        false, null,                                                                                                 timestamptz '2026-06-26 14:20:00-05'),
  ('d3d05eed-0002-4000-a000-000000000007'::uuid, 'in_progress',      false, null,                                                                                                 timestamptz '2026-07-05 13:00:00-05'),
  ('d3d05eed-0002-4000-a000-000000000008'::uuid, 'ready_for_pickup', false, null,                                                                                                 timestamptz '2026-07-07 09:15:00-05'),
  ('d3d05eed-0002-4000-a000-000000000009'::uuid, 'received',         false, null,                                                                                                 timestamptz '2026-07-06 12:00:00-05'),
  ('d3d05eed-0002-4000-a000-000000000010'::uuid, 'in_progress',      true,  'Buyer name on the ID does not match the title — waiting on a corrected bill of sale.',                timestamptz '2026-07-01 16:40:00-05'),
  ('d3d05eed-0002-4000-a000-000000000011'::uuid, 'picked_up',        false, null,                                                                                                 timestamptz '2026-06-27 10:00:00-05'),
  ('d3d05eed-0002-4000-a000-000000000012'::uuid, 'submitted',        false, null,                                                                                                 timestamptz '2026-07-09 08:55:00-05')
) as v(id, status, needs_attention, attention_note, status_updated_at)
where dt.id = v.id;

commit;

-- ----------------------------------------------------------------------------
-- Summary — what this run seeded (row counts by table).
-- ----------------------------------------------------------------------------
select 'dealers'            as table_name, count(*) as demo_rows from public.dealers            where id::text like 'd3d05eed-%'
union all select 'dealer_transactions', count(*) from public.dealer_transactions where id::text like 'd3d05eed-%'
union all select 'customers',           count(*) from public.customers           where id::text like 'd3d05eed-%'
union all select 'vehicles',            count(*) from public.vehicles            where id::text like 'd3d05eed-%'
union all select 'customer_vehicles',   count(*) from public.customer_vehicles   where id::text like 'd3d05eed-%'
union all select 'checkins',            count(*) from public.checkins            where id::text like 'd3d05eed-%'
order by table_name;
