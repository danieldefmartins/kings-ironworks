-- Reverse-geocode cache for payroll punch locations ("In 7:35 AM · 12 Main St").
-- Keyed by coordinates rounded to 4 decimals (~11 m), so each spot is looked up
-- on OpenStreetMap Nominatim once, ever — never per page render (their usage
-- policy: identify the app, max 1 request/second, cache results).
-- Until this table exists the app simply shows punch points that are not at a
-- job site or the shop as a map pin without a street name.
create table if not exists public.kiw_shop_place_cache (
  org_id uuid not null references public.kiw_shop_organizations(id) on delete cascade,
  lat_e4 integer not null,
  lng_e4 integer not null,
  label text not null,
  created_at timestamptz not null default now(),
  primary key (org_id, lat_e4, lng_e4)
);
alter table public.kiw_shop_place_cache enable row level security;
-- Service-role access only, like every kiw_shop_* table.
