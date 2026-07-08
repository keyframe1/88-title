"use client";

import { useActionState, useState } from "react";
import { requestPasswordReset, signIn } from "@/lib/dealers/actions";
import type { AuthFormState } from "@/lib/dealers/types";

const INITIAL: AuthFormState = {};

const inputClass =
  "field w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-fog/60 focus:border-ink";
const labelClass = "block text-sm font-semibold text-ink";

export function LoginForm({
  redirectedFrom,
  emailPlaceholder = "you@dealership.com",
}: {
  redirectedFrom?: string;
  emailPlaceholder?: string;
}) {
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [signInState, signInAction, signInPending] = useActionState(
    signIn,
    INITIAL,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    requestPasswordReset,
    INITIAL,
  );

  if (mode === "reset") {
    return (
      <form action={resetAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reset-email" className={labelClass}>
            Email
          </label>
          <input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
            placeholder={emailPlaceholder}
          />
        </div>

        {resetState.error ? (
          <p role="alert" className="text-sm font-medium text-plate">
            {resetState.error}
          </p>
        ) : null}
        {resetState.message ? (
          <p
            role="status"
            className="rounded-lg border border-line bg-mist px-4 py-3 text-sm text-ink"
          >
            {resetState.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={resetPending}
          className="btn btn--primary w-full"
        >
          {resetPending ? "Sending…" : "Send reset link"}
        </button>

        <button
          type="button"
          onClick={() => setMode("signin")}
          className="text-sm font-semibold text-ink underline-offset-4 transition-colors hover:text-plate hover:underline"
        >
          ← Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form action={signInAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirectedFrom" value={redirectedFrom ?? ""} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          placeholder={emailPlaceholder}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <button
            type="button"
            onClick={() => setMode("reset")}
            className="text-xs font-semibold text-fog underline-offset-4 transition-colors hover:text-plate hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
          placeholder="••••••••"
        />
      </div>

      {signInState.error ? (
        <p role="alert" className="text-sm font-medium text-plate">
          {signInState.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={signInPending}
        className="btn btn--primary w-full"
      >
        {signInPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
