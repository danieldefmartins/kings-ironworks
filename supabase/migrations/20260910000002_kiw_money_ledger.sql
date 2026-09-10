begin;
-- Preserve every recorded amount while moving its source into an auditable ledger.
create temporary table money_before on commit drop as
  select id, contract_amount, deposit_amount from public.kiw_shop_jobs;
create table public.kiw_shop_money_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  job_id uuid not null,
  kind text not null check (kind in ('contract', 'payment')),
  amount numeric(12,2) not null,
  description text not null check (length(trim(description)) > 0),
  occurred_on date,
  source_estimate_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid,
  void_reason text,
  foreign key (job_id, org_id) references public.kiw_shop_jobs(id, org_id) on delete cascade,
  foreign key (created_by, org_id) references public.kiw_shop_workers(id, org_id),
  foreign key (voided_by, org_id) references public.kiw_shop_workers(id, org_id)
);
create index on public.kiw_shop_money_entries(org_id, job_id);
create unique index on public.kiw_shop_money_entries(org_id, source_estimate_id) where source_estimate_id is not null;
create unique index if not exists kiw_shop_estimates_id_job_org on public.kiw_shop_estimates(id, job_id, org_id);
alter table public.kiw_shop_money_entries add foreign key (source_estimate_id, job_id, org_id)
  references public.kiw_shop_estimates(id, job_id, org_id);
alter table public.kiw_shop_money_entries enable row level security;
revoke all on public.kiw_shop_money_entries from public, anon, authenticated;
grant select on public.kiw_shop_money_entries to service_role;
alter table public.kiw_shop_estimates add column money_status text not null default 'review'
  check (money_status in ('review', 'added', 'included', 'excluded'));
alter table public.kiw_shop_estimates add column money_note text;

insert into public.kiw_shop_money_entries(org_id,job_id,kind,amount,description)
select org_id,id,'contract',contract_amount,'Opening contract amount — carried forward from existing job record'
from public.kiw_shop_jobs where contract_amount is not null;
insert into public.kiw_shop_money_entries(org_id,job_id,kind,amount,description,occurred_on)
select org_id,id,'payment',deposit_amount,'Previously recorded money received — opening balance',deposit_received_on
from public.kiw_shop_jobs where deposit_amount is not null;

create function public.kiw_money_recalculate() returns trigger
language plpgsql security definer set search_path = public as $$
declare c numeric; p numeric;
begin
  select case when count(*) filter (where kind='contract') > 0 then coalesce(sum(amount) filter (where kind='contract' and voided_at is null),0) end,
         case when count(*) filter (where kind='payment') > 0 then coalesce(sum(amount) filter (where kind='payment' and voided_at is null),0) end
    into c,p from kiw_shop_money_entries where org_id=new.org_id and job_id=new.job_id;
  if c < 0 or p < 0 then raise exception 'A correction cannot make the contract or payments negative'; end if;
  update kiw_shop_jobs set contract_amount=c,deposit_amount=p where id=new.job_id and org_id=new.org_id;
  return new;
end $$;
create function public.kiw_money_entry_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform 1 from kiw_shop_jobs where id=new.job_id and org_id=new.org_id for update;
  if tg_op='UPDATE' and (new.id,new.org_id,new.job_id,new.kind,new.amount,new.description,new.occurred_on,new.source_estimate_id,new.created_by,new.created_at)
      is distinct from (old.id,old.org_id,old.job_id,old.kind,old.amount,old.description,old.occurred_on,old.source_estimate_id,old.created_by,old.created_at) then
    raise exception 'Ledger amounts are immutable; void and record a corrected entry';
  end if;
  if tg_op='UPDATE' and old.voided_at is not null then raise exception 'Voided entries cannot be changed'; end if;
  return new;
end $$;
create trigger kiw_money_entry_guard before insert or update on public.kiw_shop_money_entries
  for each row execute function public.kiw_money_entry_guard();
create trigger kiw_money_recalculate after insert or update on public.kiw_shop_money_entries
  for each row execute function public.kiw_money_recalculate();

