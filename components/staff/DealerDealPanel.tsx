"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  describeVehicle,
  statusStepIndex,
  TRANSACTION_STATUSES,
  TRANSACTION_STATUS_META,
} from "@/lib/dealers/types";
import type { StaffDealerTransaction } from "@/lib/dealers/dal";
import { formatBusinessDate } from "@/lib/transactions/day";
import { useFocusTrap } from "@/components/console/useFocusTrap";
import { SealNode } from "@/components/dealers/SealNode";

/**
 * The dealer-deal detail panel — a right-hand drawer over the table where every
 * per-deal action lives. It is presentational + local editing state only: it
 * reports intent up (advance / return / flag / clear), and the console decides
 * which of those need the email-confirm gate. Focus moves to the close button on
 * open; Tab is trapped within the panel (suspended while a confirm dialog is up,
 * so that nested layer owns focus); Escape closes. Honors prefers-reduced-motion
 * (no slide).
 */
export function DealerDealPanel({
  open,
  tx,
  dealRef,
  confirmOpen,
  pending,
  onClose,
  onAdvance,
  onReturn,
  onFlagSubmit,
  onClearFlag,
}: {
  open: boolean;
  /** The deal to show; retained during the slide-out so content doesn't vanish. */
  tx: StaffDealerTransaction | null;
  /** Pre-computed deal reference ("#stock" or "#shortid"). */
  dealRef: string;
  /** A confirm dialog is open over the panel — suspend the panel's own trap. */
  confirmOpen: boolean;
  /** A mutation is in flight — disable every action to prevent a double fire. */
  pending: boolean;
  onClose: () => void;
  onAdvance: () => void;
  onReturn: () => void;
  onFlagSubmit: (note: string) => void;
  onClearFlag: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useFocusTrap(open && !confirmOpen, panelRef, onClose);

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  // Reset the transient UI (overflow menu, note editor) whenever the panel opens
  // or closes, or the deal / its flag / status changes — including right after a
  // flag mutation lands (so the editor closes and the saved card shows) and on
  // reopen (so a menu left open never persists). Adjusting state during render
  // (not in an effect) is React's supported reset-on-change pattern.
  const uiKey = `${open}:${tx?.id}:${tx?.status}:${tx?.needs_attention}:${tx?.attention_note}`;
  const [prevUiKey, setPrevUiKey] = useState(uiKey);
  if (uiKey !== prevUiKey) {
    setPrevUiKey(uiKey);
    setMenuOpen(false);
    setEditing(false);
  }

  const vehicle = tx ? describeVehicle(tx) : "";
  const idx = tx ? statusStepIndex(tx.status) : 0;
  const nextStatus = tx ? (TRANSACTION_STATUSES[idx + 1] ?? null) : null;
  const prevStatus = tx ? (TRANSACTION_STATUSES[idx - 1] ?? null) : null;
  const flagged = tx?.needs_attention ?? false;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close deal"
        tabIndex={-1}
        onClick={onClose}
        className={`fixed inset-0 z-50 cursor-default bg-ink/25 transition-opacity duration-200 motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={tx ? `Deal ${dealRef}, ${vehicle}` : "Deal details"}
        aria-hidden={!open}
        inert={!open}
        className={`fixed right-0 top-0 z-[51] flex h-dvh w-[452px] max-w-full flex-col border-l border-line bg-paper shadow-[-18px_0_48px_rgba(20,33,61,0.14)] transition-transform duration-300 ease-[var(--ease-brand)] motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {tx ? (
          <div className="flex-1 overflow-y-auto px-6 pb-10 pt-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-fog">
                  {tx.dealershipName}
                </p>
                <div className="mt-2 flex flex-wrap items-baseline gap-2.5">
                  <span className="text-sm font-semibold tabular-nums text-plate">
                    {dealRef}
                  </span>
                  <h2 className="font-display text-xl font-bold leading-tight text-ink">
                    {vehicle}
                  </h2>
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-fog transition-colors hover:bg-mist hover:text-ink"
              >
                ×
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fog">
              <span>{tx.transaction_type?.trim() || "Type to be confirmed"}</span>
              <span aria-hidden className="text-line">
                ·
              </span>
              <span className="tabular-nums">
                Filed {formatBusinessDate(tx.created_at)}
              </span>
            </div>

            {/* VIN */}
            {tx.vin?.trim() ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line bg-mist px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.07em] text-fog/70">
                    VIN
                  </p>
                  <p className="truncate font-mono text-sm tracking-wide text-ink">
                    {tx.vin.trim()}
                  </p>
                </div>
                <CopyVin vin={tx.vin.trim()} />
              </div>
            ) : null}

            <Divider />

            {/* Status stepper */}
            <SectionLabel>Status</SectionLabel>
            <ol className="mb-4">
              {TRANSACTION_STATUSES.map((status, i) => {
                const state =
                  i < idx ? "done" : i === idx ? "current" : "future";
                const notLast = i < TRANSACTION_STATUSES.length - 1;
                return (
                  <li key={status} className="flex items-stretch gap-3">
                    <div className="flex w-5 shrink-0 flex-col items-center">
                      <span
                        className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ${
                          state === "done"
                            ? "bg-ink"
                            : state === "current"
                              ? "border-2 border-ink bg-paper"
                              : "border-[1.5px] border-line bg-paper"
                        }`}
                      >
                        {state === "done" ? (
                          <SealNode className="h-3 w-3 text-white" />
                        ) : state === "current" ? (
                          <span className="h-[7px] w-[7px] rounded-full bg-ink" />
                        ) : null}
                      </span>
                      {notLast ? (
                        <span
                          className={`my-0.5 w-0.5 flex-1 ${
                            i < idx ? "bg-ink" : "bg-line"
                          }`}
                        />
                      ) : null}
                    </div>
                    <div
                      className={`pb-3.5 text-sm leading-[18px] ${
                        state === "future"
                          ? "text-fog/60"
                          : state === "current"
                            ? "font-semibold text-ink"
                            : "text-fog"
                      }`}
                    >
                      {TRANSACTION_STATUS_META[status].label}
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Status action */}
            <div className="relative flex items-center gap-2">
              {nextStatus ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={onAdvance}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-ink text-sm font-semibold text-white transition-colors hover:bg-ink-700 disabled:opacity-60"
                >
                  Advance to {TRANSACTION_STATUS_META[nextStatus].label}
                  <span aria-hidden>→</span>
                </button>
              ) : (
                <div className="flex h-11 flex-1 items-center justify-center rounded-lg border border-line text-sm font-medium text-fog">
                  Deal complete
                </div>
              )}
              {prevStatus ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="More status corrections"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-paper text-xl leading-none text-fog transition-colors hover:border-ink hover:text-ink disabled:opacity-60"
                >
                  ⋯
                </button>
              ) : null}
              {menuOpen && prevStatus ? (
                <div
                  role="menu"
                  className="absolute right-0 top-12 z-[5] min-w-[200px] rounded-xl border border-line bg-paper p-1.5 shadow-[0_12px_30px_rgba(20,33,61,0.16)]"
                >
                  <p className="px-2.5 pb-1 pt-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-fog/70">
                    Corrections
                  </p>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pending}
                    onClick={() => {
                      setMenuOpen(false);
                      onReturn();
                    }}
                    className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm text-fog transition-colors hover:bg-mist hover:text-ink disabled:opacity-60"
                  >
                    <span aria-hidden>↩</span> Return to{" "}
                    {TRANSACTION_STATUS_META[prevStatus].label}
                  </button>
                </div>
              ) : null}
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-fog/80">
              Submitted, Received and In progress are internal and instant. Ready
              for pickup notifies the dealer.
            </p>

            <Divider />

            {/* Flag */}
            <SectionLabel>Flag</SectionLabel>
            {flagged && !editing ? (
              <>
                <div className="rounded-xl border border-plate/20 bg-plate/[0.05] p-3.5">
                  <div className="mb-2 flex items-center gap-2">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-[1px] bg-plate" />
                    <span className="text-sm font-bold text-plate">
                      Needs attention
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-ink/80">
                    {tx.attention_note?.trim() || "No note was left."}
                  </p>
                  {tx.flaggedAt ? (
                    <p className="mt-2.5 border-t border-plate/15 pt-2.5 text-xs text-fog">
                      Flagged {formatBusinessDate(tx.flaggedAt)}
                      {tx.flaggedByName ? ` by ${tx.flaggedByName}` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setDraft(tx.attention_note ?? "");
                      setEditing(true);
                    }}
                    className="h-9 rounded-lg border border-line bg-paper px-3 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-60"
                  >
                    Update note
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={onClearFlag}
                    className="h-9 rounded-lg border border-plate/30 bg-paper px-3 text-sm font-semibold text-plate transition-colors hover:bg-plate/[0.06] disabled:opacity-60"
                  >
                    Clear flag
                  </button>
                </div>
              </>
            ) : editing ? (
              <div>
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Describe what needs fixing. The dealer receives this note by email."
                  className="min-h-20 w-full resize-y rounded-lg border border-line bg-paper px-3 py-2.5 text-sm leading-relaxed text-ink outline-none transition placeholder:text-fog/60 focus:border-ink focus:ring-2 focus:ring-ink/10"
                />
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    disabled={pending || !draft.trim()}
                    onClick={() => onFlagSubmit(draft.trim())}
                    className="h-9 rounded-lg bg-plate px-3.5 text-sm font-semibold text-white transition-colors hover:bg-plate-700 disabled:opacity-60"
                  >
                    Save &amp; notify dealer
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setEditing(false)}
                    className="h-9 rounded-lg border border-line bg-paper px-3.5 text-sm font-semibold text-fog transition-colors hover:border-ink hover:text-ink disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setDraft("");
                  setEditing(true);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-paper px-3.5 text-sm font-semibold text-ink transition-colors hover:border-plate hover:text-plate disabled:opacity-60"
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-[1px] bg-plate" />
                Flag for attention
              </button>
            )}
          </div>
        ) : null}
      </aside>
    </>
  );
}

function Divider() {
  return <div className="my-5 h-px bg-line" />;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3.5 text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-fog">
      {children}
    </p>
  );
}

/** The labeled VIN copy button (distinct from the icon-only row CopyButton). */
function CopyVin({ vin }: { vin: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(vin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Insecure context / denied: no-op (the value is still selectable).
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "VIN copied" : "Copy VIN"}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 text-xs font-semibold text-ink transition-colors hover:border-ink"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
      </svg>
      {copied ? "Copied" : "Copy"}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "VIN copied" : ""}
      </span>
    </button>
  );
}
