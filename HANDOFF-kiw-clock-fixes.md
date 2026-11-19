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

---

# Simplicity pass (11/19, owner: "make it easier for us and employees… simple and powerful")

Nothing was removed. Old screens moved behind **Detalhes**, **Todos os meus pontos**, or **Mais**. **Not deployed, nobody texted.** All SMS in the test run were dry-run, and the TEST org fixtures were removed afterwards.

## What changed

### Employees (Kaio, Andreaderson, Tiago…): home = one big button
- **Today, top of the screen:** a status line ("Você está trabalhando desde 7:31" / "Você não está trabalhando"), then one huge button: **Marcar entrada** (green) or **Marcar saída** (red) with "Trabalhando há 3h12". It is about 188 px tall and full width.
  - **Começar intervalo** is one 64 px tap. During a break the big button becomes **Voltar do intervalo**, and Marcar saída stays below it.
  - Two tiles show **Hoje** and **Esta semana** hours.
  - Two buttons: **Minha semana** and **Pedir correção**. **Detalhes** opens the old clock sheet.
- **Same punch path:** the button calls ShopShell's own punch code through `ClockContext`. That keeps the durable outbox, the location rule for clock-in, the forgotten clock-out question, and the "Enviando…" state. Nothing about punching was rewritten.
- **4:55 PM reminder:** the still-clocked-in text now goes out **5 min before** the work-day end instead of 30 min after. Pt wording: "KIW: Oi Kaio, já são quase 17:00. Antes de ir embora, toque aqui para marcar a saída: …/shop?saida=1".
  - The link opens Today scrolled to the button, focused, with an amber ring.
  - If the check runs after 5 PM, the text uses the old "seu ponto ainda está aberto" wording.
  - Still one text per shift (audit dedupe unchanged). From 4:55 the home also shows the banner "Já são quase 17:00…".
- **Pedir correção, 3 steps:**
  1. Pick the day: the last 7 days as chips, each showing that day's times.
  2. Pick what happened: Esqueci a entrada · Esqueci a saída · Horário errado.
  3. Pick the time: a big time picker, or two for "Horário errado". Then **Enviar**.
  - The chip text is saved as the reason, so Giulia reads "Esqueci a saída".
  - **A day with no clock record:** "Esqueci a entrada" asks for both times. The server (`time_fix_new_day`) saves the shift as **rejected**, so it is never paid, with a marker note, plus a pending request. Aprovar/Mudar turns it into a normal submitted shift; Recusar leaves it unpaid. Last 7 days only, no overlap with another record, not in the future, 16 h max. Giulia's card shows "Entrada: sem entrada → 7:30 / Saída: sem saída → 17:00".
- **Request status on the home screen:** each waiting request shows there ("Pendente — esperando a Giulia"), and the answer stays 3 days after it is reviewed. One tap opens the request.
- **Minha semana (`/shop/time`):** Esta semana / Semana passada, the week total, then one row per day (times + hours, "em revisão" when held). No tables. The full old timesheet is under **Todos os meus pontos**.

### Office: one "Ponto" screen (`/shop/ponto`), for Giulia, Kayky and Daniel
In order:
1. **Saídas não marcadas** at the top. These are shifts still open from an earlier day, still open 30 min past 5 PM, or closed after more than 16 h in the last 7 days and not confirmed. Each card has two buttons:
   - **Perguntar ao funcionário:** one text in the worker's language with the ?saida=1 link. Saved as audit `shift_ask_worker`; it can't be sent again within the hour, and the card shows "Perguntado às 8:19".
   - **Corrigir:** a clock-out time picker (defaults to 17:00). Uses `shift_force_stop` for an open shift or `shift_edit` for a too-long one, so the existing window rule and long-shift confirmation still apply.
