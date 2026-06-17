import { SITE } from "@/lib/site";

/**
 * Small static "what to expect" panel. Sets the time expectation that pairs
 * with the document checklist: typical visit length (a sample until measured),
 * Saturday hours, and a one-line explanation of how check-in works.
 */
export function VisitTime() {
  return (
    <section
      aria-labelledby="visit-time-heading"
      className="rounded-2xl border border-line bg-mist p-6 sm:p-7"
    >
      <h2 id="visit-time-heading" className="text-xl font-extrabold">
        What to expect
      </h2>

      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-fog">
            Typical visit
          </dt>
          <dd className="mt-1 font-display text-xl font-extrabold text-ink">
            {SITE.typicalVisitPlaceholder}
            <span className="mt-0.5 block font-sans text-xs font-medium text-fog">
              sample, pending real measurement
            </span>
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-fog">
            Saturday hours
          </dt>
          <dd className="mt-1 font-display text-xl font-extrabold text-ink">
            9:00 AM – 1:00 PM
            <span className="mt-0.5 block font-sans text-xs font-medium text-fog">
              hours subject to confirmation
            </span>
          </dd>
        </div>
      </dl>

      <p className="mt-5 text-sm leading-relaxed text-fog">
        <span className="font-semibold text-ink">How check-in works:</span> pick
        your transaction, bring the documents on your checklist, and check in
        online — your spot is ready when you walk in.
      </p>
    </section>
  );
}
