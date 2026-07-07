/**
 * Dealer transaction email notifications (server-only).
 *
 * One entry point — sendTransactionStatusEmail — fired from the staff
 * status-change action (lib/dealers/actions.ts) when a transaction moves to a
 * state the dealer needs to act on:
 *   - "ready"        -> "Ready for pickup"
 *   - "docs_needed"  -> "We need additional documents" (includes the note)
 * Any other status is a no-op. Delivery goes through Resend (lib/email/resend.ts),
 * which safely no-ops until RESEND_API_KEY is set.
 */
import type { Dealer, DealerTransaction } from "@/lib/dealers/types";
import { sendEmail, type SendEmailResult } from "./resend";

const INK = "#14213D";
const PLATE = "#C8102E";
const FOG = "#586173";
const LINE = "#e5e8ef";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface EmailContent {
  subject: string;
  heading: string;
  /** Lead paragraph (already HTML-escaped where needed). */
  bodyHtml: string;
  /** Plain-text fallback. */
  text: string;
  accent: string;
}

function buildShell(content: EmailContent, portalUrl: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f6f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid ${LINE};border-radius:14px;overflow:hidden;">
      <div style="background:${INK};padding:20px 28px;">
        <span style="display:inline-block;font-weight:800;letter-spacing:0.06em;color:#ffffff;font-size:18px;">88&nbsp;TITLE</span>
      </div>
      <div style="height:4px;background:${content.accent};"></div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.2;color:${INK};">${escapeHtml(content.heading)}</h1>
        <div style="font-size:15px;line-height:1.6;color:${INK};">${content.bodyHtml}</div>
        <div style="margin:28px 0 4px;">
          <a href="${portalUrl}" style="display:inline-block;background:${INK};color:#ffffff;text-decoration:none;font-weight:700;letter-spacing:0.04em;padding:12px 22px;border-radius:8px;">Open the dealer portal</a>
        </div>
      </div>
      <div style="padding:18px 28px;border-top:1px solid ${LINE};font-size:12px;color:${FOG};">
        88 Title · Metairie, LA · You're receiving this because your dealership has a 88 Title portal account.
      </div>
    </div>
  </body>
</html>`;
}

interface NotificationInput {
  dealer: Dealer;
  transaction: DealerTransaction;
}

export async function sendTransactionStatusEmail({
  dealer,
  transaction,
}: NotificationInput): Promise<SendEmailResult> {
  const to = dealer.contact_email?.trim();
  if (!to) {
    console.warn(
      `[email] Dealer ${dealer.id} has no contact_email; skipping ${transaction.status} notification.`,
    );
    return { ok: false, skipped: true };
  }

  if (transaction.status !== "ready" && transaction.status !== "docs_needed") {
    return { ok: false, skipped: true };
  }

  const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/dealers/dashboard`;
  const vehicle =
    transaction.vehicle_description?.trim() ||
    transaction.transaction_type?.trim() ||
    "your transaction";
  const safeVehicle = escapeHtml(vehicle);

  let content: EmailContent;
  if (transaction.status === "ready") {
    content = {
      subject: `Ready for pickup — ${vehicle}`,
      heading: "Ready for pickup",
      bodyHtml: `<p style="margin:0 0 12px;"><strong>${safeVehicle}</strong> is complete and ready to pick up at the 88 Title counter in Metairie.</p>`,
      text: `${vehicle} is complete and ready to pick up at the 88 Title counter in Metairie. Open the dealer portal: ${portalUrl}`,
      accent: INK,
    };
  } else {
    const note = transaction.docs_needed_note?.trim();
    const noteHtml = note
      ? `<p style="margin:12px 0;padding:12px 14px;background:#fff5f6;border-left:3px solid ${PLATE};border-radius:4px;">${escapeHtml(note)}</p>`
      : "";
    content = {
      subject: `Action needed — ${vehicle}`,
      heading: "We need additional documents",
      bodyHtml: `<p style="margin:0;">Before we can finish <strong>${safeVehicle}</strong>, we need a few more documents.</p>${noteHtml}`,
      text: `Before we can finish ${vehicle}, we need additional documents.${note ? ` ${note}` : ""} Open the dealer portal: ${portalUrl}`,
      accent: PLATE,
    };
  }

  return sendEmail({
    to,
    subject: content.subject,
    html: buildShell(content, portalUrl),
    text: content.text,
  });
}
