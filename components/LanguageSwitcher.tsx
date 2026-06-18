"use client";

import { useRouter } from "next/navigation";
import {
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_LABELS,
  LOCALE_SHORT,
  type Locale,
} from "@/lib/i18n/config";
import { useLocale, useUi } from "@/lib/i18n/client";

/**
 * Write the (non-sensitive) locale cookie in the browser. Kept at module scope
 * so the side effect lives outside the component body.
 */
function writeLocaleCookie(locale: Locale): void {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax${secure}`;
}

/**
 * Language switch. A compact EN / ES segmented control that persists the choice
 * in the locale cookie and re-renders the page in the chosen language. Stays
 * deliberately quiet so it never competes with the Check in CTA.
 *
 * The cookie is non-sensitive and written client-side; router.refresh() then
 * re-runs the server components (layout, pages) with the new locale, so both the
 * server-rendered chrome and the client islands flip together.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const router = useRouter();
  const active = useLocale();
  const ui = useUi();

  function choose(locale: Locale) {
    if (locale === active) return;
    writeLocaleCookie(locale);
    router.refresh();
  }

  return (
    <div
      role="group"
      aria-label={ui.language.label}
      className={`inline-flex items-center rounded-full border border-line bg-paper p-0.5 ${className}`}
    >
      {LOCALES.map((locale) => {
        const isActive = locale === active;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            onClick={() => choose(locale)}
            aria-pressed={isActive}
            title={LOCALE_LABELS[locale]}
            className={`rounded-full px-2 py-1 text-xs font-bold tracking-wide transition-colors ${
              isActive
                ? "bg-ink text-white"
                : "text-fog hover:text-ink focus-visible:text-ink"
            }`}
          >
            {LOCALE_SHORT[locale]}
          </button>
        );
      })}
    </div>
  );
}
