// Payroll work-hours window — "their working hours are 7:30am to 5pm".
//
// The owner's rule, verbatim: a clock-in before the start, or a clock-out
// after the end, counts at the window edge unless the team leader asked for
// it. The worker is asked right after the punch; "yes" keeps the actual tap
// time and puts the shift in front of the owner to check, "no" (or no answer
// at all) keeps the edge.
//
// This module is pure and client-safe (no env, no Supabase): the server
// decides, the phone renders, and the tests pin the arithmetic. Only the
// PAYROLL clock is affected. The project clock (job costing) is a separate
// clock and stays on actual tap times.
//
// Where the state lives: the window decisions are rows in the immutable audit
// log (action "shift_window"), one per change, latest wins. The tap time is
// written there BEFORE the shift's started_at/ended_at is moved to the edge,
// so the actual time can never be lost, and every answer and owner review is
// history rather than an overwrite. The shift row itself stays clean — no
// caveat text in employee_note/manager_note.

import { SHOP_TZ, fromShopInput, shopDateKey } from "./shared";

export interface ApprovalContact {
  name: string;
  /** E.164, e.g. +18578881468 */
  phone: string;
  /** Language their texts are written in. Owner rule: default pt-BR. */
  lang: ContactLang;
}

export type ContactLang = "en" | "pt" | "es";
export function contactLang(l: unknown): ContactLang {
  return l === "en" || l === "es" || l === "pt" ? l : "pt";
}

export interface WorkHoursSettings {
  enabled: boolean;
  /** "HH:MM", 24h, shop wall-clock time. */
  start: string;
  end: string;
  timeZone: string;
  contacts: ApprovalContact[];
}

export const DEFAULT_WORK_HOURS: WorkHoursSettings = {
  enabled: true,
  start: "07:30",
  end: "17:00",
  timeZone: SHOP_TZ,
  contacts: [
    { name: "Kayky", phone: "+18578881468", lang: "pt" },
    { name: "Daniel", phone: "+18572369442", lang: "en" },
  ],
};

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Normalise a US or international phone number to E.164, or null. */
export function toE164(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function validZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

/** Fill gaps from the defaults; never trust a stored or posted shape. */
export function resolveWorkHours(raw: unknown, fallback: WorkHoursSettings = DEFAULT_WORK_HOURS): WorkHoursSettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const start = typeof o.start === "string" && HHMM.test(o.start) ? o.start : fallback.start;
  const end = typeof o.end === "string" && HHMM.test(o.end) ? o.end : fallback.end;
  const contacts = Array.isArray(o.contacts)
    ? o.contacts
        .map((c) => {
          const r = (c || {}) as Record<string, unknown>;
          const phone = toE164(r.phone);
          const name = typeof r.name === "string" ? r.name.trim().slice(0, 60) : "";
          return phone && name ? { name, phone, lang: contactLang(r.lang) } : null;
        })
        .filter((c): c is ApprovalContact => !!c)
        .slice(0, 10)
    : fallback.contacts;
  const ok = start < end;
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : fallback.enabled,
    start: ok ? start : fallback.start,
    end: ok ? end : fallback.end,
    timeZone: validZone(o.timeZone) ? o.timeZone : fallback.timeZone,
    contacts,
  };
}

/** The window's two edges on the shop-calendar day containing `at`. */
export function windowFor(at: string | number | Date, s: WorkHoursSettings): { day: string; startMs: number; endMs: number } {
  const day = shopDateKey(at, s.timeZone);
  return {
    day,
    startMs: Date.parse(fromShopInput(`${day}T${s.start}`, s.timeZone)),
    endMs: Date.parse(fromShopInput(`${day}T${s.end}`, s.timeZone)),
  };
}

export type WindowEdge = "start" | "end";
/**
 * pending  — rounded to the edge, the worker has not answered yet
 * no       — worker: not requested (edge stands)
 * yes      — worker: the team leader asked (actual time, owner to check)
 * approved — owner kept the actual time
 * denied   — owner moved it back to the edge
 */
export type WindowAnswer = "pending" | "no" | "yes" | "approved" | "denied";

/** What one shift_window audit row carries (detail jsonb). */
export interface WindowRecord {
  shiftId: string;
  workerId: string;
  edge: WindowEdge;
  /** The actual tap time. */
  punchedAt: string;
  /** The window edge on the shift's day (7:30 / 5:00 pm). */
  edgeAt: string;
  answer: WindowAnswer;
  /** False when nothing is asked (an "end" record kept only so a
   *  restored early start can restore the end that was pinned to it). */
  ask: boolean;
  at: string;
}

/** What the phone needs to ask one question (client-safe shape). */
export interface WindowQuestion { shiftId: string; edge: WindowEdge; punchedAt: string; edgeAt: string }

