/**
 * The single download glyph used everywhere a blank form PDF is offered — the
 * /forms rows and the "Download the form" links on checklist items. One shared
 * path with a fixed stroke weight, so the icon reads at the same optical weight
 * whether it is rendered small (inline in a checklist) or a touch larger (a form
 * row action): the stroke scales with the box, keeping the ratio constant.
 *
 * Sizing and color come from `className` (e.g. `h-4 w-4 text-ink`); it inherits
 * the surrounding text color via `currentColor`.
 */
export function DownloadGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
    </svg>
  );
}
