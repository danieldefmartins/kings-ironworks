import { getOpenShift, getShiftBreaks, getWorkerRate, listWorkerBreaks, listWorkerShifts } from "@/lib/shop/db";
import { canViewOwnerFinancials } from "./shared";
import { calculatePayroll, payrollWeek } from "@/lib/shop/payroll";
import { pendingQuestions, type WindowQuestion } from "./work-hours";
import { QUESTION_DAYS, listWindowRecords } from "./work-hours-db";
import { findMissedOut } from "./time-fix-db";
import type { MissedOut } from "./time-fix";

// "You didn't clock out on Thursday — what time did you leave?" Best-effort:
// the clock must load even when this lookup fails.
async function loadMissedOut(workerId: string, open: Awaited<ReturnType<typeof getOpenShift>>, now: number): Promise<MissedOut | null> {
  try { return await findMissedOut(workerId, open, now); }
  catch (err) { console.error("[time-fix] missed-out lookup failed:", err); return null; }
}

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
  if (!worker || canViewOwnerFinancials(worker)) return { shift: null, breaks: [], hourlyRate: null, weekHoursBeforeShift: 0, weekEarningsBeforeShift: 0, windowQuestions: [] as WindowQuestion[], missedOut: null as MissedOut | null };
  const week = payrollWeek(undefined, now);
  const [shift, rate, weekShifts, weekBreaks, windowQuestions] = await Promise.all([
    getOpenShift(worker.id), getWorkerRate(worker.id),
    listWorkerShifts(worker.id, week.start), listWorkerBreaks(worker.id, week.start),
    loadWindowQuestions(worker.id),
  ]);
  // Use the same rules as owner payroll: rejected records remain in history,
  // but never contribute to pay; shifts and breaks stop at week boundaries.
  const closed = calculatePayroll([], weekShifts.filter(s => s.id !== shift?.id), weekBreaks, week, now).find(row => row.id === worker.id);
  const [breaks, missedOut] = await Promise.all([shift ? getShiftBreaks(shift.id) : Promise.resolve([]), loadMissedOut(worker.id, shift, now)]);
  return {
    shift, breaks,
    hourlyRate: shift?.pay_rate == null ? rate : Number(shift.pay_rate),
    weekHoursBeforeShift: closed?.hours ?? 0,
    weekEarningsBeforeShift: closed?.missingRateHours ? null : closed?.basePay ?? 0,
    windowQuestions,
    missedOut,
  };
}
