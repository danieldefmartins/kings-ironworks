-- Company finance: every bank transaction from the KIW business accounts,
-- tagged as revenue, business expense, owner draw, or internal transfer.
-- Owners teach the system with rules ("everything from this merchant is X"),
-- so each merchant only has to be classified once.
begin;

create table public.kiw_fin_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  account text not null check (account ~ '^[0-9]{4}$'),
  posted_on date not null,
  description text not null check (length(trim(description)) > 0),
  amount numeric(12,2) not null,
  bank_type text,
  balance numeric(12,2),
  check_no text,
  -- account|date|description|amount|n  (n = occurrence number on that day, so two
  -- identical coffees on one day are two rows, but re-importing a file adds nothing)
  fingerprint text not null,
  vendor text not null,
  category text not null,
  grp text not null check (grp in ('revenue', 'expense', 'owner', 'transfer', 'review')),
  owner text check (owner in ('kiw', 'daniel', 'reginaldo')),
  tag_source text not null default 'auto' check (tag_source in ('auto', 'rule', 'manual')),
  rule_id uuid,
  note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  imported_at timestamptz not null default now(),
  constraint kiw_fin_owner_matches_group check (
    (grp = 'owner' and owner in ('daniel', 'reginaldo'))
    or (grp = 'expense' and owner = 'kiw')
    or (grp in ('revenue', 'transfer', 'review') and owner is null)
  ),
  foreign key (reviewed_by, org_id) references public.kiw_shop_workers(id, org_id)
);
create unique index kiw_fin_tx_fingerprint_uidx on public.kiw_fin_transactions(org_id, fingerprint);
create index kiw_fin_tx_date_idx on public.kiw_fin_transactions(org_id, posted_on desc);
create index kiw_fin_tx_grp_idx on public.kiw_fin_transactions(org_id, grp);

create table public.kiw_fin_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  pattern text not null check (length(trim(pattern)) >= 3),
  direction text not null default 'out' check (direction in ('in', 'out')),
  category text not null,
  grp text not null check (grp in ('revenue', 'expense', 'owner', 'transfer')),
  owner text check (owner in ('kiw', 'daniel', 'reginaldo')),
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  foreign key (created_by, org_id) references public.kiw_shop_workers(id, org_id)
);
create unique index kiw_fin_rules_pattern_uidx on public.kiw_fin_rules(org_id, pattern, direction) where active;
alter table public.kiw_fin_transactions add foreign key (rule_id) references public.kiw_fin_rules(id) on delete set null;

-- Latest known balance per account, taken from the newest row of each import.
create table public.kiw_fin_accounts (
  org_id uuid not null,
  account text not null check (account ~ '^[0-9]{4}$'),
  name text not null,
  balance numeric(12,2),
  balance_on date,
  updated_at timestamptz not null default now(),
  primary key (org_id, account)
);

alter table public.kiw_fin_transactions enable row level security;
alter table public.kiw_fin_rules enable row level security;
alter table public.kiw_fin_accounts enable row level security;
revoke all on public.kiw_fin_transactions, public.kiw_fin_rules, public.kiw_fin_accounts from public, anon, authenticated;
grant select, insert, update on public.kiw_fin_transactions, public.kiw_fin_rules, public.kiw_fin_accounts to service_role;

insert into public.kiw_fin_accounts(org_id, account, name) values
  ('a0000000-0000-4000-8000-000000000001', '1752', 'King Iron Works LLC'),
  ('a0000000-0000-4000-8000-000000000001', '3971', 'King Iron Group Inc')
on conflict do nothing;

notify pgrst, 'reload schema';
commit;
