/**
 * The document / corner-fold glyph that marks a downloadable PDF on the /forms
 * index. Same line-art grammar as {@link DownloadGlyph} — one path family, a
 * fixed stroke weight, no fill — so the file chip reads at the same optical
 * weight as the rest of the icon set whether it is small (inline in a row) or a
 * touch larger. The stroke scales with the box, keeping the ratio constant.
 *
 * Sizing and color come from `className` (e.g. `h-3.5 w-3.5 text-fog`); it
 * inherits the surrounding text color via `currentColor`.
 */
export function FileGlyph({ className }: { className?: string }) {
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
      {/* A sheet with a folded top-right corner. */}
      <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
      <path d="M13 3v6h6" />
    </svg>
  );
}
