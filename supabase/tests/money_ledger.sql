-- Run in the migration's transaction, then roll back: no customer data changes.
do $$
declare o uuid := 'a0000000-0000-4000-8000-000000000001'; w uuid; j uuid := gen_random_uuid(); e uuid := gen_random_uuid(); r uuid := gen_random_uuid(); c numeric; p numeric; ar boolean; au boolean;
begin
  select id into w from kiw_shop_workers where org_id=o and active and is_admin and can_see_prices limit 1;
  insert into kiw_shop_jobs(id,org_id,job_number,customer_name,current_stage,contract_amount,deposit_amount)
  values(j,o,'TEST-'||j,'Ledger test — rolled back','Awarded',50710,0);
  insert into kiw_shop_estimates(id,org_id,job_id,estimate_number,title,total_amount) values(e,o,j,'TEST-ORIGINAL','Test original estimate',94120);
  if (select money_status from kiw_shop_estimates where id=e) <> 'review' then raise exception 'New estimate must require review'; end if;
  perform kiw_shop_money_change(o,w,j,'estimate',jsonb_build_object('id',e,'mode','added','description','Test explicit additional scope'));
  perform kiw_shop_money_change(o,w,j,'estimate',jsonb_build_object('id',e,'mode','added','description','Retry must not double count'));
  select contract_amount into c from kiw_shop_jobs where id=j;
  if c<>144830 then raise exception 'Original plus additional or estimate retry failed: %',c; end if;
  perform kiw_shop_money_change(o,w,j,'add',jsonb_build_object('id',r,'kind','payment','amount',144830,'description','Test payment','date',null));
  perform kiw_shop_money_change(o,w,j,'add',jsonb_build_object('id',r,'kind','payment','amount',144830,'description','Test payment','date',null));
  select deposit_amount into p from kiw_shop_jobs where id=j;
  if p<>144830 then raise exception 'Payment retry double counted'; end if;
  update kiw_shop_jobs set current_stage='Done' where id=j;
  select archived,auto_archived into ar,au from kiw_shop_jobs where id=j;
  if not ar or not au then raise exception 'Paid done job did not auto archive'; end if;
  perform kiw_shop_money_change(o,w,j,'void',jsonb_build_object('id',r,'description','Test void payment'));
  select deposit_amount,archived into p,ar from kiw_shop_jobs where id=j;
  if p<>0 or ar then raise exception 'Voided payment must restore balance and reopen'; end if;
  -- An unreviewed estimate must reopen an automatically archived job.
  perform kiw_shop_money_change(o,w,j,'add',jsonb_build_object('id',gen_random_uuid(),'kind','payment','amount',144830,'description','Replacement payment','date',null));
  insert into kiw_shop_estimates(org_id,job_id,estimate_number,title,total_amount)
    values(o,j,'TEST-REVIEW','Unclassified scope',100) returning id into e;
  if (select archived from kiw_shop_jobs where id=j) then raise exception 'Unreviewed scope hidden in archives'; end if;
  perform kiw_shop_money_change(o,w,j,'estimate',jsonb_build_object('id',e,'mode','included','description','Already in existing test contract'));
  if not (select archived from kiw_shop_jobs where id=j) then raise exception 'Settled reviewed job did not archive'; end if;
  -- Return to a known unpaid balance for the negative-refund check below.
  perform kiw_shop_money_change(o,w,j,'add',jsonb_build_object('id',gen_random_uuid(),'kind','payment','amount',-144830,'description','Test full refund','date',null));
  select id into e from kiw_shop_estimates where job_id=j and estimate_number='TEST-ORIGINAL';
  begin
    update kiw_shop_jobs set contract_amount=1 where id=j;
    raise exception 'TEST direct overwrite was accepted';
  exception when others then if sqlerrm='TEST direct overwrite was accepted' then raise; end if; end;
  begin
    perform kiw_shop_money_change(o,w,j,'add',jsonb_build_object('id',gen_random_uuid(),'kind','payment','amount',-1,'description','Invalid refund','date',null));
    raise exception 'TEST negative total was accepted';
  exception when others then if sqlerrm='TEST negative total was accepted' then raise; end if; end;
  begin
    perform kiw_shop_money_change(o,gen_random_uuid(),j,'add',jsonb_build_object('id',gen_random_uuid(),'kind','payment','amount',1,'description','Unauthorized payment','date',null));
    raise exception 'TEST unauthorized owner was accepted';
  exception when others then if sqlerrm='TEST unauthorized owner was accepted' then raise; end if; end;
  begin
    update kiw_shop_estimates set total_amount=1 where id=e;
    raise exception 'TEST posted estimate overwrite accepted';
  exception when others then if sqlerrm='TEST posted estimate overwrite accepted' then raise; end if; end;
  insert into kiw_shop_jobs(org_id,job_number,customer_name,current_stage)
    values(o,'TEST-UNKNOWN-'||j,'Unknown money test','Done') returning id into j;
  if (select archived from kiw_shop_jobs where id=j) then raise exception 'Unknown balance was archived'; end if;
  if has_table_privilege('authenticated','kiw_shop_money_entries','SELECT') or has_table_privilege('anon','kiw_shop_money_entries','SELECT') or has_function_privilege('authenticated','kiw_shop_money_change(uuid,uuid,uuid,text,jsonb)','EXECUTE') then raise exception 'Financial API is exposed'; end if;
end $$;
select 'money ledger database checks passed; all changes rolled back' as result;
