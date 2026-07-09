"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  deleteCustomer,
  deleteVehicle,
  getRecordCountsAction,
  getRenewalsAction,
  loadCustomerForEdit,
  loadCustomerPanel,
  loadVehicleForEdit,
  loadVehiclePanel,
  recentRecordsAction,
  searchRecordsAction,
} from "@/lib/records/actions";
import { maskFromLast4, vehicleLabel } from "@/lib/records/normalize";
import { businessToday, daysUntil, formatCalendarDate } from "@/lib/transactions/day";
import {
  CUSTOMER_ID_TYPE_LABEL,
  EMPTY_ASSOCIATIONS,
  type CustomerEditData,
  type CustomerPanelData,
  type CustomerSummary,
  type RecordsSearchResult,
  type RenewalListEntry,
  type RenewalProfile,
  type Vehicle,
  type VehiclePanelData,
  type VehicleSummary,
} from "@/lib/records/types";
import { CustomerForm, VehicleForm } from "@/components/staff/RecordForms";
import { RecordPanel } from "@/components/staff/RecordPanel";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";

/**
 * Staff-only customer & vehicle records console (client).
 *
 * A chip switcher (Customers · Vehicles · Renewals) over one table per view. A
 * row click opens a right-hand detail panel where the record's contact, linked
 * records, history, and Edit / Delete live - the flat lists become a connected
 * picture without leaving the page. Customers and Vehicles are search-first
 * (recent by default; typing runs the RLS-gated server search). Renewals is the
 * bounded, consented, soonest-first read view (renewal dates are captured at
 * check-in, not on the customer record) with a CSV export.
 *
 * The add / edit / delete SERVER logic is unchanged: adds still match-and-reuse
 * (name + email/phone, or VIN), edits update in place, and a delete nulls the
 * check-in / transaction links (ON DELETE SET NULL) rather than breaking them -
 * the record goes, the history stays and is unlinked. Everything is gated
 * server-side by is_staff() + RLS; the full ID number is never sent to the
 * browser (lists and the panel show only the masked last 4).
 */

type View = "customers" | "vehicles" | "renewals";

/** The grid tracks per view (rail / cells / chevron), shared header ↔ rows. */
const CUST_GRID = {
  gridTemplateColumns:
    "3px minmax(220px,1.3fr) 210px 190px 160px 150px 26px",
  minWidth: "1040px",
} as const;
const VEH_GRID = {
  gridTemplateColumns: "minmax(230px,1.3fr) 220px 170px 200px 26px",
  minWidth: "1040px",
} as const;
const REN_GRID = {
  gridTemplateColumns:
    "minmax(200px,1.3fr) 210px 180px 130px 90px 120px 26px",
  minWidth: "1040px",
} as const;

const EMPTY_RESULT: RecordsSearchResult = {
  customers: [],
  vehicles: [],
  associations: EMPTY_ASSOCIATIONS,
  renewals: {},
};

interface Counts {
  customers: number | null;
  vehicles: number | null;
}

interface PanelTarget {
  kind: "customer" | "vehicle";
  id: string;
}

interface LoadedPanel {
  key: string;
  customer: CustomerPanelData | null;
  vehicle: VehiclePanelData | null;
}

