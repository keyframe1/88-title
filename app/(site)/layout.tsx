import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * Customer-facing chrome. The marketing site, pricing, services, checklist, and
 * the public check-in flow all live under this group so they share the full
 * header (logo + nav + Check in CTA) and footer (map, hours, OMV disclosure).
 * The staff console and dealer portal sit outside this group and get their own
 * lean layouts instead.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
