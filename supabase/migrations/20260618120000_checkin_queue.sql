-- ============================================================================
-- 88 Title — Public check-in queue
-- One table (public.checkins) plus the helpers, view, RLS, and realtime that
-- make a no-account customer queue safe to run on the open internet.
--
-- This migration is idempotent and forward-only: it can be re-run safely
-- (CREATE ... IF NOT EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS before
-- CREATE POLICY, guarded publication add) and it never drops data.
--
-- It depends on the dealer-portal migration (20260617120000_dealer_portal.sql)
-- for public.is_staff() — the SAME staff-role helper is reused here, so a
-- counter staffer who can see all dealer transactions can also see the full
-- queue. Migrations are applied in filename order, so is_staff() already exists.
--
-- ----------------------------------------------------------------------------
-- SECURITY MODEL (read this before changing anything below)
-- ----------------------------------------------------------------------------
-- This table holds customer PII (name, phone, email, renewal_date) AND is read
-- by anonymous visitors (the public live queue). The two must never meet. The
-- design mirrors the dealer portal's "RLS is the gate, SECURITY DEFINER helpers
-- resolve identity" approach, adapted from "authenticated dealer" to two new
-- shapes of caller:
--
--   * STAFF (authenticated + in staff_users) — reused is_staff(). Sees every
--     column of every row and may change status. Identical trust model to the
--     dealer portal; same helper, same JWT-derived check.
--
--   * A CUSTOMER (anonymous) — has no login. Their key to their OWN record is a
--     122-bit random session_token (a capability secret, like a password-reset
--     link). They never read the table directly; they call SECURITY DEFINER
--     functions that take the token and return only their row. This is the
--     "helper-function where it fits" the dealer portal used for current_dealer_id().
--
--   * THE PUBLIC (anonymous, no token) — the live lobby/queue display. Gets a
--     PII-FREE projection only, enforced TWO independent ways (defense in depth):
--       1. Column-level GRANTs: anon may SELECT only
--          (id, ticket_code, service_type, status, created_at) on the base
--          table — name/phone/email/renewal_date/session_token/push_subscription
--          are NOT granted, so `select *` or `select name` as anon is a hard
--          privilege error. This is also what bounds the realtime payload: a
--          subscriber can only ever receive columns it is granted.
--       2. A dedicated view (public.checkin_queue) that selects ONLY non-PII
--          columns plus a computed position. It is the public read surface.
--
-- Why a customer cannot read another customer's record:
--   * Customers have NO direct SELECT policy on PII columns at all (anon's
--     column grant excludes them; there is no anon SELECT policy returning PII).
--   * They read their row exclusively through get_checkin(token), which filters
--     `where session_token = p_token`. The token is unguessable and is never
--     exposed by the public view, realtime, or any other read path, so holding
--     it is proof of ownership of exactly one row.
--   * They cannot UPDATE directly (no anon UPDATE policy). The only writes a
--     customer can make are through save_push_subscription(token, …) and
--     cancel_checkin(token), each of which is scoped by the same token and may
--     touch only its own narrow column / transition.
--   * The service ("secret") key bypasses RLS but the web app never loads it
--     (see dealer-portal docs). Every web request uses the publishable/anon key
--     and is therefore RLS- and column-grant-constrained.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Ticket-code generator. Short, human-callable codes for the lobby board
-- ("Now serving B12"). A sequence guarantees uniqueness without a read; the
-- code cycles A1..A99, B1..B99, … (confusable letters I/O/Q omitted).
--
-- SECURITY DEFINER so an anonymous INSERT can fire this column DEFAULT without
-- being granted USAGE on the sequence directly. Fixed empty search_path; every
-- name schema-qualified (the dealer-portal SECURITY DEFINER convention).
-- ----------------------------------------------------------------------------
create sequence if not exists public.checkin_ticket_seq;

create or replace function public.gen_ticket_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  n          bigint;
  letters    constant text := 'ABCDEFGHJKLMNPRSTUVWXYZ';  -- no I, O, Q
  span       constant int  := 99;
  letter_idx int;
  num        int;
begin
  n := nextval('public.checkin_ticket_seq');
  letter_idx := ((n - 1) / span) % length(letters);  -- 0-based letter
  num        := ((n - 1) % span) + 1;                 -- 1..99
  return substr(letters, letter_idx + 1, 1) || num::text;
end;
$$;

