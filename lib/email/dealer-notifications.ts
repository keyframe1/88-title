/**
 * Dealer transaction email notifications (server-only).
 *
 * One entry point — sendDealerNotification — fired from the staff mutations in
 * lib/dealers/actions.ts when a transaction reaches a state the dealer needs to
 * know about:
 *   - kind "ready"      -> "Ready for pickup" (status moved to ready_for_pickup)
 *   - kind "attention"  -> "Action needed" (staff raised needs_attention; the
 *                          attention_note is included)
 * Delivery goes through Resend (lib/email/resend.ts), which safely no-ops until
 * RESEND_API_KEY is set. Email only — dealers have no push channel.
 */
import type { Dealer, DealerTransaction } from "@/lib/dealers/types";
import { describeVehicle } from "@/lib/dealers/types";
import { sendEmail, type SendEmailResult } from "./resend";

const INK = "#14213D";
const PLATE = "#C8102E";
const FOG = "#586173";
const LINE = "#e5e8ef";

/** Which notification to send. Mirrors the two dealer-facing moments. */
export type DealerNotificationKind = "ready" | "attention";

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
  kind: DealerNotificationKind;
}

/**
 * Send the dealer the email for a "ready" or "attention" moment. Returns a
 * skipped result (never throws) when the dealer has no contact email; the caller
 * treats emailed=false as "no send" and continues.
 */
export async function sendDealerNotification({
  dealer,
  transaction,
  kind,
}: NotificationInput): Promise<SendEmailResult> {
  const to = dealer.contact_email?.trim();
  if (!to) {
    console.warn(
      `[email] Dealer ${dealer.id} has no contact_email; skipping ${kind} notification.`,
    );
    return { ok: false, skipped: true };
  }

  // Deep-link straight to THIS deal on the dealer board. This is a PLAIN ROUTE,
  // never an auth token or magic link: a signed-out dealer is bounced through the
  // login (which preserves this destination and returns to it after sign-in), and
  // a signed-in dealer lands on it directly. The board highlights the ?deal row.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const portalUrl = `${siteUrl}/dealers/dashboard?deal=${encodeURIComponent(transaction.id)}`;
  const vehicle = describeVehicle(transaction);
  const stock = transaction.stock_number?.trim();
  // The dealership recognizes the deal by its stock number first.
  const subjectRef = stock ? `stock #${stock}` : vehicle;
  const safeVehicle = escapeHtml(vehicle);
  const safeStock = stock ? escapeHtml(stock) : "";
  const refHtml = safeStock
    ? `<strong>${safeVehicle}</strong> (stock #${safeStock})`
    : `<strong>${safeVehicle}</strong>`;
  const refText = stock ? `${vehicle} (stock #${stock})` : vehicle;

  let content: EmailContent;
  if (kind === "ready") {
    content = {
      subject: `Ready for pickup — ${subjectRef}`,
      heading: "Ready for pickup",
      bodyHtml: `<p style="margin:0 0 12px;">${refHtml} is complete and ready to pick up at the 88 Title counter in Metairie.</p>`,
      text: `${refText} is complete and ready to pick up at the 88 Title counter in Metairie. Open the dealer portal: ${portalUrl}`,
      accent: INK,
    };
  } else {
    const note = transaction.attention_note?.trim();
    const noteHtml = note
      ? `<p style="margin:12px 0;padding:12px 14px;background:#fff5f6;border-left:3px solid ${PLATE};border-radius:4px;">${escapeHtml(note)}</p>`
      : "";
    content = {
      subject: `Action needed — ${subjectRef}`,
      heading: "This transaction needs your attention",
      bodyHtml: `<p style="margin:0;">${refHtml} needs your attention before we can continue.</p>${noteHtml}`,
      text: `${refText} needs your attention before we can continue.${note ? ` ${note}` : ""} Open the dealer portal: ${portalUrl}`,
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
