-- =========================================================================
-- CEFI: per-account sign-in lockout  (2026-09-27)  — Master-Vault item 9
-- Supabase Dashboard -> SQL Editor -> paste -> Run.  Safe to re-run.
--
-- 5 failed sign-ins for the same email within 15 minutes lock that email for
-- 15 minutes. The API (backend/lib/login-guard.js) calls these functions with
-- the service-role key. Emails are stored only as SHA-256 hashes.
-- Until this runs, the API falls back to a per-instance in-memory count.
-- =========================================================================

create table if not exists public.auth_login_attempts (
  email_hash        text primary key,
  failed_count      integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until      timestamptz
);

alter table public.auth_login_attempts enable row level security;
revoke all on public.auth_login_attempts from anon, authenticated;
-- No policies: browser keys can neither read nor write it. The backend's
-- service role gets explicit access (it bypasses RLS in Supabase).
grant select, insert, update, delete on public.auth_login_attempts to service_role;

-- Returns the lock expiry if the email is locked right now, else NULL.
create or replace function public.auth_login_check(p_email_hash text)
returns timestamptz
language sql stable
set search_path = public
as $$
  select locked_until from public.auth_login_attempts
  where email_hash = p_email_hash and locked_until > now();
$$;

-- Records one attempt atomically (INSERT ... ON CONFLICT), so concurrent
-- requests on different servers can't lose a count. Success clears the row.
-- Returns the lock expiry if this failure triggered a lock, else NULL.
create or replace function public.auth_login_record(p_email_hash text, p_success boolean)
returns timestamptz
language plpgsql
set search_path = public
as $$
declare
  max_failures constant integer  := 5;
  win          constant interval := interval '15 minutes';
  lock_for     constant interval := interval '15 minutes';
  r public.auth_login_attempts;
begin
  if p_success then
    delete from public.auth_login_attempts where email_hash = p_email_hash;
    return null;
  end if;

  insert into public.auth_login_attempts as a (email_hash, failed_count, window_started_at)
  values (p_email_hash, 1, now())
  on conflict (email_hash) do update set
    failed_count      = case when a.window_started_at < now() - win then 1 else a.failed_count + 1 end,
    window_started_at = case when a.window_started_at < now() - win then now() else a.window_started_at end
  returning * into r;

  if r.failed_count >= max_failures then
    update public.auth_login_attempts
       set locked_until = now() + lock_for, failed_count = 0, window_started_at = now()
     where email_hash = p_email_hash
    returning * into r;
    return r.locked_until;
  end if;
  return null;
end;
$$;

-- Functions in "public" are callable through the REST API by default.
-- Only the backend (service role) may call these.
revoke execute on function public.auth_login_check(text)           from public, anon, authenticated;
revoke execute on function public.auth_login_record(text, boolean) from public, anon, authenticated;
grant  execute on function public.auth_login_check(text)           to service_role;
grant  execute on function public.auth_login_record(text, boolean) to service_role;

-- Verify: rowsecurity = true, and no policies on the table.
select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'auth_login_attempts';
select count(*) as policies from pg_policies where schemaname = 'public' and tablename = 'auth_login_attempts';
