-- Labor budget per job, in hours, for the owner's job-cost view
-- ("% of labor budget used"). Nullable: most jobs have none yet, and the app
-- reads the column tolerantly so it renders before this migration is applied.
alter table public.kiw_shop_jobs
  add column if not exists labor_budget_hours numeric(10,2)
  check (labor_budget_hours is null or labor_budget_hours >= 0);

-- Forgotten-timer alerts look up their own dedupe rows by action + entity_id.
create index if not exists kiw_shop_audit_action_entity_idx
  on public.kiw_shop_audit(org_id, action, entity_id);

notify pgrst, 'reload schema';
