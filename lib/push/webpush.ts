/**
 * Minimal Web Push sender (server-only). The SMS-alternative for the check-in
 * queue: when a customer's status flips to "in_progress", we push a real
 * notification to their browser/device even with the tab closed.
 *
 * Like the Resend hook (lib/email/resend.ts), this adds NO dependency — it
 * speaks the Web Push protocol directly with node:crypto + fetch:
 *   - VAPID (RFC 8292): a short-lived ES256 JWT identifies this app server.
 *   - aes128gcm payload encryption (RFC 8291 over RFC 8188): the body is
 *     end-to-end encrypted to the subscription's public key so the push service
 *     never sees the plaintext.
 *
 * Graceful degradation: if VAPID keys aren't configured, sendPush() is a safe
 * no-op (logs a warning, returns { ok:false, skipped:true }) so check-in works
 * before push is set up — customers fall back to email + the live status page.
 *
 * Generate keys with `node scripts/generate-vapid.mjs`. See docs/check-in-queue.md.
 */
import {
  createCipheriv,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign as cryptoSign,
  type KeyObject,
} from "node:crypto";
import type { PushSubscriptionJSON } from "@/lib/checkin/types";

export interface PushPayload {
  title: string;
  body: string;
  /** Where clicking the notification should open (the live status link). */
  url: string;
  /** Optional tag so re-sends replace rather than stack. */
  tag?: string;
}

export interface SendPushResult {
  ok: boolean;
  /** True when skipped because VAPID isn't configured. */
  skipped?: boolean;
  /** True when the push service reports the subscription is gone (404/410). */
  gone?: boolean;
  statusCode?: number;
  error?: string;
}

/** Whether VAPID keys are present, so push can actually be sent. */
export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      vapidSubject(),
  );
}

function vapidSubject(): string | null {
  const sub = process.env.VAPID_SUBJECT?.trim();
  if (sub) return sub;
  // A mailto: or https: subject is required by the spec; fall back to the site.
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return site ? site : null;
}

const b64urlToBuf = (s: string): Buffer => Buffer.from(s, "base64url");
const bufToB64url = (b: Buffer | Uint8Array): string =>
  Buffer.from(b).toString("base64url");

/** Build an EC P-256 public KeyObject from a raw 65-byte uncompressed point. */
function publicKeyFromPoint(point: Buffer): KeyObject {
  if (point.length !== 65 || point[0] !== 0x04) {
    throw new Error("Invalid P-256 public key point");
  }
  return createPublicKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: bufToB64url(point.subarray(1, 33)),
      y: bufToB64url(point.subarray(33, 65)),
    },
    format: "jwk",
  });
}

/** The raw 65-byte uncompressed point for an EC public KeyObject. */
function pointFromPublicKey(key: KeyObject): Buffer {
  const jwk = key.export({ format: "jwk" }) as { x?: string; y?: string };
  if (!jwk.x || !jwk.y) throw new Error("Key is not an EC public key");
  return Buffer.concat([
    Buffer.from([0x04]),
    b64urlToBuf(jwk.x),
    b64urlToBuf(jwk.y),
  ]);
}

/** The VAPID signing key, reconstructed from the configured raw key material. */
function vapidPrivateKey(): KeyObject {
  const pub = b64urlToBuf(process.env.VAPID_PUBLIC_KEY!);
  const d = b64urlToBuf(process.env.VAPID_PRIVATE_KEY!);
  return createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      d: bufToB64url(d),
      x: bufToB64url(pub.subarray(1, 33)),
      y: bufToB64url(pub.subarray(33, 65)),
    },
    format: "jwk",
  });
}

