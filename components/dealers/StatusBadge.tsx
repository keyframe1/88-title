import {
  TRANSACTION_STATUS_META,
  type StatusTone,
  type TransactionStatus,
} from "@/lib/dealers/types";

// docs_needed ("attention") is plate red so it stands out; ready is the
// highlighted positive state. Default Tailwind emerald is used only here.
const toneClass: Record<StatusTone, string> = {
  neutral: "bg-mist text-fog ring-1 ring-line",
  progress: "bg-ink/5 text-ink ring-1 ring-ink/15",
  attention: "bg-plate/10 text-plate ring-1 ring-plate/30",
  ready: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300",
  done: "bg-ink text-white ring-1 ring-ink",
};

const dotClass: Record<StatusTone, string> = {
  neutral: "bg-fog",
  progress: "bg-ink",
  attention: "bg-plate",
  ready: "bg-emerald-500",
  done: "bg-white",
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const meta = TRANSACTION_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass[meta.tone]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotClass[meta.tone]}`}
        aria-hidden="true"
      />
      {meta.label}
    </span>
  );
}
