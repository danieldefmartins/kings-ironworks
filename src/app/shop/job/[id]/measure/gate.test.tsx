import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ worker: vi.fn(), gate: vi.fn(), sheets: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: m.worker }));
vi.mock("@/lib/shop/job-timer-db", () => ({ loadJobGate: m.gate }));
vi.mock("@/lib/shop/db", () => ({
  getJob: async () => ({ id: "j1", customer_name: "Smith Railing", project_type: "Railing", job_number: "KIW-1", address: "1 Main St" }),
  getMeasureSheets: m.sheets, listWorkers: async () => [], getOrgSettings: async () => ({ tolerances: {} }),
}));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("redirect"); }, notFound: () => { throw new Error("404"); }, useRouter: () => ({ refresh: () => {} }) }));
vi.mock("@/app/shop/ShopTopBar", () => ({ default: () => null }));
vi.mock("../../../ShopTopBar", () => ({ default: () => null }));
vi.mock("./MeasureListClient", () => ({ default: () => <div>Sheets list</div> }));

import Page from "./page";
vi.stubGlobal("React", React);
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); m.sheets.mockResolvedValue([]); });

// Owner, 2026-11-09: measuring is open to the whole crew without starting job time.
it("opens the measure sheets for crew who are not timing the job", async () => {
  m.worker.mockResolvedValue({ id: "crew", name: "Crew", lang: "en", is_admin: false });
  m.gate.mockResolvedValue({ locked: true, runningElsewhere: { jobId: "j2", label: "Other Job" } });
  render(await Page({ params: Promise.resolve({ id: "j1" }) }));
  expect(screen.getByText("Sheets list")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Start job time/ })).toBeNull();
  expect(m.gate).not.toHaveBeenCalled();
});
