"use client";

import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type InputHTMLAttributes,
} from "react";
import {
  createCustomer,
  createVehicle,
  deleteCustomer,
  deleteVehicle,
  loadCustomerForEdit,
  loadVehicleForEdit,
  recentRecordsAction,
  searchRecordsAction,
  updateCustomer,
  updateVehicle,
} from "@/lib/records/actions";
import {
  isStandardVin,
  maskFromLast4,
  vehicleLabel,
} from "@/lib/records/normalize";
import { decodeVin } from "@/lib/vin";
import { CopyButton } from "@/components/console/CopyButton";
import {
  CUSTOMER_ID_TYPES,
  CUSTOMER_ID_TYPE_LABEL,
  EMPTY_ASSOCIATIONS,
  type CustomerEditData,
  type CustomerFormState,
  type CustomerSummary,
  type RecordsSearchResult,
  type Vehicle,
  type VehicleFormState,
  type VehicleSummary,
} from "@/lib/records/types";

/**
 * Staff-only customer & vehicle records console (client).
 *
 * Search records by name or VIN; add, edit, or delete a customer or vehicle.
 * Adds are match-and-reuse (a customer is reused on name + matching email/phone,
 * a vehicle on its VIN), so repeats are never duplicated; edits update the row in
 * place (by id), so fixing a typo never spawns a duplicate. Deleting nulls the
 * checkins / dealer_transactions links (ON DELETE SET NULL) rather than breaking
 * them. The add/edit vehicle form can decode a VIN against NHTSA's free vPIC API.
 * Everything here is gated server-side by is_staff() + RLS; no record data is
 * customer-facing, and the full ID number is never sent to the browser.
 */
