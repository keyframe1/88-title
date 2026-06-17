import Link from "next/link";
import { SITE, DIRECTIONS_URL, MAP_EMBED_URL } from "@/lib/site";
import { OMV_DISCLOSURE } from "@/lib/services";
import { JsonLd } from "@/components/seo/JsonLd";
import { localBusinessSchema } from "@/lib/seo";

const FOOTER_LINKS = [
  { href: "/checklist", label: "What to bring" },
  { href: "/pricing", label: "Fees" },
  { href: "/services", label: "Services" },
  { href: "/check-in", label: "Check in" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line bg-mist">
      {/* Site-wide LocalBusiness structured data, built from the NAP in lib/site. */}
      <JsonLd data={localBusinessSchema()} />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* Find us: a light map next to the address, hours, and directions. */}
        <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch">
          <div className="overflow-hidden rounded-2xl border border-line bg-paper">
            <iframe
              title={`Map showing ${SITE.name} at ${SITE.address.full}`}
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
            <p className="mt-1 text-sm text-fog">{SITE.tagline}</p>

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
              Get directions
            </a>

            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-fog">
                Hours
              </div>
              <ul className="mt-3 space-y-1 text-sm text-ink">
                {SITE.hours.display.map((row) => (
                  <li key={row.label} className="flex justify-between gap-6">
                    <span>{row.label}</span>
                    <span className="text-fog">{row.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Site nav */}
        <nav
          aria-label="Footer"
          className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-8"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-ink transition-colors hover:text-plate"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Compliance: the statutory public-tag-fee + OMV disclosure. */}
        <div className="mt-8 rounded-xl border border-line bg-paper p-4 text-xs leading-relaxed text-fog">
          <p>
            <span className="font-semibold text-ink">
              Public tag fee disclosure.
            </span>{" "}
            {OMV_DISCLOSURE}
          </p>
          <p className="mt-2">
            88 Title is a private public tag agency and is not the Louisiana
            Office of Motor Vehicles (OMV).
          </p>
        </div>

        <p className="mt-8 text-xs text-fog">
          © {year} {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
