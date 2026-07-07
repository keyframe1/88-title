"use client";

import { useState, type ReactNode } from "react";

/**
 * One-click copy for the back-office console (VINs, phone numbers, and the like).
 *
 * A real <button> (keyboard-focusable and Enter/Space-activatable), copying via
 * navigator.clipboard.writeText with a brief "Copied" confirmation. The clipboard
 * API rejects in an insecure context or when permission is denied; that is caught
 * and ignored, so a failure simply does nothing (staff can still select the text
 * by hand). The label names WHAT is copied for screen readers, and the
 * confirmation is announced through a polite live region.
 */
export function CopyButton({
  value,
  label,
  className,
}: {
  /** The exact text placed on the clipboard. */
  value: string;
  /** What is being copied, e.g. "VIN" or "phone" (for the accessible name). */
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Insecure context / permission denied: no-op. The text is still selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? `${label} copied` : `Copy ${label}`}
      className={`console-copy inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
        copied ? "text-ink" : ""
      } ${className ?? ""}`}
    >
      {copied ? (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 12 4.5 4.5L19 7" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
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
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? `${label} copied` : ""}
      </span>
    </button>
  );
}

/**
 * A value rendered next to its copy button. Keeps the two visually together and
 * lets the value be monospace (for VINs) without every call site re-wiring the
 * flex + CopyButton pairing.
 */
export function CopyableValue({
  value,
  label,
  mono,
  className,
  children,
}: {
  value: string;
  label: string;
  mono?: boolean;
  className?: string;
  /** Custom rendering of the value; defaults to the raw value text. */
  children?: ReactNode;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      <span className={mono ? "font-mono tracking-tight tabular-nums" : ""}>
        {children ?? value}
      </span>
      <CopyButton value={value} label={label} />
    </span>
  );
}
