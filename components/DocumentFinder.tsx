"use client";

import { useState } from "react";
import Link from "next/link";
import {
  clearPendingReadiness,
  savePendingReadiness,
} from "@/lib/checkin/readiness";
import { PlateButton } from "@/components/PlateButton";
import { ServiceIcon } from "@/components/ServiceIcon";
import { useLocale, useUi } from "@/lib/i18n/client";
import {
  getLocalizedPath,
  getLocalizedPaths,
} from "@/lib/i18n/content/checklists";

/**
 * The DocumentFinder, 88 Title's no-account, friction-reduction centerpiece.
 *
 * Step 1: the customer picks a transaction type.
 * Step 2: they get the exact "what to bring" checklist, each item checkable.
 * On completion, a "You're ready to check in" CTA appears and links to check-in.
 *
 * `initialSlug` lets a deep service page hand the visitor straight into the
 * matching checklist (the /checklist?for=<slug> funnel). It is only an initial
 * value; the customer can still change the transaction here.
 *
 * Pure client state. No backend, no personal data. Checklists come from the
 * typed config in lib/checklists.ts, localized via the translation layer; the
 * item ids carried into check-in are language-neutral.
 */
export function DocumentFinder({ initialSlug }: { initialSlug?: string }) {
  const ui = useUi();
  const locale = useLocale();
  const transactionPaths = getLocalizedPaths(locale);

  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    initialSlug ?? null,
  );
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  // Opt-in: share this list with the front desk at check-in. Off by default, so
  // declining changes nothing. Resets whenever the transaction changes.
  const [share, setShare] = useState(false);

  const path = selectedSlug ? getLocalizedPath(selectedSlug, locale) : undefined;

  function choose(slug: string) {
    setSelectedSlug(slug);
    setChecked({});
    setShare(false);
  }

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function startOver() {
    setSelectedSlug(null);
    setChecked({});
    setShare(false);
  }

  // Runs as the customer leaves for /check-in. If they opted in, stash a minimal
  // readiness summary (transaction + which items are ready, no PII) for the
  // check-in form to pick up; otherwise make sure nothing is left behind.
  function handleCheckInClick() {
    if (share && path) {
      savePendingReadiness({
        serviceType: path.slug,
        ready: path.items.filter((item) => checked[item.id]).map((i) => i.id),
      });
    } else {
      clearPendingReadiness();
    }
  }

  // ---- Step 1: choose a transaction type ----------------------------------
  if (!path) {
    return (
      <div>
        <h2 className="text-2xl font-extrabold sm:text-3xl">
          {ui.checklist.finder.step1Heading}
        </h2>
        <p className="mt-3 leading-relaxed text-fog">
          {ui.checklist.finder.step1Hint}
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {transactionPaths.map((option) => (
            <li key={option.slug}>
              <button
                type="button"
                onClick={() => choose(option.slug)}
                className="service-card group flex h-full w-full items-center gap-4 rounded-2xl border border-line bg-paper p-5 text-left transition duration-200 hover:border-ink hover:shadow-[0_16px_30px_-18px_rgba(20,33,61,0.5)] focus-visible:border-ink motion-safe:hover:-translate-y-1 motion-safe:focus-visible:-translate-y-1"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mist">
                  <ServiceIcon slug={option.slug} className="h-[26px] w-[26px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-extrabold leading-snug text-ink">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-fog">
                    {option.blurb}
                  </span>
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0 text-line transition duration-200 group-hover:text-plate group-focus-visible:text-plate motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ---- Step 2: the checklist ----------------------------------------------
  const total = path.items.length;
  const done = path.items.reduce(
    (count, item) => (checked[item.id] ? count + 1 : count),
    0,
  );
  const complete = total > 0 && done === total;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold sm:text-3xl">{path.label}</h2>
          <p className="mt-2 text-fog">{path.blurb}</p>
          <Link
            href={`/services/${path.slug}`}
            className="mt-2 inline-block text-sm font-semibold text-ink underline-offset-2 transition-colors hover:text-plate hover:underline"
          >
            {ui.checklist.finder.learnMore}
          </Link>
        </div>
        <button
          type="button"
          onClick={startOver}
          className="shrink-0 text-sm font-semibold text-fog underline-offset-2 transition-colors hover:text-plate hover:underline"
        >
          {ui.checklist.finder.change}
        </button>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-sm font-semibold text-ink">
          <span>{ui.checklist.finder.yourChecklist}</span>
          <span aria-hidden="true">{ui.checklist.finder.ready(done, total)}</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={ui.checklist.finder.readyAria(done, total)}
        >
          <div
            className="h-full rounded-full bg-plate transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ul className="mt-5 space-y-2.5">
        {path.items.map((item) => {
          const isChecked = Boolean(checked[item.id]);
          return (
            <li key={item.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition duration-200 ${
                  isChecked
                    ? "border-ink bg-mist"
                    : "border-line bg-paper hover:border-ink"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(item.id)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
                />
                <span className="min-w-0">
                  <span
                    className={`block font-medium text-ink ${
                      isChecked ? "line-through" : ""
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.detail ? (
                    <span className="mt-0.5 block text-sm text-fog">
                      {item.detail}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 space-y-4" aria-live="polite">
        {complete ? (
          <div className="rounded-2xl border-2 border-ink bg-mist p-5 text-center">
            <p className="font-display text-lg font-extrabold text-ink">
              {ui.checklist.finder.completeTitle}
            </p>
            <p className="mt-1 text-sm text-fog">
              {ui.checklist.finder.completeBody(path.label)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-fog">
            {ui.checklist.finder.progressHint}
          </p>
        )}

        {/* Optional: bring this list to the front desk. Opt-in, off by default;
            nothing is shared (or saved) unless this is ticked. */}
        <div className="rounded-2xl border border-line bg-mist/60 p-4 sm:p-5">
          <label className="flex cursor-pointer items-start gap-3 text-left">
            <input
              type="checkbox"
              checked={share}
              onChange={(e) => setShare(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">
                {ui.checklist.finder.shareTitle}
              </span>
              <span className="mt-0.5 block text-sm leading-relaxed text-fog">
                {ui.checklist.finder.shareBody}
              </span>
            </span>
          </label>
        </div>

        <div className="flex justify-center">
          <PlateButton
            href="/check-in"
            size="lg"
            variant="red"
            onClick={handleCheckInClick}
          >
            {ui.checklist.finder.checkIn}
          </PlateButton>
        </div>
      </div>
    </div>
  );
}
