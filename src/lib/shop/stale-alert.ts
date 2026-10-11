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
//   1. still clocked in WORK_END_GRACE_MIN after the work-hours end → a text to
//      the worker, in their language, with the app link (+ Telegram);
//   2. open longer than STALE_SHIFT_HOURS → Telegram to the office.

import { ORG_ID, audit, getOrgSettings, sbSelect } from "./db";
import { sendTelegram, tgEscape } from "./notify";
import { fmtDateTime, fmtTime, type TimeShift } from "./shared";
import { STALE_SHIFT_HOURS } from "./punch";
import { sendSms, smsLang, type SmsLang } from "./sms";
import { resolveWorkHours, toE164, windowFor } from "./work-hours";

const THROTTLE_MS = 10 * 60 * 1000;
/** Minutes after the work-hours end before "you're still clocked in". */
export const WORK_END_GRACE_MIN = 30;
let lastRun = 0;

export function shopLink(): string {
  return (process.env.SHOP_PUBLIC_URL || "https://kingsironworks.com/shop").replace(/\/+$/, "");
}

/** The worker's reminder, in their language. Short, friendly, one link. */
export function stillClockedInMessage(lang: SmsLang, name: string, since: string, link: string): string {
  const first = name.trim().split(/\s+/)[0] || name;
  const at = fmtTime(since, lang);
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
    return now >= endMs + WORK_END_GRACE_MIN * 60_000 && now < endMs + 12 * 3600_000;
  });
  if (!due.length) return 0;
  const done = await alreadyAlerted("shift_still_in_alert", due.map((s) => s.id));
  const fresh = due.filter((s) => !done.has(s.id));
  if (!fresh.length) return 0;
  const workers = await workersFor(fresh);
  const link = shopLink();
  for (const s of fresh) {
    const w = workers.get(s.worker_id);
    const name = w?.name || "A worker";
    const phone = toE164(w?.phone);
    const sms = phone ? await sendSms(phone, stillClockedInMessage(smsLang(w?.lang), name, s.started_at, link)) : false;
    const telegram = await sendTelegram(
      `🕔 <b>KIW payroll</b>: ${tgEscape(name)} is still clocked in (since ${tgEscape(fmtDateTime(s.started_at))}), ` +
      `${WORK_END_GRACE_MIN} min after the work day ended. ${phone ? (sms ? "Texted them." : "Text FAILED.") : "No phone on file — not texted."}`
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
export async function runClockChecks(now = Date.now(), opts: { force?: boolean } = {}): Promise<{ ran: boolean; stillIn: number; stale: number }> {
  if (!opts.force && now - lastRun < THROTTLE_MS) return { ran: false, stillIn: 0, stale: 0 };
  lastRun = now;
  let stillIn = 0;
  let stale = 0;
  try {
    const open = await sbSelect<OpenShift[]>(
      "kiw_shop_shifts",
      `select=id,worker_id,started_at&org_id=eq.${ORG_ID}&ended_at=is.null`
    );
    if (!open.length) return { ran: true, stillIn, stale };
    try { stillIn = await alertStillClockedIn(open, now); }
    catch (err) { console.error("[clock-check] still-in failed:", err); }
    stale = await alertStale(open, now);
  } catch (err) {
    console.error("[stale-alert] failed:", err);
  }
  return { ran: true, stillIn, stale };
}

/** Kept for existing callers: the opportunistic, throttled run. */
export async function alertStaleShifts(now = Date.now()): Promise<void> {
  await runClockChecks(now);
}

/** Test hook. */
export function resetClockCheckThrottle() { lastRun = 0; }
