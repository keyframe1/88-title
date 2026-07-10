"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The subtle once-per-load section reveal used across /for-dealers (a fade +
 * gentle rise as a block first scrolls into view). Ported from the design
 * exports' `data-reveal` behavior, with the same restraint: the reveal is the
 * ONLY ambient motion on the page besides the portal's single living detail.
 *
 * SSR / no-JS render the content VISIBLE (no opacity:0 baked into the markup),
 * so search engines and users without JS always see it. On mount the client only
 * HIDES a block that is still comfortably below the fold, then reveals it on
 * scroll-in; anything already in view (the hero) is never touched. Transform +
 * opacity only, so the reveal contributes zero layout shift. Under
 * prefers-reduced-motion it is a no-op — the content simply stays visible.
 */
export function RevealSection({
  children,
  className,
  /** Stagger a sibling (e.g. the hero's second column) by a small delay. */
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    // Never hide something already in view (or above it) — only blocks still
    // below the fold get the reveal, so nothing visible ever flashes out.
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    if (rect.top < vh * 0.9) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHidden(false);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    // Hide on the next frame (post-paint, and off the effect body so it is never
    // a synchronous setState-in-effect) — the block is off-screen, so there is no
    // visible flash before it is hidden and then revealed on scroll-in.
    const raf = window.requestAnimationFrame(() => setHidden(true));
    // Safety: never leave a block hidden if the observer somehow never fires.
    const safety = window.setTimeout(() => {
      setHidden(false);
      io.disconnect();
    }, 1600);

    return () => {
      window.cancelAnimationFrame(raf);
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`dz-reveal${className ? ` ${className}` : ""}`}
      data-hidden={hidden ? "true" : undefined}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
