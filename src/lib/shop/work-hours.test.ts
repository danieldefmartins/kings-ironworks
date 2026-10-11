import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORK_HOURS, endDecision, payrollTimes, pendingQuestions, recordFromAudit, resolveWorkHours,
  startDecision, toCheck, toE164, windowFor, type WindowRecord,
} from "./work-hours";

const S = DEFAULT_WORK_HOURS;
// 2026-10-13 is a Tuesday in EDT (UTC-4): 7:30 = 11:30Z, 17:00 = 21:00Z.
const rec = (p: Partial<WindowRecord>): WindowRecord => ({
  shiftId: "s1", workerId: "w1", edge: "start", punchedAt: "", edgeAt: "", answer: "pending", ask: true, at: "2026-10-13T12:00:00Z", ...p,
});

describe("work-hours window", () => {
  it("defaults to 7:30–17:00 New York with Kayky (pt) and Daniel (en)", () => {
    expect(S).toMatchObject({ start: "07:30", end: "17:00", timeZone: "America/New_York", enabled: true });
    expect(S.contacts).toEqual([
      { name: "Kayky", phone: "+18578881468", lang: "pt" },
      { name: "Daniel", phone: "+18572369442", lang: "en" },
    ]);
  });

  it("edges are shop time, not server (UTC) time", () => {
    const w = windowFor("2026-10-13T15:00:00Z", S);
    expect(new Date(w.startMs).toISOString()).toBe("2026-10-13T11:30:00.000Z");
    expect(new Date(w.endMs).toISOString()).toBe("2026-10-13T21:00:00.000Z");
  });

  it("follows DST: winter edges are an hour later in UTC", () => {
    const w = windowFor("2026-12-01T15:00:00Z", S);
    expect(new Date(w.startMs).toISOString()).toBe("2026-12-01T12:30:00.000Z");
    expect(new Date(w.endMs).toISOString()).toBe("2026-12-01T22:00:00.000Z");
  });

  it("DST-change Sunday (Nov 1 2026): edges use the post-change offset", () => {
    const w = windowFor("2026-11-01T14:00:00Z", S);
    expect(new Date(w.startMs).toISOString()).toBe("2026-11-01T12:30:00.000Z"); // 7:30 EST
    expect(new Date(w.endMs).toISOString()).toBe("2026-11-01T22:00:00.000Z");
  });

  it("an evening punch near UTC midnight stays on its own shop day (Sunday edge)", () => {
    // Sun Oct 11 2026 20:30 EDT = Mon 00:30Z. Its window is Sunday's.
    const w = windowFor("2026-10-12T00:30:00Z", S);
    expect(w.day).toBe("2026-10-11");
    expect(endDecision("2026-10-11T19:00:00Z", "2026-10-12T00:30:00Z", S)).toEqual({ edgeAt: "2026-10-11T21:00:00.000Z", ask: true });
  });

  it("clock-in before start rounds up to 7:30; at or after it does not", () => {
    expect(startDecision("2026-10-13T10:52:00.000Z", S)).toEqual({ edgeAt: "2026-10-13T11:30:00.000Z" });
    expect(startDecision("2026-10-13T11:30:00.000Z", S)).toBeNull();
    expect(startDecision("2026-10-13T12:05:00.000Z", S)).toBeNull();
    expect(startDecision("2026-10-13T10:52:00.000Z", { ...S, enabled: false })).toBeNull();
  });

  it("clock-out after end asks; inside the window it does not", () => {
    expect(endDecision("2026-10-13T11:30:00Z", "2026-10-13T22:10:00Z", S)).toEqual({ edgeAt: "2026-10-13T21:00:00.000Z", ask: true });
    expect(endDecision("2026-10-13T11:30:00Z", "2026-10-13T20:59:00Z", S).ask).toBe(false);
  });

  it("outbox clock-out sent the next morning still caps at 5 pm of the day the shift started", () => {
    const d = endDecision("2026-10-13T11:20:00Z", "2026-10-14T12:15:00Z", S);
    expect(d).toEqual({ edgeAt: "2026-10-13T21:00:00.000Z", ask: true });
    const times = payrollTimes(
      { started_at: "2026-10-13T11:30:00Z", ended_at: "2026-10-14T12:15:00Z" },
      [rec({ edge: "start", punchedAt: "2026-10-13T11:20:00Z", edgeAt: "2026-10-13T11:30:00.000Z" }),
       rec({ edge: "end", punchedAt: "2026-10-14T12:15:00Z", edgeAt: d.edgeAt, at: "2026-10-14T12:15:01Z" })],
    );
    expect(times).toEqual({ started_at: "2026-10-13T11:30:00.000Z", ended_at: "2026-10-13T21:00:00.000Z" });
  });
});

