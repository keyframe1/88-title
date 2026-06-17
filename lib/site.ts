/**
 * 88 Title shared business facts — the single source of truth for the business
 * name, address, phone, and hours (NAP).
 *
 * The footer, JSON-LD schema, sitemap, and page metadata all read from here so
 * the business details never drift apart across the site.
 *
 * PENDING CHRIS CONFIRMATION before these are treated as final:
 *   - phone: 504-888-4853 is the vanity line 504-88-TITLE. Use it as the working
 *     value now, but confirm the line is actually provisioned before launch.
 *   - hours: confirm the weekday / Saturday schedule below.
 *   - geo: lat/long derived from Google Maps for 3500 N Hullen St; worth a quick
 *     verify against the exact suite/entrance.
 */

/** Canonical site origin, e.g. https://88title.com. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const ADDRESS = {
  street: "3500 N Hullen St",
  city: "Metairie",
  /** USPS state abbreviation, used for schema addressRegion. */
  region: "LA",
  regionName: "Louisiana",
  postalCode: "70002",
  country: "US",
} as const;

/** "3500 N Hullen St, Metairie, LA 70002" — one formatted line. */
const FULL_ADDRESS = `${ADDRESS.street}, ${ADDRESS.city}, ${ADDRESS.region} ${ADDRESS.postalCode}`;

export const SITE = {
  name: "88 Title",
  tagline: "Metairie’s public tag agency",
  /** Short city label for copy and metadata. */
  city: "Metairie, LA",
  /** Where 88 Title serves customers, for schema areaServed + copy. */
  serviceArea: "Metairie and Jefferson Parish",

  address: {
    ...ADDRESS,
    full: FULL_ADDRESS,
  },

  // Vanity line 504-88-TITLE. PENDING CHRIS CONFIRMATION that this is the
  // provisioned office number before it is treated as final.
  phone: {
    display: "(504) 888-4853",
    /** E.164 form for tel: links. */
    href: "+15048884853",
    vanity: "504-88-TITLE",
  },

  // PENDING CHRIS CONFIRMATION of the final schedule.
  hours: {
    /** Human-readable rows for the footer. */
    display: [
      { label: "Monday – Friday", value: "9:00 AM – 5:00 PM" },
      { label: "Saturday", value: "9:00 AM – 1:00 PM" },
      { label: "Sunday", value: "Closed" },
    ],
    /** schema.org openingHoursSpecification source (24h clock, by day). */
    spec: [
      {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "17:00",
      },
      { days: ["Saturday"], opens: "09:00", closes: "13:00" },
    ],
  },

  // PENDING CHRIS CONFIRMATION — derived from Google Maps for 3500 N Hullen St.
  geo: { latitude: 30.012262, longitude: -90.158134 },
} as const;

/** Google Maps directions deep link to the office. */
export const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  FULL_ADDRESS,
)}`;

/** Google Maps place link (open the location). */
export const MAP_PLACE_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  FULL_ADDRESS,
)}`;

/**
 * Privacy-respecting OpenStreetMap embed centered on the office. No API key, no
 * Google tracking cookies, and it lazy-loads — a light way to show where we are.
 */
export const MAP_EMBED_URL = (() => {
  const { latitude, longitude } = SITE.geo;
  const dLat = 0.006;
  const dLon = 0.008;
  const bbox = [
    longitude - dLon,
    latitude - dLat,
    longitude + dLon,
    latitude + dLat,
  ]
    .map((n) => n.toFixed(6))
    .join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox,
  )}&layer=mapnik&marker=${latitude}%2C${longitude}`;
})();
