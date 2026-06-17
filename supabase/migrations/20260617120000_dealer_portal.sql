-- ============================================================================
-- 88 Title — Dealer Portal foundation
-- Tables, role model, and Row Level Security (RLS) for the dealer portal.
--
-- This migration is idempotent and forward-only: it can be re-run safely
-- (CREATE ... IF NOT EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS before
-- CREATE POLICY) and it never drops data.
--
-- ----------------------------------------------------------------------------
-- SECURITY MODEL (read this before changing anything below)
-- ----------------------------------------------------------------------------
-- The single most important property of this schema is DEALER-TO-DEALER
-- ISOLATION: an authenticated dealer must be able to read and write ONLY their
-- own dealer record and their own transactions, never another dealer's.
--
-- We enforce that at the database with RLS, so it holds even if the application
-- layer has a bug. Three building blocks:
--
--   1. Identity link. dealers.auth_user_id references auth.users(id). A login
--      (Supabase auth user) is bound to exactly one dealer row by this column.
--
--   2. Two SECURITY DEFINER helper functions resolve "who is calling":
--        - current_dealer_id() -> the dealer.id whose auth_user_id = auth.uid()
--        - is_staff()          -> true when auth.uid() is in staff_users
--      They are SECURITY DEFINER so the lookups they perform are NOT themselves
--      subject to RLS. That avoids infinite policy recursion (a policy on
--      dealer_transactions that needs to read dealers would otherwise re-trigger
--      dealers' policies) and keeps policy expressions cheap. auth.uid() still
--      reflects the CALLER's JWT inside a SECURITY DEFINER function, so the
--      answer is always scoped to the current request's user.
--
--   3. Policies keyed on those helpers. Every dealer-facing policy compares the
--      row to current_dealer_id() / auth.uid(); staff get a separate OR is_staff()
--      branch. Anonymous (anon) is granted nothing on these tables at all.
--
-- Why dealer A cannot reach dealer B's data:
--   * SELECT/UPDATE on dealer_transactions require dealer_id = current_dealer_id().
--     current_dealer_id() derives solely from auth.uid() (the signed JWT), which
--     a client cannot forge. Dealer B's rows have a different dealer_id, so they
--     are filtered out before any data is returned, and an UPDATE that targeted
--     them would match zero rows.
--   * INSERT on dealer_transactions has WITH CHECK (dealer_id = current_dealer_id()),
--     so a dealer cannot create a row attributed to another dealer.
--   * dealers SELECT/UPDATE require auth_user_id = auth.uid(); the UPDATE
--     WITH CHECK re-asserts it, so a dealer cannot re-point their record at
--     another user, and a column-guard trigger blocks them from editing
--     protected columns (status, auth_user_id, id, created_at).
--   * The service ("secret") key bypasses RLS and is used ONLY by the offline
--     provisioning script (scripts/create-dealer.mjs). The web app authenticates
--     with the publishable/anon key, so every web request is RLS-constrained.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

-- A dealership account. Provisioned by staff; linked to a Supabase auth user
-- via auth_user_id once that login exists.
create table if not exists public.dealers (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  dealership_name text not null,
  contact_name   text,
  contact_email  text,
  phone          text,
  status         text not null default 'active' check (status in ('active', 'inactive')),
  -- One login <-> one dealer. UNIQUE guarantees current_dealer_id() resolves to
  -- at most one row. Nullable so a dealer record can exist before its login is
  -- created (Postgres allows multiple NULLs under a UNIQUE constraint).
  auth_user_id   uuid unique references auth.users (id) on delete set null
);

-- A single piece of dealer work (title transfer, plate, etc.). Deliberately
-- minimal: the full dealer workflow is still being defined, so this is a real
-- but small scaffold a dealer can actually file and track.
create table if not exists public.dealer_transactions (
  id                uuid primary key default gen_random_uuid(),
  dealer_id         uuid not null references public.dealers (id) on delete cascade,
  created_at        timestamptz not null default now(),
  vehicle_description text,                   -- e.g. "2021 Toyota Camry · stock #A1234"
  transaction_type  text,                     -- free text for now (workflow TBD)
  status            text not null default 'received'
                      check (status in ('received', 'in_progress', 'docs_needed', 'ready', 'complete')),
  docs_needed_note  text,                     -- e.g. "We need a signed POA"
  notes             text
);

-- Staff / admin logins. Membership in this table is what grants the elevated
-- "see everything" role. Managed out-of-band (service key / Supabase dashboard),
-- never writable from the portal.
create table if not exists public.staff_users (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  full_name    text,
  role         text not null default 'staff' check (role in ('staff', 'admin'))
);

create index if not exists dealers_auth_user_id_idx
  on public.dealers (auth_user_id);
create index if not exists dealer_transactions_dealer_id_idx
  on public.dealer_transactions (dealer_id);
create index if not exists dealer_transactions_dealer_created_idx
  on public.dealer_transactions (dealer_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Role-resolution helpers (SECURITY DEFINER; see header)
-- ----------------------------------------------------------------------------
-- A fixed, empty search_path is set on each function so a malicious search_path
-- cannot redirect the unqualified names inside (all names are schema-qualified).

create or replace function public.current_dealer_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select d.id
  from public.dealers d
  where d.auth_user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_users s
    where s.auth_user_id = (select auth.uid())
  );
$$;

comment on function public.current_dealer_id() is
  'Dealer id bound to the calling auth user, or NULL. SECURITY DEFINER so it is not gated by RLS (prevents policy recursion).';
comment on function public.is_staff() is
  'True when the calling auth user is a staff/admin. SECURITY DEFINER; see current_dealer_id().';

-- ----------------------------------------------------------------------------
-- Column-guard: a non-staff dealer editing their own dealers row may change
-- only contact fields. Protected columns are silently kept at their old value.
-- (WITH CHECK alone cannot do this — it never sees the OLD row — so we use a
-- BEFORE UPDATE trigger.)
-- ----------------------------------------------------------------------------
create or replace function public.dealers_guard_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_staff() then
    return new;  -- staff may change any column (e.g. flip status active/inactive)
  end if;
  new.id           := old.id;
  new.created_at   := old.created_at;
  new.auth_user_id := old.auth_user_id;
  new.status       := old.status;
  return new;
end;
$$;

drop trigger if exists dealers_guard_protected_columns on public.dealers;
create trigger dealers_guard_protected_columns
  before update on public.dealers
  for each row
  execute function public.dealers_guard_protected_columns();

-- ----------------------------------------------------------------------------
-- Enable RLS. With RLS on and no matching policy, access is denied by default.
-- ----------------------------------------------------------------------------
alter table public.dealers             enable row level security;
alter table public.dealer_transactions enable row level security;
alter table public.staff_users         enable row level security;

-- ---- dealers ---------------------------------------------------------------
drop policy if exists dealers_select_self_or_staff on public.dealers;
create policy dealers_select_self_or_staff
  on public.dealers for select to authenticated
  using (auth_user_id = (select auth.uid()) or public.is_staff());

drop policy if exists dealers_update_self_or_staff on public.dealers;
create policy dealers_update_self_or_staff
  on public.dealers for update to authenticated
  using (auth_user_id = (select auth.uid()) or public.is_staff())
  with check (auth_user_id = (select auth.uid()) or public.is_staff());

-- Only staff may create dealer records from the app (the offline provisioning
-- script uses the service key and bypasses this). Dealers cannot self-register.
drop policy if exists dealers_insert_staff on public.dealers;
create policy dealers_insert_staff
  on public.dealers for insert to authenticated
  with check (public.is_staff());

-- ---- dealer_transactions ---------------------------------------------------
drop policy if exists dealer_transactions_select_own_or_staff on public.dealer_transactions;
create policy dealer_transactions_select_own_or_staff
  on public.dealer_transactions for select to authenticated
  using (dealer_id = public.current_dealer_id() or public.is_staff());

drop policy if exists dealer_transactions_insert_own_or_staff on public.dealer_transactions;
create policy dealer_transactions_insert_own_or_staff
  on public.dealer_transactions for insert to authenticated
  with check (dealer_id = public.current_dealer_id() or public.is_staff());

-- Status changes are staff-driven, so only staff may UPDATE transactions.
-- (Dealers get SELECT + INSERT only; they cannot alter a transaction's status.)
drop policy if exists dealer_transactions_update_staff on public.dealer_transactions;
create policy dealer_transactions_update_staff
  on public.dealer_transactions for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---- staff_users -----------------------------------------------------------
-- Staff may read the staff list (future staff UI). No write policies: staff
-- membership is granted only via the service key / Supabase dashboard.
drop policy if exists staff_users_select_staff on public.staff_users;
create policy staff_users_select_staff
  on public.staff_users for select to authenticated
  using (public.is_staff());

-- ----------------------------------------------------------------------------
-- Grants. RLS is the gate, but privileges still matter. The anonymous role gets
-- NOTHING on these tables; authenticated gets the verbs RLS then constrains.
-- ----------------------------------------------------------------------------
revoke all on table public.dealers             from anon;
revoke all on table public.dealer_transactions from anon;
revoke all on table public.staff_users         from anon;

grant select, insert, update on table public.dealers             to authenticated;
grant select, insert, update on table public.dealer_transactions to authenticated;
grant select                  on table public.staff_users        to authenticated;

revoke all on function public.current_dealer_id() from public;
revoke all on function public.is_staff()          from public;
grant execute on function public.current_dealer_id() to authenticated;
grant execute on function public.is_staff()          to authenticated;