describe("payrollTimes", () => {
  const start = rec({ edge: "start", punchedAt: "2026-10-13T10:52:00.000Z", edgeAt: "2026-10-13T11:30:00.000Z" });

  it("no answer / No → the edge", () => {
    expect(payrollTimes({ started_at: start.punchedAt, ended_at: null }, [start]).started_at).toBe("2026-10-13T11:30:00.000Z");
    const no = { ...start, answer: "no" as const, at: "2026-10-13T12:01:00Z" };
    expect(payrollTimes({ started_at: start.edgeAt, ended_at: null }, [start, no]).started_at).toBe("2026-10-13T11:30:00.000Z");
  });

  it("Yes after rounding restores the actual tap time", () => {
    const yes = { ...start, answer: "yes" as const, at: "2026-10-13T12:01:00Z" };
    expect(payrollTimes({ started_at: start.edgeAt, ended_at: null }, [start, yes]).started_at).toBe("2026-10-13T10:52:00.000Z");
  });

  it("owner denial moves it back to the edge; approval keeps it", () => {
    const yes = { ...start, answer: "yes" as const, at: "2026-10-13T12:01:00Z" };
    const denied = { ...start, answer: "denied" as const, at: "2026-10-13T13:00:00Z" };
    const approved = { ...start, answer: "approved" as const, at: "2026-10-13T13:00:00Z" };
    expect(payrollTimes({ started_at: start.punchedAt, ended_at: null }, [start, yes, denied]).started_at).toBe("2026-10-13T11:30:00.000Z");
    expect(payrollTimes({ started_at: start.edgeAt, ended_at: null }, [start, yes, approved]).started_at).toBe("2026-10-13T10:52:00.000Z");
  });

  it("stay late: No caps at 5 pm, Yes keeps the actual clock-out", () => {
    const end = rec({ edge: "end", punchedAt: "2026-10-13T22:40:00.000Z", edgeAt: "2026-10-13T21:00:00.000Z", at: "2026-10-13T22:40:01Z" });
    const row = { started_at: "2026-10-13T11:30:00.000Z", ended_at: end.punchedAt };
    expect(payrollTimes(row, [end]).ended_at).toBe("2026-10-13T21:00:00.000Z");
    expect(payrollTimes(row, [end, { ...end, answer: "yes", at: "2026-10-13T22:41:00Z" }]).ended_at).toBe("2026-10-13T22:40:00.000Z");
  });

  it("a shift entirely before the window pays zero, and Yes on the start restores it", () => {
    const end = rec({ edge: "end", punchedAt: "2026-10-13T11:10:00.000Z", edgeAt: "2026-10-13T21:00:00.000Z", answer: "no", ask: false, at: "2026-10-13T11:10:01Z" });
    const row = { started_at: "2026-10-13T11:30:00.000Z", ended_at: "2026-10-13T11:30:00.000Z" };
    expect(payrollTimes(row, [start, end])).toEqual({ started_at: "2026-10-13T11:30:00.000Z", ended_at: "2026-10-13T11:30:00.000Z" });
    const yes = { ...start, answer: "yes" as const, at: "2026-10-13T12:00:00Z" };
    expect(payrollTimes(row, [start, end, yes])).toEqual({ started_at: "2026-10-13T10:52:00.000Z", ended_at: "2026-10-13T11:10:00.000Z" });
  });

  it("leaves edges with no record untouched", () => {
    const row = { started_at: "2026-10-13T12:00:00.000Z", ended_at: "2026-10-13T20:00:00.000Z" };
    expect(payrollTimes(row, [])).toEqual(row);
  });
});

describe("questions and the owner list", () => {
  const a = rec({ shiftId: "a", edge: "start", punchedAt: "2026-10-13T10:52:00Z", edgeAt: "2026-10-13T11:30:00Z" });
  const b = rec({ shiftId: "b", edge: "end", punchedAt: "2026-10-12T22:30:00Z", edgeAt: "2026-10-12T21:00:00Z", at: "2026-10-12T22:31:00Z" });
  const hidden = rec({ shiftId: "c", edge: "end", ask: false, answer: "no", punchedAt: "x", edgeAt: "y" });

  it("pending questions survive until answered (outbox punch, app closed)", () => {
    expect(pendingQuestions([a, b, hidden]).map((q) => q.shiftId)).toEqual(["b", "a"]);
    expect(pendingQuestions([a, { ...a, answer: "no", at: "2026-10-13T13:00:00Z" }])).toEqual([]);
  });

  it("owner sees only Yes answers not yet reviewed", () => {
    const yes = { ...a, answer: "yes" as const, at: "2026-10-13T13:00:00Z" };
    expect(toCheck([a, yes, b]).map((r) => r.shiftId)).toEqual(["a"]);
    expect(toCheck([a, yes, { ...a, answer: "approved", at: "2026-10-13T14:00:00Z" }])).toEqual([]);
  });

  it("parses audit rows defensively", () => {
    expect(recordFromAudit({ at: "t", detail: { shiftId: "s", workerId: "w", edge: "start", punchedAt: "p", edgeAt: "e", answer: "yes" } })).toMatchObject({ ask: true, answer: "yes" });
    expect(recordFromAudit({ at: "t", detail: { shiftId: "s" } })).toBeNull();
    expect(recordFromAudit({ at: "t", detail: null })).toBeNull();
  });
});

describe("settings", () => {
  it("normalises phones and languages, defaulting language to Portuguese", () => {
    expect(toE164("(857) 888-1468")).toBe("+18578881468");
    expect(toE164("1 857 236 9442")).toBe("+18572369442");
    expect(toE164("555")).toBeNull();
    const s = resolveWorkHours({ start: "06:45", end: "16:30", contacts: [{ name: "Jairo", phone: "617-555-0100", lang: "es" }, { name: "X", phone: "617-555-0101" }, { name: "Bad", phone: "12" }] });
    expect(s.start).toBe("06:45");
    expect(s.contacts).toEqual([{ name: "Jairo", phone: "+16175550100", lang: "es" }, { name: "X", phone: "+16175550101", lang: "pt" }]);
  });

  it("rejects an end before the start and bad zones", () => {
    const s = resolveWorkHours({ start: "18:00", end: "07:00", timeZone: "Mars/Base" });
    expect([s.start, s.end, s.timeZone]).toEqual(["07:30", "17:00", "America/New_York"]);
  });
});
