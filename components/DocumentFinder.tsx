"use client";

import { useState } from "react";
import { getTransactionPath, transactionPaths } from "@/lib/checklists";
import { PlateButton } from "@/components/PlateButton";

/**
 * The DocumentFinder, 88 Title's no-account, friction-reduction centerpiece.
 *
 * Step 1: the customer picks a transaction type.
 * Step 2: they get the exact "what to bring" checklist, each item checkable.
 * On completion, a "You're ready to check in" CTA appears and links to check-in.
 *
 * Pure client state. No backend, no personal data. Checklists come from the
 * typed config in lib/checklists.ts.
 */
export function DocumentFinder() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const path = selectedSlug ? getTransactionPath(selectedSlug) : undefined;

  function choose(slug: string) {
    setSelectedSlug(slug);
    setChecked({});
  }

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function startOver() {
    setSelectedSlug(null);
    setChecked({});
  }

  // ---- Step 1: choose a transaction type ----------------------------------
  if (!path) {
    return (
      <div>
        <h2 className="text-2xl font-extrabold sm:text-3xl">
          What kind of visit is this?
        </h2>
        <p className="mt-2 text-fog">
          Pick one and we’ll show you exactly what to bring. No account needed.
        </p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {transactionPaths.map((option) => (
            <li key={option.slug}>
              <button
                type="button"
                onClick={() => choose(option.slug)}
                className="group flex h-full w-full items-start gap-3 rounded-xl border border-line bg-paper p-4 text-left transition-colors hover:border-ink focus-visible:border-ink"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-extrabold text-ink">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-sm text-fog">
                    {option.blurb}
                  </span>
                </span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="mt-1 h-5 w-5 shrink-0 text-fog transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M7 4l6 6-6 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
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
        </div>
        <button
          type="button"
          onClick={startOver}
          className="shrink-0 text-sm font-semibold text-fog underline-offset-2 transition-colors hover:text-plate hover:underline"
        >
          Change
        </button>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-sm font-semibold text-ink">
          <span>Your checklist</span>
          <span aria-hidden="true">
            {done} / {total} ready
          </span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${done} of ${total} items ready`}
        >
          <div
            className="h-full rounded-full bg-plate transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        {path.items.map((item) => {
          const isChecked = Boolean(checked[item.id]);
          return (
            <li key={item.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
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

      <div className="mt-6" aria-live="polite">
        {complete ? (
          <div className="rounded-2xl border-2 border-ink bg-mist p-5 text-center">
            <p className="font-display text-lg font-extrabold text-ink">
              You’re ready to check in
            </p>
            <p className="mt-1 text-sm text-fog">
              You’ve gathered everything for a {path.label.toLowerCase()}. Check
              in online and we’ll have your spot ready.
            </p>
            <div className="mt-4 flex justify-center">
              <PlateButton href="/check-in" size="lg">
                Check in online
              </PlateButton>
            </div>
          </div>
        ) : (
          <p className="text-sm text-fog">
            Check off each item as you gather it. When everything’s ready, your
            check-in link appears here.
          </p>
        )}
      </div>
    </div>
  );
}
