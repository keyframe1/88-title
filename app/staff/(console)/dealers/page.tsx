import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getDealerContext,
  listAllDealerTransactions,
  type StaffDealerTransaction,
} from "@/lib/dealers/dal";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import { DealerTransactionsConsole } from "@/components/staff/DealerTransactionsConsole";
import { ConsolePage, ConsolePageHeader } from "@/components/console/ConsoleUI";

export const metadata: Metadata = {
  title: "Dealers",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StaffDealersPage() {
  const ctx = await getDealerContext();

  // Proxy optimistically guards /staff; this is the authoritative gate.
  if (!ctx) {
    redirect("/staff/login?redirectedFrom=/staff/dealers");
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

  let rows: StaffDealerTransaction[] = [];
  let unavailable = false;
  try {
    rows = await listAllDealerTransactions();
  } catch (err) {
    console.error("Dealer transactions unavailable:", err);
    unavailable = true;
  }

  return (
    <ConsolePage>
      <ConsolePageHeader
        title="Dealer transactions"
        description="Every dealership's title work. Advance a deal through the pipeline, and flag a problem title so the dealer sees it. Moving a deal to “ready for pickup” notifies the dealer. Staff only."
      />

      <div className="mt-6">
        {unavailable ? (
          <p className="console-list px-4 py-12 text-center text-sm text-fog">
            The dealer board columns aren&rsquo;t available yet. Apply migration
            20260629120000_dealer_transactions_board.sql, then reload.
          </p>
        ) : (
          <DealerTransactionsConsole initial={rows} />
        )}
      </div>
    </ConsolePage>
  );
}
