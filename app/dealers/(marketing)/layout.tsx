import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";

/**
 * Chrome for the public dealer pitch page (/dealers).
 *
 * This is a customer-facing MARKETING surface, not the dealer portal, so it
 * wears the full customer site chrome (header nav + language switch + footer),
 * exactly like the pages under app/(site). It mirrors that group's layout rather
 * than living inside it so the whole /dealers/* tree stays under one folder: the
 * portal ((portal)) and sign-in ((entry)) route groups are siblings here.
 *
 * Reads the persisted locale and exposes it to server components (cached
 * getLocale/getUiText) and client components (<I18nProvider>), and marks the
 * subtree's language for assistive tech without touching the root <html lang>.
 */
export default async function DealerMarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
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
