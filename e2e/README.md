# Shop e2e tests

Smoke tests for the Field Measure module. They run against a real server
(local build or a staging deploy) with a real worker login and job, and they
clean up the sheets they create.

- `measure.api.test.mjs` — API contract: auth, payload validation (Zod),
  row verification, wrong-job 404s, and updated_at compare-and-swap (409 on
  stale base). Plain `node`, no dependencies.
- `measure.ui.test.mjs` — browser flow with Playwright: autosave reaches
  "All changes saved", values persist across reload, and the conflict banner
  appears when another writer bumps the sheet.

## Running

```bash
# terminal 1 — a production build of the site
npm run build && npm run start -- -p 3457

# terminal 1 (recommended): run against the dedicated TEST organization so no
# real customer data is ever touched (seed once with supabase/seed-test-org.sql)
SHOP_ORG_ID=b0000000-0000-4000-8000-000000000002 npm run start -- -p 3458

# terminal 2
export SHOP_BASE_URL=http://localhost:3458
export SHOP_WORKER_ID=b1000000-0000-4000-8000-000000000001   # Test Admin (approves)
export SHOP_PIN=9001
export SHOP_WORKER2_ID=b1000000-0000-4000-8000-000000000002  # Test Measurer (submits)
export SHOP_PIN2=9002
export SHOP_JOB_ID=b2000000-0000-4000-8000-000000000001      # E2E Test Job

node e2e/measure.api.test.mjs

# UI test needs Playwright + a Chromium build (not in package.json on purpose)
npm i --no-save playwright && npx playwright install chromium-headless-shell
node e2e/measure.ui.test.mjs
```

Both exit non-zero on failure. Screenshots from the UI test land next to the
script.

- `measure.offline.test.mjs` — signal loss. Types with the browser offline and
  proves the edit is durable in IndexedDB, that the editor says "saved on this
  device" rather than "failed", that the queue drains itself when the network
  returns, and that the value reaches the server. Needs Playwright.
- `measure.well.test.mjs`, `measure.fire.test.mjs`, `measure.trio.test.mjs` —
  the non-stair shapes. Plain `node`, no dependencies.
- `measure.press.test.mjs` — tap and long-press on the sketch, driven with a
  real touch pointer. Needs Playwright.

## Tenant isolation

`tenant-isolation.test.mjs` proves cross-organization isolation. Run two app
instances (org A default on 3457, org B with `SHOP_ORG_ID=<test org>` on 3458)
and pass `A_*`/`B_*` env vars — it verifies logins, jobs, sheets, photos,
approvals and revision URLs cannot cross organizations, and that 5 failed
PINs produce a temporary lockout (`B_LOCK_WORKER`/`B_LOCK_PIN` use the
dedicated "Test Lockout" worker so reruns never lock a needed account).
