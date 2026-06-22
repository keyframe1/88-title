# Staff customer & vehicle records

The persistent back-office records a clerk enters **once** and reuses: a
**customer** (name, contact, parish of residence / domicile, and protected ID
data) and a **vehicle** (VIN, year, make, model, body, color). They feed the
domicile-based **fee & tax engine** (a stored parish becomes the buyer parish)
and the upcoming **DPSMV form generator** (a stored vehicle prefills the form),
so the same data is never re-keyed across the fee screen and the forms.

- **Schema + security:** `supabase/migrations/20260623120000_customer_vehicle_records.sql`.
- **Types / helpers:** `lib/records/types.ts`, `lib/records/normalize.ts`.
- **Read path / mutations:** `lib/records/dal.ts`, `lib/records/actions.ts`.
- **Staff UI:** `components/staff/RecordsConsole.tsx` on `/staff/records`; the fee
  calculator picker in `components/staff/FeeTaxCalculator.tsx`.

---

## 1. Where it lives, and why

A dedicated **`/staff/records`** console (search + add), cross-linked from the
queue and the fee calculator. Because it lives under `/staff/*` it inherits the
existing protection with no new mechanism:

- the **proxy** redirects unauthenticated `/staff/*` visitors to `/staff/login`;
- the page re-checks server-side via `getDealerContext()` and requires `isStaff`;
- **RLS** returns `customers` / `vehicles` rows only to a staff caller.

It is mobile-first (375px) and uses real HTML form controls.

---

## 2. Tables

### `public.customers` - one row per person

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key, auto. |
| `full_name` | text | Required. Display name as entered. |
| `name_key` | text | **Generated** normalized name (lowercased, whitespace-collapsed). The customer match key. Read-only. |
| `phone`, `email` | text | Contact. |
| `address_line1/2`, `city`, `state`, `postal_code` | text | Mailing address. `state` defaults `LA`. |
| `parish` | text | **Parish of residence (domicile).** Drives the fee engine; meant to match a `tax_rates` jurisdiction name. |
| `id_type` | text | `drivers_license` / `state_id` / `passport` / `military_id` / `other` (CHECK). |
| `id_number` | text | **Sensitive.** DL/state-ID number. See §4. |
| `id_state` | text | Issuing state. |
| `id_last4` | text | **Generated** last 4 of `id_number`. The only id fragment list/search expose. Read-only. |
| `date_of_birth` | date | **Sensitive.** See §4. |
| `notes` | text | Free text. |
| `created_at` / `updated_at` | timestamptz | Auto; `updated_at` bumped by a trigger. |

### `public.vehicles` - one row per VIN

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key, auto. |
| `vin` | text | Required. Stored normalized (uppercased, trimmed). **Unique case-insensitively** (`vehicles_vin_unique_idx`): the match key. |
| `year` | int | Model year (1900 to 2100). |
| `make`, `model`, `body_style`, `color` | text | DPSMV form fields; also what an NHTSA VIN decode returns. |
| `notes` | text | Free text. |
| `created_at` / `updated_at` | timestamptz | Auto; `updated_at` bumped by a trigger. |

### Links to transactions (history)

The migration adds nullable, staff-set FK columns linking records to the
transaction rows already in the system, `ON DELETE SET NULL` (deleting a record
never deletes a transaction):

- `checkins.customer_id`, `checkins.vehicle_id`
- `dealer_transactions.customer_id`, `dealer_transactions.vehicle_id`

A vehicle's **history** is the set of transactions that referenced it, surfaced by
`getVehicleHistory()` (today, the linked check-ins; the dealer-transaction source
links the same way).

---

## 3. Match-and-reuse (no duplicates)

Repeat customers/vehicles are matched and reused, not duplicated:

- **Vehicles match on VIN.** The VIN is the natural key (unique on `upper(vin)`).
  `createVehicle` looks up by normalized VIN; if it exists, it **reuses** the row
  and fills only the still-blank fields (e.g. an NHTSA decode adding make/model),
  never clobbering existing data.
- **Customers match on name + contact.** A name alone is too weak (two John
  Smiths), so `createCustomer` reuses an existing record only on matching
  `name_key` **and** a matching email or phone; otherwise it creates a new one.
  The console's **search** (by name or VIN) is the primary reuse path: staff find
  and pick the existing record before adding.

