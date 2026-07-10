"use client";

import { useState } from "react";
import Link from "next/link";
import { PlateButton } from "@/components/PlateButton";
import { DownloadGlyph } from "@/components/DownloadGlyph";
import { useLocale, useUi } from "@/lib/i18n/client";
import {
  getLocalizedPublicTagFee,
  getLocalizedServiceFees,
  type LocalizedFee,
} from "@/lib/i18n/content/fees";
import {
  getLocalizedPaths,
  type LocalizedTransactionPath,
} from "@/lib/i18n/content/checklists";
import { TRANSACTION_FEE_PRESETS } from "@/lib/services";

/** Whole-dollar display only. */
function formatUSD(amount: number): string {
  return `$${amount}`;
}

/**
 * Selector order — the six utility transactions in the /services card order,
 * then Notary (the walk-in) last, so the two surfaces read the same way.
 */
const SELECTOR_ORDER: readonly string[] = [
  "registration-renewal",
  "title-transfer",
  "plates",
  "new-to-louisiana",
  "duplicate-title",
  "inherited-vehicle",
  "notary",
];

/**
 * The 88 Title fees guide.
 *
 * The page is transaction-aware: the customer starts by picking what they came
 * in for, which PRE-CHECKS the 88 Title service fees that usually apply (from
 * TRANSACTION_FEE_PRESETS) and reveals that transaction's "what to bring"
 * checklist inline. From there they toggle any fee individually — the
 * pre-selection is a starting point, never a lock. Skipping the selector leaves
 * every fee listed and unchecked (the original browse-all behavior).
 *
 * The summary keeps a running subtotal of the selected 88 Title service fees
 * only. The statutory $23 public tag fee is shown as its own always-included,
 * locked line and is deliberately NEVER summed into that subtotal.
 *
 * This is intentionally NOT a total-cost or tax estimator. It adds up known
 * 88 Title menu prices client-side — no tax logic, no state-fee math, no
 * "final total." The honest disclosure makes that boundary unmissable.
 */
