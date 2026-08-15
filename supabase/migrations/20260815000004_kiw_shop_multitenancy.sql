-- Multi-tenant foundation. KIW becomes tenant #1; every customer-owned table
-- gains org_id with composite foreign keys so a child row can never reference
-- a parent in a different organization — database-level isolation even if an
-- application query ever misses a filter.

create table if not exists public.kiw_shop_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.kiw_shop_organizations enable row level security;

insert into public.kiw_shop_organizations (id, name, slug)
values ('a0000000-0000-4000-8000-000000000001', 'King Iron Works', 'kiw')
on conflict (id) do nothing;

-- org settings: one JSONB document per organization
create table if not exists public.kiw_shop_org_settings (
  org_id uuid primary key references public.kiw_shop_organizations(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.kiw_shop_org_settings enable row level security;

-- immutable audit log (trigger blocks UPDATE/DELETE for every role)
create table if not exists public.kiw_shop_audit (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.kiw_shop_organizations(id) on delete cascade,
  at timestamptz not null default now(),
  worker_id uuid,
  action text not null,
  entity text,
  entity_id uuid,
  detail jsonb
);
alter table public.kiw_shop_audit enable row level security;
create index if not exists kiw_shop_audit_org_at_idx on public.kiw_shop_audit(org_id, at desc);
create index if not exists kiw_shop_audit_entity_idx on public.kiw_shop_audit(entity, entity_id);

create or replace function public.kiw_shop_audit_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'audit records are immutable';
end;
$$;
drop trigger if exists kiw_shop_audit_no_change on public.kiw_shop_audit;
create trigger kiw_shop_audit_no_change
  before update or delete on public.kiw_shop_audit
  for each row execute function public.kiw_shop_audit_immutable();

-- org_id on every customer-owned table, defaulted to KIW for existing rows
alter table public.kiw_shop_workers        add column if not exists org_id uuid not null default 'a0000000-0000-4000-8000-000000000001' references public.kiw_shop_organizations(id);
alter table public.kiw_shop_jobs           add column if not exists org_id uuid not null default 'a0000000-0000-4000-8000-000000000001' references public.kiw_shop_organizations(id);
alter table public.kiw_shop_measure_sheets add column if not exists org_id uuid not null default 'a0000000-0000-4000-8000-000000000001' references public.kiw_shop_organizations(id);
alter table public.kiw_shop_measure_revisions add column if not exists org_id uuid not null default 'a0000000-0000-4000-8000-000000000001' references public.kiw_shop_organizations(id);
alter table public.kiw_shop_photos         add column if not exists org_id uuid not null default 'a0000000-0000-4000-8000-000000000001' references public.kiw_shop_organizations(id);
alter table public.kiw_shop_cut_items      add column if not exists org_id uuid not null default 'a0000000-0000-4000-8000-000000000001' references public.kiw_shop_organizations(id);
alter table public.kiw_shop_materials      add column if not exists org_id uuid not null default 'a0000000-0000-4000-8000-000000000001' references public.kiw_shop_organizations(id);
alter table public.kiw_shop_qc_checks      add column if not exists org_id uuid not null default 'a0000000-0000-4000-8000-000000000001' references public.kiw_shop_organizations(id);
alter table public.kiw_shop_stage_log      add column if not exists org_id uuid not null default 'a0000000-0000-4000-8000-000000000001' references public.kiw_shop_organizations(id);
alter table public.kiw_shop_time_entries   add column if not exists org_id uuid not null default 'a0000000-0000-4000-8000-000000000001' references public.kiw_shop_organizations(id);

-- composite uniques on parents so children can enforce same-org references
create unique index if not exists kiw_shop_jobs_id_org_uidx on public.kiw_shop_jobs(id, org_id);
create unique index if not exists kiw_shop_workers_id_org_uidx on public.kiw_shop_workers(id, org_id);
create unique index if not exists kiw_shop_measure_sheets_id_org_uidx on public.kiw_shop_measure_sheets(id, org_id);

-- composite FKs: child (parent_id, org_id) must match the parent's org
do $$ begin
  alter table public.kiw_shop_measure_sheets
    add constraint kiw_shop_measure_sheets_job_org_fk
    foreign key (job_id, org_id) references public.kiw_shop_jobs(id, org_id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.kiw_shop_measure_revisions
    add constraint kiw_shop_measure_revisions_sheet_org_fk
    foreign key (sheet_id, org_id) references public.kiw_shop_measure_sheets(id, org_id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.kiw_shop_photos
    add constraint kiw_shop_photos_job_org_fk
    foreign key (job_id, org_id) references public.kiw_shop_jobs(id, org_id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.kiw_shop_cut_items
    add constraint kiw_shop_cut_items_job_org_fk
    foreign key (job_id, org_id) references public.kiw_shop_jobs(id, org_id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.kiw_shop_materials
    add constraint kiw_shop_materials_job_org_fk
    foreign key (job_id, org_id) references public.kiw_shop_jobs(id, org_id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.kiw_shop_qc_checks
    add constraint kiw_shop_qc_checks_job_org_fk
    foreign key (job_id, org_id) references public.kiw_shop_jobs(id, org_id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.kiw_shop_time_entries
    add constraint kiw_shop_time_entries_job_org_fk
    foreign key (job_id, org_id) references public.kiw_shop_jobs(id, org_id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.kiw_shop_time_entries
    add constraint kiw_shop_time_entries_worker_org_fk
    foreign key (worker_id, org_id) references public.kiw_shop_workers(id, org_id);
exception when duplicate_object then null; end $$;

-- approve function: org-verified + org-configurable self-approval
create or replace function public.kiw_shop_approve_measure_sheet(
  p_sheet_id uuid,
  p_worker_id uuid,
  p_org_id uuid default null,
  p_allow_self boolean default false
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sheet public.kiw_shop_measure_sheets%rowtype;
  v_rev int;
begin
  select * into v_sheet
    from public.kiw_shop_measure_sheets
   where id = p_sheet_id
     and (p_org_id is null or org_id = p_org_id)
     for update;
  if not found then
    raise exception 'SHEET_NOT_FOUND';
  end if;
  if v_sheet.status <> 'submitted' then
    raise exception 'NOT_SUBMITTED';
  end if;
  if not p_allow_self
     and v_sheet.submitted_by is not null
     and v_sheet.submitted_by = p_worker_id then
    raise exception 'SELF_APPROVAL';
  end if;

  v_rev := coalesce(v_sheet.current_rev, 0) + 1;

  update public.kiw_shop_measure_revisions
     set superseded = true
   where sheet_id = p_sheet_id
     and superseded = false;

  insert into public.kiw_shop_measure_revisions
    (sheet_id, org_id, rev_no, name, shape, data, approved_by, approved_at)
  values
    (p_sheet_id, v_sheet.org_id, v_rev, v_sheet.name, v_sheet.shape, v_sheet.data, p_worker_id, now());

  update public.kiw_shop_measure_sheets
     set status = 'approved',
         approved_by = p_worker_id,
         approved_at = now(),
         current_rev = v_rev,
         updated_by = p_worker_id,
         updated_at = now()
   where id = p_sheet_id;

  return v_rev;
end;
$$;

revoke all on function public.kiw_shop_approve_measure_sheet(uuid, uuid, uuid, boolean) from public;
revoke all on function public.kiw_shop_approve_measure_sheet(uuid, uuid, uuid, boolean) from anon;
revoke all on function public.kiw_shop_approve_measure_sheet(uuid, uuid, uuid, boolean) from authenticated;
grant execute on function public.kiw_shop_approve_measure_sheet(uuid, uuid, uuid, boolean) to service_role;

drop function if exists public.kiw_shop_approve_measure_sheet(uuid, uuid);
