"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  useTransition,
  type InputHTMLAttributes,
} from "react";
import {
  createCustomer,
  createVehicle,
  searchRecordsAction,
} from "@/lib/records/actions";
import { isStandardVin, maskFromLast4, vehicleLabel } from "@/lib/records/normalize";
import {
  CUSTOMER_ID_TYPES,
  CUSTOMER_ID_TYPE_LABEL,
  type CustomerFormState,
  type RecordsSearchResult,
  type VehicleFormState,
} from "@/lib/records/types";

/**
 * Staff-only customer & vehicle records console (client).
 *
 * Search records by name or VIN, and add a customer or vehicle. Adds are
 * match-and-reuse: a customer is reused on name + matching email/phone, a vehicle
 * on its VIN, so repeats are never duplicated. The add-vehicle form can decode a
 * VIN against NHTSA's free vPIC API to prefill year/make/model/body. Everything
 * here is gated server-side by is_staff() + RLS; no record data is customer-facing.
 */
export function RecordsConsole({
  initial,
  parishOptions,
}: {
  initial: RecordsSearchResult;
  parishOptions: string[];
}) {
  const [results, setResults] = useState<RecordsSearchResult>(initial);
  const [query, setQuery] = useState("");
  const [isSearching, startSearch] = useTransition();
  const [openForm, setOpenForm] = useState<null | "customer" | "vehicle">(null);
  const [flash, setFlash] = useState<string | null>(null);

  const runSearch = useCallback((q: string) => {
    startSearch(async () => {
      const next = await searchRecordsAction(q);
      setResults(next);
    });
  }, []);

  const finishAdd = useCallback(
    (message: string) => {
      setFlash(message);
      setOpenForm(null);
      runSearch(query);
    },
    [runSearch, query],
  );

  return (
    <div className="mt-8 space-y-8">
      {/* Search */}
      <section>
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
            onClick={() =>
              setOpenForm((cur) => (cur === "customer" ? null : "customer"))
            }
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink"
          >
            {openForm === "customer" ? "Close" : "+ Add customer"}
          </button>
          <button
            type="button"
            onClick={() =>
              setOpenForm((cur) => (cur === "vehicle" ? null : "vehicle"))
            }
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
      </section>

      {openForm === "customer" ? (
        <AddCustomerForm parishOptions={parishOptions} onDone={finishAdd} />
      ) : null}
      {openForm === "vehicle" ? <AddVehicleForm onDone={finishAdd} /> : null}

      {/* Results */}
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <section>
          <h2 className="font-display text-lg font-extrabold text-ink">
            Customers{" "}
            <span className="text-sm font-semibold text-fog">
              ({results.customers.length})
            </span>
          </h2>
          {results.customers.length === 0 ? (
            <EmptyHint>No customers match. Add one above.</EmptyHint>
          ) : (
            <ul className="mt-3 space-y-2">
              {results.customers.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-line bg-white p-4"
                >
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
                    <p className="mt-1 text-sm text-fog">
                      {c.email ? <span>{c.email}</span> : null}
                      {c.email && c.phone ? (
                        <span className="px-1.5 text-line">·</span>
                      ) : null}
                      {c.phone ? <span>{c.phone}</span> : null}
                    </p>
                  ) : null}
                  {c.id_last4 ? (
                    <p className="mt-1 text-xs font-medium text-fog">
                      {c.id_type ? CUSTOMER_ID_TYPE_LABEL[c.id_type] : "ID"}{" "}
                      <span className="font-mono">
                        {maskFromLast4(c.id_last4)}
                      </span>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-display text-lg font-extrabold text-ink">
            Vehicles{" "}
            <span className="text-sm font-semibold text-fog">
              ({results.vehicles.length})
            </span>
          </h2>
          {results.vehicles.length === 0 ? (
            <EmptyHint>No vehicles match. Add one above.</EmptyHint>
          ) : (
            <ul className="mt-3 space-y-2">
              {results.vehicles.map((v) => (
                <li
                  key={v.id}
                  className="rounded-xl border border-line bg-white p-4"
                >
                  <p className="font-display text-base font-extrabold text-ink">
                    {vehicleLabel(v)}
                  </p>
                  <p className="mt-0.5 font-mono text-sm tracking-wide text-fog">
                    {v.vin}
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
                </li>
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
    <section className="rounded-2xl border border-line bg-mist/40 p-5">
      <h3 className="font-display text-lg font-extrabold text-ink">{title}</h3>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-plate">
          {error}
        </p>
      ) : null}
      {children}
    </section>
  );
}

function AddCustomerForm({
  parishOptions,
  onDone,
}: {
  parishOptions: string[];
  onDone: (message: string) => void;
}) {
  const [state, action, pending] = useActionState<CustomerFormState, FormData>(
    createCustomer,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      onDone(
        state.reused
          ? "Matched an existing customer and reused it."
          : "Customer saved.",
      );
    }
  }, [state, onDone]);

  return (
    <FormShell title="Add a customer" error={state.error}>
      <form action={action} className="mt-4 space-y-4">
        <Input label="Full name" name="full_name" required autoComplete="off" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Phone" name="phone" type="tel" autoComplete="off" />
          <Input label="Email" name="email" type="email" autoComplete="off" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Address" name="address_line1" autoComplete="off" />
          <Input
            label="Apt / unit"
            name="address_line2"
            autoComplete="off"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="City" name="city" autoComplete="off" />
          <Input
            label="State"
            name="state"
            defaultValue="LA"
            maxLength={40}
            autoComplete="off"
          />
          <Input label="ZIP" name="postal_code" autoComplete="off" />
        </div>

        <Input
          label="Parish of residence (domicile)"
          hint="Drives the tax rate in the fee calculator."
          name="parish"
          list="parish-options"
          autoComplete="off"
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
                defaultValue=""
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
              defaultValue="LA"
              autoComplete="off"
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="ID number" name="id_number" autoComplete="off" />
            <Input
              label="Date of birth"
              name="date_of_birth"
              type="date"
              autoComplete="off"
            />
          </div>
          <p className="mt-2 text-xs text-fog">
            Stored staff-only. Lists show only the last 4; the full number is read
            only when a record is opened to fill a form.
          </p>
        </fieldset>

        <Input label="Notes" name="notes" autoComplete="off" />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="plate-btn plate-btn--red text-sm disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save customer"}
          </button>
        </div>
      </form>
    </FormShell>
  );
}

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

function AddVehicleForm({ onDone }: { onDone: (message: string) => void }) {
  const [state, action, pending] = useActionState<VehicleFormState, FormData>(
    createVehicle,
    {},
  );
  const [draft, setDraft] = useState<VehicleDraft>(EMPTY_VEHICLE);
  const [decoding, setDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) {
      onDone(
        state.reused
          ? "VIN already on file. Reused the existing vehicle."
          : "Vehicle saved.",
      );
    }
  }, [state, onDone]);

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
    <FormShell title="Add a vehicle" error={state.error}>
      <form action={action} className="mt-4 space-y-4">
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

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="plate-btn plate-btn--red text-sm disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save vehicle"}
          </button>
        </div>
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
