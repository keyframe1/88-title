# Staff OMV reference codes

A staff-only cheat sheet of the OMV codes a clerk keys in at the terminal,
grouped by transaction type. It ships **empty**: the slots exist so staff can see
where each code goes, but every code value is blank until the team fills it in
from the **OMV Policy & Procedures manual**. No code is invented in the codebase.

- **Schema + security:** `supabase/migrations/20260620120000_omv_reference.sql`.
- **Types / read path:** `lib/omv/types.ts`, `lib/omv/dal.ts`, `lib/omv/reference.ts`.
- **Staff display:** `components/staff/OmvReference.tsx`, embedded on `/staff/queue`.

---

## 1. Where it lives, and why

The reference is **embedded on `/staff/queue`**, directly below the live queue,
not on a separate route. A clerk consults these codes *while working a
transaction at the counter*, so the reference belongs next to the queue they are
already looking at, not on a page they would have to remember to open. (The bare
`/staff` route just redirects to `/staff/queue`, so the queue is the staff home.)

Because it lives under `/staff/*`, it inherits the existing protection with no new
mechanism:

- the **proxy** (`proxy.ts` / `lib/supabase/proxy.ts`) optimistically redirects
  unauthenticated visitors hitting `/staff/*` to `/staff/login`;
- the page re-checks server-side via `getDealerContext()` and requires `isStaff`;
- **RLS** returns `omv_reference` rows only to a staff caller.

Each transaction is a collapsible card (native `<details>`, so no client JS and
reduced-motion friendly). It is mobile-friendly for use on a phone or tablet.

---

## 2. Table structure

`public.omv_reference` - one row is **one labeled code slot** for one
transaction. A transaction can have **many** rows, which is how it holds multiple
codes (e.g. a transaction code, a document-type code, and a fee code all for
"Title transfer").

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key, auto. |
| `transaction_slug` | text | Which transaction. One of the slugs in `lib/checklists.ts` (`title-transfer`, `new-to-louisiana`, `duplicate-title`, `inherited-vehicle`, `registration-renewal`, `plates`, `notary`). A CHECK enforces the set. |
| `label` | text | What kind of code this slot is, e.g. `Transaction code`, `Document type code`, `Fee code`. Shown to staff. |
| `code` | text | **The OMV code value. NULL = not configured yet.** This is the field you fill in. |
| `note` | text | Optional clarifying note shown next to the code (e.g. "use when financed"). |
| `display_order` | int | Slot order within a transaction (ascending). |
| `created_at` | timestamptz | Auto. |
| `updated_at` | timestamptz | Auto-bumped by a trigger on every edit. |

There is a `UNIQUE (transaction_slug, label)` constraint. It is the seed's
conflict target, so re-running the migration is a no-op that **never overwrites a
code you have already typed**.

### Multiple codes per transaction

You get multiple codes per transaction simply by having multiple rows with the
same `transaction_slug` and different `label`s. The seed creates three slots per
transaction (`Transaction code`, `Document type code`, `Fee code`) - add more
rows, rename labels, or delete slots freely in the dashboard.

---

## 3. It is staff-only (and not in the public board)

Same trust model as the rest of the staff surface (`staff_users`, the staff
branch of `checkins`): readable only by an authenticated **staff** member via
`is_staff()`, writable by staff or the service role, **never** by `anon`, and
**not** added to any public view or to the realtime publication.

Like the rest of the staff surface, the in-app read is only exercisable by a
seeded `staff_users` member (`supabase/seed_admin.sql` applied) - that is
expected.

### Proof anon cannot read it

Run in the Supabase SQL editor (it runs as a superuser; `set role anon` makes it
evaluate as an anonymous web request - RLS policies **and** column/table grants
both apply). `anon` is granted nothing on the table, so a read is a hard
privilege error, not merely an empty result:

```sql
set role anon;

select *    from public.omv_reference;  -- ERROR: permission denied for table omv_reference
select code from public.omv_reference;  -- ERROR: permission denied for table omv_reference

reset role;
```

It is also absent from the public surface by construction - confirm there is no
view exposing it and that it is not in the realtime publication:

```sql
-- Not part of the public check-in board (or any view):
select table_name
from information_schema.view_column_usage
where table_schema = 'public' and table_name = 'omv_reference';
-- Expect: zero rows.

-- Not published to anon realtime:
select 1
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename = 'omv_reference';
-- Expect: zero rows.
```

---

## 4. Empty-state behavior (the launch state)

At launch every `code` is NULL. The staff card then shows:

- a **"Coming soon"** badge on the transaction (instead of an "X of Y set"
  count), and
- inside, an **"OMV codes not yet configured"** note plus each labeled slot
  showing **"Not set"**.

So staff can see exactly where each code will live, without ever being shown a
fake value. Once a slot has a non-blank `code`, that slot shows the value and the
badge switches to the configured count.

---

## 5. How to fill in a code (Supabase dashboard)

Editing is done directly in the Supabase table editor for now (staff-only,
occasional edits). There is intentionally no in-app editor yet.

1. Open the Supabase dashboard for the project.
2. Go to **Table Editor** and select the **`omv_reference`** table.
3. Find the row for the transaction + slot you want, e.g.
   `transaction_slug = title-transfer`, `label = Transaction code`.
4. Click the **`code`** cell and type the value from the OMV Policy & Procedures
   manual (plain text, up to 80 characters). Press Enter / save.
5. Optionally fill in **`note`** with any clarifying detail (e.g. when the code
   applies). Leave `code` blank to keep a slot showing "Not set".
6. `updated_at` updates automatically. Reload `/staff/queue` to see it.

To **add another code** to a transaction, insert a new row with that
transaction's `transaction_slug`, a new `label`, the `code`, and a
`display_order` (higher numbers sort later). The `(transaction_slug, label)` pair
must be unique. To **remove** a slot, delete its row.

### Applying the migration

Idempotent and forward-only (safe to re-run; never drops data; never clobbers a
code you have entered). It depends on the dealer-portal migration for
`is_staff()`, which is ordered earlier, so apply both.

- **Supabase CLI:** `supabase db push`, or
- **Dashboard:** paste `supabase/migrations/20260620120000_omv_reference.sql`
  into the SQL editor and run it.

After applying, optionally regenerate types to replace the hand-written
`Database` stand-in:

```bash
supabase gen types typescript --linked > lib/supabase/database.types.ts
```
