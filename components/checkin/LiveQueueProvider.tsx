"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { CheckinQueueRow } from "@/lib/checkin/types";

/**
 * Shared live-queue data source. Holds ONE realtime subscription to the PII-free
 * public.checkin_queue view and hands the rows to any descendant via context, so
 * the hero status line and the compact board on the homepage read the same live
 * data without opening two identical subscriptions.
 *
 * It is opt-in: components that aren't wrapped (the lobby, the status page) keep
 * self-subscribing exactly as before. The subscription is only a "something
 * changed, refetch" trigger; the event payload is ignored and anon is
 * column-restricted regardless.
 */
const QUEUE_COLUMNS =
  "ticket_code, service_type, status, created_at, queue_position";

export interface LiveQueueValue {
  rows: CheckinQueueRow[];
  /** True once the first fetch has resolved, so consumers can avoid flashing a
   *  premature "no wait" before the real count arrives. */
  ready: boolean;
}

const LiveQueueContext = createContext<LiveQueueValue | null>(null);

/** The shared live queue, or null when no provider is present above. */
export function useLiveQueue(): LiveQueueValue | null {
  return useContext(LiveQueueContext);
}

export function LiveQueueProvider({
  initialRows = [],
  children,
}: {
  initialRows?: CheckinQueueRow[];
  children: ReactNode;
}) {
  const [rows, setRows] = useState<CheckinQueueRow[]>(initialRows);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function refetch() {
      const { data } = await supabase
        .from("checkin_queue")
        .select(QUEUE_COLUMNS)
        .order("queue_position", { ascending: true })
        .order("created_at", { ascending: true });
      if (!active) return;
      if (data) setRows(data);
      setReady(true);
    }

    refetch();

    const channel = supabase
      .channel("public-live-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkins" },
        () => {
          refetch();
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <LiveQueueContext.Provider value={{ rows, ready }}>
      {children}
    </LiveQueueContext.Provider>
  );
}
