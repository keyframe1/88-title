/**
 * Device-local memory of the customer's most recent active check-in, so a
 * returning visitor can resume their live status without an account, a login,
 * or an email lookup. The unguessable session token stays the ONLY key to the
 * record — the same capability-secret model the status page already uses — so
 * we deliberately store no name, phone, or email here. Just enough to resume
 * and to label the return banner: the token, the ticket code, the service
 * slug, and when we saved it.
 *
 * Every access is best-effort. In private mode or with storage disabled, the
 * reads return null and the writes no-op, so the UI simply shows no banner and
 * the URL-borne token remains the fallback path. Nothing here throws.
 */

const ACTIVE_CHECKIN_KEY = "88title.checkin.active";

/** The minimum needed to resume + label the banner. Contains no PII. */
export interface ActiveCheckin {
  /** Capability token — the only key to the check-in (also in the status URL). */
  token: string;
  /** Display ticket, e.g. "A3". May be "" if the readback hadn't landed. */
  ticketCode: string;
  /** Transaction slug (see lib/checklists.ts), resolved to a label for display. */
  serviceType: string;
  /** Epoch ms when we stored it; most-recent-wins and room for a future TTL. */
  savedAt: number;
}

function isActiveCheckin(value: unknown): value is ActiveCheckin {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.token === "string" &&
    v.token.length > 0 &&
    typeof v.ticketCode === "string" &&
    typeof v.serviceType === "string" &&
    typeof v.savedAt === "number"
  );
}

/**
 * The raw stored string, or null. A stable primitive on purpose: it's safe to
 * read through useSyncExternalStore (useClientValue) without a new-object churn
 * loop. Parse it with parseActiveCheckin.
 */
export function readActiveCheckinRaw(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_CHECKIN_KEY);
  } catch {
    return null;
  }
}

/** Validate + parse a raw value; null if absent, malformed, or unreadable. */
export function parseActiveCheckin(raw: string | null): ActiveCheckin | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isActiveCheckin(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Read + parse in one shot, for callers outside of render. */
export function readActiveCheckin(): ActiveCheckin | null {
  return parseActiveCheckin(readActiveCheckinRaw());
}

/** Remember the most recent active check-in, replacing any earlier one. */
export function saveActiveCheckin(checkin: ActiveCheckin): void {
  try {
    window.localStorage.setItem(ACTIVE_CHECKIN_KEY, JSON.stringify(checkin));
  } catch {
    // Private mode / storage disabled — the URL still carries the token.
  }
}

/** Forget the stored check-in entirely. */
export function clearActiveCheckin(): void {
  try {
    window.localStorage.removeItem(ACTIVE_CHECKIN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Forget the stored check-in only if it's the one for `token`. Guards against
 * wiping a newer, still-active check-in when an older/terminal token's status
 * page happens to be open.
 */
export function clearActiveCheckinIfToken(token: string): void {
  const current = readActiveCheckin();
  if (current && current.token === token) {
    clearActiveCheckin();
  }
}
