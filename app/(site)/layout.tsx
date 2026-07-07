import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";

/**
 * Customer-facing chrome. The marketing site, pricing, services, and the public
 * check-in flow all live under this group so they share the full
 * header (logo + nav + language switch + Check in CTA) and footer (map, hours,
 * OMV disclosure). The staff console and dealer portal sit outside this group
 * and get their own lean, English-only layouts instead.
 *
 * This layout reads the persisted locale and makes it available two ways: to
 * server components via the cached getLocale()/getUiText(), and to client
 * components via <I18nProvider>. The `lang` attribute on the wrapper marks the
 * customer subtree's language for assistive tech without touching the root
 * <html lang> the staff/dealer areas share.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <I18nProvider locale={locale}>
      <div lang={locale} className="contents">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </I18nProvider>
  );
}