export function RecordsConsole({
  recent: initialRecent,
  parishOptions,
}: {
  recent: RecordsSearchResult;
  parishOptions: string[];
}) {
  // Search-first: the console opens on `recent` (the newest records). Typing runs
  // the capped, RLS-gated DAL search and its results REPLACE the recent lists;
  // clearing the box returns to recent. The full table never renders.
  const [recent, setRecent] = useState<RecordsSearchResult>(initialRecent);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] =
    useState<RecordsSearchResult | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [openForm, setOpenForm] = useState<null | "customer" | "vehicle">(null);
  const [editing, setEditing] = useState<
    | { kind: "customer"; data: CustomerEditData }
    | { kind: "vehicle"; data: Vehicle }
    | null
  >(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const editRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed === "") {
      setSearchResults(null);
      return;
    }
    startSearch(async () => {
      setSearchResults(await searchRecordsAction(trimmed));
    });
  }, []);

  const refreshRecent = useCallback(() => {
    startSearch(async () => {
      setRecent(await recentRecordsAction());
    });
  }, []);

  // Debounced search as the clerk types. runSearch clears results for an empty
  // box (returning to the recent view) or runs the capped DAL search otherwise.
  // The state update happens inside the timeout (never synchronously in the
  // effect body), matching the record picker's typeahead.
  useEffect(() => {
    const handle = setTimeout(
      () => runSearch(query),
      query.trim() === "" ? 0 : 200,
    );
    return () => clearTimeout(handle);
  }, [query, runSearch]);

  // After any add / edit / delete: flash, close the open form, refresh the recent
  // list, and re-run the active search (if any) so the visible view stays current.
  const finish = useCallback(
    (message: string) => {
      setFlash(message);
      setOpenForm(null);
      setEditing(null);
      refreshRecent();
      if (query.trim() !== "") runSearch(query);
    },
    [refreshRecent, runSearch, query],
  );

  const openAdd = useCallback((kind: "customer" | "vehicle") => {
    setEditing(null);
    setFlash(null);
    setOpenForm((cur) => (cur === kind ? null : kind));
  }, []);

  const requestEditCustomer = useCallback(async (id: string) => {
    setFlash(null);
    setEditLoadingId(id);
    try {
      const data = await loadCustomerForEdit(id);
      if (!data) {
        setFlash("Could not open that customer for editing.");
        return;
      }
      setOpenForm(null);
      setEditing({ kind: "customer", data });
    } finally {
      setEditLoadingId(null);
    }
  }, []);

  const requestEditVehicle = useCallback(async (id: string) => {
    setFlash(null);
    setEditLoadingId(id);
    try {
      const data = await loadVehicleForEdit(id);
      if (!data) {
        setFlash("Could not open that vehicle for editing.");
        return;
      }
      setOpenForm(null);
      setEditing({ kind: "vehicle", data });
    } finally {
      setEditLoadingId(null);
    }
  }, []);

  // Bring the edit form into view when it opens (honors reduced motion).
  useEffect(() => {
    if (!editing || !editRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    editRef.current.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [editing]);

  // Which lists to render: search results while there's a query, else recent.
  const showingSearch = query.trim().length > 0;
  const awaitingResults = showingSearch && searchResults === null;
  const results: RecordsSearchResult = showingSearch
    ? (searchResults ?? {
        customers: [],
        vehicles: [],
        associations: EMPTY_ASSOCIATIONS,
      })
    : recent;
  const associations = results.associations ?? EMPTY_ASSOCIATIONS;

  // A label on the group header row is earned only while a search is active
  // ("Results for …"). At rest there is no standing "Most recent" caption — the
  // count carries the section's identity and the note under the search box
  // explains that the default view is the most-recent records.
  const caption = showingSearch ? `Results for “${query.trim()}”` : null;

  return (
    <div className="space-y-6">
      {/* Data-first header: the page title, and the two Add actions on the right.
          They are peers (add a customer / add a vehicle), so they carry the SAME
          visual weight — two secondary buttons, no false primary/secondary
          hierarchy between them. Always visible; each toggles its add form open. */}
      <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold sm:text-3xl">
            Customer &amp; vehicle records
          </h1>
          <p className="mt-1 text-sm text-fog">
            Saved customers and vehicles. Enter someone once, reuse them on the
            Transaction tab.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openAdd("customer")}
            aria-expanded={openForm === "customer"}
            className="btn btn--secondary"
          >
            + Add customer
          </button>
          <button
            type="button"
            onClick={() => openAdd("vehicle")}
            aria-expanded={openForm === "vehicle"}
            className="btn btn--secondary"
          >
            + Add vehicle
          </button>
        </div>
      </header>

      {/* Demoted search: a quiet instrument sitting on the data, below the
          actions, not a hero above them. It searches on input. The note beneath
          explains the default view (most-recent) so the group headers no longer
          need a standing "Most recent" label; a search-only "Results for …" label
          appears in the header row while a query is active. */}
      <div className="space-y-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            runSearch(query);
          }}
          className="flex items-center gap-3"
          role="search"
        >
          <label className="relative block flex-1 sm:max-w-sm">
            <span className="sr-only">Search by name or VIN</span>
            <SearchGlyph />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or VIN"
              className="field w-full rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </label>
          {isSearching ? (
            <span className="shrink-0 text-xs text-fog">Searching…</span>
          ) : null}
        </form>
        {showingSearch ? null : (
          <p className="text-xs text-fog">
            Showing the most recent. Search by name or VIN to find anyone else.
          </p>
        )}
      </div>

      {flash ? (
        <p
          role="status"
          className="rounded-lg border border-ink/20 bg-mist px-3 py-2 text-sm font-medium text-ink"
        >
          {flash}
        </p>
      ) : null}

      {/* Add forms (transient; above the data so the surface stays continuous) */}
      {openForm === "customer" ? (
        <CustomerForm
          mode="create"
          parishOptions={parishOptions}
          onDone={finish}
          onCancel={() => setOpenForm(null)}
        />
      ) : null}
      {openForm === "vehicle" ? (
        <VehicleForm
          mode="create"
          onDone={finish}
          onCancel={() => setOpenForm(null)}
        />
      ) : null}

      {/* Edit form (one record at a time). Keyed by id so switching records
          re-mounts the form with fresh prefilled values. */}
      {editing ? (
        <div ref={editRef}>
          {editing.kind === "customer" ? (
            <CustomerForm
              key={editing.data.id}
              mode="edit"
              initial={editing.data}
              parishOptions={parishOptions}
              onDone={finish}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <VehicleForm
              key={editing.data.id}
              mode="edit"
              initial={editing.data}
              onDone={finish}
              onCancel={() => setEditing(null)}
            />
          )}
        </div>
      ) : null}

      {/* ONE continuous surface: both groups as flat, full-width tables. A group
          header row per object (CUSTOMERS · N), aligned columns that both objects
          share, hairline dividers between rows, and a subtle hover tint. No
          per-row or per-section cards. Stacks cleanly to one column at 375px. */}
      <div className="console-list">
        {/* Customers */}
        <GroupHeader
          id="records-customers"
          heading="Customers"
          count={results.customers.length}
          caption={caption}
        />
        <ColumnHeader labels={["Name", "Contact", "ID", "Last vehicle"]} />
        <ul>
          {results.customers.length === 0 ? (
            <EmptyRow>
              {awaitingResults
                ? "Searching…"
                : showingSearch
                  ? "No customers match your search."
                  : "No customers yet. Use + Add customer."}
            </EmptyRow>
          ) : (
            results.customers.map((c) => (
              <CustomerRow
                key={c.id}
                c={c}
                hint={associations.customerVehicle[c.id]}
                editLoading={editLoadingId === c.id}
                onEdit={() => void requestEditCustomer(c.id)}
                onDeleted={finish}
              />
            ))
          )}
        </ul>
        {showingSearch && results.customersCapped ? <CappedRow /> : null}

        {/* Vehicles */}
        <GroupHeader
          id="records-vehicles"
          heading="Vehicles"
          count={results.vehicles.length}
          caption={caption}
          separated
        />
        <ColumnHeader labels={["Vehicle", "VIN", "Details", "Last customer"]} />
        <ul>
          {results.vehicles.length === 0 ? (
            <EmptyRow>
              {awaitingResults
                ? "Searching…"
                : showingSearch
                  ? "No vehicles match your search."
                  : "No vehicles yet. Use + Add vehicle."}
            </EmptyRow>
          ) : (
            results.vehicles.map((v) => (
              <VehicleRow
                key={v.id}
                v={v}
                hint={associations.vehicleCustomer[v.id]}
                editLoading={editLoadingId === v.id}
                onEdit={() => void requestEditVehicle(v.id)}
                onDeleted={finish}
              />
            ))
          )}
        </ul>
        {showingSearch && results.vehiclesCapped ? <CappedRow /> : null}
      </div>
    </div>
  );
}

