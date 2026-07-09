"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useUi } from "@/lib/i18n/client";

/**
 * The right-side hero visual: seven cross-fading service vignettes drawn behind
 * a functional 88, ported from the approved Claude Design export (a DCLogic
 * `<x-dc>`). The DCLogic state machine is re-expressed with React state + refs;
 * the seven inline SVG vignettes are the approved drawings, unchanged. Every
 * looping gesture is defined in globals.css under `.hero-slideshow` and hangs
 * off a `data-anim` hook so it can be frozen (reduced motion, offscreen, hidden
 * tab). The cross-fade is a per-layer transition.
 *
 * Each slide is a real <Link> to its service page (PART 3.5): only the active
 * slide's link is interactive and in the tab order; the inactive layers are
 * inert. The seven mini-dots are labeled <button>s, the sole switch control —
 * the big-88 counters are decorative.
 */

/** One localized service, supplied by the server (no client i18n bundle cost). */
export interface HeroSlide {
  slug: string;
  label: string;
  blurb: string;
}

/**
 * Canonical visual order of the vignettes, index-aligned with VIGNETTES below.
 * Each entry is a real transaction slug (lib/checklists.ts), so the card links
 * to `/services/<slug>` — the map is built from real routes, never guessed.
 */
const SLIDE_SLUGS = [
  "registration-renewal",
  "title-transfer",
  "plates",
  "new-to-louisiana",
  "duplicate-title",
  "inherited-vehicle",
  "notary",
] as const;

const AUTO_ADVANCE_MS = 4800;

/** The four lit windows of the functional 88 (decorative; one is always lit). */
const COUNTERS: ReadonlyArray<{
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
}> = [
  { x: 32, y: 28, w: 106, h: 108, rx: 32 },
  { x: 32, y: 172, w: 106, h: 112, rx: 36 },
  { x: 208, y: 28, w: 106, h: 108, rx: 32 },
  { x: 208, y: 172, w: 106, h: 112, rx: 36 },
];

/** Ambient float wrapper carried by every vignette; per-slide duration desyncs
    the seven so they never breathe in lockstep. */
function Float({
  duration,
  children,
}: {
  duration: string;
  children: ReactNode;
}) {
  return (
    <div
      className="hv-floaty"
      data-anim
      style={{ animationDuration: duration }}
    >
      {children}
    </div>
  );
}

/**
 * The seven approved SVG vignettes, index-aligned with SLIDE_SLUGS. Ported
 * verbatim from the export (attributes JSX-ified; colors reference the CSS
 * variables set on the slideshow root). Do not redraw.
 */
