// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const fetcher = vi.fn();
beforeEach(() => { vi.resetModules(); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test"); vi.stubGlobal("fetch", fetcher); fetcher.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const s = { id: "id", worker_id: "worker", started_at: "2026-10-10T12:00:00Z", ended_at: "2026-10-10T20:00:00Z", status: "submitted" };
const response = (rows: unknown, status = 200) => new Response(JSON.stringify(rows), { status });
it("replays a clock-in receipt after its shift closed, without creating a new shift", async () => {
  fetcher.mockResolvedValueOnce(response([s]));
  const { clockIn } = await import("./db");
  expect(await clockIn("worker", null, s.started_at, "id")).toEqual(s);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("returns the original clock-out after a response was lost without overwriting it", async () => {
  fetcher.mockResolvedValueOnce(response([s]));
  const { clockOut } = await import("./db");
  expect(await clockOut("worker", null, "2026-10-10T22:00:00Z", "id")).toEqual(s);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("closes only the validated shift and uses a conditional write", async () => {
  fetcher.mockResolvedValueOnce(response([{ ...s, ended_at: null }])).mockResolvedValueOnce(response([])).mockResolvedValueOnce(response([s]));
  const { clockOut } = await import("./db");
  expect(await clockOut("worker", null, s.ended_at, "id")).toEqual(s);
  const [url, options] = fetcher.mock.calls[2];
  expect(url).toContain("worker_id=eq.worker&id=eq.id&ended_at=is.null");
  expect(JSON.parse(options.body).ended_at).toBe(s.ended_at);
});
it("recovers the winning insert on a concurrent retry", async () => {
  fetcher.mockResolvedValueOnce(response([])).mockResolvedValueOnce(response([])).mockResolvedValueOnce(response([{ hourly_rate: 25 }])).mockResolvedValueOnce(response({ error: "duplicate" }, 409)).mockResolvedValueOnce(response([s]));
  const { clockIn } = await import("./db");
  expect(await clockIn("worker", null, s.started_at, "id")).toEqual(s);
  expect(JSON.parse(fetcher.mock.calls[3][1].body).id).toBe("id");
});