2. **Trabalhando agora:** names, "desde 7:31", break dot, running time.
3. **Horas de hoje** for each person.
4. **Pedidos esperando:** the same Aprovar · Mudar · Recusar cards.
5. *(owners only)* The existing "Extra time to check" card.
6. **Resumo da semana** (Esta semana / Semana passada): a card per person with day-by-day hours, then **Aprovar semana**.
   - It approves only closed, submitted shifts. It holds back, and lists, any shift that is still open, a forgotten clock-out (over 16 h), one with a pending request, or one with an unanswered or unchecked 7:30–17:00 extra-time question.
   - Times are never changed; the window rounding already applied is what gets approved. Payroll clock only, job time untouched.
   - Every update only applies if the shift is still submitted, and an audit `week_approve` row lists what was approved and what was held.
   - **Giulia sees hours only.** Dollars appear only for owners.
7. **Mais:** All time fixes + history. Owners also get Team timesheets, Payroll and Location history.
- **How to get there:**
  - A **Ponto** tile on Today, for Giulia and the owners.
  - A Ponto card at the top of Mais, for Giulia.
  - An admin menu entry, for owners.
- The screen refreshes every 60 s.

### Permissions changed (please confirm)
- `shift_force_stop` and `shift_edit` were owner-only. The **office admin** can now use them too, so Giulia can use "Corrigir". She can never use them on her own shift, and the owner path is unchanged.
- `week_approve` and `shift_ask_worker` are new. They are allowed for the office admin and owners only, and never on your own week or clock.

## Files
- **New:**
  - `src/lib/shop/ponto.ts` (pure rules + en/pt/es strings) and `ponto-db.ts` (screen data, approve week, ask worker)
  - `src/app/shop/ClockContext.tsx`, `ClockHome.tsx`, `FixRequest.tsx`, `HomeRequests.tsx`
  - `src/app/shop/ponto/{page,PontoClient}.tsx`
  - `e2e/clock-simple.ui.test.mjs`
