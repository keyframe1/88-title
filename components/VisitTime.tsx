/**
 * Small static "what to expect" panel. Pairs with the document checklist: the
 * online check-in that keeps you out of a waiting room, Saturday hours, and a
 * one-line explanation of how check-in works.
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

      <dl className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-fog">
            The wait
          </dt>
          <dd className="mt-1.5 font-display text-xl font-extrabold text-ink">
            Skip it
            <span className="mt-1 block font-sans text-xs font-medium leading-relaxed text-fog">
              Check in online and hold your place from your phone.
            </span>
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-fog">
            Saturday hours
          </dt>
          <dd className="mt-1.5 font-display text-xl font-extrabold text-ink">
            9:00 AM – 1:00 PM
            <span className="mt-1 block font-sans text-xs font-medium leading-relaxed text-fog">
              Open when most offices are closed.
            </span>
          </dd>
        </div>
      </dl>

      <p className="mt-6 border-t border-line pt-5 text-sm leading-relaxed text-fog">
        <span className="font-semibold text-ink">How check-in works:</span> pick
        your transaction, bring the documents on your checklist, and check in
        online. Your spot is ready when you walk in.
      </p>
    </section>
  );
}
