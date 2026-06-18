import Link from "next/link";
import type { ReactNode } from "react";

type PlateButtonProps = {
  /** Destination route. */
  href: string;
  children: ReactNode;
  /** Visual size. `lg` for the primary hero CTA. */
  size?: "md" | "lg";
  /** Plate color. */
  variant?: "navy" | "red";
  /** Extra classes (e.g. layout/width utilities). */
  className?: string;
  /** Optional click handler (e.g. to persist intent before navigating). */
  onClick?: () => void;
};

/**
 * The primary call-to-action, styled as a Louisiana license plate: embossed
 * rim, navy (or red) face, and a press-down on hover/active. Renders as a
 * `next/link` so it works as real navigation. Motion is disabled under
 * `prefers-reduced-motion` (see globals.css).
 */
export function PlateButton({
  href,
  children,
  size = "md",
  variant = "navy",
  className = "",
  onClick,
}: PlateButtonProps) {
  const classes = ["plate-btn", variant === "red" ? "plate-btn--red" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={href} data-size={size} className={classes} onClick={onClick}>
      {children}
    </Link>
  );
}
