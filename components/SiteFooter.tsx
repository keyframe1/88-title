import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { SITE, DIRECTIONS_URL } from "@/lib/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { localBusinessSchema } from "@/lib/seo";
import { getLocale, getUiText } from "@/lib/i18n/server";
import { getLocalizedHours, getLocalizedTagline } from "@/lib/i18n/content/site";
import { getOmvDisclosure } from "@/lib/i18n/content/fees";

/**
 * Site footer — the navy brand band that bookends the paper body.
 *
 * Composition: a plate-red pinstripe caps the top edge (the signature trim and
 * a crisp transition out of the paper body), then four balanced columns —
 * Brand, Hours, Navigate, Dealers — spread across the width so the old
 * top-right void is gone. A large, decorative 88 monogram sits navy-on-navy
 * behind the columns, bleeding off the right edge as embossed brand texture
 * (aria-hidden, non-interactive; distinct from the hero's functional 88).
 * The base area is one restrained strip: the statutory disclosure kept fully
 * legible, then a minimal copyright line.
 *
 * Address / phone / hours all read from lib/site (the NAP single source), never
 * hardcoded. The language switch lives only in the sticky header; the footer
 * never duplicates it.
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

  // One consistent small-caps style for every section label (Hours / Navigate /
  // Dealers): Overpass, muted white. Deliberately not red — the pinstripe and
  // the "Get directions" link are the footer's only plate-red accents.
  const sectionLabel =
    "font-display text-xs font-bold uppercase tracking-[0.18em] text-white/55";

  // Stacked column links — ≥44px tap target on every device.
  const columnLink =
    "inline-flex min-h-[44px] items-center text-sm font-medium text-white/75 transition-colors duration-150 hover:text-white focus-visible:text-white";

  return (
    // The plate-red pinstripe is the footer's top border: 3px, full-width, on
    // every breakpoint — the crisp seam from the paper body into the navy.
    <footer className="mt-20 border-t-[3px] border-plate bg-ink text-white">
      {/* Site-wide LocalBusiness structured data, built from the NAP in lib/site.
          Structured data stays in English: it is the canonical machine-readable
          record for search engines. */}
      <JsonLd data={localBusinessSchema()} />

      {/* Main band — four columns on desktop; on mobile / tablet they stack to a
          single column (brand → hours → navigate → dealers). `overflow-hidden`
          clips the 88 watermark that bleeds off the right edge below. */}
      <div className="relative overflow-hidden">
        {/* The 88 watermark: a large monogram as navy-on-navy background texture,
            bleeding off the right edge behind the columns. Purely decorative
            (aria-hidden, non-interactive, unselectable) and hidden until the
            four-column layout so it never crowds the stacked mobile text. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 -right-14 z-0 hidden -translate-y-1/2 select-none lg:block"
        >
          <BrandMark className="h-72 w-auto text-ink-700 xl:h-80" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-4 lg:gap-8">
            {/* Column 1 — Brand (anchors the row). Reads "88 Title": the mark is
                named "88", the wordmark is visible text (same pattern as the
                header). */}
            <div>
              <div className="flex items-center gap-2">
                <BrandMark label="88" className="h-5 w-auto text-white" />
                <span className="font-display text-lg font-extrabold tracking-tight text-white">
                  Title
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {getLocalizedTagline(locale)}
              </p>

              <address className="mt-5 text-sm not-italic leading-relaxed text-white/80">
                {SITE.address.street}
                <br />
                {SITE.address.city}, {SITE.address.region}{" "}
                <span className="tabular-nums">{SITE.address.postalCode}</span>
                <span className="mt-1 block">
                  <a
                    href={`tel:${SITE.phone.href}`}
                    className="inline-flex min-h-[44px] items-center tabular-nums underline-offset-2 transition-colors duration-150 hover:text-white hover:underline focus-visible:text-white focus-visible:underline"
                  >
                    {SITE.phone.display}
                  </a>
                </span>
              </address>

              {/* One of the footer's two plate-red accents — opens the visitor's
                  own maps app with directions to the office. */}
              <a
                href={DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center text-sm font-semibold text-plate underline-offset-4 transition-colors duration-150 hover:underline focus-visible:underline"
              >
                {ui.footer.getDirections}
              </a>
            </div>

            {/* Column 2 — Hours (its own column evens the heights). */}
            <div>
              <div className={sectionLabel}>{ui.footer.hoursHeading}</div>
              <ul className="mt-4 space-y-3">
                {hours.map((row) => (
                  <li key={row.label} className="text-sm leading-snug">
                    <div className="text-white/85">{row.label}</div>
                    <div className="tabular-nums text-white/55">{row.value}</div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3 — Navigate. */}
            <nav aria-label={ui.footer.navAria}>
              <div className={sectionLabel}>{ui.footer.navigateHeading}</div>
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

            {/* Column 4 — Dealers (a quiet way in; never competes with Check in). */}
            <div>
              <div className={sectionLabel}>{ui.footer.dealersHeading}</div>
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
      </div>

      {/* Base area — one restrained strip, separated from the columns by a single
          hairline (no heavy stacked dark bands). The statutory public-tag-fee +
          OMV disclosure and the "not the OMV" line stay fully legible; the
          copyright is a quiet final line. */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="max-w-3xl text-xs leading-relaxed text-white/70">
            <span className="font-semibold text-white/90">
              {ui.footer.disclosureLabel}
            </span>{" "}
            {getOmvDisclosure(locale)}
          </p>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/70">
            {ui.footer.notOmv}
          </p>
          <p className="mt-5 text-xs text-white/45">
            {ui.footer.rights(year, SITE.name)}
          </p>
        </div>
      </div>
    </footer>
  );
}
