/**
 * SEO helpers — page metadata and JSON-LD structured data, all built from the
 * single NAP source of truth in `lib/site.ts`.
 *
 * `pageMetadata` keeps every public page consistent: a keyword-aware title, an
 * Open Graph block, and a canonical URL. `metadataBase` is set once in
 * app/layout.tsx, so the relative `path` values here resolve to absolute URLs.
 */

import type { Metadata } from "next";
import { SITE, SITE_URL } from "@/lib/site";
import type { TransactionPath } from "@/lib/checklists";

type PageMetaInput = {
  /** Page-specific title segment, e.g. "Title transfer in Metairie, LA". */
  title: string;
  description: string;
  /** Canonical path, e.g. "/services". */
  path: string;
  /**
   * When true, `title` is used verbatim (no "| 88 Title" template suffix). Used
   * for the homepage, whose title already leads with the brand.
   */
  absoluteTitle?: boolean;
};

export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: PageMetaInput): Metadata {
  const ogTitle = absoluteTitle ? title : `${title} | ${SITE.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: ogTitle,
      description,
      url: path,
      siteName: SITE.name,
      locale: "en_US",
      type: "website",
    },
  };
}

/** Stable @id so other schema nodes (Service) can reference the business. */
const BUSINESS_ID = `${SITE_URL}/#business`;

/**
 * LocalBusiness JSON-LD for the office. Rendered site-wide (in the footer) so
 * the real NAP, hours, and geo travel with every page.
 */
export function localBusinessSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": BUSINESS_ID,
    name: SITE.name,
    description:
      "Louisiana public tag agency in Metairie handling title transfers, license plates, registration, and notary, with online check-in.",
    url: SITE_URL,
    telephone: SITE.phone.href,
    image: `${SITE_URL}/icon-512.png`,
    logo: `${SITE_URL}/icon-512.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postalCode,
      addressCountry: SITE.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE.geo.latitude,
      longitude: SITE.geo.longitude,
    },
    areaServed: [
      { "@type": "City", name: "Metairie" },
      { "@type": "AdministrativeArea", name: "Jefferson Parish" },
    ],
    openingHoursSpecification: SITE.hours.spec.map((block) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: block.days,
      opens: block.opens,
      closes: block.closes,
    })),
  };
}

/** Service JSON-LD for a transaction-type page, linked to the business. */
export function serviceSchema(path: TransactionPath): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: path.label,
    serviceType: path.label,
    description: path.blurb,
    url: `${SITE_URL}/services/${path.slug}`,
    provider: {
      "@type": "LocalBusiness",
      "@id": BUSINESS_ID,
      name: SITE.name,
    },
    areaServed: [
      { "@type": "City", name: "Metairie" },
      { "@type": "AdministrativeArea", name: "Jefferson Parish" },
    ],
  };
}
