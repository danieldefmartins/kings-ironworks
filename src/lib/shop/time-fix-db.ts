// Time fixes — server side. See time-fix.ts for the rules and the wording.
//
// Two clocks: everything here touches the PAYROLL clock (kiw_shop_shifts)
// only. Job time (kiw_shop_time_entries) is never edited by a time fix; the
// only job-time effect is the existing one-directional rule that clocking out
// ends running job time, applied when a forgotten shift is finally closed.

import { ORG_ID, audit, getOrgSettings, sbInsert, sbSelect, sbUpdate } from "./db";
import { sendSmsGroup, smsDryRun, smsLang, type SmsRecipient } from "./sms";
import { shopLink } from "./stale-alert";
import { resolveWorkHours, toE164 } from "./work-hours";
import { applyEndWindow, pinOwnerTimes } from "./work-hours-db";
import { endJobTimeOnClockOut } from "./job-timer-db";
import { SHOP_TZ, fromShopInput, shopDateKey, type TimeCorrection, type TimeShift } from "./shared";
import {
  NEW_DAY_NOTE, TIME_APPROVER_ROLE, firstName, isNewDayShift, fixLines, lineText, missedOutError, missedOutFor, requestText,
  reviewTimesError, waitingText, type FixCard, type MissedOut,
} from "./time-fix";

type WorkerRow = { id: string; name: string; role: string | null; phone: string | null; lang: string | null; active: boolean; is_admin: boolean | null; can_see_prices: boolean | null };

function orgPrefix(name: string | undefined): string {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  return words.length >= 2 ? words.map((w) => w[0]).join("").toUpperCase().slice(0, 5) : (name || "").trim() || "Shop";
}

const inList = (ids: string[]) => `(${[...new Set(ids)].join(",")})`;

/** Active office admins (Giulia) — the people who approve time fixes. */
export async function listApprovers(): Promise<WorkerRow[]> {
  const rows = await sbSelect<WorkerRow[]>(
    "kiw_shop_workers",
    `select=id,name,role,phone,lang,active,is_admin,can_see_prices&org_id=eq.${ORG_ID}&active=eq.true&role=eq.${encodeURIComponent(TIME_APPROVER_ROLE)}&order=name.asc`
  );
  return rows.filter((w) => !(w.is_admin && w.can_see_prices));
}

/** "Giulia" — who the crew's requests go to; "" when nobody holds the role. */
export async function approverFirstName(): Promise<string> {
  try { return firstName((await listApprovers())[0]?.name); } catch { return ""; }
}

/** Requests as cards: the shift as it stands, what was asked, who asked. */
async function toCards(rows: TimeCorrection[]): Promise<FixCard[]> {
  if (!rows.length) return [];
  const [shifts, workers] = await Promise.all([
    sbSelect<Pick<TimeShift, "id" | "started_at" | "ended_at" | "status" | "manager_note">[]>("kiw_shop_shifts", `select=id,started_at,ended_at,status,manager_note&org_id=eq.${ORG_ID}&id=in.${inList(rows.map((r) => r.shift_id))}`),
    sbSelect<{ id: string; name: string }[]>("kiw_shop_workers", `select=id,name&org_id=eq.${ORG_ID}&id=in.${inList(rows.flatMap((r) => [r.worker_id, ...(r.reviewed_by ? [r.reviewed_by] : [])]))}`),
  ]);
  const shift = new Map(shifts.map((s) => [s.id, s]));
  const name = new Map(workers.map((w) => [w.id, w.name]));
  return rows.filter((r) => shift.has(r.shift_id)).map((r) => {
    const s = shift.get(r.shift_id)!;
    return {
      id: r.id, shiftId: r.shift_id, workerId: r.worker_id, workerName: name.get(r.worker_id) || "?",
      createdAt: r.created_at, shiftStart: s.started_at, shiftEnd: s.ended_at,
      askStart: r.requested_started_at, askEnd: r.requested_ended_at, reason: r.reason, status: r.status,
      reviewedBy: r.reviewed_by ? firstName(name.get(r.reviewed_by)) || null : null, reviewedAt: r.reviewed_at, reviewNote: r.review_note,
      ...(r.status === "pending" && isNewDayShift(s) ? { newDay: true } : {}),
    };
  });
}

