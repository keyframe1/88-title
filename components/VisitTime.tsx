import { getUiText } from "@/lib/i18n/server";

/**
 * Small static "what to expect" panel. Pairs with the document checklist: the
 * online check-in that keeps you out of a waiting room, Saturday hours, and a
 * one-line explanation of how check-in works.
 */
export async function VisitTime() {
  const ui = await getUiText();

  return (
    <section
      aria-labelledby="visit-time-heading"
      className="rounded-2xl border border-line bg-mist p-6 sm:p-7"
    >
      <h2 id="visit-time-heading" className="text-xl font-extrabold">
        {ui.visit.heading}
      </h2>

      <dl className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-fog">
            {ui.visit.waitLabel}
          </dt>
          <dd className="mt-1.5 font-display text-xl font-extrabold text-ink">
            {ui.visit.waitValue}
            <span className="mt-1 block font-sans text-xs font-medium leading-relaxed text-fog">
              {ui.visit.waitHint}
            </span>
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-fog">
            {ui.visit.saturdayLabel}
          </dt>
          <dd className="mt-1.5 font-display text-xl font-extrabold text-ink">
            {ui.visit.saturdayValue}
            <span className="mt-1 block font-sans text-xs font-medium leading-relaxed text-fog">
              {ui.visit.saturdayHint}
            </span>
          </dd>
        </div>
      </dl>

      <p className="mt-6 border-t border-line pt-5 text-sm leading-relaxed text-fog">
        <span className="font-semibold text-ink">{ui.visit.howLabel}</span>
        {ui.visit.howBody}
      </p>
    </section>
  );
}
