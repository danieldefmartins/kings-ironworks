-- Cash paid or received by hand never appears in a bank file; owners record it directly.
begin;
alter table public.kiw_fin_transactions drop constraint kiw_fin_transactions_account_check;
alter table public.kiw_fin_transactions add constraint kiw_fin_transactions_account_check check (account ~ '^([0-9]{4}|cash)$');
alter table public.kiw_fin_transactions add column created_by uuid;
alter table public.kiw_fin_transactions add foreign key (created_by, org_id) references public.kiw_shop_workers(id, org_id);
notify pgrst, 'reload schema';
commit;
