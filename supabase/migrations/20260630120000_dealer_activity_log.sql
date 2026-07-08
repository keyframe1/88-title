-- ============================================================================
-- 88 Title - Log the ONE dealer-originated activity event: a filed transaction
--
-- The activity_log (20260627120000) is staff-only at every layer: its INSERT
-- policy is `with check (is_staff())` and authenticated holds only SELECT+INSERT.
-- A dealer is not staff, so a dealer-context INSERT through the request-scoped
-- (RLS-constrained) client is refused. That is correct for every other event -
-- dealers must never write, and never read, the audit trail.
--
-- But one dealer action deserves a durable trail entry: FILING a transaction.
-- This migration adds a single, narrowly-scoped SECURITY DEFINER function that a
-- dealer may call to record exactly that event, and nothing else:
--
--   * SECURITY DEFINER (owner = the migration role, which bypasses RLS), so the
--     insert is not blocked by the is_staff() INSERT policy. This is the sanctioned
--     server-side path; the app's own logActivity() helper stays staff-only.
--   * Self-scoped: it logs ONLY the caller's OWN just-filed transaction. The row
--     must satisfy dealer_id = current_dealer_id(), which derives solely from the
--     caller's JWT, so a dealer can never forge an event for another dealer's work,
--     inject an arbitrary summary, or choose the actor. actor is forced to
--     auth.uid(); the summary/detail are composed here from the trusted row.
--   * SELECT is UNCHANGED. Dealers still cannot read activity_log (no SELECT grant,
--     no SELECT policy branch for them). This only opens a keyhole write for the
--     one event, never a read.
--
-- Idempotent and forward-only (create or replace; guarded grants).
--
-- Depends on:
--   * 20260617120000 for public.current_dealer_id();
--   * 20260627120000 for public.activity_log.
-- ============================================================================

create or replace function public.log_dealer_tx_filed(p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dealer_id   uuid := public.current_dealer_id();
  v_actor       uuid := (select auth.uid());
  v_dealership  text;
  v_stock       text;
  v_vehicle     text;
  v_type        text;
begin
  -- Not a dealer (staff / unauthenticated): nothing for this keyhole to log.
  if v_dealer_id is null or v_actor is null then
    return;
  end if;

  -- Resolve the dealership + the deal's identifying details, but ONLY when the
  -- transaction is this dealer's own. A mismatched / missing id resolves nothing
  -- and we log nothing (no forged events for another dealer's work).
  select
    d.dealership_name,
    t.stock_number,
    coalesce(
      nullif(trim(concat_ws(' ', t.vehicle_year, t.vehicle_make, t.vehicle_model)), ''),
      t.vehicle_description
    ),
    t.transaction_type
  into v_dealership, v_stock, v_vehicle, v_type
  from public.dealer_transactions t
  join public.dealers d on d.id = t.dealer_id
  where t.id = p_transaction_id
    and t.dealer_id = v_dealer_id;

  if not found then
    return;
  end if;

  insert into public.activity_log (actor, action, entity_type, entity_id, summary, detail)
  values (
    v_actor,
    'dealer_tx.filed',
    'dealer_transaction',
    p_transaction_id,
    -- Names the dealership and the stock # (the identifiers staff triage by).
    left(
      v_dealership
        || ' filed '
        || case
             when v_stock is not null and length(trim(v_stock)) > 0
               then 'stock #' || v_stock
             else 'a transaction'
           end
        || case
             when v_vehicle is not null and length(trim(v_vehicle)) > 0
               then ' (' || v_vehicle || ')'
             else ''
           end,
      500
    ),
    jsonb_build_object(
      'dealership', v_dealership,
      'stockNumber', v_stock,
      'vehicle', v_vehicle,
      'transactionType', v_type
    )
  );
end;
$$;

comment on function public.log_dealer_tx_filed(uuid) is
  'Records the single dealer-originated activity_log event (dealer_tx.filed) for the caller''s OWN just-filed transaction. SECURITY DEFINER so it bypasses the staff-only INSERT policy; self-scoped to current_dealer_id() so a dealer cannot forge another dealer''s event or the actor. Does NOT grant dealers any SELECT on activity_log.';

revoke all on function public.log_dealer_tx_filed(uuid) from public;
grant execute on function public.log_dealer_tx_filed(uuid) to authenticated;
