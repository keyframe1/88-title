"use client";

/**
 * Client-side locale access. A tiny context carries only the active locale
 * string; client components derive their dictionary from it synchronously.
 *
 * The context default is the base locale, so the shared client components used
 * outside the customer site (e.g. the install prompt on the dealer dashboard)
 * render in English without a provider and never throw — there is no hard
 * dependency on being wrapped.
 */
import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { getUiDictionary, type UiDictionary } from "./ui";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Provides the active locale to the customer-site client tree. */
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

/** The active locale (defaults to English outside a provider). */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** The UI dictionary for the active locale, for client components. */
export function useUi(): UiDictionary {
  return getUiDictionary(useLocale());
}
