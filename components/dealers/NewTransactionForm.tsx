"use client";

import { useActionState, useState } from "react";
import { createTransaction } from "@/lib/dealers/actions";
import { isStandardVin } from "@/lib/records/normalize";
import { decodeVin } from "@/lib/vin";
import {
  TRANSACTION_TYPE_SUGGESTIONS,
  type TransactionFormState,
} from "@/lib/dealers/types";

const INITIAL: TransactionFormState = {};

const inputClass =
  "field w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-fog/60 focus:border-ink";
const labelClass = "block text-sm font-semibold text-ink";

export function NewTransactionForm() {
  const [state, action, pending] = useActionState(createTransaction, INITIAL);

  // Reset the fields after a successful file by remounting them under a new key.
  // This is React's "adjust state during render" pattern (not an effect): when a
  // submission newly succeeds we bump the key, so the child unmounts and its
  // field state (VIN, decoded values, notes) clears without a setState-in-effect.
  const [resetKey, setResetKey] = useState(0);
  const [sawSuccess, setSawSuccess] = useState(false);
  const success = Boolean(state.success);
  if (success !== sawSuccess) {
    setSawSuccess(success);
    if (success) setResetKey((k) => k + 1);
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <FileFields key={resetKey} />

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-plate">
          {state.error}
        </p>
      ) : null}
      {success ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700"
        >
          Transaction filed. It&rsquo;s on your board as &ldquo;Submitted.&rdquo;
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn btn--primary w-full"
      >
        {pending ? "Filing…" : "File transaction"}
      </button>
    </form>
  );
}

interface Decoded {
  year: string;
  make: string;
  model: string;
}

/**
 * The form fields, owning the VIN/decode state. Kept as a separate component so
 * the parent can reset them by changing its key (see NewTransactionForm).
 */
function FileFields() {
  const [vin, setVin] = useState("");
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  async function handleDecode() {
    setDecodeError(null);
    setDecoding(true);
    const result = await decodeVin(vin).catch(() => null);
    setDecoding(false);
    if (!result || (!result.year && !result.make && !result.model)) {
      setDecoded(null);
      setDecodeError("Could not decode that VIN. Add the vehicle by hand below.");
      return;
    }
    setDecoded({ year: result.year, make: result.make, model: result.model });
  }

  const vinWarn =
    vin.trim().length >= 17 && !isStandardVin(vin)
      ? "This VIN has an I, O, or Q, which standard VINs do not use. Double-check it."
      : null;

  const decodedLabel = decoded
    ? [decoded.year, decoded.make, decoded.model].filter(Boolean).join(" ")
    : "";

  return (
    <>
      {/* Stock number — how a dealership speaks. Prominent, first. */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="stock_number" className={labelClass}>
          Stock number
        </label>
        <input
          id="stock_number"
          name="stock_number"
          type="text"
          className={`${inputClass} font-mono`}
          placeholder="A1234"
          autoComplete="off"
        />
      </div>

      {/* VIN — structured, with an NHTSA decode that fills year/make/model. */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="vin" className={labelClass}>
          VIN
        </label>
        <div className="flex gap-2">
          <input
            id="vin"
            name="vin"
            type="text"
            value={vin}
            onChange={(event) => {
              setVin(event.target.value);
              setDecoded(null);
              setDecodeError(null);
            }}
            className={`${inputClass} font-mono uppercase`}
            placeholder="1HGCM82633A004352"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => void handleDecode()}
            disabled={decoding || vin.trim().length < 5}
            className="btn btn--secondary shrink-0"
            title="Look up year, make, and model from the VIN (NHTSA)"
          >
            {decoding ? "Decoding…" : "Decode"}
          </button>
        </div>
        {vinWarn ? (
          <p className="text-xs font-medium text-plate">{vinWarn}</p>
        ) : null}
        {decodeError ? (
          <p className="text-xs font-medium text-plate">{decodeError}</p>
        ) : null}
        {decoded ? (
          <p className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <span className="font-semibold">Decoded:</span>
            <span>{decodedLabel || "no details returned"}</span>
          </p>
        ) : null}
        {/* Decoded fields ride along so they persist through submit. */}
        <input type="hidden" name="vehicle_year" value={decoded?.year ?? ""} />
        <input type="hidden" name="vehicle_make" value={decoded?.make ?? ""} />
        <input type="hidden" name="vehicle_model" value={decoded?.model ?? ""} />
      </div>

      {/* Free-text vehicle line, kept for anything the decode misses. */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="vehicle_description" className={labelClass}>
          Vehicle{" "}
          <span className="font-normal text-fog">(if not decoded above)</span>
        </label>
        <input
          id="vehicle_description"
          name="vehicle_description"
          type="text"
          className={inputClass}
          placeholder="2021 Toyota Camry"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="transaction_type" className={labelClass}>
          Transaction type
        </label>
        <input
          id="transaction_type"
          name="transaction_type"
          type="text"
          list="transaction-type-options"
          className={inputClass}
          placeholder="Title transfer"
          autoComplete="off"
        />
        <datalist id="transaction-type-options">
          {TRANSACTION_TYPE_SUGGESTIONS.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className={labelClass}>
          Notes <span className="font-normal text-fog">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className={`${inputClass} resize-y`}
          placeholder="Anything we should know about this one"
        />
      </div>
    </>
  );
}
