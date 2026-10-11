// Server side of the payroll work-hours window (rules in work-hours.ts).
//
// Every function here runs AFTER the punch is already saved, and the route
// wraps each call so a failure here can never fail or delay the punch: the
// worst case is a shift left at its actual tap time, which is what the app
// did before this feature existed.

import { ORG_ID, audit, getOrgSettings, sbInsert, sbSelect, sbUpdate } from "./db";
import type { TimeShift } from "./shared";
import { sendSmsGroup, type SmsLang } from "./sms";
import {
  endDecision, payrollTimes, recordFromAudit, resolveWorkHours, startDecision,
  type WindowAnswer, type WindowEdge, type WindowRecord, type WorkHoursSettings,
} from "./work-hours";

export const WINDOW_ACTION = "shift_window";
/** How far back a worker is still asked about an unanswered punch. */
export const QUESTION_DAYS = 14;

export async function getWorkHours(): Promise<WorkHoursSettings> {
  return resolveWorkHours((await getOrgSettings()).workHours);
}

type AuditRow = { at: string; detail: unknown };

export async function listWindowRecords(filter: { shiftId?: string; workerId?: string; sinceDays?: number }): Promise<WindowRecord[]> {
  const parts = [`select=at,detail`, `org_id=eq.${ORG_ID}`, `action=eq.${WINDOW_ACTION}`];
  if (filter.shiftId) parts.push(`entity=eq.shift`, `entity_id=eq.${filter.shiftId}`);
  if (filter.workerId) parts.push(`detail->>workerId=eq.${filter.workerId}`);
  if (filter.sinceDays) parts.push(`at=gte.${encodeURIComponent(new Date(Date.now() - filter.sinceDays * 86400000).toISOString())}`);
  parts.push("order=at.asc", "limit=2000");
  const rows = await sbSelect<AuditRow[]>("kiw_shop_audit", parts.join("&"));
  return rows.map(recordFromAudit).filter((r): r is WindowRecord => !!r);
}

/** Written with sbInsert (throws), NOT audit() (swallows): the shift is only
 *  moved to the edge once its actual time is safely on record. */
async function writeRecord(actorId: string, rec: Omit<WindowRecord, "at">): Promise<void> {
  await sbInsert("kiw_shop_audit", {
    org_id: ORG_ID, worker_id: actorId, action: WINDOW_ACTION,
    entity: "shift", entity_id: rec.shiftId, detail: rec,
  });
}

async function loadShift(shiftId: string): Promise<TimeShift | null> {
  const rows = await sbSelect<TimeShift[]>("kiw_shop_shifts", `select=*&org_id=eq.${ORG_ID}&id=eq.${shiftId}&limit=1`);
  return rows[0] || null;
}

/** Re-derive started_at/ended_at from the actual taps + answers. */
async function recompute(shift: TimeShift, records: WindowRecord[]): Promise<{ started_at: string; ended_at: string | null }> {
  const next = payrollTimes(shift, records);
  const same = Date.parse(next.started_at) === Date.parse(shift.started_at) &&
    (next.ended_at == null ? shift.ended_at == null : shift.ended_at != null && Date.parse(next.ended_at) === Date.parse(shift.ended_at));
  if (!same) {
    await sbUpdate("kiw_shop_shifts", `org_id=eq.${ORG_ID}&id=eq.${shift.id}`, {
      started_at: next.started_at,
      ...(shift.ended_at != null && next.ended_at != null ? { ended_at: next.ended_at } : {}),
      updated_at: new Date().toISOString(),
    });
  }
  return next;
}

/** After a clock-in has been saved at its actual tap time. */
export async function applyStartWindow(workerId: string, shift: TimeShift, punchAt: string): Promise<boolean> {
  const settings = await getWorkHours();
  const d = startDecision(punchAt, settings);
  if (!d) return false;
  const existing = await listWindowRecords({ shiftId: shift.id });
  if (existing.some((r) => r.edge === "start")) return true; // a retried punch
  await writeRecord(workerId, { shiftId: shift.id, workerId, edge: "start", punchedAt: punchAt, edgeAt: d.edgeAt, answer: "pending", ask: true });
  await recompute(shift, await listWindowRecords({ shiftId: shift.id }));
  return true;
}

/** The actual clock-in time of a shift (its start record, else the column).
 *  shift_stop uses it so a clock-out between the actual and the rounded start
 *  (in 6:40, out 7:10) is not mistaken for a stale punch from an older shift. */
export async function actualStartOf(shift: Pick<TimeShift, "id" | "started_at">): Promise<string> {
  const rec = (await listWindowRecords({ shiftId: shift.id })).filter((r) => r.edge === "start").pop();
  return rec?.punchedAt ?? shift.started_at;
}

/**
 * After a shift has been closed. `punchAt` is the actual end (tap time, or the
 * time the owner entered for a forgotten clock-out). Rounds to the window end
 * of the day the shift started unless that edge was already answered "yes".
 */