export function ServiceFeeCalculator({
  initialService,
}: {
  /** Optional preselected transaction slug from /pricing?service=<slug>. Already
      validated against the known transactions by the server page. */
  initialService?: string;
}) {
  const ui = useUi();
  const locale = useLocale();
  const serviceFees = getLocalizedServiceFees(locale);
  const publicTagFee = getLocalizedPublicTagFee(locale);

  // Selector data: every transaction, localized, in the selector order.
  const bySlug = new Map(
    getLocalizedPaths(locale).map((p) => [p.slug, p] as const),
  );
  const paths = SELECTOR_ORDER.map((slug) => bySlug.get(slug)).filter(
    (p): p is LocalizedTransactionPath => Boolean(p),
  );

  const [selectedService, setSelectedService] = useState<string | null>(
    initialService ?? null,
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialService ? TRANSACTION_FEE_PRESETS[initialService] : []),
  );

  /** Pick a transaction: pre-check its typical fees and reveal its checklist.
      Clicking the active one again clears back to the browse-all state. */
  function selectService(slug: string) {
    if (slug === selectedService) {
      clearService();
      return;
    }
    setSelectedService(slug);
    setSelected(new Set(TRANSACTION_FEE_PRESETS[slug] ?? []));
  }

  function clearService() {
    setSelectedService(null);
    setSelected(new Set());
  }

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

  const activePath = selectedService ? bySlug.get(selectedService) : undefined;
  const chosen = serviceFees.filter((service) => selected.has(service.id));
  const subtotal = chosen.reduce((sum, service) => sum + service.amount, 0);

  return (
    <div className="mt-10">
      {/* ---- Transaction selector -------------------------------------------
              Picking a transaction pre-checks its typical fees below and reveals
              its checklist. Buttons carry aria-pressed so the group is a plain
              keyboard-operable toggle set. ------------------------------------ */}
      <section aria-labelledby="tx-select-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2
            id="tx-select-heading"
            className="font-display text-lg font-extrabold text-ink"
          >
            {ui.pricing.selector.legend}
          </h2>
          {activePath ? (
            <button
              type="button"
              onClick={clearService}
              className="text-sm font-semibold text-fog underline-offset-2 transition-colors hover:text-plate hover:underline"
            >
              {ui.pricing.selector.clear}
            </button>
          ) : null}
        </div>
        <p className="mt-1 max-w-prose text-sm text-fog">
          {ui.pricing.selector.hint}
        </p>

        <div
          className="mt-4 flex flex-wrap gap-2"
          role="group"
          aria-label={ui.pricing.selector.legend}
        >
          {paths.map((path) => {
            const on = selectedService === path.slug;
            return (
              <button
                key={path.slug}
                type="button"
                onClick={() => selectService(path.slug)}
                aria-pressed={on}
                className={`inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors ${
                  on
                    ? "border-ink bg-ink font-semibold text-white"
                    : "border-line bg-paper font-medium text-ink hover:border-ink"
                }`}
              >
                {path.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ---- What to bring (revealed for the selected transaction) ---------- */}
      {activePath ? (
        <section
          aria-labelledby="tx-checklist-heading"
          className="mt-6 rounded-2xl border border-line bg-mist/40 p-5 sm:p-7"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 id="tx-checklist-heading" className="h-section">
              {ui.pricing.selector.whatToBring(activePath.label)}
            </h2>
            <Link
              href={`/services/${activePath.slug}`}
              className="shrink-0 text-sm font-semibold text-ink underline-offset-2 transition-colors hover:text-plate hover:underline"
            >
              {ui.pricing.selector.seeFull(activePath.label)} →
            </Link>
          </div>

          <ul className="mt-5 space-y-2.5">
            {activePath.items.map((item) => (
              <li
                key={item.id}
                className="overflow-hidden rounded-2xl border border-line bg-paper sm:flex sm:items-stretch"
              >
                <div className="flex-1 p-4">
                  <span className="block font-medium text-ink">
                    {item.label}
                  </span>
                  {item.detail ? (
                    <span className="mt-0.5 block text-sm text-fog">
                      {item.detail}
                    </span>
                  ) : null}
                </div>

                {item.form ? (
                  <div className="border-t border-line p-2 sm:flex sm:items-center sm:border-l sm:border-t-0 sm:p-3">
                    <a
                      href={item.form.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={ui.checklist.finder.downloadFormAria(
                        item.form.number,
                        item.form.title,
                      )}
                      className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink underline-offset-2 transition-colors duration-150 hover:text-plate hover:underline focus-visible:text-plate focus-visible:underline sm:w-auto sm:justify-start"
                    >
                      <DownloadGlyph className="h-4 w-4" />
                      {ui.checklist.finder.downloadForm}
                    </a>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---- Fees + running summary ----------------------------------------- */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        {/* Left: the selectable 88 Title services. The statutory $23 fee is NOT
            repeated here as a card; it is disclosed once in the page's highlight
            box and shown once as the always-included line in the summary. */}
        <div>
          <fieldset>
            <legend className="font-display text-lg font-extrabold text-ink">
              {ui.pricing.calc.addLegend}
            </legend>
            {activePath ? (
              <p className="mt-1 text-sm text-fog">
                {ui.pricing.selector.preChecked}
              </p>
            ) : (
              <p className="mt-1 text-sm text-fog">{ui.pricing.calc.pickHint}</p>
            )}

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

        {/* Right: running summary (sticky on desktop) ----------------------- */}
        <aside className="lg:sticky lg:top-8">
          <div className="overflow-hidden rounded-2xl border border-line bg-paper">
            <div className="border-b border-line bg-mist p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-fog">
                {ui.pricing.calc.summaryLabel}
              </p>
              <p
                className="mt-1 font-display text-4xl font-extrabold text-ink tabular-nums"
                aria-live="polite"
              >
                {formatUSD(subtotal)}
              </p>
              <p className="mt-1 text-sm font-semibold text-plate">
                {ui.pricing.calc.serviceFeesOnly}
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
                      <span className="shrink-0 font-semibold text-ink tabular-nums">
                        {formatUSD(service.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fog">
                  {ui.pricing.calc.noneSelected}
                </p>
              )}

              {/* The $23 is shown as its own line, always included, never summed
                  into the service-fee subtotal above. */}
              <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-4">
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink">
                  <LockGlyph />
                  {publicTagFee.label}
                  <span className="font-normal text-fog">
                    {ui.pricing.calc.alwaysIncluded}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-ink tabular-nums">
                  {formatUSD(publicTagFee.amount)}
                </span>
              </div>
            </div>

            {/* The honest boundary — prominent and unmissable. */}
            <div className="border-t-2 border-ink bg-mist p-5">
              <p className="font-display text-sm font-extrabold uppercase tracking-wide text-ink">
                {ui.pricing.calc.notFinalTitle}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-fog">
                {ui.pricing.calc.notFinalBody}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <PlateButton href="/check-in" size="lg" className="w-full">
              {ui.pricing.calc.checkIn}
            </PlateButton>
          </div>
        </aside>
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
  service: LocalizedFee;
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
        <span className="font-display text-base font-extrabold text-ink">
          {service.label}
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
      <span className="shrink-0 font-display text-lg font-extrabold text-ink tabular-nums">
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
