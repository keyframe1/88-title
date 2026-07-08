# Dealer Portal — foundation

Authentication, dealer accounts, data isolation, and a working dashboard for
88 Title dealers. Invite-only: there is no public signup. Built on Supabase
auth + Postgres + RLS, Next.js 16 App Router, and Server Actions.

- **Routes:** `/dealers/dashboard` (dashboard), `/dealers/login`,
  `/dealers/update-password`, `/dealers/auth/callback` (email-link handler). Bare
  `/dealers` is the **public** dealer-program pitch page (marketing), not the
  portal — see `app/dealers/(marketing)/`.
- **Schema + security:** `supabase/migrations/20260617120000_dealer_portal.sql`.
- **Provisioning:** `scripts/create-dealer.mjs`.

---

## 1. Data isolation (the most important part)

Two real dealers will use this. The hard requirement: **dealer A can never read or
modify dealer B's data.** That is enforced in the database with Row Level
Security (RLS), so it holds even if the app has a bug.

### Building blocks

- **Identity link.** `dealers.auth_user_id` references `auth.users(id)` and is
  `UNIQUE`. One login maps to exactly one dealer row.
- **Two `SECURITY DEFINER` helpers** resolve "who is calling," derived solely
  from the signed JWT (`auth.uid()`), which a client cannot forge:
  - `current_dealer_id()` → the dealer id whose `auth_user_id = auth.uid()`.
  - `is_staff()` → whether `auth.uid()` is in `staff_users`.

  They are `SECURITY DEFINER` so their internal lookups are **not** themselves
  subject to RLS. That avoids policy recursion (a policy on
  `dealer_transactions` that reads `dealers` would otherwise re-trigger
  `dealers`' policies) and keeps the policy expressions cheap. Each sets a fixed
  empty `search_path` and schema-qualifies every name, closing the classic
  `SECURITY DEFINER` search-path hole.
- **Policies keyed on those helpers**, scoped to the `authenticated` role.
  The `anon` role is granted **nothing** on these tables.

### Why dealer A cannot reach dealer B

| Table | Operation | Policy predicate |
| --- | --- | --- |
| `dealer_transactions` | SELECT | `dealer_id = current_dealer_id() OR is_staff()` |
| `dealer_transactions` | INSERT | `WITH CHECK (dealer_id = current_dealer_id() OR is_staff())` |
| `dealer_transactions` | UPDATE | staff only (`is_staff()`) |
| `dealers` | SELECT | `auth_user_id = auth.uid() OR is_staff()` |
| `dealers` | UPDATE | `auth_user_id = auth.uid() OR is_staff()` (both `USING` and `WITH CHECK`) |
| `dealers` | INSERT | staff only |
| `staff_users` | SELECT | staff only; no write policy at all |

- A `SELECT` of another dealer's transactions returns **zero rows** — they are
  filtered out before any data leaves Postgres. An `UPDATE`/`DELETE` aimed at
  them matches zero rows.
- `current_dealer_id()` depends only on `auth.uid()`, so a dealer cannot widen
  it by sending crafted parameters.
- On `dealers`, the `UPDATE ... WITH CHECK (auth_user_id = auth.uid())` means a
  dealer cannot re-point their record at another user, and a **`BEFORE UPDATE`
  column-guard trigger** silently preserves `id`, `created_at`, `auth_user_id`,
  and `status` for non-staff — so a dealer editing "their contact info" can't
  flip their own status or hijack the identity link.
- Dealers have **no** UPDATE path on transactions: status changes are staff-only.
- The service ("secret") key bypasses RLS, but the **web app never loads it** —
  it is used only by the offline provisioning script. Every web request
  authenticates with the publishable/anon key and is therefore RLS-constrained.

### Defense in depth

1. **Proxy** (`proxy.ts`) — optimistic redirect of unauthenticated users away
   from `/dealers/*`. UX only.
2. **Server-side check** — every page/action calls `getDealerContext()`
   (`lib/dealers/dal.ts`), which uses `supabase.auth.getUser()` (revalidates the
   JWT with the auth server, unlike `getSession()`).
3. **RLS** — the authoritative data boundary described above.

### How to verify isolation yourself

After provisioning two dealers and signing in as dealer A:

```sql
-- As dealer A's session (e.g. Supabase SQL editor "Run as" a user, or via the
-- app), this returns ONLY dealer A's rows:
select id, dealer_id, status from dealer_transactions;

-- Attempting to read a known dealer-B transaction id returns zero rows:
select * from dealer_transactions where id = '<dealer-B-tx-id>';

-- Attempting to insert under dealer B fails the WITH CHECK:
insert into dealer_transactions (dealer_id, vehicle_description)
values ('<dealer-B-id>', 'should be rejected');
```

---

## 2. Provision the first dealer (do this once per dealer)

The web app intentionally cannot create logins (no public signup, and the secret
key never reaches the runtime). Use the local script, which runs with the secret
key and is idempotent.

**Prerequisites**

- `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`
  (the `sb_secret_…` key from Supabase → Project Settings → API keys).
- The migration has been applied (see §5).

**Run**

```bash
node scripts/create-dealer.mjs \
  --email owner@premierautos.com \
  --dealership "Premier Autos" \
  --contact "Jane Doe" \
  --phone "504-555-0188"
```

- Omit `--password` and a strong one is generated and printed. Pass `--password`
  to set a specific one.
- The script (1) creates the Supabase auth user with the email pre-confirmed (or
  reuses it if it already exists) and (2) upserts the linked `dealers` row,
  setting `contact_email` to the login email so notifications land there.
- It prints the email + password to hand to the dealer. They sign in at
  `/dealers/login` and can rotate the password via **Forgot password?**

**Create a staff/admin login** (sees all dealers and transactions; staff UI lands
later, but the role is enforced now):

```bash
node scripts/create-dealer.mjs --staff --role admin \
  --email you@88title.com --contact "Your Name"
```

**Pure-dashboard fallback** (no script): in Supabase, Authentication → Users →
Add user (set a password, mark email confirmed), copy the new user's UID, then in
the SQL editor:

```sql
insert into public.dealers (dealership_name, contact_name, contact_email, phone, auth_user_id)
values ('Premier Autos', 'Jane Doe', 'owner@premierautos.com', '504-555-0188', '<paste-uid>');
```

---

## 3. Protected-route behavior

- `proxy.ts` matches `/dealers` and `/dealers/:path*`. On the protected routes it
  refreshes the Supabase session and, if there's no user, redirects to
  `/dealers/login?redirectedFrom=…`. Public exceptions: bare `/dealers` (the
  public pitch page), `/dealers/login`, and `/dealers/auth/*` (the email-link
  callback must be reachable while logged out).
- An authenticated user hitting `/dealers/login` or the public `/dealers` pitch
  is bounced to `/dealers/dashboard`.
- After sign-in, the user is returned to `redirectedFrom` (validated to stay
  inside `/dealers`, never an open redirect; bare `/dealers` maps to
  `/dealers/dashboard`).
- The dashboard (`/dealers/dashboard`) re-checks server-side. A logged-in user
  with no linked dealer row (e.g. a staff account) sees an explanatory page with
  sign-out, not an error.
- The rest of the customer marketing site is untouched — the proxy runs only on
  the `/dealers/*` and `/staff/*` trees, and treats bare `/dealers` as public.

---

## 3a. The board, the status pipeline, and the staff console

The dealer transaction scaffold grew into an **outstanding-work board** (schema:
`supabase/migrations/20260629120000_dealer_transactions_board.sql`, additive +
idempotent).

**Status pipeline** (the vocabulary a dealership recognizes), in order:

```
submitted -> received -> in_progress -> ready_for_pickup -> picked_up
```

`needs_attention` is deliberately **not** a status — it is an orthogonal flag
(`needs_attention` boolean + `attention_note` text) staff can raise on a
transaction in any stage (the "problem title" state). It cleanly succeeds the old
`docs_needed` status; the old `docs_needed_note` column is retained (never
dropped) but no longer written, its data copied into `attention_note`.

New first-class columns: `stock_number` (dealers track by stock #, shown
everywhere), `status_updated_at`, and a structured `vin` with the
`vehicle_year`/`vehicle_make`/`vehicle_model` an NHTSA vPIC decode returns
(decode is shared in `lib/vin.ts`, reused by the staff Records console and the
dealer filing form; the free-text `vehicle_description` is kept alongside).

- **Dealer board** (`components/dealers/DealerBoard.tsx`, on
  `/dealers/dashboard`): dense rows (stock #, vehicle, type, a stepped status
  indicator, days since filed), filter chips (All / In progress / Ready for
  pickup / Needs attention), a red attention accent + the staff note, green
  ready-for-pickup rows, and a collapsed picked-up history. Read-only — dealers
  cannot change status. The filing form leads on an empty board and moves to the
  sidebar once work exists.
- **Staff console** (`/staff/dealers`, `components/staff/DealerTransactionsConsole.tsx`):
  every dealership's work, tagged with the dealership. Staff advance the status
  step by step or jump to any stage, and raise/clear the attention flag with a
  note. Writes go through `updateTransactionStatus` and `updateTransactionAttention`
  (`lib/dealers/actions.ts`), both staff-gated by RLS and logged to `activity_log`
  (`dealer_transaction.status_change` / `.attention_change`).

**Write isolation, tightened.** RLS is unchanged (dealers SELECT/INSERT their own
rows only; staff-only UPDATE). A new `BEFORE INSERT` guard
(`dealer_transactions_guard_insert`) normalizes every dealer-originated insert to
`status='submitted'`, `needs_attention=false`, `attention_note=null`, so status
and attention are genuinely staff-gated even against a direct data-API call.

## 4. Email notifications (Resend)

When a transaction moves to **ready_for_pickup**, or staff **raise the attention
flag**, the dealer is emailed (`lib/dealers/actions.ts` →
`sendDealerNotification` in `lib/email/dealer-notifications.ts` →
`lib/email/resend.ts`). Email only — no SMS, no push. `ready_for_pickup` is the
critical "come get it" signal.

**It is wired but dormant until Resend is configured.** Today
`RESEND_API_KEY` is unset, so sends are safely skipped with a logged warning;
the app works normally. To activate:

1. Create a Resend API key.
2. In `.env.local` set `RESEND_API_KEY="re_…"`.
3. Set `RESEND_FROM="88 Title <notifications@your-domain>"`. Until you verify a
   domain in Resend, `onboarding@resend.dev` works for testing (it's the default).
4. Ensure `NEXT_PUBLIC_SITE_URL` is your real domain (used for the link in the
   email).

No package install is needed — the sender uses Resend's REST API via `fetch`.

> Note: dealer **auth** emails (password reset) are sent by Supabase Auth's
> built-in mailer, which works out of the box for low volume — that is separate
> from Resend, which handles **transaction** notifications.

The staff UI that triggers status changes ships at `/staff/dealers` (see §3a); it
calls `updateTransactionStatus` / `updateTransactionAttention`, both RLS-limited to
staff.

---

## 5. Applying the migration

The migration is idempotent and forward-only (safe to re-run; never drops data).

- **Supabase CLI:** `supabase db push` (once the project is linked), or
- **Dashboard:** paste the contents of
  `supabase/migrations/20260617120000_dealer_portal.sql` into the SQL editor and
  run it.

After applying, regenerate types to replace the hand-written stand-in:

```bash
supabase gen types typescript --linked > lib/supabase/database.types.ts
```
