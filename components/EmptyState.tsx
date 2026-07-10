import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { Pelican } from "@/components/brand/Pelican";

/**
 * The one composed empty state, used on every surface (customer, staff console,
 * dealer portal). An empty state should orient, invite the next action, and
 * carry the brand quietly — never apologize in gray text inside a dashed box
 * floating in whitespace.
 *
 * It is built from a brand signature, a one-line headline, at most one sentence
 * of support, and — where a next action exists — ONE button from the unified
 * button system. It composes vertically, centers in its container, and uses the
 * standard surface with a hairline border (never dashed). The `bare` variant
 * drops the surface for use inside a container that already has its own frame
 * (a table cell, a list box).
 *
 * The signature: on STAFF surfaces the mark is Remy (the pelican mascot),
 * present-pose, gliding in once and gesturing at the empty space — every staff
 * console tab inherits him through this one component. On PUBLIC / customer and
 * dealer-facing surfaces he is held back (phase one is staff-only): those
 * callers pass `mascot={false}` and get the dimmed 88 monogram instead (bare —
 * no tile; the Stamp is reserved for customer completion moments, so it is
 * never used here). Keep new public/customer empty states on `mascot={false}`
 * until Remy graduates to public surfaces.
 */
export function EmptyState({
  title,
  description,
  action,
  size = "default",
  bare = false,
  mascot = true,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  /** One button/link from the button system, rendered below the copy. */
  action?: ReactNode;
  size?: "compact" | "default" | "lobby";
  /** Drop the surface (border/background) to sit inside an existing frame. */
  bare?: boolean;
  /**
   * Show Remy (the pelican). On by default so every staff console empty state
   * inherits him. Public / customer and dealer-facing empty states MUST set
   * this to `false` (phase one keeps Remy staff-only) — they fall back to the
   * dimmed 88 monogram.
   */
  mascot?: boolean;
  className?: string;
}) {
  const pad =
    size === "compact" ? "px-6 py-8" : size === "lobby" ? "px-8 py-16" : "px-6 py-14";
  const surface = bare
    ? ""
    : "rounded-2xl border border-line bg-mist/40";
  const markSize =
    size === "compact" ? "h-7" : size === "lobby" ? "h-16" : "h-10";
  // Remy's rendered height, matched to the size step (his footprint is reserved
  // so he never shifts the copy below him).
  const pelicanSize = size === "compact" ? 60 : size === "lobby" ? 104 : 76;
  const titleSize = size === "lobby" ? "text-2xl sm:text-3xl" : "text-lg";
  const descSize = size === "lobby" ? "text-base sm:text-lg" : "text-sm";

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${pad} ${surface} ${className}`}
    >
      {mascot ? (
        <Pelican pose="present" entrance size={pelicanSize} />
      ) : (
        <BrandMark className={`w-auto text-ink/25 ${markSize}`} />
      )}
      <p className={`mt-4 font-display font-extrabold text-ink ${titleSize}`}>
        {title}
      </p>
      {description ? (
        <p className={`mt-1.5 max-w-sm text-fog ${descSize}`}>{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