/** The quiet magnifier inside the demoted search field. */
function SearchGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fog"
    >
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m13.5 13.5 3 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * A group's section header row (CUSTOMERS · 12): the object name in small muted
 * caps with a tabular count. The count carries the section's identity, so the
 * right slot stays empty at rest; it holds a "Results for …" label ONLY while a
 * search is active (`caption` set). `separated` draws the hairline that starts a
 * new group inside the shared surface.
 */
function GroupHeader({
  id,
  heading,
  count,
  caption,
  separated = false,
}: {
  id: string;
  heading: string;
  count: number;
  caption: string | null;
  separated?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 bg-mist/60 px-4 py-2.5 ${
        separated ? "border-t border-line" : ""
      }`}
    >
      <h2
        id={id}
        className="text-xs font-semibold uppercase tracking-[0.08em] text-fog"
      >
        {heading}
        <span className="ml-1.5 font-normal tabular-nums text-fog/60">
          · {count}
        </span>
      </h2>
      {caption ? <p className="console-caption">{caption}</p> : null}
    </div>
  );
}

/** The aligned micro-label column header for a group (desktop only; on a phone
 *  the rows stack and each cell labels itself). */
function ColumnHeader({
  labels,
}: {
  labels: [string, string, string, string];
}) {
  return (
    <div
      className={`hidden border-t border-line px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-wide text-fog/70 sm:grid ${RECORD_GRID_COLS}`}
    >
      <span>{labels[0]}</span>
      <span>{labels[1]}</span>
      <span>{labels[2]}</span>
      <span>{labels[3]}</span>
      <span className="text-right">Actions</span>
    </div>
  );
}

/** A single quiet row when a group is empty (kept inside the surface). */
function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="border-t border-line px-4 py-6 text-sm text-fog">
      {children}
    </li>
  );
}

/** The refine-on-cap note, styled as a subtle full-width row in the surface. */
function CappedRow() {
  return (
    <p
      role="status"
      className="border-t border-line bg-mist/40 px-4 py-2.5 text-xs text-fog"
    >
      Showing the first matches only. Add more to the name or VIN to narrow this
      down.
    </p>
  );
}

// ---------------------------------------------------------------------------
// Record rows (dense, aligned columns, with quiet copy + Edit / Delete)
//
// Each row is one grid: it stacks on a phone and resolves into aligned columns
// at sm+. The row is a `group` so the low-emphasis copy icons ink in on row
// hover / focus. The two-step delete confirm renders as a full-width sub-row so
// the column grid above it never shifts.
// ---------------------------------------------------------------------------

/**
 * The column tracks, shared by the customer and vehicle rows AND their column
 * headers so every group aligns down the one surface: name/context | contact/VIN
 * | ID/detail | inline association | a FIXED-width actions track (so Edit/Delete
 * land on the same right edge regardless of cell content or a button flipping to
 * "Opening…"/"Deleting…").
 */
const RECORD_GRID_COLS =
  "sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,1.1fr)_10rem]";

/** One record row: a single-column stack on a phone, the shared aligned columns
 *  at sm+, with generous vertical padding. */
const RECORD_ROW_GRID = `grid grid-cols-1 gap-x-4 gap-y-1 px-4 py-3.5 sm:items-center ${RECORD_GRID_COLS}`;

/** Compact Edit / Delete controls, right-aligned in the row's actions column. */
function RowActions({
  editLoading,
  onEdit,
  onAskDelete,
}: {
  editLoading: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
}) {
  return (
    <div className="mt-1 flex items-center gap-1 sm:mt-0 sm:justify-end">
      <button
        type="button"
        onClick={onEdit}
        disabled={editLoading}
        className="btn btn--secondary btn--sm"
      >
        {editLoading ? "Opening…" : "Edit"}
      </button>
      <button
        type="button"
        onClick={onAskDelete}
        className="btn btn--danger btn--sm"
      >
        Delete
      </button>
    </div>
  );
}

/**
 * Full-width two-step delete confirm bar (destructive, but not shouty). It NAMES
 * the record ("Delete Jane Doe? This cannot be undone.") - the name is the
 * multitask safeguard, so a clerk juggling records can't nuke the wrong one on a
 * generic "are you sure". Focus lands on the non-destructive Cancel by default,
 * so Enter never deletes; Escape cancels.
 */
function ConfirmDeleteBar({
  name,
  busy,
  onCancel,
  onConfirm,
}: {
  name: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);
  return (
    <div
      role="group"
      aria-label={`Delete ${name}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
      className="flex flex-wrap items-center gap-2 border-t border-line bg-plate/[0.04] px-4 py-2.5"
    >
      <span className="text-sm font-medium text-ink">
        Delete {name}? This cannot be undone.
      </span>
      <button
        ref={cancelRef}
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="btn btn--secondary btn--sm"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className="btn btn--danger btn--sm"
      >
        {busy ? "Deleting…" : "Confirm delete"}
      </button>
    </div>
  );
}

