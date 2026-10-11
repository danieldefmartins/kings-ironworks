import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { pendingPunches, queueTap } from "./punch-outbox";

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
});
afterEach(() => vi.unstubAllGlobals());

it("never drops a tap; a repeated tap of the same kind reuses the unsent punch", () => {
  const first = queueTap("worker-a", "shift_start", null)!;
  expect(first.added).toBe(true);
  expect(queueTap("worker-a", "shift_start", null)).toEqual({ punch: first.punch, added: false });
  const stop = queueTap("worker-a", "shift_stop", "shift-1")!;
  expect(stop.added).toBe(true);
  expect(pendingPunches("worker-a").map((x) => x.type)).toEqual(["shift_start", "shift_stop"]);
  expect(stop.punch).toMatchObject({ shiftId: "shift-1", workerId: "worker-a" });
});

it("reports a device that cannot store the punch instead of pretending", () => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => { throw new Error("quota"); } });
  expect(queueTap("worker-a", "shift_stop", "s")).toBeNull();
});
