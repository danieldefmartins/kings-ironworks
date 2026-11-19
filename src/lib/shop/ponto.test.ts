import { describe, expect, it } from "vitest";
import {
  PONTO_STRINGS, askWorkerText, clockOutLink, dayChip, defaultTimes, hm, homeRequests, isMissedOpen, kindReason,
  lastDays, pf, requestError, requestTimes, weekApproval,
} from "./ponto";

// 11/19 (Thu) 10:00 AM EST = 15:00Z.
const NOW = Date.parse("2026-11-19T15:00:00Z");

describe("strings", () => {
  it("every key exists in en, pt and es", () => {
    const en = Object.keys(PONTO_STRINGS.en).sort();
    expect(Object.keys(PONTO_STRINGS.pt).sort()).toEqual(en);
    expect(Object.keys(PONTO_STRINGS.es).sort()).toEqual(en);
  });
  it("the crew's words, in Portuguese", () => {
    expect(pf("pt", "clockIn")).toBe("Marcar entrada");
    expect(pf("pt", "clockOut")).toBe("Marcar saída");
    expect(pf("pt", "workingSince", { time: "7:31" })).toBe("Você está trabalhando desde 7:31");
    expect(pf("pt", "notWorking")).toBe("Você não está trabalhando");
    expect(pf("pt", "workingFor", { hm: hm(3.2) })).toBe("Trabalhando há 3h12");
    expect([kindReason("in", "pt"), kindReason("out", "pt"), kindReason("wrong", "pt")]).toEqual(["Esqueci a entrada", "Esqueci a saída", "Horário errado"]);
    expect(pf("pt", "askWorker")).toBe("Perguntar ao funcionário");
    expect(pf("pt", "approveWeek")).toBe("Aprovar semana");
  });
  it("hm never rounds up a minute", () => {
    expect(hm(0)).toBe("0h00");
    expect(hm(8.999)).toBe("8h59");
    expect(hm(31 + 5 / 60)).toBe("31h05");
  });
});