/** Vertical row divider (subtle dot) between inline meta values. */
function Dot() {
  return <span className="text-line">·</span>;
}

/** The clickable record name that opens a detail (hub) view. Edit / Delete stay
 *  as their own buttons in the actions column, so the name is the only link. */
const ROW_NAME_LINK =
  "block truncate font-semibold text-ink underline-offset-2 hover:text-plate hover:underline focus:outline-none focus-visible:text-plate focus-visible:underline";

/**
 * The inline association as its own quiet column ("Last vehicle" for a customer,
 * "Last customer" for a vehicle) - a proper table column, not text appended under
 * the name. An empty association keeps its track on desktop (a blank cell, so the
 * grid stays aligned) and collapses on a phone; a present value gets a "Last:"
 * prefix only when the row is stacked and the column header is out of view.
 */
function AssociationCell({ hint }: { hint?: string }) {
  return (
    <div className={`min-w-0 text-xs text-fog ${hint ? "" : "hidden sm:block"}`}>
      {hint ? (
        <p className="truncate">
          <span className="text-fog/60 sm:hidden">Last: </span>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function CustomerRow({
  c,
  hint,
  onEdit,
  onDeleted,
  editLoading,
}: {
  c: CustomerSummary;
  /** Most-recent associated vehicle label (from transaction history), if any. */
  hint?: string;
  onEdit: () => void;
  onDeleted: (message: string) => void;
  editLoading: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    const res = await deleteCustomer(c.id);
    setBusy(false);
    if (res.ok) {
      onDeleted(`Deleted ${c.full_name}.`);
    } else {
      setError(res.error ?? "Could not delete this record.");
      setConfirming(false);
    }
  }

  return (
    <li className="group console-row--hover border-t border-line">
      <div className={RECORD_ROW_GRID}>
        {/* Name (links to the detail view) + domicile */}
        <div className="min-w-0">
          <Link href={`/staff/records/customers/${c.id}`} className={ROW_NAME_LINK}>
            {c.full_name}
          </Link>
          <p className="mt-0.5 truncate text-xs text-fog">
            {c.parish ? <span>{c.parish} Parish</span> : null}
            {c.parish && c.city ? <span className="px-1"><Dot /></span> : null}
            {c.city ? <span>{c.city}</span> : null}
            {!c.parish && !c.city ? (
              <span className="italic">No domicile on file</span>
            ) : null}
          </p>
        </div>

        {/* Contact: email over phone, each with a quiet copy icon */}
        <div className="min-w-0 text-sm text-fog">
          {c.email ? (
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate">{c.email}</span>
              <CopyButton value={c.email} label="email" />
            </span>
          ) : null}
          {c.phone ? (
            <span className="mt-0.5 flex items-center gap-1">
              <a
                href={`tel:${c.phone}`}
                className="underline-offset-2 hover:text-plate hover:underline"
              >
                {c.phone}
              </a>
              <CopyButton value={c.phone} label="phone" />
            </span>
          ) : null}
          {!c.email && !c.phone ? (
            <span className="text-fog/70">No contact on file</span>
          ) : null}
        </div>

        {/* ID (last 4) */}
        <div className="min-w-0 text-xs text-fog">
          {c.id_last4 ? (
            <span className="truncate">
              {c.id_type ? CUSTOMER_ID_TYPE_LABEL[c.id_type] : "ID"}{" "}
              <span className="font-mono">{maskFromLast4(c.id_last4)}</span>
            </span>
          ) : null}
        </div>

        {/* Last vehicle (association, from transaction history) */}
        <AssociationCell hint={hint} />

        {/* Actions */}
        {confirming ? null : (
          <RowActions
            editLoading={editLoading}
            onEdit={onEdit}
            onAskDelete={() => {
              setError(null);
              setConfirming(true);
            }}
          />
        )}
      </div>

      {confirming ? (
        <ConfirmDeleteBar
          name={c.full_name}
          busy={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={handleDelete}
        />
      ) : null}
      {error ? (
        <p role="alert" className="px-4 pb-3 text-sm font-medium text-plate">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function VehicleRow({
  v,
  hint,
  onEdit,
  onDeleted,
  editLoading,
}: {
  v: VehicleSummary;
  /** Most-recent associated customer name (from transaction history), if any. */
  hint?: string;
  onEdit: () => void;
  onDeleted: (message: string) => void;
  editLoading: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    const res = await deleteVehicle(v.id);
    setBusy(false);
    if (res.ok) {
      onDeleted(`Deleted ${vehicleLabel(v)}.`);
    } else {
      setError(res.error ?? "Could not delete this record.");
      setConfirming(false);
    }
  }

  return (
    <li className="group console-row--hover border-t border-line">
      <div className={RECORD_ROW_GRID}>
        {/* Year / make / model (links to the detail view) */}
        <div className="min-w-0">
          <Link href={`/staff/records/vehicles/${v.id}`} className={ROW_NAME_LINK}>
            {vehicleLabel(v)}
          </Link>
        </div>

        {/* VIN (monospace) + quiet copy */}
        <div className="flex min-w-0 items-center gap-1">
          <span className="break-all font-mono text-sm tracking-tight text-fog">
            {v.vin}
          </span>
          <CopyButton value={v.vin} label="VIN" />
        </div>

        {/* Body / color */}
        <div className="min-w-0 text-xs text-fog">
          {v.body_style || v.color ? (
            <span className="truncate">
              {v.body_style ? <span>{v.body_style}</span> : null}
              {v.body_style && v.color ? (
                <span className="px-1"><Dot /></span>
              ) : null}
              {v.color ? <span>{v.color}</span> : null}
            </span>
          ) : null}
        </div>

        {/* Last customer (association, from transaction history) */}
        <AssociationCell hint={hint} />

        {/* Actions */}
        {confirming ? null : (
          <RowActions
            editLoading={editLoading}
            onEdit={onEdit}
            onAskDelete={() => {
              setError(null);
              setConfirming(true);
            }}
          />
        )}
      </div>

      {confirming ? (
        <ConfirmDeleteBar
          name={vehicleLabel(v)}
          busy={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={handleDelete}
        />
      ) : null}
      {error ? (
        <p role="alert" className="px-4 pb-3 text-sm font-medium text-plate">
          {error}
        </p>
      ) : null}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Shared form pieces
// ---------------------------------------------------------------------------

/** A labeled input that works controlled or uncontrolled (pass-through props). */
function Input({
  label,
  hint,
  className,
  ...rest
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-ink">{label}</span>
      {hint ? <span className="block text-xs text-fog">{hint}</span> : null}
      <input
        {...rest}
        className={`field mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink focus:border-ink focus:outline-none ${
          className ?? ""
        }`}
      />
    </label>
  );
}

function FormShell({
  title,
  children,
  error,
}: {
  title: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h3 className="font-display text-lg font-extrabold text-ink sm:text-xl">
        {title}
      </h3>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-plate">
          {error}
        </p>
      ) : null}
      {children}
    </section>
  );
}

/** Submit + optional Cancel row, shared by the create and edit forms. */
function FormButtons({
  pending,
  submitLabel,
  onCancel,
}: {
  pending: boolean;
  submitLabel: string;
  onCancel?: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="btn btn--secondary btn--sm"
        >
          Cancel
        </button>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="btn btn--primary btn--sm"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Customer form (create + edit)
// ---------------------------------------------------------------------------

function CustomerForm({
  mode,
  initial,
  parishOptions,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: CustomerEditData;
  parishOptions: string[];
  onDone: (message: string) => void;
  onCancel?: () => void;
}) {
  const [state, action, pending] = useActionState<CustomerFormState, FormData>(
    mode === "edit" ? updateCustomer : createCustomer,
    {},
  );
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!state.ok) return;
    onDone(
      isEdit
        ? "Customer updated."
        : state.reused
          ? "Matched an existing customer and reused it."
          : "Customer saved.",
    );
  }, [state, onDone, isEdit]);

  return (
    <FormShell
      title={isEdit ? "Edit customer" : "Add a customer"}
      error={state.error}
    >
      <form action={action} className="mt-4 space-y-4">
        {isEdit && initial ? (
          <input type="hidden" name="id" value={initial.id} />
        ) : null}

        <Input
          label="Full name"
          name="full_name"
          required
          autoComplete="off"
          defaultValue={initial?.full_name ?? ""}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="off"
            defaultValue={initial?.phone ?? ""}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="off"
            defaultValue={initial?.email ?? ""}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Address"
            name="address_line1"
            autoComplete="off"
            defaultValue={initial?.address_line1 ?? ""}
          />
          <Input
            label="Apt / unit"
            name="address_line2"
            autoComplete="off"
            defaultValue={initial?.address_line2 ?? ""}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="City"
            name="city"
            autoComplete="off"
            defaultValue={initial?.city ?? ""}
          />
          <Input
            label="State"
            name="state"
            maxLength={40}
            autoComplete="off"
            defaultValue={initial?.state ?? "LA"}
          />
          <Input
            label="ZIP"
            name="postal_code"
            autoComplete="off"
            defaultValue={initial?.postal_code ?? ""}
          />
        </div>

        <Input
          label="Parish of residence (domicile)"
          hint="Drives the tax rate in the fee calculator."
          name="parish"
          list="parish-options"
          autoComplete="off"
          defaultValue={initial?.parish ?? ""}
        />
        <datalist id="parish-options">
          {parishOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <fieldset className="rounded-xl border border-line bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-ink">
            ID (staff only, stored securely)
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="block text-sm font-semibold text-ink">
                ID type
              </span>
              <select
                name="id_type"
                defaultValue={initial?.id_type ?? ""}
                className="field select-field mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 pr-10 text-ink focus:border-ink focus:outline-none"
              >
                <option value="">Not recorded</option>
                {CUSTOMER_ID_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CUSTOMER_ID_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Issuing state"
              name="id_state"
              autoComplete="off"
              defaultValue={initial?.id_state ?? "LA"}
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {isEdit ? (
              <Input
                label="ID number"
                hint="Leave blank to keep the number on file; type to replace it."
                name="id_number"
                autoComplete="off"
                placeholder={
                  initial?.id_last4
                    ? `•••• ${initial.id_last4} on file`
                    : "Not recorded"
                }
              />
            ) : (
              <Input label="ID number" name="id_number" autoComplete="off" />
            )}
            <Input
              label="Date of birth"
              name="date_of_birth"
              type="date"
              className="date-field"
              autoComplete="off"
              defaultValue={initial?.date_of_birth ?? ""}
            />
          </div>
          <p className="mt-2 text-xs text-fog">
            Stored staff-only. Lists show only the last 4; the full number is read
            only when a record is opened to fill a form.
          </p>
        </fieldset>

        <Input
          label="Notes"
          name="notes"
          autoComplete="off"
          defaultValue={initial?.notes ?? ""}
        />

        <FormButtons
          pending={pending}
          submitLabel={isEdit ? "Save changes" : "Save customer"}
          onCancel={onCancel}
        />
      </form>
    </FormShell>
  );
}

// ---------------------------------------------------------------------------
// Vehicle form (create + edit)
// ---------------------------------------------------------------------------

interface VehicleDraft {
  vin: string;
  year: string;
  make: string;
  model: string;
  body_style: string;
  color: string;
  notes: string;
}

const EMPTY_VEHICLE: VehicleDraft = {
  vin: "",
  year: "",
  make: "",
  model: "",
  body_style: "",
  color: "",
  notes: "",
};

function vehicleToDraft(v: Vehicle): VehicleDraft {
  return {
    vin: v.vin,
    year: v.year != null ? String(v.year) : "",
    make: v.make ?? "",
    model: v.model ?? "",
    body_style: v.body_style ?? "",
    color: v.color ?? "",
    notes: v.notes ?? "",
  };
}

function VehicleForm({
  mode,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: Vehicle;
  onDone: (message: string) => void;
  onCancel?: () => void;
}) {
  const [state, action, pending] = useActionState<VehicleFormState, FormData>(
    mode === "edit" ? updateVehicle : createVehicle,
    {},
  );
  const [draft, setDraft] = useState<VehicleDraft>(
    initial ? vehicleToDraft(initial) : EMPTY_VEHICLE,
  );
  const [decoding, setDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!state.ok) return;
    onDone(
      isEdit
        ? "Vehicle updated."
        : state.reused
          ? "VIN already on file. Reused the existing vehicle."
          : "Vehicle saved.",
    );
  }, [state, onDone, isEdit]);

  function set<K extends keyof VehicleDraft>(key: K, value: string) {
    setDraft((cur) => ({ ...cur, [key]: value }));
  }

  async function handleDecode() {
    setDecodeError(null);
    const decoded = await decodeVin(draft.vin).catch(() => null);
    setDecoding(false);
    if (!decoded) {
      setDecodeError("Could not decode that VIN. Enter the details by hand.");
      return;
    }
    setDraft((cur) => ({
      ...cur,
      year: decoded.year || cur.year,
      make: decoded.make || cur.make,
      model: decoded.model || cur.model,
      body_style: decoded.body || cur.body_style,
    }));
  }

  const vinWarn =
    draft.vin.length >= 17 && !isStandardVin(draft.vin)
      ? "This VIN has an I, O, or Q, which standard VINs do not use. Double-check it."
      : null;

  return (
    <FormShell
      title={isEdit ? "Edit vehicle" : "Add a vehicle"}
      error={state.error}
    >
      <form action={action} className="mt-4 space-y-4">
        {isEdit && initial ? (
          <input type="hidden" name="id" value={initial.id} />
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="VIN"
              hint="The match key. Reused if this VIN is already on file."
              name="vin"
              value={draft.vin}
              onChange={(event) => set("vin", event.target.value)}
              required
              autoComplete="off"
              className="font-mono uppercase"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setDecoding(true);
              void handleDecode();
            }}
            disabled={decoding || draft.vin.trim().length < 5}
            className="btn btn--secondary"
            title="Look up year/make/model from the VIN (NHTSA)"
          >
            {decoding ? "Decoding…" : "Decode VIN"}
          </button>
        </div>
        {vinWarn ? (
          <p className="text-xs font-medium text-plate">{vinWarn}</p>
        ) : null}
        {decodeError ? (
          <p className="text-xs font-medium text-plate">{decodeError}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Year"
            name="year"
            type="number"
            inputMode="numeric"
            min={1900}
            max={2100}
            value={draft.year}
            onChange={(event) => set("year", event.target.value)}
            autoComplete="off"
          />
          <Input
            label="Make"
            name="make"
            value={draft.make}
            onChange={(event) => set("make", event.target.value)}
            autoComplete="off"
          />
          <Input
            label="Model"
            name="model"
            value={draft.model}
            onChange={(event) => set("model", event.target.value)}
            autoComplete="off"
          />
          <Input
            label="Body style"
            name="body_style"
            value={draft.body_style}
            onChange={(event) => set("body_style", event.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Color"
            name="color"
            value={draft.color}
            onChange={(event) => set("color", event.target.value)}
            autoComplete="off"
          />
          <Input
            label="Notes"
            name="notes"
            value={draft.notes}
            onChange={(event) => set("notes", event.target.value)}
            autoComplete="off"
          />
        </div>

        <FormButtons
          pending={pending}
          submitLabel={isEdit ? "Save changes" : "Save vehicle"}
          onCancel={onCancel}
        />
      </form>
    </FormShell>
  );
}

