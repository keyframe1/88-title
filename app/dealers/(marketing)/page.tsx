import type { Metadata } from "next";
import Link from "next/link";
import { PlateButton } from "@/components/PlateButton";
import { pageMetadata } from "@/lib/seo";
import { getLocale, getUiText } from "@/lib/i18n/server";
import { getLocalizedHours } from "@/lib/i18n/content/site";
import { SITE, DIRECTIONS_URL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  return pageMetadata({
    title: ui.meta.dealers.title,
    description: ui.meta.dealers.description,
    path: "/dealers",
    locale,
  });
}

/**
 * /dealers — the public dealer-program pitch page.
 *
 * A B2B marketing surface: the page Anthony or Hannah texts to a dealership
 * manager. It is deliberately NOT part of the dealer portal (that lives, gated,
 * at /dealers/dashboard and /dealers/login). It wears the full customer site
 * chrome via the sibling (marketing) layout, reads its copy from the localized
 * UI dictionary (EN/ES/VI), and pulls the phone / email / address / hours from
 * the single NAP source in lib/site.ts.
 *
 * Every capability claim maps to something the portal ships today: file online,
 * track status from received to ready, and email alerts once notifications are
 * switched on. No push, batch upload, or invoicing claims — none of those exist.
 */
export default async function DealersPitchPage() {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  const t = ui.dealers;
  const hours = getLocalizedHours(locale);

  const pitchRows = [
    { title: t.pitch.fileTitle, body: t.pitch.fileBody },
    { title: t.pitch.trackTitle, body: t.pitch.trackBody },
    { title: t.pitch.readyTitle, body: t.pitch.readyBody },
    { title: t.pitch.counterTitle, body: t.pitch.counterBody },
  ];

  const steps = [
    { title: t.step1Title, body: t.step1Body },
    { title: t.step2Title, body: t.step2Body },
    { title: t.step3Title, body: t.step3Body },
  ];

  return (
    <>
      {/* Hero — calm, confident, no animated band (that is the homepage's job).
          The oversized 88 watermark ties it to the same premium product; it is
          aria-hidden and absolutely positioned, so it never shifts layout. */}
      <section className="relative overflow-hidden bg-haze">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 top-1/2 z-0 hidden -translate-y-1/2 select-none sm:block"
          style={{
            fontFamily: "var(--font-archivo), ui-sans-serif, sans-serif",
            fontWeight: 900,
            fontSize: "clamp(320px, 34vw, 560px)",
            lineHeight: 0.78,
            letterSpacing: "-0.04em",
            color: "#EEEAE2",
            WebkitTextStroke: "2px rgba(20,33,61,0.08)",
            paintOrder: "stroke fill",
          }}
        >
          88
        </span>

        <div className="relative z-[1] mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">{t.eyebrow}</p>
            <h1
              className="mt-3 font-display font-extrabold text-ink"
              style={{
                fontSize: "clamp(34px, 5.6vw, 68px)",
                lineHeight: 1.03,
                letterSpacing: "-0.03em",
                maxWidth: "16ch",
              }}
            >
              {t.headline}
            </h1>
            <p className="lead mt-5 max-w-[48ch]">{t.subhead}</p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <PlateButton href="#get-set-up" size="lg" variant="red">
                {t.getSetUp}
              </PlateButton>
              <Link
                href="/dealers/login"
                className="text-sm font-semibold text-fog underline-offset-2 transition-colors duration-150 hover:text-plate hover:underline focus-visible:text-plate focus-visible:underline"
              >
                {t.login}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The pitch — editorial, hairline-ruled rows, the benefit as the feature.
          Non-interactive by design (no hover lift), so nothing reads as a link. */}
      <section
        aria-labelledby="dealer-pitch-heading"
        className="mx-auto max-w-5xl px-4 py-[var(--space-section)] sm:px-6"
      >
        <h2 id="dealer-pitch-heading" className="h-section">
          {t.pitchHeading}
        </h2>

        <ul className="mt-8 border-b border-line">
          {pitchRows.map((row) => (
            <li
              key={row.title}
              className="grid gap-2 border-t border-line py-7 sm:grid-cols-[minmax(0,18rem)_1fr] sm:gap-10 sm:py-9"
            >
              <h3 className="font-display text-2xl font-extrabold leading-[1.1] text-ink sm:text-3xl">
                {row.title}
              </h3>
              <p className="max-w-[52ch] leading-relaxed text-fog sm:text-lg">
                {row.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works — the same numbered treatment as the service pages. */}
      <section
        aria-labelledby="dealer-how-heading"
        className="bg-mist"
      >
        <div className="mx-auto max-w-5xl px-4 py-[var(--space-section)] sm:px-6">
          <h2 id="dealer-how-heading" className="h-section">
            {t.howHeading}
          </h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4 sm:flex-col sm:gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink font-display text-lg font-extrabold text-white"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-extrabold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1 leading-relaxed text-fog">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Contact / close — the B2B call. Phone is the primary close (email is
          still dormant), so the tel: link is the loudest element here. */}
      <section
        id="get-set-up"
        aria-labelledby="dealer-contact-heading"
        className="mx-auto max-w-5xl scroll-mt-24 px-4 py-[var(--space-section)] sm:px-6"
      >
        <div className="rounded-2xl border border-line bg-paper p-6 sm:p-10">
          <p className="eyebrow">{t.contactEyebrow}</p>
          <h2 id="dealer-contact-heading" className="mt-3 h-section">
            {t.contactHeading}
          </h2>
          <p className="lead mt-4 max-w-[52ch]">{t.contactBody}</p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Call — the primary close. */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fog">
                {t.callLabel}
              </p>
              <a
                href={`tel:${SITE.phone.href}`}
                className="mt-1 block font-display text-2xl font-extrabold tabular-nums text-ink underline-offset-2 transition-colors hover:text-plate hover:underline focus-visible:text-plate focus-visible:underline"
              >
                {SITE.phone.display}
              </a>
            </div>

            {/* Email */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fog">
                {t.emailLabel}
              </p>
              <a
                href={`mailto:${SITE.email}`}
                className="mt-1 block break-words font-semibold text-ink underline-offset-2 transition-colors hover:text-plate hover:underline focus-visible:text-plate focus-visible:underline"
              >
                {SITE.email}
              </a>
            </div>

            {/* Visit */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fog">
                {t.visitLabel}
              </p>
              <address className="mt-1 not-italic leading-relaxed text-ink">
                <a
                  href={DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline-offset-2 transition-colors hover:text-plate hover:underline focus-visible:text-plate focus-visible:underline"
                >
                  {SITE.address.street}
                  <br />
                  {SITE.address.city}, {SITE.address.region}{" "}
                  <span className="tabular-nums">{SITE.address.postalCode}</span>
                </a>
              </address>
            </div>

            {/* Hours */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fog">
                {t.hoursHeading}
              </p>
              <ul className="mt-1 space-y-1 text-sm text-ink">
                {hours.map((row) => (
                  <li key={row.label} className="flex justify-between gap-4">
                    <span>{row.label}</span>
                    <span className="tabular-nums text-fog">{row.value}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm font-semibold text-plate">
                {t.saturdayNote}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