describe("request a fix", () => {
  it("the last 7 days, today first, with plain chips", () => {
    const days = lastDays(NOW);
    expect(days).toEqual(["2026-11-19", "2026-11-18", "2026-11-17", "2026-11-16", "2026-11-15", "2026-11-14", "2026-11-13"]);
    expect(dayChip("2026-11-19", NOW, "pt")).toEqual({ top: "Hoje", bottom: "19/11" });
    expect(dayChip("2026-11-18", NOW, "pt")).toEqual({ top: "Ontem", bottom: "18/11" });
    expect(dayChip("2026-11-16", NOW, "pt").top).toBe("Seg");
    expect(dayChip("2026-11-16", NOW, "en")).toEqual({ top: "Mon", bottom: "11/16" });
  });
  it("turns the chosen kind + time into the request", () => {
    expect(requestTimes("in", "2026-11-18", "07:30")).toEqual({ startedAt: "2026-11-18T12:30:00.000Z", endedAt: null });
    expect(requestTimes("out", "2026-11-18", "17:00")).toEqual({ startedAt: null, endedAt: "2026-11-18T22:00:00.000Z" });
    expect(requestTimes("wrong", "2026-11-18", "07:30", "16:45")).toEqual({ startedAt: "2026-11-18T12:30:00.000Z", endedAt: "2026-11-18T21:45:00.000Z" });
  });
  it("starts the picker at the record's time, or the work hours", () => {
    const shift = { id: "s", startedAt: "2026-11-18T12:41:00Z", endedAt: "2026-11-18T22:04:00Z", status: "submitted" };
    expect(defaultTimes("in", shift)).toEqual({ time: "07:41", endTime: "17:04" });
    expect(defaultTimes("out", shift).time).toBe("17:04");
    expect(defaultTimes("out", { ...shift, endedAt: null }).time).toBe("17:00");
    expect(defaultTimes("in", null)).toEqual({ time: "07:30", endTime: "17:00" });
  });
  it("refuses times in the future, out of order, or a clock-out with no record", () => {
    const shift = { id: "s", startedAt: "2026-11-18T12:30:00Z", endedAt: null, status: "open" };
    expect(requestError("out", requestTimes("out", "2026-11-19", "17:00"), shift, NOW)).toBe("future");
    expect(requestError("out", requestTimes("out", "2026-11-18", "07:00"), shift, NOW)).toBe("order");
    expect(requestError("out", requestTimes("out", "2026-11-18", "17:00"), null, NOW)).toBe("noShift");
    expect(requestError("in", requestTimes("wrong", "2026-11-17", "07:30", "17:00"), null, NOW)).toBeNull();
    expect(requestError("out", requestTimes("out", "2026-11-18", "17:00"), shift, NOW)).toBeNull();
  });
  it("home shows waiting requests and answers from the last 3 days", () => {
    const list = [
      { id: "a", status: "pending" }, { id: "b", status: "approved", reviewedAt: "2026-11-18T15:00:00Z" },
      { id: "c", status: "rejected", reviewedAt: "2026-11-10T15:00:00Z" },
    ];
    expect(homeRequests(list, NOW).map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("approve the week", () => {
  const base = { started_at: "2026-11-16T12:30:00Z", ended_at: "2026-11-16T22:00:00Z", status: "submitted" };
  it("approves only what payroll would pay as it stands", () => {
    const r = weekApproval([
      { id: "ok", ...base },
      { id: "done", ...base, status: "approved" },
      { id: "rej", ...base, status: "rejected" },
      { id: "open", ...base, ended_at: null, status: "open" },
      { id: "long", ...base, ended_at: "2026-11-17T14:00:00Z" },
      { id: "asked", ...base },
      { id: "extra", ...base },
    ], { pendingRequests: new Set(["asked"]), windowOpen: new Set(["extra"]), now: NOW });
    expect(r.approve).toEqual(["ok"]);
    expect(r.approved).toBe(1);
    expect(r.held).toEqual([
      { id: "open", reason: "open" }, { id: "long", reason: "missed" }, { id: "asked", reason: "request" }, { id: "extra", reason: "window" },
    ]);
  });
});

describe("missed clock-outs", () => {
  it("flags open shifts from an earlier day, or 30 min past 5 PM", () => {
    expect(isMissedOpen("2026-11-18T12:30:00Z", NOW)).toBe(true);
    expect(isMissedOpen("2026-11-19T12:30:00Z", NOW)).toBe(false);
    expect(isMissedOpen("2026-11-19T12:30:00Z", Date.parse("2026-11-19T22:20:00Z"))).toBe(false);
    expect(isMissedOpen("2026-11-19T12:30:00Z", Date.parse("2026-11-19T22:31:00Z"))).toBe(true);
    // evening work that started after 5 PM is not flagged the same evening
    expect(isMissedOpen("2026-11-19T23:00:00Z", Date.parse("2026-11-20T01:00:00Z"))).toBe(false);
  });
  it("asks the worker in their language, with the link that lands on Marcar saída", () => {
    const link = clockOutLink("https://kiw.test/shop/");
    expect(link).toBe("https://kiw.test/shop?saida=1");
    expect(askWorkerText("pt", { org: "KIW", name: "Kaio Prates", startedAt: "2026-11-18T12:31:00Z", now: NOW, link }))
      .toBe("KIW: Oi Kaio, você não marcou a saída de quarta, 18/11. Abra o app e diga que horas saiu: https://kiw.test/shop?saida=1");
    expect(askWorkerText("pt", { org: "KIW", name: "Kaio", startedAt: "2026-11-19T12:31:00Z", now: Date.parse("2026-11-19T22:40:00Z"), link }))
      .toBe("KIW: Oi Kaio, seu ponto está aberto desde as 7:31. Se já saiu, toque para marcar a saída: https://kiw.test/shop?saida=1");
    expect(askWorkerText("en", { org: "KIW", name: "Tiago", startedAt: "2026-11-18T12:31:00Z", now: NOW, link })).toMatch(/^KIW: Hi Tiago, you didn't clock out on Wednesday, 11\/18\./);
    expect(askWorkerText("es", { org: "KIW", name: "Jairo", startedAt: "2026-11-18T12:31:00Z", now: NOW, link })).toMatch(/^KIW: Hola Jairo, no marcaste la salida del miércoles, 18\/11\./);
  });
});
