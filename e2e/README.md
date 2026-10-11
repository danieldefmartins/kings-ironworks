# Measure end-to-end tests

Use a local production build and the dedicated **TEST** organization. These
suites create/edit/delete test sheets and upload/delete checklist photos. Never
point them at the real KIW organization. The test workers/job must already exist
(`supabase/seed-test-org.sql` documents the fixture).

```sh
# Terminal 1. --webpack supports worktrees with node_modules symlinked outside
# the worktree; Turbopack rejects that symlink unless its filesystem root is set.
npm run build -- --webpack
SHOP_ORG_ID=b0000000-0000-4000-8000-000000000002 npx next start -p 3471

# Terminal 2. Browser tooling may be installed outside the app dependency tree.
# Example one-time setup in a scratch directory:
# npm install --prefix /tmp/kiw-playwright playwright
# /tmp/kiw-playwright/node_modules/.bin/playwright install chromium
export PLAYWRIGHT_PACKAGE=/tmp/kiw-playwright/package.json
export SHOP_BASE_URL=http://localhost:3471
export MEASURE_AUDIT_DIR=/tmp/kiw-measure-shots
export PRESS_OUT_DIR=/tmp/kiw-measure-shots/
mkdir -p "$MEASURE_AUDIT_DIR"
node e2e/run-measure.mjs
```

`PLAYWRIGHT_PACKAGE` is the absolute path to the package.json beside an existing
Playwright installation. Omit it if Playwright resolves from this repository.
The runner supplies only TEST worker/job IDs and PINs, executes suites
sequentially, and exits nonzero on any failure. A local server with the wrong
organization rejects these TEST logins.

Run a subset with filename fragments:

```sh
node e2e/run-measure.mjs api
node e2e/run-measure.mjs ui offline press
node e2e/measure.help.test.mjs # static; no server/browser/login required
npx vitest run src/lib/shop/measure-i18n.test.ts
```

The full sweep can take several minutes because it visits every Tool option,
Materials and review screen, language and theme against real API reads. Do not edit/rebuild
the app or change the test admin's language while browser suites run. The audit
changes that worker's language and restores English in its `finally` cleanup.

| Suite | Coverage |
| --- | --- |
| `measure.api` | Authentication, validation, compare-and-swap conflicts, photos, independent approval and revision lifecycle, mixed stair geometry |
| `measure.help` | All extracted field components, help wiring, missing help keys and three-language explanations; fails if extraction finds zero fields |
| `measure.ui` | NextMeasurement and detailed-field autosave, reload, stale-writer conflict, filled-stair SSR hydration with a different browser locale/time zone |
| `measure.offline` | Offline banner and local-save status, durable IndexedDB payload, reconnect flush and persistence |
| `measure.points.ui` | Two drawn runs, line-point placement, post types and persistence |
| `measure.press` | Phone touch input: fullscreen, step selection, post placement/removal; uses the current focus-mode controls |
| `measure.shapes` | Picker, persistent canvas and NextMeasurement across stair presets and non-stair shapes |
| `measure.audit` | All 21 shipped shapes (including opening, structural, canopy, wall_cap and shop_piece), EN/PT-BR/ES, light/dark, 390×844 touch phone and 1024×1366 tablet screenshots, all Tool options, 3D layer names, Materials and review; named buttons and 44px button targets |
| `measure.expanded` | Populated survey dialogs, timestamp hydration across time zones, delivery switches, shot camera/markup, laser panel and translated shop-piece presets in EN/PT/ES and both themes |
| `measure.deck`, `fire`, `skirt`, `trio`, `well` | Shape-specific API contracts and dimensional checks |

`MEASURE_AUDIT_SCREENSHOTS=0` reruns the assertions and JSON audit without repeating PNG capture. The audit records its created TEST sheet IDs in `audit-created.json` for recovery after an interrupted process.
For a focused regression after a complete sweep, set `MEASURE_AUDIT_SHAPES=opening,structural` and use a separate audit directory to preserve the full-run evidence. Omit this variable for all 21 shapes.

Audit PNGs are viewport screenshots (not full-page). `audit.json` records screen
text and findings for review. Screenshots require visual inspection; the suite
does not claim automated WCAG contrast certification or exhaustive coverage of
every conditional form state. Model-space drawing hit areas should also be
checked manually at different zoom levels.

The old press suite expected the pre-focus-mode SVG long-press menu. That SVG is
not mounted in the current editor; the suite now tests the supported touch
workflow. Legacy sketch interactions retain component-test coverage.

## Tenant isolation

`tenant-isolation.test.mjs` is a separate two-organization integration suite,
not part of the single-TEST-org runner. It requires **two disposable test
organizations**, each with its own seeded worker/job, and two local servers.
Supply `ORG_A_BASE`, `ORG_B_BASE`, `A_WORKER`, `A_PIN`, `A_JOB`, `B_WORKER`,
`B_PIN`, `B_JOB`, `B_LOCK_WORKER`, and `B_LOCK_PIN`. Never use real KIW as org A.
It cannot be verified with just one TEST organization; do not fake a pass by
running both endpoints against the same tenant.
