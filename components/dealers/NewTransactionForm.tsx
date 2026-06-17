"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTransaction } from "@/lib/dealers/actions";
import {
  TRANSACTION_TYPE_SUGGESTIONS,
  type TransactionFormState,
} from "@/lib/dealers/types";

const INITIAL: TransactionFormState = {};

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-fog/60 focus:border-ink";
const labelClass = "block text-sm font-semibold text-ink";

export function NewTransactionForm() {
  const [state, action, pending] = useActionState(createTransaction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="vehicle_description" className={labelClass}>
          Vehicle
        </label>
        <input
          id="vehicle_description"
          name="vehicle_description"
          type="text"
          className={inputClass}
          placeholder="2021 Toyota Camry · stock #A1234"
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

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-plate">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700"
        >
          Transaction filed. We&rsquo;ll take it from here.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="plate-btn plate-btn--red w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Filing…" : "File transaction"}
      </button>
    </form>
  );
}
