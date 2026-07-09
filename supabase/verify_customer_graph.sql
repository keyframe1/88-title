-- ============================================================================
-- 88 Title - Customer-graph verification (run in the Supabase SQL editor)
--
-- Run this AFTER applying 20260701120000_customer_graph.sql. The whole script
-- runs inside ONE transaction that ROLLS BACK at the end, so it persists nothing.
-- Read the RAISE NOTICE output: every line should say "PASS".
--
-- What it proves:
--   SCHEMA   - customers gained renewal_date + marketing_consent; the
--              customer_vehicles join table and its unique pair exist.
--   RLS/anon - anon is hard-denied (privilege error) on customer_vehicles.
--   RLS/auth - an authenticated NON-staff (dealer) session reads zero
--              customer_vehicles rows and cannot insert one.
--
-- Staff CRUD on the join table is proven separately by the live authenticated
-- flow (it needs a real staff JWT, which a bare `set role` cannot synthesize).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- SCHEMA - new columns + table + unique pair
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers'
      and column_name = 'renewal_date'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers'
      and column_name = 'marketing_consent'
  ) then
    raise notice 'PASS: customers has renewal_date + marketing_consent';
  else
    raise warning 'FAIL: customers is missing a renewal column';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'customer_vehicles'
  ) then
    raise notice 'PASS: customer_vehicles table exists';
  else
    raise warning 'FAIL: customer_vehicles table is missing';
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'customer_vehicles_unique_pair'
  ) then
    raise notice 'PASS: customer_vehicles has the unique (customer_id, vehicle_id) pair';
  else
    raise warning 'FAIL: customer_vehicles is missing its unique pair';
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- RLS - anon hard-denied on customer_vehicles
-- ----------------------------------------------------------------------------
do $$
declare ok boolean;
begin
  set local role anon;
  begin
    perform 1 from public.customer_vehicles limit 1;
    ok := false;  -- should not reach here
  exception when insufficient_privilege then
    ok := true;
  end;
  reset role;
  if ok then raise notice 'PASS: anon is denied (privilege error) on customer_vehicles';
  else raise warning 'FAIL: anon could read customer_vehicles'; end if;
end$$;

-- ----------------------------------------------------------------------------
-- RLS - authenticated NON-staff (dealer) sees nothing and cannot write.
-- A bare `set role authenticated` has no JWT, so auth.uid() is NULL and
-- is_staff() is false: exactly the trust level of a logged-in dealer.
-- ----------------------------------------------------------------------------
do $$
declare n int; wrote boolean;
begin
  set local role authenticated;
  -- Read: has the table grant, but RLS (is_staff()) filters every row out.
  select count(*) into n from public.customer_vehicles;
  -- Write: blocked by the WITH CHECK (is_staff()) policy.
  begin
    insert into public.customer_vehicles (customer_id, vehicle_id)
    values (gen_random_uuid(), gen_random_uuid());
    wrote := true;
  exception when insufficient_privilege then
    wrote := false;
  when foreign_key_violation then
    -- Reached the FK check => RLS let the write through: that is a FAIL.
    wrote := true;
  end;
  reset role;
  if n = 0 then raise notice 'PASS: authenticated non-staff reads 0 customer_vehicles rows';
  else raise warning 'FAIL: authenticated non-staff read % customer_vehicles rows', n; end if;
  if wrote then raise warning 'FAIL: authenticated non-staff inserted a customer_vehicles link';
  else raise notice 'PASS: authenticated non-staff cannot insert a customer_vehicles link'; end if;
end$$;

rollback;

-- Reminder: this script rolled everything back. Nothing above persisted.
