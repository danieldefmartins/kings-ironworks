// Keep unsent punches on this device, bound to the worker who tapped them.
export type QueuedPunch = {
  punchId: string; workerId?: string; shiftId?: string;
  type: "shift_start" | "shift_stop"; clientAt: string; review?: string;
};
export type PunchResult =
  | { ok: true; shiftId: string | null; at: string | null; late: boolean }
  | { ok: false; error: string; final: boolean; signIn: boolean };
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
    return { ok: false, error: data.error || "Could not update the clock", final: data.final === true, signIn: res.status === 401 };
  } finally { clearTimeout(timer); }
}
