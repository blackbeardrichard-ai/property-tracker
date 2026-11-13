-- Property Tracker: automatic backups to OneDrive, twice a week.
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run twice.
-- Run it after the "backup" Edge Function is deployed (see the setup steps).

-- 1. A record of each backup, shown in Settings › Export.
create table if not exists public.backup_log (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  ran_by text,
  ok boolean not null,
  rows integer,
  bytes integer,
  files text,
  error text
);
alter table public.backup_log enable row level security;
drop policy if exists backup_log_read on public.backup_log;
create policy backup_log_read on public.backup_log for select to authenticated using (public.pt_is_admin());
-- (Only the backup function, with the service key, writes to it.)

-- 2. The scheduler: Monday and Thursday at 02:00 South African time (00:00 UTC).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$ begin
  if exists (select 1 from cron.job where jobname = 'property-tracker-backup') then
    perform cron.unschedule('property-tracker-backup');
  end if;
end $$;

select cron.schedule(
  'property-tracker-backup',
  '0 0 * * 1,4',
  $$ select net.http_post(
       url := 'https://ergggdtuufhdydevsmkb.supabase.co/functions/v1/backup',
       body := '{}'::jsonb,
       headers := '{"Content-Type": "application/json"}'::jsonb,
       timeout_milliseconds := 120000
     ); $$
);