-- ----------------------------------------------------------------------------
-- Table
-- ----------------------------------------------------------------------------
create table if not exists public.checkins (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),

  -- Customer-entered PII. Staff-only at the column-grant level (see grants).
  name              text,
  phone             text,
  email             text,

  -- One of the transaction slugs in lib/checklists.ts. Kept in sync by hand
  -- (SQL can't import TS); the CHECK is the enforcement point.
  service_type      text not null
    check (service_type in (
      'title-transfer', 'new-to-louisiana', 'duplicate-title',
      'inherited-vehicle', 'registration-renewal', 'plates', 'notary'
    )),

  status            text not null default 'waiting'
    check (status in ('waiting', 'in_progress', 'complete', 'cancelled')),

  -- Short public code (e.g. "B12"); generated, not customer-supplied.
  ticket_code       text not null default public.gen_ticket_code(),

  -- The customer's capability secret for their own record. Random, unguessable,
  -- never exposed to other readers. UNIQUE so get_checkin() resolves one row.
  session_token     uuid not null default gen_random_uuid(),

  -- Renewal-capture (the start of the retention database). Only meaningful for
  -- registration-renewal; nullable otherwise.
  renewal_date      date,
  -- Explicit, opt-in (default false) consent to a future renewal reminder.
  marketing_consent boolean not null default false,

  -- Web Push subscription JSON ({ endpoint, keys:{p256dh, auth} }). Sensitive
  -- (a send capability), so staff-only at the column-grant level.
  push_subscription jsonb,

  -- A reminder is only useful if we can reach them: consent requires a contact.
  constraint checkins_consent_needs_contact
    check (not marketing_consent or (email is not null or phone is not null)),

  -- Light bounds on public free-text input (defense, not validation UX).
  constraint checkins_name_len  check (name  is null or char_length(name)  <= 120),
  constraint checkins_phone_len check (phone is null or char_length(phone) <= 40),
  constraint checkins_email_len check (email is null or char_length(email) <= 200)
);

-- Queue ordering + fast "how many ahead of me" counts.
create index if not exists checkins_status_created_idx
  on public.checkins (status, created_at);
create index if not exists checkins_waiting_created_idx
  on public.checkins (created_at) where status = 'waiting';
-- The customer's lookup key.
create unique index if not exists checkins_session_token_idx
  on public.checkins (session_token);

-- ----------------------------------------------------------------------------
-- Customer-facing helpers (SECURITY DEFINER; token-scoped). These are the ONLY
-- way an anonymous customer touches their row. Each is owner-run (bypasses RLS)
-- but self-limits to the row whose session_token matches the supplied secret.
-- ----------------------------------------------------------------------------

