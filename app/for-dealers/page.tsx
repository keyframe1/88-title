import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { RevealSection } from "@/components/dealers/RevealSection";
import { DealerPortalShowcase } from "@/components/dealers/DealerPortalShowcase";
import { pageMetadata } from "@/lib/seo";
import { getLocale, getUiText } from "@/lib/i18n/server";
import { SITE, DIRECTIONS_URL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  return pageMetadata({
    title: ui.meta.dealers.title,
    description: ui.meta.dealers.description,
    path: "/for-dealers",
    locale,
  });
}

/* The two diagonal hairline washes the design lays over the navy and paper
   bands. Kept as constants so every band shares the exact grain. */
const NAVY_GRAIN =
  "repeating-linear-gradient(135deg, rgba(255,255,255,0.022) 0, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 13px)";
const PAPER_GRAIN =
  "repeating-linear-gradient(135deg, rgba(20,33,61,0.018) 0, rgba(20,33,61,0.018) 1px, transparent 1px, transparent 12px)";

/* The on-navy eyebrow / numeral accent: a lightened plate red that stays legible
   on ink (the pure plate red goes muddy on navy). Page-local, not a brand token. */
const ROSE = "#E7607A";

/* ---------------------------------------------------------------------------
   Engraved glyphs, ported verbatim from the design exports. Decorative, so each
   is aria-hidden; brand hexes are swapped for the CSS tokens (ink / plate / haze).
   ------------------------------------------------------------------------- */
const svgProps = {
  "aria-hidden": true,
  focusable: false,
  className: "block overflow-visible",
} as const;

const STEP_ICONS: readonly ReactNode[] = [
  // 01 — drop off / send it
  <svg key="s1" viewBox="0 0 48 48" width="34" height="34" {...svgProps}>
    <g
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="10" y="15" width="20" height="27" rx="2.5" fill="var(--color-haze)" />
      <line x1="15" y1="23" x2="25" y2="23" />
      <line x1="15" y1="28" x2="25" y2="28" />
      <line x1="15" y1="33" x2="21" y2="33" />
    </g>
    <g
      fill="none"
      stroke="var(--color-plate)"
      strokeWidth="2.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="35" y1="6" x2="35" y2="17" />
      <path d="M31 12.5 l4 4.5 4 -4.5" />
    </g>
  </svg>,
  // 02 — we process same-day
  <svg key="s2" viewBox="0 0 48 48" width="34" height="34" {...svgProps}>
    <g
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="14" width="21" height="27" rx="2.5" fill="var(--color-haze)" />
      <line x1="14" y1="21" x2="25" y2="21" />
      <line x1="14" y1="26" x2="25" y2="26" />
    </g>
    <circle cx="31" cy="33" r="9" fill="var(--color-plate)" />
    <circle cx="31" cy="33" r="9" fill="none" stroke="var(--color-haze)" strokeWidth="2" />
    <path
      d="M27 33 l3 3 5 -6"
      fill="none"
      stroke="var(--color-haze)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>,
  // 03 — you're emailed
  <svg key="s3" viewBox="0 0 48 48" width="34" height="34" {...svgProps}>
    <g
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="7" y="13" width="34" height="24" rx="3" fill="var(--color-haze)" />
      <path d="M8 15 L24 27 L40 15" />
    </g>
    <circle cx="39" cy="12" r="6.5" fill="var(--color-plate)" />
    <circle cx="39" cy="12" r="6.5" fill="none" stroke="var(--color-haze)" strokeWidth="2" />
  </svg>,
  // 04 — pick up
  <svg key="s4" viewBox="0 0 48 48" width="34" height="34" {...svgProps}>
    <g
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="17" cy="18" r="8.5" fill="var(--color-haze)" />
      <line x1="22.5" y1="23.5" x2="39" y2="40" />
      <line x1="33" y1="34" x2="38" y2="29" />
      <line x1="37" y1="38" x2="42" y2="33" />
    </g>
    <circle cx="17" cy="18" r="2.6" fill="var(--color-plate)" />
  </svg>,
];

