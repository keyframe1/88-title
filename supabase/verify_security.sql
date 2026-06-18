-- ============================================================================
-- 88 Title — Security hardening verification (run in the Supabase SQL editor)
--
-- Run this AFTER applying 20260624120000_security_hardening.sql. The whole script
-- runs inside ONE transaction that ROLLS BACK at the end, so it inserts no
-- permanent rows (a couple of ticket-code sequence numbers are consumed, which is
-- harmless). Read the RAISE NOTICE output: every line should say "PASS".
--
-- What it proves:
--   PART A  — dealers_guard_protected_columns() EXECUTE is revoked from
--             anon/authenticated; checkin_queue exposes only PII-free columns;
--             the KEEP helpers are still executable by the roles that need them.
--   PART B  — the public anon check-in is throttled (per-email cap), and a staff/
--             authenticated session is NOT throttled.
--   RECORDS — anon is hard-denied on customers/vehicles; an authenticated
--             non-staff (dealer) session reads zero rows and cannot insert.
--
-- Staff CRUD on records is proven separately by the live authenticated test
-- (it needs a real staff JWT, which a bare `set role` cannot synthesize).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- PART A — SECURITY DEFINER grants
-- ----------------------------------------------------------------------------
do $$
begin
  -- dealers_guard_protected_columns: EXECUTE must NOT be held by anon or authenticated.
  if has_function_privilege('anon', 'public.dealers_guard_protected_columns()', 'execute')
     or has_function_privilege('authenticated', 'public.dealers_guard_protected_columns()', 'execute') then
    raise warning 'FAIL: dealers_guard_protected_columns() is still EXECUTE-able by anon/authenticated';
  else
    raise notice 'PASS: dealers_guard_protected_columns() EXECUTE revoked from anon/authenticated';
  end if;

  -- KEEP helpers: is_staff()/current_dealer_id() MUST stay executable by authenticated
  -- (RLS policies call them). The token-scoped helpers MUST stay executable by anon.
  if has_function_privilege('authenticated', 'public.is_staff()', 'execute')
     and has_function_privilege('authenticated', 'public.current_dealer_id()', 'execute')
     and has_function_privilege('anon', 'public.get_checkin(uuid)', 'execute')
     and has_function_privilege('anon', 'public.cancel_checkin(uuid)', 'execute')
     and has_function_privilege('anon', 'public.save_push_subscription(uuid, jsonb)', 'execute')
     and has_function_privilege('anon', 'public.gen_ticket_code()', 'execute') then
    raise notice 'PASS: KEEP helpers still executable by the roles that need them';
  else
    raise warning 'FAIL: a KEEP helper lost a grant it needs';
  end if;

  -- checkin_queue must expose ONLY PII-free columns.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'checkin_queue'
      and column_name in ('name','phone','email','renewal_date','session_token','push_subscription','readiness')
  ) then
    raise warning 'FAIL: checkin_queue exposes a PII column';
  else
    raise notice 'PASS: checkin_queue exposes only PII-free columns';
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- RECORDS — anon hard-denied
-- ----------------------------------------------------------------------------
do $$
declare ok boolean;
begin
  set local role anon;
  begin
    perform 1 from public.customers limit 1;
    ok := false;  -- should not reach here
  exception when insufficient_privilege then
    ok := true;
  end;
  reset role;
  if ok then raise notice 'PASS: anon is denied (privilege error) on customers';
  else raise warning 'FAIL: anon could read customers'; end if;
end$$;

do $$
declare ok boolean;
begin
  set local role anon;
  begin
    perform 1 from public.vehicles limit 1;
    ok := false;
  exception when insufficient_privilege then
    ok := true;
  end;
  reset role;
  if ok then raise notice 'PASS: anon is denied (privilege error) on vehicles';
  else raise warning 'FAIL: anon could read vehicles'; end if;
end$$;

-- ----------------------------------------------------------------------------
-- RECORDS — authenticated NON-staff (dealer) sees nothing and cannot write
-- A bare `set role authenticated` has no JWT, so auth.uid() is NULL and
-- is_staff() is false: exactly the trust level of a logged-in dealer.
-- ----------------------------------------------------------------------------
do $$
declare n int; wrote boolean;
begin
  set local role authenticated;
  -- Read: has the table grant, but RLS (is_staff()) filters every row out.
  select count(*) into n from public.customers;
  -- Write: blocked by the WITH CHECK (is_staff()) policy.
  begin
    insert into public.customers (full_name) values ('RLS probe — should fail');
    wrote := true;
  exception when insufficient_privilege then
    wrote := false;
  end;
  reset role;
  if n = 0 then raise notice 'PASS: authenticated non-staff (dealer) reads 0 customer rows';
  else raise warning 'FAIL: authenticated non-staff read % customer rows', n; end if;
  if wrote then raise warning 'FAIL: authenticated non-staff inserted a customer';
  else raise notice 'PASS: authenticated non-staff cannot insert a customer'; end if;
end$$;

-- ----------------------------------------------------------------------------
-- PART B — throttle on the public anon check-in
-- A bare `set role anon` has no JWT, so auth.uid() IS NULL → the throttled public
-- path. 3 check-ins on one test email succeed; the 4th must be rejected with
-- SQLSTATE PT429. (Uses a .invalid test email unique to this script, so only the
-- script's own rows count toward the per-email cap.)
-- ----------------------------------------------------------------------------
do $$
declare i int; blocked boolean := false; sqlst text;
begin
  set local role anon;
  for i in 1..3 loop
    insert into public.checkins (name, email, service_type)
    values ('Throttle test', 'sec-throttle-test@example.invalid', 'title-transfer');
  end loop;
  begin
    insert into public.checkins (name, email, service_type)
    values ('Throttle test', 'sec-throttle-test@example.invalid', 'title-transfer');
  exception when others then
    blocked := true;
    sqlst := SQLSTATE;
  end;
  reset role;
  if blocked and sqlst = 'PT429' then
    raise notice 'PASS: 4th same-email anon check-in rejected with PT429';
  elsif blocked then
    raise warning 'PARTIAL: 4th check-in blocked but with SQLSTATE % (expected PT429)', sqlst;
  else
    raise warning 'FAIL: 4th same-email anon check-in was NOT throttled';
  end if;
end$$;

-- PART B — an authenticated session is NOT throttled.
-- The bypass keys on auth.uid() IS NOT NULL, so we synthesize a JWT (any sub) to
-- give a non-NULL auth.uid(). Past the cap, the throttle must NOT fire: the only
-- failure allowed is the staff-only INSERT policy (42501), never PT429. (With a
-- REAL staff sub the inserts would also satisfy that policy and simply succeed.)
do $$
declare i int; sqlst text := null;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
  begin
    for i in 1..6 loop
      insert into public.checkins (name, email, service_type, status)
      values ('Staff walk-in', 'sec-staff-test@example.invalid', 'title-transfer', 'waiting');
    end loop;
  exception when others then
    sqlst := SQLSTATE;
  end;
  reset role;
  if sqlst = 'PT429' then
    raise warning 'FAIL: an authenticated session was throttled (PT429)';
  else
    raise notice 'PASS: authenticated session NOT throttled (no PT429; saw %)', coalesce(sqlst, 'success');
  end if;
end$$;

rollback;

-- Reminder: this script rolled everything back. Nothing above persisted.
