// Payroll punch timing.
//
// A punch can reach the server late. The phone may be in a dead spot on the
// way out of the shop, the tab may get frozen the instant the screen locks,
// or the request may simply never leave — which is exactly what happened to
// Kaio on 9/23 and 9/24: the server log shows his phone loading pages at
// 6:51 PM and 6:03 PM and no punch ever arriving. The shell now keeps the
// punch on the phone and re-sends it, so the server has to accept a punch
// whose tap time (`clientAt`) is earlier than its arrival time — inside
// strict bounds, because this number is pay.

/** A clock-out may trail its tap by up to this long (a forgotten phone that
 *  flushes the next morning). */
export const PUNCH_MAX_STOP_DELAY_MS = 36 * 3600 * 1000;
/** A clock-in that is older than this is not a clock-in any more; a queued
 *  "start" from yesterday would open a shift that then runs forever. */
export const PUNCH_MAX_START_DELAY_MS = 14 * 3600 * 1000;
/** Phone clocks drift; a tap "from the future" inside this window is now. */
export const PUNCH_CLOCK_SKEW_MS = 2 * 60 * 1000;
/** Beyond this the delay is worth a note on the shift for the owner to see. */
export const PUNCH_LATE_AFTER_MS = 2 * 60 * 1000;
/** An open shift older than this is almost certainly a missed clock-out. */
export const STALE_SHIFT_HOURS = 15;

export type PunchReason = "received" | "client" | "invalid" | "future" | "too_old" | "before_start";

export interface PunchTime {
  /** The instant to record, ISO. */
  at: string;
  /** How long after the tap the server saw it (0 when the tap time was not usable). */
  delayMs: number;
  /** True when the punch was clearly queued on the phone, not just slow. */
  late: boolean;
  /** Why `at` is what it is — audited so any backdating is visible. */
  reason: PunchReason;
}

/**
 * Decide the instant a punch is recorded at.
 *
 * `clientAt` is the phone's tap time (untrusted). `receivedAt` is the server
 * clock. `notBefore` is the open shift's start for a clock-out: a punch that
 * predates the shift it would close is a stale queued punch and is reported
 * as `before_start` so the caller can refuse it rather than close the wrong
 * shift.
 */
export function resolvePunchAt(
  clientAt: unknown,
  receivedAt: number,
  opts: { kind: "start" | "stop"; notBefore?: number | null } = { kind: "stop" }
): PunchTime {
  const received = (reason: PunchReason): PunchTime => ({ at: new Date(receivedAt).toISOString(), delayMs: 0, late: false, reason });
  if (typeof clientAt !== "string" || clientAt === "") return received("received");
  const t = Date.parse(clientAt);
  if (!Number.isFinite(t)) return received("invalid");
  if (t > receivedAt + PUNCH_CLOCK_SKEW_MS) return received("future");
  const maxDelay = opts.kind === "start" ? PUNCH_MAX_START_DELAY_MS : PUNCH_MAX_STOP_DELAY_MS;
  if (t < receivedAt - maxDelay) return received("too_old");
  if (opts.notBefore != null && t < opts.notBefore) return received("before_start");
  const at = Math.min(t, receivedAt);
  const delayMs = receivedAt - at;
  return { at: new Date(at).toISOString(), delayMs, late: delayMs > PUNCH_LATE_AFTER_MS, reason: "client" };
}

/** Owner-facing note appended to a shift whose punch arrived late. */
export function lateNote(kind: "in" | "out", tapped: string, received: string, fmt: (iso: string) => string): string {
  return `Clock-${kind} tapped ${fmt(tapped)}, reached the server ${fmt(received)} (sent late from the phone).`;
}
