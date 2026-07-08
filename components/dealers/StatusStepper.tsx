import {
  TRANSACTION_STATUSES,
  TRANSACTION_STATUS_META,
  statusStepIndex,
  type TransactionStatus,
} from "@/lib/dealers/types";

/**
 * The stepped status indicator: five segments filled through the current stage,
 * plus the stage label. The whole pipeline is legible at a glance — a dealer
 * sees how far along a deal is without reading. Presentational and server-safe
 * (no hooks), so both the dealer board and the staff console share it.
 *
 * The bar goes emerald at "ready for pickup" (the come-get-it signal) and stays
 * ink through the working stages and pickup. Attention is a separate flag drawn
 * by the row, not here — this component always reflects pipeline position.
 */
export function StatusStepper({
  status,
  className,
}: {
  status: TransactionStatus;
  className?: string;
}) {
  const current = statusStepIndex(status);
  const meta = TRANSACTION_STATUS_META[status];
  const isReady = status === "ready_for_pickup";
  const isDone = status === "picked_up";
  const fill = isReady ? "bg-emerald-500" : "bg-ink";

  return (
    <span
      className={`inline-flex items-center gap-2 ${className ?? ""}`}
      role="img"
      aria-label={`Status: ${meta.label}, step ${current + 1} of ${TRANSACTION_STATUSES.length}`}
      title={meta.description}
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        {TRANSACTION_STATUSES.map((step, i) => (
          <span
            key={step}
            className={`h-1.5 w-4 rounded-full transition-colors ${
              i <= current ? fill : "bg-line"
            }`}
          />
        ))}
      </span>
      <span
        aria-hidden="true"
        className={`whitespace-nowrap text-xs font-semibold ${
          isReady ? "text-emerald-700" : isDone ? "text-fog" : "text-ink"
        }`}
      >
        {meta.label}
      </span>
    </span>
  );
}
