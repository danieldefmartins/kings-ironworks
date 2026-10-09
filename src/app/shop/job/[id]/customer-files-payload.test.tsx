// The job page must never ship pending/rejected customer imports or price
// photos to crew — filtered in the server payload, not hidden in the UI.
import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ worker: vi.fn(), select: vi.fn() }));
vi.stubGlobal("React", React);
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: m.worker }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("redirect"); }, notFound: () => { throw new Error("not found"); } }));
const photo = (id: string, category: string, review_status: string, source: string | null = "ghl") =>
  ({ id, job_id: "job", url: `job/${id}.jpg`, kind: "image", category, review_status, source, source_ref: source ? `ref-${id}` : null, source_note: source ? `note-${id}` : null, uploaded_by: null, uploaded_at: "2026-10-01T00:00:00Z" });
vi.mock("@/lib/shop/db", async () => {
  const shared = await vi.importActual<typeof import("@/lib/shop/shared")>("@/lib/shop/shared");
  return {
    ...shared,
    ORG_ID: "org",
    getJob: async () => ({ id: "job", customer_name: "Customer", contract_amount: 98765, scope: "Railing", notes: null }),
    getCutItems: async () => [], listJobPieces: async () => [], getMaterials: async () => [], getQc: async () => [],
    getPhotos: async () => [
      photo("approvedphoto", "Customer Photos", "approved"),
      photo("pendingphoto", "Customer Photos", "pending"),
      photo("rejectedphoto", "Customer Photos", "rejected"),
      photo("pricephoto", "Approved Estimate", "approved", null),
    ],
    listWorkers: async () => [], signPhotoUrl: async (p: string) => `https://signed/${p}`, getJobTimeEntries: async () => [], listCatalog: async () => [],
    sbSelect: m.select,
    sbUpdate: async () => [], sbInsertIgnoreDuplicates: async () => [], uploadPhotoObject: async () => {},
  };
});
vi.mock("@/lib/shop/money-ledger-db", () => ({ getJobMoneyLedger: async () => null }));
vi.mock("@/lib/shop/job-estimates-db", () => ({ getJobEstimates: async () => [] }));
vi.mock("../../ShopTopBar", () => ({ default: () => null }));
vi.mock("./TravelerV2", () => ({ default: () => null }));
vi.mock("./TravelerClient", () => ({ default: () => null }));
vi.mock("./PiecesPanel", () => ({ default: () => null }));
vi.mock("./TimeClock", () => ({ default: () => null }));
vi.mock("./JobMoneyManager", () => ({ default: () => null }));
vi.mock("./JobEstimateDetails", () => ({ default: () => null }));
vi.mock("./JobDocuments", () => ({ default: () => null }));
vi.mock("./CustomerFilesReview", () => ({ default: () => null }));
import Page from "./page";

const notes = [
  { id: "n1", job_id: "job", source: "ghl", source_ref: "ghl:m1", body: "We approve option B, deposit $2,000", author_direction: "inbound", message_at: null, review_status: "approved", created_at: "" },
  { id: "n2", job_id: "job", source: "email", source_ref: "email:x", body: "pendingnote", author_direction: "inbound", message_at: null, review_status: "pending", created_at: "" },
];
beforeEach(() => {
  vi.clearAllMocks();
  // Behave like PostgREST: honour the review_status filter in the query.
  m.select.mockImplementation(async (table: string, query: string) => {
    if (table !== "kiw_shop_customer_notes") return [];
    return query.includes("review_status=eq.approved") ? notes.filter((n) => n.review_status === "approved") : notes;
  });
});
const render = async () => JSON.stringify(await Page({ params: Promise.resolve({ id: "job" }) }), (_k, v) => (React.isValidElement(v) ? v.props : v));

it("crew payload has approved customer files only, with money removed", async () => {
  m.worker.mockResolvedValue({ id: "crew", name: "Crew", is_admin: false, can_see_prices: false });
  const payload = await render();
  expect(payload).toContain("approvedphoto");
  expect(payload).toContain("approve option B");
  for (const secret of ["pendingphoto", "rejectedphoto", "pricephoto", "pendingnote", "2,000", "98765", "note-approvedphoto"]) expect(payload).not.toContain(secret);
});
it("owner payload carries pending items for review", async () => {
  m.worker.mockResolvedValue({ id: "owner", name: "Daniel", is_admin: true, can_see_prices: true });
  const payload = await render();
  expect(payload).toContain("pendingphoto");
  expect(payload).toContain("pendingnote");
  expect(payload).not.toContain("rejectedphoto");
});
