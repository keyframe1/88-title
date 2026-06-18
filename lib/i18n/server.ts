/**
 * Server-side locale access. Reads the persisted choice from the request cookie
 * and hands back the active locale plus its UI dictionary.
 *
 * `getLocale` is wrapped in React `cache`, so the cookie is read once per request
 * no matter how many server components (layout, pages, generateMetadata) ask for
 * it. Reading a cookie opts a route into dynamic rendering, which is exactly what
 * we want here: the customer site renders in whichever language they chose.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { getUiDictionary, type UiDictionary } from "./ui";

/** The active locale for this request (defaults to English). */
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** The UI dictionary for the active locale, for server components. */
export async function getUiText(): Promise<UiDictionary> {
  return getUiDictionary(await getLocale());
}
