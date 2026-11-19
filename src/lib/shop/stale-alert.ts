// Missed clock-outs get caught the same evening, not at payroll time.
//
// A shift that has been open longer than STALE_SHIFT_HOURS is almost always a
// clock-out that never reached the server. Left alone it silently becomes a
// 24-hour day that gets approved in a batch (Kaio 9/9, 9/23, 9/24).
//
// These checks used to run only on crew API traffic — and on a Saturday there
// is none: André clocked in 7:35 AM on 10/10, his clock-out never arrived, and
// the alert fired Sunday 8:34 AM at 25 hours. So they now run from three
// places, all deduplicated through the immutable audit trail so a restart or
// overlapping callers cannot re-alert:
//   • GET /shop/api/cron/clock-check (Railway cron, CRON_SECRET) — the clock;
//   • the shop-drawings worker poll (every ~15s, day and night) — a backstop
//     that works before any cron is configured;
//   • crew API traffic, as before.
//
// Two rules:
//   1. still clocked in REMINDER_BEFORE_MIN before the work-hours end (4:55 PM
//      for a 5 PM end, owner 11/19) → one text to the worker, in their
//      language, whose link opens the app on the "Marcar saída" button
//      (?saida=1) (+ Telegram). Was 30 min AFTER the end (5:30 PM);
//   2. open longer than STALE_SHIFT_HOURS → Telegram to the office.

import { ORG_ID, audit, getOrgSettings, sbSelect } from "./db";
import { sendTelegram, tgEscape } from "./notify";
import { fmtDateTime, fmtTime, type TimeShift } from "./shared";
import { STALE_SHIFT_HOURS } from "./punch";
import { sendSms, smsLang, type SmsLang } from "./sms";
import { recordFromAudit, resolveWorkHours, toE164, windowFor } from "./work-hours";
import { alertWaitingFixes } from "./time-fix-db";
import { clockOutLink } from "./ponto";

const THROTTLE_MS = 10 * 60 * 1000;
/** Minutes BEFORE the work-hours end for the clock-out reminder (4:55 PM). */
export const REMINDER_BEFORE_MIN = 5;
/** @deprecated kept for older imports; the reminder now goes before the end. */
export const WORK_END_GRACE_MIN = -REMINDER_BEFORE_MIN;
let lastRun = 0;

export function shopLink(): string {
  return (process.env.SHOP_PUBLIC_URL || "https://kingsironworks.com/shop").replace(/\/+$/, "");
}

/**
 * The worker's reminder, in their language. Short, friendly, one link that
 * lands on "Marcar saída". With `endAt` and the text going out before it:
 * "já são quase 5:00 PM" (the 4:55 reminder); otherwise "still clocked in".
 */
export function stillClockedInMessage(lang: SmsLang, name: string, since: string, link: string, opts: { endAt?: string; now?: number } = {}): string {
  const first = name.trim().split(/\s+/)[0] || name;
  const at = fmtTime(since, lang);
  if (opts.endAt && (opts.now ?? Date.now()) < Date.parse(opts.endAt)) {
    const end = fmtTime(opts.endAt, lang);
    if (lang === "pt") return `KIW: Oi ${first}, já são quase ${end}. Antes de ir embora, toque aqui para marcar a saída: ${link}`;
    if (lang === "es") return `KIW: Hola ${first}, ya son casi las ${end}. Antes de irte, toca aquí para marcar la salida: ${link}`;
    return `KIW: Hi ${first}, it's almost ${end}. Before you leave, tap here to clock out: ${link}`;
  }
  if (lang === "pt") return `KIW: Oi ${first}, seu ponto ainda está aberto desde as ${at}. Abra o app e bata a saída: ${link}`;
  if (lang === "es") return `KIW: Hola ${first}, sigues marcado desde las ${at}. Abre la app y marca tu salida: ${link}`;
  return `KIW: Hi ${first}, you're still clocked in since ${at}. Open the app and clock out: ${link}`;
}

type OpenShift = Pick<TimeShift, "id" | "worker_id" | "started_at">;
type WorkerRow = { id: string; name: string; phone: string | null; lang: string | null };

async function alreadyAlerted(action: string, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const rows = await sbSelect<{ entity_id: string }[]>(
    "kiw_shop_audit",
    `select=entity_id&org_id=eq.${ORG_ID}&action=eq.${action}&entity_id=in.(${ids.join(",")})`
  );
  return new Set(rows.map((a) => a.entity_id));
}

async function workersFor(shifts: OpenShift[]): Promise<Map<string, WorkerRow>> {
  if (!shifts.length) return new Map();
  const rows = await sbSelect<WorkerRow[]>(
    "kiw_shop_workers",
    `select=id,name,phone,lang&org_id=eq.${ORG_ID}&id=in.(${[...new Set(shifts.map((s) => s.worker_id))].join(",")})`
  );
  return new Map(rows.map((w) => [w.id, w]));
}