const WHY_ICONS: readonly ReactNode[] = [
  // notary seal + ribbon
  <svg key="w1" viewBox="0 0 48 48" width="40" height="40" {...svgProps}>
    <g fill="none" stroke="var(--color-plate)" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="20" r="13" strokeWidth="2.2" />
      <circle cx="24" cy="20" r="9" strokeWidth="2.6" strokeDasharray="1.5 4.5" />
    </g>
    <g
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 30 L15 44 L24 39 L33 44 L30 30" />
    </g>
    <circle cx="24" cy="20" r="3" fill="var(--color-plate)" />
  </svg>,
  // itemized document + red total rule
  <svg key="w2" viewBox="0 0 48 48" width="40" height="40" {...svgProps}>
    <g
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 6 h24 v36 l-4 -3 -4 3 -4 -3 -4 3 -4 -3 -4 3 z" fill="var(--color-haze)" />
      <line x1="17" y1="15" x2="31" y2="15" />
      <line x1="17" y1="22" x2="31" y2="22" />
    </g>
    <line
      x1="17"
      y1="29"
      x2="31"
      y2="29"
      stroke="var(--color-plate)"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>,
  // precision target
  <svg key="w3" viewBox="0 0 48 48" width="40" height="40" {...svgProps}>
    <g
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="24" cy="24" r="15" />
      <line x1="24" y1="4" x2="24" y2="12" />
      <line x1="24" y1="36" x2="24" y2="44" />
      <line x1="4" y1="24" x2="12" y2="24" />
      <line x1="36" y1="24" x2="44" y2="24" />
    </g>
    <circle cx="24" cy="24" r="6" fill="none" stroke="var(--color-plate)" strokeWidth="2.4" />
    <circle cx="24" cy="24" r="1.8" fill="var(--color-plate)" />
  </svg>,
  // location pin
  <svg key="w4" viewBox="0 0 48 48" width="40" height="40" {...svgProps}>
    <g
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M24 43 C 13 30, 9 23, 9 17 a15 15 0 0 1 30 0 c 0 6 -4 13 -15 26 z"
        fill="var(--color-haze)"
      />
    </g>
    <circle cx="24" cy="17" r="5.5" fill="none" stroke="var(--color-plate)" strokeWidth="2.6" />
    <circle cx="24" cy="17" r="1.6" fill="var(--color-plate)" />
  </svg>,
];

/**
 * /for-dealers — the public dealer-program pitch, ported from the approved Claude
 * Design exports. A B2B marketing surface (the page Anthony or Hannah texts a
 * dealership manager), deliberately NOT part of the gated dealer portal (that
 * lives at /dealers/login and /dealers/dashboard). It renders under the standard
 * SiteHeader and above the standard SiteFooter (its sibling layout), reads copy
 * from the EN/ES/VI dictionary, and pulls every NAP fact from lib/site.ts.
 *
 * Every claim maps to shipped capability: same-day counter processing, email
 * notification, deep-link-to-the-deal, and a notary on staff. No testimonials, no
 * volume or pricing numbers, no invented SLAs; the demo dealerships are fictional.
 *
 * The two CTAs ("Set up a dealer account") are tel: links to the office line, with
 * the number itself and an email fallback presented right beneath — a phone call
 * is how a dealer account actually gets provisioned today. The old bare /dealers
 * URL 301-redirects here (see lib/supabase/proxy.ts).
 */
