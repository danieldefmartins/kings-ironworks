alter table public.kiw_shop_jobs
  add column if not exists assigned_worker_id uuid null,
  add column if not exists fabrication_order integer null;
create index if not exists kiw_shop_jobs_fabrication_order_idx
  on public.kiw_shop_jobs (org_id, fabrication_order, due_date);
