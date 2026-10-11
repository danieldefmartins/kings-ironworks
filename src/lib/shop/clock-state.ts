import { getOpenShift, getShiftBreaks, getWorkerRate, listWorkerBreaks, listWorkerShifts } from "@/lib/shop/db";
import { canViewOwnerFinancials } from "./shared";
import { calculatePayroll, payrollWeek } from "@/lib/shop/payroll";
import { pendingQuestions, type WindowQuestion } from "./work-hours";
import { QUESTION_DAYS, listWindowRecords } from "./work-hours-db";

// Unanswered "did your team leader ask?" questions — e.g. a punch that left
// the outbox after the app was closed. Best-effort: the clock must load even
// when this lookup fails.
async function loadWindowQuestions(workerId: string): Promise<WindowQuestion[]> {
  try {
    const rows = await listWindowRecords({ workerId, sinceDays: QUESTION_DAYS });
    return pendingQuestions(rows).map(({ shiftId, edge, punchedAt, edgeAt }) => ({ shiftId, edge, punchedAt, edgeAt }));
  } catch (err) {
    console.error("[work-hours] questions lookup failed:", err);
    return [];
  }
}

export async function loadClockState(worker: { id: string; is_admin?: boolean | null; can_see_prices?: boolean | null } | null, now = Date.now()) {
  if (!worker || canViewOwnerFinancials(worker)) return { shift: null, breaks: [], hourlyRate: null, weekHoursBeforeShift: 0, weekEarningsBeforeShift: 0, windowQuestions: [] as WindowQuestion[] };
  const week = payrollWeek(undefined, now);
  const [shift, rate, weekShifts, weekBreaks, windowQuestions] = await Promise.all([
    getOpenShift(worker.id), getWorkerRate(worker.id),
    listWorkerShifts(worker.id, week.start), listWorkerBreaks(worker.id, week.start),
    loadWindowQuestions(worker.id),
  ]);
  // Use the same rules as owner payroll: rejected records remain in history,
  // but never contribute to pay; shifts and breaks stop at week boundaries.
  const closed = calculatePayroll([], weekShifts.filter(s => s.id !== shift?.id), weekBreaks, week, now).find(row => row.id === worker.id);
  const breaks = shift ? await getShiftBreaks(shift.id) : [];
  return {
    shift, breaks,
    hourlyRate: shift?.pay_rate == null ? rate : Number(shift.pay_rate),
    weekHoursBeforeShift: closed?.hours ?? 0,
    weekEarningsBeforeShift: closed?.missingRateHours ? null : closed?.basePay ?? 0,
    windowQuestions,
  };
}