export async function applyEndWindow(actorId: string, shiftId: string, punchAt: string): Promise<boolean> {
  const shift = await loadShift(shiftId);
  if (!shift?.ended_at) return false;
  const settings = await getWorkHours();
  const records = await listWindowRecords({ shiftId });
  const startRec = records.filter((r) => r.edge === "start").pop();
  if (records.some((r) => r.edge === "end")) return false; // already handled (retry)
  const actualStart = startRec?.punchedAt ?? shift.started_at;
  const d = endDecision(actualStart, punchAt, settings);
  // Nothing to record when the end is inside the window and the start was
  // never moved: the shift is exactly as tapped.
  if (!d.ask && !startRec) return false;
  await writeRecord(actorId, {
    shiftId, workerId: shift.worker_id, edge: "end", punchedAt: punchAt, edgeAt: d.edgeAt,
    answer: d.ask ? "pending" : "no", ask: d.ask,
  });
  await recompute(shift, await listWindowRecords({ shiftId }));
  return d.ask;
}

export type { WindowQuestion } from "./work-hours";

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length >= 2 ? words.map((w) => w[0]).join("").toUpperCase().slice(0, 5) : name.trim() || "Shop";
}

const TIME_LOCALE: Record<SmsLang, string> = { en: "en-US", pt: "pt-BR", es: "es-US" };
function fmtIn(iso: string, tz: string, lang: SmsLang = "en"): string {
  return new Date(iso).toLocaleTimeString(TIME_LOCALE[lang], { timeZone: tz, hour: "numeric", minute: "2-digit" });
}

/** The text an approval contact gets, in their own language. Short, no money. */
export function requestedMessage(org: string, workerName: string, edge: WindowEdge, punchedAt: string, edgeAt: string, tz: string, lang: SmsLang = "en"): string {
  const time = fmtIn(punchedAt, tz, lang);
  const limit = fmtIn(edgeAt, tz, lang);
  if (lang === "pt") {
    return edge === "start"
      ? `${org}: ${workerName} bateu o ponto às ${time} (antes das ${limit}) e disse que o líder pediu. Confira em Shop › Time.`
      : `${org}: ${workerName} bateu a saída às ${time} (depois das ${limit}) e disse que o líder pediu. Confira em Shop › Time.`;
  }
  if (lang === "es") {
    return edge === "start"
      ? `${org}: ${workerName} marcó entrada a las ${time} (antes de las ${limit}) y dice que el líder se lo pidió. Revísalo en Shop › Time.`
      : `${org}: ${workerName} marcó salida a las ${time} (después de las ${limit}) y dice que el líder se lo pidió. Revísalo en Shop › Time.`;
  }
  return edge === "start"
    ? `${org}: ${workerName} clocked in at ${time} (before ${limit}) and says the team leader asked. Check it in Shop › Time.`
    : `${org}: ${workerName} clocked out at ${time} (after ${limit}) and says the team leader asked. Check it in Shop › Time.`;
}

/** The worker's answer to "did your team leader ask?". */
export async function answerWindow(worker: { id: string; name: string }, shiftId: string, edge: WindowEdge, requested: boolean): Promise<{ ok: boolean; notified?: number }> {
  const records = await listWindowRecords({ shiftId });
  const last = records.filter((r) => r.edge === edge).pop();
  if (!last || last.workerId !== worker.id || !last.ask) return { ok: false };
  if (last.answer !== "pending") return { ok: true }; // already answered (double tap)
  const answer: WindowAnswer = requested ? "yes" : "no";
  await writeRecord(worker.id, { shiftId, workerId: worker.id, edge, punchedAt: last.punchedAt, edgeAt: last.edgeAt, answer, ask: true });
  const shift = await loadShift(shiftId);
  if (shift) await recompute(shift, await listWindowRecords({ shiftId }));
  if (!requested) return { ok: true };
  const org = await getOrgSettings();
  const settings = resolveWorkHours(org.workHours);
  const prefix = initials(org.branding.name || "Shop");
  const result = await sendSmsGroup(
    settings.contacts.map((c) => ({ phone: c.phone, lang: c.lang })),
    (lang) => requestedMessage(prefix, worker.name, edge, last.punchedAt, last.edgeAt, settings.timeZone, lang),
  );
  await audit("shift_window_notify", { workerId: worker.id, entity: "shift", entityId: shiftId, detail: { edge, ...result } });
  return { ok: true, notified: result.sent };
}

/** Owner: keep the actual time (approve) or move it back to the edge. */
export async function reviewWindow(ownerId: string, shiftId: string, edge: WindowEdge, approve: boolean): Promise<boolean> {
  const records = await listWindowRecords({ shiftId });
  const last = records.filter((r) => r.edge === edge).pop();
  if (!last) return false;
  await writeRecord(ownerId, { shiftId, workerId: last.workerId, edge, punchedAt: last.punchedAt, edgeAt: last.edgeAt, answer: approve ? "approved" : "denied", ask: last.ask });
  const shift = await loadShift(shiftId);
  if (shift) await recompute(shift, await listWindowRecords({ shiftId }));
  return true;
}