-- Every old and new screen continues reading the same derived columns.
-- Refuse direct overwrites which would make the screens disagree with the ledger.
create function public.kiw_money_job_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare c numeric; p numeric;
begin
  select case when count(*) filter (where kind='contract') > 0 then coalesce(sum(amount) filter (where kind='contract' and voided_at is null),0) end,
         case when count(*) filter (where kind='payment') > 0 then coalesce(sum(amount) filter (where kind='payment' and voided_at is null),0) end
    into c,p from kiw_shop_money_entries where org_id=new.org_id and job_id=new.id;
  if new.contract_amount is distinct from c or new.deposit_amount is distinct from p then
    raise exception 'Record contract changes and payments in the job money ledger';
  end if;
  return new;
end $$;
create trigger kiw_money_job_guard before update of contract_amount,deposit_amount on public.kiw_shop_jobs
  for each row execute function public.kiw_money_job_guard();
create function public.kiw_money_new_job() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Insert both together so recalculation always sees the complete opening state.
  insert into kiw_shop_money_entries(org_id,job_id,kind,amount,description,occurred_on)
  select new.org_id,new.id,'contract',new.contract_amount,'Opening contract amount',null where new.contract_amount is not null
  union all select new.org_id,new.id,'payment',new.deposit_amount,'Opening money received',new.deposit_received_on where new.deposit_amount is not null;
  return new;
end $$;
create trigger kiw_money_new_job after insert on public.kiw_shop_jobs for each row execute function public.kiw_money_new_job();

create function public.kiw_estimate_money_guard() returns trigger
language plpgsql as $$
begin
  if (new.total_amount,new.items) is distinct from (old.total_amount,old.items) then
    if old.money_status='added' then raise exception 'This estimate is in the contract ledger. Record a revision or correction instead of overwriting it.'; end if;
    new.money_status := 'review'; new.money_note := null;
  end if;
  return new;
end $$;
create trigger kiw_estimate_money_guard before update on public.kiw_shop_estimates
  for each row execute function public.kiw_estimate_money_guard();

