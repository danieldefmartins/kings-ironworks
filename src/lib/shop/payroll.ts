import { SHOP_TZ, shopWeekKey, type TimeShift, type TimeBreak, type Worker } from "./shared";
import { payableShiftMs, shiftHold, type ShiftHold } from "./clock-rules";

export function addPayrollDays(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function payrollWeek(input: string | undefined, now = Date.now()) {
  const valid = input && /^\d{4}-\d{2}-\d{2}$/.test(input) && Number.isFinite(Date.parse(`${input}T12:00:00Z`)) && new Date(`${input}T12:00:00Z`).toISOString().slice(0, 10) === input;
  const key = shopWeekKey(valid ? `${input}T12:00:00Z` : now);
  return { key, sunday: addPayrollDays(key, 6), start: payrollMidnight(key), end: payrollMidnight(addPayrollDays(key, 7)) };
}

  // Resolve each midnight independently: a DST week is not always 168 hours.
export function payrollMidnight(day: string): string {
    const target = Date.parse(`${day}T00:00:00Z`);
    let instant = target;
    for (let i = 0; i < 3; i++) {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(instant);
      const get = (type: string) => parts.find(p => p.type === type)!.value;
      const wall = Date.parse(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`);
      instant += target - wall;
    }
    return new Date(instant).toISOString();
}

// Review safeguard, not a limit on payable work: retain the original punch
// and resume calculation once an owner confirms the actual clock-out.
// Threshold and rules live in clock-rules.ts (shared with 360 CRM). It was
// 24 h, so a clock-out tapped the next morning at 23.9 h (André 10/21) was
// paid in full.
export function clockHold(shift: { id?: string; started_at: string; ended_at: string | null; status?: string }, now = Date.now(), pendingCorrections?: ReadonlySet<string>): ShiftHold | null {
  return shiftHold({
    startMs: Date.parse(shift.started_at),
    endMs: shift.ended_at ? Date.parse(shift.ended_at) : null,
    approved: shift.status === "approved",
    correctionPending: !!(shift.id && pendingCorrections?.has(shift.id)),
  }, now);
}
export function needsClockReview(shift: { id?: string; started_at: string; ended_at: string | null; status?: string }, now = Date.now(), pendingCorrections?: ReadonlySet<string>) {
  return clockHold(shift, now, pendingCorrections) !== null;
}

export type PayrollRow = {
  reviewShifts?: number;
  punches?: { id: string; startedAt: string; endedAt: string | null; hours: number; rejected: boolean; needsReview?: boolean; hold?: ShiftHold | null }[];
  id: string; name: string; active: boolean; hours: number; regular: number; overtime: number;
  basePay: number; approvedHours: number; pendingHours: number; rejectedHours: number;
  openHours: number; openShifts: number; missingRateHours: number; shifts: number;
};

/** `pendingCorrections`: shift ids with a correction request still waiting — held out of pay. */
export function calculatePayroll(workers: Pick<Worker, "id" | "name" | "active">[], shifts: TimeShift[], breaks: TimeBreak[], week: ReturnType<typeof payrollWeek>, now = Date.now(), pendingCorrections?: ReadonlySet<string>): PayrollRow[] {
  const rows = new Map<string, PayrollRow>(workers.map(w => [w.id, { ...w, hours: 0, regular: 0, overtime: 0, basePay: 0, approvedHours: 0, pendingHours: 0, rejectedHours: 0, openHours: 0, openShifts: 0, missingRateHours: 0, shifts: 0 }]));
  const byShift = new Map<string, TimeBreak[]>();
  for (const b of breaks) byShift.set(b.shift_id, [...(byShift.get(b.shift_id) || []), b]);
  for (const shift of shifts) {
    const start = Math.max(Date.parse(shift.started_at), Date.parse(week.start));
    const end = Math.min(shift.ended_at ? Date.parse(shift.ended_at) : now, Date.parse(week.end), now);
    if (!(end > start)) continue;
    let row = rows.get(shift.worker_id);
    if (!row) {
      row = { id: shift.worker_id, name: "Unknown worker", active: false, hours: 0, regular: 0, overtime: 0, basePay: 0, approvedHours: 0, pendingHours: 0, rejectedHours: 0, openHours: 0, openShifts: 0, missingRateHours: 0, shifts: 0 };
      rows.set(row.id, row);
    }
    // Whole-minute punches (clock-rules.ts): the same arithmetic as 360 CRM.
    const unpaidBreaks = (byShift.get(shift.id) || []).filter(b => !b.paid).map(b => [Date.parse(b.started_at), b.ended_at ? Date.parse(b.ended_at) : now] as const);
    const hours = payableShiftMs(start, end, unpaidBreaks) / 3600000;
    const hold = clockHold(shift, now, pendingCorrections);
    row.shifts++;
    (row.punches ??= []).push({ id: shift.id, startedAt: shift.started_at, endedAt: shift.ended_at, hours, rejected: shift.status === "rejected", needsReview: hold !== null, hold });
    if (shift.status === "rejected") { row.rejectedHours += hours; continue; }
    if (hold) { row.reviewShifts = (row.reviewShifts ?? 0) + 1; continue; }
    row.hours += hours;
    if (shift.status === "approved" && shift.ended_at) row.approvedHours += hours;
    else row.pendingHours += hours;
    if (!shift.ended_at) { row.openHours += hours; row.openShifts++; }
    const rate = shift.pay_rate == null || String(shift.pay_rate).trim() === "" ? NaN : Number(shift.pay_rate);
    if (!Number.isFinite(rate) || rate < 0) row.missingRateHours += hours;
    else row.basePay += hours * rate;
  }
  return [...rows.values()].map(row => ({ ...row, regular: Math.min(40, row.hours), overtime: Math.max(0, row.hours - 40), basePay: Math.round((row.basePay + Number.EPSILON) * 100) / 100 })).sort((a, b) => a.name.localeCompare(b.name));
}
