import { ORG_ID, sbSelect, type Worker, type TimeShift, type TimeBreak } from "./db";
import { canViewOwnerFinancials } from "./shared";
import type { payrollWeek } from "./payroll";

// Page every result: historical payroll must never silently stop at the REST cap.
async function allRows<T>(table: string, query: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await sbSelect<T[]>(table, `${query}&limit=500&offset=${offset}`);
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

export async function loadPayrollWeek(week: ReturnType<typeof payrollWeek>) {
  const start = encodeURIComponent(week.start), end = encodeURIComponent(week.end);
  const [workers, shifts, breaks] = await Promise.all([
    allRows<Worker>("kiw_shop_workers", `select=id,name,active,is_admin,can_see_prices&org_id=eq.${ORG_ID}&order=name.asc,id.asc`),
    allRows<TimeShift>("kiw_shop_shifts", `select=id,worker_id,pay_rate,started_at,ended_at,status&org_id=eq.${ORG_ID}&started_at=lt.${end}&or=(ended_at.is.null,ended_at.gt.${start})&order=started_at.asc,id.asc`),
    allRows<TimeBreak>("kiw_shop_breaks", `select=id,shift_id,started_at,ended_at,paid&org_id=eq.${ORG_ID}&started_at=lt.${end}&or=(ended_at.is.null,ended_at.gt.${start})&order=started_at.asc,id.asc`),
  ]);
  const owners = new Set(workers.filter(canViewOwnerFinancials).map(w => w.id));
  const employeeShifts = shifts.filter(s => !owners.has(s.worker_id));
  const ownerShiftIds = new Set(shifts.filter(s => owners.has(s.worker_id)).map(s => s.id));
  return { workers: workers.filter(w => !owners.has(w.id)), shifts: employeeShifts, breaks: breaks.filter(b => !ownerShiftIds.has(b.shift_id)) };
}

export async function earliestPayrollDate(): Promise<string | undefined> {
  const rows = await sbSelect<{ started_at: string }[]>("kiw_shop_shifts", `select=started_at&org_id=eq.${ORG_ID}&order=started_at.asc&limit=1`);
  return rows[0]?.started_at;
}
