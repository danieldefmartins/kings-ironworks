-- Estimate detail is read through the shop server, never directly by crew clients.
create table if not exists public.kiw_shop_estimates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.kiw_shop_organizations(id),
  job_id uuid not null,
  estimate_number text not null,
  title text not null,
  issued_on date,
  is_original boolean not null default false,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, job_id, estimate_number),
  foreign key (job_id, org_id) references public.kiw_shop_jobs(id, org_id) on delete cascade
);
alter table public.kiw_shop_estimates enable row level security;
revoke all on public.kiw_shop_estimates from anon, authenticated;
grant all on public.kiw_shop_estimates to service_role;
notify pgrst, 'reload schema';
