-- ============================================================================
-- 88 Title - Serving-card counter checklist state
--
-- Adds ONE nullable column to public.checkins so staff can tick off the "what to
-- bring" checklist items (lib/checklists.ts) as they verify a customer's
-- documents at the counter. It is REFERENCE state, not enforcement: a running
-- tally of which items the clerk has confirmed for the check-in they are serving,
-- shared across the counter in realtime.
--
-- This is DISTINCT from readiness (20260619120000): readiness is the customer's
-- OPTIONAL, self-reported "what I have ready" from the /checklist tool (anon can
-- write it); checked_items is the STAFF's counter tally (staff-only, never
-- customer-writable). Kept in a separate column so the two never mix.
--
--   * NOT granted to anon (SELECT or INSERT) -> never on the public board, never
--     in an anon realtime payload, and a customer can never set it. Staff-only at
--     every layer, exactly like the queue's other staff-managed writes.
--   * Visible + writable by STAFF -> authenticated staff already hold table-wide
--     SELECT/INSERT/UPDATE (granted in 20260618120000) and the is_staff() UPDATE
--     policy (checkins_update_staff) already covers every column, so this new
--     column needs no further grant or policy. Verified against that migration.
--
-- Shape: jsonb array of checklist item ids the clerk has confirmed, e.g.
--   ["title-signed", "photo-id"]. The transaction is the row's existing
-- service_type; ids are validated against lib/checklists.ts server-side before
-- write (sanitizeCheckedIds), so a tampered request cannot store junk.
--
-- Idempotent and forward-only (ADD COLUMN IF NOT EXISTS + a guarded CHECK) and it
-- never drops data. Ordered AFTER 20260618120000_checkin_queue.sql so the table
-- and the staff grants/policies this relies on already exist.
-- ============================================================================

alter table public.checkins
  add column if not exists checked_items jsonb;

comment on column public.checkins.checked_items is
  'Staff counter checklist tally: jsonb array of lib/checklists.ts item ids the clerk has confirmed for this check-in. Reference state, not enforcement. Staff-only: never granted to anon (SELECT or INSERT), never in checkin_queue, never customer-writable. Distinct from readiness (the customer''s self-reported summary).';

-- Light defense on the column shape (belt to the staff-only grant + RLS braces).
-- null, or a small JSON array. Guarded so the migration stays idempotent, since
-- ADD CONSTRAINT has no IF NOT EXISTS. The cast and functions used are immutable,
-- so they are valid inside a CHECK.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkins_checked_items_shape'
  ) then
    alter table public.checkins
      add constraint checkins_checked_items_shape
      check (
        checked_items is null
        or (
          jsonb_typeof(checked_items) = 'array'
          and char_length(checked_items::text) <= 4096
        )
      );
  end if;
end$$;

-- No grant changes: staff already hold table-wide SELECT/INSERT/UPDATE and the
-- checkins_update_staff policy covers all columns. anon is deliberately NOT
-- granted this column (SELECT or INSERT), so it never reaches the public board
-- and only staff can ever set it.
