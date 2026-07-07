-- ============================================================================
-- 88 Title — Activity-log security verification (run in the Supabase SQL editor)
--
-- Run this AFTER applying 20260627120000_activity_log.sql. The whole script runs
-- inside ONE transaction that ROLLS BACK at the end, so it persists nothing. Read
-- the RAISE NOTICE output: every line should say "PASS".
--
-- What it proves:
--   * anon is hard-denied (privilege error) on activity_log — it is never public.
--   * an authenticated NON-staff (dealer) session reads ZERO rows (RLS is_staff()).
--   * APPEND-ONLY: authenticated has no UPDATE and no DELETE grant, so a rewrite
--     is a privilege error for everyone (staff included — the missing grant is
--     role-wide), independent of RLS. This is the core integrity guarantee.
--
-- Staff SELECT/INSERT is proven separately by the live app (it needs a real staff
-- JWT, which a bare `set role` cannot synthesize) — every instrumented action's
-- successful log line is that proof.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- anon is hard-denied (no grant at all → privilege error, before RLS).
-- ----------------------------------------------------------------------------
do $$
declare ok boolean;
begin
  set local role anon;
  begin
    perform 1 from public.activity_log limit 1;
    ok := false;  -- should not reach here
  exception when insufficient_privilege then
    ok := true;
  end;
  reset role;
  if ok then raise notice 'PASS: anon is denied (privilege error) on activity_log';
  else raise warning 'FAIL: anon could read activity_log'; end if;
end$$;

-- ----------------------------------------------------------------------------
-- authenticated NON-staff (dealer) sees nothing. A bare `set role authenticated`
-- has no JWT, so auth.uid() is NULL and is_staff() is false: a logged-in dealer.
-- ----------------------------------------------------------------------------
do $$
declare n int;
begin
  set local role authenticated;
  select count(*) into n from public.activity_log;  -- has SELECT grant; RLS filters all rows
  reset role;
  if n = 0 then raise notice 'PASS: authenticated non-staff reads 0 activity_log rows';
  else raise warning 'FAIL: authenticated non-staff read % activity_log rows', n; end if;
end$$;

-- ----------------------------------------------------------------------------
-- APPEND-ONLY: UPDATE is not granted to authenticated (no update policy, and no
-- update privilege), so the command errors at the privilege layer even on an
-- empty table — for staff and non-staff alike.
-- ----------------------------------------------------------------------------
do $$
declare denied boolean;
begin
  set local role authenticated;
  begin
    update public.activity_log set summary = 'tamper';
    denied := false;  -- should not reach here
  exception when insufficient_privilege then
    denied := true;
  end;
  reset role;
  if denied then raise notice 'PASS: authenticated cannot UPDATE activity_log (append-only)';
  else raise warning 'FAIL: authenticated was able to UPDATE activity_log'; end if;
end$$;

-- ----------------------------------------------------------------------------
-- APPEND-ONLY: DELETE is likewise not granted → privilege error.
-- ----------------------------------------------------------------------------
do $$
declare denied boolean;
begin
  set local role authenticated;
  begin
    delete from public.activity_log;
    denied := false;  -- should not reach here
  exception when insufficient_privilege then
    denied := true;
  end;
  reset role;
  if denied then raise notice 'PASS: authenticated cannot DELETE activity_log (append-only)';
  else raise warning 'FAIL: authenticated was able to DELETE activity_log'; end if;
end$$;

rollback;

-- Reminder: this script rolled everything back. Nothing above persisted.
