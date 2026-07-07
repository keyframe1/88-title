import Link from "next/link";

/**
 * A quiet, icon-only "?" that deep-links to a section of the staff Help
 * reference (/staff/help).
 *
 * The point is single-source guidance: the how-to lives ONLY on the Help page,
 * and this is just a signpost to the right anchor. It is deliberately NOT a
 * tooltip or a popover and carries no help text of its own, so nothing can drift
 * out of sync with /staff/help. It is a real, keyboard-focusable link with a
 * descriptive accessible name; navigating in the same tab is fine (it is an
 * internal reference).
 *
 * Staff-only, and English to match the rest of the staff console (the locale
 * cookie is customer-site only; see lib/i18n/config.ts).
 */
export function HelpLink({
  anchor,
  label,
  className,
}: {
  /** The Help section id to jump to, without the leading hash (e.g. "voiding"). */
  anchor: string;
  /** What it explains, e.g. "voiding a transaction" -> aria-label "Help: voiding a transaction". */
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={`/staff/help#${anchor}`}
      aria-label={`Help: ${label}`}
      title={`Help: ${label}`}
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-xs font-semibold leading-none text-fog transition-colors hover:border-ink hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
        className ?? ""
      }`}
    >
      <span aria-hidden="true">?</span>
    </Link>
  );
}
