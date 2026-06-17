"use client";

import { useState } from "react";
import Link from "next/link";
import { PlateButton } from "@/components/PlateButton";
import {
  PUBLIC_TAG_FEE,
  serviceFees,
  type ServiceLineItem,
} from "@/lib/services";

/** Whole-dollar display only. */
function formatUSD(amount: number): string {
  return `$${amount}`;
}

/**
 * The 88 Title service-fee calculator.
 *
 * The customer toggles the 88 Title services they need; the summary keeps a
 * running subtotal of *those service fees only*. The statutory $23 public tag
 * fee is shown as its own always-included, locked line and is deliberately
 * NEVER summed into that subtotal.
 *
 * This is intentionally NOT a total-cost or tax estimator. It adds up known
 * 88 Title menu prices client-side — no tax logic, no state-fee math, no
 * "final total." The honest disclosure makes that boundary unmissable.
 */
export function ServiceFeeCalculator() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const chosen = serviceFees.filter((service) => selected.has(service.id));
  const subtotal = chosen.reduce((sum, service) => sum + service.amount, 0);

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      {/* ---- Left: the locked statutory fee + selectable services ---------- */}
      <div>
        <LockedFeeCard fee={PUBLIC_TAG_FEE} />

        <fieldset className="mt-6">
          <legend className="font-display text-lg font-extrabold text-ink">
            Add the 88 Title services you need
          </legend>
          <p className="mt-1 text-sm text-fog">
            Pick any that apply. Your subtotal updates as you go.
          </p>

          <ul className="mt-4 space-y-2">
            {serviceFees.map((service) => (
              <li key={service.id}>
                <ServiceToggle
                  service={service}
                  checked={selected.has(service.id)}
                  onToggle={() => toggle(service.id)}
                />
              </li>
            ))}
          </ul>
        </fieldset>
      </div>

      {/* ---- Right: running summary (sticky on desktop) -------------------- */}
      <aside className="lg:sticky lg:top-8">
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          <div className="border-b border-line bg-mist p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-fog">
              88 Title service fees
            </p>
            <p
              className="mt-1 font-display text-4xl font-extrabold text-ink"
              aria-live="polite"
            >
              {formatUSD(subtotal)}
            </p>
            <p className="mt-1 text-sm font-semibold text-plate">
              Service fees only — not your final total
            </p>
          </div>

          <div className="p-5">
            {chosen.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {chosen.map((service) => (
                  <li
                    key={service.id}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="min-w-0 text-ink">{service.label}</span>
                    <span className="shrink-0 font-semibold text-ink">
                      {formatUSD(service.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fog">
                No services selected yet. Choose the ones you need and they’ll
                add up here.
              </p>
            )}

            {/* The $23 is shown as its own line, always included, never summed
                into the service-fee subtotal above. */}
            <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-4">
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink">
                <LockGlyph />
                {PUBLIC_TAG_FEE.label}
                <span className="font-normal text-fog">(always included)</span>
              </span>
              <span className="shrink-0 font-semibold text-ink">
                {formatUSD(PUBLIC_TAG_FEE.amount)}
              </span>
            </div>
          </div>

          {/* The honest boundary — prominent and unmissable. */}
          <div className="border-t-2 border-ink bg-mist p-5">
            <p className="font-display text-sm font-extrabold uppercase tracking-wide text-ink">
              This is not your final total
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-fog">
              This shows 88 Title’s service fees. State fees and taxes depend on
              your specific vehicle and parish and are calculated at the counter.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <PlateButton href="/check-in" size="lg" className="w-full">
            Check in online
          </PlateButton>
          <Link
            href="/checklist"
            className="mt-3 inline-block font-semibold text-ink underline-offset-4 transition-colors hover:text-plate hover:underline"
          >
            See what to bring →
          </Link>
        </div>
      </aside>
    </div>
  );
}

/**
 * The statutory $23 line. Always present, visually locked, never toggleable,
 * and always shown with the OMV disclosure.
 */
function LockedFeeCard({ fee }: { fee: ServiceLineItem }) {
  return (
    <div className="rounded-2xl border border-ink/15 bg-mist p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <LockGlyph />
            <span className="font-display text-lg font-extrabold text-ink">
              {fee.label}
            </span>
            <span className="inline-flex items-center rounded-full border border-ink/20 bg-paper px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink">
              Always included · set by the state
            </span>
          </div>
          {fee.note ? (
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-fog">
              {fee.note}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 font-display text-2xl font-extrabold text-ink">
          {formatUSD(fee.amount)}
        </span>
      </div>
    </div>
  );
}

/** A single selectable 88 Title service, rendered as an accessible checkbox. */
function ServiceToggle({
  service,
  checked,
  onToggle,
}: {
  service: ServiceLineItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
        checked ? "border-ink bg-mist" : "border-line bg-paper hover:border-ink"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-display text-base font-extrabold text-ink">
            {service.label}
          </span>
          {service.unconfirmed ? (
            <span className="inline-flex items-center rounded-full border border-plate/30 bg-paper px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-plate">
              Sample price
            </span>
          ) : null}
        </span>
        {service.description ? (
          <span className="mt-0.5 block text-sm text-fog">
            {service.description}
          </span>
        ) : null}
        {service.note ? (
          <span className="mt-1 block text-xs leading-relaxed text-fog">
            {service.note}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 font-display text-lg font-extrabold text-ink">
        {formatUSD(service.amount)}
      </span>
    </label>
  );
}

/** Small lock glyph marking the statutory, non-negotiable line. */
function LockGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0 text-ink"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M10 2a3.5 3.5 0 0 0-3.5 3.5V8H6a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-.5V5.5A3.5 3.5 0 0 0 10 2Zm2 6V5.5a2 2 0 1 0-4 0V8h4Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
