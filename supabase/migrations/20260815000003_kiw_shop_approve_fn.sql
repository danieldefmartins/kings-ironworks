-- Atomic approval: lock the sheet row, supersede old revisions, snapshot the
-- new one, and mark the sheet approved — one transaction, no partial states.
-- Also enforces independent review: the measurer cannot approve their own
-- submission (SELF_APPROVAL).
create or replace function public.kiw_shop_approve_measure_sheet(
  p_sheet_id uuid,
  p_worker_id uuid
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
     for update;
  if not found then
    raise exception 'SHEET_NOT_FOUND';
  end if;
  if v_sheet.status <> 'submitted' then
    raise exception 'NOT_SUBMITTED';
  end if;
  if v_sheet.submitted_by is not null and v_sheet.submitted_by = p_worker_id then
    raise exception 'SELF_APPROVAL';
  end if;

  v_rev := coalesce(v_sheet.current_rev, 0) + 1;

  update public.kiw_shop_measure_revisions
     set superseded = true
   where sheet_id = p_sheet_id
     and superseded = false;

  insert into public.kiw_shop_measure_revisions
    (sheet_id, rev_no, name, shape, data, approved_by, approved_at)
  values
    (p_sheet_id, v_rev, v_sheet.name, v_sheet.shape, v_sheet.data, p_worker_id, now());

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

revoke all on function public.kiw_shop_approve_measure_sheet(uuid, uuid) from public;
revoke all on function public.kiw_shop_approve_measure_sheet(uuid, uuid) from anon;
revoke all on function public.kiw_shop_approve_measure_sheet(uuid, uuid) from authenticated;
grant execute on function public.kiw_shop_approve_measure_sheet(uuid, uuid) to service_role;
