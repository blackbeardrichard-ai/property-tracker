-- What each asset runs on, so only diesel machines are offered when diesel is issued.
alter table public.assets add column if not exists fuel text
  check (fuel in ('diesel', 'petrol', 'electric', 'none'));
