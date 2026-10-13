import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ session: vi.fn(), job: vi.fn(), crew: vi.fn(), est: vi.fn(), gate: vi.fn(), sms: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: m.session }));
vi.mock("@/lib/shop/db", () => ({ getJob: m.job, listShareRecipients: m.crew }));
vi.mock("@/lib/shop/job-estimates-db", () => ({ getJobEstimates: m.est }));
vi.mock("@/lib/shop/job-timer-db", () => ({ loadJobGate: m.gate }));
vi.mock("@/lib/shop/sms", async (orig) => ({ ...(await orig<typeof import("@/lib/shop/sms")>()), sendSms: m.sms }));
import { POST } from "./route";

const JOB = "00000000-0000-4000-8000-000000000001";
const A = "00000000-0000-4000-8000-0000000000aa";
const B = "00000000-0000-4000-8000-0000000000bb";
function req(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://kingsironworks.com/shop/api/job-share", { method: "POST", body: JSON.stringify(body), headers });
}
beforeEach(() => {
  vi.clearAllMocks();
  m.session.mockResolvedValue({ id: "me", name: "Daniel", is_admin: true });
  m.job.mockResolvedValue({ id: JOB, job_number: "KIW-1099", customer_name: "Gavin Walsh", address: "12 Elm St, Westwood MA", scope: null, due_date: null, contract_amount: 4800, deposit_amount: 2400 });
  m.gate.mockResolvedValue({ locked: false });
  m.crew.mockResolvedValue([{ id: A, name: "Jairo", lang: "es", phone: "(617) 555-0142" }, { id: B, name: "Kaio", lang: null, phone: null }]);
  m.est.mockResolvedValue([{ items: [{ description: "Restore railing", quantity: 1 }] }]);
  m.sms.mockResolvedValue(true);
});

it("texts each recipient in their language with address, maps and job link, never money", async () => {
  const res = await POST(req({ jobId: JOB, workerIds: [A] }));
  expect(res.status).toBe(200);
  expect(m.est).toHaveBeenCalledWith(JOB, false);
  const [to, text] = m.sms.mock.calls[0];
  expect(to).toBe("+16175550142");
  expect(text).toContain("Dirección: 12 Elm St, Westwood MA");
  expect(text).toContain("google.com/maps");
  expect(text).toContain("Restore railing");
  expect(text).toContain(`https://kingsironworks.com/shop/job/${JOB}`);
  expect(text).not.toMatch(/\$|4800|2400/);
});

it("reports a recipient with no phone instead of failing silently", async () => {
  const d = await (await POST(req({ jobId: JOB, workerIds: [A, B] }))).json();
  expect(d.ok).toBe(false);
  expect(d.results).toEqual(expect.arrayContaining([expect.objectContaining({ id: B, ok: false, reason: "no_phone" })]));
  expect(m.sms).toHaveBeenCalledTimes(1);
});

it("rejects signed-out, empty picks, unknown workers, locked jobs and cross-origin", async () => {
  m.session.mockResolvedValueOnce(null);
  expect((await POST(req({ jobId: JOB, workerIds: [A] }))).status).toBe(401);
  expect((await POST(req({ jobId: JOB, workerIds: [] }))).status).toBe(400);
  expect((await POST(req({ jobId: JOB, workerIds: ["00000000-0000-4000-8000-0000000000cc"] }))).status).toBe(400);
  m.gate.mockResolvedValueOnce({ locked: true });
  expect((await POST(req({ jobId: JOB, workerIds: [A] }))).status).toBe(403);
  expect((await POST(req({ jobId: JOB, workerIds: [A] }, { origin: "https://evil.test" }))).status).toBe(403);
  expect(m.sms).not.toHaveBeenCalled();
});
