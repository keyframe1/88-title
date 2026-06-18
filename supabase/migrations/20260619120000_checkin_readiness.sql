-- ============================================================================
-- 88 Title — Optional, self-reported checklist readiness on check-in
--
-- Adds ONE nullable column to public.checkins so a customer can OPT IN to
-- sharing a minimal "what I have ready" summary from the /checklist tool when
-- they check in, letting staff prepare. It is low-sensitivity (the document
-- CATEGORIES the customer marked ready, never document contents and no PII
-- beyond what check-in already collects) and it is protected EXACTLY like the
-- rest of the check-in PII:
--
--   * NOT granted to anon SELECT  -> never on the public board, and never in an
--     anon realtime payload (Supabase Realtime honors column privileges).
--   * NOT added to public.checkin_queue (that view lists non-PII columns only,
--     and readiness is not one of them) -> the public projection stays PII-free.
--   * Granted to anon INSERT       -> a checking-in customer may write their own
--     summary. That insert is the ONLY way the column is ever set.
--   * Visible to STAFF             -> authenticated staff hold full-column SELECT
--     (RLS still limits which rows), so the queue console can read it.
--
-- Shape: jsonb { "ready": ["<checklist-item-id>", ...] } — the ids the customer
-- marked ready for their transaction. The transaction itself is the row's
-- existing service_type; "missing" is derived against lib/checklists.ts at
-- display time. Storing only the ready ids keeps the footprint minimal.
--
-- Idempotent and forward-only (ADD COLUMN IF NOT EXISTS, an additive GRANT, and
-- a guarded CHECK). Ordered AFTER 20260618120000_checkin_queue.sql so the table,
-- the anon grants this extends, and the PII-free view already exist.
-- ============================================================================

alter table public.checkins
  add column if not exists readiness jsonb;

comment on column public.checkins.readiness is
  'Optional, opt-in self-reported checklist readiness: { "ready": [item-id,...] } carried from the /checklist tool. Low-sensitivity (document categories the customer marked ready, not contents). Same protection as PII: not granted to anon SELECT, not in checkin_queue, staff-only on read.';

-- Light defense on this anon-writable column: null, or a small JSON object.
-- (Belt to the column GRANT + RLS braces.) Guarded so the migration stays
-- idempotent, since ADD CONSTRAINT has no IF NOT EXISTS. The cast and functions
-- used are immutable, so they are valid inside a CHECK.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkins_readiness_shape'
  ) then
    alter table public.checkins
      add constraint checkins_readiness_shape
      check (
        readiness is null
        or (
          jsonb_typeof(readiness) = 'object'
          and char_length(readiness::text) <= 4096
        )
      );
  end if;
end$$;

-- Extend the anon INSERT grant to cover readiness (additive; the base set is
-- granted by the prior migration, so re-running both keeps readiness granted).
-- anon SELECT is deliberately NOT extended, so the column can never reach the
-- public board or an anon realtime subscriber.
grant insert (readiness) on table public.checkins to anon;

-- Staff already hold table-wide SELECT/INSERT/UPDATE (granted in the prior
-- migration), so the queue console reads readiness with no further grant.
