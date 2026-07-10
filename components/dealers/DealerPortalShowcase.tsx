"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { useUi } from "@/lib/i18n/client";
import { useClientValue } from "@/lib/hooks/use-client";
import {
  TRANSACTION_STATUSES,
  type TransactionStatus,
} from "@/lib/dealers/types";

/**
 * The /for-dealers centerpiece: a stylized-but-honest portrayal of the REAL
 * dealer board (components/dealers/DealerBoard), so the pitch shows the actual
 * product, not an invented UI. It shares the portal's exact pipeline vocabulary
 * — the stages come straight from lib/dealers/types (TRANSACTION_STATUSES), the
 * same source the live board and staff console read — plus its semantic accents:
 * a plate-red rail + "Needs attention" note for a flagged deal, and the emerald
 * "Live status" pulse. (The one deliberate divergence from the live board, called
 * out in the handoff: the marketing "ready" card is solid navy with an emailed
 * cue per the approved design, where the live board paints ready emerald.)
 *
 * THE ONE LIVING DETAIL: the top card (a fictional deal) is "In progress" until
 * the board first scrolls into view; ~0.9s later it advances one step, turns
 * navy, and the emailed cue fades in — once, never looping. The before / after
 * states occupy the SAME box (the cue is space-reserved and only its opacity
 * animates), so the advance adds nothing to CLS. Under prefers-reduced-motion the
 * card renders in its finished (navy) state immediately, with no motion.
 *
 * Demo dealership names are fictional and generic on purpose — never a real local
 * business.
 */

interface DemoDeal {
  dealer: string;
  dealNo: string;
  vehicle: string;
  /** The single animated card (In progress -> Ready for pickup on scroll-in). */
  animated?: boolean;
  /** Pipeline position for the static cards. */
  status?: TransactionStatus;
  /** The problem-title flag (plate-red rail + note), like the live board. */
  flagged?: boolean;
}

const DEMO_DEALS: readonly DemoDeal[] = [
  { dealer: "Riverbend Autoplex", dealNo: "#2309", vehicle: "2021 Jeep Wrangler", animated: true },
  {
    dealer: "Lakeside Auto Group",
    dealNo: "#2312",
    vehicle: "2021 Toyota Camry",
    status: "in_progress",
    flagged: true,
  },
  { dealer: "Metro Used Cars", dealNo: "#2321", vehicle: "2023 Toyota RAV4", status: "submitted" },
  { dealer: "Delta Motor Co", dealNo: "#2304", vehicle: "2020 Subaru Outback", status: "received" },
  { dealer: "Gulf Coast Motors", dealNo: "#2301", vehicle: "2022 Ford F-150", status: "picked_up" },
];

