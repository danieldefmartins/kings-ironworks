-- Payroll clock: a shift is paid time; time entries remain job-cost allocations.
-- GPS is captured only on explicit punches. Coordinates never decide whether
-- worked time is payable; they are supporting metadata for review.

create table if not exists public.kiw_shop_shifts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.kiw_shop_organizations(id),
  worker_id uuid not null,
  pay_rate numeric(10,2),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  start_lat double precision,
  start_lng double precision,
  start_accuracy_m double precision,
  end_lat double precision,
  end_lng double precision,
  end_accuracy_m double precision,
  start_location_status text not null default 'unknown'
    check (start_location_status in ('verified','outside','unavailable','unknown')),
  end_location_status text not null default 'unknown'
    check (end_location_status in ('verified','outside','unavailable','unknown')),
  status text not null default 'open'
    check (status in ('open','submitted','approved','rejected')),
  approved_by uuid,
  approved_at timestamptz,
  employee_note text,
  manager_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (worker_id, org_id)
    references public.kiw_shop_workers(id, org_id)
);

create unique index if not exists kiw_shop_one_open_shift_per_worker
  on public.kiw_shop_shifts(org_id, worker_id) where ended_at is null;
create index if not exists kiw_shop_shifts_worker_started_idx
  on public.kiw_shop_shifts(org_id, worker_id, started_at desc);

create table if not exists public.kiw_shop_breaks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.kiw_shop_organizations(id),
  shift_id uuid not null references public.kiw_shop_shifts(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists kiw_shop_one_open_break_per_shift
  on public.kiw_shop_breaks(org_id, shift_id) where ended_at is null;

create table if not exists public.kiw_shop_time_corrections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.kiw_shop_organizations(id),
  shift_id uuid not null references public.kiw_shop_shifts(id) on delete cascade,
  worker_id uuid not null,
  requested_started_at timestamptz,
  requested_ended_at timestamptz,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  foreign key (worker_id, org_id)
    references public.kiw_shop_workers(id, org_id)
);

alter table public.kiw_shop_time_entries
  add column if not exists shift_id uuid references public.kiw_shop_shifts(id) on delete set null;
alter table public.kiw_shop_time_entries
  add column if not exists start_accuracy_m double precision;
alter table public.kiw_shop_time_entries
  add column if not exists end_accuracy_m double precision;

-- Preserve completed history. Each legacy job session becomes a submitted
-- shift; new records can contain several job allocations under one shift.
insert into public.kiw_shop_shifts (
  id, org_id, worker_id, pay_rate, started_at, ended_at,
  start_lat, start_lng, end_lat, end_lng, status
)
select e.id, e.org_id, e.worker_id, w.hourly_rate, e.started_at, e.ended_at,
       e.start_lat, e.start_lng, e.end_lat, e.end_lng, 'submitted'
from public.kiw_shop_time_entries e
join public.kiw_shop_workers w on w.id = e.worker_id and w.org_id = e.org_id
where e.shift_id is null and e.ended_at is not null
on conflict (id) do nothing;

update public.kiw_shop_time_entries
set shift_id = id
where shift_id is null and ended_at is not null;

alter table public.kiw_shop_workers add column if not exists phone text;
alter table public.kiw_shop_workers add column if not exists email text;
alter table public.kiw_shop_workers add column if not exists emergency_contact_name text;
alter table public.kiw_shop_workers add column if not exists emergency_contact_phone text;

create index if not exists kiw_shop_time_entries_shift_idx
  on public.kiw_shop_time_entries(org_id, shift_id, started_at);

alter table public.kiw_shop_shifts enable row level security;
alter table public.kiw_shop_breaks enable row level security;
alter table public.kiw_shop_time_corrections enable row level security;

-- Service-role access is used by the server. No browser policies by design.
