/**
 * 88 Title shared business facts.
 *
 * The address, phone, and hours are still being confirmed before launch.
 * Centralized here so the header, footer, and any page that shows them stay in
 * sync.
 */

export const SITE = {
  name: "88 Title",
  tagline: "Metairie’s public tag agency",
  city: "Metairie, LA",

  // --- Confirm before launch -----------------------------------------------
  addressPlaceholder: "Address coming soon · Metairie, LA",
  phonePlaceholder: "(504) 000-0000",
  hours: {
    weekday: "Mon–Fri · 9:00 AM – 5:00 PM",
    saturday: "Sat · 9:00 AM – 1:00 PM",
    sunday: "Sun · Closed",
  },
} as const;
