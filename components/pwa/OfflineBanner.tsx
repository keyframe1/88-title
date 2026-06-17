"use client";

import { useOnline } from "@/lib/hooks/use-client";

/**
 * A quiet, non-blocking notice that the device is offline, so a customer
 * watching the live line understands why it stopped moving. Renders nothing
 * while online. Never replaces content — the last-known data stays on screen.
 */
export function OfflineBanner({ className = "" }: { className?: string }) {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      role="status"
      className={`flex items-center gap-2.5 rounded-xl border border-line bg-mist px-4 py-2.5 text-sm text-fog ${className}`}
    >
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-plate" />
      <span>
        You&rsquo;re offline. Live updates are paused and will resume the moment
        you reconnect.
      </span>
    </div>
  );
}
