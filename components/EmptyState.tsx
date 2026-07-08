import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";

/**
 * The one composed empty state, used on every surface (customer, staff console,
 * dealer portal). An empty state should orient, invite the next action, and
 * carry the brand quietly — never apologize in gray text inside a dashed box
 * floating in whitespace.
 *
 * It is built from the small, dimmed 88 monogram (the brand signature, bare —
 * no tile; the Stamp is deliberately reserved for customer completion moments,
 * so it is never used here), a one-line headline, at most one sentence of
 * support, and — where a
 * next action exists — ONE button from the unified button system. It composes
 * vertically, centers in its container, and uses the standard surface with a
 * hairline border (never dashed). The `bare` variant drops the surface for use
 * inside a container that already has its own frame (a table cell, a list box).
 */
export function EmptyState({
  title,
  description,
  action,
  size = "default",
  bare = false,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  /** One button/link from the button system, rendered below the copy. */
  action?: ReactNode;
  size?: "compact" | "default" | "lobby";
  /** Drop the surface (border/background) to sit inside an existing frame. */
  bare?: boolean;
  className?: string;
}) {
  const pad =
    size === "compact" ? "px-6 py-8" : size === "lobby" ? "px-8 py-16" : "px-6 py-14";
  const surface = bare
    ? ""
    : "rounded-2xl border border-line bg-mist/40";
  const markSize =
    size === "compact" ? "h-7" : size === "lobby" ? "h-16" : "h-10";
  const titleSize = size === "lobby" ? "text-2xl sm:text-3xl" : "text-lg";
  const descSize = size === "lobby" ? "text-base sm:text-lg" : "text-sm";

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${pad} ${surface} ${className}`}
    >
      <BrandMark className={`w-auto text-ink/25 ${markSize}`} />
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
