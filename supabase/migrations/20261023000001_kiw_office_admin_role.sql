-- Allow approving office / admin applicants from the Join Our Team form.
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
  if p_rate is null or p_rate<=0 or p_rate>1000 or p_pin is null or p_pin !~ '^[0-9]{4,8}$' or p_role is null or p_role not in ('Fabricator','Welder','Installer','Shop helper','Painter / finisher','Driver','Office / admin','Other') then raise exception 'Invalid worker settings'; end if;
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
