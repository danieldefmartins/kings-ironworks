// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ session: vi.fn(), change: vi.fn(), check: vi.fn(), reset: vi.fn(), auth: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({
  getSessionWorker: m.session,
  credentialFingerprint: (s: { pin: string }) => `fp-${s.pin.length}`,
  makeToken: (id: string, f: string) => `tok.${id}.${f}`,
  sessionCookieOptions: () => ({ path: "/shop", httpOnly: true }),
  SHOP_COOKIE: "kiw_shop",
}));
vi.mock("@/lib/shop/db", () => ({ getWorkerAuthState: m.auth }));
vi.mock("@/lib/shop/pin-deps", () => ({ pinDeps: () => ({}) }));
vi.mock("@/lib/shop/pin-service", async () => {
  const real = await vi.importActual<typeof import("@/lib/shop/pin-service")>("@/lib/shop/pin-service");
  return { ...real, changeOwnPin: m.change, checkCurrentPin: m.check, resetWorkerPin: m.reset };
});
import { POST } from "./route";
import { PinError } from "@/lib/shop/pin-service";

const ME = "b1000000-0000-4000-8000-000000000002";
const OTHER = "b1000000-0000-4000-8000-000000000003";
const req = (data: unknown) => new NextRequest("http://localhost/shop/api/pin", { method: "POST", body: JSON.stringify(data) });
beforeEach(() => {
  vi.resetAllMocks();
  m.session.mockResolvedValue({ id: ME, name: "Kaio", is_admin: false, can_see_prices: false });
  m.auth.mockResolvedValue({ pin: "2580", active: true, is_admin: false, can_see_prices: false });
});

it("requires a session", async () => {
  m.session.mockResolvedValue(null);
  expect((await POST(req({ type: "change", current: "9002", next: "2580", confirm: "2580" }))).status).toBe(401);
  expect(m.change).not.toHaveBeenCalled();
});

it("changes only the session's own PIN and re-issues this device's cookie", async () => {
  const res = await POST(req({ type: "change", current: "9002", next: "2580", confirm: "2580" }));
  expect(res.status).toBe(200);
  expect(m.change).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: ME }), { current: "9002", next: "2580", confirm: "2580" }, null);
  expect(res.cookies.get("kiw_shop")?.value).toBe(`tok.${ME}.fp-4`);
  const body = await res.text();
  expect(body).not.toContain("2580");
  expect(body).not.toContain("9002");
});

it("refuses a change that names another worker", async () => {
  const res = await POST(req({ type: "change", workerId: OTHER, current: "9003", next: "2580", confirm: "2580" }));
  expect(res.status).toBe(403);
  expect(m.change).not.toHaveBeenCalled();
});

it("returns codes, never input, on failure", async () => {
  m.change.mockRejectedValue(new PinError(403, "current"));
  const res = await POST(req({ type: "change", current: "9999", next: "2580", confirm: "2580" }));
  expect(res.status).toBe(403);
  const body = await res.text();
  expect(JSON.parse(body).code).toBe("current");
  expect(body).not.toMatch(/9999|2580/);
  expect(res.cookies.get("kiw_shop")).toBeUndefined();
});

it("routes owner resets with the validated target", async () => {
  m.session.mockResolvedValue({ id: "owner", name: "Owner", is_admin: true, can_see_prices: true });
  expect((await POST(req({ type: "reset", workerId: OTHER, pin: "4826" }))).status).toBe(200);
  expect(m.reset).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: "owner" }), OTHER, { pin: "4826" });
  await POST(req({ type: "reset", workerId: "not-a-uuid", pin: "4826" }));
  expect(m.reset).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), "", { pin: "4826" });
});
