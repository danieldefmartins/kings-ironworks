-- Periodic GPS breadcrumbs for payroll shifts. These are auditable attendance
-- metadata, not a replacement for explicit clock punches.
create table if not exists public.kiw_shop_shift_locations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.kiw_shop_organizations(id) on delete cascade,
  shift_id uuid not null references public.kiw_shop_shifts(id) on delete cascade,
  worker_id uuid not null,
  recorded_at timestamptz not null default now(),
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision,
  location_status text not null default 'unknown'
    check (location_status in ('verified','outside','unavailable','unknown')),
  work_state text not null default 'working'
    check (work_state in ('working','break')),
  created_at timestamptz not null default now(),
  foreign key (worker_id, org_id) references public.kiw_shop_workers(id, org_id)
);
create index if not exists kiw_shop_shift_locations_shift_time_idx
  on public.kiw_shop_shift_locations(org_id, shift_id, recorded_at desc);
create index if not exists kiw_shop_shift_locations_worker_time_idx
  on public.kiw_shop_shift_locations(org_id, worker_id, recorded_at desc);
alter table public.kiw_shop_shift_locations enable row level security;
