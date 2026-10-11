// Keep unsent punches on this device, bound to the worker who tapped them.
export type QueuedPunch = {
  punchId: string; workerId?: string; shiftId?: string;
  type: "shift_start" | "shift_stop"; clientAt: string; review?: string;
  /** Where the tap happened — required by the server for a clock-in. */
  lat?: number; lng?: number; accuracy?: number | null;
};
export type PunchResult =
  | { ok: true; shiftId: string | null; at: string | null; late: boolean }
  | { ok: false; error: string; final: boolean; signIn: boolean; locationRequired?: boolean };
const KEY = "kiw-punch-outbox";
export function readOutbox(): QueuedPunch[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? value.filter(p => p && typeof p.punchId === "string" && typeof p.clientAt === "string" && (p.type === "shift_start" || p.type === "shift_stop")) : [];
  } catch { return []; }
}
export function writeOutbox(items: QueuedPunch[]): boolean {
  try { window.localStorage.setItem(KEY, JSON.stringify(items)); return true; }
  catch { return false; }
}
export function removeFromOutbox(id: string) { writeOutbox(readOutbox().filter(p => p.punchId !== id)); }
export function flagPunch(id: string, reason: string) { writeOutbox(readOutbox().map(p => p.punchId === id ? { ...p, review: reason } : p)); }
export function pendingPunches(workerId: string): QueuedPunch[] {
  return readOutbox().filter(p => p.workerId === workerId && !p.review).sort((a, b) => Date.parse(a.clientAt) - Date.parse(b.clientAt));
}
/**
 * Record a tap on this device. A tap is NEVER dropped (André, 10/10: a
 * clock-out tapped while a background sync was running vanished without a
 * trace). The only dedupe is a repeated tap of the same kind while that kind
 * is still the newest unsent punch — "I tapped clock-out twice" is one
 * clock-out. Returns null only when the device cannot store anything.
 */
export function queueTap(
  workerId: string, type: QueuedPunch["type"], shiftId: string | null | undefined, now: Date = new Date(),
  loc?: { lat: number; lng: number; accuracy: number | null } | null,
): { punch: QueuedPunch; added: boolean } | null {
  const pending = pendingPunches(workerId);
  const last = pending[pending.length - 1];
  if (last && last.type === type) return { punch: last, added: false };
  const punch: QueuedPunch = {
    punchId: crypto.randomUUID(), workerId, type, clientAt: now.toISOString(),
    ...(type === "shift_stop" && shiftId ? { shiftId } : {}),
    ...(loc ? { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy } : {}),
  };
  return writeOutbox([...readOutbox(), punch]) ? { punch, added: true } : null;
}

// "Tried to clock in but had no location" reports for the office. Kept on the
// phone until the server has them, so a phone with no signal still reports on
// its next open.
export type BlockedReport = { id: string; workerId: string; reason: "denied" | "unavailable" | "timeout"; tapAt: string; userAgent: string };
const BLOCKED_KEY = "kiw-clockin-blocked";
function readBlocked(): BlockedReport[] {
  try { const v = JSON.parse(window.localStorage.getItem(BLOCKED_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function writeBlocked(items: BlockedReport[]) {
  try { window.localStorage.setItem(BLOCKED_KEY, JSON.stringify(items.slice(-20))); } catch { /* best effort */ }
}
export function queueBlockedReport(r: Omit<BlockedReport, "id">): void {
  writeBlocked([...readBlocked(), { ...r, id: crypto.randomUUID() }]);
}
export async function flushBlockedReports(workerId: string): Promise<void> {
  for (const r of readBlocked().filter((x) => x.workerId === workerId)) {
    try {
      const res = await fetch("/shop/api/action", {
        method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
        body: JSON.stringify({ type: "clock_in_blocked", reason: r.reason, tapAt: r.tapAt, userAgent: r.userAgent }),
      });
      if (!res.ok && res.status !== 400) return; // keep it; try on the next open
    } catch { return; }
    writeBlocked(readBlocked().filter((x) => x.id !== r.id));
  }
}

export async function sendPunch(p: QueuedPunch): Promise<PunchResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch("/shop/api/action", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p), keepalive: true, signal: ctrl.signal,
    });
    const data = await res.json(); // A proxy/invalid response is never a receipt.
    if (res.ok && data.ok === true) return { ok: true, shiftId: typeof data.shiftId === "string" ? data.shiftId : null, at: typeof data.at === "string" ? data.at : null, late: !!data.late };
    if (res.ok || res.status >= 500 || res.status === 408 || res.status === 429) throw new Error("Clock connection interrupted");
    return { ok: false, error: data.error || "Could not update the clock", final: data.final === true, signIn: res.status === 401, locationRequired: data.locationRequired === true };
  } finally { clearTimeout(timer); }
}