export function RecordsConsole({
  recent: initialRecent,
  renewals: initialRenewals,
  customerTotal,
  vehicleTotal,
  parishOptions,
}: {
  recent: RecordsSearchResult;
  renewals: RenewalListEntry[];
  customerTotal: number | null;
  vehicleTotal: number | null;
  parishOptions: string[];
}) {
  const [view, setView] = useState<View>("customers");
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<RecordsSearchResult>(initialRecent);
  const [renewals, setRenewals] = useState<RenewalListEntry[]>(initialRenewals);
  const [counts, setCounts] = useState<Counts>({
    customers: customerTotal,
    vehicles: vehicleTotal,
  });
  const [searchResults, setSearchResults] =
    useState<RecordsSearchResult | null>(null);
  const [isSearching, startSearch] = useTransition();

  // Add / edit forms (transient, above the table).
  const [openForm, setOpenForm] = useState<null | "customer" | "vehicle">(null);
  const [editing, setEditing] = useState<
    | { kind: "customer"; data: CustomerEditData }
    | { kind: "vehicle"; data: Vehicle }
    | null
  >(null);
  const [flash, setFlash] = useState<string | null>(null);
  const editRef = useRef<HTMLDivElement>(null);

  // Detail panel.
  const [panel, setPanel] = useState<PanelTarget | null>(null);
  const [lastPanel, setLastPanel] = useState<PanelTarget | null>(null);
  const [loaded, setLoaded] = useState<LoadedPanel | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  // The panel target currently being loaded. A load only applies its result if
  // this is still its target, so a slower earlier fetch can't clobber the panel
  // after a newer row/cross-link superseded it (which would strand the skeleton).
  const panelReqRef = useRef<string | null>(null);

  // Delete confirm (reused ConfirmDialog + double-fire guard).
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: "customer" | "vehicle";
    id: string;
    name: string;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleteRef = useRef(false);

  const today = businessToday();

  // Keep the panel's content mounted through the slide-out (retain the last
  // target while closing). Adjusting state during render is React's pattern.
  const activePanel = panel ?? lastPanel;
  if (panel && panel !== lastPanel) setLastPanel(panel);
  const panelKey = activePanel ? `${activePanel.kind}:${activePanel.id}` : null;
  const panelCustomer =
    loaded && loaded.key === panelKey ? loaded.customer : null;
  const panelVehicle =
    loaded && loaded.key === panelKey ? loaded.vehicle : null;

  // --- Search (customers / vehicles only; renewals filters client-side) -----

  // A monotonically increasing token so an earlier, slower search response can't
  // land after a newer one and show stale rows under a newer query.
  const searchSeqRef = useRef(0);

  const runSearch = useCallback((q: string) => {
    const seq = ++searchSeqRef.current;
    if (q.trim() === "") {
      setSearchResults(null);
      return;
    }
    startSearch(async () => {
      const res = await searchRecordsAction(q.trim());
      if (seq === searchSeqRef.current) setSearchResults(res);
    });
  }, []);

  useEffect(() => {
    if (view === "renewals") return;
    const handle = setTimeout(
      () => runSearch(query),
      query.trim() === "" ? 0 : 200,
    );
    return () => clearTimeout(handle);
  }, [query, view, runSearch]);

  // --- Refresh after a mutation --------------------------------------------

  const refresh = useCallback(() => {
    startSearch(async () => {
      const [nextRecent, nextRenewals, nextCounts] = await Promise.all([
        recentRecordsAction(),
        getRenewalsAction(),
        getRecordCountsAction(),
      ]);
      setRecent(nextRecent);
      setRenewals(nextRenewals);
      setCounts(nextCounts);
    });
  }, []);

  const finish = useCallback(
    (message: string) => {
      setFlash(message);
      setOpenForm(null);
      setEditing(null);
      refresh();
      if (view !== "renewals" && query.trim() !== "") runSearch(query);
    },
    [refresh, runSearch, query, view],
  );

  // --- Add / edit ----------------------------------------------------------

  const openAdd = useCallback((kind: "customer" | "vehicle") => {
    setEditing(null);
    setFlash(null);
    setOpenForm((cur) => (cur === kind ? null : kind));
  }, []);

  const requestEdit = useCallback(
    async (kind: "customer" | "vehicle", id: string) => {
      setFlash(null);
      if (kind === "customer") {
        const data = await loadCustomerForEdit(id);
        if (!data) {
          setFlash("Could not open that customer for editing.");
          return;
        }
        setOpenForm(null);
        setEditing({ kind: "customer", data });
      } else {
        const data = await loadVehicleForEdit(id);
        if (!data) {
          setFlash("Could not open that vehicle for editing.");
          return;
        }
        setOpenForm(null);
        setEditing({ kind: "vehicle", data });
      }
    },
    [],
  );

  useEffect(() => {
    if (!editing || !editRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    editRef.current.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [editing]);

  // --- Panel open / close / data load --------------------------------------

  const loadPanel = useCallback(async (target: PanelTarget) => {
    const key = `${target.kind}:${target.id}`;
    panelReqRef.current = key;
    setPanelLoading(true);
    setPanelError(null);
    try {
      const data =
        target.kind === "customer"
          ? await loadCustomerPanel(target.id)
          : await loadVehiclePanel(target.id);
      // A newer target superseded this one while it was in flight — drop the
      // result so it can't overwrite the fresh panel (or its loading state).
      if (panelReqRef.current !== key) return;
      if (!data) {
        setPanelError("Could not open this record. It may have been removed.");
        return;
      }
      if (target.kind === "customer") {
        setLoaded({ key, customer: data as CustomerPanelData, vehicle: null });
      } else {
        setLoaded({ key, customer: null, vehicle: data as VehiclePanelData });
      }
    } finally {
      // Only the load that is still current owns the loading flag.
      if (panelReqRef.current === key) setPanelLoading(false);
    }
  }, []);

  // Open from a table row: remember the opener so focus returns to it on close.
  function openRow(target: PanelTarget, opener: HTMLButtonElement) {
    openerRef.current = opener;
    setPanel(target);
    void loadPanel(target);
  }

  // Cross-link from inside the panel: swap content, keep the original opener.
  const openLinked = useCallback(
    (kind: "customer" | "vehicle", id: string) => {
      const target = { kind, id };
      setPanel(target);
      void loadPanel(target);
    },
    [loadPanel],
  );

  const closePanel = useCallback(() => {
    setPanel(null);
    setPanelError(null);
    openerRef.current?.focus();
  }, []);

  function onPanelEdit() {
    if (!activePanel) return;
    const { kind, id } = activePanel;
    setPanel(null);
    void requestEdit(kind, id);
  }

  // The name for the delete confirm, from the loaded panel content.
  function panelRecordName(): string {
    if (panelCustomer) return panelCustomer.full_name;
    if (panelVehicle) return vehicleLabel(panelVehicle);
    return "this record";
  }

  function onPanelDelete() {
    if (!activePanel) return;
    setConfirmDelete({
      kind: activePanel.kind,
      id: activePanel.id,
      name: panelRecordName(),
    });
  }

  async function runDelete() {
    if (!confirmDelete || deleteRef.current) return;
    deleteRef.current = true;
    setDeleteBusy(true);
    const { kind, id, name } = confirmDelete;
    try {
      const res =
        kind === "customer"
          ? await deleteCustomer(id)
          : await deleteVehicle(id);
      if (res.ok) {
        setConfirmDelete(null);
        setPanel(null);
        finish(`Deleted ${name}.`);
      } else {
        setConfirmDelete(null);
        setPanelError(res.error ?? "Could not delete this record.");
      }
    } finally {
      deleteRef.current = false;
      setDeleteBusy(false);
    }
  }

  // --- View switch ---------------------------------------------------------

  function switchView(next: View) {
    if (next === view) return;
    setView(next);
    setQuery("");
    setSearchResults(null);
  }

  // --- Derived lists -------------------------------------------------------

  const showingSearch = view !== "renewals" && query.trim().length > 0;
  const results: RecordsSearchResult = showingSearch
    ? (searchResults ?? EMPTY_RESULT)
    : recent;
  const associations = results.associations ?? EMPTY_ASSOCIATIONS;
  const renewalMap = results.renewals ?? {};
  const awaiting = showingSearch && searchResults === null;

  // Renewals: client-side filter over the bounded, consented list.
  const renewalsShown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (view !== "renewals" || !q) return renewals;
    return renewals.filter((r) => {
      const hay = [r.customer.full_name, r.customer.email, r.customer.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [renewals, query, view]);

  const chips: { key: View; label: string; count: number }[] = [
    {
      key: "customers",
      label: "Customers",
      count: counts.customers ?? recent.customers.length,
    },
    {
      key: "vehicles",
      label: "Vehicles",
      count: counts.vehicles ?? recent.vehicles.length,
    },
    { key: "renewals", label: "Renewals", count: renewals.length },
  ];

  const searchPlaceholder =
    view === "vehicles"
      ? "Search vehicles, VIN"
      : view === "renewals"
        ? "Search renewals"
        : "Search customers, email, phone";

  const resultLabel = buildResultLabel({
    view,
    showingSearch,
    shownCustomers: results.customers.length,
    shownVehicles: results.vehicles.length,
    recentCustomers: recent.customers.length,
    recentVehicles: recent.vehicles.length,
    totalCustomers: counts.customers,
    totalVehicles: counts.vehicles,
    renewalsShown: renewalsShown.length,
    renewalsTotal: renewals.length,
  });

  // --- CSV export (renewals) ----------------------------------------------

  function exportRenewalsCsv() {
    const header = [
      "Customer",
      "Email",
      "Phone",
      "Vehicle",
      "Renewal",
      "Days out",
    ];
    // Export exactly the visible (currently filtered) consented set.
    const body = renewalsShown.map((r) => [
      r.customer.full_name,
      r.customer.email ?? "",
      r.customer.phone ?? "",
      r.vehicleLabel ?? "",
      formatCalendarDate(r.renewalDate),
      String(daysUntil(r.renewalDate, today)),
    ]);
    const csv = [header, ...body]
      .map((cols) => cols.map(csvCell).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `88title-renewals-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <div className="space-y-6">
      {/* Header: title + the two equal-weight Add actions. */}
      <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold sm:text-3xl">Records</h1>
          <p className="mt-1 text-sm text-fog">
            Saved customers and vehicles, reused on the Transaction tab. Click a
            record to open it.
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

      {/* Switcher + scoped search. */}
      <div className="flex flex-col gap-3 border-b border-line sm:flex-row sm:items-end sm:justify-between">
        <div
          className="-mb-px flex items-center gap-1 overflow-x-auto"
          role="group"
          aria-label="Switch records view"
        >
          {chips.map((chip) => {
            const on = view === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => switchView(chip.key)}
                aria-pressed={on}
                className={`inline-flex h-9 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm transition-colors ${
                  on
                    ? "border-ink font-semibold text-ink"
                    : "border-transparent font-medium text-fog hover:text-ink"
                }`}
              >
                {chip.label}
                <span
                  className={`inline-flex h-[19px] min-w-5 items-center justify-center rounded px-1.5 text-[0.7rem] font-semibold tabular-nums ${
                    on ? "bg-ink/10 text-ink" : "bg-ink/[0.045] text-fog"
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative mb-0 sm:mb-2.5">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fog/60"
          >
            <SearchGlyph />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 w-full rounded-lg border border-line bg-paper pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-fog/60 focus:border-ink focus:ring-2 focus:ring-ink/10 sm:w-64"
          />
          {isSearching && showingSearch ? (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.7rem] text-fog">
              …
            </span>
          ) : null}
        </div>
      </div>

      {/* Renewals explainer + export. */}
      {view === "renewals" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-fog">
            Customers who agreed to renewal reminders, soonest first. Renewal
            dates are captured at check-in.
          </p>
          <button
            type="button"
            onClick={exportRenewalsCsv}
            disabled={renewalsShown.length === 0}
            className="btn btn--secondary"
          >
            Export CSV
          </button>
        </div>
      ) : null}

      {flash ? (
        <p
          role="status"
          className="rounded-lg border border-ink/20 bg-mist px-3 py-2 text-sm font-medium text-ink"
        >
          {flash}
        </p>
      ) : null}

      {/* Add forms (transient). */}
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

      {/* Edit form (one record at a time; keyed so switching re-mounts fresh). */}
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

      {/* Table card (horizontal scroll on narrow widths). */}
      <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-console">
        <div className="overflow-x-auto">
          {view === "customers" ? (
            <CustomersTable
              rows={results.customers}
              associations={associations}
              renewals={renewalMap}
              today={today}
              awaiting={awaiting}
              showingSearch={showingSearch}
              capped={Boolean(showingSearch && results.customersCapped)}
              selectedId={activePanel?.kind === "customer" ? activePanel.id : null}
              onOpen={openRow}
              onAdd={() => openAdd("customer")}
              onClearSearch={() => setQuery("")}
            />
          ) : view === "vehicles" ? (
            <VehiclesTable
              rows={results.vehicles}
              associations={associations}
              awaiting={awaiting}
              showingSearch={showingSearch}
              capped={Boolean(showingSearch && results.vehiclesCapped)}
              selectedId={activePanel?.kind === "vehicle" ? activePanel.id : null}
              onOpen={openRow}
              onAdd={() => openAdd("vehicle")}
              onClearSearch={() => setQuery("")}
            />
          ) : (
            <RenewalsTable
              rows={renewalsShown}
              today={today}
              everEmpty={renewals.length === 0}
              selectedId={
                activePanel?.kind === "customer" ? activePanel.id : null
              }
              onOpen={openRow}
              onClearSearch={() => setQuery("")}
            />
          )}
        </div>
      </div>

      {/* Footer meta. */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs tabular-nums text-fog/70">{resultLabel}</span>
        <span className="text-xs text-fog/60">
          Dates shown in local time (America/Chicago)
        </span>
      </div>

      <RecordPanel
        open={panel !== null}
        panelKey={panelKey}
        kind={activePanel?.kind ?? null}
        customer={panelCustomer}
        vehicle={panelVehicle}
        loading={panelLoading}
        error={panelError}
        confirmOpen={confirmDelete !== null}
        deleteBusy={deleteBusy}
        onClose={closePanel}
        onOpenLinked={openLinked}
        onEdit={onPanelEdit}
        onDelete={onPanelDelete}
      />

      {confirmDelete ? (
        <ConfirmDialog
          heading={`Delete ${confirmDelete.name}?`}
          body="This removes the record. Past check-ins and transactions are kept and unlinked — the history stays, without this record attached."
          confirmLabel={
            confirmDelete.kind === "customer"
              ? "Delete customer"
              : "Delete vehicle"
          }
          busy={deleteBusy}
          onConfirm={runDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

const HEADER_ROW =
  "grid h-10 items-center bg-mist pr-3.5 text-[0.65rem] font-semibold uppercase tracking-[0.07em] text-fog/70";
const DATA_ROW =
  "grid min-h-[58px] w-full items-center border-b border-line pr-3.5 text-left transition-colors last:border-b-0 hover:bg-mist";

/** A row's selected tint when its panel is open. */
function rowClass(selected: boolean): string {
  return `${DATA_ROW} ${selected ? "bg-mist" : ""}`;
}

function CustomersTable({
  rows,
  associations,
  renewals,
  today,
  awaiting,
  showingSearch,
  capped,
  selectedId,
  onOpen,
  onAdd,
  onClearSearch,
}: {
  rows: CustomerSummary[];
  associations: { customerVehicle: Record<string, string> };
  renewals: Record<string, RenewalProfile>;
  today: string;
  awaiting: boolean;
  showingSearch: boolean;
  capped: boolean;
  selectedId: string | null;
  onOpen: (target: PanelTarget, opener: HTMLButtonElement) => void;
  onAdd: () => void;
  onClearSearch: () => void;
}) {
  return (
    <>
      <div style={CUST_GRID} className={HEADER_ROW}>
        <span />
        <span className="pl-0.5">Name</span>
        <span>Contact</span>
        <span>ID</span>
        <span>Last vehicle</span>
        <span>Renewal</span>
        <span />
      </div>

      {rows.map((c) => {
        const profile = renewals[c.id];
        const d = profile ? daysUntil(profile.renewalDate, today) : null;
        const soon = d !== null && d >= 0 && d <= 60;
        const red = d !== null && d >= 0 && d <= 30;
        const place = [c.parish ? `${c.parish} Parish` : null, c.city]
          .filter(Boolean)
          .join(" · ");
        return (
          <button
            key={c.id}
            type="button"
            onClick={(e) => onOpen({ kind: "customer", id: c.id }, e.currentTarget)}
            aria-label={`Open customer ${c.full_name}`}
            style={CUST_GRID}
            className={rowClass(selectedId === c.id)}
          >
            <span
              aria-hidden
              className={`self-stretch ${
                soon ? (red ? "bg-plate" : "bg-ink/20") : ""
              }`}
            />
            <span className="min-w-0 pl-0.5 pr-3">
              <span className="block truncate text-sm font-semibold text-ink">
                {c.full_name}
              </span>
              <span className="block truncate text-xs text-fog">
                {place || (
                  <span className="italic">No domicile on file</span>
                )}
              </span>
            </span>
            <span className="min-w-0 pr-3">
              <span className="block truncate text-xs text-ink/80">
                {c.email ?? (
                  <span className="text-fog">No email</span>
                )}
              </span>
              <span className="block truncate text-xs tabular-nums text-fog">
                {c.phone ?? "—"}
              </span>
            </span>
            <span className="truncate pr-3 text-xs text-fog">
              {c.id_last4 ? (
                <>
                  {c.id_type ? CUSTOMER_ID_TYPE_LABEL[c.id_type] : "ID"}{" "}
                  <span className="font-mono">{maskFromLast4(c.id_last4)}</span>
                </>
              ) : (
                "—"
              )}
            </span>
            <span className="truncate pr-3 text-xs text-fog">
              {associations.customerVehicle[c.id] ?? "—"}
            </span>
            <span className="min-w-0">
              {profile ? (
                <>
                  <span className="block text-xs tabular-nums text-ink/80">
                    {formatCalendarDate(profile.renewalDate)}
                  </span>
                  {soon ? (
                    <span
                      className={`mt-1 inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[0.65rem] font-semibold ${
                        red
                          ? "bg-plate/[0.09] text-plate"
                          : "bg-ink/[0.06] text-fog"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`h-1 w-1 rounded-[1px] ${
                          red ? "bg-plate" : "bg-fog"
                        }`}
                      />
                      Renewal soon
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-xs text-fog/60">—</span>
              )}
            </span>
            <span aria-hidden className="text-right text-lg leading-none text-fog/40">
              ›
            </span>
          </button>
        );
      })}

      {rows.length === 0 ? (
        <ListEmpty
          awaiting={awaiting}
          showingSearch={showingSearch}
          noun="customers"
          addLabel="Add customer"
          onAdd={onAdd}
          onClearSearch={onClearSearch}
        />
      ) : null}
      {capped ? <CappedNote /> : null}
    </>
  );
}

function VehiclesTable({
  rows,
  associations,
  awaiting,
  showingSearch,
  capped,
  selectedId,
  onOpen,
  onAdd,
  onClearSearch,
}: {
  rows: VehicleSummary[];
  associations: { vehicleCustomer: Record<string, string> };
  awaiting: boolean;
  showingSearch: boolean;
  capped: boolean;
  selectedId: string | null;
  onOpen: (target: PanelTarget, opener: HTMLButtonElement) => void;
  onAdd: () => void;
  onClearSearch: () => void;
}) {
  return (
    <>
      <div style={VEH_GRID} className={HEADER_ROW}>
        <span className="pl-4">Vehicle</span>
        <span>VIN</span>
        <span>Details</span>
        <span>Last customer</span>
        <span />
      </div>

      {rows.map((v) => {
        const details = [v.body_style, v.color].filter(Boolean).join(" · ");
        return (
          <button
            key={v.id}
            type="button"
            onClick={(e) => onOpen({ kind: "vehicle", id: v.id }, e.currentTarget)}
            aria-label={`Open vehicle ${vehicleLabel(v)}`}
            style={VEH_GRID}
            className={rowClass(selectedId === v.id)}
          >
            <span className="truncate pl-4 pr-3 text-sm font-semibold text-ink">
              {vehicleLabel(v)}
            </span>
            <span className="truncate pr-3 font-mono text-xs tracking-tight text-fog">
              {v.vin}
            </span>
            <span className="truncate pr-3 text-xs text-fog">
              {details || "—"}
            </span>
            <span className="truncate pr-3 text-xs text-fog">
              {associations.vehicleCustomer[v.id] ?? "—"}
            </span>
            <span aria-hidden className="text-right text-lg leading-none text-fog/40">
              ›
            </span>
          </button>
        );
      })}

      {rows.length === 0 ? (
        <ListEmpty
          awaiting={awaiting}
          showingSearch={showingSearch}
          noun="vehicles"
          addLabel="Add vehicle"
          onAdd={onAdd}
          onClearSearch={onClearSearch}
        />
      ) : null}
      {capped ? <CappedNote /> : null}
    </>
  );
}

function RenewalsTable({
  rows,
  today,
  everEmpty,
  selectedId,
  onOpen,
  onClearSearch,
}: {
  rows: RenewalListEntry[];
  today: string;
  everEmpty: boolean;
  selectedId: string | null;
  onOpen: (target: PanelTarget, opener: HTMLButtonElement) => void;
  onClearSearch: () => void;
}) {
  if (rows.length === 0) {
    return everEmpty ? (
      <EmptyState
        bare
        title="No upcoming renewals yet"
        description="Renewal dates are captured at check-in. Consented customers appear here, soonest first."
      />
    ) : (
      <EmptyState
        bare
        title="No renewals match your search"
        description="Clear your search to see every upcoming renewal."
        action={
          <button
            type="button"
            onClick={onClearSearch}
            className="btn btn--secondary"
          >
            Clear search
          </button>
        }
      />
    );
  }

  return (
    <>
      <div style={REN_GRID} className={HEADER_ROW}>
        <span className="pl-4">Customer</span>
        <span>Contact</span>
        <span>Vehicle</span>
        <span>Renewal</span>
        <span>Days out</span>
        <span>Consent</span>
        <span />
      </div>

      {rows.map((r) => {
        const c = r.customer;
        const d = daysUntil(r.renewalDate, today);
        const place = [c.parish ? `${c.parish} Parish` : null, c.city]
          .filter(Boolean)
          .join(" · ");
        return (
          <button
            key={c.id}
            type="button"
            onClick={(e) => onOpen({ kind: "customer", id: c.id }, e.currentTarget)}
            aria-label={`Open customer ${c.full_name}`}
            style={REN_GRID}
            className={rowClass(selectedId === c.id)}
          >
            <span className="min-w-0 pl-4 pr-3">
              <span className="block truncate text-sm font-semibold text-ink">
                {c.full_name}
              </span>
              <span className="block truncate text-xs text-fog">
                {place || <span className="italic">No domicile</span>}
              </span>
            </span>
            <span className="min-w-0 pr-3">
              <span className="block truncate text-xs text-ink/80">
                {c.email ?? <span className="text-fog">No email</span>}
              </span>
              <span className="block truncate text-xs tabular-nums text-fog">
                {c.phone ?? "—"}
              </span>
            </span>
            <span className="truncate pr-3 text-xs text-fog">
              {r.vehicleLabel ?? "—"}
            </span>
            <span className="text-xs font-medium tabular-nums text-ink">
              {formatCalendarDate(r.renewalDate)}
            </span>
            <span className="text-xs tabular-nums text-fog">
              {d >= 0 ? `${d}d` : `${-d}d ago`}
            </span>
            <span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-ink/[0.05] px-2 py-0.5 text-xs font-semibold text-fog">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-[#3f8f5b]"
                />
                Consented
              </span>
            </span>
            <span aria-hidden className="text-right text-lg leading-none text-fog/40">
              ›
            </span>
          </button>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared table pieces
// ---------------------------------------------------------------------------

/** The empty state inside a customers / vehicles table (search vs never-added). */
function ListEmpty({
  awaiting,
  showingSearch,
  noun,
  addLabel,
  onAdd,
  onClearSearch,
}: {
  awaiting: boolean;
  showingSearch: boolean;
  noun: string;
  addLabel: string;
  onAdd: () => void;
  onClearSearch: () => void;
}) {
  if (awaiting) {
    return (
      <p className="px-6 py-12 text-center text-sm text-fog">Searching…</p>
    );
  }
  if (showingSearch) {
    return (
      <EmptyState
        bare
        title={`No ${noun} match your search`}
        description="Clear your search to see the most recent records in this view."
        action={
          <button
            type="button"
            onClick={onClearSearch}
            className="btn btn--secondary"
          >
            Clear search
          </button>
        }
      />
    );
  }
  return (
    <EmptyState
      bare
      title={`No ${noun} yet`}
      description="Add one, or reuse it on the Transaction tab the next time they visit."
      action={
        <button type="button" onClick={onAdd} className="btn btn--primary">
          {addLabel}
        </button>
      }
    />
  );
}

/** The refine-on-cap note when a search hit the row cap. */
function CappedNote() {
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

function SearchGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wrap a CSV cell value and escape embedded quotes (the ledger's pattern). */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** The footer's "N shown / of M" label, tuned per view. */
function buildResultLabel(args: {
  view: View;
  showingSearch: boolean;
  shownCustomers: number;
  shownVehicles: number;
  recentCustomers: number;
  recentVehicles: number;
  totalCustomers: number | null;
  totalVehicles: number | null;
  renewalsShown: number;
  renewalsTotal: number;
}): string {
  const plural = (n: number, one: string, many: string) =>
    n === 1 ? one : many;

  if (args.view === "renewals") {
    const { renewalsShown, renewalsTotal } = args;
    if (renewalsShown === renewalsTotal) {
      return `${renewalsTotal} upcoming ${plural(renewalsTotal, "renewal", "renewals")}`;
    }
    return `${renewalsShown} of ${renewalsTotal} upcoming renewals`;
  }

  const isCustomers = args.view === "customers";
  const noun = isCustomers ? "customer" : "vehicle";
  const shown = isCustomers ? args.shownCustomers : args.shownVehicles;

  if (args.showingSearch) {
    return `${shown} ${plural(shown, `${noun} match`, `${noun}s match`)}`;
  }

  const recent = isCustomers ? args.recentCustomers : args.recentVehicles;
  const total = isCustomers ? args.totalCustomers : args.totalVehicles;
  if (total !== null && total > recent) {
    return `Showing the ${recent} most recent · ${total} ${noun}s total`;
  }
  const n = total ?? recent;
  return `${n} ${plural(n, noun, `${noun}s`)}`;
}
