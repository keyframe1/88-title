#!/usr/bin/env node
// @ts-check
/**
 * Generate a VAPID key pair for Web Push (the check-in queue's notifications).
 *
 * Web Push needs one application-server key pair (P-256). The PUBLIC key is
 * shipped to the browser as the applicationServerKey; the PRIVATE key stays on
 * the server and signs the VAPID auth JWT. This prints both in the raw
 * base64url form lib/push/webpush.ts expects — no dependency, like the rest of
 * the push stack.
 *
 * Usage:
 *   node scripts/generate-vapid.mjs
 *
 * Then paste the three lines it prints into .env.local (and your host's env).
 * Keep VAPID_PRIVATE_KEY secret; it is never sent to the browser.
 */
import { generateKeyPairSync } from "node:crypto";

const bufToB64url = (b) => Buffer.from(b).toString("base64url");

const { privateKey, publicKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});

const pubJwk = publicKey.export({ format: "jwk" });
const privJwk = privateKey.export({ format: "jwk" });

// Raw uncompressed point (0x04 || X || Y) and raw private scalar (d).
const publicPoint = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(pubJwk.x ?? "", "base64url"),
  Buffer.from(pubJwk.y ?? "", "base64url"),
]);
const privateScalar = Buffer.from(privJwk.d ?? "", "base64url");

const subject =
  process.env.VAPID_SUBJECT ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "mailto:ops@88title.example";

console.log("\nVAPID keys generated. Add these to .env.local:\n");
console.log(`VAPID_PUBLIC_KEY="${bufToB64url(publicPoint)}"`);
console.log(`VAPID_PRIVATE_KEY="${bufToB64url(privateScalar)}"`);
console.log(`VAPID_SUBJECT="${subject}"`);
console.log(
  `\nAlso expose the PUBLIC key to the browser (same value):\n` +
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY="${bufToB64url(publicPoint)}"\n`,
);
console.log(
  "Keep VAPID_PRIVATE_KEY secret. VAPID_SUBJECT must be a mailto: or https: URL.\n",
);
