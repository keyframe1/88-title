"use client";

import {
  useActionState,
  useEffect,
  useState,
  type InputHTMLAttributes,
} from "react";
import {
  createCustomer,
  createVehicle,
  updateCustomer,
  updateVehicle,
} from "@/lib/records/actions";
import { isStandardVin } from "@/lib/records/normalize";
import { decodeVin } from "@/lib/vin";
import {
  CUSTOMER_ID_TYPES,
  CUSTOMER_ID_TYPE_LABEL,
  type CustomerEditData,
  type CustomerFormState,
  type Vehicle,
  type VehicleFormState,
} from "@/lib/records/types";

/**
 * The customer & vehicle add/edit forms, factored out of RecordsConsole so the
 * console can focus on the switcher, tables, and detail panels. The forms
 * themselves are UNCHANGED - same match-and-reuse creates, same edit-in-place,
 * same VIN decode - and are reused by the console's inline add flow and by the
 * panel's Edit action (which opens the exact same edit form).
 */

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

export function CustomerForm({
  mode,
  initial,
  parishOptions,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: CustomerEditData;
  parishOptions: string[];
  /** Called on success with a flash message and the resolved record id (used by
   *  the panel's "New customer" link-on-save flow). */
  onDone: (message: string, id?: string) => void;
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
      state.customerId,
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

        <fieldset className="rounded-xl border border-line bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-ink">
            Renewal reminder
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Renewal date"
              hint="When their registration renews. Drives the Renewals list."
              name="renewal_date"
              type="date"
              className="date-field"
              autoComplete="off"
              defaultValue={initial?.renewal_date ?? ""}
            />
            <label className="flex cursor-pointer items-start gap-3 self-end rounded-xl border border-line bg-white p-3 hover:border-ink">
              <input
                type="checkbox"
                name="marketing_consent"
                defaultChecked={initial?.marketing_consent ?? false}
                className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  Consented to reminders
                </span>
                <span className="mt-0.5 block text-xs text-fog">
                  Only consented customers with a date show in Renewals.
                </span>
              </span>
            </label>
          </div>
          <p className="mt-2 text-xs text-fog">
            Captured at check-in and carried here; set or clear it directly. Leave
            the date blank to fall back to their latest check-in.
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

export function VehicleForm({
  mode,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: Vehicle;
  /** Called on success with a flash message and the resolved record id (used by
   *  the panel's "New vehicle" link-on-save flow). */
  onDone: (message: string, id?: string) => void;
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
      state.vehicleId,
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
