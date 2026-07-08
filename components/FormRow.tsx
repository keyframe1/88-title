import type { LocalizedForm } from "@/lib/i18n/content/forms";
import { DownloadGlyph } from "@/components/DownloadGlyph";

/**
 * One public form rendered as a full-width editorial row for the /forms index —
 * the same hairline-ruled, card-free rhythm as the service index
 * (`.service-row` / `.service-index` in globals.css), not the old card grid.
 *
 *   DPSMV 1799
 *   Vehicle Application                          [ Download ]
 *   The Louisiana application to title and register a vehicle.
 *   COMPLETED BY THE APPLICANT
 *
 * The form number and title are BOTH real heading text (one <h2>): "DPSMV 1799"
 * is the exact query a searcher types, so it must be indexable heading content,
 * not decoration. A form with no DPSMV number (a Bill of Sale) simply omits the
 * eyebrow line and leads with its title, which stays real heading text. The row
 * carries a stable `#slug` anchor (set by the page) for future deep links. The
 * download is a discrete secondary action (a link that opens the blank PDF in a
 * new tab), never the primary plate CTA; when no blank is published yet the row
 * shows a quiet pending label in its place instead of a broken link.
 *
 * Static and server-rendered: no interactivity, so it holds PageSpeed with no
 * client JS. Mobile-first — the row stacks (heading, description, role, then the
 * download) and spreads to number/title + a right-aligned download at sm+.
 */
export function FormRow({
  form,
  downloadLabel,
  downloadAria,
  pendingLabel,
}: {
  form: LocalizedForm;
  /** Localized visible button text, e.g. "Download". */
  downloadLabel: string;
  /** Localized full accessible name, e.g. "Download DPSMV 1806, ... (PDF)". */
  downloadAria: string;
  /** Localized quiet label shown when no blank is published yet. */
  pendingLabel: string;
}) {
  // A Bill of Sale has no DPSMV number: drop the eyebrow rather than show a
  // blank slot or invent one. The title then carries the row on its own.
  const hasNumber = form.number.trim().length > 0;

  return (
    <div className="service-row flex flex-col gap-4 px-3 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-4 sm:py-8">
      <div className="min-w-0">
        <h2 className="font-display leading-[1.1] text-ink">
          {/* The form NUMBER is the searched query, so it leads as its own
              eyebrow line when present; the title is the editorial feature
              beneath it, at the same size as a service-row heading. */}
          {hasNumber && (
            <span className="eyebrow block tracking-[0.14em]">{form.number}</span>
          )}
          <span className={`${hasNumber ? "mt-1 " : ""}block h-section`}>
            {form.title}
          </span>
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fog sm:text-base">
          {form.description}
        </p>
        {/* Quiet metadata: the factual role that completes the form. Role only. */}
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-fog/70">
          {form.completedBy}
        </p>
        {/* Optional short, factual note (e.g. the counter can also notarize one). */}
        {form.note && (
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-fog">
            {form.note}
          </p>
        )}
      </div>

      {form.file ? (
        <a
          href={form.file}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={downloadAria}
          className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-ink px-4 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white"
        >
          <DownloadGlyph className="h-4 w-4" />
          {downloadLabel}
        </a>
      ) : (
        // No published blank yet: a quiet, non-interactive pending label holds the
        // download's place so the row still reads as a real (indexable) entry.
        <span className="inline-flex w-fit shrink-0 items-center text-sm font-medium text-fog/70">
          {pendingLabel}
        </span>
      )}
    </div>
  );
}
