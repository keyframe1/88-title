import { Fragment } from "react";
import type { LocalizedForm } from "@/lib/i18n/content/forms";
import { FileGlyph } from "@/components/FileGlyph";

/**
 * One public form rendered as a full-width editorial row for the /forms index —
 * the same hairline-ruled, card-free rhythm as the service index
 * (`.service-row` / `.service-index` in globals.css).
 *
 *   DPSMV 1799
 *   Vehicle Application                              [ 📄 PDF · 663 KB ]
 *   The Louisiana application to title and register a vehicle.
 *   COMPLETED BY THE APPLICANT
 *   Used for: Title transfer, New to Louisiana
 *
 * The whole row IS the download: the file chip carries a full-row `::after`
 * overlay, so a click (or tap) anywhere on the row opens the blank PDF via the
 * `download` attribute. There is no separate Download button — the chip plus the
 * row's hover lift and title tint are the affordance, and the row's accessible
 * name is exactly "<Form name> (PDF)". The one interactive exception, the "Used
 * for" service cross-link, is raised above the overlay so it stays independently
 * clickable (sibling anchor, never nested inside the download link).
 *
 * The form number and title are BOTH real heading text (one <h2>): "DPSMV 1799"
 * is the exact query a searcher types, so it must be indexable heading content.
 * A form with no DPSMV number (a Bill of Sale) omits the eyebrow line and leads
 * with its title. When no blank is published yet (`file` is null) the row shows a
 * quiet pending label instead of a download and is not a link.
 *
 * Server-rendered, no client JS: it holds PageSpeed. Mobile-first — the row
 * stacks and spreads to title + a right-aligned chip at sm+.
 */
export function FormRow({
  form,
  fileSize,
  downloadAria,
  pendingLabel,
  usedForLabel,
}: {
  form: LocalizedForm;
  /** Real, formatted file size for the chip, e.g. "663 KB". Null → pending. */
  fileSize: string | null;
  /** Localized full accessible name, e.g. "DPSMV 1806, ... (PDF)". */
  downloadAria: string;
  /** Localized quiet label shown when no blank is published yet. */
  pendingLabel: string;
  /** Localized prefix for the service cross-link, e.g. "Used for". */
  usedForLabel: string;
}) {
  // A Bill of Sale has no DPSMV number: drop the eyebrow rather than show a
  // blank slot or invent one. The title then carries the row on its own.
  const hasNumber = form.number.trim().length > 0;
  // Only offer a download when a blank is actually published AND readable on
  // disk (a null size means the file is missing) — otherwise fall back to
  // pending, never a broken link or a chip with no size.
  const downloadable = form.file !== null && fileSize !== null;

  return (
    <div className="service-row group relative flex flex-col gap-4 px-3 py-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:px-4 sm:py-8">
      <div className="min-w-0">
        <h2 className="font-display leading-[1.1] text-ink">
          {/* The form NUMBER is the searched query, so it leads as its own
              eyebrow line when present; the title is the editorial feature
              beneath it, tinting plate-red as the row is hovered. */}
          {hasNumber && (
            <span className="eyebrow block tracking-[0.14em]">{form.number}</span>
          )}
          <span
            className={`${hasNumber ? "mt-1 " : ""}block h-section transition-colors duration-150 group-hover:text-plate`}
          >
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
        {/* The service cross-link(s). Raised above the row's download overlay
            (relative z-10) so each stays independently clickable. */}
        {form.services.length > 0 && (
          <p className="relative z-10 mt-2 text-xs text-fog">
            {usedForLabel}:{" "}
            {form.services.map((service, i) => (
              <Fragment key={service.slug}>
                {i > 0 && <span aria-hidden="true">, </span>}
                <a
                  href={service.href}
                  className="font-medium text-ink underline-offset-2 transition-colors duration-150 hover:text-plate hover:underline focus-visible:text-plate focus-visible:underline"
                >
                  {service.label}
                </a>
              </Fragment>
            ))}
          </p>
        )}
      </div>

      {downloadable ? (
        // The download link. Its `::after` overlay (after:absolute after:inset-0)
        // stretches over the whole positioned `.service-row`, making the entire
        // row one download target; the link is not position:relative, so the
        // overlay resolves to the row, not just the chip. aria-label supplies the
        // accessible name; the visible chip text is decorative to a screen reader.
        <a
          href={form.file ?? undefined}
          download
          aria-label={downloadAria}
          className="inline-flex w-fit shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-md border border-line bg-paper px-2.5 py-1 text-xs font-medium text-fog transition-colors duration-150 after:absolute after:inset-0 group-hover:border-ink/30 group-hover:text-ink sm:mt-1"
        >
          <FileGlyph className="h-3.5 w-3.5" />
          <span>PDF · {fileSize}</span>
        </a>
      ) : (
        // No published blank yet: a quiet, non-interactive pending label holds the
        // chip's place so the row still reads as a real (indexable) entry.
        <span className="inline-flex w-fit shrink-0 items-center self-start text-xs font-medium text-fog/70 sm:mt-1">
          {pendingLabel}
        </span>
      )}
    </div>
  );
}
