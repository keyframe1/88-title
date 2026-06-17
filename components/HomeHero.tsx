"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { PlateButton } from "@/components/PlateButton";
import { PlateGraphic } from "@/components/PlateGraphic";

/**
 * useLayoutEffect runs synchronously after DOM mutation but *before* the browser
 * paints, which is what we need: GSAP's `.from()` calls set the hidden starting
 * state before the first frame, so there is no flash of the final layout. It
 * also keeps React Strict Mode's dev double-invoke from replaying the timeline
 * (both passes resolve before paint). Fall back to useEffect during SSR so React
 * doesn't warn about useLayoutEffect on the server.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function HomeHero() {
  const rootRef = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();

    // The entire animation lives inside the no-preference branch. When a visitor
    // requests reduced motion this callback never runs, so nothing is ever
    // hidden and the hero is painted in its final, composed state with zero
    // motion — no fade, no rise, no stamp, no pulse.
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(root);

      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          // Hand the DOM back clean. The CTA's press-down hover uses `transform`,
          // so any leftover inline transform from the entrance/pulse would shadow
          // it — clearing returns every element to its natural stylesheet state.
          gsap.set(q("[data-animate]"), {
            clearProps: "transform,opacity,visibility",
          });
        },
      });

      tl
        // 1 — eyebrow + headline resolve in, the two headline lines staggered.
        .from(
          q('[data-animate="eyebrow"]'),
          { autoAlpha: 0, y: 10, duration: 0.5 },
          0,
        )
        .from(
          q('[data-animate="line"]'),
          { autoAlpha: 0, y: 22, duration: 0.6, stagger: 0.12 },
          0.12,
        )
        .from(
          q('[data-animate="subcopy"]'),
          { autoAlpha: 0, y: 14, duration: 0.6 },
          0.42,
        )
        // 2 — the signature moment: the plate stamps in. It starts a touch
        // oversized and `back.out` overshoots *past* its resting size (settling
        // up from slightly under 1.0), reading as a deliberate press-in that
        // lands crisply — never a cartoon bounce.
        .from(
          q('[data-animate="plate"]'),
          {
            autoAlpha: 0,
            scale: 1.06,
            duration: 0.75,
            ease: "back.out(1.5)",
            transformOrigin: "50% 50%",
          },
          0.45,
        )
        // 3 — the primary CTA is the last thing to arrive, the endpoint of the
        // eye's path…
        .from(
          q('[data-animate="cta"]'),
          { autoAlpha: 0, y: 16, duration: 0.55 },
          1.05,
        )
        .from(
          q('[data-animate="secondary"]'),
          { autoAlpha: 0, y: 10, duration: 0.5 },
          1.2,
        )
        // …then a single, gentle settle so the eye lands on it as THE action.
        // Scaling the wrapper (not the button) leaves the button's own
        // press-down hover transform untouched.
        .to(
          q('[data-animate="cta"]'),
          {
            scale: 1.03,
            duration: 0.55,
            ease: "sine.inOut",
            yoyo: true,
            repeat: 1,
          },
          1.7,
        );
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="mx-auto max-w-6xl px-4 pt-12 pb-10 sm:px-6 sm:pt-16"
    >
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p
            data-animate="eyebrow"
            className="text-sm font-semibold uppercase tracking-[0.18em] text-plate"
          >
            Metairie’s public tag agency
          </p>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl">
            <span data-animate="line" className="block">
              Skip the OMV line.
            </span>
            <span data-animate="line" className="block">
              Keep your afternoon.
            </span>
          </h1>
          <p
            data-animate="subcopy"
            className="mt-5 max-w-xl text-lg leading-relaxed text-fog"
          >
            Title transfers, plates, registration, and notary — handled at the
            counter in minutes. Check in online, bring the right documents, and
            we’ll have you out the door.
          </p>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {/* Wrapper carries the entrance/pulse so the button keeps its own
                CSS press-down hover/active transform. */}
            <div data-animate="cta">
              <PlateButton href="/check-in" size="lg">
                Check in online
              </PlateButton>
            </div>
            <div data-animate="secondary">
              <Link
                href="/checklist"
                className="group inline-flex items-center gap-1.5 font-semibold text-ink underline-offset-4 transition-colors hover:text-plate hover:underline"
              >
                Not sure what to bring? Build your checklist
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md lg:max-w-none">
          {/* Fixed 2:1 viewBox on the SVG means scaling it in causes no layout
              shift. The wrapper is the GSAP scale target. */}
          <div data-animate="plate">
            <PlateGraphic className="w-full [filter:drop-shadow(0_18px_30px_rgba(20,33,61,0.16))]" />
          </div>
        </div>
      </div>
    </section>
  );
}
