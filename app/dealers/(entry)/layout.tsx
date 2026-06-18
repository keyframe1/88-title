import type { ReactNode } from "react";
import { ConsoleHeader } from "@/components/console/ConsoleHeader";

/**
 * Pre-auth shell for the dealer sign-in and password-reset screens: the lean
 * console brand bar only (no nav, nothing to sign out of yet). The brand mark
 * links back to the public site. Once signed in, the (portal) group takes over.
 */
export default function DealerEntryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <ConsoleHeader brandHref="/" label="Dealer Portal" showSignOut={false} />
      <main className="flex-1">{children}</main>
    </>
  );
}
