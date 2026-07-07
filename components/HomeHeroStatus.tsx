"use client";

import { useEffect, useState } from "react";
import { useLocale, useUi } from "@/lib/i18n/client";
import { useHydrated } from "@/lib/hooks/use-client";
import { useLiveQueue } from "@/components/checkin/LiveQueueProvider";
import { resolveOpenState } from "@/lib/site-hours";

/**
 * The live-status card directly under the hero CTA. A first-class, designed
 * element (hairline border, light surface) that supports the CTA without ever
 * competing with it. Two facts, two lines:
 *
 *  - line 1 (prominent, ink navy): the current wait, from the shared live-queue
 *    subscription (same source the hero owns — no second subscription), with a
 *    gently pulsing live dot; and
 *  - line 2 (secondary): open/closed, computed client-side in America/Chicago
 *    from lib/site.ts.
 *
 * Both facts are browser-only, so the server renders the same bordered card at a
 * reserved height and the text fills in after hydration — no mismatch, and the
 * reserved min-height means zero layout shift even when the longer ES/VI strings
 * wrap. Information, not decoration.
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
  // A reserved min-height (sized for a wrapped line, content vertically
  // centered) keeps the card the same height pre- and post-hydration and across
  // locales, so it never shifts the hero stack. The card is deliberately flat
  // (no elevation) so it reads as an information chip, never a second button.
  const card =
    "flex min-h-[4.75rem] w-fit max-w-full flex-col justify-center rounded-xl border border-line bg-white/85 px-4 py-2.5";
  const classes = `${card} ${className ?? ""}`;

  // SSR / pre-hydration: render the same bordered card at the reserved height,
  // empty (no clock, no mismatch).
  if (!hydrated) {
    return <div className={classes} aria-hidden="true" />;
  }

  const queueReady = shared?.ready ?? false;
  const waiting = shared
    ? shared.rows.filter((row) => row.status === "waiting").length
    : 0;
  const active = queueReady && waiting > 0;

  const queueText = !queueReady ? s.checking : waiting === 0 ? s.noWait : s.waiting(waiting);
  const dotColor = active ? "bg-plate" : "bg-fog/50";

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
    <div className={classes} aria-live="polite">
      <p className="flex items-start gap-2 text-lg font-semibold leading-tight text-ink tabular-nums sm:text-xl">
        <span
          className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0 items-center justify-center sm:mt-2"
          aria-hidden="true"
        >
          <span
            className={`live-ping absolute inline-flex h-full w-full rounded-full ${dotColor}`}
          />
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`}
          />
        </span>
        <span>{queueText}</span>
      </p>
      <p className="mt-1 text-[15px] font-medium leading-snug text-fog tabular-nums">
        {hoursText}
      </p>
    </div>
  );
}
