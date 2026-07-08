"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { useUi } from "@/lib/i18n/client";
import { BrandMark } from "@/components/BrandMark";
import { HomeHeroStatus } from "@/components/HomeHeroStatus";

/* ----------------------------------------------------------------------------
   Customer-facing hero copy comes from the translation layer (useUi). The CTA
   destination is fixed.
   -------------------------------------------------------------------------- */
const CTA_HREF = "/check-in";

type TrafficSpeed = "calm" | "normal" | "brisk";

/* ----------------------------------------------------------------------------
   The telephoto traffic band (locked palette, built imperatively into a ref'd
   div). Four distinct side profiles via clip-path roofline; red/navy bodies
   only; faster cars smear more via the directional SVG motion-blur tiers.
   -------------------------------------------------------------------------- */
const RED = "#C8102E";
const NAVY = "#14213D";

type CarType = "sedan" | "suv" | "pickup" | "coupe";

interface CarShape {
  /** Body width (px) and height (hb) before scaling. */
  w: number;
  hb: number;
  /** Front / rear wheel centers as a fraction of width. */
  fw: number;
  rw: number;
  /** Body outline (roofline). */
  clip: string;
}

const TYPES: Record<CarType, CarShape> = {
  sedan: {
    w: 244,
    hb: 72,
    fw: 0.18,
    rw: 0.82,
    clip: "polygon(0% 80%,16% 56%,30% 22%,70% 22%,84% 56%,100% 78%,100% 100%,0% 100%)",
  },
  suv: {
    w: 212,
    hb: 92,
    fw: 0.2,
    rw: 0.8,
    clip: "polygon(0% 42%,14% 20%,28% 8%,86% 8%,94% 22%,100% 44%,100% 100%,0% 100%)",
  },
  pickup: {
    w: 256,
    hb: 80,
    fw: 0.16,
    rw: 0.84,
    clip: "polygon(0% 60%,14% 40%,24% 14%,48% 14%,53% 46%,100% 52%,100% 100%,0% 100%)",
  },
  coupe: {
    w: 184,
    hb: 76,
    fw: 0.22,
    rw: 0.78,
    clip: "polygon(0% 64%,19% 44%,35% 20%,60% 22%,100% 60%,100% 100%,0% 100%)",
  },
};

interface CarConfig {
  type: CarType;
  /** Body color (red or navy only). */
  c: string;
  /** Lane offset from the band floor, in % of band height. */
  bottom: number;
  /** Scale factor (telephoto, depth-compressed). */
  s: number;
  /** Lane opacity. */
  o: number;
  /** Velocity (px/s at speed factor 1). */
  v: number;
  /** Directional motion-blur tier (1 = light, 4 = heaviest smear). */
  mb: 1 | 2 | 3 | 4;
}

// Densely packed, no two adjacent silhouettes alike; faster cars smear more.
const CARS: CarConfig[] = [
  { type: "suv", c: NAVY, bottom: 3, s: 2.3, o: 0.66, v: 360, mb: 2 },
  { type: "sedan", c: RED, bottom: 1, s: 2.45, o: 0.62, v: 440, mb: 3 },
  { type: "pickup", c: NAVY, bottom: 6, s: 2.12, o: 0.6, v: 330, mb: 2 },
  { type: "coupe", c: RED, bottom: 2, s: 2.55, o: 0.64, v: 540, mb: 4 },
  { type: "sedan", c: NAVY, bottom: 9, s: 2.02, o: 0.54, v: 300, mb: 1 },
  { type: "suv", c: RED, bottom: 0, s: 2.38, o: 0.62, v: 480, mb: 3 },
  { type: "coupe", c: NAVY, bottom: 12, s: 1.92, o: 0.5, v: 580, mb: 4 },
  { type: "pickup", c: RED, bottom: 7, s: 2.08, o: 0.56, v: 400, mb: 2 },
  { type: "sedan", c: NAVY, bottom: 14, s: 1.82, o: 0.48, v: 340, mb: 2 },
];

interface StreakConfig {
  c: string;
  bottom: number;
  w: number;
  h: number;
  v: number;
}

