"use client";

import {
  CHECKIN_STATUS_META,
  type CheckinStatus,
  type CheckinTone,
} from "@/lib/checkin/types";
import { useUi } from "@/lib/i18n/client";

// Customer queue statuses. "serving" (you're up) is the plate-red highlight —
// the moment that matters most; "done" is the solid ink confirmation. The tone
// is language-neutral (from CHECKIN_STATUS_META); the label is localized.
const toneClass: Record<CheckinTone, string> = {
  waiting: "bg-mist text-fog ring-1 ring-line",
  serving: "bg-plate/10 text-plate ring-1 ring-plate/30",
  done: "bg-ink text-white ring-1 ring-ink",
  cancelled: "bg-mist text-fog/70 ring-1 ring-line",
};

const dotClass: Record<CheckinTone, string> = {
  waiting: "bg-fog",
  serving: "bg-plate",
  done: "bg-white",
  cancelled: "bg-fog/60",
};

export function StatusPill({
  status,
  className = "",
}: {
  status: CheckinStatus;
  className?: string;
}) {
  const ui = useUi();
  const tone = CHECKIN_STATUS_META[status].tone;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass[tone]} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotClass[tone]}`}
        aria-hidden="true"
      />
      {ui.checkinStatus[status].label}
    </span>
  );
}