/** A signed VAPID Authorization header value for the given endpoint origin. */
function vapidAuthHeader(audience: string): string {
  const header = bufToB64url(
    Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })),
  );
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // ≤ 24h per spec
  const claims = bufToB64url(
    Buffer.from(JSON.stringify({ aud: audience, exp, sub: vapidSubject() })),
  );
  const signingInput = `${header}.${claims}`;
  // ES256 wants the raw r||s (P1363) signature, not DER.
  const signature = cryptoSign("sha256", Buffer.from(signingInput), {
    key: vapidPrivateKey(),
    dsaEncoding: "ieee-p1363",
  });
  const jwt = `${signingInput}.${bufToB64url(signature)}`;
  return `vapid t=${jwt}, k=${process.env.VAPID_PUBLIC_KEY}`;
}

const RECORD_SIZE = 4096;

/**
 * Encrypt `plaintext` to a subscription using aes128gcm (RFC 8291 + RFC 8188).
 * Exported for the verification round-trip; production calls go through sendPush.
 */
export function encryptPayload(
  sub: PushSubscriptionJSON,
  plaintext: Buffer,
): Buffer {
  const uaPublic = b64urlToBuf(sub.keys.p256dh); // 65-byte client point
  const authSecret = b64urlToBuf(sub.keys.auth); // 16-byte client secret
  const uaPublicKey = publicKeyFromPoint(uaPublic);

  // Ephemeral application-server keypair for this message.
  const { privateKey: asPrivate, publicKey: asPublicKey } = generateKeyPairSync(
    "ec",
    { namedCurve: "prime256v1" },
  );
  const asPublic = pointFromPublicKey(asPublicKey); // 65-byte server point

  // ECDH shared secret, then RFC 8291 key derivation.
  const ecdhSecret = diffieHellman({
    privateKey: asPrivate,
    publicKey: uaPublicKey,
  });
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0"),
    uaPublic,
    asPublic,
  ]);
  const ikm = Buffer.from(hkdfSync("sha256", ecdhSecret, authSecret, keyInfo, 32));

  const salt = randomBytes(16);
  const cek = Buffer.from(
    hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16),
  );
  const nonce = Buffer.from(
    hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12),
  );

  // Single record: plaintext followed by the 0x02 final-record delimiter.
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const body = Buffer.concat([
    cipher.update(Buffer.concat([plaintext, Buffer.from([0x02])])),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  // RFC 8188 header: salt(16) | rs(uint32) | idlen(uint8) | keyid(as_public).
  const header = Buffer.alloc(16 + 4 + 1);
  salt.copy(header, 0);
  header.writeUInt32BE(RECORD_SIZE, 16);
  header.writeUInt8(asPublic.length, 20);
  return Buffer.concat([header, asPublic, body]);
}

/**
 * Send a push notification. No-ops gracefully when VAPID isn't configured.
 * Never throws — returns a result the caller can log/act on.
 */
export async function sendPush(
  sub: PushSubscriptionJSON,
  payload: PushPayload,
  opts: { ttlSeconds?: number } = {},
): Promise<SendPushResult> {
  if (!isPushConfigured()) {
    console.warn(
      "[push] VAPID keys not set — skipping push. Run scripts/generate-vapid.mjs and set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT to enable.",
    );
    return { ok: false, skipped: true };
  }

  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { ok: false, error: "Malformed push subscription" };
  }

  try {
    const audience = new URL(sub.endpoint).origin;
    const body = encryptPayload(sub, Buffer.from(JSON.stringify(payload)));

    const response = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: vapidAuthHeader(audience),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(opts.ttlSeconds ?? 600),
        Urgency: "high",
      },
      body: new Uint8Array(body),
    });

    if (response.status === 404 || response.status === 410) {
      // Subscription expired/unsubscribed — caller should clear it.
      return { ok: false, gone: true, statusCode: response.status };
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`[push] Push service responded ${response.status}: ${detail}`);
      return { ok: false, statusCode: response.status, error: `Push ${response.status}` };
    }
    return { ok: true, statusCode: response.status };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error(`[push] Failed to send push: ${message}`);
    return { ok: false, error: message };
  }
}