export function keepsActual(answer: WindowAnswer): boolean {
  return answer === "yes" || answer === "approved";
}

/** A clock-in before the window start rounds up to it. */
export function startDecision(punchAt: string, s: WorkHoursSettings): { edgeAt: string } | null {
  if (!s.enabled) return null;
  const { startMs } = windowFor(punchAt, s);
  return Date.parse(punchAt) < startMs ? { edgeAt: new Date(startMs).toISOString() } : null;
}

/**
 * A clock-out after the window end of the day the shift STARTED on rounds
 * down to it — so a forgotten clock-out closed the next morning (outbox flush
 * or the owner closing a stale shift) still lands on 5:00 pm that day.
 * `actualStart` is the actual tap time of the clock-in (not the rounded one).
 */
export function endDecision(actualStart: string, punchAt: string, s: WorkHoursSettings): { edgeAt: string; ask: boolean } {
  const { endMs } = windowFor(actualStart, s);
  return { edgeAt: new Date(endMs).toISOString(), ask: s.enabled && Date.parse(punchAt) > endMs };
}

/** Latest record per edge (rows may arrive in any order). */
export function latestByEdge(rows: WindowRecord[]): Partial<Record<WindowEdge, WindowRecord>> {
  const out: Partial<Record<WindowEdge, WindowRecord>> = {};
  for (const r of [...rows].sort((a, b) => a.at.localeCompare(b.at))) out[r.edge] = r;
  return out;
}

/**
 * The payroll start/end a shift should carry, from the actual taps and the
 * answers so far. Pure: every answer and review recomputes from scratch, so
 * "No" then "Yes" then "denied" can never compound.
 *
 * `current` is the shift row as stored — used for an edge that has no window
 * record (inside the window, or edited by the owner before any record).
 */
export function payrollTimes(
  current: { started_at: string; ended_at: string | null },
  rows: WindowRecord[],
): { started_at: string; ended_at: string | null } {
  const last = latestByEdge(rows);
  let s = Date.parse(current.started_at);
  if (last.start) s = keepsActual(last.start.answer) ? Date.parse(last.start.punchedAt) : Date.parse(last.start.edgeAt);
  if (current.ended_at == null) return { started_at: new Date(s).toISOString(), ended_at: null };
  let e = Date.parse(current.ended_at);
  if (last.end) {
    const actual = Date.parse(last.end.punchedAt);
    e = keepsActual(last.end.answer) ? actual : Math.min(actual, Date.parse(last.end.edgeAt));
  }
  // A shift entirely before the window, rounded up, pays zero — never negative.
  if (e < s) e = s;
  return { started_at: new Date(s).toISOString(), ended_at: new Date(e).toISOString() };
}

/** Questions still waiting for this worker's answer. */
export function pendingQuestions(rows: WindowRecord[]): WindowRecord[] {
  const byShift = new Map<string, WindowRecord[]>();
  for (const r of rows) byShift.set(r.shiftId, [...(byShift.get(r.shiftId) || []), r]);
  const out: WindowRecord[] = [];
  for (const list of byShift.values()) {
    const last = latestByEdge(list);
    for (const edge of ["start", "end"] as const) {
      const r = last[edge];
      if (r && r.ask && r.answer === "pending") out.push(r);
    }
  }
  return out.sort((a, b) => a.punchedAt.localeCompare(b.punchedAt));
}

/** Extra time the worker says was requested — the owner's to-check list. */
export function toCheck(rows: WindowRecord[]): WindowRecord[] {
  const byShift = new Map<string, WindowRecord[]>();
  for (const r of rows) byShift.set(r.shiftId, [...(byShift.get(r.shiftId) || []), r]);
  const out: WindowRecord[] = [];
  for (const list of byShift.values()) {
    const last = latestByEdge(list);
    for (const edge of ["start", "end"] as const) if (last[edge]?.answer === "yes") out.push(last[edge]!);
  }
  return out.sort((a, b) => b.punchedAt.localeCompare(a.punchedAt));
}

/** Parse an audit row's detail back into a record; null if malformed. */
export function recordFromAudit(row: { at: string; detail: unknown }): WindowRecord | null {
  const d = (row.detail || {}) as Record<string, unknown>;
  if (typeof d.shiftId !== "string" || typeof d.workerId !== "string") return null;
  if (d.edge !== "start" && d.edge !== "end") return null;
  if (typeof d.punchedAt !== "string" || typeof d.edgeAt !== "string") return null;
  if (!["pending", "no", "yes", "approved", "denied"].includes(String(d.answer))) return null;
  return {
    shiftId: d.shiftId, workerId: d.workerId, edge: d.edge, punchedAt: d.punchedAt, edgeAt: d.edgeAt,
    answer: d.answer as WindowAnswer, ask: d.ask !== false, at: row.at,
  };
}
