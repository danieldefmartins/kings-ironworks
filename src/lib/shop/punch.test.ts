import { describe, it, expect } from "vitest";
import { resolvePunchAt, PUNCH_MAX_START_DELAY_MS, PUNCH_MAX_STOP_DELAY_MS } from "./punch";

const now = Date.parse("2026-09-24T22:04:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

describe("resolvePunchAt", () => {
  it("records the arrival time when the phone sent no tap time", () => {
    expect(resolvePunchAt(undefined, now)).toMatchObject({ at: iso(now), delayMs: 0, late: false, reason: "received" });
    expect(resolvePunchAt("", now).reason).toBe("received");
    expect(resolvePunchAt("yesterday", now).reason).toBe("invalid");
    expect(resolvePunchAt(12345, now).reason).toBe("received");
  });

  it("honours a tap that arrived a few seconds later without calling it late", () => {
    const r = resolvePunchAt(iso(now - 5000), now);
    expect(r).toMatchObject({ at: iso(now - 5000), delayMs: 5000, late: false, reason: "client" });
  });

  it("honours a queued clock-out from the evening that flushes the next morning, and flags it", () => {
    const tapped = now - 13 * 3600 * 1000;
    const r = resolvePunchAt(iso(tapped), now, { kind: "stop", notBefore: tapped - 11 * 3600 * 1000 });
    expect(r).toMatchObject({ at: iso(tapped), late: true, reason: "client" });
    expect(r.delayMs).toBe(13 * 3600 * 1000);
  });

  it("refuses a clock-out that predates the shift it would close", () => {
    const r = resolvePunchAt(iso(now - 3600 * 1000), now, { kind: "stop", notBefore: now - 60 * 1000 });
    expect(r.reason).toBe("before_start");
    expect(r.at).toBe(iso(now));
  });

  it("caps how old a punch may be, tighter for clock-in than clock-out", () => {
    expect(resolvePunchAt(iso(now - PUNCH_MAX_START_DELAY_MS - 1000), now, { kind: "start" }).reason).toBe("too_old");
    expect(resolvePunchAt(iso(now - PUNCH_MAX_START_DELAY_MS + 1000), now, { kind: "start" }).reason).toBe("client");
    expect(resolvePunchAt(iso(now - PUNCH_MAX_STOP_DELAY_MS - 1000), now, { kind: "stop" }).reason).toBe("too_old");
    expect(resolvePunchAt(iso(now - PUNCH_MAX_STOP_DELAY_MS + 1000), now, { kind: "stop" }).reason).toBe("client");
  });

  it("treats a slightly fast phone clock as now, and a clearly future tap as untrusted", () => {
    expect(resolvePunchAt(iso(now + 60 * 1000), now)).toMatchObject({ at: iso(now), delayMs: 0, reason: "client" });
    expect(resolvePunchAt(iso(now + 10 * 60 * 1000), now).reason).toBe("future");
  });
});