export function DealerPortalShowcase() {
  const t = useUi().dealers;
  const rootRef = useRef<HTMLDivElement>(null);
  const [advanced, setAdvanced] = useState(false);

  // Show the finished (advanced) state up-front — never wait on the flourish —
  // under reduced motion or where we can't observe scroll. SSR default is false
  // so there is no hydration mismatch, and the effect only ever latches
  // `advanced` from async callbacks (never setState-in-effect).
  const immediate = useClientValue(
    () =>
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    false,
  );
  const showAdvanced = advanced || immediate;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    // Reduced motion / no IntersectionObserver: `immediate` already shows the
    // finished state, so there is nothing to animate here.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    let fired = false;
    let advanceTimer = 0;
    const advance = () => {
      if (fired) return;
      fired = true;
      advanceTimer = window.setTimeout(() => setAdvanced(true), 900);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            advance();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    // Safety: advance even if the observer never fires (e.g. tall viewport).
    const safety = window.setTimeout(advance, 1600);

    return () => {
      io.disconnect();
      window.clearTimeout(safety);
      window.clearTimeout(advanceTimer);
    };
  }, []);

  return (
    <div className="dz-portal" ref={rootRef}>
      <div className="dz-window">
        {/* chrome bar — existing brand lockup (mark + wordmark), no red-dot
            separator (that is a design-file variant; we keep the shipped lockup) */}
        <div className="dz-chrome">
          <div className="dz-chrome__brand">
            <BrandMark className="h-[18px] w-auto" />
            <span className="dz-chrome__wordmark">Title</span>
            <span className="dz-chrome__sep" aria-hidden="true" />
            <span className="dz-chrome__label">{t.portal.label}</span>
          </div>
          <div className="dz-chrome__live">
            <span className="dz-livedot" aria-hidden="true" />
            {t.portal.live}
          </div>
        </div>

        {/* deal list */}
        <ul className="dz-list">
          {DEMO_DEALS.map((deal) => {
            const status: TransactionStatus = deal.animated
              ? showAdvanced
                ? "ready_for_pickup"
                : "in_progress"
              : deal.status ?? "submitted";
            const onNavy = Boolean(deal.animated && showAdvanced);
            const ci = TRANSACTION_STATUSES.indexOf(status);
            const statusLabel = t.portal.status[status];

            return (
              <li
                key={deal.dealNo}
                className={[
                  "dz-card",
                  deal.flagged ? "dz-card--flagged" : "",
                  onNavy ? "dz-card--navy" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {deal.flagged ? (
                  <span className="dz-card__rail" aria-hidden="true" />
                ) : null}

                <div className="dz-card__head">
                  <span className="dz-dealer">{deal.dealer}</span>
                  <span className={`dz-pill dz-pill--${status}`}>{statusLabel}</span>
                </div>

                <div className="dz-veh">
                  <span className="dz-dealno">{deal.dealNo}</span>
                  <span className="dz-vehname">{deal.vehicle}</span>
                </div>

                <div
                  className="dz-steps"
                  role="img"
                  aria-label={t.portal.stepAria(
                    statusLabel,
                    ci + 1,
                    TRANSACTION_STATUSES.length,
                  )}
                >
                  {TRANSACTION_STATUSES.map((stage, i) => {
                    const state = i < ci ? "done" : i === ci ? "current" : "future";
                    return (
                      <Fragment key={stage}>
                        <span className={`dz-node dz-node--${state}`}>
                          {state === "done" ? (
                            <span className="dz-node__check" aria-hidden="true">
                              {"✓"}
                            </span>
                          ) : state === "current" ? (
                            <span className="dz-node__dot" aria-hidden="true" />
                          ) : null}
                        </span>
                        {i < TRANSACTION_STATUSES.length - 1 ? (
                          <span
                            className={`dz-conn${i < ci ? " dz-conn--done" : ""}`}
                            aria-hidden="true"
                          />
                        ) : null}
                      </Fragment>
                    );
                  })}
                </div>

                {deal.flagged ? (
                  <div className="dz-flag">
                    <div className="dz-flag__label">
                      <span className="dz-flag__dot" aria-hidden="true" />
                      {t.portal.needsAttention}
                    </div>
                    <div className="dz-flag__text">{t.portal.flagNote}</div>
                  </div>
                ) : null}

                {deal.animated ? (
                  <div className="dz-emailcue" aria-hidden={onNavy ? undefined : true}>
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <g
                        fill="none"
                        stroke="var(--color-haze)"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="5.5" width="18" height="13" rx="2.2" />
                        <path d="M4 7l8 6 8-6" />
                      </g>
                    </svg>
                    <span className="dz-emailcue__text">{t.portal.emailedCue}</span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {/* email payoff callout, below the board */}
      <div className="dz-callout">
        <svg viewBox="0 0 64 64" width="54" height="54" aria-hidden="true" className="overflow-visible">
          <g
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="8" y="17" width="48" height="34" rx="4" fill="var(--color-haze)" />
            <path d="M10 20 L32 38 L54 20" />
          </g>
          <circle cx="53" cy="17" r="8.5" fill="var(--color-plate)" />
          <circle cx="53" cy="17" r="8.5" fill="none" stroke="#fbfaf7" strokeWidth="2.5" />
        </svg>
        <div>
          <div className="dz-callout__title">{t.calloutTitle}</div>
          <div className="dz-callout__body">{t.calloutBody}</div>
        </div>
      </div>
    </div>
  );
}