const VIGNETTES: readonly ReactNode[] = [
  // 0 — REGISTRATION RENEWAL
  <Float key="registration-renewal" duration="8s">
    <svg
      viewBox="0 0 320 320"
      style={{ overflow: "visible", width: "clamp(230px,22vw,330px)" }}
    >
      <g fill="none" stroke="var(--navy)" strokeLinecap="round" strokeLinejoin="round">
        <rect x={92} y={104} width={136} height={118} rx={14} strokeWidth={5} fill="var(--paper)" />
        <line x1={118} y1={134} x2={202} y2={134} stroke="var(--red)" strokeWidth={8} />
        <line x1={118} y1={164} x2={202} y2={164} strokeWidth={6} />
        <line x1={118} y1={188} x2={182} y2={188} strokeWidth={6} />
      </g>
      <g data-anim className="hv-spin" style={{ transformBox: "view-box", transformOrigin: "160px 160px" }}>
        <g fill="none" stroke="var(--red)" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M226.8 80.3 A104 104 0 0 1 212 250" />
          <path d="M198 240 l14 12 l4 -18" />
          <path d="M93.2 239.7 A104 104 0 0 1 108 70" />
          <path d="M122 80 l-14 -12 l-4 18" />
        </g>
      </g>
    </svg>
  </Float>,

  // 1 — TITLE TRANSFER
  <Float key="title-transfer" duration="7.6s">
    <svg
      viewBox="0 0 300 320"
      style={{ overflow: "visible", width: "clamp(220px,21vw,320px)" }}
    >
      <g fill="none" stroke="var(--navy)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={5}>
        <path d="M58 46 v228 a8 8 0 0 0 8 8 h168 a8 8 0 0 0 8 -8 v-214 l-40 -40 h-144 a8 8 0 0 0 -8 8 z" fill="var(--paper)" />
        <path d="M202 22 v32 a8 8 0 0 0 8 8 h32" />
        <line x1={88} y1={96} x2={214} y2={96} strokeWidth={6} />
        <line x1={88} y1={128} x2={214} y2={128} strokeWidth={6} />
        <line x1={88} y1={160} x2={180} y2={160} strokeWidth={6} />
      </g>
      <g data-anim className="hv-seal-pulse" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <circle cx={196} cy={234} r={32} fill="none" stroke="var(--red)" strokeWidth={5} />
        <circle cx={196} cy={234} r={20} fill="none" stroke="var(--red)" strokeWidth={3} />
        <circle cx={196} cy={234} r={6} fill="var(--red)" stroke="none" />
      </g>
    </svg>
  </Float>,

  // 2 — PLATES
  <Float key="plates" duration="7s">
    <svg
      viewBox="0 0 340 240"
      style={{ overflow: "visible", width: "clamp(270px,25vw,380px)" }}
    >
      <g fill="none" stroke="var(--navy)" strokeLinecap="round" strokeLinejoin="round">
        <rect x={24} y={34} width={292} height={172} rx={22} strokeWidth={6} fill="var(--paper)" />
        <rect x={40} y={50} width={260} height={140} rx={14} strokeWidth={2} />
        <circle cx={74} cy={66} r={6} fill="var(--navy)" stroke="none" />
        <circle cx={266} cy={66} r={6} fill="var(--navy)" stroke="none" />
        <path d="M100 78 c 18 -8 30 6 46 -1 c 16 -7 28 6 44 0 c 16 -6 30 6 46 -2" strokeWidth={3} />
        <rect x={84} y={116} width={16} height={74} rx={4} fill="var(--navy)" stroke="none" />
        <rect x={112} y={116} width={16} height={74} rx={4} fill="var(--navy)" stroke="none" />
        <rect x={212} y={116} width={16} height={74} rx={4} fill="var(--navy)" stroke="none" />
        <rect x={240} y={116} width={16} height={74} rx={4} fill="var(--navy)" stroke="none" />
      </g>
      <g
        data-anim
        className="hv-seal-pulse"
        style={{ transformBox: "fill-box", transformOrigin: "center", animationDuration: "3.4s" }}
      >
        <path d="M170 122 l8 22 h23 l-19 14 l7 22 l-19 -14 l-19 14 l7 -22 l-19 -14 h23 z" fill="var(--red)" stroke="none" />
      </g>
    </svg>
  </Float>,

  // 3 — NEW TO LOUISIANA
  <Float key="new-to-louisiana" duration="7.8s">
    <svg
      viewBox="0 0 340 300"
      style={{ overflow: "visible", width: "clamp(250px,24vw,360px)" }}
    >
      <g fill="none" stroke="var(--navy)" strokeLinecap="round" strokeLinejoin="round">
        <rect x={36} y={128} width={230} height={132} rx={18} strokeWidth={6} fill="var(--paper)" />
        <rect x={50} y={142} width={202} height={104} rx={11} strokeWidth={2} />
        <rect x={78} y={170} width={15} height={48} rx={4} fill="var(--navy)" stroke="none" />
        <rect x={104} y={170} width={15} height={48} rx={4} fill="var(--navy)" stroke="none" />
        <rect x={184} y={170} width={15} height={48} rx={4} fill="var(--navy)" stroke="none" />
        <rect x={210} y={170} width={15} height={48} rx={4} fill="var(--navy)" stroke="none" />
      </g>
      <g data-anim className="hv-arrow" style={{ transformBox: "view-box", transformOrigin: "250px 90px" }}>
        <g fill="none" stroke="var(--red)" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M244 126 C 300 108, 322 78, 296 46" />
          <path d="M280 52 l16 -8 l4 18" />
        </g>
      </g>
    </svg>
  </Float>,

  // 4 — DUPLICATE TITLE
  <Float key="duplicate-title" duration="7.2s">
    <svg
      viewBox="0 0 320 320"
      style={{ overflow: "visible", width: "clamp(230px,22vw,330px)" }}
    >
      <rect x={46} y={40} width={170} height={230} rx={14} fill="none" stroke="var(--navy)" strokeWidth={4} strokeDasharray="9 9" opacity={0.5} />
      <g data-anim className="hv-dup" style={{ transformBox: "view-box", transformOrigin: "180px 180px" }}>
        <g fill="none" stroke="var(--navy)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={5}>
          <rect x={94} y={66} width={176} height={236} rx={15} fill="var(--paper)" />
          <line x1={124} y1={118} x2={240} y2={118} strokeWidth={6} />
          <line x1={124} y1={148} x2={240} y2={148} strokeWidth={6} />
          <line x1={124} y1={178} x2={206} y2={178} strokeWidth={6} />
        </g>
        <g>
          <circle cx={236} cy={262} r={17} fill="none" stroke="var(--red)" strokeWidth={4} />
          <circle cx={236} cy={262} r={5} fill="var(--red)" stroke="none" />
        </g>
      </g>
    </svg>
  </Float>,

  // 5 — INHERITED VEHICLE
  <Float key="inherited-vehicle" duration="8.2s">
    <svg
      viewBox="0 0 320 320"
      style={{ overflow: "visible", width: "clamp(230px,22vw,330px)" }}
    >
      <g fill="none" stroke="var(--navy)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={5}>
        <line x1={160} y1={196} x2={160} y2={252} />
        <line x1={160} y1={252} x2={120} y2={292} />
        <line x1={160} y1={252} x2={200} y2={292} />
      </g>
      <g data-anim className="hv-sway" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        <g fill="none" stroke="var(--navy)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={5}>
          <rect x={82} y={52} width={156} height={140} rx={12} fill="var(--paper)" />
          <line x1={110} y1={88} x2={210} y2={88} strokeWidth={6} />
          <line x1={110} y1={116} x2={210} y2={116} strokeWidth={6} />
          <line x1={110} y1={144} x2={176} y2={144} strokeWidth={6} />
        </g>
      </g>
      <circle cx={160} cy={252} r={7} fill="var(--red)" stroke="none" />
    </svg>
  </Float>,

  // 6 — NOTARY
  <Float key="notary" duration="7.4s">
    <svg
      viewBox="0 0 320 300"
      style={{ overflow: "visible", width: "clamp(240px,23vw,340px)" }}
    >
      <line x1={54} y1={236} x2={266} y2={236} stroke="var(--navy)" strokeWidth={5} strokeLinecap="round" />
      <circle
        data-anim
        className="hv-seal-shock"
        cx={160}
        cy={236}
        r={24}
        fill="none"
        stroke="var(--red)"
        strokeWidth={3}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      <g data-anim className="hv-seal-ink" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <circle cx={160} cy={236} r={24} fill="none" stroke="var(--red)" strokeWidth={4} />
        <circle cx={160} cy={236} r={19} fill="none" stroke="var(--red)" strokeWidth={5} strokeDasharray="1.5 6" />
        <circle cx={160} cy={236} r={10} fill="none" stroke="var(--red)" strokeWidth={2.5} />
        <circle cx={160} cy={236} r={3} fill="var(--red)" stroke="none" />
      </g>
      <g data-anim className="hv-stamp-drop" style={{ transformBox: "view-box", transformOrigin: "160px 150px" }}>
        <g fill="none" stroke="var(--navy)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={5}>
          <rect x={118} y={198} width={84} height={16} rx={6} fill="var(--paper)" />
          <rect x={124} y={150} width={72} height={50} rx={10} fill="var(--paper)" />
          <line x1={138} y1={168} x2={182} y2={168} strokeWidth={3} />
          <line x1={138} y1={182} x2={182} y2={182} strokeWidth={3} />
          <path d="M140 112 H180 L196 150 H124 Z" fill="var(--paper)" />
          <line x1={160} y1={112} x2={160} y2={92} />
          <line x1={144} y1={92} x2={176} y2={92} strokeWidth={5} />
          <rect x={136} y={60} width={48} height={30} rx={14} fill="var(--paper)" />
          <line x1={150} y1={70} x2={150} y2={80} strokeWidth={3} />
          <line x1={170} y1={70} x2={170} y2={80} strokeWidth={3} />
        </g>
      </g>
    </svg>
  </Float>,
];

