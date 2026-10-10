-- Keep account and time history intact while excluding non-payroll accounts.
begin;
alter table public.kiw_shop_workers add column if not exists payroll_excluded boolean not null default false;
with changed as (
 update public.kiw_shop_workers set payroll_excluded=true
 where org_id='a0000000-0000-4000-8000-000000000001'
 and id in (
 '47d4936e-4020-47c9-bd09-99cb642337f7', -- Helper 1
 '5b2613eb-e7d4-449c-ab49-111740e592c1', -- Helper 2
 'd1cca4fd-bab1-48cb-b518-d865e9c8bade', -- Office
 '046a9e3d-eac9-4d75-98bf-ec7947bb6fb8', -- Daniel Martins
 '19895d1a-97ce-4908-97ec-8cfede421b64'  -- Kayky
 ) and not payroll_excluded
 returning id,org_id,name
)
insert into public.kiw_shop_audit(org_id,worker_id,action,entity,entity_id,detail)
select org_id,'046a9e3d-eac9-4d75-98bf-ec7947bb6fb8','worker_payroll_excluded','worker',id,
 jsonb_build_object('name',name,'payrollExcluded',true,'reason','Daniel requested removing Helper 1, Helper 2, Office, Daniel and Kayky from payroll information','historyPreserved',true)
from changed;
commit;
