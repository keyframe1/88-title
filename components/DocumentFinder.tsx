"use client";

import { useState } from "react";
import {
  clearPendingReadiness,
  savePendingReadiness,
} from "@/lib/checkin/readiness";
import { PlateButton } from "@/components/PlateButton";
import { Stamp } from "@/components/Stamp";
import { DownloadGlyph } from "@/components/DownloadGlyph";
import { useLocale, useUi } from "@/lib/i18n/client";
import { getLocalizedPath } from "@/lib/i18n/content/checklists";

/**
 * The interactive "what to bring" checklist for a single transaction — 88 Title's
 * no-account, friction-reduction centerpiece and the hero of each
 * /services/[slug] page.
 *
 * The transaction is fixed (the page already picked it, from the one editorial
 * selector), so this is a pure checklist: the customer ticks each item off as
 * they gather it, and a prominent "Check in online" CTA is present the whole
 * time. When everything is ready, a "You're ready to check in" note appears.
 *
 * Pure client state. No backend, no personal data. Nothing is saved unless the
 * customer opts to share their list at check-in, in which case a minimal, no-PII
 * readiness summary (transaction + which item ids are ready) is stashed for the
 * check-in form to pick up in the same tab. Checklists come from the typed config
 * in lib/checklists.ts, localized via the translation layer; the item ids carried
 * into check-in are language-neutral.
 */
export function DocumentFinder({ slug }: { slug: string }) {
  const ui = useUi();
  const locale = useLocale();
  const path = getLocalizedPath(slug, locale);

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  // Opt-in: share this list with the front desk at check-in. Off by default, so
  // declining changes nothing.
  const [share, setShare] = useState(false);

  // The page validates the slug before rendering (it 404s otherwise), so this is
  // a belt-and-braces guard that also narrows `path` for the rest of the body.
  if (!path) return null;

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Runs as the customer leaves for /check-in. If they opted in, stash a minimal
  // readiness summary (transaction + which items are ready, no PII) for the
  // check-in form to pick up; otherwise make sure nothing is left behind.
  function handleCheckInClick() {
    if (!path) return;
    if (share) {
      savePendingReadiness({
        serviceType: path.slug,
        ready: path.items.filter((item) => checked[item.id]).map((i) => i.id),
      });
    } else {
      clearPendingReadiness();
    }
  }

  const total = path.items.length;
  const done = path.items.reduce(
    (count, item) => (checked[item.id] ? count + 1 : count),
    0,
  );
  const complete = total > 0 && done === total;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <div>
        <div className="flex items-center justify-between text-sm font-semibold text-ink">
          <span>{ui.checklist.finder.yourChecklist}</span>
          <span aria-hidden="true">{ui.checklist.finder.ready(done, total)}</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={ui.checklist.finder.readyAria(done, total)}
        >
          <div
            className="h-full rounded-full bg-plate transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ul className="mt-5 space-y-2.5">
        {path.items.map((item) => {
          const isChecked = Boolean(checked[item.id]);
          return (
            <li key={item.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition duration-200 ${
                  isChecked
                    ? "border-ink bg-mist"
                    : "border-line bg-paper hover:border-ink"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(item.id)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
                />
                <span className="min-w-0">
                  <span
                    className={`block font-medium text-ink ${
                      isChecked ? "line-through" : ""
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.detail ? (
                    <span className="mt-0.5 block text-sm text-fog">
                      {item.detail}
                    </span>
                  ) : null}
                  {/* When the item maps to a public form, offer the blank PDF.
                      The <a> is interactive content, so a click on it does not
                      toggle the checkbox (HTML label semantics); stopPropagation
                      is belt-and-braces. Opens the form in a new tab. */}
                  {item.form ? (
                    <a
                      href={item.form.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={ui.checklist.finder.downloadFormAria(
                        item.form.number,
                        item.form.title,
                      )}
                      className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline-offset-2 transition-colors duration-150 hover:text-plate hover:underline focus-visible:text-plate focus-visible:underline"
                    >
                      <DownloadGlyph className="h-3.5 w-3.5" />
                      {ui.checklist.finder.downloadForm}
                    </a>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 space-y-4" aria-live="polite">
        {complete ? (
          <div className="rounded-2xl border-2 border-ink bg-mist p-5 text-center">
            <p className="font-display text-lg font-extrabold text-ink">
              {ui.checklist.finder.completeTitle}
            </p>
            <p className="mt-1 text-sm text-fog">
              {ui.checklist.finder.completeBody(path.label)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-fog">
            {ui.checklist.finder.progressHint}
          </p>
        )}

        {/* Optional: bring this list to the front desk. Opt-in, off by default;
            nothing is shared (or saved) unless this is ticked. */}
        <div className="rounded-2xl border border-line bg-mist/60 p-4 sm:p-5">
          <label className="flex cursor-pointer items-start gap-3 text-left">
            <input
              type="checkbox"
              checked={share}
              onChange={(e) => setShare(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">
                {ui.checklist.finder.shareTitle}
              </span>
              <span className="mt-0.5 block text-sm leading-relaxed text-fog">
                {ui.checklist.finder.shareBody}
              </span>
            </span>
          </label>
        </div>

        {/* The check-in CTA. Once every item is ticked, the READY stamp settles
            beside it — the completion moment, one-shot on mount and static under
            reduced motion. */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
          {complete ? (
            <Stamp
              label={ui.checklist.finder.readyStamp}
              ariaLabel={ui.checklist.finder.readyStampAria}
              animate
              className="h-[4.5rem] w-[4.5rem] shrink-0 sm:h-20 sm:w-20"
            />
          ) : null}
          <PlateButton
            href="/check-in"
            size="lg"
            variant="red"
            onClick={handleCheckInClick}
          >
            {ui.checklist.finder.checkIn}
          </PlateButton>
        </div>
      </div>
    </div>
  );
}
