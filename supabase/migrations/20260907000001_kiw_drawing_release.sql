-- Snapshot drawing review atomically; a concurrent edit cannot release different data.
create or replace function public.kiw_shop_release_measure_drawing(
  p_sheet_id uuid, p_worker_id uuid, p_org_id uuid,
  p_expected_updated_at timestamptz, p_allow_self boolean default false
) returns int language plpgsql security definer set search_path = public as $$
declare
  v_sheet public.kiw_shop_measure_sheets%rowtype;
  v_rev int;
begin
  select * into v_sheet from public.kiw_shop_measure_sheets
    where id=p_sheet_id and org_id=p_org_id for update;
  if not found then raise exception 'SHEET_NOT_FOUND'; end if;
  if p_expected_updated_at is null or v_sheet.updated_at is distinct from p_expected_updated_at then
    raise exception 'DRAWING_CHANGED';
  end if;
  v_rev := public.kiw_shop_approve_measure_sheet(p_sheet_id,p_worker_id,p_org_id,p_allow_self);
  update public.kiw_shop_measure_revisions
    set data=jsonb_set(data,'{drawingReleaseVersion}','1'::jsonb)
    where sheet_id=p_sheet_id and org_id=p_org_id and rev_no=v_rev;
  return v_rev;
end;
$$;
revoke all on function public.kiw_shop_release_measure_drawing(uuid,uuid,uuid,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.kiw_shop_release_measure_drawing(uuid,uuid,uuid,timestamptz,boolean) to service_role;
