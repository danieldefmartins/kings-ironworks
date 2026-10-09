-- Customer files: images and approval notes the customer sent us (GoHighLevel
-- texts/emails, the info@ mailbox), imported for the crew to see what the job
-- is about. Imports land as 'pending' and only an owner (canViewOwnerFinancials)
-- can keep or reject them; the shop server filters everything that is not
-- 'approved' out of crew payloads. Existing photos stay 'approved'.

alter table public.kiw_shop_photos
  add column if not exists source text,
  add column if not exists source_ref text,
  add column if not exists review_status text not null default 'approved',
  add column if not exists source_note text,
  add column if not exists source_at timestamptz;

do $$ begin
  alter table public.kiw_shop_photos
    add constraint kiw_shop_photos_review_status_check
    check (review_status in ('pending', 'approved', 'rejected'));
exception when duplicate_object then null; end $$;

-- One import per source item per job. A plain (not partial) unique constraint
-- so PostgREST's on_conflict can target it; NULL source_ref rows (everything
-- uploaded in the app) never collide because NULLs are distinct.
do $$ begin
  alter table public.kiw_shop_photos
    add constraint kiw_shop_photos_source_ref_key unique (org_id, job_id, source_ref);
exception when duplicate_object or duplicate_table then null; end $$;

create index if not exists kiw_shop_photos_pending_idx
  on public.kiw_shop_photos (org_id, job_id) where review_status = 'pending';

create table if not exists public.kiw_shop_customer_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.kiw_shop_organizations(id),
  job_id uuid not null,
  source text not null,
  source_ref text not null,
  body text not null,
  author_direction text not null default 'inbound',
  message_at timestamptz,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (org_id, job_id, source_ref),
  foreign key (job_id, org_id) references public.kiw_shop_jobs(id, org_id) on delete cascade
);
alter table public.kiw_shop_customer_notes enable row level security;
revoke all on public.kiw_shop_customer_notes from anon, authenticated;
grant all on public.kiw_shop_customer_notes to service_role;

notify pgrst, 'reload schema';
