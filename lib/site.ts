/**
 * 88 Title — shared business facts.
 *
 * Several of these are PLACEHOLDERS pending confirmation (address, phone, hours,
 * and the typical visit time, which is a sample until we actually measure it).
 * Centralized here so the header, footer, and VisitTime component stay in sync.
 */

export const SITE = {
  name: "88 Title",
  tagline: "Metairie’s public tag agency",
  city: "Metairie, LA",

  // --- Placeholders: confirm before launch ---------------------------------
  addressPlaceholder: "Address coming soon · Metairie, LA",
  phonePlaceholder: "(504) 000-0000",
  hours: {
    weekday: "Mon–Fri · 9:00 AM – 5:00 PM",
    saturday: "Sat · 9:00 AM – 1:00 PM",
    sunday: "Sun · Closed",
  },
  /** Sample visit time shown until real counter times are measured. */
  typicalVisitPlaceholder: "~22 min",
} as const;
