-- Run after the migration in a transaction that is rolled back.
do $$
declare o uuid := 'a0000000-0000-4000-8000-000000000001'; actor uuid; applicant uuid := gen_random_uuid(); second_id uuid := gen_random_uuid(); result jsonb; replay jsonb; w uuid; d jsonb; pin_value text; denied boolean := false;
begin
 select id into actor from kiw_shop_workers where org_id=o and active and is_admin and can_see_prices limit 1;
 if actor is null then raise exception 'Test needs an existing owner'; end if;
 pin_value := lpad((floor(random()*90000000)+10000000)::bigint::text,8,'0');
 while exists(select 1 from kiw_shop_workers where org_id=o and pin=pin_value) loop pin_value := lpad((floor(random()*90000000)+10000000)::bigint::text,8,'0'); end loop;
 d := jsonb_build_object('fullName','Rollback applicant '||applicant,'email',applicant||'@example.test','phone','+1617'||right(replace(applicant::text,'-',''),7),'lang','pt','street','Test street','city','Everett','state','MA','postalCode','02149','emergencyName','Test contact','emergencyPhone','6175550101','skills',jsonb_build_array('MIG welding'),'consent',true);
 if kiw_submit_worker_application(o,applicant,d,'test-'||applicant)<>applicant then raise exception 'Submission failed'; end if;
 if kiw_submit_worker_application(o,second_id,d,'test-'||applicant)<>applicant then raise exception 'Duplicate pending application created'; end if;
 if exists(select 1 from kiw_shop_workers where email=d->>'email') then raise exception 'Submission created a worker before approval'; end if;
 begin
  perform kiw_review_worker_application(o,gen_random_uuid(),applicant,'approved','Welder',25,pin_value,null);
 exception when others then if sqlerrm='Owner only' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Unauthorized approval accepted'; end if;
 result:=kiw_review_worker_application(o,actor,applicant,'approved','Welder',25,pin_value,'Test approval — rolled back');
 w:=(result->>'workerId')::uuid;
 if not exists(select 1 from kiw_shop_workers where id=w and org_id=o and active and not is_admin and not can_see_prices and lang='pt' and hourly_rate=25 and email=d->>'email' and application_details=d and address='Test street, Everett, MA, 02149') then raise exception 'Worker profile or permissions incorrect'; end if;
 replay:=kiw_review_worker_application(o,actor,applicant,'approved','Welder',25,pin_value,null);
 if replay<>result then raise exception 'Approval retry created another worker'; end if;
 if (select count(*) from kiw_shop_workers where org_id=o and email=d->>'email')<>1 then raise exception 'Duplicate worker'; end if;
 perform kiw_submit_worker_application(o,second_id,d,'test-'||applicant);
 denied:=false;
 begin perform kiw_review_worker_application(o,actor,second_id,'approved','Welder',25,pin_value,null);
 exception when others then if sqlerrm='Worker already exists' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Duplicate existing worker accepted'; end if;
 perform kiw_review_worker_application(o,actor,second_id,'declined',null,null,null,'Duplicate application');
 if not exists(select 1 from kiw_shop_worker_applications where id=second_id and status='declined' and worker_id is null) then raise exception 'Decline created worker'; end if;
 if has_table_privilege('anon','kiw_shop_worker_applications','SELECT') or has_table_privilege('authenticated','kiw_shop_worker_applications','SELECT') then raise exception 'Application data exposed'; end if;
 if has_function_privilege('anon','kiw_review_worker_application(uuid,uuid,uuid,text,text,numeric,text,text)','EXECUTE') then raise exception 'Public can approve'; end if;
end $$;
