import type { ReactNode } from "react";
import { ConsoleHeader } from "@/components/console/ConsoleHeader";

/**
 * Pre-auth shell for the staff sign-in screen: the lean console brand bar only
 * (no section nav, nothing to sign out of yet). The brand mark links back to
 * the public site. Once signed in, the (console) group takes over with the full
 * Queue / Records / Fees / Forms nav.
 */
export default function StaffEntryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <ConsoleHeader brandHref="/" label="Staff" showSignOut={false} />
      <main className="flex-1">{children}</main>
    </>
  );
}
