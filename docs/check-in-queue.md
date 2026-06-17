# Public check-in queue

A no-account, online check-in line for 88 Title customers, with a realtime
status page, an anonymized public board, browser-push + email notifications, and
a staff console. Built on the same Supabase auth + Postgres + RLS foundation as
the dealer portal, Next.js 16 App Router, and Server Actions.

- **Customer routes (public):** `/check-in` (form + live board),
  `/check-in/status/[token]` (live personal status), `/lobby` (big board).
- **Staff route (auth + staff only):** `/staff/queue`.
- **Schema + security:** `supabase/migrations/20260618120000_checkin_queue.sql`.
- **Notifications:** email via `lib/email/checkin-notifications.ts` (Resend),
  browser push via `lib/push/webpush.ts` (+ `public/sw.js`).

This table holds customer PII **and** is read by anonymous visitors, so the
security model is the most important part. It is described first.

---

## 1. RLS approach (and how it reuses the dealer portal)

The dealer portal's rule was "RLS is the gate; `SECURITY DEFINER` helpers resolve
identity; `anon` gets nothing." The check-in queue keeps that spine and adapts it
to two callers the portal didn't have:

| Caller | How they're identified | What they can do |
| --- | --- | --- |
| **Staff** | `is_staff()` — **the exact helper from the dealer portal**, reused unchanged | Read every column of every row; UPDATE status |
| **Customer** | a 122-bit random `session_token` (a capability secret) | Read/cancel/attach-push to **their own** row, via token-scoped `SECURITY DEFINER` functions |
| **The public** | nobody — anonymous | See a **PII-free** projection of the active line only |

The building blocks, mirroring the portal:

- **`SECURITY DEFINER` helpers with a pinned empty `search_path`**, every name
  schema-qualified — the same hardening the portal uses for `current_dealer_id()`
  / `is_staff()`. Here they are `get_checkin(token)`, `save_push_subscription(token, …)`,
  `cancel_checkin(token)`, and the ticket-code generator. A customer **never**
  touches the table directly; these functions take the secret token and self-limit
  to the one matching row. This is the portal's "helper where it fits" pattern,
  applied to an anonymous owner instead of a JWT-bound one.
- **Policies keyed on those helpers / on the token model**, with `anon` granted
  the bare minimum (see below) and `is_staff()` as the staff branch — identical
  in spirit to `dealer_transactions`.

### Two independent locks on PII

Because anonymous users genuinely need to read *something* (the live board) and
receive realtime, PII is fenced off **two** ways, either of which is sufficient:

1. **Column-level `GRANT`s.** `anon` may `SELECT` only
   `(id, ticket_code, service_type, status, created_at)` and may `INSERT` only the
   customer-supplied columns. `name`, `phone`, `email`, `renewal_date`,
   `marketing_consent`, `session_token`, and `push_subscription` are **not granted
   to `anon` at all** — so `select name from checkins` as `anon` is a hard
   privilege error, and **Supabase Realtime, which honors column privileges,
   can never include a PII column in an `anon` subscriber's payload.**
2. **A dedicated PII-free view** (`public.checkin_queue`) that selects only the
   non-PII columns plus a computed `position`. It is the public read surface for
   the board and the lobby.

The app also never *needs* PII on the realtime channel: the public board reads the
view, and a customer's own details come from `get_checkin(token)`. Realtime is
only a "something changed, refetch" signal.

### Policy summary

| Table / object | Operation | Who | Rule |
| --- | --- | --- | --- |
| `checkins` | INSERT | `anon` | `WITH CHECK (status = 'waiting')` + column grant limits inputs |
| `checkins` | INSERT | staff | `WITH CHECK (is_staff() and status in ('waiting','in_progress'))` |
| `checkins` | SELECT | `anon` | `USING (status in ('waiting','in_progress'))` + **column grant excludes all PII** |
| `checkins` | SELECT | staff | `USING (is_staff())` (full columns) |
| `checkins` | UPDATE | staff | `USING/WITH CHECK (is_staff())` |
| `checkins` | UPDATE | customer | **no policy** — only via token-scoped functions |
| `checkin_queue` (view) | SELECT | everyone | PII-free by construction |
| `get_checkin` / `save_push_subscription` / `cancel_checkin` | EXECUTE | `anon` | token is the authorization |

The service ("secret") key bypasses RLS but the web app never loads it (same as
the dealer portal) — every web request uses the publishable/anon key.

---

## 2. Proof the public board exposes zero PII

Run these in the Supabase SQL editor (it runs as a superuser; `set role anon`
makes it evaluate as an anonymous web request — RLS policies **and** column grants
both apply).

```sql
-- (a) Seed one row as the table owner. Note the session_token it returns.
insert into public.checkins (name, phone, email, service_type)
values ('Test Customer', '504-555-0000', 'test@example.com', 'title-transfer')
returning id, ticket_code, session_token;
```

```sql
-- (b) As an anonymous web client, every PII column is denied at the privilege
--     layer — not merely filtered, but unreadable:
set role anon;

select name          from public.checkins;  -- ERROR: permission denied for column name
select email         from public.checkins;  -- ERROR: permission denied for column email
select phone         from public.checkins;  -- ERROR: permission denied for column phone
select renewal_date  from public.checkins;  -- ERROR: permission denied for column renewal_date
select session_token from public.checkins;  -- ERROR  (so tokens can't be harvested)
select *             from public.checkins;  -- ERROR  (the * hits a denied column)

-- Only the non-PII columns are readable, and only for active rows:
select id, ticket_code, service_type, status, created_at from public.checkins;

reset role;
```

