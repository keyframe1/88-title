/**
 * Business-day helpers (pure, no Supabase). The daily reconciliation report is a
 * calendar-day report for the office, so "today" and the day window are anchored
 * to the BUSINESS timezone, not UTC and not the server's zone. A tag agency is
 * closed by evening so this rarely changes bucketing, but a reconciliation report
 * must be exact and defensible, so we do it properly (and DST-safely).
 *
 * Used on both the server (compute the day window for the DAL query, and the
 * default "today") and the client (format a transaction's time in the office's
 * zone), so it stays framework-free.
 */

/** 88 Title is in Metairie, LA (Central Time). One place to change it. */
export const BUSINESS_TZ = "America/Chicago";

/** The YYYY-MM-DD calendar date "now" in the business timezone. */
export function businessToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ }).format(now);
}

/**
 * The UTC half-open window [startIso, endIso) covering the business-local
 * calendar day `day` (YYYY-MM-DD). A transaction belongs to `day` when its
 * created_at is >= startIso and < endIso.
 */
export function businessDayWindow(day: string): {
  startIso: string;
  endIso: string;
} {
  const start = zonedMidnightUtc(day);
  const end = zonedMidnightUtc(nextCalendarDay(day));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** Format a UTC ISO instant as a short local time in the business zone, e.g. "1:07 PM". */
export function formatBusinessTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Format a YYYY-MM-DD date as a long, human label, e.g. "Monday, July 6, 2026". */
export function formatDayLabel(day: string): string {
  // Parse the date at noon UTC so the calendar date is never shifted by the zone.
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dt);
}

// --- internals --------------------------------------------------------------

/** The UTC instant of local midnight (start of day) for `day` in BUSINESS_TZ. */
function zonedMidnightUtc(day: string): Date {
  // Treat the calendar date as if it were UTC midnight, then correct by the
  // zone's offset AT that instant. Midnight is never in a DST gap (transitions
  // happen at 2 a.m. local), so the offset there is the day's opening offset.
  const guess = new Date(`${day}T00:00:00Z`);
  const offsetMinutes = zoneOffsetMinutes(guess);
  return new Date(guess.getTime() - offsetMinutes * 60_000);
}

/** Offset in minutes of BUSINESS_TZ from UTC at instant `date` (east of UTC positive). */
function zoneOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return Math.round((asIfUtc - date.getTime()) / 60_000);
}

/** The calendar date after `day` (YYYY-MM-DD), rolling months/years correctly. */
function nextCalendarDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}
