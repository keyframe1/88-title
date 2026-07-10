import type { CSSProperties, ReactNode } from "react";

/**
 * Shared service vignettes — the seven approved Claude Design drawings, ported
 * verbatim from the showcase / cards `<x-dc>` exports and used by BOTH the
 * homepage showcase (components/services/ServicesShowcase.tsx) and the /services
 * card grid (components/services/ServiceCards.tsx). This is the single source of
 * truth for the drawings, so the SVG markup is written once, not copied per
 * surface.
 *
 * Each drawing carries neutral CSS class hooks — `v-amb` (an ambient loop),
 * `v-step` (a transition-driven shift), `v-imp` (an impression that fades in) —
 * but NO motion of its own. All motion lives in globals.css, scoped by ancestor:
 *   - `.svc-showcase` animates the hooks (idle ambient + hover / focus beat);
 *   - `.svc-cards` leaves them at rest (a calm, static icon), only revealing the
 *     notary seal the way the card export drew it.
 * So the same element tree reads as a lively showcase tile or a still utility
 * card depending purely on where it is rendered. Under prefers-reduced-motion
 * the ambient / beat rules never match and each drawing holds its resting
 * composition (see the no-preference gating in globals.css).
 *
 * The hero slideshow (components/hero/HeroServiceSlideshow.tsx) keeps its own
 * copy on purpose: its vignettes are entangled with the hero's cross-fade +
 * per-slide looping architecture, which is out of scope to touch here.
 *
 * The SVGs are decorative: every drawing is aria-hidden and the surrounding text
 * carries the meaning.
 */

/** The seven service slugs, index-aligned with the real transaction routes. */
export type VignetteSlug =
  | "registration-renewal"
  | "title-transfer"
  | "plates"
  | "new-to-louisiana"
  | "duplicate-title"
  | "inherited-vehicle"
  | "notary";

/** Brand colors, drawn from the shared @theme tokens. */
const INK = "var(--color-ink)";
const RED = "var(--color-plate)";
/** The off-white "paper" fill behind the drawn documents / plates. */
const PAPER = "var(--color-haze)";

/**
 * Per-service intrinsic SVG height (px). The showcase renders large vignettes;
 * the cards render the same drawings small. Widths are auto so the aspect ratio
 * is preserved from the viewBox.
 */
const HEIGHT: Record<VignetteSlug, { showcase: number; card: number }> = {
  "registration-renewal": { showcase: 140, card: 74 },
  "title-transfer": { showcase: 142, card: 76 },
  plates: { showcase: 112, card: 60 },
  "new-to-louisiana": { showcase: 132, card: 72 },
  "duplicate-title": { showcase: 142, card: 76 },
  "inherited-vehicle": { showcase: 142, card: 76 },
  notary: { showcase: 150, card: 92 },
};

const VIEWBOX: Record<VignetteSlug, string> = {
  "registration-renewal": "0 0 320 320",
  "title-transfer": "0 0 300 320",
  plates: "0 0 340 240",
  "new-to-louisiana": "0 0 340 300",
  "duplicate-title": "0 0 320 320",
  "inherited-vehicle": "0 0 320 320",
  notary: "0 0 320 300",
};

