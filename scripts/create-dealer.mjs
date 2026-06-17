#!/usr/bin/env node
// @ts-check
/**
 * Provision a dealer (or staff) account for the 88 Title dealer portal.
 *
 * This is the supported, safe way to create the first real dealer login. It runs
 * locally with the Supabase SECRET key (which bypasses RLS) and NEVER touches the
 * web app — the secret key stays out of the Next.js runtime entirely.
 *
 * What it does, idempotently:
 *   1. Creates a Supabase auth user (email + password, email pre-confirmed) — or
 *      reuses the existing one if that email is already registered.
 *   2. Upserts the linked row: a `dealers` record (default) keyed by auth_user_id,
 *      or a `staff_users` record with `--staff`.
 *
 * Usage:
 *   node scripts/create-dealer.mjs \
 *     --email owner@premierautos.com \
 *     --dealership "Premier Autos" \
 *     --contact "Jane Doe" \
 *     --phone "504-555-0188"
 *   # --password is optional; a strong one is generated and printed if omitted.
 *
 *   node scripts/create-dealer.mjs --staff --email you@88title.com --contact "You" --role admin
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (read from
 * .env.local automatically, or from the environment).
 */
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

// --- env -------------------------------------------------------------------
if (typeof process.loadEnvFile === "function" && existsSync(".env.local")) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // ignore — fall back to process.env
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

// --- args ------------------------------------------------------------------
const { values } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
    dealership: { type: "string" },
    contact: { type: "string" },
    phone: { type: "string" },
    staff: { type: "boolean", default: false },
    role: { type: "string", default: "staff" }, // staff | admin
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
});

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (values.help) {
  console.log(
    [
      "Create a dealer (or staff) account.\n",
      "  --email        login email (required)",
      "  --password     login password (optional; generated if omitted)",
      "  --dealership   dealership name (required unless --staff)",
      "  --contact      contact / full name",
      "  --phone        contact phone",
      "  --staff        create a staff_users row instead of a dealer",
      "  --role         staff | admin (with --staff; default staff)",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

if (!SUPABASE_URL || !SECRET_KEY) {
  fail(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Set them in .env.local.",
  );
}
if (!values.email) fail("--email is required.");
if (!values.staff && !values.dealership) {
  fail("--dealership is required (or pass --staff to create a staff account).");
}
if (values.staff && !["staff", "admin"].includes(values.role)) {
  fail("--role must be 'staff' or 'admin'.");
}

const email = values.email.trim().toLowerCase();
const password = values.password ?? randomBytes(12).toString("base64url");
const generated = !values.password;

const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Find an existing auth user by email (first page is plenty for this scale). */
async function findUserByEmail(targetEmail) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error(error.message);
  return (
    data.users.find(
      (u) => (u.email ?? "").toLowerCase() === targetEmail,
    ) ?? null
  );
}

async function main() {
  // 1. Create or reuse the auth user.
  let userId;
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (created.error) {
    const existing = await findUserByEmail(email);
    if (!existing) throw new Error(created.error.message);
    userId = existing.id;
    console.log(`• Auth user already existed — reusing ${userId}.`);
    if (!generated) {
      const reset = await supabase.auth.admin.updateUserById(userId, {
        password,
      });
      if (reset.error) throw new Error(reset.error.message);
      console.log("• Updated that user's password to the one you provided.");
    }
  } else {
    userId = created.data.user.id;
    console.log(`• Created auth user ${userId}.`);
  }

  // 2. Link the dealer or staff record (service key bypasses RLS).
  if (values.staff) {
    const { error } = await supabase.from("staff_users").upsert(
      {
        auth_user_id: userId,
        full_name: values.contact ?? null,
        role: values.role,
      },
      { onConflict: "auth_user_id" },
    );
    if (error) throw new Error(error.message);
    console.log(`• Linked staff_users row (role: ${values.role}).`);
  } else {
    const { data, error } = await supabase
      .from("dealers")
      .upsert(
        {
          auth_user_id: userId,
          dealership_name: values.dealership,
          contact_name: values.contact ?? null,
          contact_email: email, // where transaction notifications are sent
          phone: values.phone ?? null,
          status: "active",
        },
        { onConflict: "auth_user_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    console.log(`• Linked dealers row ${data.id} (${data.dealership_name}).`);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  console.log("\n✓ Done. Share these credentials securely:\n");
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}${generated ? "   (generated)" : ""}`);
  console.log(`   Sign in:  ${siteUrl}/dealers/login\n`);
  if (generated) {
    console.log(
      "   The dealer can change it anytime via 'Forgot password?' on the login page.\n",
    );
  }
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
