import type { ReactNode } from "react";
import { ConsoleHeader } from "@/components/console/ConsoleHeader";
import type { ConsoleNavLink } from "@/components/console/ConsoleNav";

/**
 * Staff console shell. One consistent top bar across Queue / Records / Fees /
 * Forms (replacing the ad-hoc "<- Queue" / "Fees ->" cross-links that used to
 * live in each page header), plus Sign out. The login page sits outside this
 * group, so it stays a focused sign-in screen with no console nav.
 */
const STAFF_LINKS: ConsoleNavLink[] = [
  { href: "/staff/queue", label: "Queue" },
  { href: "/staff/records", label: "Records" },
  { href: "/staff/fees", label: "Fees" },
  { href: "/staff/forms", label: "Forms" },
];

export default function StaffConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <ConsoleHeader
        brandHref="/staff/queue"
        label="Staff"
        links={STAFF_LINKS}
      />
      <main className="flex-1 bg-surface">{children}</main>
    </>
  );
}
