import Link from "next/link";
import type { ReactNode } from "react";

type PlateButtonProps = {
  /** Destination route. */
  href: string;
  children: ReactNode;
  /** Visual size. `sm` for the header CTA, `lg` for a hero / page CTA. */
  size?: "sm" | "md" | "lg";
  /** Extra classes (e.g. layout/width utilities). */
  className?: string;
  /** Optional click handler (e.g. to persist intent before navigating). */
  onClick?: () => void;
};

/**
 * The primary call-to-action link: the unified flat primary button (solid
 * plate-red, tracked-caps plate label) from the sitewide button system in
 * globals.css. Renders as a `next/link` so it works as real navigation; press
 * motion is disabled under `prefers-reduced-motion`.
 */
export function PlateButton({
  href,
  children,
  size = "md",
  className = "",
  onClick,
}: PlateButtonProps) {
  const sizeClass = size === "lg" ? "btn--lg" : size === "sm" ? "btn--sm" : "";
  const classes = ["btn", "btn--primary", sizeClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={href} className={classes} onClick={onClick}>
      {children}
    </Link>
  );
}