// Thin red / navy speed streaks, faster than the cars.
const STREAKS: StreakConfig[] = [
  { c: "rgba(200,16,46,0.5)", bottom: 18, w: 380, h: 6, v: 760 },
  { c: "rgba(20,33,61,0.4)", bottom: 9, w: 320, h: 5, v: 680 },
  { c: "rgba(200,16,46,0.4)", bottom: 27, w: 280, h: 4, v: 820 },
  { c: "rgba(20,33,61,0.32)", bottom: 23, w: 340, h: 5, v: 720 },
];

const SPEED_MULTIPLIER: Record<TrafficSpeed, number> = {
  calm: 0.62,
  normal: 1,
  brisk: 1.5,
};

interface BandItem {
  el: HTMLElement;
  x: number;
  v: number;
  w: number;
  span: number;
}

interface BuildOptions {
  reduced: boolean;
  trafficSpeed: TrafficSpeed;
  /** Four filter element ids, indexed by motion-blur tier minus one. */
  filterIds: string[];
  /** Thin the scene on small screens so the blur stays at 60fps. */
  small: boolean;
}

// One car: red/navy body via clip-path roofline, rocker, wheel arches + wheels.
// Roofs crop off the top of the band into the paper fade.
function makeCar(type: CarType, color: string): HTMLDivElement {
  const p = TYPES[type];
  const dark = color === RED ? "rgba(72,5,15,0.5)" : "rgba(5,10,24,0.55)";

  const wrap = document.createElement("div");
  wrap.style.cssText = `position:relative;width:${p.w}px;height:${p.hb + 26}px;`;

  const body = document.createElement("div");
  body.style.cssText = `position:absolute;left:0;bottom:22px;width:${p.w}px;height:${p.hb}px;background:${color};clip-path:${p.clip};-webkit-clip-path:${p.clip};`;
  wrap.appendChild(body);

  const rocker = document.createElement("div");
  rocker.style.cssText = `position:absolute;left:0;bottom:22px;width:${p.w}px;height:11px;background:${dark};`;
  wrap.appendChild(rocker);

  [p.fw, p.rw].forEach((fx) => {
    const cx = fx * p.w;
    const ad = 56;
    const arch = document.createElement("div");
    arch.style.cssText = `position:absolute;left:${cx - ad / 2}px;bottom:5px;width:${ad}px;height:44px;border-radius:50%;background:${dark};`;
    wrap.appendChild(arch);

    const wd = 46;
    const wheel = document.createElement("div");
    wheel.style.cssText = `position:absolute;left:${cx - wd / 2}px;bottom:0;width:${wd}px;height:${wd}px;border-radius:50%;background:#0d1526;`;
    wrap.appendChild(wheel);
  });

  return wrap;
}

