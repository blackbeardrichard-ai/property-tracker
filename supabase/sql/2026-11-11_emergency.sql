-- Property Tracker — emergency page, neighbours and farm boundaries.
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run twice.
-- Needs the farm-features script first (it uses its access helpers).

alter table public.properties add column if not exists boundary jsonb;   -- [[lat, lng], …] outline of the farm

create table if not exists public.neighbours (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  farm_name text not null,
  notes text,
  boundary jsonb,                       -- [[lat, lng], …]
  position integer not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.neighbour_people (
  id uuid primary key default gen_random_uuid(),
  neighbour_id uuid not null references public.neighbours(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,                   -- e.g. Fire brigade, Police, Dr Smit (vet)
  organisation text,
  phone text,
  notes text,
  position integer not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.emergency_procedures (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  title text not null,                  -- e.g. Fire
  icon text,
  call_contact_id uuid references public.emergency_contacts(id) on delete set null,  -- the first call
  steps text,                           -- one step per line
  contact_ids uuid[] not null default '{}',   -- who else to phone
  neighbour_ids uuid[] not null default '{}', -- which neighbours to notify
  position integer not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['neighbours','neighbour_people','emergency_contacts','emergency_procedures']
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
