"use client";

import { useEffect, useState } from "react";
import { useLocale, useUi } from "@/lib/i18n/client";
import { useHydrated } from "@/lib/hooks/use-client";
import { useLiveQueue } from "@/components/checkin/LiveQueueProvider";
import { resolveOpenState } from "@/lib/site-hours";

/**
 * The quiet live-status line under the hero CTA. One line, two facts:
 *
 *  - the current wait, from the shared live-queue subscription (same source as
 *    the compact board — no second subscription); and
 *  - open/closed, computed client-side in America/Chicago from lib/site.ts.
 *
 * Both are browser-only, so the server renders a neutral, fixed-height
 * placeholder and the real text fills in after hydration — no mismatch, and the
 * reserved height means zero layout shift. Information, not decoration.
 */

/** Current day + minute in America/Chicago, from the browser clock. */
function chicagoNow(): { dayIndex: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayIndex = dayMap[get("weekday")] ?? 0;
  // hour12:false can emit "24" at midnight on some engines; normalize to 0.
  const hour = Number.parseInt(get("hour"), 10) % 24;
  const minute = Number.parseInt(get("minute"), 10);
  return { dayIndex, minutes: hour * 60 + minute };
}

/** Format minutes-since-midnight as a locale wall-clock time, e.g. "5:00 PM". */
function formatTime(locale: string, minutes: number): string {
  const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Localized long weekday name for a 0 (Sunday) .. 6 (Saturday) index. */
function weekdayName(locale: string, dayIndex: number): string {
  // 2024-01-07 is a Sunday, so +dayIndex lands on the matching weekday.
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
    new Date(2024, 0, 7 + dayIndex, 12),
  );
}

export function HomeHeroStatus({ className }: { className?: string }) {
  const ui = useUi();
  const locale = useLocale();
  const hydrated = useHydrated();
  const shared = useLiveQueue();

  // Re-render each minute so "Open now / Opens…" stays honest across the close
  // time even if the queue itself doesn't change.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const s = ui.home.heroStatus;
  const base =
    "flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-medium leading-snug text-fog min-h-[2.25rem] sm:min-h-[1.375rem]";
  const classes = `${base} ${className ?? ""}`;

  // SSR / pre-hydration: reserve the height, render nothing (no clock, no mismatch).
  if (!hydrated) {
    return <p className={classes} aria-hidden="true" />;
  }

  const waiting = shared
    ? shared.rows.filter((row) => row.status === "waiting").length
    : 0;
  const queueReady = shared?.ready ?? false;
  const queueText = waiting === 0 ? s.noWait : s.waiting(waiting);

  const now = chicagoNow();
  const state = resolveOpenState(now.dayIndex, now.minutes);
  let hoursText: string;
  if (state.open) {
    hoursText = s.open(formatTime(locale, state.closesMinutes));
  } else {
    const time = formatTime(locale, state.opensMinutes);
    const day =
      state.dayOffset === 0
        ? s.today
        : state.dayOffset === 1
          ? s.tomorrow
          : weekdayName(locale, (now.dayIndex + state.dayOffset) % 7);
    hoursText = s.opens(day, time);
  }

  return (
    <p className={classes} aria-live="polite">
      {queueReady ? (
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              waiting === 0 ? "bg-fog/50" : "bg-plate"
            }`}
            aria-hidden="true"
          />
          {queueText}
        </span>
      ) : null}
      {queueReady ? (
        <span aria-hidden="true" className="text-line">
          ·
        </span>
      ) : null}
      <span>{hoursText}</span>
    </p>
  );
}
