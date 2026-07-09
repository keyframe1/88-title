"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatBusinessDate, formatCalendarDate } from "@/lib/transactions/day";
import {
  CUSTOMER_ID_TYPE_LABEL,
  type CustomerPanelData,
  type PanelHistoryEntry,
  type VehiclePanelData,
} from "@/lib/records/types";
import { maskFromLast4, vehicleLabel } from "@/lib/records/normalize";
import { CopyButton } from "@/components/console/CopyButton";
import { useFocusTrap } from "@/components/console/useFocusTrap";

/**
 * The record detail panel - a right-hand drawer over the records tables where a
 * clicked customer or vehicle opens. It is presentational + local UI state only
 * (history expand): it reports intent up (open a linked record, edit, delete) and
 * the console owns the data loading and the delete confirm. Reuses the dealer
 * panel's shell contract exactly: focus moves to the close button on open, Tab is
 * trapped within the panel (suspended while the delete confirm dialog is up, so
 * that nested layer owns focus), Escape closes, and it honors prefers-reduced-
 * motion (no slide). Cross-links swap the content IN PLACE (customer ⇄ vehicle);
 * the × always closes.
 *
 * The close button lives at the SHELL level (not inside the swappable body) so it
 * never unmounts when the content changes - keyboard focus is never dropped mid-
 * swap, and the focus trap always has a stable anchor.
 */

const PANEL_TONE = {
  eyebrow: "text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-fog",
  sectionLabel:
    "text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-fog",
  factLabel: "text-[0.625rem] font-semibold uppercase tracking-[0.07em] text-fog/70",
} as const;