-- Read your own status + live position. Returns 0 rows for an unknown/expired
-- token. `position` is your 1-based place in line; `ahead` is people in front
-- (drives the ETA estimate). Both are 0 once you're being served or done.
create or replace function public.get_checkin(p_token uuid)
returns table (
  ticket_code   text,
  status        text,
  service_type  text,
  name          text,
  created_at    timestamptz,
  renewal_date  date,
  position      int,
  ahead         int
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.ticket_code,
    c.status,
    c.service_type,
    c.name,
    c.created_at,
    c.renewal_date,
    case when c.status = 'waiting' then (
      select count(*)::int from public.checkins w
      where w.status = 'waiting' and w.created_at <= c.created_at
    ) else 0 end as position,
    case when c.status = 'waiting' then (
      select count(*)::int from public.checkins w
      where w.status = 'waiting' and w.created_at < c.created_at
    ) else 0 end as ahead
  from public.checkins c
  where c.session_token = p_token
  limit 1;
$$;

-- Attach (or replace) the browser push subscription for your own active record.
-- Returns true when a row matched. Touches ONLY push_subscription.
create or replace function public.save_push_subscription(
  p_token uuid,
  p_subscription jsonb
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  touched int;
begin
  update public.checkins
    set push_subscription = p_subscription
    where session_token = p_token
      and status in ('waiting', 'in_progress');
  get diagnostics touched = row_count;
  return touched > 0;
end;
$$;

-- Cancel your own spot (only while still waiting). Returns true when it applied.
create or replace function public.cancel_checkin(p_token uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  touched int;
begin
  update public.checkins
    set status = 'cancelled'
    where session_token = p_token
      and status = 'waiting';
  get diagnostics touched = row_count;
  return touched > 0;
end;
$$;

comment on function public.get_checkin(uuid) is
  'Token-scoped read of one check-in (own PII + live position). SECURITY DEFINER; the session_token secret is the authorization.';
comment on function public.save_push_subscription(uuid, jsonb) is
  'Token-scoped attach of a Web Push subscription to the caller''s own active check-in.';
comment on function public.cancel_checkin(uuid) is
  'Token-scoped cancel of the caller''s own still-waiting check-in.';

-- ----------------------------------------------------------------------------
-- Public, PII-free queue projection. The lobby board / homepage read this. It
-- exposes ONLY non-PII columns plus a computed position. Defined security_invoker
-- = off (owner-run) ON PURPOSE: it is the controlled, provably-PII-free window
-- that every visitor — even a signed-in dealer whose base-table RLS would
-- otherwise return nothing — can read. The projection lists no PII column, so
-- the bypass cannot leak one. (The base table's anon column grants below are the
-- second, independent lock; realtime rides those, not this view.)
-- ----------------------------------------------------------------------------
create or replace view public.checkin_queue
with (security_invoker = off) as
  select
    c.ticket_code,
    c.service_type,
    c.status,
    c.created_at,
    case when c.status = 'waiting' then (
      select count(*)::int from public.checkins w
      where w.status = 'waiting' and w.created_at <= c.created_at
    ) else 0 end as position
  from public.checkins c
  where c.status in ('waiting', 'in_progress')
  order by (c.status = 'in_progress') desc, c.created_at asc;

comment on view public.checkin_queue is
  'PII-free public live queue (ticket_code, service_type, status, position). No name/phone/email/renewal_date/token by construction.';

-- ----------------------------------------------------------------------------
-- Enable RLS. With RLS on and no matching policy, access is denied by default.
-- ----------------------------------------------------------------------------
alter table public.checkins enable row level security;

-- ---- INSERT ----------------------------------------------------------------
-- Anyone may join the queue (no auth), but only as a fresh 'waiting' row. The
-- column GRANT (below) is what stops anon from setting status/ticket_code/
-- push_subscription at insert time; this WITH CHECK is the belt to that braces.
drop policy if exists checkins_insert_public on public.checkins;
create policy checkins_insert_public
  on public.checkins for insert to anon
  with check (status = 'waiting');

-- Staff may also add a walk-in / phone-in from the counter.
drop policy if exists checkins_insert_staff on public.checkins;
create policy checkins_insert_staff
  on public.checkins for insert to authenticated
  with check (public.is_staff() and status in ('waiting', 'in_progress'));

-- ---- SELECT ----------------------------------------------------------------
-- Anonymous visitors may see ACTIVE rows only — and, by the column grant, only
-- the non-PII columns. This row policy is what realtime evaluates for anon
-- subscribers, so anon realtime is likewise limited to active rows, non-PII
-- columns. (Completed/cancelled rows drop off the public board entirely.)
drop policy if exists checkins_select_public on public.checkins;
create policy checkins_select_public
  on public.checkins for select to anon
  using (status in ('waiting', 'in_progress'));

-- Staff see everything (all rows, all columns — the column grant for
-- authenticated is full; this row policy is the gate).
drop policy if exists checkins_select_staff on public.checkins;
create policy checkins_select_staff
  on public.checkins for select to authenticated
  using (public.is_staff());

-- ---- UPDATE ----------------------------------------------------------------
-- Status changes are staff-driven. Customers never UPDATE directly (they use
-- the token-scoped SECURITY DEFINER helpers above).
drop policy if exists checkins_update_staff on public.checkins;
create policy checkins_update_staff
  on public.checkins for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- Grants. RLS is the row gate; column-level GRANTs are the PII gate. The anon
-- role gets SELECT on non-PII columns only and INSERT on the customer-supplied
-- columns only. authenticated gets full DML (RLS then constrains it to staff).
-- ----------------------------------------------------------------------------
revoke all on table public.checkins from anon;
revoke all on table public.checkins from authenticated;

-- anon: read the board (no PII columns), and join the queue (own input only).
grant select (id, ticket_code, service_type, status, created_at)
  on table public.checkins to anon;
grant insert (name, phone, email, service_type, session_token, renewal_date, marketing_consent)
  on table public.checkins to anon;

-- authenticated (staff): full column access; RLS limits which rows.
grant select, insert, update on table public.checkins to authenticated;

-- The PII-free view is readable by everyone.
grant select on public.checkin_queue to anon, authenticated;

-- Customer helper functions: callable by anon (and staff).
revoke all on function public.get_checkin(uuid)                        from public;
revoke all on function public.save_push_subscription(uuid, jsonb)      from public;
revoke all on function public.cancel_checkin(uuid)                     from public;
grant execute on function public.get_checkin(uuid)                     to anon, authenticated;
grant execute on function public.save_push_subscription(uuid, jsonb)   to anon, authenticated;
grant execute on function public.cancel_checkin(uuid)                  to anon, authenticated;
-- gen_ticket_code runs as the anon INSERT's column default; keep it owner-only
-- otherwise (anon never calls it explicitly, but the default needs execute).
grant execute on function public.gen_ticket_code()                     to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Realtime. Add the table to Supabase's realtime publication so staff and
-- customers get live updates. RLS + the column grants above mean each subscriber
-- receives only the rows/columns it is allowed — anon never sees a PII column.
-- Guarded so the migration also runs on a plain Postgres without the publication.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'checkins'
  ) then
    execute 'alter publication supabase_realtime add table public.checkins';
  end if;
exception
  when undefined_object then
    -- No supabase_realtime publication (non-Supabase Postgres). Safe to skip.
    null;
end$$;
