# HANDOFF — kiw-clock-fixes (KIW shop app)

Owner, 11/19, after Kaio forgot to clock out Thu 11/5: fix the forgotten clock-out and make time-fix requests simple.
Owner update 11/19 7:40: **Giulia approves** time fixes. **Kayky and Daniel supervise** (they can act, but get no popup; they get a daily note instead).

## What was built

### 1. Forgotten clock-out → "Que horas você saiu?"
- If a worker opens the app or taps the clock while a shift from an **earlier shop day** is still open (open ≥ 8 h, so a 6 PM→1 AM night doesn't count), a popup asks:
  "Você não marcou a saída de quarta, 18/11. Que horas você saiu?" It has a time picker (default = the 5:00 PM work-hours end; allowed = that day, after the clock-in) and two buttons: **Salvar e marcar entrada agora** / **Salvar**.
- New action `shift_missed_out_fix`: ends the old shift at the answer (`status=submitted`, open breaks closed, running job time ended at that time), writes the audit row `shift_missed_out_fixed` with the answer, then applies the 7:30–5:00 window. If the answer is after 5 PM, it asks "did your team leader ask?" as before.
- "Salvar e marcar entrada agora" then clocks in through the normal punch path (location rule kept). A clock-in tap that was already queued keeps its original tap time.
- Server guard: `shift_start` never folds a new clock-in into an earlier-day open shift. It returns 409 `missedOut` (not final), so the phone keeps the tap and shows the popup.
- Same popup in "closed" mode for a recent shift that a next-morning tap closed at the wrong time (Kaio's 25.7 h case). It's skipped when a request is already pending for that shift, and for shifts the office approved.
- Clock-out is never refused, and the existing stale/still-clocked-in alerts are unchanged.

### 2. Correction requests, simple (approver = role `Office / admin`)
- **Rule:** anyone whose `kiw_shop_workers.role` is `Office / admin` approves time fixes (today that's Giulia). No DB change and no money access: `is_admin`/`can_see_prices` stay false, and her `lang` is left as stored (en). Owners (`canViewOwnerFinancials`) can also act. Nobody can approve their own request.
- **Giulia's popup** (`TimeFixPopup`) appears on open when anything is pending. It shows one card per request, newest first, e.g. `Kaio · qui 5/11` / `Saída: sem saída → 19:14` / `Entrada: 9:15 → 7:34`, with the reason in quotes and three big buttons: **Aprovar · Mudar · Recusar**.
  - **Mudar** opens two time fields prefilled with the request, then Salvar.
  - **Depois** closes the popup. It comes back on a later open, at most once an hour (localStorage, per worker).
- Approve writes the times to the **payroll shift only** (job time is never touched), sets the request `approved` with `reviewed_by`/`reviewed_at`, writes an audit row with before/asked/applied, and pins the window records. A very long result asks first (wrong date). Other pending requests for the same shift are closed as "Replaced by the approved request for this shift" (Tiago had 3 duplicates).
- **Badge** with the count: on the **Mais** tab plus a card at the top of Mais (Giulia), and on the **Pagamentos** tab (owners). Also an admin-menu entry "Correções de ponto".
- **New page `/shop/time-fixes`**: the same cards, plus **Ver histórico**, which shows reviewed requests read-only. The old confusing "correction requests" block in Team timesheets is replaced by a link card with the count.
- Kayky and Daniel get **no popup**. Instead, `runClockChecks` (the clock-check cron plus the opportunistic runs) sends **one note a day** (9 AM–8 PM shop time) when anything has waited more than 24 h: "KIW: 2 time fixes waiting for Giulia since Tue." It goes to the owners' work-hours contacts (Kayky pt, Daniel en) plus Telegram, deduped by the audit action `time_fix_waiting_summary`.

### 3. Worker side
- After sending: "**Enviado para a Giulia aprovar**" with a Pendente pill and the request.
- Each shift row shows a status pill (Pendente / Aprovado / Recusado · Ver); one tap opens the request. There's also a "Meus pedidos de correção" list in plain words ("Pendente — esperando a Giulia").
- The same fix sent twice is not a second request: the note is updated and nobody is texted again.

### 4. Notify
- A new request texts each `Office / admin` worker with a phone, in their language (Giulia → en), plus the existing Telegram copy, via `sendSmsGroup`. It sends at most one text per request (audit `time_correction_notify`, keyed on the request id). If nobody with the role has a phone, it falls back to the owners' work-hours contacts.

All new strings exist in en/pt/es and are shown in the worker's language (`src/lib/shop/time-fix.ts`, test checks the keys).

## Files
- `src/lib/shop/time-fix.ts`: rules, wording, en/pt/es strings (pure)
- `src/lib/shop/time-fix-db.ts`: list/count, submit + notify, review, forgotten fix, daily note
- `src/app/shop/MissedClockOut.tsx`, `TimeFixPopup.tsx`, `TimeFixCards.tsx`, `time/MyFixes.tsx`, `time-fixes/*`, `api/time-fixes/route.ts`
- Changed: `api/action/route.ts` (shift_start guard, `shift_missed_out_fix`, `time_correction_request`, `correction_review`), `ShopShell.tsx`, `layout.tsx`, `clock-state.ts`, `stale-alert.ts`, `punch-outbox.ts`, `time/*`, `admin/time/page.tsx`, `more/page.tsx`, `adminNav.ts`, `i18n.ts`

## Tests
- `npx vitest run`: 1618 pass. The 11 failures are `laser/client.test.ts` and `LaserControl.test.tsx`, which **fail identically on origin/main** (untouched).
  New: `src/lib/shop/time-fix.test.ts`, `src/lib/shop/time-fix-db.test.ts`, `src/app/shop/api/action/time-fix.test.ts`.
- `npx tsc --noEmit`: clean. `npm run lint`: no errors in changed files. The remaining errors are already on main (W9Form, NextMeasurement, marketing pages).
- `npm run build` (Turbopack, the Railway build): passes. Note: `npm run build -- --webpack` fails on main on `src/app/shop/jobs/page.tsx` (not this branch).
- Playwright 390 px, pt, against the TEST org with SMS dry-run and Telegram disabled: `e2e/clock-fixes.ui.test.mjs`. **Result: PASS.** All fixtures were removed afterwards and the TEST measurer's lang was restored to en.

## Screenshots (`docs/screens/kiw-clock-fixes/`)
01 approver popup · 02 Mudar · 03 badge after Depois · 04 list + history · 05 forgotten clock-out question · 06 invalid time · 07 saved + clocked in · 08 "Enviado para a Giulia aprovar" · 09 worker statuses.

## Deploy steps (director)
1. Review and merge `kiw-clock-fixes` into `main` in `danieldefmartins/kings-ironworks`, then push.
2. From the repo: `npm run deploy` (Railway service `kiw`, builds from GitHub HEAD). **No DB migration, no new env vars.**
3. Check: Giulia's row has `role = 'Office / admin'`, `active = true`, and a phone (all true today). Sign in as Giulia: the popup shows the 9 waiting requests.
4. The Railway cron `GET /shop/api/cron/clock-check` (CRON_SECRET) already runs `runClockChecks`, so the daily note starts the next day after 9 AM. **Heads-up:** on the first run it will report the old requests ("9 time fixes waiting for Giulia since 10/8") to Kayky and Daniel.
5. Texting the crew is up to you. Nothing was sent from this branch (all SMS were dry-run).

## Decisions / left open
- Approver = role check, not a new flag column (no migration). Giving someone else approval means setting their role to "Office / admin".
- Giulia's own correction requests don't appear in her list. They go to Kayky/Daniel (owners can act).
- Approve/Change set the shift to `submitted` (owner payroll approval stays separate, as before). A refuse doesn't text the worker; their app shows "Recusado — fale com a Giulia".
- The existing pending requests include one with an end before its start (the 9/28 request "Sai as 17:15" was saved as 5:15 AM). Approve refuses it with "A saída precisa ser depois da entrada"; Giulia uses **Mudar**.
