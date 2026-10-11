// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/shop/stale-alert", () => ({ runClockChecks: m.run }));
import { GET } from "./route";

const req = (headers: Record<string, string> = {}) => new NextRequest("http://localhost/shop/api/cron/clock-check", { headers });
const SECRET = "s3cret-cron-value-0123456789";
beforeEach(() => { m.run.mockResolvedValue({ ran: true, stillIn: 0, stale: 0 }); });
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

it("is closed when CRON_SECRET is not configured", async () => {
  vi.stubEnv("CRON_SECRET", "");
  expect((await GET(req({ authorization: `Bearer ${SECRET}` }))).status).toBe(503);
  expect(m.run).not.toHaveBeenCalled();
});

it("refuses a wrong or missing secret", async () => {
  vi.stubEnv("CRON_SECRET", SECRET);
  expect((await GET(req())).status).toBe(401);
  expect((await GET(req({ authorization: "Bearer nope" }))).status).toBe(401);
  expect(m.run).not.toHaveBeenCalled();
});

it("runs the checks unthrottled with the right secret", async () => {
  vi.stubEnv("CRON_SECRET", SECRET);
  const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
  expect(res.status).toBe(200);
  expect(m.run).toHaveBeenCalledWith(expect.any(Number), { force: true });
  expect((await GET(req({ "x-cron-secret": SECRET }))).status).toBe(200);
});
