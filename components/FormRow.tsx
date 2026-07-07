import type { LocalizedForm } from "@/lib/i18n/content/forms";
import { DownloadGlyph } from "@/components/DownloadGlyph";

/**
 * One public form rendered as a full-width editorial row for the /forms index —
 * the same hairline-ruled, card-free rhythm as the service index
 * (`.service-row` / `.service-index` in globals.css), not the old card grid.
 *
 *   DPSMV 1806
 *   Permission to Process Transaction            [ Download ]
 *   A signed permission for a named person...
 *
 * The form number and title are BOTH real heading text (one <h2>): "DPSMV 1806"
 * is the exact query a searcher types, so it must be indexable heading content,
 * not decoration. The row carries a stable `#slug` anchor (set by the page) for
 * future deep links. The download is a discrete secondary action (a link that
 * opens the blank PDF in a new tab), never the primary plate CTA.
 *
 * Static and server-rendered: no interactivity, so it holds PageSpeed with no
 * client JS. Mobile-first — the row stacks (heading, description, then the
 * download) and spreads to number/title + a right-aligned download at sm+.
 */
export function FormRow({
  form,
  downloadLabel,
  downloadAria,
}: {
  form: LocalizedForm;
  /** Localized visible button text, e.g. "Download". */
  downloadLabel: string;
  /** Localized full accessible name, e.g. "Download DPSMV 1806, ... (PDF)". */
  downloadAria: string;
}) {
  return (
    <div className="service-row flex flex-col gap-4 px-3 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-4 sm:py-8">
      <div className="min-w-0">
        <h2 className="font-display leading-[1.1] text-ink">
          {/* The form NUMBER is the searched query, so it leads as its own
              eyebrow line; the title is the editorial feature beneath it, at the
              same size as a service-row heading. */}
          <span className="eyebrow block tracking-[0.14em]">{form.number}</span>
          <span className="mt-1 block h-section">{form.title}</span>
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fog sm:text-base">
          {form.description}
        </p>
      </div>

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
    </div>
  );
}
