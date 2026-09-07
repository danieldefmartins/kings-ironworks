-- Durable field-measurement -> SketchUp handoff. Desktop workers pull outbound;
-- the public web service never needs inbound access to the Tailscale network.
create table if not exists public.kiw_shop_drawing_workers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.kiw_shop_organizations(id),
  name text not null,
  token_hash text not null unique,
  last_seen_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.kiw_shop_drawing_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  sheet_id uuid not null,
  job_id uuid not null,
  snapshot jsonb not null,
  source_hash text not null,
  source_updated_at timestamptz not null,
  requested_by uuid not null,
  requested_at timestamptz not null default now(),
  status text not null default 'queued' check(status in ('queued','generating','ready','failed','approved')),
  worker_id uuid references public.kiw_shop_drawing_workers(id),
  lease_token uuid,
  lease_until timestamptz,
  attempts int not null default 0,
  artifact_path text,
  error text,
  completed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  unique(sheet_id,source_hash),
  foreign key(sheet_id,org_id) references public.kiw_shop_measure_sheets(id,org_id)
);
alter table public.kiw_shop_drawing_workers enable row level security;
alter table public.kiw_shop_drawing_requests enable row level security;
revoke all on public.kiw_shop_drawing_workers,public.kiw_shop_drawing_requests from anon,authenticated;
grant all on public.kiw_shop_drawing_workers,public.kiw_shop_drawing_requests to service_role;
create index if not exists kiw_drawing_queue_idx on public.kiw_shop_drawing_requests(org_id,status,requested_at);

create or replace function public.kiw_shop_queue_drawing(p_sheet_id uuid,p_org_id uuid,p_worker_id uuid,p_expected_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path=public as $$
declare s public.kiw_shop_measure_sheets%rowtype; v_snapshot jsonb; v_id uuid;
begin
  select * into s from public.kiw_shop_measure_sheets where id=p_sheet_id and org_id=p_org_id for update;
  if not found then raise exception 'SHEET_NOT_FOUND'; end if;
  if p_expected_updated_at is null or s.updated_at is distinct from p_expected_updated_at then raise exception 'DRAWING_CHANGED'; end if;
  v_snapshot=jsonb_build_object('data',s.data,'name',s.name,'shape',s.shape);
  insert into public.kiw_shop_drawing_requests(org_id,sheet_id,job_id,snapshot,source_hash,source_updated_at,requested_by)
    values(s.org_id,s.id,s.job_id,v_snapshot,md5(v_snapshot::text),s.updated_at,p_worker_id)
    on conflict(sheet_id,source_hash) do nothing returning id into v_id;
  if v_id is null then
    select id into v_id from public.kiw_shop_drawing_requests where sheet_id=s.id and source_hash=md5(v_snapshot::text);
    update public.kiw_shop_drawing_requests set status='queued',attempts=0,error=null,worker_id=null,lease_token=null,lease_until=null where id=v_id and status='failed';
  end if;
  if s.status='in_progress' then
    update public.kiw_shop_measure_sheets set status='submitted',submitted_by=p_worker_id,submitted_at=now(),updated_at=now() where id=s.id;
  end if;
  return v_id;
end; $$;

create or replace function public.kiw_shop_claim_drawing(p_org_id uuid,p_worker_id uuid)
returns setof public.kiw_shop_drawing_requests language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not exists(select 1 from public.kiw_shop_drawing_workers where id=p_worker_id and org_id=p_org_id and not revoked) then raise exception 'WORKER_NOT_FOUND'; end if;
  update public.kiw_shop_drawing_workers set last_seen_at=now() where id=p_worker_id;
  update public.kiw_shop_drawing_requests set status='failed',error='SketchUp worker timed out after three attempts',lease_token=null,lease_until=null
    where org_id=p_org_id and status='generating' and lease_until<now() and attempts>=3;
  select id into v_id from public.kiw_shop_drawing_requests
    where org_id=p_org_id and (status='queued' or (status='generating' and lease_until<now() and attempts<3))
    order by requested_at for update skip locked limit 1;
  if v_id is null then return; end if;
  return query update public.kiw_shop_drawing_requests set status='generating',worker_id=p_worker_id,
    lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',attempts=attempts+1,error=null
    where id=v_id returning *;
end; $$;
revoke all on function public.kiw_shop_queue_drawing(uuid,uuid,uuid,timestamptz) from public,anon,authenticated;
revoke all on function public.kiw_shop_claim_drawing(uuid,uuid) from public,anon,authenticated;
grant execute on function public.kiw_shop_queue_drawing(uuid,uuid,uuid,timestamptz) to service_role;
grant execute on function public.kiw_shop_claim_drawing(uuid,uuid) to service_role;

insert into storage.buckets(id,name,public,file_size_limit) values('shop-drawings','shop-drawings',false,104857600) on conflict(id) do nothing;