export function RecordPanel({
  open,
  panelKey,
  kind,
  customer,
  vehicle,
  loading,
  error,
  confirmOpen,
  deleteBusy,
  onClose,
  onOpenLinked,
  onEdit,
  onDelete,
}: {
  open: boolean;
  /** `${kind}:${id}` of the TARGET record; drives focus + history reset. */
  panelKey: string | null;
  /** The retained content's kind (kept through the slide-out). */
  kind: "customer" | "vehicle" | null;
  customer: CustomerPanelData | null;
  vehicle: VehiclePanelData | null;
  /** Data for the target is being fetched (content may be stale/absent). */
  loading: boolean;
  error: string | null;
  /** The delete confirm dialog is open over the panel — suspend the panel trap. */
  confirmOpen: boolean;
  deleteBusy: boolean;
  onClose: () => void;
  onOpenLinked: (kind: "customer" | "vehicle", id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  useFocusTrap(open && !confirmOpen, panelRef, onClose);

  // Reset the history expand whenever the target record changes (a cross-link
  // swaps the content), so a new record always starts collapsed. Adjusting state
  // during render on a key change is React's supported reset pattern (no effect).
  const [prevKey, setPrevKey] = useState(panelKey);
  if (panelKey !== prevKey) {
    setPrevKey(panelKey);
    setHistoryExpanded(false);
  }

  // Move focus to the (persistent) close button when the panel opens AND whenever
  // the target record changes (a cross-link swaps the content, so the previously
  // focused link vanishes — restart the Tab order at a stable anchor).
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open, panelKey]);

  // Whether the loaded content matches the target being shown (so a stale record
  // isn't flashed under a new header while the next one loads).
  const contentReady =
    !loading &&
    ((kind === "customer" && customer !== null) ||
      (kind === "vehicle" && vehicle !== null));

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close record"
        tabIndex={-1}
        onClick={onClose}
        className={`fixed inset-0 z-50 cursor-default bg-ink/25 transition-opacity duration-200 motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={
          kind === "vehicle"
            ? "Vehicle record"
            : kind === "customer"
              ? "Customer record"
              : "Record details"
        }
        aria-hidden={!open}
        inert={!open}
        className={`fixed right-0 top-0 z-[51] flex h-dvh w-[452px] max-w-full flex-col border-l border-line bg-paper shadow-[-18px_0_48px_rgba(20,33,61,0.14)] transition-transform duration-300 ease-[var(--ease-brand)] motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Persistent close button (never unmounts across content swaps). */}
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-xl leading-none text-fog transition-colors hover:bg-mist hover:text-ink"
        >
          ×
        </button>

        <div className="flex-1 overflow-y-auto px-6 pb-10 pt-5">
          {!contentReady ? (
            <PanelLoading error={error} />
          ) : kind === "customer" && customer ? (
            <CustomerBody
              c={customer}
              historyExpanded={historyExpanded}
              onToggleHistory={() => setHistoryExpanded((v) => !v)}
              onOpenLinked={onOpenLinked}
              onEdit={onEdit}
              onDelete={onDelete}
              deleteBusy={deleteBusy}
              error={error}
            />
          ) : kind === "vehicle" && vehicle ? (
            <VehicleBody
              v={vehicle}
              historyExpanded={historyExpanded}
              onToggleHistory={() => setHistoryExpanded((v) => !v)}
              onOpenLinked={onOpenLinked}
              onEdit={onEdit}
              onDelete={onDelete}
              deleteBusy={deleteBusy}
              error={error}
            />
          ) : null}
        </div>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared panel chrome
// ---------------------------------------------------------------------------

/** The header block (pr-10 leaves room for the shell's absolute close button). */
function PanelHeader({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta: ReactNode;
}) {
  return (
    <div className="pr-10">
      <p className={PANEL_TONE.eyebrow}>{eyebrow}</p>
      <h2 className="mt-2 font-display text-xl font-bold leading-tight text-ink">
        {title}
      </h2>
      {meta ? <div className="mt-2 text-sm text-fog">{meta}</div> : null}
    </div>
  );
}

function PanelLoading({ error }: { error: string | null }) {
  return (
    <div className="pr-10">
      <p className={PANEL_TONE.eyebrow}>Record</p>
      {error ? (
        <p role="alert" className="mt-4 text-sm font-medium text-plate">
          {error}
        </p>
      ) : (
        <>
          <div className="mt-2 h-6 w-40 animate-pulse rounded bg-ink/10" />
          <p className="mt-6 text-sm text-fog">Loading record…</p>
        </>
      )}
    </div>
  );
}

function Divider() {
  return <div className="my-5 h-px bg-line" />;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className={`mb-3.5 ${PANEL_TONE.sectionLabel}`}>{children}</p>;
}

/** A boxed labeled fact (the design's tinted tiles → mist tiles here). */
function FactTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-mist px-3.5 py-3">
      <p className={`mb-1 ${PANEL_TONE.factLabel}`}>{label}</p>
      <div className="text-sm text-ink">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: PanelHistoryEntry["status"] }) {
  const voided = status === "voided";
  const label =
    status === "open" ? "Open" : status === "completed" ? "Completed" : "Voided";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
        voided
          ? "border-plate/30 bg-plate/5 text-plate"
          : "border-ink/15 bg-mist text-ink"
      }`}
    >
      {label}
    </span>
  );
}

/** The record's recent transaction history: ~5 rows, with a View all toggle. */
function History({
  entries,
  expanded,
  onToggle,
}: {
  entries: PanelHistoryEntry[];
  expanded: boolean;
  onToggle: () => void;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-fog">No history yet.</p>;
  }
  const shown = expanded ? entries : entries.slice(0, 5);
  const hasMore = entries.length > 5;
  return (
    <>
      <div className="flex flex-col">
        {shown.map((h) => (
          <div
            key={h.id}
            className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{h.serviceLabel}</p>
              <p className="text-xs tabular-nums text-fog">
                {formatBusinessDate(h.created_at)}
              </p>
            </div>
            <StatusBadge status={h.status} />
          </div>
        ))}
      </div>
      {hasMore ? (
        <button
          type="button"
          onClick={onToggle}
          className="btn btn--secondary btn--sm mt-3"
        >
          {expanded ? "Show less" : `View all ${entries.length}`}
        </button>
      ) : null}
    </>
  );
}

/** A clickable linked-record row (customer ⇄ vehicle cross-link). */
function LinkedRow({
  title,
  sub,
  mono,
  onOpen,
}: {
  title: string;
  sub: string;
  mono?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3.5 py-3 text-left transition-colors hover:border-ink hover:bg-mist"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">
          {title}
        </span>
        <span
          className={`block truncate text-xs text-fog ${mono ? "font-mono" : ""}`}
        >
          {sub}
        </span>
      </span>
      <span aria-hidden className="shrink-0 text-base leading-none text-fog/50">
        ›
      </span>
    </button>
  );
}

/** The Edit + Delete action row shared by both panel bodies. */
function PanelActions({
  onEdit,
  onDelete,
  deleteBusy,
  error,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleteBusy: boolean;
  error: string | null;
}) {
  return (
    <>
      <div className="my-5 h-px bg-line" />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="btn btn--secondary flex-1"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleteBusy}
          className="btn btn--danger"
        >
          Delete
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-plate">
          {error}
        </p>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Customer body
// ---------------------------------------------------------------------------

function CustomerBody({
  c,
  historyExpanded,
  onToggleHistory,
  onOpenLinked,
  onEdit,
  onDelete,
  deleteBusy,
  error,
}: {
  c: CustomerPanelData;
  historyExpanded: boolean;
  onToggleHistory: () => void;
  onOpenLinked: (kind: "customer" | "vehicle", id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteBusy: boolean;
  error: string | null;
}) {
  const place = [c.parish ? `${c.parish} Parish` : null, c.city]
    .filter(Boolean)
    .join(" · ");
  const phoneHref = c.phone ? `tel:${c.phone.replace(/[^0-9+]/g, "")}` : "";

  return (
    <div>
      <PanelHeader
        eyebrow="Customer"
        title={c.full_name}
        meta={place || <span className="italic">No domicile on file</span>}
      />

      <Divider />

      {/* Contact */}
      <SectionLabel>Contact</SectionLabel>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-mist px-3.5 py-2.5">
          <div className="min-w-0">
            <p className={PANEL_TONE.factLabel}>Email</p>
            <p className="truncate text-sm text-ink">
              {c.email ?? <span className="text-fog">Not on file</span>}
            </p>
          </div>
          {c.email ? <CopyButton value={c.email} label="email" /> : null}
        </div>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-mist px-3.5 py-2.5">
          <div className="min-w-0">
            <p className={PANEL_TONE.factLabel}>Phone</p>
            {c.phone ? (
              <a
                href={phoneHref}
                className="text-sm tabular-nums text-ink underline-offset-2 hover:text-plate hover:underline"
              >
                {c.phone}
              </a>
            ) : (
              <p className="text-sm text-fog">Not on file</p>
            )}
          </div>
          {c.phone ? (
            <div className="flex shrink-0 items-center gap-1">
              <a href={phoneHref} className="btn btn--secondary btn--sm">
                Call
              </a>
              <CopyButton value={c.phone} label="phone" />
            </div>
          ) : null}
        </div>
      </div>

      <Divider />

      {/* ID + Renewal */}
      <div className="grid grid-cols-2 gap-2">
        <FactTile label="Identification">
          {c.id_last4 ? (
            <span>
              {c.id_type ? CUSTOMER_ID_TYPE_LABEL[c.id_type] : "ID"}{" "}
              <span className="font-mono text-fog">
                {maskFromLast4(c.id_last4)}
              </span>
            </span>
          ) : (
            <span className="text-fog">Not recorded</span>
          )}
        </FactTile>
        <FactTile label="Renewal">
          <span className="tabular-nums">
            {c.renewalDate ? (
              formatCalendarDate(c.renewalDate)
            ) : (
              <span className="text-fog">Not on file</span>
            )}
          </span>
          <span className="mt-1 flex items-center gap-1.5">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                c.consent ? "bg-[#3f8f5b]" : "bg-line"
              }`}
            />
            <span className="text-xs text-fog">
              {c.consent ? "Consented to reminders" : "No consent"}
            </span>
          </span>
        </FactTile>
      </div>

      <Divider />

      {/* Linked vehicles */}
      <div className="mb-3.5 flex items-center justify-between">
        <span className={PANEL_TONE.sectionLabel}>Linked vehicles</span>
        <span className="text-xs tabular-nums text-fog/70">
          {c.vehicles.length}
        </span>
      </div>
      {c.vehicles.length > 0 ? (
        <div className="space-y-2">
          {c.vehicles.map((v) => (
            <LinkedRow
              key={v.id}
              title={vehicleLabel(v)}
              sub={`VIN ····${v.vin.slice(-6)}`}
              mono
              onOpen={() => onOpenLinked("vehicle", v.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-fog">No vehicles on file.</p>
      )}

      <Divider />

      {/* History */}
      <SectionLabel>History</SectionLabel>
      <History
        entries={c.history}
        expanded={historyExpanded}
        onToggle={onToggleHistory}
      />

      <PanelActions
        onEdit={onEdit}
        onDelete={onDelete}
        deleteBusy={deleteBusy}
        error={error}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vehicle body
// ---------------------------------------------------------------------------

function VehicleBody({
  v,
  historyExpanded,
  onToggleHistory,
  onOpenLinked,
  onEdit,
  onDelete,
  deleteBusy,
  error,
}: {
  v: VehiclePanelData;
  historyExpanded: boolean;
  onToggleHistory: () => void;
  onOpenLinked: (kind: "customer" | "vehicle", id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteBusy: boolean;
  error: string | null;
}) {
  const bodyColor = [v.body_style, v.color].filter(Boolean).join(" · ");

  return (
    <div>
      <PanelHeader
        eyebrow="Vehicle"
        title={vehicleLabel(v)}
        meta={bodyColor || <span className="italic">No details on file</span>}
      />

      <Divider />

      {/* VIN */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-mist px-3.5 py-2.5">
        <div className="min-w-0">
          <p className={PANEL_TONE.factLabel}>VIN</p>
          <p className="truncate font-mono text-sm tracking-wide text-ink">
            {v.vin}
          </p>
        </div>
        <CopyButton value={v.vin} label="VIN" />
      </div>

      <Divider />

      {/* Details */}
      <SectionLabel>Details</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <FactTile label="Body">
          {v.body_style ?? <span className="text-fog">n/a</span>}
        </FactTile>
        <FactTile label="Color">
          {v.color ?? <span className="text-fog">n/a</span>}
        </FactTile>
      </div>

      <Divider />

      {/* Linked customers */}
      <div className="mb-3.5 flex items-center justify-between">
        <span className={PANEL_TONE.sectionLabel}>Linked customers</span>
        <span className="text-xs tabular-nums text-fog/70">
          {v.customers.length}
        </span>
      </div>
      {v.customers.length > 0 ? (
        <div className="space-y-2">
          {v.customers.map((c) => (
            <LinkedRow
              key={c.id}
              title={c.full_name}
              sub={
                c.parish
                  ? `${c.parish} Parish`
                  : c.city
                    ? c.city
                    : "No domicile on file"
              }
              onOpen={() => onOpenLinked("customer", c.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-fog">No customers on file.</p>
      )}

      <Divider />

      {/* History */}
      <SectionLabel>History</SectionLabel>
      <History
        entries={v.history}
        expanded={historyExpanded}
        onToggle={onToggleHistory}
      />

      <PanelActions
        onEdit={onEdit}
        onDelete={onDelete}
        deleteBusy={deleteBusy}
        error={error}
      />
    </div>
  );
}