- **Changed:**
  - `ShopShell.tsx` (provides the clock), `page.tsx` (employee home + Ponto tile), `time/page.tsx` (week list)
  - `api/action/route.ts` (3 new actions, 2 permission changes)
  - `stale-alert.ts` (4:55 reminder), `clock-state.ts` (today's hours)
  - `time-fix(.ts|-db.ts)` (new-day requests)
  - `adminNav.ts`, `more/page.tsx`, `i18n.ts`, `admin/time/page.tsx` (`#locations` anchor)
- **Tests:**
  - New: `ponto.test.ts`, `ponto-db.test.ts`, `api/action/ponto.test.ts`, `ClockHome.test.tsx`, `FixRequest.test.tsx`
  - Updated: `stale-alert.test.ts`, `page.access.test.tsx`

## Checks
- `npx vitest run`: **1650 pass, 11 fail**. All 11 are `laser/client.test.ts` + `LaserControl.test.tsx`, the same failures as on main and before this pass.
- `npx tsc --noEmit`: clean.
- eslint on every changed file: clean. The repo-wide errors are the same old ones (W9Form, NextMeasurement…).
- `npm run build`: passes.
- **Playwright** at 390 px, pt, TEST org, SMS dry-run, Telegram off: `e2e/clock-simple.ui.test.mjs` → **PASS** (employee home, ?saida=1 link, 3-step request, home status, Minha semana, office Ponto: ask / fix / approve week).
  - To rerun: `SHOP_ORG_ID=b0000000-0000-4000-8000-000000000002 SMS_DRY_RUN=1 GHL_PIT_TOKEN= TELEGRAM_BOT_TOKEN= npx next start -p 3471`, then `PLAYWRIGHT_PACKAGE=<any package.json with playwright> node e2e/clock-simple.ui.test.mjs`.
  - Fixtures used: the TEST measurer in pt with Mon and Tue closed and today open since 7:31; TEST lockout with yesterday open; a temporary "Office / admin" worker `…00a1` (pin 9011, pt). All were removed afterwards and the language settings were restored.
- `~/Projects/360-crm-orchestration/bin/mini-gate.sh` was **not run**: it is the 360 CRM release gate and cannot gate this kings-ironworks branch. The checks above are this repo's gate.

## Screenshots: `docs/screens/kiw-clock-fixes/simplicity/`
- **Before** (build 745681e, same fixtures): before-01 employee Today · 02 clock sheet · 03 /shop/time · 04 old request form · 05 Giulia's Mais · 06 owner Today · 07 Team timesheets · 08 Payroll.
- **After:** 01 home working · 02 reminder link lands on Marcar saída · 03–05 request steps 1–3 · 06 sent · 07 status on home · 08 Minha semana · 09 Ponto top · 10 asked · 11 Corrigir · 12 week · 13 week approved · 14 Ponto full · 15 owner Today · 16 owner Ponto (en, $) · 17 time fixes.

## Capability checklist: everything the old screens had, and where it is now
Taps are counted from the new home (Today) or the Ponto screen.

| Old capability | Where now | Taps |
|---|---|---|
| **Employee clock sheet** (tab clock button): Marcar entrada/saída, start/end break | Big button + break button on Today; the tab button still opens the same sheet | 1 |
| Clock sheet: paid hours, gross $, week-to-date hours + $, rate, long-shift / review warnings, location badge, location note, "punch not confirmed", errors | Same sheet, unchanged: Today › **Detalhes**, or the tab clock button | 1 |
| Punch queue banner, "sent ✓ 6:45 PM" toast, sign-in again, location help / allow card, forgotten clock-out popup, "did the team leader ask?" question | Unchanged (ShopShell) | 0 |
| Today: favorites **My hours** · Inventory · All tools | My hours → **Minha semana** on the clock card; Inventory + All tools tiles stay | 1 |
| Today: in fabrication / due 7 days / overdue counts, current job card, "choose a job", assigned to you, on the floor, deadlines, PIN + profile banners | Unchanged, below the clock card | 0 |
| **/shop/time:** every shift with in/out, hours, status, "needs review" note | Minha semana › **Todos os meus pontos** (also More › My timesheet) | 2 |
| /shop/time: map pins (start / end) per shift | Same list | 2 |
| /shop/time: per-shift "Pedir correção" with both times + free-text note | Same list (kept as the detailed option); the 3-step flow is on Today | 2 (3-step: 1) |
| /shop/time: status pill per shift + open the request; "Meus pedidos" list; "Enviado para a Giulia" sheet | Same list; waiting/answered requests are also on Today; the sent sheet is reused after Enviar | 1–2 |
| **Giulia:** popup on open with Aprovar · Mudar · Recusar, Depois snooze | Unchanged | 0 |
| Giulia: badge on Mais, "Correções de ponto" card on Mais, `/shop/time-fixes` list, **Ver histórico** | Unchanged; the same cards are also on Ponto; Ponto › Mais › All time fixes + history | 1–2 |
| **Owners Today:** Project Money; crew on the clock (location verified/outside, map pin, job, break, needs review, runaway warning), **Clock out worker** with date/time, "Review timesheets" link | Unchanged on Today (+ Ponto tile) | 0 |
| **Team timesheets** (`/shop/admin/time`): extra-time checks (keep / use edge), **CSV export**, edit times, approve / reject each shift, open-clock link, time-fixes card, **location history** | Unchanged. Ponto › Mais › Team timesheets / Location history; admin menu | 2 |
| **Payroll:** week picker, this week, refresh, totals, how totals are calculated, review / missing-rate alerts, rates link, per-worker daily details with punch places | Unchanged. Payroll tab (owners); Ponto › Mais › Payroll | 1–2 |
| Admin hub / menu: every destination | Unchanged + new "Ponto" entry | — |
| Texts: still-clocked-in (worker), stale shift (Telegram), new request (Giulia), daily waiting note (Kayky/Daniel) | Still-in moved to 4:55 PM with the ?saida=1 link (late wording kept); the others are unchanged | — |

## Left open / decisions
- Today shows one request status card per request, at most 4. The full list is in Minha semana.
- On a day with two clock records, the 3-step flow fixes the open one, or else the latest one. The other record is fixed from "Todos os meus pontos".
- Approving a week does not touch money settings. Owners still see dollars only on Payroll and in the owner view of Ponto.
- The 4:55 text goes out within about 10 min of 4:55: the checks run on the worker poll, throttled to every 10 min, plus the cron.
