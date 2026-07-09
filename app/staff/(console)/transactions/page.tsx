import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDealerContext } from "@/lib/dealers/dal";
import {
  getStaffDisplayName,
  getTransactionsForDay,
} from "@/lib/transactions/dal";
import { businessToday } from "@/lib/transactions/day";
import type { LedgerRow } from "@/lib/transactions/types";
import { getActivityPage } from "@/lib/activity/dal";
import type { ActivityPage } from "@/lib/activity/types";
import { SITE } from "@/lib/site";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import { TransactionsWorkspace } from "@/components/staff/TransactionsWorkspace";
import { ConsolePage, ConsolePageHeader } from "@/components/console/ConsoleUI";

export const metadata: Metadata = {
  title: "Ledger",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StaffTransactionsPage() {
  const ctx = await getDealerContext();

  // Proxy optimistically guards /staff; this is the authoritative gate.
  if (!ctx) {
    redirect("/staff/login?redirectedFrom=/staff/transactions");
  }

  // Authenticated but not staff (e.g. a dealer login). Explain, don't error.
  if (!ctx.isStaff) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
          Staff console
        </p>
        <h1 className="mt-3 text-2xl font-extrabold">Staff access only</h1>
        <p className="mx-auto mt-3 max-w-sm leading-relaxed text-fog">
          This area is for 88 Title staff. Your login isn&rsquo;t a staff
          account.
        </p>
        <div className="mt-8 flex justify-center">
          <SignOutButton redirectTo="/staff/login" />
        </div>
      </div>
    );
  }

  const today = businessToday();

  // The day's ledger. If the transactions table isn't present yet (migration not
  // applied to this environment), the workspace shows a clear setup notice.
  let initialRows: LedgerRow[] = [];
  let ledgerUnavailable = false;
  try {
    initialRows = await getTransactionsForDay(today);
  } catch (err) {
    console.error("Transactions table unavailable:", err);
    ledgerUnavailable = true;
  }

  // The first page of the append-only activity trail. Independently guarded: the
  // activity_log migration may not be applied even when transactions is.
  let initialActivity: ActivityPage = { rows: [], hasMore: false };
  let activityUnavailable = false;
  try {
    initialActivity = await getActivityPage(null, 0);
  } catch (err) {
    console.error("Activity log unavailable:", err);
    activityUnavailable = true;
  }

  // The current staff member's display name, for the report's "Prepared by" line.
  const preparedByName = await getStaffDisplayName(ctx.user.id);

  return (
    <ConsolePage>
      <div className="print:hidden">
        <ConsolePageHeader
          title="Ledger"
          description="The day's counter transactions and the staff activity trail: what was collected, for whom, by whom, and who did what. Print a reconciliation report or export a CSV. Staff only."
        />
      </div>

      <TransactionsWorkspace
        initialDay={today}
        today={today}
        initialRows={initialRows}
        ledgerUnavailable={ledgerUnavailable}
        preparedByName={preparedByName}
        businessName={SITE.name}
        businessAddress={SITE.address.full}
        initialActivity={initialActivity}
        activityUnavailable={activityUnavailable}
      />
    </ConsolePage>
  );
}
