-- Property Tracker — farm features (photos, herd livestock, machinery hours and diesel,
-- rounds, spending, store, incidents, rain and boreholes).
-- Paste the whole script into Supabase → SQL Editor → New query → Run. Safe to run twice.

-- ── Access helpers ────────────────────────────────────────────────────────────
-- Read: admins, and anyone assigned to the property.
-- Write: admins, and managers or technicians assigned to the property (not viewers).
create or replace function public.pt_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and coalesce(p.active, true));
$$;

create or replace function public.pt_can_read(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.pt_is_admin() or exists (
    select 1 from public.property_users pu join public.profiles p on p.id = pu.user_id
    where pu.property_id = pid and pu.user_id = auth.uid() and coalesce(p.active, true));
$$;

create or replace function public.pt_can_write(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.pt_is_admin() or exists (
    select 1 from public.property_users pu join public.profiles p on p.id = pu.user_id
    where pu.property_id = pid and pu.user_id = auth.uid() and pu.role <> 'viewer' and coalesce(p.active, true));
$$;

-- Photo files are stored as <property id>/<what>/<id>/<file>.jpg
create or replace function public.pt_path_property(path text) returns uuid
language plpgsql immutable as $$
begin
  return split_part(path, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

-- ── New columns on existing tables ────────────────────────────────────────────
alter table public.livestock        add column if not exists area_id uuid references public.rooms(id) on delete set null;
alter table public.livestock        add column if not exists weight_kg numeric;
alter table public.livestock        add column if not exists weight_date date;
alter table public.livestock        add column if not exists withdrawal_until date;

alter table public.livestock_events add column if not exists group_id uuid;
alter table public.livestock_events add column if not exists group_size integer;
alter table public.livestock_events add column if not exists product text;
alter table public.livestock_events add column if not exists withdrawal_days integer;
alter table public.livestock_events add column if not exists weight_kg numeric;
alter table public.livestock_events add column if not exists area_id uuid references public.rooms(id) on delete set null;

alter table public.assets           add column if not exists meter_type text;          -- 'hours' or 'km'
alter table public.assets           add column if not exists meter_reading numeric;
alter table public.assets           add column if not exists meter_date date;
alter table public.assets           add column if not exists service_interval numeric;  -- hours or km between services
alter table public.assets           add column if not exists next_service_meter numeric;
alter table public.asset_service_logs add column if not exists meter_reading numeric;

alter table public.materials        add column if not exists price_excl numeric;        -- line total, excl. VAT
alter table public.materials        add column if not exists supplier text;

-- ── New tables ────────────────────────────────────────────────────────────────
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  entity_type text not null,             -- subtask, livestock_event, asset_service, incident, material, round_check
  entity_id uuid not null,
  path text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists photos_entity_idx on public.photos (entity_type, entity_id);

create table if not exists public.game_counts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  species text not null,
  area_id uuid references public.rooms(id) on delete set null,
  count integer not null check (count >= 0),
  counted_on date not null default current_date,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.meter_readings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  reading numeric not null,
  read_on date not null default current_date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.fuel_tanks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  capacity_l numeric,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.fuel_log (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  tank_id uuid references public.fuel_tanks(id) on delete set null,
  asset_id uuid references public.assets(id) on delete set null,
  kind text not null check (kind in ('fill', 'issue', 'dip')),  -- dip = measured level in the tank
  litres numeric not null check (litres >= 0),
  price_excl numeric,                                            -- fills: total paid, excl. VAT
  meter_reading numeric,                                         -- issues: hour meter / odometer at fill-up
  entry_date date not null default current_date,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.round_templates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly')),
  assigned_to uuid,
  position integer not null default 0,
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.round_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.round_templates(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.round_checks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.round_templates(id) on delete cascade,
  item_id uuid not null references public.round_items(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  period date not null,                 -- the day (daily) or the Monday of the week (weekly)
  status text not null check (status in ('ok', 'problem')),
  note text,
  task_id uuid references public.tasks(id) on delete set null,
  checked_by uuid default auth.uid(),
  checked_at timestamptz not null default now(),
  unique (item_id, period)
);

create table if not exists public.store_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  unit text,
  qty numeric not null default 0,
  min_qty numeric,
  position integer not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.store_moves (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.store_items(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  kind text not null check (kind in ('in', 'out', 'count')),
  qty numeric not null check (qty >= 0),
  price_excl numeric,                   -- stock in: total paid, excl. VAT
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- Keep the store count in step with every movement (also when moves arrive late from a phone that was offline).
create or replace function public.pt_apply_store_move() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.store_items set qty = case new.kind
      when 'in'    then qty + new.qty
      when 'out'   then greatest(qty - new.qty, 0)
      when 'count' then new.qty end
  where id = new.item_id;
  return new;
end;
$$;
drop trigger if exists pt_store_move_apply on public.store_moves;
create trigger pt_store_move_apply after insert on public.store_moves
  for each row execute function public.pt_apply_store_move();

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  kind text not null,                   -- theft, fire, fence, predator, injury, other
  title text not null,
  occurred_on date not null default current_date,
  area_id uuid references public.rooms(id) on delete set null,
  description text,
  police_case text,
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.rain_log (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  rain_on date not null default current_date,
  mm numeric not null check (mm >= 0),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.boreholes (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.borehole_readings (
  id uuid primary key default gen_random_uuid(),
  borehole_id uuid not null references public.boreholes(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  read_on date not null default current_date,
  level_m numeric not null,             -- depth to water, metres below the borehole top
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- ── Row-level security on the new tables ─────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['photos','game_counts','meter_readings','fuel_tanks','fuel_log','round_templates','round_items',
                           'round_checks','store_items','store_moves','incidents','rain_log','boreholes','borehole_readings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists pt_read on public.%I', t);
    execute format('drop policy if exists pt_insert on public.%I', t);
    execute format('drop policy if exists pt_update on public.%I', t);
    execute format('drop policy if exists pt_delete on public.%I', t);
    execute format('create policy pt_read on public.%I for select to authenticated using (public.pt_can_read(property_id))', t);
    execute format('create policy pt_insert on public.%I for insert to authenticated with check (public.pt_can_write(property_id))', t);
    execute format('create policy pt_update on public.%I for update to authenticated using (public.pt_can_write(property_id)) with check (public.pt_can_write(property_id))', t);
    execute format('create policy pt_delete on public.%I for delete to authenticated using (public.pt_can_write(property_id))', t);
  end loop;
end $$;

-- ── Photo storage (private bucket) ────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists pt_photos_read on storage.objects;
drop policy if exists pt_photos_insert on storage.objects;
drop policy if exists pt_photos_delete on storage.objects;
create policy pt_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.pt_can_read(public.pt_path_property(name)));
create policy pt_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.pt_can_write(public.pt_path_property(name)));
create policy pt_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.pt_can_write(public.pt_path_property(name)));
