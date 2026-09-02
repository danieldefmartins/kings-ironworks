-- Fabrication queue, second pass.
--
-- 1. Fractional ordering. A drag drops a card between two neighbours, so the
--    new position is the midpoint of the two values it landed between. That is
--    one row written per move instead of renumbering the whole list, which is
--    what keeps a drop correct when two owners reorder at the same time and
--    what stops a single-value setter from leaving ties. An integer column
--    cannot hold a midpoint, so the column becomes numeric.
alter table public.kiw_shop_jobs
  alter column fabrication_order type numeric using fabrication_order::numeric;

-- 2. A deleted worker should not leave a dangling assignment. Composite key to
--    match the org-scoped foreign keys used everywhere else in this schema —
--    the queue column shipped as a bare uuid with no constraint at all.
alter table public.kiw_shop_jobs
  drop constraint if exists kiw_shop_jobs_assigned_worker_fk;
alter table public.kiw_shop_jobs
  add constraint kiw_shop_jobs_assigned_worker_fk
  foreign key (assigned_worker_id, org_id)
  references public.kiw_shop_workers(id, org_id)
  on delete set null;

create index if not exists kiw_shop_jobs_assigned_worker_idx
  on public.kiw_shop_jobs (org_id, assigned_worker_id);

-- Note on RLS: like every other kiw_shop_* table, kiw_shop_shift_locations has
-- row level security enabled with no policies. That is deliberate — the shop
-- app reaches Supabase only through the service role, and an anon or
-- authenticated key is meant to see nothing. It fails closed, so a future
-- client-side read will come back empty rather than erroring; add an explicit
-- policy at that point instead of wondering why the table looks empty.