Search is `searchRecords(query)`: name (and incidentally phone/email) for
customers, VIN (and incidentally make/model) for vehicles. User input is matched
through a quoted PostgREST `ilike` so phone strings with commas/parentheses are
safe.

---

## 4. PII discipline (staff-only, ID data protected)

These are the most sensitive tables in the system. Defense in depth:

1. **Isolation.** Whole tables are **staff-only** via `is_staff()` RLS. `anon` is
   granted **nothing** (a raw select is a hard privilege error). Neither table is
   in any view, and **neither is in the `supabase_realtime` publication**, so a
   record can never reach the public check-in board or an anon realtime payload.
   A dealer login is authenticated but not staff, so RLS returns it nothing.
2. **Minimal disclosure.** `id_last4` is a generated column holding only the last
   four of `id_number`. List/search (`CUSTOMER_SUMMARY_COLUMNS`) select `id_last4`
   and **never** `id_number` or `date_of_birth`. The full identifier comes back
   **only** from `getCustomerById()`, used when a clerk opens one record to fill a
   form (least privilege at the query layer).
3. **Display masking.** The UI shows the masked id (e.g. `••••4567`).
4. **Bounded storage.** A DL/state-ID number and metadata, not an SSN. If a
   higher-sensitivity identifier is ever required, the next step is pgcrypto field
   encryption of `id_number`; the column boundary is drawn so that change stays
   localized.

The link columns on `checkins` are staff-only too: `anon` has only **column-level**
grants on the original customer-supplied columns, so it can neither read nor set
`customer_id` / `vehicle_id`; the authenticated (staff) grant is table-level and
covers them, with RLS limiting rows.

### Proof anon cannot read it

```sql
set role anon;
select *           from public.customers;  -- ERROR: permission denied for table customers
select id_number   from public.customers;  -- ERROR: permission denied for table customers
select *           from public.vehicles;   -- ERROR: permission denied for table vehicles
reset role;

-- Not exposed by any view:
select table_name from information_schema.view_column_usage
where table_schema = 'public' and table_name in ('customers', 'vehicles');
-- Expect: zero rows.

-- Not published to realtime:
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
  and tablename in ('customers', 'vehicles');
-- Expect: zero rows.
```

---

## 5. How it connects to the fee engine (and what is left)

**Wired now:**

- `/staff/fees` shows a **"Pull from saved records"** picker — a search-driven
  typeahead backed by `searchCustomersAction` / `searchVehiclesAction` (the same
  RLS-gated, 50-row-capped records search the console uses), so it never preloads
  the table. Choosing a customer sets the **buyer parish** from their domicile
  (when a `tax_rates` rate exists for it; otherwise a note says to add it).
  Choosing a vehicle surfaces its details (VIN/year/make/model/body/color) for the
  form. (`getCustomerPicks` / `getVehiclePicks` still back the `/staff/forms`
  preload and remain for that path.)
- `/staff/records` search + add (match-and-reuse), with optional NHTSA vPIC VIN
  decode to prefill year/make/model/body.

**Structured, left to connect:**

- The records are linked to transactions via the FK columns and
  `attachRecordsToCheckin()` (staff-gated, enforced now); the queue UI button that
  calls it lands with the records **detail view** (which will also render
  `getVehicleHistory()`). This mirrors how `updateTransactionStatus` shipped
  enforced before its UI.
- The **DPSMV form generator** consumes `getCustomerById` (full record) +
  `getVehicleById`; the field shapes here are sized for it.

---

## 6. Applying the migration

Idempotent and forward-only (safe to re-run; never drops data). It depends on the
dealer-portal migration for `is_staff()` and on `checkins` / `dealer_transactions`
existing, all ordered earlier.

- **Supabase CLI:** `supabase db push`, or
- **Dashboard:** paste
  `supabase/migrations/20260623120000_customer_vehicle_records.sql` into the SQL
  editor and run it.

After applying, optionally regenerate types to replace the hand-written
`Database` stand-in:

```bash
supabase gen types typescript --linked > lib/supabase/database.types.ts
```