/** Rule 1: still clocked in after the work-hours end (+ grace). */
export async function alertStillClockedIn(open: OpenShift[], now: number): Promise<number> {
  const settings = resolveWorkHours((await getOrgSettings()).workHours);
  if (!settings.enabled) return 0;
  const due = open.filter((s) => {
    const { endMs } = windowFor(s.started_at, settings);
    // Evening work that started after the window: no nagging (rule 2 still
    // covers a forgotten one). Same evening only: an old open shift found
    // days later is the office's job, not a text at 3 am.
    if (Date.parse(s.started_at) >= endMs) return false;
    return now >= endMs - REMINDER_BEFORE_MIN * 60_000 && now < endMs + 12 * 3600_000;
  });
  if (!due.length) return 0;
  const done = await alreadyAlerted("shift_still_in_alert", due.map((s) => s.id));
  const fresh = due.filter((s) => !done.has(s.id));
  if (!fresh.length) return 0;
  const workers = await workersFor(fresh);
  const link = clockOutLink(shopLink());
  // "Since" is the actual tap, not the 7:30 payroll start of a rounded shift.
  const tapped = new Map<string, string>();
  try {
    const rows = await sbSelect<{ at: string; detail: unknown }[]>(
      "kiw_shop_audit",
      `select=at,detail&org_id=eq.${ORG_ID}&action=eq.shift_window&entity_id=in.(${fresh.map((s) => s.id).join(",")})&order=at.asc`
    );
    for (const r of rows.map(recordFromAudit)) if (r?.edge === "start") tapped.set(r.shiftId, r.punchedAt);
  } catch { /* fall back to started_at */ }
  for (const s of fresh) {
    const w = workers.get(s.worker_id);
    const name = w?.name || "A worker";
    const phone = toE164(w?.phone);
    const since = tapped.get(s.id) ?? s.started_at;
    const { endMs } = windowFor(s.started_at, settings);
    const endAt = new Date(endMs).toISOString();
    const sms = phone ? await sendSms(phone, stillClockedInMessage(smsLang(w?.lang), name, since, link, { endAt, now })) : false;
    const telegram = await sendTelegram(
      `🕔 <b>KIW payroll</b>: ${tgEscape(name)} is still clocked in (since ${tgEscape(fmtDateTime(since))}) ` +
      `at the end of the work day — clock-out reminder. ${phone ? (sms ? "Texted them." : "Text FAILED.") : "No phone on file — not texted."}`
    );
    // Recorded either way: the audit row is the dedupe key, and a failing
    // provider must not become a text every ten minutes.
    await audit("shift_still_in_alert", { workerId: s.worker_id, entity: "shift", entityId: s.id, detail: { sms, telegram, hasPhone: !!phone } });
  }
  return fresh.length;
}

/** Rule 2: open longer than STALE_SHIFT_HOURS. */
async function alertStale(open: OpenShift[], now: number): Promise<number> {
  const cutoff = now - STALE_SHIFT_HOURS * 3600 * 1000;
  const stale = open.filter((s) => Date.parse(s.started_at) < cutoff);
  if (!stale.length) return 0;
  const done = await alreadyAlerted("shift_stale_alert", stale.map((s) => s.id));
  const fresh = stale.filter((s) => !done.has(s.id));
  if (!fresh.length) return 0;
  const workers = await workersFor(fresh);
  for (const s of fresh) {
    const hours = (now - Date.parse(s.started_at)) / 3600000;
    const name = workers.get(s.worker_id)?.name || "A worker";
    const text =
      `⚠️ <b>KIW payroll</b>: ${tgEscape(name)} has been clocked in for <b>${hours.toFixed(1)}h</b> ` +
      `(since ${tgEscape(fmtDateTime(s.started_at))}). Almost certainly a missed clock-out — ` +
      `the phone probably dropped the punch. Fix the end time in Shop › Payroll › Time.`;
    const sent = await sendTelegram(text);
    await audit("shift_stale_alert", { workerId: s.worker_id, entity: "shift", entityId: s.id, detail: { hours: Number(hours.toFixed(2)), sent } });
  }
  return fresh.length;
}

/**
 * Run both checks. Throttled per process unless `force` (the cron endpoint).
 * Never throws.
 */
export async function runClockChecks(now = Date.now(), opts: { force?: boolean } = {}): Promise<{ ran: boolean; stillIn: number; stale: number; waitingFixes?: number }> {
  if (!opts.force && now - lastRun < THROTTLE_MS) return { ran: false, stillIn: 0, stale: 0 };
  lastRun = now;
  let stillIn = 0;
  let stale = 0;
  // 3. Time fixes waiting more than 24 h → one short note a day to the
  //    supervisors (Kayky pt, Daniel en) + Telegram. Deduped in the audit log.
  let waitingFixes = 0;
  try { waitingFixes = (await alertWaitingFixes(now)).count; }
  catch (err) { console.error("[clock-check] waiting time fixes failed:", err); }
  try {
    const open = await sbSelect<OpenShift[]>(
      "kiw_shop_shifts",
      `select=id,worker_id,started_at&org_id=eq.${ORG_ID}&ended_at=is.null`
    );
    if (!open.length) return { ran: true, stillIn, stale, waitingFixes };
    try { stillIn = await alertStillClockedIn(open, now); }
    catch (err) { console.error("[clock-check] still-in failed:", err); }
    stale = await alertStale(open, now);
  } catch (err) {
    console.error("[stale-alert] failed:", err);
  }
  return { ran: true, stillIn, stale, waitingFixes };
}

/** Kept for existing callers: the opportunistic, throttled run. */
export async function alertStaleShifts(now = Date.now()): Promise<void> {
  await runClockChecks(now);
}

/** Test hook. */
export function resetClockCheckThrottle() { lastRun = 0; }
