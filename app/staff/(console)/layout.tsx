import type { ReactNode } from "react";
import { ConsoleHeader } from "@/components/console/ConsoleHeader";
import type { ConsoleNavLink } from "@/components/console/ConsoleNav";
import { getDealerContext } from "@/lib/dealers/dal";
import { getStaffDisplayName } from "@/lib/transactions/dal";

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
  { href: "/staff/transactions", label: "Transactions" },
];

export default async function StaffConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Whose session this is, shown in the bar. getDealerContext is request-cached
  // (the page below reuses the same call), and we resolve the name only for an
  // actual staff member; a non-staff / unauthenticated visitor gets no name (the
  // page itself redirects or explains). staff_users.full_name, then the auth
  // email, is the resolution order (getStaffDisplayName).
  const ctx = await getDealerContext();
  const userName =
    ctx && ctx.isStaff ? await getStaffDisplayName(ctx.user.id) : null;

  return (
    <>
      <ConsoleHeader
        brandHref="/staff/queue"
        label="Staff"
        links={STAFF_LINKS}
        userName={userName}
        helpHref="/staff/help"
      />
      <main className="flex-1 bg-surface">{children}</main>
    </>
  );
}
