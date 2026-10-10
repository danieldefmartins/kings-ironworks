import { getOpenShift, getShiftBreaks, getWorkerRate, listWorkerBreaks, listWorkerShifts, shiftHours } from "@/lib/shop/db";
import { shopWeekStartIso } from "@/lib/shop/shared";

export async function loadClockState(worker: { id: string } | null) {
  let shift = null;
  let breaks: Awaited<ReturnType<typeof getShiftBreaks>> = [];
  let hourlyRate: number | null = null;
  let weekHoursBeforeShift = 0;
  if (worker) {
    try {
      // Monday of the current week in SHOP time. Deriving it from the server's
      // own calendar put the boundary in UTC, which starts the week five hours
      // early and moves Sunday-evening work into the wrong one.
      const weekIso = shopWeekStartIso();
      // The payroll shell asks for payroll facts only. It used to also load the
      // running project entry and the whole job list to feed a job picker that
      // no longer exists — the shell has no business knowing which job anyone
      // is on.
      const [openShift, rate, weekShifts, weekBreaks] = await Promise.all([
        getOpenShift(worker.id), getWorkerRate(worker.id),
        listWorkerShifts(worker.id, weekIso), listWorkerBreaks(worker.id, weekIso),
      ]);
      shift = openShift;
      hourlyRate = openShift?.pay_rate == null ? rate : Number(openShift.pay_rate);
      weekHoursBeforeShift = weekShifts.filter((s) => s.id !== openShift?.id).reduce((sum, s) => sum + shiftHours(s, weekBreaks.filter((b) => b.shift_id === s.id)), 0);
      if (shift) breaks = await getShiftBreaks(shift.id);
    } catch (error) { throw error; }
  }
  return { shift, breaks, hourlyRate, weekHoursBeforeShift };
}
