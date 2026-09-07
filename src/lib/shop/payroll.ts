import { SHOP_TZ, shopWeekKey, type TimeShift, type TimeBreak, type Worker } from "./shared";

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

export type PayrollRow = {
  id: string; name: string; active: boolean; hours: number; regular: number; overtime: number;
  basePay: number; approvedHours: number; pendingHours: number; rejectedHours: number;
  openHours: number; openShifts: number; missingRateHours: number; shifts: number;
};

export function calculatePayroll(workers: Pick<Worker, "id" | "name" | "active">[], shifts: TimeShift[], breaks: TimeBreak[], week: ReturnType<typeof payrollWeek>, now = Date.now()): PayrollRow[] {
  const rows = new Map(workers.map(w => [w.id, { ...w, hours: 0, regular: 0, overtime: 0, basePay: 0, approvedHours: 0, pendingHours: 0, rejectedHours: 0, openHours: 0, openShifts: 0, missingRateHours: 0, shifts: 0 }]));
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
    const intervals = (byShift.get(shift.id) || []).filter(b => !b.paid).map(b => [Math.max(start, Date.parse(b.started_at)), Math.min(end, b.ended_at ? Date.parse(b.ended_at) : now)]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
    let unpaid = 0, cursor = start;
    for (const [a, b] of intervals) { unpaid += Math.max(0, b - Math.max(a, cursor)); cursor = Math.max(cursor, b); }
    const hours = Math.max(0, end - start - unpaid) / 3600000;
    row.shifts++;
    if (shift.status === "rejected") { row.rejectedHours += hours; continue; }
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
