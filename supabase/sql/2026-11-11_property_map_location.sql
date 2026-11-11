-- Map pin for each property: a Google Maps link or "lat, lng" coordinates.
alter table public.properties add column if not exists map_location text;
