"use client";

import { useState } from "react";
import type { LedgerRow } from "@/lib/transactions/types";
import type { ActivityPage } from "@/lib/activity/types";
import { TransactionsLedger } from "./TransactionsLedger";
import { ActivityLog } from "./ActivityLog";

/**
 * The Transactions tab's two sub-views behind one segmented control: the daily
 * LEDGER (the exportable financial record) and the append-only ACTIVITY trail
 * (who did what, when). The control and the activity view are print-hidden; the
 * ledger owns the print-only reconciliation report, so Print/Ctrl-P from the
 * ledger always yields the report.
 */
type View = "ledger" | "activity";

export function TransactionsWorkspace({
  initialDay,
  today,
  initialRows,
  ledgerUnavailable,
  preparedByName,
  businessName,
  businessAddress,
  initialActivity,
  activityUnavailable,
}: {
  initialDay: string;
  today: string;
  initialRows: LedgerRow[];
  ledgerUnavailable: boolean;
  preparedByName: string;
  businessName: string;
  businessAddress: string;
  initialActivity: ActivityPage;
  activityUnavailable: boolean;
}) {
  const [view, setView] = useState<View>("ledger");

  return (
    <>
      <div className="mt-6 flex gap-1 rounded-xl border border-line bg-white p-1 print:hidden sm:w-fit">
        <SegmentButton
          active={view === "ledger"}
          onClick={() => setView("ledger")}
        >
          Ledger
        </SegmentButton>
        <SegmentButton
          active={view === "activity"}
          onClick={() => setView("activity")}
        >
          Activity
        </SegmentButton>
      </div>

      {view === "ledger" ? (
        ledgerUnavailable ? (
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
            initialDay={initialDay}
            today={today}
            initialRows={initialRows}
            preparedByName={preparedByName}
            businessName={businessName}
            businessAddress={businessAddress}
          />
        )
      ) : (
        <ActivityLog
          initial={initialActivity}
          unavailable={activityUnavailable}
        />
      )}
    </>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-ink text-paper"
          : "text-fog hover:bg-mist hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