/** The drawn interior of each vignette (paths only; the <svg> wrapper is shared). */
function parts(slug: VignetteSlug): ReactNode {
  switch (slug) {
    // REGISTRATION RENEWAL — a sticker whose renewal arrows circle it; the top
    // line thickens (the impression) on the beat.
    case "registration-renewal":
      return (
        <>
          <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
            <rect x={92} y={104} width={136} height={118} rx={14} strokeWidth={5} fill={PAPER} />
            <line x1={118} y1={164} x2={202} y2={164} strokeWidth={6} />
            <line x1={118} y1={188} x2={182} y2={188} strokeWidth={6} />
          </g>
          <line
            className="v-imp v-imp--renewal"
            x1={118}
            y1={134}
            x2={202}
            y2={134}
            stroke={RED}
            strokeWidth={14}
            strokeLinecap="round"
          />
          <line x1={118} y1={134} x2={202} y2={134} stroke={RED} strokeWidth={8} strokeLinecap="round" />
          <g
            className="v-amb v-amb--renewal"
            style={{ transformBox: "view-box", transformOrigin: "160px 160px" }}
          >
            <g fill="none" stroke={RED} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M226.8 80.3 A104 104 0 0 1 212 250" />
              <path d="M198 240 l14 12 l4 -18" />
              <path d="M93.2 239.7 A104 104 0 0 1 108 70" />
              <path d="M122 80 l-14 -12 l-4 18" />
            </g>
          </g>
        </>
      );

    // TITLE TRANSFER — a certificate whose seal presses down (the step) onto the
    // impression seal, the transfer stamped.
    case "title-transfer":
      return (
        <>
          <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round" strokeWidth={5}>
            <path d="M58 46 v228 a8 8 0 0 0 8 8 h168 a8 8 0 0 0 8 -8 v-214 l-40 -40 h-144 a8 8 0 0 0 -8 8 z" fill={PAPER} />
            <path d="M202 22 v32 a8 8 0 0 0 8 8 h32" />
            <line x1={88} y1={96} x2={214} y2={96} strokeWidth={6} />
            <line x1={88} y1={128} x2={214} y2={128} strokeWidth={6} />
            <line x1={88} y1={160} x2={180} y2={160} strokeWidth={6} />
          </g>
          <g className="v-imp v-imp--title">
            <circle cx={150} cy={220} r={30} fill="none" stroke={RED} strokeWidth={4} />
            <circle cx={150} cy={220} r={18} fill="none" stroke={RED} strokeWidth={2.5} />
            <circle cx={150} cy={220} r={5} fill={RED} />
          </g>
          <g className="v-step v-step--title" style={{ transformBox: "view-box" }}>
            <g
              className="v-amb v-amb--title"
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            >
              <circle cx={150} cy={150} r={32} fill="none" stroke={RED} strokeWidth={5} />
              <circle cx={150} cy={150} r={20} fill="none" stroke={RED} strokeWidth={3} />
              <circle cx={150} cy={150} r={6} fill={RED} />
            </g>
          </g>
        </>
      );

    // PLATES — a Louisiana plate whose specialty star pulses; the whole plate
    // settles level on the beat.
    case "plates":
      return (
        <g className="v-step v-step--plates" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
            <rect x={24} y={34} width={292} height={172} rx={22} strokeWidth={6} fill={PAPER} />
            <rect x={40} y={50} width={260} height={140} rx={14} strokeWidth={2} />
            <circle cx={74} cy={66} r={6} fill={INK} stroke="none" />
            <circle cx={266} cy={66} r={6} fill={INK} stroke="none" />
            <path d="M100 78 c 18 -8 30 6 46 -1 c 16 -7 28 6 44 0 c 16 -6 30 6 46 -2" strokeWidth={3} />
            <rect x={84} y={116} width={16} height={74} rx={4} fill={INK} stroke="none" />
            <rect x={112} y={116} width={16} height={74} rx={4} fill={INK} stroke="none" />
            <rect x={212} y={116} width={16} height={74} rx={4} fill={INK} stroke="none" />
            <rect x={240} y={116} width={16} height={74} rx={4} fill={INK} stroke="none" />
          </g>
          <g
            className="v-amb v-amb--plates"
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          >
            <path d="M170 122 l8 22 h23 l-19 14 l7 22 l-19 -14 l-19 14 l7 -22 l-19 -14 h23 z" fill={RED} stroke="none" />
          </g>
        </g>
      );

    // NEW TO LOUISIANA — a new plate slides into place beneath a nudging arrow.
    case "new-to-louisiana":
      return (
        <>
          <g
            className="v-amb v-amb--newla"
            style={{ transformBox: "view-box", transformOrigin: "250px 90px" }}
          >
            <g fill="none" stroke={RED} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M244 126 C 300 108, 322 78, 296 46" />
              <path d="M280 52 l16 -8 l4 18" />
            </g>
          </g>
          <g className="v-step v-step--newla" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
            <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
              <rect x={36} y={128} width={230} height={132} rx={18} strokeWidth={6} fill={PAPER} />
              <rect x={50} y={142} width={202} height={104} rx={11} strokeWidth={2} />
              <rect x={78} y={170} width={15} height={48} rx={4} fill={INK} stroke="none" />
              <rect x={104} y={170} width={15} height={48} rx={4} fill={INK} stroke="none" />
              <rect x={184} y={170} width={15} height={48} rx={4} fill={INK} stroke="none" />
              <rect x={210} y={170} width={15} height={48} rx={4} fill={INK} stroke="none" />
            </g>
          </g>
        </>
      );

    // DUPLICATE TITLE — a fresh copy lifts off its ghosted original (bob), then
    // slides clear on the beat.
    case "duplicate-title":
      return (
        <>
          <rect x={46} y={40} width={170} height={230} rx={14} fill="none" stroke={INK} strokeWidth={4} strokeDasharray="9 9" opacity={0.5} />
          <g className="v-step v-step--dup" style={{ transformBox: "view-box" }}>
            <g className="v-amb v-amb--dup" style={{ transformBox: "view-box" }}>
              <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round" strokeWidth={5}>
                <rect x={94} y={66} width={176} height={236} rx={15} fill={PAPER} />
                <line x1={124} y1={118} x2={240} y2={118} strokeWidth={6} />
                <line x1={124} y1={148} x2={240} y2={148} strokeWidth={6} />
                <line x1={124} y1={178} x2={206} y2={178} strokeWidth={6} />
              </g>
              <circle cx={236} cy={262} r={17} fill="none" stroke={RED} strokeWidth={4} />
              <circle cx={236} cy={262} r={5} fill={RED} stroke="none" />
            </g>
          </g>
        </>
      );

    // INHERITED VEHICLE — a title hangs from a stem and sways gently; it lowers
    // on the beat (a dignified handing-down).
    case "inherited-vehicle":
      return (
        <>
          <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round" strokeWidth={5}>
            <line x1={160} y1={196} x2={160} y2={252} />
            <line x1={160} y1={252} x2={120} y2={292} />
            <line x1={160} y1={252} x2={200} y2={292} />
          </g>
          <circle cx={160} cy={252} r={7} fill={RED} stroke="none" />
          <g className="v-step v-step--inherit" style={{ transformBox: "view-box" }}>
            <g className="v-amb v-amb--inherit" style={{ transformBox: "fill-box", transformOrigin: "50% 0%" }}>
              <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round" strokeWidth={5}>
                <rect x={82} y={52} width={156} height={140} rx={12} fill={PAPER} />
                <line x1={110} y1={88} x2={210} y2={88} strokeWidth={6} />
                <line x1={110} y1={116} x2={210} y2={116} strokeWidth={6} />
                <line x1={110} y1={144} x2={176} y2={144} strokeWidth={6} />
              </g>
            </g>
          </g>
        </>
      );

    // NOTARY — a stamp floats, then presses down (the beat) and leaves its red
    // seal impression.
    case "notary":
      return (
        <>
          <line x1={54} y1={236} x2={266} y2={236} stroke={INK} strokeWidth={5} strokeLinecap="round" />
          <g className="v-imp v-imp--notary">
            <circle cx={160} cy={236} r={24} fill="none" stroke={RED} strokeWidth={4} />
            <circle cx={160} cy={236} r={19} fill="none" stroke={RED} strokeWidth={5} strokeDasharray="1.5 6" />
            <circle cx={160} cy={236} r={10} fill="none" stroke={RED} strokeWidth={2.5} />
            <circle cx={160} cy={236} r={3} fill={RED} />
          </g>
          <g className="v-amb v-amb--notary" style={{ transformBox: "view-box" }}>
            <g className="v-step v-step--notary" style={{ transformBox: "view-box" }}>
              <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round" strokeWidth={5}>
                <rect x={118} y={198} width={84} height={16} rx={6} fill={PAPER} />
                <rect x={124} y={150} width={72} height={50} rx={10} fill={PAPER} />
                <line x1={138} y1={168} x2={182} y2={168} strokeWidth={3} />
                <line x1={138} y1={182} x2={182} y2={182} strokeWidth={3} />
                <path d="M140 112 H180 L196 150 H124 Z" fill={PAPER} />
                <line x1={160} y1={112} x2={160} y2={92} />
                <line x1={144} y1={92} x2={176} y2={92} strokeWidth={5} />
                <rect x={136} y={60} width={48} height={30} rx={14} fill={PAPER} />
                <line x1={150} y1={70} x2={150} y2={80} strokeWidth={3} />
                <line x1={170} y1={70} x2={170} y2={80} strokeWidth={3} />
              </g>
            </g>
          </g>
        </>
      );
  }
}

/**
 * One decorative service vignette. `size` picks the intrinsic height (large for
 * the showcase, small for the cards); all motion is applied by the ancestor
 * scope in globals.css.
 */
export function ServiceVignette({
  slug,
  size,
  className,
  style,
}: {
  slug: VignetteSlug;
  size: "showcase" | "card";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox={VIEWBOX[slug]}
      aria-hidden="true"
      className={className}
      style={{
        height: HEIGHT[slug][size],
        width: "auto",
        overflow: "visible",
        display: "block",
        ...style,
      }}
    >
      {parts(slug)}
    </svg>
  );
}
