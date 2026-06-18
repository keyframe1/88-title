-- ============================================================================
-- 88 Title — Check-in queue: add a recoverable "no_show" status
--
-- Adds a distinct no_show status for a customer who was called up (in_progress)
-- but did not appear. It is RECOVERABLE, not terminal: staff can call them again
-- (no_show -> in_progress) when they turn up late. complete and cancelled remain
-- the only terminal states, and cancelled stays distinct from no_show.
--
-- Idempotent and forward-only (safe to re-run; never drops data).
--
-- IMPORTANT — why this is a CHECK change, not ALTER TYPE:
--   public.checkins.status is a plain `text` column constrained by an inline
--   CHECK (see 20260618120000_checkin_queue.sql), NOT a Postgres enum. So adding
--   a value is just widening that CHECK. If this column were ever an enum, the
--   new value would instead require `ALTER TYPE ... ADD VALUE`, which cannot run
--   inside a transaction block and would need its own migration; that is not the
--   case here.
--
-- No RLS / grant / view changes are needed or made:
--   * The staff UPDATE policy is `using/with check (is_staff())` already, so it
--     permits the new transitions (in_progress -> no_show, no_show -> in_progress)
--     without modification.
--   * The anon SELECT policy and the public.checkin_queue view both filter to
--     status in ('waiting','in_progress'), so a no_show row is automatically
--     invisible to the public board and to anonymous realtime subscribers.
--   * A customer still sees their own no_show row via get_checkin(token) (it has
--     no status filter), which is exactly what makes the state recoverable.
-- ============================================================================

-- The inline column CHECK from the original migration is auto-named
-- checkins_status_check. Drop-then-add (guarded) keeps this idempotent: every
-- existing row already holds one of the previously allowed values, so widening
-- the set validates cleanly.
alter table public.checkins
  drop constraint if exists checkins_status_check;

alter table public.checkins
  add constraint checkins_status_check
  check (status in ('waiting', 'in_progress', 'no_show', 'complete', 'cancelled'));
