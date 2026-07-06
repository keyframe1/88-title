import { SITE } from "./site";

/**
 * Open/closed resolution for the office, derived from the single source of truth
 * (SITE.hours.spec in lib/site.ts). Pure and timezone-agnostic: the caller passes
 * the current day + minute already resolved to America/Chicago (via Intl), and
 * this returns whether the counter is open and, if not, when it next opens.
 *
 * The hero status line is the only consumer today, but keeping the schedule math
 * here (not in a component) keeps it testable and tied to the hours data.
 */

const DAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/** "HH:MM" (24h) to minutes since midnight. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => Number.parseInt(n, 10));
  return h * 60 + m;
}

interface DaySchedule {
  open: number;
  close: number;
}

/** The week as an array indexed 0 (Sunday) .. 6 (Saturday); null = closed. */
function weekSchedule(): Array<DaySchedule | null> {
  const week: Array<DaySchedule | null> = [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ];
  for (const block of SITE.hours.spec) {
    const open = toMinutes(block.opens);
    const close = toMinutes(block.closes);
    for (const day of block.days) {
      const idx = DAY_INDEX[day];
      if (idx !== undefined) week[idx] = { open, close };
    }
  }
  return week;
}

export type OpenState =
  | { open: true; closesMinutes: number }
  | { open: false; opensMinutes: number; dayOffset: number };

/**
 * Resolve the open state for a Chicago wall-clock moment.
 *
 * @param dayIndex 0 = Sunday .. 6 = Saturday (already in America/Chicago)
 * @param minutes  minutes since midnight (already in America/Chicago)
 * @returns when open, the closing minute; when closed, the next opening minute
 *          and how many days ahead it is (0 = later today, 1 = tomorrow).
 */
export function resolveOpenState(
  dayIndex: number,
  minutes: number,
): OpenState {
  const week = weekSchedule();
  const today = week[dayIndex];

  if (today && minutes >= today.open && minutes < today.close) {
    return { open: true, closesMinutes: today.close };
  }
  if (today && minutes < today.open) {
    return { open: false, opensMinutes: today.open, dayOffset: 0 };
  }
  for (let offset = 1; offset <= 7; offset++) {
    const sched = week[(dayIndex + offset) % 7];
    if (sched) {
      return { open: false, opensMinutes: sched.open, dayOffset: offset };
    }
  }
  // No schedule configured at all — treat as closed with no known opening.
  return { open: false, opensMinutes: 0, dayOffset: 0 };
}
