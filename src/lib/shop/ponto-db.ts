// The office "Ponto" screen — server side. See ponto.ts for the rules.
//
// Who: the office admin (Giulia, role "Office / admin") and the owners
// (Kayky, Daniel) — canApproveTime. Money is never loaded for the office
// admin: her week summary is hours only; dollars stay on the owners' Payroll.
// Two clocks: payroll clock only (kiw_shop_shifts); job time is never touched.

import { ORG_ID, audit, getOrgSettings, sbSelect, sbUpdate, type TimeBreak, type TimeShift } from "./db";
import { canViewOwnerFinancials, shopDateKey } from "./shared";
import { addPayrollDays, calculatePayroll, payrollMidnight, payrollWeek } from "./payroll";
import { pendingCorrectionShiftIds } from "./payroll-db";
import { listWindowRecords } from "./work-hours-db";
import { pendingQuestions, resolveWorkHours, toCheck, toE164 } from "./work-hours";
import { sendSms, smsDryRun, smsLang } from "./sms";
import { sendTelegram, tgEscape } from "./notify";
import { shopLink } from "./stale-alert";
import { askWorkerText, clockOutLink, isMissedOpen, weekApproval, type HoldReason } from "./ponto";
import { isMissedClockOut } from "./clock-rules";

type Person = { id: string; name: string; role: string | null; lang: string | null; phone: string | null; active: boolean; is_admin: boolean | null; can_see_prices: boolean | null; payroll_excluded: boolean | null };

