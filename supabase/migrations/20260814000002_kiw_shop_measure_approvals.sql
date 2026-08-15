-- Field Measure: submit/approve lifecycle + immutable revisions
alter table public.kiw_shop_measure_sheets
  add column if not exists review_comment text,
  add column if not exists submitted_by uuid references public.kiw_shop_workers(id),
  add column if not exists submitted_at timestamptz,
  add column if not exists approved_by uuid references public.kiw_shop_workers(id),
  add column if not exists approved_at timestamptz,
  add column if not exists current_rev int not null default 0;

create table if not exists public.kiw_shop_measure_revisions (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.kiw_shop_measure_sheets(id) on delete cascade,
  rev_no int not null,
  name text,
  shape text not null,
  data jsonb not null,
  approved_by uuid references public.kiw_shop_workers(id),
  approved_at timestamptz not null default now(),
  superseded boolean not null default false,
  unique (sheet_id, rev_no)
);
alter table public.kiw_shop_measure_revisions enable row level security;
create index if not exists kiw_shop_measure_revisions_sheet_idx on public.kiw_shop_measure_revisions(sheet_id);
