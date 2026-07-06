import type { DealerTransaction } from "@/lib/dealers/types";
import { StatusBadge } from "./StatusBadge";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateFmt.format(date);
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-line bg-mist/60 px-6 py-14 text-center">
      <h3 className="text-lg font-extrabold text-ink">No transactions yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fog">
        When you file a transaction it shows up here with its status, so you can
        track it from received to ready for pickup.
      </p>
    </div>
  );
}

export function TransactionList({
  transactions,
}: {
  transactions: DealerTransaction[];
}) {
  if (transactions.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {transactions.map((tx) => {
        const showDocsNote =
          tx.status === "docs_needed" && Boolean(tx.docs_needed_note?.trim());
        return (
          <li
            key={tx.id}
            className="rounded-xl border border-line bg-white p-4 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-base font-extrabold text-ink">
                  {tx.vehicle_description?.trim() || "Transaction"}
                </p>
                <p className="mt-0.5 text-sm text-fog">
                  {tx.transaction_type?.trim() || "Type to be confirmed"}
                  <span className="px-1.5 text-line">·</span>
                  Filed {formatDate(tx.created_at)}
                </p>
              </div>
              <StatusBadge status={tx.status} />
            </div>

            {showDocsNote ? (
              <p className="mt-3 rounded-lg border-l-4 border-plate bg-plate/5 px-3 py-2 text-sm text-ink">
                <span className="font-semibold text-plate">
                  Documents needed:{" "}
                </span>
                {tx.docs_needed_note}
              </p>
            ) : null}

            {tx.notes?.trim() ? (
              <p className="mt-2 text-sm leading-relaxed text-fog">
                {tx.notes}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
