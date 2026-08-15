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

# terminal 2
export SHOP_BASE_URL=http://localhost:3457
export SHOP_WORKER_ID=<uuid of an ADMIN worker>       # approves
export SHOP_PIN=<that worker's PIN>
export SHOP_WORKER2_ID=<uuid of a NON-admin worker>   # measures + submits
export SHOP_PIN2=<that worker's PIN>
export SHOP_JOB_ID=<uuid of any active kiw_shop_jobs row>

node e2e/measure.api.test.mjs

# UI test needs Playwright + a Chromium build (not in package.json on purpose)
npm i --no-save playwright && npx playwright install chromium-headless-shell
node e2e/measure.ui.test.mjs
```

Both exit non-zero on failure. Screenshots from the UI test land next to the
script.
