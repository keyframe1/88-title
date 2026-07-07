"use server";

/**
 * Activity-log read actions (the client Activity view + the ledger's History
 * affordance call these). Server-side is the real trust boundary: each re-resolves
 * identity via the DAL and refuses a non-staff caller, on top of the database's
 * is_staff() RLS. The log is read-only from the app - there is intentionally NO
 * write action here; rows are appended only as a side effect of the instrumented
 * staff actions (see lib/activity/log.ts), never on their own.
 *
 *   - getActivityPageAction     staff: one page of the (optionally filtered) feed.
 *   - getEntityActivityAction   staff: one entity's full history (the ledger popover).
 */
import { getDealerContext } from "@/lib/dealers/dal";
import { getActivityForEntity, getActivityPage } from "./dal";
import type {
  ActivityEntityType,
  ActivityLogEntry,
  ActivityPage,
} from "./types";

const EMPTY_PAGE: ActivityPage = { rows: [], hasMore: false };

/** One page (newest first) of the activity feed. Empty for a non-staff caller. */
export async function getActivityPageAction(
  entityType: ActivityEntityType | null,
  page: number,
): Promise<ActivityPage> {
  const ctx = await getDealerContext();
  if (!ctx || !ctx.isStaff) return EMPTY_PAGE;
  try {
    return await getActivityPage(entityType, page);
  } catch {
    return EMPTY_PAGE;
  }
}

/** One entity's full activity history (newest first). [] for a non-staff caller. */
export async function getEntityActivityAction(
  entityType: ActivityEntityType,
  entityId: string,
): Promise<ActivityLogEntry[]> {
  const ctx = await getDealerContext();
  if (!ctx || !ctx.isStaff) return [];
  if (!entityId) return [];
  try {
    return await getActivityForEntity(entityType, entityId);
  } catch {
    return [];
  }
}
