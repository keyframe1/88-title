-- ============================================================================
-- 88 Title — Security hardening pass
--
-- Two surgical changes, no behavior change to any legitimate flow:
--
--   PART A — SECURITY DEFINER lockdown (finish what the per-feature migrations
--            already started). Revoke the one needless EXECUTE grant left on a
--            SECURITY DEFINER trigger function, and stamp the public PII-free
--            view as an intentional, reviewed owner-run ("definer") view.
--
--   PART B — Anti-spam throttle on the PUBLIC, anonymous check-in INSERT only.
--            A BEFORE INSERT trigger caps check-ins per email and per phone in a
--            rolling window, plus a global per-minute ceiling. Staff counter
--            walk-ins and the service role are never throttled.
--
-- This migration is idempotent and forward-only: it can be re-run safely
-- (CREATE OR REPLACE, REVOKE is idempotent, DROP TRIGGER IF EXISTS before CREATE,
-- CREATE INDEX IF NOT EXISTS) and it never drops data.
--
-- It depends on the dealer-portal migration for public.is_staff() and the
-- check-in-queue migration for public.checkins / public.checkin_queue /
-- public.dealers_guard_protected_columns. Migrations apply in filename order, so
-- all of those already exist.
-- ============================================================================


-- ============================================================================
-- PART A — SECURITY DEFINER lockdown
-- ============================================================================
--
-- Audit of every SECURITY DEFINER function in the schema and the decision taken:
--
--   KEEP (token-scoped anon helpers — each self-limits to the row whose
--   session_token matches the supplied secret; anon MUST keep EXECUTE):
--     • get_checkin(uuid)               WHERE session_token = p_token
--     • cancel_checkin(uuid)            WHERE session_token = p_token
--     • save_push_subscription(uuid,…)  WHERE session_token = p_token
--
--   KEEP (policy-referenced — authenticated EXECUTE is required for RLS policies
--   to evaluate; revoking would break every dealer/staff policy):
--     • is_staff()
--     • current_dealer_id()
--
--   KEEP (column DEFAULT on public.checkins.ticket_code — fired by the anon
--   INSERT, so anon genuinely needs EXECUTE; a DEFAULT expression is evaluated
--   with the inserting role's privileges):
--     • gen_ticket_code()
--
--   LOCK DOWN (this migration):
--     • dealers_guard_protected_columns() — a BEFORE UPDATE trigger function. A
--       trigger function is invoked by the trigger machinery and does NOT require
--       the triggering role to hold EXECUTE on it (this is exactly why the
--       *_touch_updated_at trigger functions in later migrations already carry
--       `revoke all … from public`). It was the one SECURITY DEFINER function
--       left with the implicit PUBLIC EXECUTE grant. Nothing calls it directly,
--       so revoke it. The trigger still fires for staff, dealers, and the service
--       role unchanged.
--
--   NOT PRESENT (named in the hardening brief as a candidate, but this schema has
--   no such function): rls_auto_enable — no-op, nothing to do.
--
-- Revoking from PUBLIC removes the implicit grant from anon, authenticated, AND
-- service_role; none of them call this function directly, and the trigger fires
-- regardless of EXECUTE. The function owner retains the privilege.
revoke all on function public.dealers_guard_protected_columns() from public;

comment on function public.dealers_guard_protected_columns() is
  'BEFORE UPDATE trigger fn (SECURITY DEFINER): pins protected dealer columns for non-staff. EXECUTE revoked from PUBLIC by the security-hardening migration — triggers fire without an EXECUTE grant, and nothing calls it directly.';

-- public.checkin_queue is an owner-run (security_invoker = off) view ON PURPOSE:
-- it is the single, provably PII-free public window onto the queue, readable even
-- by a signed-in dealer whose base-table RLS would otherwise return nothing. Its
-- column list (ticket_code, service_type, status, created_at, queue_position)
-- contains ZERO PII — no name/phone/email/renewal_date/session_token — so the
-- owner-run bypass cannot leak one. Verified during the security pass; do NOT
-- switch this view to security_invoker.
comment on view public.checkin_queue is
  'INTENTIONAL owner-run (security_invoker=off) view. PII-free by construction: exposes only ticket_code, service_type, status, queue_position (+created_at). Reviewed in the security-hardening pass — do not switch to security_invoker and do not add a PII column.';


-- ============================================================================
-- PART B — Anti-spam throttle on the PUBLIC anon check-in INSERT only
-- ============================================================================
--
-- Goal: a durable, Postgres-backed (no external service) brake on automated
-- check-in spam that NEVER blocks a legitimate first check-in and never touches
-- a staff counter walk-in. It is enforced at the database, so it holds no matter
-- which client makes the request.
--
-- Design:
--   • A BEFORE INSERT row trigger on public.checkins. It counts the REAL rows
--     already in the table within a rolling window — there is no side table to
--     get out of sync, and it survives restarts by construction.
--   • SECURITY DEFINER so it can count across all rows (the count needs to read
--     the PII email/phone columns, which anon cannot select). Fixed empty
--     search_path; every name is schema-qualified (the SECURITY DEFINER
--     convention used throughout this schema). count()/now()/lower()/btrim()/
--     regexp_replace() all live in the always-present pg_catalog.
--   • Fail closed: only the anonymous web role is throttled; if the caller's role
--     cannot be determined it is treated as anon (the throttled path), and any
--     unexpected error inside the trigger aborts the insert rather than letting a
--     write slip through.
--   • Friendly rejection: each cap raises with SQLSTATE 'PT429'. PostgREST maps
--     the PT### class to HTTP status (→ 429 Too Many Requests), and the check-in
--     server action maps code 'PT429' to a localized, friendly message
--     (lib/checkin/actions.ts → errors.tooManyCheckins). A first check-in always
--     sees a count of 0 and passes.
--
-- Tuning lives in ONE place: the constant block at the top of the function.
create or replace function public.checkins_throttle()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  -- ── Tunable caps (the single place to adjust the throttle) ───────────────
  c_email_max     constant int      := 3;                    -- check-ins per email …
  c_email_window  constant interval := interval '1 hour';    --   … in this rolling window
  c_phone_max     constant int      := 3;                    -- check-ins per phone …
  c_phone_window  constant interval := interval '1 hour';    --   … in this rolling window
  c_global_max    constant int      := 30;                   -- total check-ins (any contact) …
  c_global_window constant interval := interval '1 minute';  --   … in this rolling window
  -- Phones shorter than this (after stripping non-digits) are treated as "no
  -- real number" and skip the per-phone cap.
  c_phone_min_len constant int      := 7;
  -- ─────────────────────────────────────────────────────────────────────────
  v_email text;
  v_phone text;
  v_count int;
begin
  -- Throttle the PUBLIC ANON path ONLY. A request with NO Supabase session has a
  -- NULL auth.uid() — that is exactly the public web check-in. Any authenticated
  -- session (staff counter walk-in; a logged-in user) has a non-NULL uid and
  -- bypasses. We key on auth.uid() rather than auth.role() because auth.uid() is
  -- the same primitive every RLS policy in this schema already relies on, so it is
  -- guaranteed present; a NULL uid fails closed onto the throttled path. (A dealer
  -- is authenticated, so it bypasses here, but the staff-only INSERT policy then
  -- blocks its write anyway — it can no more spam the queue than throttling would
  -- have stopped.)
  if (select auth.uid()) is not null then
    return new;
  end if;

  -- Global per-minute ceiling. The backstop against a distributed flood that
  -- rotates through many different emails/phones to dodge the per-contact caps.
  select count(*) into v_count
  from public.checkins
  where created_at >= now() - c_global_window;
  if v_count >= c_global_max then
    raise exception
      'Check-in is unusually busy right now. Please wait a moment and try again.'
      using errcode = 'PT429';
  end if;

  -- Per-email cap. Normalized (lowercased, trimmed) so a repeat submitter using
  -- the same address collides regardless of casing/whitespace.
  v_email := lower(btrim(coalesce(new.email, '')));
  if v_email <> '' then
    select count(*) into v_count
    from public.checkins
    where created_at >= now() - c_email_window
      and lower(btrim(coalesce(email, ''))) = v_email;
    if v_count >= c_email_max then
      raise exception
        'You have already checked in a few times recently. Please wait a little while, or call us and we will add you to the line.'
        using errcode = 'PT429';
    end if;
  end if;

  -- Per-phone cap. Normalized to digits only so "(504) 555-1212" and
  -- "5045551212" collide. Skipped for blank / implausibly short input.
  v_phone := regexp_replace(coalesce(new.phone, ''), '\D', '', 'g');
  if char_length(v_phone) >= c_phone_min_len then
    select count(*) into v_count
    from public.checkins
    where created_at >= now() - c_phone_window
      and regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_phone;
    if v_count >= c_phone_max then
      raise exception
        'You have already checked in a few times recently. Please wait a little while, or call us and we will add you to the line.'
        using errcode = 'PT429';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.checkins_throttle() is
  'BEFORE INSERT trigger fn (SECURITY DEFINER) throttling the PUBLIC anon check-in path only (auth.uid() IS NULL): per-email & per-phone caps in a rolling window plus a global per-minute ceiling. Caps are constants at the top of the function. Any authenticated session (staff walk-in) bypasses. Raises SQLSTATE PT429 (→ HTTP 429) on a cap.';

-- A plain created_at index makes all three rolling-window counts a cheap range
-- scan as the table grows (the existing indexes lead with status, so a bare
-- created_at range cannot use them efficiently).
create index if not exists checkins_created_idx on public.checkins (created_at);

-- Wire the trigger. BEFORE INSERT, per row.
drop trigger if exists checkins_throttle_before_insert on public.checkins;
create trigger checkins_throttle_before_insert
  before insert on public.checkins
  for each row
  execute function public.checkins_throttle();

-- Trigger functions fire without an EXECUTE grant on the invoking role, so keep
-- this owner-only (the *_touch_updated_at trigger functions do the same).
revoke all on function public.checkins_throttle() from public;