-- All writes, totals and audit records commit together. A stable request UUID
-- makes retrying a lost response safe; job locking serializes concurrent owners.
create function public.kiw_shop_money_change(p_org uuid,p_worker uuid,p_job uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare j kiw_shop_jobs; e kiw_shop_estimates; old_entry kiw_shop_money_entries; entry_id uuid; a numeric; k text; note text; mode text;
begin
  if not exists(select 1 from kiw_shop_workers where id=p_worker and org_id=p_org and active and is_admin and can_see_prices) then
    raise exception 'Owner access required';
  end if;
  select * into j from kiw_shop_jobs where id=p_job and org_id=p_org for update;
  if not found then raise exception 'Job not found'; end if;
  note := trim(coalesce(p_data->>'description',''));
  if length(note)<3 or length(note)>1000 then raise exception 'Enter a description of 3 to 1000 characters'; end if;
  if p_action='add' then
    entry_id := (p_data->>'id')::uuid;
    a := (p_data->>'amount')::numeric; k := p_data->>'kind';
    if a is null or a::text in ('NaN','Infinity','-Infinity') or abs(a)>9999999999.99 or round(a,2)<>a or k not in ('contract','payment') or k is null then raise exception 'Invalid amount or entry type'; end if;
    select * into old_entry from kiw_shop_money_entries where id=entry_id;
    if found then
      if (old_entry.org_id,old_entry.job_id,old_entry.kind,old_entry.amount,old_entry.description,old_entry.occurred_on) is distinct from (p_org,p_job,k,a,note,(p_data->>'date')::date) then raise exception 'Request ID already used'; end if;
      return jsonb_build_object('ok',true);
    end if;
    insert into kiw_shop_money_entries(id,org_id,job_id,kind,amount,description,occurred_on,created_by)
    values(entry_id,p_org,p_job,k,a,note,(p_data->>'date')::date,p_worker);
  elsif p_action='void' then
    select * into old_entry from kiw_shop_money_entries where id=(p_data->>'id')::uuid and org_id=p_org and job_id=p_job;
    if not found then raise exception 'Entry not found'; end if;
    if old_entry.voided_at is not null then return jsonb_build_object('ok',true); end if;
    update kiw_shop_money_entries set voided_at=now(),voided_by=p_worker,void_reason=note where id=old_entry.id;
    if old_entry.source_estimate_id is not null then
      update kiw_shop_estimates set money_status='review',money_note=note where id=old_entry.source_estimate_id;
    end if;
  elsif p_action='estimate' then
    select * into e from kiw_shop_estimates where id=(p_data->>'id')::uuid and org_id=p_org and job_id=p_job for update;
    if not found then raise exception 'Estimate not found'; end if;
    mode := p_data->>'mode';
    if mode not in ('added','included','excluded') or mode is null then raise exception 'Invalid estimate treatment'; end if;
    if e.money_status=mode then return jsonb_build_object('ok',true); end if;
    if e.money_status='added' then raise exception 'Void the linked contract entry before reclassifying this estimate'; end if;
    if mode='added' then
      if exists(select 1 from kiw_shop_money_entries where source_estimate_id=e.id) then raise exception 'This estimate was already posted. Record a reviewed correction instead.'; end if;
      insert into kiw_shop_money_entries(org_id,job_id,kind,amount,description,source_estimate_id,created_by)
      values(p_org,p_job,'contract',e.total_amount,e.estimate_number || ': ' || note,e.id,p_worker);
    end if;
    update kiw_shop_estimates set money_status=mode,money_note=note where id=e.id;
  else raise exception 'Unknown money action'; end if;
  insert into kiw_shop_audit(org_id,worker_id,action,entity,entity_id,detail)
  values(p_org,p_worker,'job_money_' || p_action,'job',p_job,p_data);
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.kiw_shop_money_change(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.kiw_shop_money_change(uuid,uuid,uuid,text,jsonb) to service_role;
-- Trigger functions are not public API endpoints.
revoke all on function public.kiw_money_recalculate(),public.kiw_money_entry_guard(),public.kiw_money_job_guard(),public.kiw_money_new_job(),public.kiw_estimate_money_guard() from public,anon,authenticated;
do $$ begin
  if exists(select 1 from money_before b join public.kiw_shop_jobs j using(id)
    where (b.contract_amount,b.deposit_amount) is distinct from (j.contract_amount,j.deposit_amount)) then
    raise exception 'Migration changed a recorded amount';
  end if;
end $$;
-- Archive only settled, completed jobs. Reopen automatically if a later
-- correction creates a balance; never reopen a manually archived record.
alter table public.kiw_shop_jobs add column auto_archived boolean not null default false;
create function public.kiw_money_auto_archive() returns trigger
language plpgsql as $$
begin
  if new.current_stage='Done' and new.contract_amount is not null and new.deposit_amount is not null
     and new.deposit_amount >= new.contract_amount
     and not exists(select 1 from public.kiw_shop_estimates where job_id=new.id and org_id=new.org_id and money_status='review') then
    if not new.archived then new.archived := true; new.auto_archived := true; end if;
  elsif new.auto_archived then
    new.archived := false; new.auto_archived := false;
  end if;
  return new;
end $$;
create trigger kiw_money_auto_archive before insert or update of current_stage,contract_amount,deposit_amount
  on public.kiw_shop_jobs for each row execute function public.kiw_money_auto_archive();
create function public.kiw_estimate_recheck_archive() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  update kiw_shop_jobs set current_stage=current_stage where id=new.job_id and org_id=new.org_id;
  return new;
end $$;
create trigger kiw_estimate_recheck_archive after insert or update on public.kiw_shop_estimates
  for each row execute function public.kiw_estimate_recheck_archive();
revoke all on function public.kiw_estimate_recheck_archive() from public,anon,authenticated;
revoke all on function public.kiw_money_auto_archive() from public,anon,authenticated;
-- Apply the user's rule to existing completed and fully paid jobs as well.
update public.kiw_shop_jobs set current_stage=current_stage where current_stage='Done' and not archived
  and contract_amount is not null and deposit_amount is not null and deposit_amount >= contract_amount;
notify pgrst, 'reload schema';
commit;
