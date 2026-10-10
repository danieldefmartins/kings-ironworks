-- Public applications are held separately from workers until owner approval.
begin;
create table if not exists public.kiw_shop_worker_applications (
 id uuid primary key, org_id uuid not null references public.kiw_shop_organizations(id),
 full_name text not null, email text not null, phone text not null, data jsonb not null,
 status text not null default 'pending' check(status in ('pending','approved','declined')),
 worker_id uuid, created_at timestamptz not null default now(), reviewed_at timestamptz,
 reviewed_by uuid, review_note text,
 foreign key(worker_id,org_id) references public.kiw_shop_workers(id,org_id)
);
create index if not exists kiw_worker_applications_org_status on public.kiw_shop_worker_applications(org_id,status,created_at desc);
alter table public.kiw_shop_worker_applications enable row level security;
revoke all on public.kiw_shop_worker_applications from anon, authenticated;
grant all on public.kiw_shop_worker_applications to service_role;
alter table public.kiw_shop_workers add column if not exists application_details jsonb;

-- Short-lived hashed source counters, shared by all app instances.
create table if not exists public.kiw_application_rate_limits (
 org_id uuid not null references public.kiw_shop_organizations(id), source_hash text not null,
 window_start timestamptz not null, attempts integer not null, primary key(org_id,source_hash)
);
alter table public.kiw_application_rate_limits enable row level security;
revoke all on public.kiw_application_rate_limits from anon, authenticated;
grant all on public.kiw_application_rate_limits to service_role;
create or replace function public.kiw_submit_worker_application(p_org uuid,p_id uuid,p_data jsonb,p_source text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_attempts integer; v_id uuid;
begin
 if not exists(select 1 from kiw_shop_organizations where id=p_org) then raise exception 'Unknown organization'; end if;
 insert into kiw_application_rate_limits(org_id,source_hash,window_start,attempts) values(p_org,p_source,now(),1)
 on conflict(org_id,source_hash) do update set
 attempts=case when kiw_application_rate_limits.window_start < now()-interval '1 hour' then 1 else kiw_application_rate_limits.attempts+1 end,
 window_start=case when kiw_application_rate_limits.window_start < now()-interval '1 hour' then now() else kiw_application_rate_limits.window_start end
 returning attempts into v_attempts;
 -- Return a sentinel instead of raising, so rate-limit counters commit.
 if v_attempts>10 then return null; end if;
 delete from kiw_application_rate_limits where window_start < now()-interval '2 days';
 perform pg_advisory_xact_lock(hashtextextended(p_org::text||lower(p_data->>'email'),0));
 select id into v_id from kiw_shop_worker_applications where org_id=p_org and id=p_id;
 if v_id is not null then return v_id; end if;
 select id into v_id from kiw_shop_worker_applications where org_id=p_org and lower(email)=lower(p_data->>'email') and status='pending' order by created_at desc limit 1;
 if v_id is not null then return v_id; end if;
 insert into kiw_shop_worker_applications(id,org_id,full_name,email,phone,data)
 values(p_id,p_org,p_data->>'fullName',lower(p_data->>'email'),p_data->>'phone',p_data);
 return p_id;
end; $$;
revoke all on function public.kiw_submit_worker_application(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.kiw_submit_worker_application(uuid,uuid,jsonb,text) to service_role;

create or replace function public.kiw_review_worker_application(p_org uuid,p_actor uuid,p_id uuid,p_decision text,p_role text default null,p_rate numeric default null,p_pin text default null,p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a kiw_shop_worker_applications%rowtype; v_worker uuid;
begin
 if not exists(select 1 from kiw_shop_workers where id=p_actor and org_id=p_org and active and is_admin and can_see_prices) then raise exception 'Owner only'; end if;
 -- Serialize approvals within this tenant: duplicate checks and creation are atomic.
 perform pg_advisory_xact_lock(hashtextextended('worker-approval:'||p_org::text,0));
 select * into a from kiw_shop_worker_applications where id=p_id and org_id=p_org for update;
 if not found then raise exception 'Application not found'; end if;
 if a.status=p_decision then return jsonb_build_object('status',a.status,'workerId',a.worker_id); end if;
 if a.status<>'pending' then raise exception 'Application already reviewed'; end if;
 if p_decision='approved' then
  if p_rate is null or p_rate<=0 or p_rate>1000 or p_pin is null or p_pin !~ '^[0-9]{4,8}$' or p_role is null or p_role not in ('Fabricator','Welder','Installer','Shop helper','Painter / finisher','Driver','Other') then raise exception 'Invalid worker settings'; end if;
  if exists(select 1 from kiw_shop_workers where org_id=p_org and (lower(email)=lower(a.email) or regexp_replace(phone,'[^0-9]','','g')=regexp_replace(a.phone,'[^0-9]','','g') or lower(trim(name))=lower(trim(a.full_name)))) then raise exception 'Worker already exists'; end if;
  if exists(select 1 from kiw_shop_workers where org_id=p_org and pin=p_pin) then raise exception 'PIN already in use'; end if;
  insert into kiw_shop_workers(org_id,name,role,pin,active,is_admin,can_see_prices,lang,hourly_rate,phone,email,address,emergency_contact_name,emergency_contact_phone,application_details)
  values(p_org,a.full_name,p_role,p_pin,true,false,false,a.data->>'lang',p_rate,a.phone,a.email,
    concat_ws(', ',a.data->>'street',nullif(a.data->>'unit',''),a.data->>'city',a.data->>'state',a.data->>'postalCode'),
    a.data->>'emergencyName',a.data->>'emergencyPhone',a.data) returning id into v_worker;
 elsif p_decision='declined' then
  if coalesce(length(trim(p_note)),0)=0 then raise exception 'Review note required'; end if;
 else raise exception 'Invalid decision'; end if;
 update kiw_shop_worker_applications set status=p_decision,worker_id=v_worker,reviewed_by=p_actor,reviewed_at=now(),review_note=p_note where id=p_id and org_id=p_org;
 insert into kiw_shop_audit(org_id,worker_id,action,entity,entity_id,detail)
 values(p_org,p_actor,'worker_application_'||p_decision,'worker_application',p_id,jsonb_build_object('workerId',v_worker));
 return jsonb_build_object('status',p_decision,'workerId',v_worker);
end; $$;
revoke all on function public.kiw_review_worker_application(uuid,uuid,uuid,text,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.kiw_review_worker_application(uuid,uuid,uuid,text,text,numeric,text,text) to service_role;
commit;
