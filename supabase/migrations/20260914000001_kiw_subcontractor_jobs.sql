-- Jobs KIW sends out to a subcontractor to handle entirely (fabrication AND
-- install), instead of building in-house. Still real jobs — contract_amount
-- and the money ledger work the same way — just flagged so the board can
-- show them separately from shop-floor fabrication work, and so what KIW
-- pays the sub is tracked next to what the customer pays KIW.
alter table public.kiw_shop_jobs add column if not exists is_subcontractor boolean not null default false;
alter table public.kiw_shop_jobs add column if not exists subcontractor_name text;
alter table public.kiw_shop_jobs add column if not exists subcontractor_phone text;
alter table public.kiw_shop_jobs add column if not exists subcontractor_split_pct numeric(5,2);
alter table public.kiw_shop_jobs add column if not exists subcontractor_amount_paid numeric(12,2) not null default 0;
alter table public.kiw_shop_jobs add column if not exists subcontractor_paid_on date;
alter table public.kiw_shop_jobs add column if not exists subcontractor_notes text;
create index if not exists kiw_shop_jobs_subcontractor_idx
  on public.kiw_shop_jobs(org_id, is_subcontractor) where is_subcontractor;
