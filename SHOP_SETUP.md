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

## Working without signal

Field measuring happens in basement stairwells, steel buildings and rural
driveways. Every edit is written to IndexedDB (`src/lib/shop/outbox.ts`)
*before* it is sent, and only cleared once the server has taken it.

What the measurer sees:

- An amber bar across the top when the tablet has no signal.
- "Saved on this device" instead of "Save failed" — because the work is not
  lost, it is queued.
- Anything queued is restored automatically on the next load of that sheet,
  with a banner saying so.

The queue flushes itself when the tablet comes back online, when the measurer
returns to the tab, and on a 20-second backstop. Submit is disabled while
anything is still queued, so a sheet can never be submitted from data the
server has not got.

**Sign-out clears the queue.** A shop tablet is shared; one worker's unsent
measurements must not follow them into the next worker's session. If anything
is still queued, sign-out asks for confirmation first.

Note what this does *not* do: the sheet page itself is server-rendered, so
loading a sheet you have never opened on that tablet still needs a connection.
Caching authenticated pages for offline load was deliberately not done — on a
shared tablet it would leave one worker's job data readable by the next.

## Deploying

```bash
npm run deploy          # deploys HEAD (must already be pushed)
npm run deploy <sha>    # deploys a specific commit
```

Railway builds from the GitHub repo `danieldefmartins/kings-ironworks`, so the
commit has to be pushed first — the script refuses otherwise. `railway up`
does not work here; `public/` is ~1.6 GB and exceeds the upload limit.

Authentication, in order of preference:

1. **`RAILWAY_TOKEN`** — a project token from the Railway dashboard
   (Project → Settings → Tokens). These do not expire. Recommended: the CLI
   login token dies after roughly three days and has interrupted every deploy
   session so far.
2. `~/.railway/config.json` — whatever `railway login` last wrote. Works, but
   expect to re-run `railway login` regularly.

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

## Customer files (photos + approvals from GoHighLevel and email)

Each job shows the crew what the customer sent and what they approved, in a
**Customer & approved design** section at the top of the traveler. Imports
always land **pending**; only Daniel and Kayky (`canViewOwnerFinancials`) see
the **Review customer files** card on the job page and choose **Keep** (file
under Customer Photos / Design / Inspiration / Existing) or **Reject**. The
server drops pending and rejected items from every crew payload.

Price rules: outbound messages (our estimates) are never imported, PDFs are
never imported, and every customer note is stored with money replaced by
`[price removed]` (`src/lib/shop/customer-files.ts`, `redactMoney`) — and
re-redacted when sent to the crew.

Schema: `supabase/migrations/20261009000001_kiw_customer_files.sql` (adds
`source`, `source_ref`, `review_status`, `source_note`, `source_at` to
`kiw_shop_photos`; creates `kiw_shop_customer_notes`). Until it is applied the
app keeps working and imports report an error.

### GoHighLevel
- Railway var `GHL_PIT_TOKEN` (KIW location private integration token).
- Job page → **Pull from GHL** imports that job; Admin → **Import customer
  files for all active jobs** runs every active job. Contacts are matched only
  on exact phone digits or email — never names. Inbound image attachments and
  inbound approval texts ("approved", "go with option B", "pode fazer"…).

### Email (info@kingsironworks.com, via the Mac mini)
GHL does not sync the info@ mailbox. The Mac mini runs Apple Mail with that
account, so a launchd job there reads the local mail store every 30 minutes:

- Script: `scripts/mail-import/import-mail.mjs` (+ `emlx.mjs`; shares the rules
  in `src/lib/shop/customer-files.ts`). Installed to
  `~/Agents-Operation/kiw-mail-import/` on the mini by
  `bash scripts/mail-import/install-mini.sh` (run on the laptop; it copies the
  files and loads `com.kiw.mail-import` **on the mini only**).
- Reads `[Gmail].mbox/All Mail.mbox` of the KIW account
  (`~/Library/Mail/V10/989E6E2D-…`). For each active job with an email:
  inbound messages (not from @kingsironworks.com) where that address is the
  sender or on To/Cc. Image attachments (signature logos and images repeated
  across 3+ messages skipped; HEIC converted to JPEG with `sips`) and approval
  text become pending items. Dedupe: photos by content hash
  (`source_ref = email:sha1:…`), notes by Message-ID.
- Credentials: `--env ~/Projects/tavvy-review-agent/.env` (SUPABASE_URL +
  SUPABASE_SERVICE_ROLE_KEY on the mini). Never commit it.
- State: `~/Agents-Operation/kiw-mail-import/state.json` (header index +
  processed message IDs per job). Logs: `…/logs/import.{out,err}.log`. Each run
  writes a `customer_import_email` audit row; the review card shows
  "Email last checked".
- **One-time on the mini:** System Settings → Privacy & Security → Full Disk
  Access → **+** → ⌘⇧G `/opt/homebrew/Cellar/node/26.0.0/bin/node` → enable.
  launchd jobs cannot read `~/Library/Mail` without it (the script exits with
  "grant Full Disk Access" in `import.err.log`). Re-add after a Node upgrade
  changes that path.
- Manual run / test: `node scripts/mail-import/import-mail.mjs --env
  ~/Projects/tavvy-review-agent/.env --dry-run` (prints what it would import,
  writes nothing).
