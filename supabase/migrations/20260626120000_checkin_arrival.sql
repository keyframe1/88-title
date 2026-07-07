-- ============================================================================
-- 88 Title - Check-in arrival tracking ("hold my spot" -> "I'm actually here")
--
-- A customer who checks in online may still be on the way. Arrival is ORTHOGONAL
-- to the queue status (waiting / in_progress / no_show / ...): it is a timestamp,
-- not a state, so it is a single nullable column - NOT a new status value. A row
-- is "in lobby" once arrived_at is set, "on the way" while it is null, at any
-- waiting/serving status.
--
-- Two ways to set it, both already-established patterns:
--   * The customer, self-service, from their own status page - via a token-scoped
--     SECURITY DEFINER helper (set_arrived) that self-limits to the row whose
--     session_token matches the supplied secret, exactly like get_checkin /
--     cancel_checkin. The token is the authorization.
--   * Staff, as a backup, with a one-tap "Mark arrived" - an ordinary staff
--     UPDATE, already permitted by the existing is_staff() UPDATE policy and the
--     table-level authenticated column grant (which covers this new column).
--
-- This migration is idempotent and forward-only (ADD COLUMN IF NOT EXISTS,
-- CREATE OR REPLACE, DROP ... IF EXISTS before CREATE) and never drops data.
--
-- Depends on the check-in-queue migration (20260618120000) for public.checkins
-- and its helper functions. Migrations apply in filename order.
-- ============================================================================

-- The arrival timestamp. Nullable = not yet arrived. Staff-writable via the
-- existing table-level authenticated grant; NOT added to the anon column grants,
-- so it never reaches the public board and a customer can only set it through the
-- token-scoped helper below (never a direct write).
alter table public.checkins
  add column if not exists arrived_at timestamptz;

comment on column public.checkins.arrived_at is
  'When the customer confirmed they are physically in the lobby (self-service via set_arrived(token) or a staff tap). NULL = on the way. Orthogonal to status; not a queue state. Never in the anon column grants or the public board.';

-- ----------------------------------------------------------------------------
-- get_checkin(token): add arrived_at to the returned row so the customer's own
-- status page can show "we know you're here" instead of the "I'm here" button.
--
-- The RETURNS TABLE signature changes, which CREATE OR REPLACE cannot do, so we
-- DROP then CREATE and RE-GRANT execute afterwards (grants are dropped with the
-- function). Nothing else references get_checkin (no policy, no view), so the
-- drop is safe. Body is unchanged except for the added, final column.
-- ----------------------------------------------------------------------------
drop function if exists public.get_checkin(uuid);

create function public.get_checkin(p_token uuid)
returns table (
  ticket_code    text,
  status         text,
  service_type   text,
  name           text,
  created_at     timestamptz,
  renewal_date   date,
  queue_position int,
  ahead          int,
  arrived_at     timestamptz
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
    ) else 0 end as queue_position,
    case when c.status = 'waiting' then (
      select count(*)::int from public.checkins w
      where w.status = 'waiting' and w.created_at < c.created_at
    ) else 0 end as ahead,
    c.arrived_at
  from public.checkins c
  where c.session_token = p_token
  limit 1;
$$;

comment on function public.get_checkin(uuid) is
  'Token-scoped read of one check-in (own PII + live position + arrival). SECURITY DEFINER; the session_token secret is the authorization.';

-- ----------------------------------------------------------------------------
-- set_arrived(token): the customer marks themselves present from their own
-- status page. Token-scoped SECURITY DEFINER, self-limiting to the row whose
-- session_token matches, and only while the check-in is still active. Idempotent:
-- coalesce keeps the FIRST arrival time, so a second tap does not move it.
-- Returns true when the token matched an active row. Mirrors cancel_checkin.
-- ----------------------------------------------------------------------------
create or replace function public.set_arrived(p_token uuid)
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
    set arrived_at = coalesce(arrived_at, now())
    where session_token = p_token
      and status in ('waiting', 'in_progress', 'no_show');
  get diagnostics touched = row_count;
  return touched > 0;
end;
$$;

comment on function public.set_arrived(uuid) is
  'Token-scoped self-service arrival: marks the caller''s own active check-in as in the lobby (keeps the first arrival time). SECURITY DEFINER; the session_token secret is the authorization. Mirrors cancel_checkin.';

-- ----------------------------------------------------------------------------
-- Grants. get_checkin was dropped, so re-grant it. set_arrived is callable by an
-- anonymous customer (and staff), like the other token-scoped helpers; keep it
-- owner-only otherwise.
-- ----------------------------------------------------------------------------
revoke all on function public.get_checkin(uuid)  from public;
revoke all on function public.set_arrived(uuid)  from public;
grant execute on function public.get_checkin(uuid)  to anon, authenticated;
grant execute on function public.set_arrived(uuid)  to anon, authenticated;
