"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A single, lightweight "action done — Undo?" toast for the back-office consoles.
 *
 * The action fires IMMEDIATELY (no confirm); this toast is the safety net that
 * offers a real inverse for a short window. Deliberately minimal and dependency-
 * free (no portal, no library): one toast at a time, auto-dismissing after
 * UNDO_TIMEOUT_MS, keyboard reachable (the Undo and dismiss are real <button>s),
 * and reduced-motion safe (its entrance animation is zeroed by the global
 * prefers-reduced-motion rule in globals.css).
 *
 * The countdown PAUSES while the toast has pointer or keyboard focus, so a
 * keyboard user tabbing to Undo never has it vanish mid-reach. Undo's handler is
 * a real server-action inverse supplied by the caller; this component owns only
 * the presentation and the timer.
 */
const UNDO_TIMEOUT_MS = 6000;

export interface UndoToastState {
  message: string;
  onUndo: () => void;
}

export interface UndoToastController {
  toast: UndoToastState | null;
  /** Show (or replace) the single toast with a message and its inverse action. */
  show: (message: string, onUndo: () => void) => void;
  dismiss: () => void;
  /** Pause / resume the auto-dismiss countdown (used on focus + hover). */
  pause: () => void;
  resume: () => void;
}

export function useUndoToast(): UndoToastController {
  const [toast, setToast] = useState<UndoToastState | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setToast(null);
    }, UNDO_TIMEOUT_MS);
  }, [clearTimer]);

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const show = useCallback(
    (message: string, onUndo: () => void) => {
      setToast({ message, onUndo });
      startTimer();
    },
    [startTimer],
  );

  // Only re-arm the countdown on resume if a toast is actually showing.
  const resume = useCallback(() => {
    if (toast) startTimer();
  }, [toast, startTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { toast, show, dismiss, pause: clearTimer, resume };
}

/**
 * The toast surface. Renders nothing when there is no active toast. Fixed at the
 * bottom center, above the console; the inner card is a polite live region so the
 * message is announced without stealing focus.
 */
export function UndoToast({
  controller,
}: {
  controller: UndoToastController;
}) {
  const { toast, dismiss, pause, resume } = controller;
  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocus={pause}
        onBlur={resume}
        className="pointer-events-auto flex items-center gap-3 rounded-xl border border-ink bg-ink px-4 py-3 text-white shadow-lg animate-[toast-in_160ms_ease-out]"
      >
        <span className="text-sm font-medium">{toast.message}</span>
        <button
          type="button"
          onClick={() => {
            toast.onUndo();
            dismiss();
          }}
          className="rounded-md border border-white/40 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mr-1 flex h-6 w-6 items-center justify-center rounded-md text-white/70 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
