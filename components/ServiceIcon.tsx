import type { ReactNode } from "react";

type ServiceIconProps = {
  /** Transaction slug from lib/checklists.ts. */
  slug: string;
  className?: string;
};

/**
 * Small line icon for each transaction type, hand-built as inline SVG (no icon
 * library). Strokes use the brand tokens (ink navy with the plate-red accent
 * used sparingly). Each icon has classed parts (`svc-*`) that play a single
 * gesture on card hover/focus; all of that motion is defined in globals.css and
 * gated behind `prefers-reduced-motion: no-preference`, so these render fully
 * static when reduced motion is requested.
 *
 * The root carries `svc-icon`, the hook globals.css uses for the one-time
 * entrance on touch surfaces (where hover does not exist).
 */
export function ServiceIcon({ slug, className }: ServiceIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={["svc-icon", className].filter(Boolean).join(" ")}
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconParts(slug)}
    </svg>
  );
}

function iconParts(slug: string): ReactNode {
  switch (slug) {
    // Document with a check that presses in.
    case "title-transfer":
      return (
        <>
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path className="svc-check" d="m8.5 14.5 2.5 2.5 4.5-5" stroke="var(--color-plate)" />
        </>
      );

    // A car that eases forward.
    case "new-to-louisiana":
      return (
        <g className="svc-arrow">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </g>
      );

    // Two stacked documents (a copy) whose front page shuffles.
    case "duplicate-title":
      return (
        <>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          <rect className="svc-dup" x="8" y="8" width="14" height="14" rx="2" />
        </>
      );

    // Document with an official seal that presses in.
    case "inherited-vehicle":
      return (
        <>
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <g className="svc-seal" stroke="var(--color-plate)">
            <circle cx="12" cy="15" r="3" />
            <circle cx="12" cy="15" r="0.6" fill="var(--color-plate)" stroke="none" />
          </g>
        </>
      );

    // A refresh cycle that turns once.
    case "registration-renewal":
      return (
        <g className="svc-spin">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" stroke="var(--color-plate)" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" stroke="var(--color-plate)" />
        </g>
      );

    // A license plate that snaps laterally.
    case "plates":
      return (
        <g className="svc-plate">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <circle cx="6.5" cy="8.5" r="0.6" fill="var(--color-ink)" stroke="none" />
          <circle cx="17.5" cy="8.5" r="0.6" fill="var(--color-ink)" stroke="none" />
          <path d="M7 14h2.5" />
          <path d="M14.5 14H17" />
          <circle cx="12" cy="13.5" r="1.1" fill="var(--color-plate)" stroke="none" />
        </g>
      );

    // A stamp that presses down and leaves a mark (echoes the hero plate).
    case "notary":
      return (
        <>
          <line x1="4" y1="20" x2="20" y2="20" />
          <line className="svc-mark" x1="9" y1="20" x2="15" y2="20" stroke="var(--color-plate)" strokeWidth={2.4} />
          <g className="svc-stamp">
            <rect x="9.5" y="4" width="5" height="3" rx="1.4" />
            <line x1="12" y1="7" x2="12" y2="10.5" />
            <rect x="6.5" y="10.5" width="11" height="3.5" rx="1.2" />
          </g>
        </>
      );

    // Fallback: a plain document.
    default:
      return (
        <>
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </>
      );
  }
}
