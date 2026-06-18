/**
 * Localized business facts for the customer footer (tagline + hours rows).
 *
 * English reads from lib/site.ts (the NAP single source, also used by SEO and
 * structured data, which stay English). Spanish is a small overlay here. The
 * address and phone are language-neutral and continue to come straight from
 * lib/site.ts.
 */
import { SITE } from "@/lib/site";
import type { Locale } from "../config";

export interface HoursRow {
  label: string;
  value: string;
}

const esTagline = "La agencia de placas públicas de Metairie";

const esHours: HoursRow[] = [
  { label: "Lunes a viernes", value: "9:00 a.m. a 5:00 p.m." },
  { label: "Sábado", value: "9:00 a.m. a 1:00 p.m." },
  { label: "Domingo", value: "Cerrado" },
];

const taglines: Partial<Record<Locale, string>> = { es: esTagline };
const hours: Partial<Record<Locale, HoursRow[]>> = { es: esHours };

export function getLocalizedTagline(locale: Locale): string {
  return taglines[locale] ?? SITE.tagline;
}

export function getLocalizedHours(locale: Locale): HoursRow[] {
  return hours[locale] ?? SITE.hours.display.map((row) => ({ ...row }));
}
