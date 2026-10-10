import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { readOutbox, writeOutbox, pendingPunches, flagPunch, sendPunch, type QueuedPunch } from "./punch-outbox";
const p: QueuedPunch = { punchId: "p", workerId: "worker-a", shiftId: "shift", type: "shift_stop", clientAt: "2026-10-10T17:00:00Z" };
beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
});
afterEach(() => vi.unstubAllGlobals());
it("keeps workers isolated and preserves legacy unowned records for review", () => {
  writeOutbox([p, { ...p, punchId: "other", workerId: "worker-b" }, { ...p, punchId: "legacy", workerId: undefined }]);
  expect(pendingPunches("worker-a")).toEqual([p]);
  expect(readOutbox()).toHaveLength(3);
});
it("retains rejected punches instead of silently discarding them", () => {
  writeOutbox([p]); flagPunch(p.punchId, "Needs office review");
  expect(pendingPunches("worker-a")).toEqual([]);
  expect(readOutbox()[0]).toMatchObject({ ...p, review: "Needs office review" });
});
it.each([401, 408, 429, 503])("retains a punch after HTTP %s", async status => {
  writeOutbox([p]); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Unavailable" }), { status })));
  await sendPunch(p).catch(() => undefined);
  expect(pendingPunches("worker-a")).toEqual([p]);
});
it("does not accept an HTML or incomplete success response as a saved punch", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response("<html>login</html>")).mockResolvedValueOnce(new Response("{}"));
  vi.stubGlobal("fetch", fetcher);
  await expect(sendPunch(p)).rejects.toThrow();
  await expect(sendPunch(p)).rejects.toThrow();
});
it("sends the worker and exact target shift with the original tap time", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, shiftId: "shift", at: p.clientAt })));
  vi.stubGlobal("fetch", fetcher); expect(await sendPunch(p)).toMatchObject({ ok: true, at: p.clientAt });
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(p);
});
