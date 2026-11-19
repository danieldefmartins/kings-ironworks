// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  TIME_FIX_STRINGS, atDay, canApproveTime, canReviewRequest, fixLines, hhmm, isTimeApprover, lineText, longDay,
  missedOutError, missedOutFor, requestText, shortDay, tf, waitingText,
} from "./time-fix";

const giulia = { id: "g", role: "Office / admin", is_admin: false, can_see_prices: false };
const kayky = { id: "k", role: "Owner", is_admin: true, can_see_prices: true };
const kaio = { id: "kaio", role: "Fabricator", is_admin: false, can_see_prices: false };

describe("who approves time fixes", () => {
  it("the office admin approves and gets the popup; owners can act without the popup; crew cannot", () => {
    expect(isTimeApprover(giulia)).toBe(true);
    expect(canApproveTime(giulia)).toBe(true);
    expect(isTimeApprover(kayky)).toBe(false);
    expect(canApproveTime(kayky)).toBe(true);
    expect(canApproveTime(kaio)).toBe(false);
    // is_admin alone (shop-floor overrides) is not time approval.
    expect(canApproveTime({ id: "x", role: "Fabricator", is_admin: true, can_see_prices: false })).toBe(false);
  });
  it("nobody approves their own time", () => {
    expect(canReviewRequest(giulia, "g")).toBe(false);
    expect(canReviewRequest(giulia, "kaio")).toBe(true);
  });
});

// Kaio, Thu 11/5/2026: clocked in 7:31 AM EST (12:31Z) and never clocked out.
const thursday = { id: "s1", started_at: "2026-11-05T12:31:00Z", ended_at: null, status: "open" };

describe("forgotten clock-out", () => {
  it("asks on Friday morning, defaulting to the 5:00 PM window end, range = that day after the clock-in", () => {
    const q = missedOutFor(thursday, Date.parse("2026-11-06T12:20:00Z"))!;
    expect(q).toMatchObject({ shiftId: "s1", day: "2026-11-05", mode: "open" });
    expect(q.defaultEnd).toBe("2026-11-05T22:00:00.000Z"); // 5:00 PM EST
    expect(q.minEnd).toBe("2026-11-05T12:32:00.000Z");
    expect(q.maxEnd).toBe("2026-11-06T04:59:00.000Z"); // 11:59 PM Thu
    expect(hhmm(q.defaultEnd)).toBe("17:00");
  });
  it("does not ask the same day, nor for a short night across midnight", () => {
    expect(missedOutFor(thursday, Date.parse("2026-11-06T01:00:00Z"))).toBeNull(); // 8 PM Thu
    const evening = { id: "s2", started_at: "2026-11-05T23:00:00Z", ended_at: null }; // 6 PM Thu
    expect(missedOutFor(evening, Date.parse("2026-11-06T06:00:00Z"))).toBeNull(); // 1 AM Fri, 7 h
  });
  it("asks again for a shift a morning tap closed at the wrong time (Kaio's 25.7 h), not for a confirmed one", () => {
    const closed = { ...thursday, ended_at: "2026-11-06T14:13:00Z", status: "submitted" };
    expect(missedOutFor(closed, Date.parse("2026-11-06T14:14:00Z"))).toMatchObject({ mode: "closed", day: "2026-11-05" });
    expect(missedOutFor({ ...closed, status: "approved" }, Date.parse("2026-11-06T14:14:00Z"))).toBeNull();
    expect(missedOutFor({ ...thursday, ended_at: "2026-11-05T22:10:00Z" }, Date.parse("2026-11-06T14:14:00Z"))).toBeNull();
  });
  it("refuses answers before the clock-in or after that day", () => {
    const q = missedOutFor(thursday, Date.parse("2026-11-06T12:20:00Z"))!;
    expect(missedOutError(q, atDay("2026-11-05", "07:00"))).toBe("before");
    expect(missedOutError(q, atDay("2026-11-06", "00:30"))).toBe("after");
    expect(missedOutError(q, atDay("2026-11-05", "19:14"))).toBeNull();
    expect(missedOutError(q, "nonsense")).toBe("bad");
  });
  it("words the question in the worker's language", () => {
    expect(tf("pt", "missedTitle", { day: longDay(thursday.started_at, "pt") })).toBe("Você não marcou a saída de quinta, 5/11. Que horas você saiu?");
    expect(tf("es", "missedTitle", { day: longDay(thursday.started_at, "es") })).toBe("No marcaste la salida del jueves, 5/11. ¿A qué hora saliste?");
    expect(tf("en", "missedTitle", { day: longDay(thursday.started_at, "en") })).toBe("You didn't clock out on Thursday, 11/5. What time did you leave?");
    expect(tf("pt", "missedSaveIn")).toBe("Salvar e marcar entrada agora");
  });
});

