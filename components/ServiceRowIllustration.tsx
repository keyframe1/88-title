"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useClientValue } from "@/lib/hooks/use-client";

/**
 * Editorial-row illustrations for the service index (homepage + /services). One
 * consistent style across all seven transactions: flat, two-tone (ink navy with
 * a plate-red accent) geometric shapes on a transparent surface, echoing the
 * plate/counter brand. Every illustration is drawn on the SAME 160×120 grid with
 * the same stroke language and visual weight, so no service reads bigger than
 * another.
 *
 * Each carries a single accent that plays ONE gesture — a draw, a stamp, a slide,
 * a turn — pure CSS keyframes defined in globals.css. This component only flips a
 * transient `data-enter` flag (the CSS trigger) the first time the row scrolls
 * into view, staggered per row via `index`. Hover / focus replay is handled
 * entirely in CSS off the ancestor `.service-row`. Under reduced motion (or where
 * IntersectionObserver is unavailable) we never flip the flag; every accent's
 * resting state IS its finished state, so the art is complete and static.
 */
const INK = "var(--color-ink)";
const PLATE = "var(--color-plate)";
const PAPER = "#ffffff";
/** Lightened navy for secondary body lines. */
const SOFT = 0.34;

/** Gesture length plus a margin, so `data-enter` clears after the accent settles. */
const ENTER_HOLD_MS = 780;
/** Per-row entrance stagger, capped so late rows never lag too far. */
const STAGGER_MS = 80;

