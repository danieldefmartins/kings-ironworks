# KIW Shop Floor — Tablet Job Traveler (`/shop`)

A password-protected, tablet-optimized shop-floor app inside the website. When a
deal is closed it becomes a digital **job traveler** the fabricators work off of:
cut list, material pull, stage tracking, and QC / precision sign-off — replacing
paper that gets lost or misread.

## Routes
- `/shop/login` — per-worker login (tap your name → 4-digit PIN)
- `/shop` — job board (active jobs, stage + cut progress)
- `/shop/job/[id]` — the traveler (stage tracker, cut list, material pull, QC sign-off)

The marketing nav/footer/chat are hidden on `/shop` (see `ChromeGate.tsx`).

## Required environment variables
Set these in **Railway** (and `.env.local` for local dev):

| Var | Value |
|-----|-------|
| `SUPABASE_URL` | `https://scasgwrikoqdwlwlwcff.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → **service_role** (secret). Server-only; never `NEXT_PUBLIC_`. |
| `SHOP_SESSION_SECRET` | Any long random string (a fresh one is already in `.env.local`). |

The tables live in the existing Supabase project under the `kiw_shop_*` prefix,
with **RLS on and no policies** — so they're reachable only with the service-role
key from the server. No shop data is exposed to the browser or to Tavvy's anon key.

## Data model (`kiw_shop_*`)
- `workers` (name, role, pin, active)
- `jobs` (job_number, customer, address, finish, due_date, current_stage, scope…)
- `cut_items` (profile, description, qty, length, cut_tag, status: pending→cut→welded)
- `materials` (description, qty, pulled)
- `qc_checks` (label, expected, measured, passed, checked_by, checked_at)
- `stage_log` (job_id, stage, worker_id, entered_at) — audit trail of stage moves
- `photos` (reserved for QC photo proof — next phase)
- `measure_sheets` (field-measure sheets: shape, status, JSONB `data` with per-step
  rise/run/nosing, posts + mounts, angles, platform slope, rail + materials specs).
  UI at `/shop/job/[id]/measure` — pick a shape + step count, a sketch is generated
  with blank boxes, crew fills it on the tablet; photo markup saves annotated site
  photos to `photos` under the Measurements category; prints as a branded sheet.

## Seeded logins (rename later)
| Worker | Role | PIN |
|--------|------|-----|
| Daniel Martins | Owner | 1234 |
| Shop Lead | Lead Fabricator | 1111 |
| Welder 1 | Welder | 2222 |

Update via SQL, e.g.:
```sql
update kiw_shop_workers set name='Real Name', pin='4821' where name='Welder 1';
insert into kiw_shop_workers (name, role, pin) values ('New Guy','Fabricator','5566');
```

## Adding a job (until the Telegram `closed <name>` hook is wired)
```sql
insert into kiw_shop_jobs (job_number, customer_name, address, finish, est_number, scope, current_stage, due_date)
values ('KIW-1044','Customer Name','Address','DTM Paint','EST-…','Scope…','Awarded','2026-08-01');
-- then add kiw_shop_cut_items / kiw_shop_materials / kiw_shop_qc_checks rows for that job_id
```

## Next phase ideas
- Wire the Telegram `closed <name>` command to auto-create the job + cut list here.
- QC photo capture (upload to a Supabase Storage bucket, save to `photos`).
- Print a cut-tag sheet (one tag per `cut_item`).
- Worker management screen (add/rename/PIN) instead of SQL.

## Field Measure — shop tolerance policy

The geometry cross-checks grade disagreement between redundant measurements
against these tolerances (`src/lib/shop/measure-checks.ts`, `TOLERANCES`).
They are **shop policy owned by Daniel** — change them there, in one place:

| Check | Green (OK) | Yellow (VERIFY) |
|---|---|---|
| Sum of risers vs floor-to-floor (and per-flight rise) | ±1/4" | ±3/4" |
| Sum of runs vs total run (and per-flight run) | ±3/8" | ±1" |
| Diagonal vs measured rake (and landing diagonal, ramp slope) | ±1/2" | ±1 1/2" |
| Calculated vs measured angle | ±1° | ±2.5° |
| Width variation bottom→top | ±3/8" | ±1" |
| Custom drawn-plan closure | ≤1% of perimeter | ≤3% |

Beyond yellow = red = INCONSISTENT: the sheet cannot be submitted. Yellow
requires explicit reviewer acknowledgment at approval. The app never edits a
field value — it only flags disagreement.

Approval is atomic (`kiw_shop_approve_measure_sheet` Postgres function,
`supabase/migrations/`), admin-only, and the person who submitted a sheet can
never approve it. Approval snapshots an immutable revision viewable at
`/shop/job/<job>/measure/<sheet>/rev/<n>` — the printout's QR points there.
