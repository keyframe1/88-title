/**
 * The completed-step glyph: the 88 Title seal, miniaturized. A fine concentric
 * ring around a solid center dot — the stamp's rings shrunk to node scale —
 * standing in for the generic check on every pipeline stepper (the staff deal
 * panel, and, via the shared markup, the /dealers portal mock). It reads as a
 * pressed seal impression rather than a to-do checkbox: quieter, and unmistakably
 * this brand.
 *
 * Presentational and server-safe (pure SVG, no hooks). It paints in
 * `currentColor`, so each surface's disc color drives it (paper on an ink disc,
 * ink on the navy card), and it fills the same box the check occupied, so
 * dropping it in shifts nothing.
 */
export function SealNode({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <circle
        cx="8"
        cy="8"
        r="4.4"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.85"
      />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}
