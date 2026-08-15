-- TEST organization for the e2e suite: run the app with
-- SHOP_ORG_ID=b0000000-0000-4000-8000-000000000002 and all test data stays
-- fully isolated from real customer organizations.
insert into kiw_shop_organizations (id, name, slug)
values ('b0000000-0000-4000-8000-000000000002', 'TEST ORG (e2e)', 'test')
on conflict (id) do nothing;

insert into kiw_shop_org_settings (org_id, settings)
select 'b0000000-0000-4000-8000-000000000002', settings
from kiw_shop_org_settings where org_id = 'a0000000-0000-4000-8000-000000000001'
on conflict (org_id) do nothing;

insert into kiw_shop_workers (id, org_id, name, role, pin, lang, active, is_admin)
values
 ('b1000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002','Test Admin','Owner','9001','en',true,true),
 ('b1000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','Test Measurer','Fabricator','9002','en',true,false)
on conflict (id) do nothing;

insert into kiw_shop_jobs (id, org_id, job_number, customer_name, address, current_stage)
values ('b2000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002','TEST-1','E2E Test Job','1 Test St','Awarded')
on conflict (id) do nothing;
