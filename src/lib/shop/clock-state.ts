import { getOpenShift, getShiftBreaks, getWorkerRate, listWorkerBreaks, listWorkerShifts } from "@/lib/shop/db";
import { calculatePayroll, payrollWeek } from "@/lib/shop/payroll";

export async function loadClockState(worker: { id: string } | null, now = Date.now()) {
  if (!worker) return { shift: null, breaks: [], hourlyRate: null, weekHoursBeforeShift: 0, weekEarningsBeforeShift: 0 };
  const week = payrollWeek(undefined, now);
  const [shift, rate, weekShifts, weekBreaks] = await Promise.all([
    getOpenShift(worker.id), getWorkerRate(worker.id),
    listWorkerShifts(worker.id, week.start), listWorkerBreaks(worker.id, week.start),
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
  };
}