/** Pending requests the viewer may act on (never their own), newest first. */
export async function listPendingFixes(viewerId?: string): Promise<FixCard[]> {
  const rows = await sbSelect<TimeCorrection[]>(
    "kiw_shop_time_corrections",
    `select=*&org_id=eq.${ORG_ID}&status=eq.pending&order=created_at.desc&limit=200`
  );
  return toCards(rows.filter((r) => r.worker_id !== viewerId));
}

export async function countPendingFixes(viewerId?: string): Promise<number> {
  const rows = await sbSelect<{ worker_id: string }[]>(
    "kiw_shop_time_corrections",
    `select=worker_id&org_id=eq.${ORG_ID}&status=eq.pending&limit=500`
  );
  return rows.filter((r) => r.worker_id !== viewerId).length;
}

/** Reviewed requests, read-only history, newest first. */
export async function listFixHistory(limit = 60): Promise<FixCard[]> {
  const rows = await sbSelect<TimeCorrection[]>(
    "kiw_shop_time_corrections",
    `select=*&org_id=eq.${ORG_ID}&status=neq.pending&order=reviewed_at.desc.nullslast,created_at.desc&limit=${limit}`
  );
  return toCards(rows);
}

/** One worker's own requests, as cards, newest first. */
export async function listWorkerFixes(workerId: string): Promise<FixCard[]> {
  const rows = await sbSelect<TimeCorrection[]>(
    "kiw_shop_time_corrections",
    `select=*&org_id=eq.${ORG_ID}&worker_id=eq.${workerId}&order=created_at.desc&limit=60`
  );
  return toCards(rows);
}

// ---- A worker sends a request -------------------------------------------------

/**
 * Save a request. A second identical one for the same shift (a double tap, or
 * the same fix sent again — three of Tiago's 10/8 requests are one fix) is not
 * a new request: its note is updated and nobody is texted again.
 */
export async function submitFixRequest(
  worker: { id: string; name: string },
  input: { shiftId: string; startedAt: string | null; endedAt: string | null; reason: string },
): Promise<{ id: string; created: boolean; notified: boolean } | { error: "not_found" | "bad_times" }> {
  const [shift] = await sbSelect<Pick<TimeShift, "id" | "started_at" | "ended_at">[]>(
    "kiw_shop_shifts", `select=id,started_at,ended_at&org_id=eq.${ORG_ID}&id=eq.${input.shiftId}&worker_id=eq.${worker.id}&limit=1`);
  if (!shift) return { error: "not_found" };
  if (reviewTimesError(input.startedAt ?? shift.started_at, input.endedAt ?? shift.ended_at)) return { error: "bad_times" };
  const pending = await sbSelect<TimeCorrection[]>(
    "kiw_shop_time_corrections", `select=*&org_id=eq.${ORG_ID}&shift_id=eq.${shift.id}&worker_id=eq.${worker.id}&status=eq.pending`);
  const same = (a: string | null, b: string | null) => (a == null && b == null) || (!!a && !!b && Date.parse(a) === Date.parse(b));
  const dup = pending.find((p) => same(p.requested_started_at, input.startedAt) && same(p.requested_ended_at, input.endedAt));
  if (dup) {
    await sbUpdate("kiw_shop_time_corrections", `org_id=eq.${ORG_ID}&id=eq.${dup.id}&status=eq.pending`, { reason: input.reason });
    await audit("time_correction_requested", { workerId: worker.id, entity: "shift", entityId: shift.id, detail: { reason: input.reason, correctionId: dup.id, repeat: true } });
    return { id: dup.id, created: false, notified: false };
  }
  const [row] = await sbInsert<TimeCorrection[]>("kiw_shop_time_corrections", {
    org_id: ORG_ID, shift_id: shift.id, worker_id: worker.id,
    requested_started_at: input.startedAt, requested_ended_at: input.endedAt,
    reason: input.reason, status: "pending",
  });
  await audit("time_correction_requested", { workerId: worker.id, entity: "shift", entityId: shift.id, detail: { reason: input.reason, correctionId: row?.id } });
  let notified = false;
  if (row?.id) {
    try { notified = await notifyFixRequest(worker, row, shift); }
    catch (err) { console.error("[time-fix] notify failed:", err); }
  }
  return { id: row?.id ?? "", created: true, notified };
}

/**
 * "Esqueci a entrada" for a day with NO clock record: the worker gives both
 * times. The shift is saved REJECTED (never counted in pay) with NEW_DAY_NOTE,
 * plus a pending request with the same times; approving it (Aprovar or Mudar)
 * sets the shift to submitted exactly like any other fix, refusing leaves it
 * rejected. Last 7 days only, no overlap with another record, never in the
 * future, never longer than the long-shift limit.
 */
