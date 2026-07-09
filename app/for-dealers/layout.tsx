import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";

/**
 * Chrome for the public dealer pitch page (/for-dealers).
 *
 * This is a customer-facing MARKETING surface, not the dealer portal, so it
 * wears the full customer site chrome (header nav + language switch + footer),
 * exactly like the pages under app/(site). It is a plain top-level route (no
 * auth), deliberately separate from the guarded portal at /dealers/dashboard so
 * a signed-in dealer can still read the pitch without being bounced to their
 * board. The old /dealers URL 301-redirects here (see lib/supabase/proxy.ts).
 *
 * Reads the persisted locale and exposes it to server components (cached
 * getLocale/getUiText) and client components (<I18nProvider>), and marks the
 * subtree's language for assistive tech without touching the root <html lang>.
 */
export default async function ForDealersLayout({
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
