"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCheckin } from "@/lib/checkin/actions";
import { saveActiveCheckin } from "@/lib/checkin/storage";
import {
  clearPendingReadiness,
  parsePendingReadiness,
  readPendingReadinessRaw,
} from "@/lib/checkin/readiness";
import { useClientValue } from "@/lib/hooks/use-client";
import type { CheckInFormState } from "@/lib/checkin/types";
import { useLocale, useUi } from "@/lib/i18n/client";
import {
  getLocalizedPath,
  getLocalizedPaths,
} from "@/lib/i18n/content/checklists";

const INITIAL: CheckInFormState = {};

const inputClass =
  "field w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-fog/60 focus:border-ink";
const labelClass = "block text-sm font-semibold text-ink";

export function CheckInForm() {
  const ui = useUi();
  const locale = useLocale();
  const router = useRouter();
  const [state, action, pending] = useActionState(createCheckin, INITIAL);
  const [service, setService] = useState("");
  // Set true if the customer opts back out of sharing the checklist they brought.
  const [declined, setDeclined] = useState(false);

  const transactionPaths = getLocalizedPaths(locale);

  // An opt-in readiness summary carried from the /checklist tool, if any. Read
  // as a stable primitive (safe for useSyncExternalStore), then parsed derived.
  const rawCarried = useClientValue(readPendingReadinessRaw, null);
  const carried = useMemo(() => parsePendingReadiness(rawCarried), [rawCarried]);

  // The visit defaults to the checklist's transaction until the customer picks
  // one, so the dropdown reflects what they brought without a setState-in-effect.
  const effectiveService =
    service || (!declined ? carried?.serviceType ?? "" : "");

  // The brought checklist only applies while the selected visit still matches it
  // and the customer hasn't opted back out. Otherwise it is not shared.
  const attached =
    carried && !declined && effectiveService === carried.serviceType
      ? carried
      : null;

  // Resolve the brought readiness against the localized checklist, so the counts
  // and "still gathering" labels render in the active language.
  const summary = useMemo(() => {
    if (!attached) return null;
    const path = getLocalizedPath(attached.serviceType, locale);
    if (!path) return null;
    const ready = new Set(attached.ready);
    const missing = path.items.filter((item) => !ready.has(item.id));
    const total = path.items.length;
    return {
      total,
      readyCount: total - missing.length,
      missingLabels: missing.map((item) => item.label),
      allReady: missing.length === 0,
    };
  }, [attached, locale]);

  function declineShare() {
    // Keep the visit they came to check in for; just stop sharing the checklist.
    if (!service && carried) setService(carried.serviceType);
    setDeclined(true);
    clearPendingReadiness();
  }

  // On success, remember this check-in on the device (token + ticket + service,
  // no PII) so the return banner can offer a one-tap resume, then route to the
  // live status. saveActiveCheckin no-ops if storage is unavailable.
  useEffect(() => {
    if (state.ok && state.token) {
      saveActiveCheckin({
        token: state.token,
        ticketCode: state.ticketCode ?? "",
        serviceType: effectiveService,
        savedAt: Date.now(),
      });
      // The brought checklist has been submitted (or wasn't); don't carry it on.
      clearPendingReadiness();
      router.push(`/check-in/status/${state.token}`);
    }
  }, [state.ok, state.token, state.ticketCode, effectiveService, router]);

  const isRenewal = effectiveService === "registration-renewal";

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="service_type" className={labelClass}>
          {ui.checkin.form.serviceLabel}
        </label>
        <select
          id="service_type"
          name="service_type"
          required
          value={effectiveService}
          onChange={(e) => setService(e.target.value)}
          className={`${inputClass} select-field pr-10`}
        >
          <option value="" disabled>
            {ui.checkin.form.servicePlaceholder}
          </option>
          {transactionPaths.map((path) => (
            <option key={path.slug} value={path.slug}>
              {path.label}
            </option>
          ))}
        </select>
      </div>

      {/* The checklist the customer chose to bring. Honest about what's shared,
          and they can still opt back out right here. Hidden field carries the
          summary into the submission; the server re-validates it. */}
      {attached && summary ? (
        <div className="rounded-xl border border-ink/30 bg-mist/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                {ui.checkin.form.sharingTitle}
              </p>
              <p className="mt-0.5 text-sm text-fog">
                {summary.allReady
                  ? ui.checkin.form.sharingAllReady(summary.total)
                  : ui.checkin.form.sharingSomeReady(
                      summary.readyCount,
                      summary.total,
                    )}
                {summary.missingLabels.length > 0
                  ? ui.checkin.form.sharingStillGathering(
                      summary.missingLabels.join(", "),
                    )
                  : ""}
              </p>
              <p className="mt-1 text-xs text-fog">
                {ui.checkin.form.sharingHelp}
              </p>
            </div>
            <button
              type="button"
              onClick={declineShare}
              className="shrink-0 text-sm font-semibold text-fog underline-offset-2 transition-colors hover:text-plate hover:underline"
            >
              {ui.checkin.form.dontShare}
            </button>
          </div>
          <input
            type="hidden"
            name="readiness"
            value={JSON.stringify({
              serviceType: attached.serviceType,
              ready: attached.ready,
            })}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={labelClass}>
          {ui.checkin.form.nameLabel}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className={inputClass}
          placeholder={ui.checkin.form.namePlaceholder}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelClass}>
          {ui.checkin.form.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          placeholder={ui.checkin.form.emailPlaceholder}
        />
        <p className="text-xs text-fog">{ui.checkin.form.emailHint}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className={labelClass}>
          {ui.checkin.form.cellLabel}{" "}
          <span className="font-normal text-fog">
            {ui.checkin.form.optional}
          </span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className={inputClass}
          placeholder={ui.checkin.form.cellPlaceholder}
        />
      </div>

      {/* Renewal capture — the start of the retention database. */}
      {isRenewal ? (
        <div className="rounded-xl border border-line bg-mist/60 p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="renewal_date" className={labelClass}>
              {ui.checkin.form.renewalLabel}{" "}
              <span className="font-normal text-fog">
                {ui.checkin.form.optional}
              </span>
            </label>
            <input
              id="renewal_date"
              name="renewal_date"
              type="date"
              className={`${inputClass} date-field`}
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
                {ui.checkin.form.remindTitle}
              </span>
              <span className="mt-0.5 block text-sm text-fog">
                {ui.checkin.form.remindBody}
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
        className="btn btn--primary btn--glow w-full"
      >
        {pending ? ui.checkin.form.submitting : ui.checkin.form.submit}
      </button>

      <p className="text-center text-xs text-fog">
        {ui.checkin.form.privacy(isRenewal)}
      </p>
    </form>
  );
}
