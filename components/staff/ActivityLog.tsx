"use client";

import { useState, useTransition } from "react";
import { getActivityPageAction } from "@/lib/activity/actions";
import {
  ACTIVITY_ENTITY_LABEL,
  ACTIVITY_ENTITY_TYPES,
  ACTIVITY_PAGE_SIZE,
  type ActivityEntityType,
  type ActivityPage,
} from "@/lib/activity/types";
import { formatBusinessDateTime } from "@/lib/transactions/day";

/**
 * The Activity sub-view (client): the append-only staff activity trail, newest
 * first, with an entity-type filter and simple paging (50 per page). Read-only
 * by design — there is deliberately no export here (the ledger is the exportable
 * record). Rows show when it happened, who did it (a resolved staff name, never a
 * UUID), and a one-line summary; a small chip tags the entity type.
 */
export function ActivityLog({
  initial,
  unavailable,
}: {
  initial: ActivityPage;
  unavailable: boolean;
}) {
  const [entityType, setEntityType] = useState<ActivityEntityType | null>(null);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<ActivityPage>(initial);
  const [pending, startTransition] = useTransition();

  function load(nextType: ActivityEntityType | null, nextPage: number) {
    setEntityType(nextType);
    setPage(nextPage);
    startTransition(async () => {
      setData(await getActivityPageAction(nextType, nextPage));
    });
  }

  if (unavailable) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-line bg-white p-6">
        <h2 className="font-display text-lg font-extrabold text-ink">
          Activity is not available yet
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-fog">
          The activity log could not be read. Apply migration
          20260627120000_activity_log.sql to this environment, then reload.
        </p>
      </div>
    );
  }

  const { rows, hasMore } = data;

  return (
    <div className="mt-6 flex flex-col gap-5">
      {/* Filter */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block">
          <span className="block text-sm font-semibold text-ink">
            Entity type
          </span>
          <select
            value={entityType ?? ""}
            onChange={(event) =>
              load(
                event.target.value
                  ? (event.target.value as ActivityEntityType)
                  : null,
                0,
              )
            }
            className="mt-1 rounded-xl border border-line bg-white px-3 py-2.5 font-semibold text-ink focus:border-ink focus:outline-none"
          >
            <option value="">All activity</option>
            {ACTIVITY_ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {ACTIVITY_ENTITY_LABEL[type]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-fog">
          Read-only trail · {ACTIVITY_PAGE_SIZE} per page
        </p>
      </div>

      {/* Activity table (scrolls horizontally on a phone). */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-mist text-left text-xs uppercase tracking-wide text-fog">
              <th className="px-3 py-2.5 font-semibold">When</th>
              <th className="px-3 py-2.5 font-semibold">Who</th>
              <th className="px-3 py-2.5 font-semibold">Type</th>
              <th className="px-3 py-2.5 font-semibold">Activity</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-10 text-center text-sm text-fog"
                >
                  {pending ? "Loading…" : "No activity recorded yet."}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-line align-top text-ink"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 text-fog">
                    {formatBusinessDateTime(r.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                    {r.actorName}
                  </td>
                  <td className="px-3 py-2.5">
                    <EntityChip type={r.entity_type} />
                  </td>
                  <td className="px-3 py-2.5">{r.summary}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => load(entityType, page - 1)}
          disabled={pending || page === 0}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50"
        >
          ← Newer
        </button>
        <span className="text-sm font-medium text-fog">Page {page + 1}</span>
        <button
          type="button"
          onClick={() => load(entityType, page + 1)}
          disabled={pending || !hasMore}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50"
        >
          Older →
        </button>
      </div>
    </div>
  );
}

/** A small, muted chip naming the entity type an activity row touched. */
export function EntityChip({ type }: { type: ActivityEntityType }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-ink/15 bg-mist px-2 py-0.5 text-xs font-semibold text-ink">
      {ACTIVITY_ENTITY_LABEL[type]}
    </span>
  );
}