export async function submitNewDayRequest(
  worker: { id: string; name: string },
  input: { startedAt: string; endedAt: string; reason: string },
  now = Date.now(),
): Promise<{ id: string; shiftId: string; created: boolean; notified: boolean } | { error: "bad_times" | "too_old" | "overlap" | "future" | "too_long" }> {
  const start = Date.parse(input.startedAt), end = Date.parse(input.endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { error: "bad_times" };
  if (end > now + 60_000) return { error: "future" };
  if (start < now - 8 * 86400_000) return { error: "too_old" };
  if (end - start > 16 * 3600_000) return { error: "too_long" };
  const startedAt = new Date(start).toISOString(), endedAt = new Date(end).toISOString();
  const overlap = await sbSelect<{ id: string; manager_note: string | null; status: string; started_at: string; ended_at: string | null }[]>(
    "kiw_shop_shifts",
    `select=id,manager_note,status,started_at,ended_at&org_id=eq.${ORG_ID}&worker_id=eq.${worker.id}&started_at=lt.${encodeURIComponent(endedAt)}&or=(ended_at.is.null,ended_at.gt.${encodeURIComponent(startedAt)})&limit=5`);
  // The same day sent twice (a double tap): answer with the first request.
  const twin = overlap.find((s) => isNewDayShift(s) && Date.parse(s.started_at) === start && s.ended_at && Date.parse(s.ended_at) === end);
  if (twin) {
    const [c] = await sbSelect<TimeCorrection[]>("kiw_shop_time_corrections", `select=*&org_id=eq.${ORG_ID}&shift_id=eq.${twin.id}&status=eq.pending&limit=1`);
    if (c) return { id: c.id, shiftId: twin.id, created: false, notified: false };
  }
  if (overlap.length) return { error: "overlap" };
  const rate = await sbSelect<{ hourly_rate: number | null }[]>("kiw_shop_workers", `select=hourly_rate&org_id=eq.${ORG_ID}&id=eq.${worker.id}&limit=1`).catch(() => []);
  const [shift] = await sbInsert<TimeShift[]>("kiw_shop_shifts", {
    org_id: ORG_ID, worker_id: worker.id, pay_rate: rate[0]?.hourly_rate ?? null,
    started_at: startedAt, ended_at: endedAt,
    start_location_status: "unavailable", end_location_status: "unavailable",
    status: "rejected", manager_note: NEW_DAY_NOTE, employee_note: input.reason,
  });
  if (!shift?.id) return { error: "bad_times" };
  const [row] = await sbInsert<TimeCorrection[]>("kiw_shop_time_corrections", {
    org_id: ORG_ID, shift_id: shift.id, worker_id: worker.id,
    requested_started_at: startedAt, requested_ended_at: endedAt, reason: input.reason, status: "pending",
  });
  await audit("time_correction_requested", { workerId: worker.id, entity: "shift", entityId: shift.id, detail: { reason: input.reason, correctionId: row?.id, newDay: true, startedAt, endedAt } });
  let notified = false;
  if (row?.id) {
    try { notified = await notifyFixRequest(worker, row, { started_at: startedAt, ended_at: endedAt, newDay: true }); }
    catch (err) { console.error("[time-fix] notify failed:", err); }
  }
  return { id: row?.id ?? "", shiftId: shift.id, created: true, notified };
}

/** Text the approvers (in their language) + the Telegram copy. Once per request. */
export async function notifyFixRequest(
  worker: { id: string; name: string },
  c: Pick<TimeCorrection, "id" | "requested_started_at" | "requested_ended_at" | "reason">,
  shift: Pick<TimeShift, "started_at" | "ended_at"> & { newDay?: boolean },
): Promise<boolean> {
  const done = await sbSelect<{ id: string }[]>(
    "kiw_shop_audit", `select=id&org_id=eq.${ORG_ID}&action=eq.time_correction_notify&entity_id=eq.${c.id}&limit=1`).catch(() => []);
  if (done.length) return false;
  const org = await getOrgSettings();
  let recipients: SmsRecipient[] = (await listApprovers())
    .filter((w) => w.id !== worker.id)
    .map((w) => ({ phone: toE164(w.phone) || "", lang: smsLang(w.lang) }))
    .filter((r) => r.phone);
  // Nobody holds the approver role (or no phone on file): the owners' contacts.
  if (!recipients.length) recipients = resolveWorkHours(org.workHours).contacts.map((x) => ({ phone: x.phone, lang: x.lang }));
  const card = { shiftStart: shift.started_at, shiftEnd: shift.ended_at, askStart: c.requested_started_at, askEnd: c.requested_ended_at, newDay: !!shift.newDay };
  const prefix = orgPrefix(org.branding?.name);
  const link = `${shopLink()}/time-fixes`;
  const result = await sendSmsGroup(recipients, (lang) => requestText(lang, {
    org: prefix, worker: worker.name, shiftStart: shift.started_at,
    lines: fixLines(card).map((l) => lineText(l, shift.started_at, lang)), reason: c.reason, link,
  }));
  await audit("time_correction_notify", { workerId: worker.id, entity: "time_correction", entityId: c.id, detail: { ...result, dryRun: smsDryRun() } });
  return result.sent > 0 || result.telegram;
}

// ---- Review: approve / change / refuse ----------------------------------------

export type ReviewInput = { id: string; decision: "approved" | "rejected"; startedAt?: string | null; endedAt?: string | null; note?: string | null };
export type ReviewResult =
  | { ok: true; start?: string; end?: string | null; superseded: number }
  | { ok: false; status: number; error: string; code?: "own" | "not_found" | "bad" | "order" | "long"; start?: string; end?: string };

/**
 * Apply a review. `longCheck` lets the route refuse a very long result once
 * (wrong DATE, almost always) before anything is written.
 */
export async function reviewFix(
  reviewer: { id: string; name: string },
  input: ReviewInput,
  longCheck: (start: string, end: string) => boolean,
): Promise<ReviewResult> {
  const [c] = await sbSelect<TimeCorrection[]>(
    "kiw_shop_time_corrections", `select=*&org_id=eq.${ORG_ID}&id=eq.${input.id}&status=eq.pending&limit=1`);
  if (!c) return { ok: false, status: 404, error: "Request not found or already reviewed", code: "not_found" };
  if (c.worker_id === reviewer.id) return { ok: false, status: 403, error: "You cannot approve your own time", code: "own" };
  const now = new Date().toISOString();
  if (input.decision === "rejected") {
    const done = await sbUpdate<TimeCorrection[]>("kiw_shop_time_corrections", `org_id=eq.${ORG_ID}&id=eq.${c.id}&status=eq.pending`, {
      status: "rejected", reviewed_by: reviewer.id, reviewed_at: now, review_note: input.note?.slice(0, 500) || null,
    });
    if (!done.length) return { ok: false, status: 404, error: "Request not found or already reviewed", code: "not_found" };
    await audit("time_correction_review", { workerId: reviewer.id, entity: "shift", entityId: c.shift_id, detail: { status: "rejected", correctionId: c.id } });
    return { ok: true, superseded: 0 };
  }
  const [shift] = await sbSelect<Pick<TimeShift, "id" | "started_at" | "ended_at" | "worker_id">[]>(
    "kiw_shop_shifts", `select=id,started_at,ended_at,worker_id&org_id=eq.${ORG_ID}&id=eq.${c.shift_id}&limit=1`);
  if (!shift) return { ok: false, status: 404, error: "Shift not found", code: "not_found" };
  const changed = input.startedAt !== undefined || input.endedAt !== undefined;
  const start = (changed ? input.startedAt : c.requested_started_at) || shift.started_at;
  const end = (changed ? input.endedAt : c.requested_ended_at) || shift.ended_at;
  const bad = reviewTimesError(start, end);
  if (bad) return { ok: false, status: 400, error: bad === "order" ? "Clock-out must be after clock-in" : "Bad times", code: bad };
  if (end && longCheck(start, end)) return { ok: false, status: 409, error: "long", code: "long", start, end };
  // Claim the request first: two reviewers tapping at once apply it once.
  const claimed = await sbUpdate<TimeCorrection[]>("kiw_shop_time_corrections", `org_id=eq.${ORG_ID}&id=eq.${c.id}&status=eq.pending`, {
    status: "approved", reviewed_by: reviewer.id, reviewed_at: now,
    review_note: changed ? `Changed by ${firstName(reviewer.name)}: in ${start}${end ? `, out ${end}` : ""}` : (input.note?.slice(0, 500) || null),
  });
  if (!claimed.length) return { ok: false, status: 404, error: "Request not found or already reviewed", code: "not_found" };
  const before = { start: shift.started_at, end: shift.ended_at };
  const patch: Record<string, unknown> = { started_at: start, updated_at: now };
  if (end) { patch.ended_at = end; patch.status = "submitted"; }
  await sbUpdate("kiw_shop_shifts", `org_id=eq.${ORG_ID}&id=eq.${shift.id}`, patch);
  if (end && !before.end) await sbUpdate("kiw_shop_breaks", `org_id=eq.${ORG_ID}&shift_id=eq.${shift.id}&ended_at=is.null`, { ended_at: end });
  // Other pending requests on the same shift are answered by this one.
  const others = await sbUpdate<TimeCorrection[]>("kiw_shop_time_corrections", `org_id=eq.${ORG_ID}&shift_id=eq.${shift.id}&status=eq.pending&id=neq.${c.id}`, {
    status: "rejected", reviewed_by: reviewer.id, reviewed_at: now, review_note: "Replaced by the approved request for this shift",
  });
  await audit("time_correction_review", { workerId: reviewer.id, entity: "shift", entityId: shift.id, detail: {
    status: "approved", correctionId: c.id, changed, before,
    asked: { start: c.requested_started_at, end: c.requested_ended_at }, applied: { start, end }, superseded: others.map((o) => o.id),
  } });
  if (end) {
    try { await pinOwnerTimes(reviewer.id, shift.id, start, end); }
    catch (err) { console.error("[work-hours] pin correction times failed:", err); }
  }
  return { ok: true, start, end, superseded: others.length };
}

// ---- Forgotten clock-out -------------------------------------------------------

async function workEnd(): Promise<{ end: string; tz: string }> {
  try { const s = resolveWorkHours((await getOrgSettings()).workHours); return { end: s.end, tz: s.timeZone }; }
  catch { return { end: "17:00", tz: SHOP_TZ }; }
}

/**
 * The question to ask this worker now, if any: their open shift from an
 * earlier day, or a recent shift a morning tap closed at the wrong time. A
 * shift with a pending request is skipped — the office already has it.
 */
export async function findMissedOut(workerId: string, open: TimeShift | null, now = Date.now()): Promise<MissedOut | null> {
  const { end, tz } = await workEnd();
  const pendingFor = async (ids: string[]) => ids.length
    ? new Set((await sbSelect<{ shift_id: string }[]>("kiw_shop_time_corrections", `select=shift_id&org_id=eq.${ORG_ID}&status=eq.pending&shift_id=in.${inList(ids)}`)).map((r) => r.shift_id))
    : new Set<string>();
  if (open) return missedOutFor(open, now, { endHhmm: end, tz });
  const since = new Date(now - 7 * 86400_000).toISOString();
  const recent = await sbSelect<TimeShift[]>(
    "kiw_shop_shifts",
    `select=id,started_at,ended_at,status&org_id=eq.${ORG_ID}&worker_id=eq.${workerId}&started_at=gte.${encodeURIComponent(since)}&ended_at=not.is.null&status=neq.approved&order=started_at.desc&limit=20`
  );
  const candidates = recent.map((s) => missedOutFor(s, now, { endHhmm: end, tz })).filter((q): q is MissedOut => !!q);
  if (!candidates.length) return null;
  const pending = await pendingFor(candidates.map((q) => q.shiftId));
  return candidates.find((q) => !pending.has(q.shiftId)) ?? null;
}

/** Close (or re-close) the forgotten shift at the worker's answer. */
export async function fixMissedOut(
  worker: { id: string },
  input: { shiftId: string; endedAt: string },
  now = Date.now(),
): Promise<{ ok: true; endedAt: string; ask: boolean } | { ok: false; status: number; error: "not_found" | "not_missed" | "before" | "after" | "bad" }> {
  const [shift] = await sbSelect<TimeShift[]>(
    "kiw_shop_shifts", `select=*&org_id=eq.${ORG_ID}&id=eq.${input.shiftId}&worker_id=eq.${worker.id}&limit=1`);
  if (!shift) return { ok: false, status: 404, error: "not_found" };
  const { end, tz } = await workEnd();
  const q = missedOutFor(shift, now, { endHhmm: end, tz });
  if (!q) return { ok: false, status: 409, error: "not_missed" };
  const bad = missedOutError(q, input.endedAt);
  if (bad) return { ok: false, status: 400, error: bad };
  const endedAt = new Date(input.endedAt).toISOString();
  const previousEnd = shift.ended_at;
  const updated = await sbUpdate<TimeShift[]>(
    "kiw_shop_shifts",
    // Conditional on the shift still being in the state we validated, so a
    // retry or an office edit in between is never overwritten.
    `org_id=eq.${ORG_ID}&id=eq.${shift.id}&worker_id=eq.${worker.id}&${previousEnd ? `ended_at=eq.${encodeURIComponent(previousEnd)}` : "ended_at=is.null"}`,
    {
      ended_at: endedAt, status: "submitted", updated_at: new Date(now).toISOString(),
      ...(previousEnd ? {} : { end_location_status: "unavailable" }),
    }
  );
  if (!updated.length) return { ok: false, status: 409, error: "not_missed" };
  await sbUpdate("kiw_shop_breaks", `org_id=eq.${ORG_ID}&shift_id=eq.${shift.id}&ended_at=is.null`, { ended_at: endedAt });
  await sbUpdate("kiw_shop_breaks", `org_id=eq.${ORG_ID}&shift_id=eq.${shift.id}&ended_at=gt.${encodeURIComponent(endedAt)}`, { ended_at: endedAt });
  // Same rule as any clock-out: running job time ends too, at that time.
  if (!previousEnd) await endJobTimeOnClockOut(worker.id, endedAt);
  await audit("shift_missed_out_fixed", { workerId: worker.id, entity: "shift", entityId: shift.id, detail: {
    answer: endedAt, answerLocal: new Date(endedAt).toLocaleString("en-US", { timeZone: tz }),
    startedAt: shift.started_at, previousEnd, mode: q.mode,
  } });
  // The 7:30–5:00 window applies as to any clock-out (a 7 PM answer asks
  // "did your team leader ask you to stay?").
  let ask = false;
  try { ask = await applyEndWindow(worker.id, shift.id, endedAt); }
  catch (err) { console.error("[work-hours] missed-out window failed:", err); }
  return { ok: true, endedAt, ask };
}

/** An open shift from an earlier day blocks a NEW clock-in until it is answered. */
export function openShiftIsForgotten(open: Pick<TimeShift, "id" | "started_at" | "ended_at"> | null, now = Date.now()): boolean {
  return !!open && !!missedOutFor(open, now);
}

// ---- Daily note to the supervisors ---------------------------------------------

export const WAITING_HOURS = 24;
/** Sent once a day, in the morning, shop time. */
export const WAITING_SEND_FROM = "09:00";
export const WAITING_SEND_UNTIL = "20:00";

export async function alertWaitingFixes(now = Date.now()): Promise<{ sent: boolean; count: number }> {
  const org = await getOrgSettings();
  const settings = resolveWorkHours(org.workHours);
  const tz = settings.timeZone;
  const day = shopDateKey(now, tz);
  if (now < Date.parse(fromShopInput(`${day}T${WAITING_SEND_FROM}`, tz)) || now > Date.parse(fromShopInput(`${day}T${WAITING_SEND_UNTIL}`, tz))) return { sent: false, count: 0 };
  const cutoff = new Date(now - WAITING_HOURS * 3600_000).toISOString();
  const waiting = await sbSelect<{ id: string; created_at: string }[]>(
    "kiw_shop_time_corrections",
    `select=id,created_at&org_id=eq.${ORG_ID}&status=eq.pending&created_at=lt.${encodeURIComponent(cutoff)}&order=created_at.asc&limit=500`
  );
  if (!waiting.length) return { sent: false, count: 0 };
  const startOfDay = fromShopInput(`${day}T00:00`, tz);
  const already = await sbSelect<{ id: string }[]>(
    "kiw_shop_audit", `select=id&org_id=eq.${ORG_ID}&action=eq.time_fix_waiting_summary&at=gte.${encodeURIComponent(startOfDay)}&limit=1`);
  if (already.length) return { sent: false, count: waiting.length };
  const approver = await approverFirstName();
  const prefix = orgPrefix(org.branding?.name);
  const link = `${shopLink()}/time-fixes`;
  // Supervisors: the owners' contacts (Kayky pt, Daniel en).
  const result = await sendSmsGroup(
    settings.contacts.map((c) => ({ phone: c.phone, lang: c.lang })),
    (lang) => waitingText(lang, { org: prefix, count: waiting.length, approver, oldest: waiting[0].created_at, now, link }),
  );
  await audit("time_fix_waiting_summary", { entity: "time_correction", detail: { day, count: waiting.length, oldest: waiting[0].created_at, ...result } });
  return { sent: true, count: waiting.length };
}
