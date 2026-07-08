import type { CSSProperties } from "react";
import { BRAND_MARK_PATH, BRAND_MARK_VIEWBOX } from "@/lib/brand-mark";

/**
 * The 88 Title brand mark: the custom double-8 monogram, drawn (not typed) —
 * geometry lives in lib/brand-mark.ts. Inline SVG filled with `currentColor`,
 * so it takes the surrounding text color: ink on paper, white on the navy
 * console header, dimmed for empty states, cream for the hero watermark. Size
 * it with a height class (`h-6 w-auto`); the viewBox keeps the 88:64 ratio.
 *
 * The mark is confident enough to sit boxless on every surface — the old
 * rounded-square badge container is deliberately retired. This component is
 * the single swap point if a commissioned identity ever replaces it.
 */
export function BrandMark({
  label,
  className,
  style,
  outline,
}: {
  /**
   * Accessible name, e.g. "88" inside the header link so the link still reads
   * "88 Title" with the visible wordmark. Omit for purely decorative uses
   * (watermarks, empty states) — the mark is then hidden from AT.
   */
  label?: string;
  className?: string;
  style?: CSSProperties;
  /**
   * Watermark treatment: a hairline outline (screen-pixel width, regardless of
   * rendered size) drawn behind the fill, e.g. `rgba(20,33,61,0.10)` for the
   * embossed cream 88 on the hero.
   */
  outline?: string;
}) {
  const a11y = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <svg viewBox={BRAND_MARK_VIEWBOX} className={className} style={style} {...a11y}>
      <path
        d={BRAND_MARK_PATH}
        fill="currentColor"
        {...(outline
          ? {
              stroke: outline,
              strokeWidth: 2,
              vectorEffect: "non-scaling-stroke" as const,
              paintOrder: "stroke" as const,
            }
          : null)}
      />
    </svg>
  );
}
