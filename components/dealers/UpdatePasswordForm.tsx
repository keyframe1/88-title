"use client";

import { useActionState } from "react";
import { updatePassword } from "@/lib/dealers/actions";
import type { AuthFormState } from "@/lib/dealers/types";

const INITIAL: AuthFormState = {};

const inputClass =
  "field w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-fog/60 focus:border-ink";
const labelClass = "block text-sm font-semibold text-ink";

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={labelClass}>
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
          placeholder="At least 8 characters"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className={labelClass}>
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
          placeholder="Re-enter your new password"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-plate">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn btn--primary w-full"
      >
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
