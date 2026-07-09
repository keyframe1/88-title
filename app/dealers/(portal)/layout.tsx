import type { ReactNode } from "react";
import { ConsoleHeader } from "@/components/console/ConsoleHeader";

/**
 * Dealer portal shell. The dashboard (/dealers/dashboard) is currently the
 * portal's only page, so the bar is the brand mark (which links home to the
 * dashboard) plus Sign out; section tabs are added here if the portal grows.
 * Login and password reset sit outside this group, so they stay focused sign-in
 * screens with no portal nav. The public pitch page at /dealers is a separate
 * (marketing) group with the full customer site chrome.
 */
export default function DealerPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <ConsoleHeader
        brandHref="/dealers/dashboard"
        label="Dealer"
        signOutTo="/dealers/login"
      />
      <main className="flex-1 bg-surface">{children}</main>
    </>
  );
}
