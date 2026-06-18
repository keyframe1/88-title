import { groupOmvReference, isCodeSet } from "@/lib/omv/reference";
import type { OmvReferenceRow } from "@/lib/omv/types";

/**
 * Staff-only OMV reference panel (server component).
 *
 * Embedded on /staff/queue, below the live queue, so a clerk can glance at the
 * OMV codes for the transaction they are working without leaving the console.
 * One collapsible card per transaction (native <details>, so no client JS and
 * reduced-motion friendly), each listing its labeled code slots.
 *
 * Codes ship empty: until the team fills them in from the OMV manual, each slot
 * shows "Not set" and a transaction with nothing filled in shows a clear
 * "OMV codes not yet configured" state - staff see where codes will live without
 * being shown fake data.
 */
export function OmvReference({ rows }: { rows: OmvReferenceRow[] }) {
  const groups = groupOmvReference(rows);

  return (
    <section
      aria-labelledby="omv-reference-heading"
      className="mt-12 border-t border-line pt-8"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
          Counter reference
        </p>
        <h2
          id="omv-reference-heading"
          className="mt-2 font-display text-2xl font-extrabold sm:text-3xl"
        >
          OMV reference codes
        </h2>
        <p className="mt-1 max-w-2xl leading-relaxed text-fog">
          Staff-only OMV codes to key in at the terminal, by transaction. Values
          come from the OMV Policy &amp; Procedures manual; blank slots are not
          configured yet.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <details
            key={group.slug}
            className="group rounded-xl border border-line bg-white open:border-ink/30 open:bg-mist/40"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3.5 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="block font-display text-base font-extrabold text-ink">
                  {group.label}
                </span>
                <span className="mt-0.5 block truncate text-xs text-fog">
                  {group.blurb}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {group.unconfigured ? (
                  <span className="rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-fog">
                    Coming soon
                  </span>
                ) : (
                  <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-white">
                    {group.configuredCount} of {group.entries.length} set
                  </span>
                )}
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4 text-fog transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </summary>

            <div className="border-t border-line px-4 py-3">
              {group.unconfigured ? (
                <p className="mb-2 rounded-lg border border-dashed border-line bg-mist/60 px-3 py-2 text-xs font-medium text-fog">
                  OMV codes not yet configured. These slots show where codes will
                  go once they are entered from the OMV manual.
                </p>
              ) : null}

              {group.entries.length === 0 ? (
                <p className="text-sm text-fog">
                  No code slots defined for this transaction yet.
                </p>
              ) : (
                <ul>
                  {group.entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-baseline justify-between gap-4 border-t border-line py-2 first:border-t-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">
                          {entry.label}
                        </p>
                        {entry.note ? (
                          <p className="mt-0.5 text-xs text-fog">{entry.note}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        {isCodeSet(entry.code) ? (
                          <span className="font-mono text-sm font-bold tracking-wide text-ink">
                            {entry.code}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold uppercase tracking-wide text-fog/70">
                            Not set
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
