/**
 * Minimal Resend sender (server-only).
 *
 * Talks to the Resend REST API with fetch — no SDK dependency to add. If
 * RESEND_API_KEY is not set, sending is a safe no-op that logs a warning and
 * returns { ok: false, skipped: true }, so the rest of the app works before
 * Resend is configured. See docs/dealer-portal.md for activation steps.
 *
 * Email only. No SMS / A2P / Twilio.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  ok: boolean;
  /** True when sending was skipped because Resend isn't configured. */
  skipped?: boolean;
  /** Resend message id on success. */
  id?: string;
  error?: string;
}

export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  // Sender identity is the single source of truth in the RESEND_FROM env var —
  // no hardcoded fallback address, so a stale or unverified sender can never be
  // used silently in production. Both vars are required to send.
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    const missing = !apiKey ? "RESEND_API_KEY" : "RESEND_FROM";
    console.warn(
      `[email] ${missing} not set — skipping email "${params.subject}" to ${params.to}. ` +
        `Set both RESEND_API_KEY and RESEND_FROM to enable sending.`,
    );
    return { ok: false, skipped: true };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        ...(params.text ? { text: params.text } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`[email] Resend responded ${response.status}: ${detail}`);
      return { ok: false, error: `Resend ${response.status}` };
    }

    const data = (await response.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error(`[email] Failed to reach Resend: ${message}`);
    return { ok: false, error: message };
  }
}