export default async function ForDealersPitchPage() {
  const ui = await getUiText();
  const t = ui.dealers;

  const steps = [
    { n: "01", title: t.steps.s1Title, body: t.steps.s1Body },
    { n: "02", title: t.steps.s2Title, body: t.steps.s2Body },
    { n: "03", title: t.steps.s3Title, body: t.steps.s3Body },
    { n: "04", title: t.steps.s4Title, body: t.steps.s4Body },
  ];

  const whys = [
    { title: t.why.notaryTitle, body: t.why.notaryBody },
    { title: t.why.feesTitle, body: t.why.feesBody },
    { title: t.why.precisionTitle, body: t.why.precisionBody },
    { title: t.why.saturdayTitle, body: t.why.saturdayBody },
  ];

  const ctaAria = t.ctaSetupAria(SITE.phone.display);

  return (
    <>
      {/* ===================== 01 · HERO (navy door) ===================== */}
      <section
        aria-labelledby="dz-hero-heading"
        className="relative overflow-hidden bg-ink"
        style={{ backgroundImage: NAVY_GRAIN }}
      >
        <BrandMark
          className="pointer-events-none absolute -right-4 top-[-6%] z-0 hidden h-auto select-none sm:block"
          style={{ width: "clamp(320px, 34vw, 532px)", color: "rgba(255,255,255,0.055)" }}
        />

        <div className="relative z-[1] mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:py-24">
          {/* left — the pitch */}
          <RevealSection>
            <p className="eyebrow" style={{ color: ROSE }}>
              {t.eyebrow}
            </p>
            <h1
              id="dz-hero-heading"
              className="mt-5 font-display font-bold"
              style={{
                fontSize: "clamp(33px, 5.4vw, 52px)",
                lineHeight: 1.06,
                letterSpacing: "-0.025em",
                color: "#FAFAF8",
                maxWidth: "15ch",
              }}
            >
              {t.headline1}
              <span className="block" style={{ color: "rgba(255,255,255,0.52)" }}>
                {t.headline2}
              </span>
            </h1>
            <p
              className="mt-5 max-w-[46ch]"
              style={{
                fontSize: "clamp(15.5px, 1.9vw, 18px)",
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.74)",
              }}
            >
              {t.subhead}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <a
                href={`tel:${SITE.phone.href}`}
                className="btn btn--primary btn--lg btn--glow"
                aria-label={ctaAria}
              >
                {t.ctaSetup}
              </a>
              <Link
                href="/dealers/login"
                className="text-sm font-semibold text-white/70 underline underline-offset-4 transition-colors hover:text-white focus-visible:text-white"
                style={{ textDecorationColor: "rgba(255,255,255,0.3)" }}
              >
                {t.login}
              </Link>
            </div>

            {/* the tel: CTA dials this line; the number + email are shown so a
                desktop visitor without a dialer can still act (both from site.ts) */}
            <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
              <a
                href={`tel:${SITE.phone.href}`}
                className="font-semibold tabular-nums text-white/80 underline-offset-2 transition-colors hover:text-white hover:underline"
              >
                {SITE.phone.display}
              </a>{" "}
              {t.or}{" "}
              <a
                href={`mailto:${SITE.email}`}
                className="font-semibold text-white/80 underline-offset-2 transition-colors hover:text-white hover:underline"
              >
                {t.emailUs}
              </a>
            </p>
          </RevealSection>

          {/* right — the payoff, teased as the email you receive */}
          <RevealSection delayMs={80} className="flex lg:justify-end">
            <div
              className="w-full max-w-[400px] rounded-2xl border border-[#ECE7DD] bg-white p-5 lg:-rotate-[1.2deg]"
              style={{ boxShadow: "0 30px 60px rgba(0,0,0,0.28)" }}
            >
              <div className="flex items-center justify-between border-b border-[#EEE9DF] pb-3.5">
                <span className="flex items-center gap-2">
                  <BrandMark className="h-[15px] w-auto text-ink" />
                  <span className="font-display text-[13px] font-semibold text-ink">Title</span>
                </span>
                <span className="text-[11.5px] text-[#a3a399]">{t.tease.justNow}</span>
              </div>
              <div className="mt-3.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8f9099]">
                {t.tease.newEmail}
              </div>
              <div className="mt-1.5 font-display text-[19px] font-bold leading-[1.2] tracking-[-0.01em] text-ink">
                {t.tease.subject}
              </div>
              <div className="mt-2.5 flex items-baseline gap-2.5">
                <span className="font-mono text-[12.5px] font-semibold text-plate">#2301</span>
                <span className="text-[14.5px] font-semibold text-ink">
                  Gulf Coast Motors · 2022 Ford F-150
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#EEE9DF] pt-3.5">
                <span className="inline-flex h-[26px] items-center rounded-md bg-ink px-2.5 text-xs font-semibold text-haze">
                  {t.portal.status.ready_for_pickup}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-plate">
                  {t.tease.open}
                  <span aria-hidden="true">&rarr;</span>
                </span>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ================= 02 · PORTAL = THE PITCH (paper) ================= */}
      <section
        aria-labelledby="dz-portal-heading"
        style={{ background: "#FAFAF8", backgroundImage: PAPER_GRAIN }}
      >
        <div className="mx-auto max-w-[860px] px-4 py-[var(--space-section)] sm:px-6">
          <RevealSection className="text-center">
            <p className="eyebrow">{t.portalEyebrow}</p>
            <h2
              id="dz-portal-heading"
              className="mx-auto mt-3 font-display font-bold text-ink"
              style={{
                fontSize: "clamp(27px, 4vw, 38px)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                maxWidth: "20ch",
              }}
            >
              {t.portalHeading}
            </h2>
            <p className="lead mx-auto mt-4 max-w-[56ch]">{t.portalSub}</p>
          </RevealSection>

          <RevealSection className="mx-auto mt-10 max-w-[820px]">
            <DealerPortalShowcase />
          </RevealSection>
        </div>
      </section>

      {/* ===================== 03 · HOW IT WORKS (navy) ==================== */}
      <section
        aria-labelledby="dz-how-heading"
        className="bg-ink"
        style={{ backgroundImage: NAVY_GRAIN }}
      >
        <div className="mx-auto max-w-6xl px-4 py-[var(--space-section)] sm:px-6">
          <RevealSection>
            <div className="mb-10 sm:mb-12 sm:text-center">
              <p className="eyebrow" style={{ color: ROSE }}>
                {t.howEyebrow}
              </p>
              <h2
                id="dz-how-heading"
                className="mt-3 font-display font-bold"
                style={{
                  fontSize: "clamp(26px, 3.6vw, 34px)",
                  lineHeight: 1.12,
                  letterSpacing: "-0.02em",
                  color: "#FAFAF8",
                }}
              >
                {t.howHeading}
              </h2>
            </div>

            <ol className="grid gap-8 sm:grid-cols-2 sm:gap-7 lg:grid-cols-4">
              {steps.map((step, i) => (
                <li key={step.n} className="flex gap-4 sm:flex-col sm:gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-haze">
                    {STEP_ICONS[i]}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span
                        className="font-display text-[13px] font-bold"
                        style={{ color: ROSE }}
                      >
                        {step.n}
                      </span>
                      <h3
                        className="font-display text-lg font-semibold"
                        style={{ color: "#FAFAF8" }}
                      >
                        {step.title}
                      </h3>
                    </div>
                    <p
                      className="mt-1.5 text-sm leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </RevealSection>
        </div>
      </section>

      {/* ===================== 04 · WHY 88 TITLE (paper) ================== */}
      <section aria-labelledby="dz-why-heading" className="bg-haze">
        <div className="mx-auto max-w-5xl px-4 py-[var(--space-section)] sm:px-6">
          <RevealSection>
            <div className="mb-8 sm:mb-10">
              <p className="eyebrow">{t.whyEyebrow}</p>
              <h2
                id="dz-why-heading"
                className="mt-3 font-display font-bold text-ink"
                style={{
                  fontSize: "clamp(26px, 3.6vw, 34px)",
                  lineHeight: 1.12,
                  letterSpacing: "-0.02em",
                  maxWidth: "22ch",
                }}
              >
                {t.whyHeading}
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {whys.map((why, i) => (
                <div
                  key={why.title}
                  className="flex items-start gap-4 rounded-[13px] border border-[#ECE7DD] bg-white p-5"
                  style={{ boxShadow: "0 1px 2px rgba(20,33,61,0.03)" }}
                >
                  <span className="shrink-0">{WHY_ICONS[i]}</span>
                  <div>
                    <h3 className="font-display text-[17px] font-semibold text-ink">
                      {why.title}
                    </h3>
                    <p
                      className="mt-1 text-sm leading-relaxed"
                      style={{ color: "#5b6472" }}
                    >
                      {why.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ===================== 05 · CLOSING (navy bookend) ================ */}
      <section
        aria-labelledby="dz-closing-heading"
        className="relative overflow-hidden bg-ink"
        style={{ backgroundImage: NAVY_GRAIN }}
      >
        <div className="h-[3px]" style={{ background: "var(--color-plate)" }} />
        <div className="mx-auto max-w-3xl px-4 py-[var(--space-section)] text-center sm:px-6">
          <RevealSection>
            <h2
              id="dz-closing-heading"
              className="mx-auto font-display font-bold"
              style={{
                fontSize: "clamp(31px, 4.4vw, 42px)",
                lineHeight: 1.08,
                letterSpacing: "-0.025em",
                color: "#FAFAF8",
                maxWidth: "18ch",
              }}
            >
              {t.closingHeading}
            </h2>
            <p
              className="mx-auto mt-4 max-w-[44ch]"
              style={{ fontSize: "clamp(15px, 1.7vw, 17px)", lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}
            >
              {t.closingBody}
            </p>

            <div className="mt-8">
              <a
                href={`tel:${SITE.phone.href}`}
                className="btn btn--primary btn--lg btn--glow"
                aria-label={ctaAria}
              >
                {t.ctaSetup}
              </a>
            </div>

            {/* CTA + phone + address, all from lib/site.ts (hours live in the
                standard footer just below) */}
            <div
              className="mt-11 flex flex-col items-center justify-center gap-3.5 border-t pt-8 sm:flex-row sm:flex-wrap sm:gap-x-8"
              style={{ borderColor: "rgba(255,255,255,0.14)" }}
            >
              <a
                href={`tel:${SITE.phone.href}`}
                className="text-[15px] font-semibold tabular-nums transition-colors hover:text-white"
                style={{ color: "rgba(255,255,255,0.82)" }}
              >
                {SITE.phone.display}
              </a>
              <span
                aria-hidden="true"
                className="hidden h-4 w-px sm:block"
                style={{ background: "rgba(255,255,255,0.2)" }}
              />
              <a
                href={DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] font-medium transition-colors hover:text-white"
                style={{ color: "rgba(255,255,255,0.82)" }}
              >
                {SITE.address.full}
              </a>
            </div>
          </RevealSection>
        </div>
      </section>
    </>
  );
}
