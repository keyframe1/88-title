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
import { DEFAULT_LOCALE, OG_LOCALE, type Locale } from "@/lib/i18n/config";

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
  /** Active locale, for the Open Graph `locale`. Defaults to English. */
  locale?: Locale;
};

export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  locale = DEFAULT_LOCALE,
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
      locale: OG_LOCALE[locale],
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

/**
 * Service JSON-LD for a transaction-type page, linked to the business. Pass an
 * optional `description` (e.g. the guide's meta description) for a richer node;
 * otherwise the short checklist blurb is used.
 */
export function serviceSchema(
  path: TransactionPath,
  description?: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: path.label,
    serviceType: path.label,
    description: description ?? path.blurb,
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

/**
 * FAQPage JSON-LD for a transaction-type page. Surfaces the on-page Q&A to
 * Google for rich results. The questions and answers shown to users and the
 * ones in this schema are the same text, which is what Google expects.
 */
export function faqPageSchema(
  faqs: ReadonlyArray<{ question: string; answer: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
