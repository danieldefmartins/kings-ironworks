// Payroll clock rules shared by the KIW shop app and 360 CRM's time clock.
//
// KEEP IN SYNC: the same file lives at
//   kings-ironworks  src/lib/shop/clock-rules.ts
//   360-crm          server/src/modules/timeclock/clock-rules.ts
// Both apps must compute the same pay from the same punches.
//
// Found 2026-11 reconciling a worker's Oct 19–24 hours against a third-party
// timesheet the owner confirmed as correct:
//
//  1. Whole minutes. A punch counts from the minute it was tapped (7:45:18 is
//     7:45). Both ends are floored, so it never favours either side by more
//     than a minute and the totals match a paper card / third-party sheet to
//     the minute instead of drifting by seconds.
//  2. A forgotten clock-out is never paid as worked time. A shift longer than
//     MAX_SHIFT_HOURS (a clock-out tapped the next morning, or never tapped)
//     is held out of pay — visibly, "needs review" — until someone with
//     authority confirms the real time. It is never silently paid as a
//     24-hour day and never silently paid as zero.
//  3. A worker's own pending correction holds the shift the same way: they
//     have told us the stored time is wrong.

/** Real KIW days reach ~15.7 h; every forgotten clock-out seen was 23 h+. */
export const MAX_SHIFT_HOURS = 16;

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

/** The start of the minute containing `ms`. */
export function floorToMinute(ms: number): number {
  return Math.floor(ms / MINUTE_MS) * MINUTE_MS;
}

/** Payable milliseconds between two instants, on whole-minute punches. */
export function payableSpanMs(startMs: number, endMs: number): number {
  return Math.max(0, floorToMinute(endMs) - floorToMinute(startMs));
}

/**
 * Payable milliseconds for one shift: whole-minute span minus unpaid breaks
 * (each break also on whole minutes, clipped to the shift, overlaps merged).
 */
export function payableShiftMs(
  startMs: number,
  endMs: number,
  unpaidBreaks: ReadonlyArray<readonly [number, number]> = [],
): number {
  const s = floorToMinute(startMs);
  const e = floorToMinute(endMs);
  if (!(e > s)) return 0;
  const intervals = unpaidBreaks
    .map(
      ([a, b]) =>
        [Math.max(s, floorToMinute(a)), Math.min(e, floorToMinute(b))] as const,
    )
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  let unpaid = 0;
  let cursor = s;
  for (const [a, b] of intervals) {
    unpaid += Math.max(0, b - Math.max(a, cursor));
    cursor = Math.max(cursor, b);
  }
  return Math.max(0, e - s - unpaid);
}

/** True when a shift (closed, or still open at `now`) is too long to be real. */
export function isMissedClockOut(
  startMs: number,
  endMs: number | null,
  now: number,
  maxHours: number = MAX_SHIFT_HOURS,
): boolean {
  return (endMs ?? now) - startMs > maxHours * HOUR_MS;
}

export type ShiftHold = "missed_clock_out" | "correction_pending";

/**
 * Why a shift's hours must not be paid yet, or null when they can be.
 * An owner/manager approval of the shift as it stands releases a long shift
 * (a confirmed real long day); a pending correction always holds.
 */
export function shiftHold(
  shift: {
    startMs: number;
    endMs: number | null;
    approved?: boolean;
    correctionPending?: boolean;
  },
  now: number,
  maxHours: number = MAX_SHIFT_HOURS,
): ShiftHold | null {
  if (shift.correctionPending) return "correction_pending";
  if (shift.approved && shift.endMs != null) return null;
  return isMissedClockOut(shift.startMs, shift.endMs, now, maxHours)
    ? "missed_clock_out"
    : null;
}
