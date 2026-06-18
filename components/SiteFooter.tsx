import Link from "next/link";
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
    { href: "/checklist", label: ui.footer.nav.checklist },
    { href: "/pricing", label: ui.footer.nav.pricing },
    { href: "/services", label: ui.footer.nav.services },
    { href: "/check-in", label: ui.footer.nav.checkIn },
  ];

  return (
    <footer className="mt-20 border-t border-line bg-mist">
      {/* Site-wide LocalBusiness structured data, built from the NAP in lib/site.
          Structured data stays in English: it is the canonical machine-readable
          record for search engines. */}
      <JsonLd data={localBusinessSchema()} />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* Find us: a light map next to the address, hours, and directions. */}
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
            <div className="font-display text-lg font-extrabold text-ink">
              {SITE.name}
            </div>
            <p className="mt-1 text-sm text-fog">{getLocalizedTagline(locale)}</p>

            <address className="mt-4 text-sm not-italic text-ink">
              <a
                href={DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline-offset-2 transition-colors hover:text-plate hover:underline"
              >
                {SITE.address.street}
                <br />
                {SITE.address.city}, {SITE.address.region}{" "}
                {SITE.address.postalCode}
              </a>
              <div className="mt-2">
                <a
                  href={`tel:${SITE.phone.href}`}
                  className="font-medium underline-offset-2 transition-colors hover:text-plate hover:underline"
                >
                  {SITE.phone.display}
                </a>
              </div>
            </address>

            <a
              href={DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex w-fit items-center rounded-lg border border-ink px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
            >
              {ui.footer.getDirections}
            </a>

            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-fog">
                {ui.footer.hoursHeading}
              </div>
              <ul className="mt-3 space-y-1 text-sm text-ink">
                {hours.map((row) => (
                  <li key={row.label} className="flex justify-between gap-6">
                    <span>{row.label}</span>
                    <span className="text-fog">{row.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Site nav. The dealer-login link is intentionally discreet and set
            apart from the customer links: dealers have an entrance here, but it
            must not compete with the Check in CTA. (Staff is internal and is
            never advertised publicly.) The language switch sits with it, equally
            quiet. */}
        <nav
          aria-label={ui.footer.navAria}
          className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-8"
        >
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-ink transition-colors hover:text-plate"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              href="/dealers/login"
              className="text-sm font-medium text-fog underline-offset-2 transition-colors hover:text-plate hover:underline"
            >
              {ui.footer.dealerLogin}
            </Link>
          </div>
        </nav>

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
    </footer>
  );
}
