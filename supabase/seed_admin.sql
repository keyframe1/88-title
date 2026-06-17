-- ============================================================================
-- 88 Title — Seed the first staff ADMIN
--
-- Grants role 'admin' in public.staff_users to anthony@attested.legal so they
-- can sign in at /dealers/login and reach the staff queue console (/staff/queue).
-- Membership in staff_users is the allowlist is_staff() checks, so this single
-- row is what turns a plain login into a queue admin.
--
-- Idempotent: safe to run any number of times. It is KEYED on looking the email
-- up in auth.users, so it only ever attaches to the real login and re-running is
-- a no-op once the row exists.
--
-- It does NOT create the auth account — create that first (Supabase dashboard:
-- Authentication -> Users -> Add user, with "Auto Confirm User" on), THEN run
-- this. If the login does not exist yet, this seed is a safe no-op and prints a
-- notice telling you to create it first.
--
-- Run it as a privileged role: the Supabase SQL editor, or psql on the service
-- connection. RLS on staff_users has no INSERT policy by design (see
-- supabase/migrations/20260617120000_dealer_portal.sql), so the anon/authenticated
-- web clients can never write here — only this out-of-band path can.
--
-- Adding Sean and Chris later is the same pattern: change v_email/v_name (role
-- 'staff' or 'admin'), or use the existing provisioning script, which also
-- creates the login in one step:
--   node scripts/create-dealer.mjs --staff --role admin \
--     --email anthony@attested.legal --contact "Anthony Kulick"
-- ============================================================================
do $$
declare
  v_email constant text := 'anthony@attested.legal';
  v_name  constant text := 'Anthony Kulick';
  v_uid   uuid;
begin
  select id
    into v_uid
    from auth.users
   where lower(email) = lower(v_email)
   limit 1;

  if v_uid is null then
    raise notice
      'No auth user for % yet. Create the login first (Supabase dashboard: Authentication -> Users -> Add user, with Auto Confirm User), then re-run this seed.',
      v_email;
    return;
  end if;

  insert into public.staff_users (auth_user_id, full_name, role)
  values (v_uid, v_name, 'admin')
  on conflict (auth_user_id) do update
    set role = 'admin';

  raise notice 'Seeded % as staff admin (auth_user_id=%).', v_email, v_uid;
end
$$;
