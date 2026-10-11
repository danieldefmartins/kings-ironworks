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

it("shows crew the Start job time gate and never loads the job's sheets", async () => {
  m.worker.mockResolvedValue({ id: "crew", name: "Crew", lang: "en", is_admin: false });
  m.gate.mockResolvedValue({ locked: true, runningElsewhere: { jobId: "j2", label: "Other Job" } });
  render(await Page({ params: Promise.resolve({ id: "j1" }) }));
  expect(screen.getByRole("button", { name: /Start job time/ })).toBeTruthy();
  expect(screen.getByText("Stops time on Other Job")).toBeTruthy();
  expect(screen.queryByText("Sheets list")).toBeNull();
  expect(m.sheets).not.toHaveBeenCalled();
});

it("opens the job when its time is running", async () => {
  m.worker.mockResolvedValue({ id: "crew", name: "Crew", lang: "en", is_admin: false });
  m.gate.mockResolvedValue({ locked: false, runningElsewhere: null });
  render(await Page({ params: Promise.resolve({ id: "j1" }) }));
  expect(screen.getByText("Sheets list")).toBeTruthy();
});

it("shows the gate in Portuguese", async () => {
  m.worker.mockResolvedValue({ id: "crew", name: "Crew", lang: "pt", is_admin: false });
  m.gate.mockResolvedValue({ locked: true, runningElsewhere: null });
  render(await Page({ params: Promise.resolve({ id: "j1" }) }));
  expect(screen.getByRole("button", { name: /Iniciar tempo da obra/ })).toBeTruthy();
});
