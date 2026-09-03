// The drawing is the input on the steps step. A tap there opens the tread it
// landed on; the same tap on the posts step still places a post, and the two
// must never be confused.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Job } from "@/lib/shop/shared";
import { newMeasureData, type FlightSegment, type MeasureSheet } from "@/lib/shop/measure";
import { installFetch } from "./useSheetSync.harness";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }));
import MeasureEditor from "./MeasureEditor";

const job: Job = {
  id: "job-1", job_number: "KIW-1000", customer_name: "Test Customer",
  project_type: null, address: null, lat: null, lng: null, geocoded_address: null,
  phone: null, email: null, contract_amount: null, deposit_amount: null,
  deposit_note: null, deposit_received_on: null, finish: null, finish_type: null,
  finish_sheen: null, color: null, mounting: null, due_date: null,
  current_stage: "measure", est_number: null, scope: null, notes: null,
  archived: false, created_at: "2026-08-01T00:00:00.000Z",
};

function show(steps = 6) {
  installFetch();
  const data = newMeasureData("straight", steps);
  const sheet: MeasureSheet = {
    id: "sheet-1", job_id: job.id, name: "Front stair", shape: "straight",
    status: "in_progress", data, review_comment: null, submitted_by: null,
    submitted_at: null, approved_by: null, approved_at: null, current_rev: 0,
    created_by: "w1", updated_by: "w1", created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
  };
  return { data, ...render(<MeasureEditor job={job} sheet={sheet} lang="en" workerName="T" />) };
}
/** The transparent hit targets the sketch lays over each tread, in order. */
const treads = () => Array.from(document.querySelectorAll("svg rect[style*='cursor']"));

afterEach(cleanup);

describe("measuring by tapping the drawing", () => {
  it("opens the tread that was tapped, not a post", () => {
    show();
    act(() => { fireEvent.click(treads()[2]); });
    expect(screen.getByText("Step 3")).toBeTruthy();
    expect(screen.getByText(/3 of 6/)).toBeTruthy();
    // A post would have shown up in the drawing instead.
    expect(screen.queryByText(/Choose what is at this point/i)).toBeNull();
  });

  it("walks up the flight without going back to the list", () => {
    show();
    act(() => { fireEvent.click(treads()[0]); });
    act(() => { fireEvent.click(screen.getByRole("button", { name: /Next step ↑/ })); });
    expect(screen.getByText("Step 2")).toBeTruthy();
    act(() => { fireEvent.click(screen.getByRole("button", { name: /Previous step/ })); });
    expect(screen.getByText("Step 1")).toBeTruthy();
  });

  it("writes what is typed onto that step, and only that step", () => {
    show(3);
    act(() => { fireEvent.click(treads()[1]); });
    const rise = screen.getByLabelText("Rise") as HTMLInputElement;
    act(() => { fireEvent.change(rise, { target: { value: "7 1/4" } }); });
    // Reopen step 1: it is still blank, so nothing leaked sideways.
    act(() => { fireEvent.click(screen.getByRole("button", { name: /Previous step/ })); });
    expect((screen.getByLabelText("Rise") as HTMLInputElement).value).toBe("");
    act(() => { fireEvent.click(screen.getByRole("button", { name: /Next step ↑/ })); });
    expect((screen.getByLabelText("Rise") as HTMLInputElement).value).toBe("7 1/4");
  });

  it("the row list is opt-in, and says how far along the flight is", () => {
    show(6);
    expect(screen.getByText(/0 measured/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Copy step 1 to all/ })).toBeNull();
    act(() => { fireEvent.click(screen.getByRole("button", { name: /Type the list instead/ })); });
    expect(screen.getByRole("button", { name: /Copy step 1 to all/ })).toBeTruthy();
  });
});
