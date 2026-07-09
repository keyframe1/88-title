"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { formatBusinessDate, formatCalendarDate } from "@/lib/transactions/day";
import {
  CUSTOMER_ID_TYPE_LABEL,
  type CustomerPanelData,
  type CustomerSummary,
  type PanelHistoryEntry,
  type VehiclePanelData,
  type VehicleSummary,
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
  linkBusy,
  searchVehicles,
  searchCustomers,
  onClose,
  onOpenLinked,
  onEdit,
  onDelete,
  onLink,
  onUnlink,
  onNewLinked,
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
  /** A delete OR unlink confirm dialog is open over the panel — suspend the trap. */
  confirmOpen: boolean;
  deleteBusy: boolean;
  /** A link/unlink mutation is in flight (disables the picker's rows). */
  linkBusy: boolean;
  /** Search vehicles for the customer panel's "Link vehicle" picker. */
  searchVehicles: (query: string) => Promise<VehicleSummary[]>;
  /** Search customers for the vehicle panel's "Link customer" picker. */
  searchCustomers: (query: string) => Promise<CustomerSummary[]>;
  onClose: () => void;
  onOpenLinked: (kind: "customer" | "vehicle", id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Create an explicit link between a customer and a vehicle. */
  onLink: (customerId: string, vehicleId: string) => void;
  /** Request removal of an explicit link (console shows the confirm dialog). */
  onUnlink: (customerId: string, vehicleId: string, label: string) => void;
  /** Open the add form for the OTHER kind and link it on save. */
  onNewLinked: (kind: "customer" | "vehicle") => void;
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
              key={customer.id}
              c={customer}
              historyExpanded={historyExpanded}
              onToggleHistory={() => setHistoryExpanded((v) => !v)}
              onOpenLinked={onOpenLinked}
              onEdit={onEdit}
              onDelete={onDelete}
              deleteBusy={deleteBusy}
              error={error}
              linkBusy={linkBusy}
              searchVehicles={searchVehicles}
              onLink={onLink}
              onUnlink={onUnlink}
              onNewLinked={onNewLinked}
            />
          ) : kind === "vehicle" && vehicle ? (
            <VehicleBody
              key={vehicle.id}
              v={vehicle}
              historyExpanded={historyExpanded}
              onToggleHistory={() => setHistoryExpanded((v) => !v)}
              onOpenLinked={onOpenLinked}
              onEdit={onEdit}
              onDelete={onDelete}
              deleteBusy={deleteBusy}
              error={error}
              linkBusy={linkBusy}
              searchCustomers={searchCustomers}
              onLink={onLink}
              onUnlink={onUnlink}
              onNewLinked={onNewLinked}
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

/**
 * A clickable linked-record row (customer ⇄ vehicle cross-link). An EXPLICIT
 * (staff-made) link gets an unlink × on the right; an IMPLICIT link (derived from
 * the shared transaction history) is instead marked "via transaction" and has no
 * unlink control - you cannot un-happen a transaction. The open target and the ×
 * are sibling buttons (no nested buttons) inside one hover container.
 */
function LinkedRow({
  title,
  sub,
  mono,
  implicit,
  onOpen,
  onUnlink,
}: {
  title: string;
  sub: string;
  mono?: boolean;
  /** Transaction-derived link: marked, not unlinkable. */
  implicit?: boolean;
  onOpen: () => void;
  /** Present only for explicit links (renders the × control). */
  onUnlink?: () => void;
}) {
  return (
    <div className="group flex items-center rounded-xl border border-line bg-paper transition-colors hover:border-ink hover:bg-mist">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3.5 py-3 text-left"
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
        <span className="flex shrink-0 items-center gap-2">
          {implicit ? (
            <span className="rounded bg-ink/[0.06] px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.05em] text-fog/80">
              via transaction
            </span>
          ) : null}
          <span aria-hidden className="text-base leading-none text-fog/50">
            ›
          </span>
        </span>
      </button>
      {onUnlink ? (
        <button
          type="button"
          onClick={onUnlink}
          aria-label={`Unlink ${title}`}
          title="Unlink"
          className="mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-fog/70 transition-colors hover:bg-plate/10 hover:text-plate"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

/**
 * The inline "Link vehicle" / "Link customer" search picker inside a panel. A
 * debounced server search (the same RLS-gated records search the console uses),
 * with a "New" escape hatch that hands off to the console's add form (which links
 * on save). Already-linked ids are filtered out. Generic over the record kind.
 */
function LinkPicker<T extends { id: string }>({
  placeholder,
  search,
  excludeIds,
  renderItem,
  onPick,
  onNew,
  onClose,
  busy,
  newLabel,
}: {
  placeholder: string;
  search: (query: string) => Promise<T[]>;
  excludeIds: string[];
  renderItem: (item: T) => ReactNode;
  onPick: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
  busy: boolean;
  newLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [pending, startSearch] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      startSearch(async () => setResults(await search(query)));
    }, 200);
    return () => clearTimeout(handle);
  }, [query, search]);

  const exclude = new Set(excludeIds);
  const filtered = results.filter((item) => !exclude.has(item.id));

  return (
    <div className="mb-3 rounded-xl border border-line bg-mist/40 p-3">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus
        className="field w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
      />
      <ul className="mt-2 max-h-56 space-y-1 overflow-auto">
        {pending && filtered.length === 0 ? (
          <li className="px-1 py-2 text-xs text-fog">Searching…</li>
        ) : null}
        {!pending && filtered.length === 0 ? (
          <li className="px-1 py-2 text-xs text-fog">No matches</li>
        ) : null}
        {filtered.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onPick(item.id)}
              className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-white disabled:opacity-60"
            >
              {renderItem(item)}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
        <button
          type="button"
          onClick={onNew}
          className="text-xs font-semibold text-ink hover:text-plate"
        >
          {newLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-fog hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
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
  linkBusy,
  searchVehicles,
  onLink,
  onUnlink,
  onNewLinked,
}: {
  c: CustomerPanelData;
  historyExpanded: boolean;
  onToggleHistory: () => void;
  onOpenLinked: (kind: "customer" | "vehicle", id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteBusy: boolean;
  error: string | null;
  linkBusy: boolean;
  searchVehicles: (query: string) => Promise<VehicleSummary[]>;
  onLink: (customerId: string, vehicleId: string) => void;
  onUnlink: (customerId: string, vehicleId: string, label: string) => void;
  onNewLinked: (kind: "customer" | "vehicle") => void;
}) {
  const [linking, setLinking] = useState(false);
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
          {c.renewalDate && !c.renewalFromProfile ? (
            <span className="mt-0.5 block text-[0.65rem] text-fog/70">
              from latest check-in
            </span>
          ) : null}
        </FactTile>
      </div>

      <Divider />

      {/* Linked vehicles: explicit (staff-made) links + transaction-derived ones. */}
      <div className="mb-3.5 flex items-center justify-between">
        <span className={PANEL_TONE.sectionLabel}>
          Linked vehicles
          <span className="ml-2 tabular-nums text-fog/70">
            {c.vehicles.length}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setLinking((v) => !v)}
          aria-expanded={linking}
          className="text-xs font-semibold text-ink hover:text-plate"
        >
          {linking ? "Close" : "+ Link vehicle"}
        </button>
      </div>

      {linking ? (
        <LinkPicker<VehicleSummary>
          placeholder="Search by VIN, make, or model"
          search={searchVehicles}
          excludeIds={c.vehicles.map((v) => v.id)}
          renderItem={(v) => (
            <>
              <span className="font-semibold text-ink">{vehicleLabel(v)}</span>
              <span className="ml-2 font-mono text-xs text-fog">{v.vin}</span>
            </>
          )}
          onPick={(vehicleId) => {
            onLink(c.id, vehicleId);
            setLinking(false);
          }}
          onNew={() => {
            onNewLinked("vehicle");
            setLinking(false);
          }}
          onClose={() => setLinking(false)}
          busy={linkBusy}
          newLabel="+ New vehicle"
        />
      ) : null}

      {c.vehicles.length > 0 ? (
        <div className="space-y-2">
          {c.vehicles.map((v) => (
            <LinkedRow
              key={v.id}
              title={vehicleLabel(v)}
              sub={`VIN ····${v.vin.slice(-6)}`}
              mono
              implicit={v.linkType === "implicit"}
              onOpen={() => onOpenLinked("vehicle", v.id)}
              onUnlink={
                v.linkType === "explicit"
                  ? () => onUnlink(c.id, v.id, vehicleLabel(v))
                  : undefined
              }
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
  linkBusy,
  searchCustomers,
  onLink,
  onUnlink,
  onNewLinked,
}: {
  v: VehiclePanelData;
  historyExpanded: boolean;
  onToggleHistory: () => void;
  onOpenLinked: (kind: "customer" | "vehicle", id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteBusy: boolean;
  error: string | null;
  linkBusy: boolean;
  searchCustomers: (query: string) => Promise<CustomerSummary[]>;
  onLink: (customerId: string, vehicleId: string) => void;
  onUnlink: (customerId: string, vehicleId: string, label: string) => void;
  onNewLinked: (kind: "customer" | "vehicle") => void;
}) {
  const [linking, setLinking] = useState(false);
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

      {/* Linked customers: explicit (staff-made) links + transaction-derived ones. */}
      <div className="mb-3.5 flex items-center justify-between">
        <span className={PANEL_TONE.sectionLabel}>
          Linked customers
          <span className="ml-2 tabular-nums text-fog/70">
            {v.customers.length}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setLinking((s) => !s)}
          aria-expanded={linking}
          className="text-xs font-semibold text-ink hover:text-plate"
        >
          {linking ? "Close" : "+ Link customer"}
        </button>
      </div>

      {linking ? (
        <LinkPicker<CustomerSummary>
          placeholder="Search by name, phone, or email"
          search={searchCustomers}
          excludeIds={v.customers.map((c) => c.id)}
          renderItem={(c) => (
            <>
              <span className="font-semibold text-ink">{c.full_name}</span>
              {c.parish ? (
                <span className="ml-2 text-xs text-fog">{c.parish}</span>
              ) : null}
            </>
          )}
          onPick={(customerId) => {
            onLink(customerId, v.id);
            setLinking(false);
          }}
          onNew={() => {
            onNewLinked("customer");
            setLinking(false);
          }}
          onClose={() => setLinking(false)}
          busy={linkBusy}
          newLabel="+ New customer"
        />
      ) : null}

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
              implicit={c.linkType === "implicit"}
              onOpen={() => onOpenLinked("customer", c.id)}
              onUnlink={
                c.linkType === "explicit"
                  ? () => onUnlink(c.id, v.id, c.full_name)
                  : undefined
              }
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