// (Re)build the whole scene into `band` and return the drive items. Pure DOM,
// no React state, so a ResizeObserver can call it on every relayout cheaply.
function buildBand(band: HTMLElement, opts: BuildOptions): BandItem[] {
  const { reduced, trafficSpeed, filterIds, small } = opts;
  const vMul = SPEED_MULTIPLIER[trafficSpeed];
  const W = band.clientWidth || window.innerWidth || 1200;

  band.replaceChildren();
  const items: BandItem[] = [];

  // On small screens, thin the cars and soften the blur a tier so nine smeared,
  // SVG-filtered elements never cost us 60fps. Reduced motion is already static,
  // so it keeps the full, richer composition.
  const cars = small && !reduced ? CARS.filter((_, i) => i % 3 !== 2) : CARS;
  const streaks = small && !reduced ? STREAKS.slice(0, 2) : STREAKS;
  const tierFor = (mb: number) => (small && !reduced ? Math.max(1, mb - 1) : mb);

  const place = (
    el: HTMLElement,
    baseW: number,
    vBase: number,
    i: number,
    n: number,
    isStreak: boolean,
  ) => {
    const w = baseW;
    const span = W + w + 200;
    const x = (((i + (isStreak ? 0.5 : 0)) / n) * (W + w)) - w * 0.6;
    el.style.transform = `translateX(${x}px)`;
    items.push({ el, x, v: vBase * vMul, w, span });
  };

  cars.forEach((cfg, i) => {
    const lane = document.createElement("div");
    // Moving: directional SVG smear. Static (reduced): light DoF blur, shapes read.
    const filt = reduced ? "blur(3px)" : `url(#${filterIds[tierFor(cfg.mb) - 1]})`;
    lane.style.cssText = `position:absolute;left:0;bottom:${cfg.bottom}%;opacity:${cfg.o};filter:${filt};will-change:transform;`;

    const inner = document.createElement("div");
    inner.style.cssText = `transform:scale(${cfg.s});transform-origin:left bottom;`;
    inner.appendChild(makeCar(cfg.type, cfg.c));
    lane.appendChild(inner);
    band.appendChild(lane);

    place(lane, TYPES[cfg.type].w * cfg.s, cfg.v, i, cars.length, false);
  });

  streaks.forEach((s, i) => {
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;left:0;bottom:${s.bottom}%;width:${s.w}px;height:${s.h}px;border-radius:${s.h}px;background:linear-gradient(90deg,transparent,${s.c});filter:blur(2px);will-change:transform;`;
    band.appendChild(el);

    place(el, s.w, s.v, i, streaks.length, true);
  });

  return items;
}

interface HomeHeroProps {
  /** Traffic tempo. Defaults to `normal`. */
  trafficSpeed?: TrafficSpeed;
}

/**
 * Top-of-page hero: an oversized 88 watermark behind the headline and a
 * continuous, out-of-focus telephoto traffic band that resolves into the next
 * section's paper background. The band is a single requestAnimationFrame drive
 * loop with an eased global speed factor (so it can ease to a stop on the CTA
 * and resume), rebuilt on resize, and falls back to a static, readable
 * composition under prefers-reduced-motion.
 */
export function HomeHero({ trafficSpeed = "normal" }: HomeHeroProps) {
  const ui = useUi();
  const bandRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<BandItem[]>([]);
  const speedRef = useRef(1); // current global speed factor (eased)
  const speedTargetRef = useRef(1); // factor eases toward this
  const reducedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);

  // Stable, collision-safe filter ids (':' from useId is invalid in url(#...)).
  const rawId = useId();
  const filterIds = useMemo(() => {
    const base = `hero-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    return [1, 2, 3, 4].map((t) => `${base}-mb${t}`);
  }, [rawId]);

  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;

    const reduceMql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const smallMql = window.matchMedia("(max-width: 480px)");

    const rebuild = () => {
      itemsRef.current = buildBand(band, {
        reduced: reducedRef.current,
        trafficSpeed,
        filterIds,
        small: smallMql.matches,
      });
    };

    const tick = (now: number) => {
      let dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      if (dt > 0.05) dt = 0.05;

      // Ease the global speed factor toward its target (smooth stop / resume).
      const target = speedTargetRef.current;
      speedRef.current += (target - speedRef.current) * (1 - Math.exp(-dt / 0.45));
      if (Math.abs(target - speedRef.current) < 0.0015) speedRef.current = target;

      const s = speedRef.current;
      for (const it of itemsRef.current) {
        it.x -= it.v * s * dt;
        if (it.x < -it.w - 120) it.x += it.span;
        it.el.style.transform = `translateX(${it.x}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (rafRef.current !== null) return;
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    };
    const stopLoop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const applyMotionState = () => {
      reducedRef.current = reduceMql.matches;
      speedRef.current = reducedRef.current ? 0 : 1;
      speedTargetRef.current = speedRef.current;
      rebuild();
      if (reducedRef.current) stopLoop();
      else startLoop();
    };

    applyMotionState();

    const ro = new ResizeObserver(() => rebuild());
    ro.observe(band);

    // The motion preference and the small-screen threshold both reshape the
    // scene, so re-derive it when either flips.
    reduceMql.addEventListener("change", applyMotionState);
    smallMql.addEventListener("change", rebuild);

    return () => {
      stopLoop();
      ro.disconnect();
      reduceMql.removeEventListener("change", applyMotionState);
      smallMql.removeEventListener("change", rebuild);
    };
  }, [trafficSpeed, filterIds]);

  // Flourish: hovering/focusing the primary CTA eases the traffic to a stop,
  // like the line pausing for you. Never blocks the click, and is a no-op under
  // reduced motion (the loop is not running). Resumes on leave/blur.
  const easeTraffic = (stop: boolean) => {
    if (reducedRef.current) return;
    speedTargetRef.current = stop ? 0 : 1;
  };

  return (
    <section
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-haze"
      style={{ "--band-h": "clamp(230px,44vh,440px)" } as CSSProperties}
    >
      {/* Oversized 88 monogram watermark: cream fill, faint embossed navy
          outline (the same drawn mark as the header, at landmark scale). */}
      <BrandMark
        className="pointer-events-none absolute right-[2vw] top-[8%] z-[1] h-auto select-none"
        style={{ width: "clamp(260px,52vw,680px)", color: "#EEEAE2" }}
        outline="rgba(20,33,61,0.10)"
      />

      {/* Directional motion-blur filters: large horizontal, small vertical. */}
      <svg aria-hidden="true" width="0" height="0" className="absolute h-0 w-0">
        <defs>
          <filter id={filterIds[0]} x="-90%" y="-25%" width="280%" height="150%">
            <feGaussianBlur stdDeviation="14 4" />
          </filter>
          <filter id={filterIds[1]} x="-90%" y="-25%" width="280%" height="150%">
            <feGaussianBlur stdDeviation="19 4" />
          </filter>
          <filter id={filterIds[2]} x="-90%" y="-25%" width="280%" height="150%">
            <feGaussianBlur stdDeviation="24 5" />
          </filter>
          <filter id={filterIds[3]} x="-90%" y="-25%" width="280%" height="150%">
            <feGaussianBlur stdDeviation="30 5" />
          </filter>
        </defs>
      </svg>

      {/* Continuous out-of-focus traffic band (cars built imperatively). */}
      <div
        ref={bandRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] overflow-hidden"
        style={{ height: "var(--band-h)" }}
      />

      {/* Top fade: crops the car roofs into the paper background. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[3]"
        style={{
          height: "clamp(270px,52vh,520px)",
          background: "linear-gradient(180deg,#FAFAF8 0%,rgba(250,250,248,0) 40%)",
        }}
      />
      {/* Left fade: keeps the text column clear over the band. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[3]"
        style={{
          background:
            "linear-gradient(90deg,#FAFAF8 0%,#FAFAF8 16%,rgba(250,250,248,0) 52%)",
        }}
      />
      {/* Bottom fade: resolves the band into the next section's paper, no hard line. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[3]"
        style={{
          height: "clamp(80px,13vh,150px)",
          background: "linear-gradient(0deg,#FAFAF8 0%,rgba(250,250,248,0) 100%)",
        }}
      />

      {/* Content — one tight vertical stack (eyebrow → headline → subline → CTA →
          live status), centered in the space above the band. The band height is
          reserved as padding-bottom (same --band-h that sizes the band), so the
          stack never collides with the traffic and the band always anchors the
          bottom of the first viewport. Shares the site container width/padding. */}
      <div
        className="relative z-[5] mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center px-4 pt-[clamp(28px,6vh,96px)] sm:px-6"
        style={{ paddingBottom: "var(--band-h)" }}
      >
        <p
          className="font-display font-extrabold uppercase leading-none text-plate"
          style={{ fontSize: "clamp(11px,1.4vw,13px)", letterSpacing: "0.18em" }}
        >
          {ui.home.hero.eyebrow}
        </p>
        <h1
          className="font-display font-extrabold text-ink"
          style={{
            margin: "clamp(14px,2.2vw,24px) 0 0",
            fontSize: "clamp(36px,6.8vw,84px)",
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            maxWidth: "15ch",
            textWrap: "balance",
          }}
        >
          {ui.home.hero.headline}
        </h1>
        <p
          className="mt-[clamp(12px,1.7vw,22px)] max-w-[46ch] leading-[1.5]"
          style={{ fontSize: "clamp(15px,1.9vw,20px)", color: "#6B7280" }}
        >
          {ui.home.hero.subhead}
        </p>

        {/* CTA directly beneath the subline — one spacing unit, not a screen. */}
        <div className="mt-[clamp(18px,2.6vh,30px)]">
          <Link
            href={CTA_HREF}
            className="btn btn--primary btn--lg"
            onMouseEnter={() => easeTraffic(true)}
            onMouseLeave={() => easeTraffic(false)}
            onFocus={() => easeTraffic(true)}
            onBlur={() => easeTraffic(false)}
          >
            {ui.home.hero.cta}
          </Link>
        </div>

        <HomeHeroStatus className="mt-[clamp(12px,1.8vh,18px)]" />
      </div>
    </section>
  );
}
