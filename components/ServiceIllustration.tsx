"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useClientValue } from "@/lib/hooks/use-client";

/**
 * Illustrated card headers for the service grid. One consistent style: flat,
 * two-tone (ink navy with a plate-red accent) geometric shapes on a paper
 * surface, echoing the plate/counter brand. Each illustration carries a single
 * accent element that plays ONE gesture the first time the card scrolls into
 * view (the seal stamps, the route draws, the renewal cycle turns).
 *
 * The gesture is pure CSS (transition-driven, defined in globals.css). This
 * component only flips a `data-inview` flag via IntersectionObserver so the CSS
 * has something to transition to. Under reduced motion (or where IO is missing)
 * we flip it immediately, and the reduced-motion CSS resolves every accent to
 * its finished state, so the art is fully static with no gesture.
 *
 * Only three transactions are illustrated in this pass (see ILLUSTRATED_SLUGS in
 * ServiceCard); the rest keep the compact ServiceIcon. Any other slug renders
 * nothing, so ServiceCard decides which slugs get this header. The style is
 * built to extend to the others later.
 */
const INK = "var(--color-ink)";
const PLATE = "var(--color-plate)";
const PAPER = "#ffffff";

export function ServiceIllustration({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [scrolledIn, setScrolledIn] = useState(false);

  // Resolve to the finished state right away when the browser can't observe
  // scroll or the user opted out of motion (read in render, SSR-safe default
  // false, so there is no setState-in-effect). The reduced-motion CSS also
  // resolves the accent, making it instant with no gesture.
  const immediate = useClientValue(
    () =>
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    false,
  );
  const inview = immediate || scrolledIn;

  useEffect(() => {
    if (immediate) return;
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setScrolledIn(true);
            io.disconnect();
            return;
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [immediate]);

  return (
    <svg
      ref={ref}
      data-inview={inview ? "true" : "false"}
      viewBox="0 0 300 100"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      {parts(slug)}
    </svg>
  );
}

function parts(slug: string): ReactNode {
  switch (slug) {
    // A title certificate whose official red seal stamps in.
    case "title-transfer":
      return (
        <>
          <rect
            x={92}
            y={22}
            width={116}
            height={58}
            rx={6}
            fill={PAPER}
            stroke={INK}
            strokeWidth={3}
          />
          {/* Title bar + body lines (navy, secondary lines lightened). */}
          <rect x={104} y={33} width={62} height={6} rx={3} fill={INK} />
          <rect x={104} y={47} width={88} height={5} rx={2.5} fill={INK} opacity={0.34} />
          <rect x={104} y={57} width={80} height={5} rx={2.5} fill={INK} opacity={0.34} />
          <rect x={104} y={67} width={52} height={5} rx={2.5} fill={INK} opacity={0.34} />
          {/* Official seal — the accent that stamps in. */}
          <g className="illus-seal">
            <circle cx={187} cy={64} r={15} fill={PAPER} stroke={PLATE} strokeWidth={3} />
            <circle cx={187} cy={64} r={9.5} fill="none" stroke={PLATE} strokeWidth={2} />
            <circle cx={187} cy={64} r={2.6} fill={PLATE} />
            <polygon points="181,76 187,71 187,84" fill={PLATE} />
            <polygon points="193,76 187,71 187,84" fill={PLATE} />
          </g>
        </>
      );

    // A Louisiana plate with a route that draws toward its destination.
    case "new-to-louisiana":
      return (
        <>
          <rect
            x={54}
            y={30}
            width={104}
            height={42}
            rx={8}
            fill={PAPER}
            stroke={INK}
            strokeWidth={3}
          />
          {/* Mounting bolts + state strip + the "88" blocks and a red accent. */}
          <circle cx={66} cy={38} r={1.8} fill={INK} />
          <circle cx={146} cy={38} r={1.8} fill={INK} />
          <rect x={70} y={36} width={72} height={3.5} rx={1.75} fill={INK} opacity={0.4} />
          <rect x={70} y={46} width={16} height={18} rx={2} fill={INK} />
          <rect x={90} y={46} width={16} height={18} rx={2} fill={INK} />
          <circle cx={118} cy={55} r={4} fill={PLATE} />
          <rect x={128} y={46} width={14} height={18} rx={2} fill={INK} opacity={0.4} />
          {/* Route + arrowhead — the accent that draws in. */}
          <path
            className="illus-route"
            d="M158 52 C 186 52, 190 36, 212 33 M203 29 L213 33 L206 41"
            fill="none"
            stroke={PLATE}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );

    // A registration sticker circled by a renewal cycle that turns in.
    case "registration-renewal":
      return (
        <>
          <rect
            x={126}
            y={30}
            width={48}
            height={48}
            rx={8}
            fill={PAPER}
            stroke={INK}
            strokeWidth={3}
          />
          {/* Colored month band + year lines. */}
          <rect x={130} y={34} width={40} height={10} rx={3} fill={PLATE} />
          <rect x={135} y={52} width={30} height={6} rx={3} fill={INK} />
          <rect x={135} y={63} width={20} height={5} rx={2.5} fill={INK} opacity={0.4} />
          {/* Renewal cycle — the accent that turns in. */}
          <g
            className="illus-cycle"
            fill="none"
            stroke={PLATE}
            strokeWidth={3}
            strokeLinecap="round"
          >
            <path d="M150 22 A 32 32 0 0 1 180 66" />
            <polygon points="184,58 181,68 174,61" fill={PLATE} stroke="none" />
            <path d="M150 86 A 32 32 0 0 1 120 42" />
            <polygon points="116,50 119,40 126,47" fill={PLATE} stroke="none" />
          </g>
        </>
      );

    default:
      return null;
  }
}