```sql
-- (c) The public view is PII-free by construction — confirm its columns:
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'checkin_queue'
order by ordinal_position;
-- Expect exactly: ticket_code, service_type, status, created_at, position
--   (no name / phone / email / renewal_date / marketing_consent / session_token).

set role anon;
select * from public.checkin_queue;   -- works; returns only those five columns
reset role;
```

Because Realtime delivers only the columns a subscriber is granted, (b) is also
the proof that an `anon` realtime subscription on `checkins` can never carry PII.

---

## 3. How a customer can't read another customer's record

```sql
set role anon;

-- WITH your own secret token you get exactly your row (your own PII included):
select * from public.get_checkin('<session_token-from-step-a>');

-- A guessed / different token returns ZERO rows — no error, no data:
select * from public.get_checkin('00000000-0000-0000-0000-000000000000');

-- You cannot enumerate tokens to find someone else's: the column is denied.
select session_token from public.checkins;   -- ERROR: permission denied for column session_token

-- You cannot tamper either — there is no anon UPDATE path:
update public.checkins set status = 'in_progress';   -- 0 rows affected (no policy)

reset role;
```

- `session_token` is a 122-bit random UUID, never exposed by the view, by
  realtime, or by any granted column — so it can be neither read off another row
  nor brute-forced. Holding it is proof of ownership of exactly one record (the
  same capability-URL model as a password-reset link).
- The only writes a customer can make are `cancel_checkin(token)` (their own row,
  only while waiting) and `save_push_subscription(token, …)` (their own row's push
  field only). Both are token-scoped `SECURITY DEFINER` functions; neither can
  touch another row or any other column.

---

## 4. Browser push — what production needs, and the iOS caveat

Push is the SMS alternative: a real notification when the customer is called up,
even with the tab closed. It is implemented directly on the Web Push protocol
(VAPID + `aes128gcm`) in `lib/push/webpush.ts` — **no dependency added**, same as
the Resend hook. The encryption was verified with an encrypt→decrypt round-trip
and a VAPID ES256 sign/verify check.

**To turn it on in production:**

1. Generate a VAPID key pair (once):
   ```bash
   node scripts/generate-vapid.mjs
   ```
2. Set the printed values in `.env.local` (and your host's env):
   ```
   VAPID_PUBLIC_KEY="B…"             # raw base64url P-256 point
   VAPID_PRIVATE_KEY="…"             # raw base64url scalar — SECRET, server only
   VAPID_SUBJECT="mailto:ops@88title.com"   # mailto: or https: contact
   NEXT_PUBLIC_VAPID_PUBLIC_KEY="B…" # same as VAPID_PUBLIC_KEY, exposed to the browser
   ```
3. Ensure `NEXT_PUBLIC_SITE_URL` is the real HTTPS domain (push and service
   workers require HTTPS; `localhost` is exempt for testing).

**Graceful degradation (like Resend):** if the VAPID vars are unset, the subscribe
prompt hides itself and `sendPush()` is a logged no-op — customers fall back to
email + the live status page. Dead subscriptions (HTTP 404/410 from the push
service) are cleared from the row automatically on the next send.

**iOS caveat (important):** Safari on iOS only allows Web Push when the site has
been **added to the Home Screen** (installed as a PWA, iOS 16.4+). Until then,
`PushManager` is unavailable and the prompt shows an "Add to Home Screen" hint;
those users still get email + the live page. We are **adding PWA support (manifest
+ install prompts) in a later phase** — once shipped, iOS users can install and
enable push like everyone else. Android/desktop Chrome, Edge, and Firefox work
today without installation.

---

## 5. Email — what Resend needs

The check-in flow sends two customer emails through the existing Resend hook
(`lib/email/resend.ts`): a **confirmation** on check-in (position, ETA, and the
live status link) and a **"you're up"** email when staff move the customer to
*in progress*.

It is wired but **dormant until Resend is configured** — exactly like the dealer
notifications. Today `RESEND_API_KEY` is unset, so sends are safely skipped with a
logged warning and everything else works. To activate:

1. Create a Resend API key; set `RESEND_API_KEY="re_…"` in `.env.local`.
2. Set `RESEND_FROM="88 Title <notifications@your-domain>"`. Until you verify a
   domain, the shared `onboarding@resend.dev` works for testing (it's the default).
3. Ensure `NEXT_PUBLIC_SITE_URL` is your real domain (used for the status link in
   the email).

No package install is needed — the sender uses Resend's REST API via `fetch`.

---

## 6. Staff console + provisioning

`/staff/queue` shows the full active line **with** names/contact, and advances
status (Call up → Complete, or No-show/Cancel). It is gated three ways, matching
the dealer portal's defense in depth: the proxy optimistically redirects
unauthenticated visitors to `/dealers/login`; the page re-checks server-side via
`getDealerContext()` and requires `isStaff`; and RLS only returns `checkins` rows
to a staff caller. Advancing to *in progress* fires the customer's email + push.

Staff log in with the **same** accounts as the dealer portal. Provision one with
the existing script (reused, not duplicated):

```bash
node scripts/create-dealer.mjs --staff --role admin \
  --email you@88title.com --contact "Your Name"
```

Then sign in at `/dealers/login`; staff are routed to the queue console (also
linked from the dealer dashboard's staff view).

---

## 7. Applying the migration

Idempotent and forward-only (safe to re-run; never drops data). It depends on the
dealer-portal migration for `is_staff()`, which is ordered earlier, so apply both.

- **Supabase CLI:** `supabase db push`, or
- **Dashboard:** paste `supabase/migrations/20260618120000_checkin_queue.sql` into
  the SQL editor and run it.

The migration also adds `checkins` to the `supabase_realtime` publication (guarded,
so it's a no-op on a plain Postgres without that publication). After applying,
optionally regenerate types to replace the hand-written `Database` stand-in:

```bash
supabase gen types typescript --linked > lib/supabase/database.types.ts
```
