"use client";

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
import { ConsolePanel } from "@/components/console/ConsoleUI";
import { CopyButton } from "@/components/console/CopyButton";
import {
  CUSTOMER_ID_TYPES,
  CUSTOMER_ID_TYPE_LABEL,
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
    ? (searchResults ?? { customers: [], vehicles: [] })
    : recent;

  return (
    <div className="mt-8 space-y-6">
      {/* Search */}
      <ConsolePanel>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            runSearch(query);
          }}
          className="flex flex-col gap-2 sm:flex-row"
          role="search"
        >
          <label className="flex-1">
            <span className="sr-only">Search by name or VIN</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or VIN"
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-ink focus:border-ink focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={isSearching}
            className="plate-btn plate-btn--red text-sm disabled:opacity-60"
          >
            {isSearching ? "Searching…" : "Search"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openAdd("customer")}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink"
          >
            {openForm === "customer" ? "Close" : "+ Add customer"}
          </button>
          <button
            type="button"
            onClick={() => openAdd("vehicle")}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink"
          >
            {openForm === "vehicle" ? "Close" : "+ Add vehicle"}
          </button>
        </div>

        {flash ? (
          <p
            role="status"
            className="mt-3 rounded-lg border border-ink/20 bg-mist px-3 py-2 text-sm font-medium text-ink"
          >
            {flash}
          </p>
        ) : null}

        {!showingSearch ? (
          <p className="mt-3 text-xs text-fog">
            Showing your most recent records. Search by name or VIN to find any
            other.
          </p>
        ) : null}
      </ConsolePanel>

      {/* Add forms */}
      {openForm === "customer" ? (
        <CustomerForm mode="create" parishOptions={parishOptions} onDone={finish} />
      ) : null}
      {openForm === "vehicle" ? (
        <VehicleForm mode="create" onDone={finish} />
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

      {/* Results: search results while searching, else the recent lists. */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section>
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
            Customers
            <ResultsBadge
              showingSearch={showingSearch}
              count={results.customers.length}
            />
          </h2>
          {results.customers.length === 0 ? (
            <EmptyHint>
              {awaitingResults
                ? "Searching…"
                : showingSearch
                  ? "No customers match your search."
                  : "No customers yet. Add one above."}
            </EmptyHint>
          ) : (
            <ul className="mt-3 space-y-2">
              {results.customers.map((c) => (
                <CustomerCard
                  key={c.id}
                  c={c}
                  editLoading={editLoadingId === c.id}
                  onEdit={() => void requestEditCustomer(c.id)}
                  onDeleted={finish}
                />
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
            Vehicles
            <ResultsBadge
              showingSearch={showingSearch}
              count={results.vehicles.length}
            />
          </h2>
          {results.vehicles.length === 0 ? (
            <EmptyHint>
              {awaitingResults
                ? "Searching…"
                : showingSearch
                  ? "No vehicles match your search."
                  : "No vehicles yet. Add one above."}
            </EmptyHint>
          ) : (
            <ul className="mt-3 space-y-2">
              {results.vehicles.map((v) => (
                <VehicleCard
                  key={v.id}
                  v={v}
                  editLoading={editLoadingId === v.id}
                  onEdit={() => void requestEditVehicle(v.id)}
                  onDeleted={finish}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-lg border border-dashed border-line bg-mist/60 px-3 py-3 text-sm font-medium text-fog">
      {children}
    </p>
  );
}

/** Section count while searching; a "Recent" chip on the default view. */
function ResultsBadge({
  showingSearch,
  count,
}: {
  showingSearch: boolean;
  count: number;
}) {
  return showingSearch ? (
    <span className="text-sm font-semibold text-fog">({count})</span>
  ) : (
    <span className="rounded-full border border-line bg-mist px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-fog">
      Recent
    </span>
  );
}

// ---------------------------------------------------------------------------
// Record cards (with Edit + Delete)
// ---------------------------------------------------------------------------

function CustomerCard({
  c,
  onEdit,
  onDeleted,
  editLoading,
}: {
  c: CustomerSummary;
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
    <li className="rounded-xl border border-line bg-white p-4">
      <p className="font-display text-base font-extrabold text-ink">
        {c.full_name}
      </p>
      <p className="mt-0.5 text-sm text-fog">
        {c.parish ? <span>{c.parish} Parish</span> : null}
        {c.parish && c.city ? (
          <span className="px-1.5 text-line">·</span>
        ) : null}
        {c.city ? <span>{c.city}</span> : null}
        {!c.parish && !c.city ? (
          <span className="italic">No domicile on file</span>
        ) : null}
      </p>
      {c.email || c.phone ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-fog">
          {c.email ? (
            <span className="inline-flex items-center gap-1.5">
              {c.email}
              <CopyButton value={c.email} label="email" />
            </span>
          ) : null}
          {c.email && c.phone ? <span className="text-line">·</span> : null}
          {c.phone ? (
            <span className="inline-flex items-center gap-1.5">
              {c.phone}
              <CopyButton value={c.phone} label="phone" />
            </span>
          ) : null}
        </p>
      ) : null}
      {c.id_last4 ? (
        <p className="mt-1 text-xs font-medium text-fog">
          {c.id_type ? CUSTOMER_ID_TYPE_LABEL[c.id_type] : "ID"}{" "}
          <span className="font-mono">{maskFromLast4(c.id_last4)}</span>
        </p>
      ) : null}

      <RecordActions
        confirming={confirming}
        busy={busy}
        editLoading={editLoading}
        onEdit={onEdit}
        onAskDelete={() => {
          setError(null);
          setConfirming(true);
        }}
        onCancelDelete={() => setConfirming(false)}
        onConfirmDelete={handleDelete}
      />
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-plate">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function VehicleCard({
  v,
  onEdit,
  onDeleted,
  editLoading,
}: {
  v: VehicleSummary;
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
    <li className="rounded-xl border border-line bg-white p-4">
      <p className="font-display text-base font-extrabold text-ink">
        {vehicleLabel(v)}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5">
        <span className="break-all font-mono text-sm tracking-wide text-fog">
          {v.vin}
        </span>
        <CopyButton value={v.vin} label="VIN" />
      </p>
      {v.body_style || v.color ? (
        <p className="mt-1 text-sm text-fog">
          {v.body_style ? <span>{v.body_style}</span> : null}
          {v.body_style && v.color ? (
            <span className="px-1.5 text-line">·</span>
          ) : null}
          {v.color ? <span>{v.color}</span> : null}
        </p>
      ) : null}

      <RecordActions
        confirming={confirming}
        busy={busy}
        editLoading={editLoading}
        onEdit={onEdit}
        onAskDelete={() => {
          setError(null);
          setConfirming(true);
        }}
        onCancelDelete={() => setConfirming(false)}
        onConfirmDelete={handleDelete}
      />
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-plate">
          {error}
        </p>
      ) : null}
    </li>
  );
}

/** Shared Edit / Delete action row with an inline two-step delete confirm. */
function RecordActions({
  confirming,
  busy,
  editLoading,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  confirming: boolean;
  busy: boolean;
  editLoading: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
      {confirming ? (
        <>
          <span className="text-sm font-medium text-ink">
            Delete this record?
          </span>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={busy}
            className="rounded-lg border border-plate bg-plate px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-plate-700 disabled:opacity-60"
          >
            {busy ? "Deleting…" : "Confirm delete"}
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            disabled={busy}
            className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-60"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onEdit}
            disabled={editLoading}
            className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-60"
          >
            {editLoading ? "Opening…" : "Edit"}
          </button>
          <button
            type="button"
            onClick={onAskDelete}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-plate transition-colors hover:bg-plate/5"
          >
            Delete
          </button>
        </>
      )}
    </div>
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
        className={`mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink focus:border-ink focus:outline-none ${
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
          className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-60"
        >
          Cancel
        </button>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="plate-btn plate-btn--red text-sm disabled:opacity-60"
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
                className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink focus:border-ink focus:outline-none"
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
            className="rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-60"
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

/** The subset of NHTSA vPIC DecodeVinValues fields we use. */
interface DecodedVin {
  make: string;
  model: string;
  year: string;
  body: string;
}

/**
 * Decode a VIN against NHTSA's free, no-auth vPIC API (CORS-enabled, so this
 * runs in the browser). Returns null on any failure; the form falls back to
 * manual entry. Government data source explicitly referenced by the spec.
 */
async function decodeVin(vin: string): Promise<DecodedVin | null> {
  const clean = vin.trim();
  if (clean.length < 5) return null;
  const res = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(
      clean,
    )}?format=json`,
  );
  if (!res.ok) return null;
  const json: unknown = await res.json();
  if (typeof json !== "object" || json === null) return null;
  const results = (json as { Results?: unknown }).Results;
  if (!Array.isArray(results) || results.length === 0) return null;
  const first = results[0];
  if (typeof first !== "object" || first === null) return null;
  const obj = first as Record<string, unknown>;
  const pick = (key: string): string =>
    typeof obj[key] === "string" ? (obj[key] as string).trim() : "";
  return {
    make: pick("Make"),
    model: pick("Model"),
    year: pick("ModelYear"),
    body: pick("BodyClass"),
  };
}
