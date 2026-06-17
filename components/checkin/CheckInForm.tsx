"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { transactionPaths } from "@/lib/checklists";
import { createCheckin } from "@/lib/checkin/actions";
import { saveActiveCheckin } from "@/lib/checkin/storage";
import type { CheckInFormState } from "@/lib/checkin/types";

const INITIAL: CheckInFormState = {};

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-fog/60 focus:border-ink";
const labelClass = "block text-sm font-semibold text-ink";

export function CheckInForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(createCheckin, INITIAL);
  const [service, setService] = useState("");

  // On success, remember this check-in on the device (token + ticket + service,
  // no PII) so the return banner can offer a one-tap resume, then route to the
  // live status. saveActiveCheckin no-ops if storage is unavailable.
  useEffect(() => {
    if (state.ok && state.token) {
      saveActiveCheckin({
        token: state.token,
        ticketCode: state.ticketCode ?? "",
        serviceType: service,
        savedAt: Date.now(),
      });
      router.push(`/check-in/status/${state.token}`);
    }
  }, [state.ok, state.token, state.ticketCode, service, router]);

  const isRenewal = service === "registration-renewal";

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="service_type" className={labelClass}>
          What are you here for?
        </label>
        <select
          id="service_type"
          name="service_type"
          required
          value={service}
          onChange={(e) => setService(e.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            Choose your visit…
          </option>
          {transactionPaths.map((path) => (
            <option key={path.slug} value={path.slug}>
              {path.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={labelClass}>
          Your name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className={inputClass}
          placeholder="Alex Boudreaux"
        />
      </div>

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
          placeholder="you@email.com"
        />
        <p className="text-xs text-fog">
          We&rsquo;ll send your live status link here.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className={labelClass}>
          Cell <span className="font-normal text-fog">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className={inputClass}
          placeholder="(504) 555-0123"
        />
      </div>

      {/* Renewal capture — the start of the retention database. */}
      {isRenewal ? (
        <div className="rounded-xl border border-line bg-mist/60 p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="renewal_date" className={labelClass}>
              Registration expiration{" "}
              <span className="font-normal text-fog">(optional)</span>
            </label>
            <input
              id="renewal_date"
              name="renewal_date"
              type="date"
              className={inputClass}
            />
          </div>

          <label className="mt-3 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="marketing_consent"
              value="on"
              className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">
                Remind me before my registration expires
              </span>
              <span className="mt-0.5 block text-sm text-fog">
                We&rsquo;ll email you a friendly heads-up when it&rsquo;s time to
                renew. Off by default; unsubscribe anytime.
              </span>
            </span>
          </label>
        </div>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-plate">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="plate-btn plate-btn--red w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Checking you in…" : "Check in"}
      </button>

      <p className="text-center text-xs text-fog">
        No account needed. We use your details only for this visit
        {isRenewal ? " (and renewal reminders, if you opt in)" : ""}.
      </p>
    </form>
  );
}
