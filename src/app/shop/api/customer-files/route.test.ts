import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ session: vi.fn(), pull: vi.fn(), reviewPhoto: vi.fn(), reviewNote: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: m.session }));
vi.mock("@/lib/shop/db", () => ({ getJob: async () => ({ id: "00000000-0000-4000-8000-000000000001" }), listJobs: async () => [], audit: async () => {} }));
vi.mock("@/lib/shop/customer-import", () => ({ importGhlForJob: m.pull, reviewImportedPhoto: m.reviewPhoto, reviewCustomerNote: m.reviewNote }));
import { POST } from "./route";
const jobId = "00000000-0000-4000-8000-000000000001";
const id = "00000000-0000-4000-8000-000000000002";
const req = (body: unknown) => new NextRequest("https://example.com/shop/api/customer-files", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  m.session.mockResolvedValue({ id: "owner", is_admin: true, can_see_prices: true });
  m.pull.mockResolvedValue({ source: "ghl", photos: 1, notes: 0, skipped: 0, errors: [] });
  m.reviewPhoto.mockResolvedValue(true);
  m.reviewNote.mockResolvedValue(true);
});
it.each([null, { is_admin: false, can_see_prices: false }, { is_admin: true, can_see_prices: false }])("only owners import or review customer files", async (worker) => {
  m.session.mockResolvedValue(worker);
  for (const body of [{ action: "pull", jobId }, { action: "review", kind: "photo", id, jobId, decision: "keep" }, { action: "pull_all" }]) {
    expect((await POST(req(body))).status).toBe(worker ? 403 : 401);
  }
  expect(m.pull).not.toHaveBeenCalled();
  expect(m.reviewPhoto).not.toHaveBeenCalled();
});
it("owners can pull and review", async () => {
  expect((await POST(req({ action: "pull", jobId }))).status).toBe(200);
  expect((await POST(req({ action: "review", kind: "photo", id, jobId, decision: "keep", category: "Design" }))).status).toBe(200);
  expect(m.reviewPhoto).toHaveBeenCalledWith(jobId, id, "keep", "Design");
  expect((await POST(req({ action: "review", kind: "note", id, jobId, decision: "reject" }))).status).toBe(200);
  expect(m.reviewNote).toHaveBeenCalledWith(jobId, id, "reject");
});
