// A multi-flight stair must not let the measurer walk off the step with
// flights still blank. Daniel reported it three times, so the flow is pinned
// here rather than left to a read-through of the JSX.
import { afterEach, describe, expect, it, beforeEach, vi } from "vitest";
import { act, cleanup, render, screen, fireEvent } from "@testing-library/react";
import type { Job } from "@/lib/shop/shared";
import { newPresetMeasureData, type FlightSegment, type MeasureSheet } from "@/lib/shop/measure";
import { installFetch } from "./useSheetSync.harness";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: () => {} }) }));

import MeasureEditor from "./MeasureEditor";

const job: Job = {
  id: "job-1",
  job_number: "KIW-1000",
  customer_name: "Test Customer",
  project_type: null, address: null, lat: null, lng: null, geocoded_address: null,
  phone: null, email: null, contract_amount: null, deposit_amount: null,
  deposit_note: null, deposit_received_on: null, finish: null, finish_type: null,
  finish_sheen: null, color: null, mounting: null, due_date: null,
  current_stage: "measure", est_number: null, scope: null, notes: null,
  archived: false, created_at: "2026-08-01T00:00:00.000Z",
};

/** A three-flight stair; `measured` says how many of its flights are finished. */
function sheetWith(measured: number): MeasureSheet {
  const { shape, data } = newPresetMeasureData("multi_flight", 3, 3);
  const flights = data.segments.filter((s) => s.kind === "flight") as FlightSegment[];
  flights.slice(0, measured).forEach((fl) => {
    fl.steps.forEach((st) => { st.rise = "7"; st.run = "11"; });
    fl.width = "36";
    fl.angleDeg = "32";
    fl.rake = "100";
  });
  return {
    id: "sheet-1", job_id: job.id, name: "Rear stair", shape, status: "in_progress",
    data, review_comment: null, submitted_by: null, submitted_at: null,
    approved_by: null, approved_at: null, current_rev: 0, created_by: "w1",
    updated_by: "w1", created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
  };
}

function show(measured: number) {
  installFetch();
  return render(<MeasureEditor job={job} sheet={sheetWith(measured)} lang="en" workerName="Tester" />);
}

const click = (name: RegExp) => act(() => { fireEvent.click(screen.getByRole("button", { name })); });

beforeEach(() => { push.mockReset(); });
afterEach(cleanup);

describe("three-flight stair", () => {
  it("opens on the flight that still owes numbers", () => {
    show(2);
    expect(screen.getByText(/Flight 3 of 3/)).toBeTruthy();
    expect(screen.getByText(/2\/3 flights measured/)).toBeTruthy();
  });

  it("sends the bottom button to the next flight, not the next step", () => {
    show(0);
    expect(screen.getByText(/Flight 1 of 3/)).toBeTruthy();
    click(/Save · next flight \(2\)/);
    expect(screen.getByText(/Flight 2 of 3/)).toBeTruthy();
    // Still on step 1 of 8 — walking the flights never advances the step.
    expect(screen.getAllByText(/Step 1 of 8/).length).toBeGreaterThan(0);
  });

  it("refuses the next step while a flight is blank, and offers the way there", () => {
    show(2);
    expect(screen.queryByText(/^Next →/)).toBeNull();
    // On the last flight with one still open, the forward button is the
    // amber "take me there" rather than a step change.
    click(/Take me there/);
    expect(screen.getByText(/Flight 3 of 3/)).toBeTruthy();
    expect(screen.getAllByText(/Step 1 of 8/).length).toBeGreaterThan(0);
  });

  it("hands over the next step once every flight is measured", () => {
    show(3);
    expect(screen.getAllByText(/Every flight measured/).length).toBeGreaterThan(0);
    // Walking the flights stays available, quietly, below the step change.
    expect(screen.getByRole("button", { name: /^Flight 2 →$/ })).toBeTruthy();
    click(/Every flight measured · Next →/);
    expect(screen.getAllByText(/Step 2 of 8/).length).toBeGreaterThan(0);
  });

  it("can stop for the day and go back to the sheet list", () => {
    show(1);
    click(/Save and finish later/);
    expect(push).toHaveBeenCalledWith("/shop/job/job-1/measure");
  });
});