async function allRows<T>(table: string, query: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await sbSelect<T[]>(table, `${query}&limit=500&offset=${offset}`);
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

/** Crew on payroll: owners and payroll-excluded people are not on the clock. */
async function crew(): Promise<Person[]> {
  const rows = await sbSelect<Person[]>("kiw_shop_workers", `select=id,name,role,lang,phone,active,is_admin,can_see_prices,payroll_excluded&org_id=eq.${ORG_ID}&order=name.asc`);
  return rows.filter((w) => !w.payroll_excluded && !canViewOwnerFinancials(w));
}

async function shiftsBetween(start: string, end: string): Promise<TimeShift[]> {
  const s = encodeURIComponent(start), e = encodeURIComponent(end);
  return allRows<TimeShift>("kiw_shop_shifts", `select=*&org_id=eq.${ORG_ID}&started_at=lt.${e}&or=(ended_at.is.null,ended_at.gt.${s})&order=started_at.asc,id.asc`);
}

async function breaksFor(shiftIds: string[]): Promise<TimeBreak[]> {
  const out: TimeBreak[] = [];
  for (let i = 0; i < shiftIds.length; i += 100) {
    const chunk = shiftIds.slice(i, i + 100);
    out.push(...await sbSelect<TimeBreak[]>("kiw_shop_breaks", `select=id,shift_id,started_at,ended_at,paid&org_id=eq.${ORG_ID}&shift_id=in.(${chunk.join(",")})`));
  }
  return out;
}

/** Shifts with an extra-time question not answered yet, or answered "yes" and not checked. */
async function windowOpenShifts(): Promise<Set<string>> {
  try {
    const rows = await listWindowRecords({ sinceDays: 45 });
    return new Set([...pendingQuestions(rows), ...toCheck(rows)].map((r) => r.shiftId));
  } catch { return new Set(); }
}

export interface MissedRow { shiftId: string; workerId: string; name: string; startedAt: string; endedAt: string | null; hours: number; askedAt: string | null; hasPhone: boolean }
export interface WorkingRow { workerId: string; shiftId: string; name: string; startedAt: string; onBreak: boolean }
export interface TodayRow { workerId: string; name: string; hours: number; open: boolean; held: boolean }
export interface WeekRow {
  workerId: string; name: string; hours: number; approvedHours: number; pendingHours: number;
  pay: number | null; missingRate: boolean;
  approve: number; approved: number; held: { id: string; reason: HoldReason; day: string }[];
  days: { day: string; hours: number }[];
}
export interface PontoData {
  now: number; workEnd: string; weekKey: string; weeks: { key: string; label: "thisWeek" | "lastWeek" }[];
  missed: MissedRow[]; working: WorkingRow[]; today: TodayRow[]; week: WeekRow[]; money: boolean;
}

export async function loadPonto(viewer: { id: string; is_admin?: boolean | null; can_see_prices?: boolean | null }, weekInput: string | undefined, now = Date.now()): Promise<PontoData> {
  const money = canViewOwnerFinancials(viewer);
  const settings = resolveWorkHours((await getOrgSettings()).workHours);
  const thisWeek = payrollWeek(undefined, now);
  const last = addPayrollDays(thisWeek.key, -7);
  const week = payrollWeek(weekInput === last ? last : undefined, now);
  const today = shopDateKey(now);
  const todayWin = { ...week, start: payrollMidnight(today), end: payrollMidnight(addPayrollDays(today, 1)) };
  // One read covering last week through today: the week, today, open shifts
  // from earlier days and recent missed clock-outs (7 days back).
  const fromKey = addPayrollDays(today, -8) < week.key ? addPayrollDays(today, -8) : week.key;
  const from = payrollMidnight(fromKey);
  const [people, shifts, openOld] = await Promise.all([
    crew(),
    shiftsBetween(from, new Date(Math.max(now, Date.parse(week.end)) + 60_000).toISOString()),
    sbSelect<TimeShift[]>("kiw_shop_shifts", `select=*&org_id=eq.${ORG_ID}&ended_at=is.null&started_at=lt.${encodeURIComponent(from)}`),
  ]);
  const crewIds = new Set(people.map((p) => p.id));
  const all = [...openOld, ...shifts].filter((s) => crewIds.has(s.worker_id));
  const byId = new Map(all.map((s) => [s.id, s]));
  const mine = [...byId.values()];
  const breaks = await breaksFor(mine.map((s) => s.id));
  const pending = await pendingCorrectionShiftIds(mine.map((s) => s.id));
  const windowOpen = await windowOpenShifts();
  const name = new Map(people.map((p) => [p.id, p.name]));

  // Missed clock-outs: open past the work-day end (or from an earlier day), and
  // recent closed shifts too long to be real that nobody has confirmed yet.
  const missedShifts = mine.filter((s) => s.ended_at
    ? s.status !== "approved" && s.status !== "rejected" && !pending.has(s.id) && Date.parse(s.started_at) >= now - 7 * 86400_000 && isMissedClockOut(Date.parse(s.started_at), Date.parse(s.ended_at), now)
    : isMissedOpen(s.started_at, now, settings.end, settings.timeZone));
  const asked = missedShifts.length
    ? await sbSelect<{ entity_id: string; at: string }[]>("kiw_shop_audit", `select=entity_id,at&org_id=eq.${ORG_ID}&action=eq.shift_ask_worker&entity_id=in.(${missedShifts.map((s) => s.id).join(",")})&order=at.desc`).catch(() => [])
    : [];
  const askedAt = new Map<string, string>();
  for (const a of asked) if (!askedAt.has(a.entity_id)) askedAt.set(a.entity_id, a.at);
  const phone = new Map(people.map((p) => [p.id, !!toE164(p.phone)]));
  const missed: MissedRow[] = missedShifts.map((s) => ({
    shiftId: s.id, workerId: s.worker_id, name: name.get(s.worker_id) || "?", startedAt: s.started_at, endedAt: s.ended_at,
    hours: ((s.ended_at ? Date.parse(s.ended_at) : now) - Date.parse(s.started_at)) / 3600_000,
    askedAt: askedAt.get(s.id) ?? null, hasPhone: phone.get(s.worker_id) ?? false,
  })).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const missedIds = new Set(missed.map((m) => m.shiftId));

  const working: WorkingRow[] = mine.filter((s) => !s.ended_at && !missedIds.has(s.id)).map((s) => ({
    workerId: s.worker_id, shiftId: s.id, name: name.get(s.worker_id) || "?", startedAt: s.started_at,
    onBreak: breaks.some((b) => b.shift_id === s.id && !b.ended_at),
  })).sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const roster = people.map((p) => ({ id: p.id, name: p.name, active: p.active }));
  const todayRows = calculatePayroll(roster, mine.filter((s) => !missedIds.has(s.id)), breaks, todayWin, now, pending);
  const todayList: TodayRow[] = todayRows.filter((r) => r.shifts > 0).map((r) => ({
    workerId: r.id, name: r.name, hours: r.hours, open: r.openShifts > 0, held: (r.reviewShifts ?? 0) > 0,
  }));

  const weekShifts = mine.filter((s) => s.started_at >= week.start && s.started_at < week.end);
  const weekRows = calculatePayroll(roster, mine, breaks, week, now, pending);
  const dayKeys = Array.from({ length: 7 }, (_, i) => addPayrollDays(week.key, i)).filter((d) => d <= today);
  const daily = dayKeys.map((d) => ({ d, rows: calculatePayroll(roster, mine, breaks, { ...week, start: payrollMidnight(d), end: payrollMidnight(addPayrollDays(d, 1)) }, now, pending) }));
  const weekOut: WeekRow[] = weekRows.filter((r) => r.shifts > 0 || r.active).map((r) => {
    const list = weekShifts.filter((s) => s.worker_id === r.id);
    const a = weekApproval(list, { pendingRequests: pending, windowOpen, now });
    return {
      workerId: r.id, name: r.name, hours: r.hours, approvedHours: r.approvedHours, pendingHours: r.pendingHours,
      pay: money ? r.basePay : null, missingRate: money && r.missingRateHours > 0,
      approve: a.approve.length, approved: a.approved,
      held: a.held.map((h) => ({ ...h, day: shopDateKey(byId.get(h.id)!.started_at) })),
      days: daily.map(({ d, rows }) => ({ day: d, hours: rows.find((x) => x.id === r.id)?.hours ?? 0 })),
    };
  }).filter((r) => r.hours > 0 || r.approve > 0 || r.approved > 0 || r.held.length > 0);

  return {
    now, workEnd: settings.end, weekKey: week.key,
    weeks: [{ key: thisWeek.key, label: "thisWeek" }, { key: last, label: "lastWeek" }],
    missed, working, today: todayList, week: weekOut, money,
  };
}

/**
 * "Aprovar semana" for one worker: approves exactly the shifts weekApproval
 * says may be approved, each conditional on still being submitted and closed
 * (a clock-out or an office edit in between is never overwritten).
 */
export async function approveWeek(reviewer: { id: string }, workerId: string, weekKey: string, now = Date.now()): Promise<{ ok: true; approved: number; held: number } | { ok: false; status: number; error: string }> {
  if (workerId === reviewer.id) return { ok: false, status: 403, error: "You cannot approve your own time" };
  const thisWeek = payrollWeek(undefined, now);
  if (weekKey !== thisWeek.key && weekKey !== addPayrollDays(thisWeek.key, -7)) return { ok: false, status: 400, error: "Bad week" };
  const week = payrollWeek(weekKey, now);
  const people = await crew();
  if (!people.some((p) => p.id === workerId)) return { ok: false, status: 404, error: "Worker not found" };
  const shifts = await allRows<TimeShift>("kiw_shop_shifts", `select=id,worker_id,started_at,ended_at,status&org_id=eq.${ORG_ID}&worker_id=eq.${workerId}&started_at=gte.${encodeURIComponent(week.start)}&started_at=lt.${encodeURIComponent(week.end)}&order=started_at.asc`);
  const [pending, windowOpen] = await Promise.all([pendingCorrectionShiftIds(shifts.map((s) => s.id)), windowOpenShifts()]);
  const plan = weekApproval(shifts, { pendingRequests: pending, windowOpen, now });
  const at = new Date(now).toISOString();
  let approved = 0;
  for (const id of plan.approve) {
    const rows = await sbUpdate<TimeShift[]>("kiw_shop_shifts", `org_id=eq.${ORG_ID}&id=eq.${id}&worker_id=eq.${workerId}&status=eq.submitted&ended_at=not.is.null`, {
      status: "approved", approved_by: reviewer.id, approved_at: at, updated_at: at,
    });
    approved += rows.length;
  }
  await audit("week_approve", { workerId: reviewer.id, entity: "worker", entityId: workerId, detail: { week: week.key, approved: plan.approve, held: plan.held } });
  return { ok: true, approved, held: plan.held.length };
}

/** Minimum gap between two "did you forget?" texts for the same shift. */
export const ASK_AGAIN_MIN = 60;

/** "Perguntar ao funcionário": one text in the worker's language, one link. */
export async function askWorker(reviewer: { id: string; name: string }, shiftId: string, now = Date.now()): Promise<{ ok: true; sent: boolean; at: string } | { ok: false; status: number; error: string; at?: string }> {
  const [shift] = await sbSelect<TimeShift[]>("kiw_shop_shifts", `select=id,worker_id,started_at,ended_at&org_id=eq.${ORG_ID}&id=eq.${shiftId}&limit=1`);
  if (!shift) return { ok: false, status: 404, error: "Shift not found" };
  const [w] = await sbSelect<Person[]>("kiw_shop_workers", `select=id,name,role,lang,phone,active,is_admin,can_see_prices,payroll_excluded&org_id=eq.${ORG_ID}&id=eq.${shift.worker_id}&limit=1`);
  if (!w) return { ok: false, status: 404, error: "Worker not found" };
  if (w.id === reviewer.id) return { ok: false, status: 403, error: "That is your own clock" };
  const phone = toE164(w.phone);
  if (!phone) return { ok: false, status: 400, error: "No phone on file" };
  const [last] = await sbSelect<{ at: string }[]>("kiw_shop_audit", `select=at&org_id=eq.${ORG_ID}&action=eq.shift_ask_worker&entity_id=eq.${shift.id}&order=at.desc&limit=1`).catch(() => []);
  if (last && now - Date.parse(last.at) < ASK_AGAIN_MIN * 60_000) return { ok: false, status: 409, error: "already_asked", at: last.at };
  const org = await getOrgSettings();
  const words = (org.branding?.name || "").trim().split(/\s+/).filter(Boolean);
  const prefix = words.length >= 2 ? words.map((x) => x[0]).join("").toUpperCase().slice(0, 5) : words[0] || "Shop";
  const lang = smsLang(w.lang);
  const text = askWorkerText(lang, { org: prefix, name: w.name, startedAt: shift.started_at, now, link: clockOutLink(shopLink()) });
  const sent = await sendSms(phone, text);
  await sendTelegram(`🕔 <b>KIW payroll</b>: ${tgEscape(reviewer.name.split(" ")[0])} asked ${tgEscape(w.name)} about a missing clock-out. ${sent ? "Texted." : "Text FAILED."}`).catch(() => false);
  const at = new Date(now).toISOString();
  await audit("shift_ask_worker", { workerId: reviewer.id, entity: "shift", entityId: shift.id, detail: { worker: w.id, sent, lang, dryRun: smsDryRun() } });
  return { ok: true, sent, at };
}
