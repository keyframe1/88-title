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
      title={`Copy ${label}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-white px-1.5 py-0.5 text-[11px] font-semibold text-fog transition-colors hover:border-ink hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
        className ?? ""
      }`}
    >
      <span aria-hidden="true">{copied ? "Copied" : "Copy"}</span>
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