export function ServiceRowIllustration({
  slug,
  index,
  className,
}: {
  slug: string;
  index: number;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [enter, setEnter] = useState(false);

  // Resolve to the finished (static) state right away when the browser can't
  // observe scroll or the user opted out of motion. SSR-safe default is false so
  // there is no hydration mismatch and no setState-in-effect.
  const immediate = useClientValue(
    () =>
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    false,
  );

  useEffect(() => {
    if (immediate) return;
    const el = ref.current;
    if (!el) return;

    let playTimer: ReturnType<typeof setTimeout> | undefined;
    let clearTimer: ReturnType<typeof setTimeout> | undefined;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            io.disconnect();
            // Stagger the play, then clear the flag so the accent settles back to
            // its static state and a later hover can restart the gesture cleanly.
            playTimer = setTimeout(() => {
              setEnter(true);
              clearTimer = setTimeout(() => setEnter(false), ENTER_HOLD_MS);
            }, Math.min(index, 6) * STAGGER_MS);
            return;
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (playTimer) clearTimeout(playTimer);
      if (clearTimer) clearTimeout(clearTimer);
    };
  }, [immediate, index]);

  return (
    <svg
      ref={ref}
      data-enter={enter ? "true" : "false"}
      className={["svc-illus", className].filter(Boolean).join(" ")}
      viewBox="0 0 160 120"
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
          <rect x={52} y={18} width={56} height={80} rx={6} fill={PAPER} stroke={INK} strokeWidth={3} />
          <rect x={60} y={28} width={30} height={6} rx={3} fill={INK} />
          <rect x={60} y={42} width={40} height={4.5} rx={2.25} fill={INK} opacity={SOFT} />
          <rect x={60} y={52} width={34} height={4.5} rx={2.25} fill={INK} opacity={SOFT} />
          <rect x={60} y={62} width={28} height={4.5} rx={2.25} fill={INK} opacity={SOFT} />
          <g className="illus-seal">
            <circle cx={94} cy={80} r={14} fill={PAPER} stroke={PLATE} strokeWidth={3} />
            <circle cx={94} cy={80} r={8.5} fill="none" stroke={PLATE} strokeWidth={2} />
            <circle cx={94} cy={80} r={2.4} fill={PLATE} />
            <polygon points="88,90 94,86 94,99" fill={PLATE} />
            <polygon points="100,90 94,86 94,99" fill={PLATE} />
          </g>
        </>
      );

    // A Louisiana plate with a route that draws toward its destination.
    case "new-to-louisiana":
      return (
        <>
          <rect x={20} y={56} width={84} height={38} rx={7} fill={PAPER} stroke={INK} strokeWidth={3} />
          <circle cx={30} cy={63} r={1.8} fill={INK} />
          <circle cx={94} cy={63} r={1.8} fill={INK} />
          <rect x={34} y={60} width={56} height={3.5} rx={1.75} fill={INK} opacity={0.4} />
          <rect x={34} y={68} width={14} height={18} rx={2} fill={INK} />
          <rect x={52} y={68} width={14} height={18} rx={2} fill={INK} />
          <circle cx={76} cy={77} r={4} fill={PLATE} />
          <rect x={86} y={68} width={12} height={18} rx={2} fill={INK} opacity={0.4} />
          <path
            className="illus-route"
            d="M104 66 C 128 62, 122 34, 138 30 M131 26 L140 30 L134 39"
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
          <rect x={56} y={38} width={48} height={48} rx={8} fill={PAPER} stroke={INK} strokeWidth={3} />
          <rect x={60} y={42} width={40} height={10} rx={3} fill={PLATE} />
          <rect x={65} y={60} width={30} height={6} rx={3} fill={INK} />
          <rect x={65} y={71} width={20} height={5} rx={2.5} fill={INK} opacity={0.4} />
          <g className="illus-cycle" fill="none" stroke={PLATE} strokeWidth={3} strokeLinecap="round">
            <path d="M80 30 A 32 32 0 0 1 110 74" />
            <polygon points="114,66 111,76 104,69" fill={PLATE} stroke="none" />
            <path d="M80 94 A 32 32 0 0 1 50 50" />
            <polygon points="46,58 49,48 56,55" fill={PLATE} stroke="none" />
          </g>
        </>
      );

    // Two stacked titles — the back one ghosted — whose front copy slides in.
    case "duplicate-title":
      return (
        <>
          <rect
            x={42}
            y={16}
            width={52}
            height={72}
            rx={6}
            fill="none"
            stroke={INK}
            strokeWidth={2.5}
            strokeDasharray="5 5"
            opacity={0.45}
          />
          <g className="illus-dup">
            <rect x={62} y={32} width={52} height={72} rx={6} fill={PAPER} stroke={INK} strokeWidth={3} />
            <rect x={70} y={42} width={26} height={6} rx={3} fill={INK} />
            <rect x={70} y={56} width={34} height={4.5} rx={2.25} fill={INK} opacity={SOFT} />
            <rect x={70} y={66} width={28} height={4.5} rx={2.25} fill={INK} opacity={SOFT} />
            <rect x={70} y={76} width={20} height={4.5} rx={2.25} fill={INK} opacity={SOFT} />
            <circle cx={98} cy={90} r={9} fill={PAPER} stroke={PLATE} strokeWidth={2.5} />
            <circle cx={98} cy={90} r={2} fill={PLATE} />
          </g>
        </>
      );

    // A title with a handing-down motif: one line branching to two heirs. The
    // branch draws in slowly — dignified, no spring or scale.
    case "inherited-vehicle":
      return (
        <>
          <rect x={52} y={18} width={56} height={54} rx={6} fill={PAPER} stroke={INK} strokeWidth={3} />
          <rect x={60} y={26} width={30} height={6} rx={3} fill={INK} />
          <rect x={60} y={40} width={36} height={4.5} rx={2.25} fill={INK} opacity={SOFT} />
          <rect x={60} y={50} width={28} height={4.5} rx={2.25} fill={INK} opacity={SOFT} />
          <circle cx={80} cy={72} r={3} fill={INK} />
          <path className="illus-branch" d="M80 72 L80 84 L64 100" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <path className="illus-branch" d="M80 72 L80 84 L96 100" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={64} cy={102} r={3.5} fill={PLATE} />
          <circle cx={96} cy={102} r={3.5} fill={PLATE} />
        </>
      );

    // A Louisiana-proportioned plate whose red specialty star pops in.
    case "plates":
      return (
        <>
          <rect x={28} y={38} width={104} height={52} rx={8} fill={PAPER} stroke={INK} strokeWidth={3} />
          <circle cx={40} cy={48} r={2} fill={INK} />
          <circle cx={120} cy={48} r={2} fill={INK} />
          <rect x={48} y={44} width={64} height={4} rx={2} fill={INK} opacity={0.4} />
          <rect x={44} y={56} width={12} height={24} rx={2} fill={INK} />
          <rect x={60} y={56} width={12} height={24} rx={2} fill={INK} />
          <rect x={88} y={56} width={12} height={24} rx={2} fill={INK} />
          <rect x={104} y={56} width={12} height={24} rx={2} fill={INK} />
          <path
            className="illus-star"
            d="M80 59 L82.1 65.1 L88.6 65.2 L83.4 69.1 L85.3 75.3 L80 71.6 L74.7 75.3 L76.6 69.1 L71.4 65.2 L77.9 65.1 Z"
            fill={PLATE}
          />
        </>
      );

    // A notary stamp that presses down and leaves its red seal imprint.
    case "notary":
      return (
        <>
          <line x1={36} y1={98} x2={124} y2={98} stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <g className="illus-imprint">
            <circle cx={80} cy={88} r={11} fill="none" stroke={PLATE} strokeWidth={3} />
            <circle cx={80} cy={88} r={2.4} fill={PLATE} />
          </g>
          <g className="illus-press">
            <rect x={70} y={32} width={20} height={12} rx={4} fill={INK} />
            <rect x={76} y={44} width={8} height={10} rx={2} fill={INK} />
            <rect x={62} y={54} width={36} height={14} rx={3} fill={INK} />
          </g>
        </>
      );

    default:
      return null;
  }
}