describe("requests in plain words", () => {
  it("shows only what changes, BEFORE → AFTER", () => {
    const open = { shiftStart: "2026-11-05T12:31:00Z", shiftEnd: null, askStart: "2026-11-05T12:31:00Z", askEnd: "2026-11-06T00:14:00Z" };
    expect(fixLines(open).map((l) => lineText(l, open.shiftStart, "pt"))).toEqual(["Saída: sem saída → 19:14"]);
    const late = { shiftStart: "2026-11-17T14:15:00Z", shiftEnd: "2026-11-17T22:39:00Z", askStart: "2026-11-17T12:34:00Z", askEnd: "2026-11-17T22:39:00Z" };
    expect(fixLines(late).map((l) => lineText(l, late.shiftStart, "pt"))).toEqual(["Entrada: 9:15 → 7:34"]);
    expect(fixLines(late).map((l) => lineText(l, late.shiftStart, "en"))).toEqual(["Clock-in: 9:15 AM → 7:34 AM"]);
    expect(shortDay(open.shiftStart, "pt")).toBe("qui 5/11");
    expect(shortDay(open.shiftStart, "en")).toBe("Thu 11/5");
    expect(shortDay(open.shiftStart, "es")).toBe("jue 5/11");
  });
  it("marks a time on another day with the weekday", () => {
    const c = { shiftStart: "2026-11-05T12:31:00Z", shiftEnd: "2026-11-06T14:13:00Z", askStart: null, askEnd: "2026-11-06T00:14:00Z" };
    expect(fixLines(c).map((l) => lineText(l, c.shiftStart, "pt"))).toEqual(["Saída: sex 9:13 → 19:14"]);
  });
  it("texts the approver once with the change and the reason", () => {
    const text = requestText("en", { org: "KIW", worker: "Kaio Prates", shiftStart: "2026-11-05T12:31:00Z", lines: ["Clock-out: no clock-out → 7:14 PM"], reason: "Esqueci de bater a saída", link: "https://x/shop/time-fixes" });
    expect(text).toBe('KIW: Kaio asked to fix their time for Thu 11/5 — Clock-out: no clock-out → 7:14 PM. "Esqueci de bater a saída" Open the app to approve: https://x/shop/time-fixes');
    expect(requestText("pt", { org: "KIW", worker: "Kaio Prates", shiftStart: "2026-11-05T12:31:00Z", lines: [], reason: "", link: "L" })).toBe("KIW: Kaio pediu para corrigir o ponto de qui 5/11. Abra o app para aprovar: L");
  });
  it("daily note to the supervisors", () => {
    const now = Date.parse("2026-11-19T14:00:00Z");
    const oldest = "2026-11-17T22:48:17Z"; // Tue
    expect(waitingText("en", { org: "KIW", count: 2, approver: "Giulia", oldest, now, link: "L" })).toBe("KIW: 2 time fixes waiting for Giulia since Tue. L");
    expect(waitingText("pt", { org: "KIW", count: 2, approver: "Giulia", oldest, now, link: "L" })).toBe("KIW: 2 correções de ponto esperando a Giulia desde ter. L");
    expect(waitingText("en", { org: "KIW", count: 1, approver: "Giulia", oldest: "2026-10-08T21:50:00Z", now, link: "L" })).toBe("KIW: 1 time fix waiting for Giulia since 10/8. L");
  });
  it("the worker sees who approves", () => {
    expect(tf("pt", "sentTo", { name: "Giulia" })).toBe("Enviado para a Giulia aprovar");
    expect(tf("pt", "statusPending", { name: "Giulia" })).toBe("Pendente — esperando a Giulia");
  });
  it("every screen string exists in en, pt and es", () => {
    const keys = Object.keys(TIME_FIX_STRINGS.en).sort();
    expect(Object.keys(TIME_FIX_STRINGS.pt).sort()).toEqual(keys);
    expect(Object.keys(TIME_FIX_STRINGS.es).sort()).toEqual(keys);
  });
});
