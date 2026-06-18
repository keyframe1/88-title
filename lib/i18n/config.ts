/**
 * i18n configuration — the single, language-agnostic source of truth for which
 * locales the customer-facing site supports and how the choice is persisted.
 *
 * Adding a language is a data change, not a plumbing change: append the code to
 * LOCALES, add its labels below, then supply its translation set under
 * `lib/i18n/ui/<code>.ts` and `lib/i18n/content/*`. Nothing else needs to move.
 *
 * Scope: the customer site only. The staff console and dealer portal stay
 * English and never read the locale cookie.
 */

/** Supported locales, in switch order. English is first and is the base. */
export const LOCALES = ["en", "es", "vi"] as const;

export type Locale = (typeof LOCALES)[number];

/** Fallback when no choice has been made (and what crawlers/SSR start from). */
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Name of the (non-sensitive) cookie that remembers the customer's choice. Read
 * on the server per request; written client-side by the language switch.
 */
export const LOCALE_COOKIE = "locale";

/** One year, in seconds — how long the persisted choice lasts. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Narrow an unknown cookie value to a supported Locale. */
export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "es" || value === "vi";
}

/** Endonyms (each language's own name), for the language switch. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  vi: "Tiếng Việt",
};

/** Compact two-letter codes for the header toggle. */
export const LOCALE_SHORT: Record<Locale, string> = {
  en: "EN",
  es: "ES",
  vi: "VI",
};

/** Open Graph locale codes. es_419 = Latin American Spanish. */
export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  es: "es_419",
  vi: "vi_VN",
};
