"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUi } from "@/lib/i18n/client";
import { useClientValue } from "@/lib/hooks/use-client";
import { ServiceVignette, type VignetteSlug } from "./vignettes";

/**
 * Homepage services showcase — ported from the approved Claude Design export
 * ("88 Title Services Showcase.dc.html"). A floating paper sheet on a darker
 * paper band carries the seven service vignettes: a 3x2 grid of tiles plus the
 * Notary walk-in anchor spanning the last row. Each tile is a real <Link> to its
 * service route.
 *
 * The export's per-tile JS animation is replaced by CSS: every gesture lives in
 * globals.css under `.svc-showcase` and fires on `:hover` / `:focus-visible`
 * (and, on touch devices, a one-shot `data-beat`). This component only:
 *   - reveals the sheet once when it first scrolls into view (IntersectionObserver),
 *   - freezes the ambient loops when the section is offscreen or the tab is
 *     hidden (adds `.is-paused`, same pattern as the hero slideshow),
 *   - plays the touch "beat" once per tile as it enters view on hover:none.
 * Responsive columns / compact sizing are pure CSS container queries on the sheet.
 */

/** Canonical grid order (index-aligned with the export); notary is the anchor. */
const SHOWCASE_ORDER: readonly VignetteSlug[] = [
  "registration-renewal",
  "title-transfer",
  "plates",
  "new-to-louisiana",
  "duplicate-title",
  "inherited-vehicle",
  "notary",
] as const;

export interface ShowcaseService {
  slug: string;
  label: string;
}

export function ServicesShowcase({ services }: { services: ShowcaseService[] }) {
  const t = useUi().home.services;

  const labelBySlug = new Map(services.map((s) => [s.slug, s.label]));
  const items = SHOWCASE_ORDER.map((slug) => ({
    slug,
    label: labelBySlug.get(slug) ?? slug,
  }));
  const tiles = items.slice(0, -1);
  const notary = items[items.length - 1];

  const rootRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [beats, setBeats] = useState<ReadonlySet<string>>(() => new Set());

  const onscreenRef = useRef(true);
  const tabVisibleRef = useRef(true);

  // Reveal the sheet up-front — never wait on the flourish — when we can't
  // observe scroll or the user opted out of motion. SSR default is false so
  // there is no hydration mismatch and no setState-in-effect (the effect only
  // ever latches `revealed` from an async callback).
  const immediate = useClientValue(
    () =>
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    false,
  );

  const syncPaused = useCallback(() => {
    setPaused(!onscreenRef.current || !tabVisibleRef.current);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (typeof IntersectionObserver === "undefined") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    tabVisibleRef.current = document.visibilityState !== "hidden";
    const onVisibility = () => {
      tabVisibleRef.current = document.visibilityState !== "hidden";
      syncPaused();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        onscreenRef.current = entry?.isIntersecting ?? true;
        if (entry?.isIntersecting) setRevealed(true);
        syncPaused();
      },
      { threshold: 0 },
    );
    io.observe(root);
    // Never leave the sheet hidden if the observer somehow never fires.
    const safety = setTimeout(() => setRevealed(true), 1400);

    // Touch (hover:none): play each tile's beat once as it scrolls into view,
    // settling back after 1.5s. Pointer devices use :hover instead.
    const touch = window.matchMedia("(hover: none)").matches;
    const timers: Record<string, ReturnType<typeof setTimeout>> = {};
    const seen = new Set<string>();
    let touchIo: IntersectionObserver | undefined;
    if (touch && !reduced) {
      touchIo = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const slug = entry.target.getAttribute("data-slug");
            if (!slug || seen.has(slug)) continue;
            seen.add(slug);
            setBeats((prev) => new Set(prev).add(slug));
            timers[slug] = setTimeout(() => {
              setBeats((prev) => {
                const next = new Set(prev);
                next.delete(slug);
                return next;
              });
            }, 1500);
          }
        },
        { threshold: 0.6 },
      );
      root.querySelectorAll("[data-slug]").forEach((el) => touchIo?.observe(el));
    }

    return () => {
      io.disconnect();
      touchIo?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(safety);
      Object.values(timers).forEach(clearTimeout);
    };
  }, [syncPaused]);

  const rootClass = [
    "svc-showcase",
    revealed || immediate ? "is-revealed" : "",
    paused ? "is-paused" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section ref={rootRef} className={rootClass} aria-labelledby="svc-showcase-heading">
      <div className="svc-reveal">
        <div className="svc-panel">
          <div className="svc-showcase__header">
            <p className="svc-showcase__eyebrow">{t.eyebrow}</p>
            <h2 id="svc-showcase-heading" className="svc-showcase__heading">
              {t.heading}
            </h2>
            <p className="svc-showcase__sub">{t.subhead}</p>
          </div>

          <div className="svc-grid">
            {tiles.map((item) => (
              <Link
                key={item.slug}
                href={`/services/${item.slug}`}
                data-slug={item.slug}
                data-beat={beats.has(item.slug) ? "true" : undefined}
                className="svc-tile"
              >
                <span className="svc-tile__icon">
                  <ServiceVignette slug={item.slug} size="showcase" />
                </span>
                <h3 className="svc-tile__label">{item.label}</h3>
              </Link>
            ))}

            <Link
              href={`/services/${notary.slug}`}
              data-slug={notary.slug}
              data-beat={beats.has(notary.slug) ? "true" : undefined}
              className="svc-tile svc-tile--notary"
            >
              <span className="svc-tile__icon">
                <ServiceVignette slug={notary.slug} size="showcase" />
              </span>
              <span className="svc-tile__notary-text">
                <h3 className="svc-tile__label">{notary.label}</h3>
                <span className="svc-tile__chip">{t.walkIn}</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
