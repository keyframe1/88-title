-- ============================================================================
-- 88 Title — DEMO seed CLEANUP
--
-- Deletes exactly the rows scripts/seed-demo.sql created — every seeded row has a
-- fixed id beginning `d3d05eed-` (reads "d3d0 seed"), a 32-bit prefix no real,
-- randomly-generated id can carry. So this removes the demo data and nothing else:
-- real dealers, customers, Anthony's record, and the real Test Dealership are
-- untouched.
--
-- HOW TO RUN
--   Paste this whole file into the Supabase dashboard SQL editor and Run (it
--   executes as `postgres`, same as the seed). Safe to run repeatedly — a second
--   run simply deletes zero rows. See scripts/seed-demo.sql to re-seed.
--
-- Do NOT run this in CI. It writes to the live database.
-- ============================================================================
begin;

-- Child rows before parents (FKs are ON DELETE CASCADE/SET NULL, but explicit
-- ordering keeps the intent obvious and the counts below honest).
delete from public.customer_vehicles   where id::text like 'd3d05eed-%';
delete from public.checkins            where id::text like 'd3d05eed-%';
delete from public.dealer_transactions where id::text like 'd3d05eed-%';
delete from public.vehicles            where id::text like 'd3d05eed-%';
delete from public.customers           where id::text like 'd3d05eed-%';
delete from public.dealers             where id::text like 'd3d05eed-%';

commit;

-- ----------------------------------------------------------------------------
-- Summary — should be all zeros after cleanup.
-- ----------------------------------------------------------------------------
select 'dealers'            as table_name, count(*) as demo_rows_remaining from public.dealers            where id::text like 'd3d05eed-%'
union all select 'dealer_transactions', count(*) from public.dealer_transactions where id::text like 'd3d05eed-%'
union all select 'customers',           count(*) from public.customers           where id::text like 'd3d05eed-%'
union all select 'vehicles',            count(*) from public.vehicles            where id::text like 'd3d05eed-%'
union all select 'customer_vehicles',   count(*) from public.customer_vehicles   where id::text like 'd3d05eed-%'
union all select 'checkins',            count(*) from public.checkins            where id::text like 'd3d05eed-%'
order by table_name;
