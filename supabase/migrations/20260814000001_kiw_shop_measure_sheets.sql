-- Field Measure: measurement sheets (JSONB payload, service-role only)
create table if not exists public.kiw_shop_measure_sheets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.kiw_shop_jobs(id) on delete cascade,
  name text,
  shape text not null,
  status text not null default 'in_progress',
  data jsonb not null default '{}'::jsonb,
  created_by uuid references public.kiw_shop_workers(id),
  updated_by uuid references public.kiw_shop_workers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.kiw_shop_measure_sheets enable row level security;
create index if not exists kiw_shop_measure_sheets_job_idx on public.kiw_shop_measure_sheets(job_id);
