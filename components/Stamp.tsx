import type { CSSProperties } from "react";

/**
 * The 88 Title stamp — the brand's signature mark, deployed ONLY at customer
 * completion moments (check-in success, a fully-ticked checklist) and, static,
 * on the 404 page. It is a plate-inspired circular seal built entirely from the
 * brand language: ink-navy rings, the "88 TITLE" die around the edge, a
 * plate-red star, and a plate-red center word. A faint plate-red halo reads as
 * ink bled into the paper.
 *
 * Motion lives in globals.css: `.stamp` is the settled, finished impression
 * (slightly askew, fully inked), so under prefers-reduced-motion the mark simply
 * appears in its final state. Passing `animate` adds `.stamp--drop`, the one-shot
 * "stamp down" (scale-settle + rotation) that only exists under no-preference, so
 * it plays exactly once, only where we ask for it, and never ambiently.
 *
 * This is a shared (server-safe) component: no hooks, no client APIs, pure SVG,
 * so it can be dropped into server pages (404) and client islands (the check-in
 * status card, the checklist) alike.
 */

const RING_TEXT = "88 TITLE · METAIRIE LA · ";

/** A five-point star path centered at (cx, cy). */
function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    // Start at the top point (-90deg) and step every 36deg.
    const angle = (Math.PI / 180) * (i * 36 - 90);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M${points.join(" L")} Z`;
}

/** Pick a center font size that keeps the label inside the inner ring, taking
    both the longest word (width) and the line count (height) into account. */
function centerFontSize(lines: string[]): number {
  const longest = Math.max(...lines.map((line) => line.length));
  let size = longest <= 3 ? 23 : longest <= 5 ? 18 : longest <= 7 ? 15 : 13;
  // More lines means less vertical room per line.
  if (lines.length >= 3) size = Math.min(size, 16);
  if (lines.length >= 4) size = Math.min(size, 12);
  return size;
}

export function Stamp({
  label,
  ariaLabel,
  animate = false,
  decorative = false,
  className = "",
  style,
}: {
  /** The center word(s), e.g. "Ready" or "Checked in". Rendered uppercase. */
  label: string;
  /** Accessible name. Falls back to `label`. Ignored when `decorative`. */
  ariaLabel?: string;
  /** Play the one-shot stamp-down on mount (no-op under reduced motion). */
  animate?: boolean;
  /** Hide from assistive tech (e.g. when nearby text already conveys it). */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const lines = label.trim().split(/\s+/);
  const fontSize = centerFontSize(lines);
  const lineHeight = fontSize * 1.02;
  // A short (1-2 line) word leaves room for the star above it; a longer label
  // fills the seal on its own, so the star is dropped and the block re-centered.
  const showStar = lines.length <= 2;
  const centerY = showStar ? 67 : 60;

  const a11y = decorative
    ? { "aria-hidden": true as const }
    : { role: "img", "aria-label": ariaLabel ?? label };

  return (
    <svg
      viewBox="0 0 120 120"
      className={["stamp", animate ? "stamp--drop" : "", className]
        .filter(Boolean)
        .join(" ")}
      style={style}
      {...a11y}
    >
      {/* Ink-bleed edge: a soft plate-red halo plus a faint navy over-ring, so
          the crisp seal reads as ink absorbed into paper rather than a decal. */}
      <circle
        cx={60}
        cy={60}
        r={57}
        fill="none"
        stroke="var(--color-plate)"
        strokeWidth={3}
        opacity={0.1}
      />
      <circle
        cx={60}
        cy={60}
        r={54}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={1.5}
        opacity={0.28}
      />

      {/* Crisp rings. */}
      <circle
        cx={60}
        cy={60}
        r={52.5}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={3.5}
      />
      <circle
        cx={60}
        cy={60}
        r={39}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={1.25}
      />

      {/* The die: "88 TITLE · METAIRIE LA ·" set around the edge. Decorative, so
          it is hidden from AT (the accessible name comes from the wrapper). */}
      <defs>
        <path
          id="stamp-ring"
          d="M 60 17 A 43 43 0 1 1 59.99 17"
          fill="none"
        />
      </defs>
      <text
        aria-hidden="true"
        fill="var(--color-ink)"
        style={{
          fontFamily: "var(--font-archivo), ui-sans-serif, sans-serif",
          fontWeight: 700,
          fontSize: "7.2px",
          letterSpacing: "1.6px",
          textTransform: "uppercase",
        }}
      >
        <textPath href="#stamp-ring" startOffset="0" textLength={270} lengthAdjust="spacing">
          {RING_TEXT}
        </textPath>
      </text>

      {/* Plate-red star above the center word (only when the word is short
          enough to leave room for it). */}
      {showStar ? (
        <path d={starPath(60, 45, 6, 2.6)} fill="var(--color-plate)" aria-hidden="true" />
      ) : null}

      {/* Center word(s), the meaning of the seal. */}
      <text
        aria-hidden="true"
        textAnchor="middle"
        fill="var(--color-plate)"
        style={{
          fontFamily: "var(--font-archivo), ui-sans-serif, sans-serif",
          fontWeight: 800,
          fontSize: `${fontSize}px`,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}
      >
        {lines.map((line, i) => (
          <tspan
            key={line + i}
            x={60}
            y={centerY + (i - (lines.length - 1) / 2) * lineHeight}
            dominantBaseline="middle"
          >
            {line}
          </tspan>
        ))}
      </text>
    </svg>
  );
}