export function HeroServiceSlideshow({ slides }: { slides: HeroSlide[] }) {
  const ss = useUi().home.hero.slideshow;

  // Re-order the server-supplied services into the canonical vignette order and
  // pair each with its drawing. Unknown slugs fall back gracefully (never hit in
  // practice — every SLIDE_SLUGS entry is a real transaction).
  const items = useMemo(() => {
    const bySlug = new Map(slides.map((s) => [s.slug, s]));
    return SLIDE_SLUGS.map((slug, i) => {
      const s = bySlug.get(slug);
      return {
        slug,
        label: s?.label ?? slug,
        blurb: s?.blurb ?? "",
        vignette: VIGNETTES[i],
      };
    });
  }, [slides]);

  const [active, setActive] = useState(0);
  const [motionPaused, setMotionPaused] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const onscreenRef = useRef(true);
  const tabVisibleRef = useRef(true);
  const reducedRef = useRef(false);

  // Single source of truth for "should the carousel be advancing right now",
  // evaluated whenever any pause reason flips. Also drives the `.is-paused`
  // class that freezes the CSS gestures when offscreen or the tab is hidden.
  const sync = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const offscreenOrHidden = !onscreenRef.current || !tabVisibleRef.current;
    const run =
      !reducedRef.current &&
      !hoverRef.current &&
      !focusRef.current &&
      !offscreenOrHidden;
    if (run) {
      timerRef.current = window.setInterval(() => {
        setActive((s) => (s + 1) % SLIDE_SLUGS.length);
      }, AUTO_ADVANCE_MS);
    }
    setMotionPaused(offscreenOrHidden);
  }, []);

  // A manual pick sets the slide and restarts the dwell, so the newly chosen
  // service gets a full interval before the next auto-advance.
  const go = useCallback(
    (i: number) => {
      setActive(i);
      sync();
    },
    [sync],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedRef.current = reduceMql.matches;
    tabVisibleRef.current = document.visibilityState !== "hidden";

    const onReduce = () => {
      reducedRef.current = reduceMql.matches;
      sync();
    };
    const onVisibility = () => {
      tabVisibleRef.current = document.visibilityState !== "hidden";
      sync();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        onscreenRef.current = entries[0]?.isIntersecting ?? true;
        sync();
      },
      { threshold: 0 },
    );
    observer.observe(root);

    reduceMql.addEventListener("change", onReduce);
    document.addEventListener("visibilitychange", onVisibility);
    sync();

    return () => {
      observer.disconnect();
      reduceMql.removeEventListener("change", onReduce);
      document.removeEventListener("visibilitychange", onVisibility);
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [sync]);

  const setHover = (v: boolean) => {
    hoverRef.current = v;
    sync();
  };
  // Pause on focus entering the region, resume only when focus leaves it.
  const handleFocus = () => {
    if (!focusRef.current) {
      focusRef.current = true;
      sync();
    }
  };
  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      focusRef.current = false;
      sync();
    }
  };

  return (
    <div
      ref={rootRef}
      className={`hero-slideshow${motionPaused ? " is-paused" : ""}`}
      role="group"
      aria-label={ss.regionLabel}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={
        {
          position: "relative",
          width: "100%",
          // Tall enough that the tallest vignette + title + description clears
          // the dots row (content runs ~445px); matches the approved export's
          // 58vh stage. Band clearance is verified against this height.
          height: "clamp(500px,58vh,540px)",
          "--navy": "#14213d",
          "--red": "#c8102e",
          "--paper": "#fafaf8",
          "--logo": "#eeeae2",
          "--ink": "#6b7280",
        } as CSSProperties
      }
    >
      {/* Functional 88: a cream monogram whose windows light one at a time. It is
          decorative — `active % 4` keeps exactly one square lit on every slide,
          never going dark. The dots are the only switch control. */}
      <svg
        aria-hidden="true"
        viewBox="-26 -26 424 366"
        style={{
          position: "absolute",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          width: "clamp(280px,28vw,460px)",
          zIndex: 1,
          overflow: "visible",
        }}
      >
        <g fill="none" stroke="var(--logo)" strokeWidth={44}>
          <rect x={10} y={6} width={150} height={152} rx={54} />
          <rect x={10} y={150} width={150} height={156} rx={58} />
          <rect x={186} y={6} width={150} height={152} rx={54} />
          <rect x={186} y={150} width={150} height={156} rx={58} />
        </g>
        {COUNTERS.map((c, j) => (
          <rect
            key={j}
            x={c.x}
            y={c.y}
            width={c.w}
            height={c.h}
            rx={c.rx}
            style={{
              fill: j === active % 4 ? "var(--red)" : "rgba(0,0,0,0)",
              transition: "fill .55s ease",
              pointerEvents: "none",
            }}
          />
        ))}
      </svg>

      {/* Stage: seven cross-fading layers, each a link to its service page. */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        {items.map((item, i) => {
          const isActive = i === active;
          return (
            <Link
              key={item.slug}
              href={`/services/${item.slug}`}
              className="hv-layer"
              aria-label={ss.serviceLink(item.label)}
              aria-hidden={isActive ? undefined : true}
              tabIndex={isActive ? 0 : -1}
              inert={isActive ? undefined : true}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "clamp(16px,2.4vh,30px)",
                // Reserve a clear band at the bottom for the dots row, so the
                // vertically-centered vignette + text never overlaps it.
                paddingBottom: "clamp(38px,5vh,56px)",
                textDecoration: "none",
                color: "inherit",
                transition:
                  "opacity .8s cubic-bezier(.22,.61,.36,1), transform .8s cubic-bezier(.22,.61,.36,1)",
                opacity: isActive ? 1 : 0,
                transform: isActive
                  ? "translateY(0) scale(1)"
                  : "translateY(34px) scale(.94)",
                pointerEvents: isActive ? "auto" : "none",
              }}
            >
              {item.vignette}
              <div style={{ textAlign: "center" }}>
                {/* Title carries the hover / focus affordance (navy -> plate
                    red, driven by .hv-title in globals.css) since the visible
                    "see what to bring" cue was removed to clear the dots row.
                    The link keeps its per-service aria-label below. */}
                <div
                  className="font-display hv-title"
                  style={{
                    fontWeight: 700,
                    fontSize: "clamp(27px,2.9vw,42px)",
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {item.label}
                </div>
                <p
                  style={{
                    margin: "12px auto 0",
                    maxWidth: "32ch",
                    fontSize: "clamp(14px,1.4vw,19px)",
                    lineHeight: 1.5,
                    color: "var(--ink)",
                  }}
                >
                  {item.blurb}
                </p>
              </div>
            </Link>
          );
        })}

        {/* Seven mini-dots: the sole switch control, real labeled buttons. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            justifyContent: "center",
            gap: 14,
            zIndex: 3,
          }}
        >
          {items.map((item, i) => {
            const on = i === active;
            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => go(i)}
                aria-label={ss.viewService(item.label)}
                aria-current={on ? "true" : undefined}
                style={{
                  width: 15,
                  height: 15,
                  padding: 0,
                  borderRadius: 5,
                  cursor: "pointer",
                  background: on ? "var(--red)" : "transparent",
                  border: on
                    ? "2px solid var(--red)"
                    : "2px solid rgba(20,33,61,0.22)",
                  transition:
                    "background .45s ease, border-color .45s ease, transform .45s ease",
                  transform: on ? "scale(1.12)" : "scale(1)",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
