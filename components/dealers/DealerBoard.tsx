"use client";

import { useMemo, useState } from "react";
import { CopyButton } from "@/components/console/CopyButton";
import { EmptyState } from "@/components/EmptyState";
import { StatusStepper } from "./StatusStepper";
import { StatusBadge } from "./StatusBadge";
import { describeVehicle, type DealerTransaction } from "@/lib/dealers/types";

/**
 * The dealer's outstanding-work board — the title clerk's actual artifact.
 *
 * Active work (everything not yet picked up) leads as dense, scannable rows:
 * stock number, vehicle, type, a stepped status indicator, and days since it was
 * filed. A raised attention flag turns the row red with the staff's note; a
 * ready-for-pickup row goes green — the "come get it" signal. Filter chips slice
 * the active list; picked-up history is tucked into a collapsed section so the
 * board stays about what still needs doing.
 *
 * Read-only: dealers cannot change status here (that is staff-gated at the
 * database). This component only renders what the server handed it.
 */

type Filter = "all" | "in_progress" | "ready" | "attention";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function filedOn(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
}

/** Whole days between the filing date and now, floored at 0. */
function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  const ms = Date.now() - then;
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function ageLabel(iso: string): string {
  const d = daysSince(iso);
  if (d === 0) return "Today";
  if (d === 1) return "1 day";
  return `${d} days`;
}

function isWorking(tx: DealerTransaction): boolean {
  return (
    tx.status === "submitted" ||
    tx.status === "received" ||
    tx.status === "in_progress"
  );
}

export function DealerBoard({
  transactions,
}: {
  transactions: DealerTransaction[];
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const active = useMemo(
    () => transactions.filter((tx) => tx.status !== "picked_up"),
    [transactions],
  );
  const history = useMemo(
    () => transactions.filter((tx) => tx.status === "picked_up"),
    [transactions],
  );

  const counts = useMemo(
    () => ({
      all: active.length,
      in_progress: active.filter(isWorking).length,
      ready: active.filter((tx) => tx.status === "ready_for_pickup").length,
      attention: active.filter((tx) => tx.needs_attention).length,
    }),
    [active],
  );

  const shown = useMemo(() => {
    switch (filter) {
      case "in_progress":
        return active.filter(isWorking);
      case "ready":
        return active.filter((tx) => tx.status === "ready_for_pickup");
      case "attention":
        return active.filter((tx) => tx.needs_attention);
      default:
        return active;
    }
  }, [active, filter]);

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "in_progress", label: "In progress", count: counts.in_progress },
    { key: "ready", label: "Ready for pickup", count: counts.ready },
    { key: "attention", label: "Needs attention", count: counts.attention },
  ];

  return (
    <div>
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter work">
        {chips.map((chip) => {
          const on = filter === chip.key;
          const attention = chip.key === "attention" && chip.count > 0;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                on
                  ? "border-ink bg-ink text-white"
                  : attention
                    ? "border-plate/30 bg-plate/5 text-plate hover:border-plate/50"
                    : "border-line bg-white text-fog hover:border-ink/40 hover:text-ink"
              }`}
            >
              {chip.label}
              <span
                className={`tabular-nums ${on ? "text-white/70" : "text-fog/70"}`}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active list */}
      <div className="mt-4">
        {shown.length === 0 ? (
          active.length === 0 ? (
            <EmptyState
              title="No active transactions"
              description="Everything here has been picked up. File a new one whenever you're ready."
              action={
                <a href="#file-transaction" className="btn btn--primary btn--sm">
                  File a transaction
                </a>
              }
            />
          ) : (
            <EmptyState
              size="compact"
              title="Nothing in this view"
              description="No transactions match this filter right now."
            />
          )
        ) : (
          <ul className="console-list">
            {shown.map((tx) => (
              <ActiveRow key={tx.id} tx={tx} />
            ))}
          </ul>
        )}
      </div>

      {/* Picked-up history */}
      {history.length > 0 ? (
        <details className="mt-6 group">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-fog transition-colors hover:text-ink">
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="h-4 w-4 transition-transform group-open:rotate-90"
              fill="currentColor"
            >
              <path d="M7 5l6 5-6 5V5z" />
            </svg>
            Picked up
            <span className="tabular-nums text-fog/70">{history.length}</span>
          </summary>
          <ul className="console-list mt-3">
            {history.map((tx) => (
              <HistoryRow key={tx.id} tx={tx} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function ActiveRow({ tx }: { tx: DealerTransaction }) {
  const stock = tx.stock_number?.trim();
  const vehicle = describeVehicle(tx);
  const type = tx.transaction_type?.trim();
  const attention = tx.needs_attention;
  const ready = tx.status === "ready_for_pickup";

  // Attention (the alarm) wins the accent; ready is the positive highlight.
  const accent = attention
    ? "border-l-plate bg-plate/[0.03]"
    : ready
      ? "border-l-emerald-400 bg-emerald-50/40"
      : "border-l-transparent";

  return (
    <li
      className={`console-row group flex flex-col gap-2 border-l-4 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${accent}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {stock ? (
            <span className="inline-flex items-center gap-1">
              <span className="font-mono text-sm font-bold tabular-nums text-ink">
                #{stock}
              </span>
              <CopyButton value={stock} label="stock number" />
            </span>
          ) : (
            <span className="text-sm font-semibold text-fog">No stock #</span>
          )}
          <span className="font-display text-base font-extrabold text-ink">
            {vehicle}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-fog">
          {type || "Type to be confirmed"}
          <span className="px-1.5 text-line">·</span>
          Filed {filedOn(tx.created_at)}
          <span className="px-1.5 text-line">·</span>
          {ageLabel(tx.created_at)}
        </p>
        {attention ? (
          <p className="mt-2 rounded-lg border-l-4 border-plate bg-plate/5 px-3 py-2 text-sm text-ink">
            <span className="font-semibold text-plate">Needs attention: </span>
            {tx.attention_note?.trim() ||
              "We flagged this transaction. Call us and we'll walk you through it."}
          </p>
        ) : null}
        {tx.notes?.trim() ? (
          <p className="mt-1.5 text-sm leading-relaxed text-fog">{tx.notes}</p>
        ) : null}
      </div>

      <div className="shrink-0 sm:text-right">
        <StatusStepper status={tx.status} />
      </div>
    </li>
  );
}

function HistoryRow({ tx }: { tx: DealerTransaction }) {
  const stock = tx.stock_number?.trim();
  const vehicle = describeVehicle(tx);
  return (
    <li className="console-row flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">
          {stock ? (
            <span className="font-mono tabular-nums">#{stock} </span>
          ) : null}
          {vehicle}
        </p>
        <p className="text-xs text-fog">
          {tx.transaction_type?.trim() || "Transaction"}
          <span className="px-1.5 text-line">·</span>
          Filed {filedOn(tx.created_at)}
        </p>
      </div>
      <StatusBadge status={tx.status} />
    </li>
  );
}
