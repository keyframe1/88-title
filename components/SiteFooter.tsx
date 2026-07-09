import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { SITE, DIRECTIONS_URL } from "@/lib/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { localBusinessSchema } from "@/lib/seo";
import { getLocale, getUiText } from "@/lib/i18n/server";
import { getLocalizedHours, getLocalizedTagline } from "@/lib/i18n/content/site";
import { getOmvDisclosure } from "@/lib/i18n/content/fees";

/**
 * Site footer — a navy brand band that bookends the paper body: identity +
 * location, the two nav columns, then the statutory disclosure strip and the
 * copyright base row. Address / phone / hours all read from lib/site (the NAP
 * single source), never hardcoded. The language switch lives only in the sticky
 * header; the footer never duplicates it.
 */
export async function SiteFooter() {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  const year = new Date().getFullYear();
  const hours = getLocalizedHours(locale);

  const navLinks = [
    { href: "/services", label: ui.footer.nav.services },
    { href: "/pricing", label: ui.footer.nav.pricing },
    { href: "/forms", label: ui.footer.nav.forms },
    { href: "/check-in", label: ui.footer.nav.checkIn },
  ];

  const dealerLinks = [
    { href: "/for-dealers", label: ui.footer.forDealers },
    { href: "/dealers/login", label: ui.footer.dealerLogin },
  ];

  // Shared treatment for the stacked column links (≥44px tap target on mobile).
  const columnLink =
    "inline-flex min-h-[44px] items-center text-sm font-medium text-white/75 transition-colors duration-150 hover:text-white focus-visible:text-white";

  return (
    <footer className="mt-20 bg-ink text-white">
      {/* Site-wide LocalBusiness structured data, built from the NAP in lib/site.
          Structured data stays in English: it is the canonical machine-readable
          record for search engines. */}
      <JsonLd data={localBusinessSchema()} />

      {/* Main band — three columns on desktop; on mobile they stack with the
          identity + location block first. */}
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {/* Column 1 — Identity + location. */}
          <div>
            {/* Brand lockup (reads "88 Title": the mark is named "88", the
                wordmark is visible text — same pattern as the header). */}
            <div className="flex items-center gap-2">
              <BrandMark label="88" className="h-5 w-auto text-white" />
              <span className="font-display text-lg font-extrabold tracking-tight text-white">
                Title
              </span>
            </div>
            <p className="mt-2 text-sm text-white/70">
              {getLocalizedTagline(locale)}
            </p>

            <address className="mt-6 text-sm not-italic leading-relaxed text-white/80">
              {SITE.address.street}
              <br />
              {SITE.address.city}, {SITE.address.region}{" "}
              <span className="tabular-nums">{SITE.address.postalCode}</span>
              <div className="mt-2">
                <a
                  href={`tel:${SITE.phone.href}`}
                  className="tabular-nums underline-offset-2 transition-colors duration-150 hover:text-white hover:underline focus-visible:text-white focus-visible:underline"
                >
                  {SITE.phone.display}
                </a>
              </div>
            </address>

            {/* The single plate-red accent in the footer — opens the visitor's
                own maps app with directions to the office. */}
            <a
              href={DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-plate underline-offset-4 transition-colors duration-150 hover:underline focus-visible:underline"
            >
              {ui.footer.getDirections}
            </a>

            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                {ui.footer.hoursHeading}
              </div>
              <ul className="mt-3 space-y-1 text-sm text-white/80">
                {hours.map((row) => (
                  <li key={row.label} className="flex justify-between gap-6">
                    <span>{row.label}</span>
                    <span className="tabular-nums text-white/55">{row.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Column 2 — Navigate. */}
          <nav aria-label={ui.footer.navAria}>
            <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
              {ui.footer.navigateHeading}
            </div>
            <ul className="mt-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={columnLink}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Column 3 — Dealers (a quiet way in; never competes with Check in). */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
              {ui.footer.dealersHeading}
            </div>
            <ul className="mt-2">
              {dealerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={columnLink}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Disclosure strip — full-width darker navy band with the statutory
          public-tag-fee + OMV disclosure and the "not the OMV" line. */}
      <div className="bg-ink-900">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-white/60 sm:px-6">
          <p>
            <span className="font-semibold text-white/85">
              {ui.footer.disclosureLabel}
            </span>{" "}
            {getOmvDisclosure(locale)}
          </p>
          <p className="mt-2">{ui.footer.notOmv}</p>
        </div>
      </div>

      {/* Base row — copyright, quiet. */}
      <div className="border-t border-white/10 bg-ink-900">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/50 sm:px-6">
          {ui.footer.rights(year, SITE.name)}
        </div>
      </div>
    </footer>
  );
}
