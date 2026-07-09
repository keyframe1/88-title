import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { SITE, DIRECTIONS_URL, MAP_EMBED_URL } from "@/lib/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { localBusinessSchema } from "@/lib/seo";
import { getLocale, getUiText } from "@/lib/i18n/server";
import { getLocalizedHours, getLocalizedTagline } from "@/lib/i18n/content/site";
import { getOmvDisclosure } from "@/lib/i18n/content/fees";

export async function SiteFooter() {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  const year = new Date().getFullYear();
  const hours = getLocalizedHours(locale);

  const footerLinks = [
    { href: "/services", label: ui.footer.nav.services },
    { href: "/pricing", label: ui.footer.nav.pricing },
    { href: "/forms", label: ui.footer.nav.forms },
    { href: "/check-in", label: ui.footer.nav.checkIn },
  ];

  return (
    <footer className="mt-20 border-t border-line bg-mist">
      {/* Site-wide LocalBusiness structured data, built from the NAP in lib/site.
          Structured data stays in English: it is the canonical machine-readable
          record for search engines. */}
      <JsonLd data={localBusinessSchema()} />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        {/* Find us: a light map beside a composed details column that pairs the
            address/directions and the hours as two aligned columns, rather than
            one long stack. */}
        <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch">
          <div className="overflow-hidden rounded-2xl border border-line bg-paper">
            <iframe
              title={ui.footer.mapTitle(SITE.name, SITE.address.full)}
              src={MAP_EMBED_URL}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block aspect-[16/10] w-full lg:aspect-auto lg:h-full"
            />
          </div>

          <div className="flex flex-col">
            {/* Brand lockup (reads "88 Title": the mark is named "88", the
                wordmark is visible text — same pattern as the header). */}
            <div className="flex items-center gap-2">
              <BrandMark label="88" className="h-5 w-auto text-ink" />
              <span className="font-display text-lg font-extrabold tracking-tight text-ink">
                Title
              </span>
            </div>
            <p className="mt-1 text-sm text-fog">{getLocalizedTagline(locale)}</p>

            <div className="mt-6 grid flex-1 gap-8 sm:grid-cols-2">
              {/* Visit */}
              <div>
                <address className="text-sm not-italic leading-relaxed text-ink">
                  <a
                    href={DIRECTIONS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline-offset-2 transition-colors duration-150 hover:text-plate hover:underline focus-visible:text-plate focus-visible:underline"
                  >
                    {SITE.address.street}
                    <br />
                    {SITE.address.city}, {SITE.address.region}{" "}
                    <span className="tabular-nums">{SITE.address.postalCode}</span>
                  </a>
                  <div className="mt-2">
                    <a
                      href={`tel:${SITE.phone.href}`}
                      className="font-medium tabular-nums underline-offset-2 transition-colors duration-150 hover:text-plate hover:underline focus-visible:text-plate focus-visible:underline"
                    >
                      {SITE.phone.display}
                    </a>
                  </div>
                </address>

                <a
                  href={DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex w-fit items-center rounded-lg border border-ink px-3 py-1.5 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white"
                >
                  {ui.footer.getDirections}
                </a>
              </div>

              {/* Hours */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-fog">
                  {ui.footer.hoursHeading}
                </div>
                <ul className="mt-3 space-y-1 text-sm text-ink">
                  {hours.map((row) => (
                    <li key={row.label} className="flex justify-between gap-6">
                      <span>{row.label}</span>
                      <span className="tabular-nums text-fog">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Composed bottom band: primary nav on the left, the deliberately quiet
            language switch + dealer entrance on the right (dealers have a way in,
            but it must never compete with the Check in CTA; staff is internal and
            never advertised). Then the statutory disclosure and the copyright. */}
        <div className="mt-10 border-t border-line pt-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <nav aria-label={ui.footer.navAria}>
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {footerLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-semibold text-ink transition-colors duration-150 hover:text-plate focus-visible:text-plate"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Link
                href="/for-dealers"
                className="text-sm font-medium text-fog underline-offset-2 transition-colors duration-150 hover:text-plate hover:underline focus-visible:text-plate focus-visible:underline"
              >
                {ui.footer.forDealers}
              </Link>
              <Link
                href="/dealers/login"
                className="text-sm font-medium text-fog underline-offset-2 transition-colors duration-150 hover:text-plate hover:underline focus-visible:text-plate focus-visible:underline"
              >
                {ui.footer.dealerLogin}
              </Link>
            </div>
          </div>

          {/* Compliance: the statutory public-tag-fee + OMV disclosure. */}
          <div className="mt-8 rounded-xl border border-line bg-paper p-4 text-xs leading-relaxed text-fog">
            <p>
              <span className="font-semibold text-ink">
                {ui.footer.disclosureLabel}
              </span>{" "}
              {getOmvDisclosure(locale)}
            </p>
            <p className="mt-2">{ui.footer.notOmv}</p>
          </div>

          <p className="mt-8 text-xs text-fog">
            {ui.footer.rights(year, SITE.name)}
          </p>
        </div>
      </div>
    </footer>
  );
}
