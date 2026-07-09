"use client";

import { useEffect, useRef } from "react";
import { useFocusTrap } from "./useFocusTrap";

/**
 * A modal confirmation for a consequential, hard-to-undo staff action — chiefly
 * the ones that email a dealer. It is the deliberate counterpart to the Undo
 * toast: reversible actions get Undo, irreversible / outward-facing ones get this
 * gate. Rendered only while open (mount = open), so its focus lifecycle is a
 * clean mount/unmount: on mount it remembers the opener and moves focus in; on
 * unmount it restores focus to the opener. Escape and backdrop both cancel, and
 * neither Cancel nor a dismiss performs the action.
 */
export function ConfirmDialog({
  heading,
  body,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  heading: string;
  body: string;
  confirmLabel: string;
  /** While true the primary is disabled — the mutation is in flight. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(true, cardRef, onCancel);

  // Move focus in on open; restore it to the opener on close (unmount).
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Cancel"
        tabIndex={-1}
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-ink/40"
      />
      <div
        ref={cardRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-heading"
        aria-describedby="confirm-body"
        className="relative w-[422px] max-w-full rounded-2xl bg-paper p-6 shadow-[0_24px_70px_rgba(20,33,61,0.32)]"
      >
        <div className="mb-3 flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-plate/10"
          >
            <span className="h-2 w-2 rounded-[2px] bg-plate" />
          </span>
          <h2
            id="confirm-heading"
            className="font-display text-lg font-bold text-ink"
          >
            {heading}
          </h2>
        </div>
        <p
          id="confirm-body"
          className="mb-6 text-sm leading-relaxed text-fog"
        >
          {body}
        </p>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-line bg-paper px-4 text-sm font-semibold text-fog transition-colors hover:border-ink hover:text-ink"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="h-10 rounded-lg bg-plate px-5 text-sm font-bold text-white transition-colors hover:bg-plate-700 disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
