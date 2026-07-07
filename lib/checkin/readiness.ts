/**
 * Optional, opt-in checklist-readiness handoff + display helpers.
 *
 * The DocumentFinder checklist tool (the hero of each /services/[slug] page) is a
 * private, client-only tool: nothing is saved by default. When (and only when) a
 * customer opts in, we carry a minimal readiness summary from the checklist into
 * their check-in so staff can prepare. This module is the bridge:
 *
 *   - PendingReadiness + the sessionStorage helpers move the opt-in summary from
 *     the checklist tool to the check-in form within the same tab. It is
 *     ephemeral (sessionStorage, cleared once the check-in submits or is
 *     declined) and holds no PII: only the transaction slug and which item ids
 *     were marked ready.
 *   - summarizeReadiness() resolves a stored CheckinReadiness against the live
 *     checklist into the counts + labels the check-in confirmation and the staff
 *     console render.
 *   - sanitizeReadyIds() is the server-side guard: keep only ids that really
 *     belong to the transaction, so a tampered submission cannot store junk.
 *
 * Every storage access is best-effort. In private mode or with storage disabled
 * the reads return null and the writes no-op, so the opt-in simply does not
 * carry and check-in behaves exactly as before.
 */
import { getTransactionPath } from "@/lib/checklists";
import type { CheckinReadiness } from "./types";

const PENDING_READINESS_KEY = "88title.checkin.readiness";

/** The opt-in summary handed from the checklist to /check-in (same tab). No PII. */
export interface PendingReadiness {
  /** Transaction slug the checklist was for (must match the check-in's visit). */
  serviceType: string;
  /** Checklist item ids the customer marked ready. */
  ready: string[];
  /** Epoch ms when the customer opted in; most-recent-wins. */
  savedAt: number;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isPendingReadiness(value: unknown): value is PendingReadiness {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.serviceType === "string" &&
    isStringArray(v.ready) &&
    typeof v.savedAt === "number"
  );
}

/**
 * Stash the opt-in summary for the check-in form to pick up. Best-effort. The
 * savedAt stamp is added here (not at the call site) so React components can
 * trigger this from an event handler without an impure call in render scope.
 */
export function savePendingReadiness(
  pending: Omit<PendingReadiness, "savedAt">,
): void {
  try {
    const record: PendingReadiness = { ...pending, savedAt: Date.now() };
    window.sessionStorage.setItem(
      PENDING_READINESS_KEY,
      JSON.stringify(record),
    );
  } catch {
    // Private mode / storage disabled: the opt-in simply does not carry.
  }
}

/**
 * The raw stored string, or null. A stable primitive on purpose, so it is safe
 * to read through useSyncExternalStore (useClientValue) without churning a new
 * object every render. Parse it with parsePendingReadiness.
 */
export function readPendingReadinessRaw(): string | null {
  try {
    return window.sessionStorage.getItem(PENDING_READINESS_KEY);
  } catch {
    return null;
  }
}

/** Validate + parse a raw value; null if absent, malformed, or unreadable. */
export function parsePendingReadiness(
  raw: string | null,
): PendingReadiness | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isPendingReadiness(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Read + parse in one shot, for callers outside of render. */
export function readPendingReadiness(): PendingReadiness | null {
  return parsePendingReadiness(readPendingReadinessRaw());
}

/** Forget any pending summary (after it is submitted, or when declined). */
export function clearPendingReadiness(): void {
  try {
    window.sessionStorage.removeItem(PENDING_READINESS_KEY);
  } catch {
    // ignore
  }
}

/**
 * Keep only the ready ids that actually belong to `serviceType`'s checklist, in
 * the checklist's own order and de-duplicated. The server-side trust boundary:
 * a hand-crafted submission cannot smuggle arbitrary strings into the row.
 */
export function sanitizeReadyIds(
  serviceType: string,
  ready: readonly string[],
): string[] {
  const path = getTransactionPath(serviceType);
  if (!path) return [];
  const wanted = new Set(ready);
  return path.items
    .filter((item) => wanted.has(item.id))
    .map((item) => item.id);
}

/** A readiness summary resolved against the live checklist, ready to render. */
export interface ReadinessSummary {
  /** How many of the transaction's items the customer marked ready. */
  readyCount: number;
  /** Total items in the transaction's checklist. */
  total: number;
  /** Labels of items NOT marked ready, in checklist order. */
  missingLabels: string[];
  /** True when every item was marked ready. */
  allReady: boolean;
}

/**
 * Resolve a stored readiness against the transaction's current checklist into
 * counts + the human labels of what is missing. Counting by what the checklist
 * still contains makes it robust to stray/renamed ids. Returns null when there
 * is no readiness or the transaction is unknown (nothing to show).
 */
export function summarizeReadiness(
  serviceType: string,
  readiness: CheckinReadiness | null,
): ReadinessSummary | null {
  if (!readiness) return null;
  const path = getTransactionPath(serviceType);
  if (!path) return null;
  const ready = new Set(readiness.ready);
  const missing = path.items.filter((item) => !ready.has(item.id));
  const total = path.items.length;
  return {
    readyCount: total - missing.length,
    total,
    missingLabels: missing.map((item) => item.label),
    allReady: missing.length === 0,
  };
}
