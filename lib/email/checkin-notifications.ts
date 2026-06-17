/**
 * Check-in queue customer email notifications (server-only).
 *
 * Two messages, both delivered through Resend (lib/email/resend.ts), which
 * safely no-ops until RESEND_API_KEY is set:
 *   - sendCheckinConfirmationEmail — on check-in ("You're #4, ~18 min, here's
 *     your live status link").
 *   - sendYoureUpEmail — when staff move the customer to "in_progress".
 *
 * Email only — no SMS. The browser-push path (lib/push/webpush.ts) is the
 * separate, real-time "you're up" channel; email is the always-on fallback.
 */
import { sendEmail, type SendEmailResult } from "./resend";

const INK = "#14213D";
const PLATE = "#C8102E";
const FOG = "#586173";
const LINE = "#e5e8ef";
const MIST = "#f5f6f9";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface ShellContent {
  heading: string;
  bodyHtml: string;
  accent: string;
  ctaLabel: string;
  ctaUrl: string;
}

function buildShell(content: ShellContent): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:${MIST};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid ${LINE};border-radius:14px;overflow:hidden;">
      <div style="background:${INK};padding:20px 28px;">
        <span style="display:inline-block;font-weight:800;letter-spacing:0.06em;color:#ffffff;font-size:18px;">88&nbsp;TITLE</span>
      </div>
      <div style="height:4px;background:${content.accent};"></div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.2;color:${INK};">${escapeHtml(content.heading)}</h1>
        <div style="font-size:15px;line-height:1.6;color:${INK};">${content.bodyHtml}</div>
        <div style="margin:28px 0 4px;">
          <a href="${content.ctaUrl}" style="display:inline-block;background:${INK};color:#ffffff;text-decoration:none;font-weight:700;letter-spacing:0.04em;padding:12px 22px;border-radius:8px;">${escapeHtml(content.ctaLabel)}</a>
        </div>
      </div>
      <div style="padding:18px 28px;border-top:1px solid ${LINE};font-size:12px;color:${FOG};">
        88 Title · Metairie, LA · You're receiving this because you checked in online. We'll only email about this visit unless you opted in to renewal reminders.
      </div>
    </div>
  </body>
</html>`;
}

function greeting(name: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? `${escapeHtml(trimmed)}, ` : "";
}

export interface CheckinConfirmationInput {
  to: string;
  name: string | null;
  ticketCode: string;
  serviceLabel: string;
  /** 1-based place in line. */
  position: number;
  /** Friendly minutes estimate. */
  etaMinutes: number;
  statusUrl: string;
}

export async function sendCheckinConfirmationEmail(
  input: CheckinConfirmationInput,
): Promise<SendEmailResult> {
  const to = input.to?.trim();
  if (!to) return { ok: false, skipped: true };

  const placeLine =
    input.position > 1
      ? `You're <strong>#${input.position}</strong> in line, about <strong>${input.etaMinutes} min</strong> based on the current wait.`
      : `You're <strong>next</strong>. Hang tight, we'll call your ticket shortly.`;

  const bodyHtml =
    `<p style="margin:0 0 12px;">${greeting(input.name)}you're checked in for <strong>${escapeHtml(input.serviceLabel)}</strong>.</p>` +
    `<p style="margin:0 0 12px;">Your ticket is <strong style="font-size:20px;letter-spacing:0.04em;">${escapeHtml(input.ticketCode)}</strong>.</p>` +
    `<p style="margin:0;">${placeLine}</p>` +
    `<p style="margin:12px 0 0;color:${FOG};">Keep the live status open and we'll move you up automatically, no refresh needed.</p>`;

  const text =
    `${input.name ? `${input.name}, ` : ""}you're checked in for ${input.serviceLabel}. ` +
    `Ticket ${input.ticketCode}. ` +
    (input.position > 1
      ? `You're #${input.position} in line (about ${input.etaMinutes} min). `
      : `You're next. `) +
    `Track your live status: ${input.statusUrl}`;

  return sendEmail({
    to,
    subject: `You're checked in, ticket ${input.ticketCode}`,
    html: buildShell({
      heading: "You're checked in",
      bodyHtml,
      accent: INK,
      ctaLabel: "View your live status",
      ctaUrl: input.statusUrl,
    }),
    text,
  });
}

export interface YoureUpInput {
  to: string;
  name: string | null;
  ticketCode: string;
  statusUrl: string;
}

export async function sendYoureUpEmail(
  input: YoureUpInput,
): Promise<SendEmailResult> {
  const to = input.to?.trim();
  if (!to) return { ok: false, skipped: true };

  const bodyHtml =
    `<p style="margin:0 0 12px;">${greeting(input.name)}you're up! Please head to the 88 Title counter in Metairie.</p>` +
    `<p style="margin:0;">Show your ticket <strong style="font-size:20px;letter-spacing:0.04em;">${escapeHtml(input.ticketCode)}</strong> to the staff.</p>`;

  const text =
    `${input.name ? `${input.name}, ` : ""}you're up! Head to the 88 Title counter. ` +
    `Your ticket is ${input.ticketCode}. ${input.statusUrl}`;

  return sendEmail({
    to,
    subject: `You're up, ticket ${input.ticketCode}`,
    html: buildShell({
      heading: "You're up. Head to the counter",
      bodyHtml,
      accent: PLATE,
      ctaLabel: "Open your status",
      ctaUrl: input.statusUrl,
    }),
    text,
  });
}
