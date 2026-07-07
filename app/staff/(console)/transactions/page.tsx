import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDealerContext } from "@/lib/dealers/dal";
import {
  getStaffDisplayName,
  getTransactionsForDay,
} from "@/lib/transactions/dal";
import { businessToday } from "@/lib/transactions/day";
import type { LedgerRow } from "@/lib/transactions/types";
import { SITE } from "@/lib/site";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import { TransactionsLedger } from "@/components/staff/TransactionsLedger";
import { ConsolePage, ConsolePageHeader } from "@/components/console/ConsoleUI";

export const metadata: Metadata = {
  title: "Transactions",
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
          <SignOutButton />
        </div>
      </div>
    );
  }

  const today = businessToday();

  // The day's ledger. If the transactions table isn't present yet (migration not
  // applied to this environment), show a clear setup notice instead of erroring.
  let initialRows: LedgerRow[] = [];
  let ledgerError = false;
  try {
    initialRows = await getTransactionsForDay(today);
  } catch (err) {
    console.error("Transactions table unavailable:", err);
    ledgerError = true;
  }

  // The current staff member's display name, for the report's "Prepared by" line.
  const preparedByName = await getStaffDisplayName(ctx.user.id);

  return (
    <ConsolePage>
      <div className="print:hidden">
        <ConsolePageHeader
          title="Transactions"
          description="The day's counter transactions: what was collected, for whom, by whom. Print a reconciliation report or export a CSV. Staff only."
        />
      </div>

      {ledgerError ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-white p-6">
          <h2 className="font-display text-lg font-extrabold text-ink">
            Transactions are not available yet
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-fog">
            The transactions table could not be read. Apply migration
            20260625120000_transactions.sql to this environment, then reload.
          </p>
        </div>
      ) : (
        <TransactionsLedger
          initialDay={today}
          today={today}
          initialRows={initialRows}
          preparedByName={preparedByName}
          businessName={SITE.name}
          businessAddress={SITE.address.full}
        />
      )}
    </ConsolePage>
  );
}
