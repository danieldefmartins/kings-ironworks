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

vi.mock('./SceneViewport',()=>({default:()=> <div/>}));
vi.mock('./PrintSheet',()=>({default:()=>null}));
vi.mock('./ShopDrawingSubmission',()=>({default:()=> <div>Drawing submission retained</div>}));
import MeasureEditor from "./MeasureEditor";
import {attachedFabricationFixture} from "@/lib/shop/measure-site.fixture";

const job: Job = {
  id: "job-1",
  job_number: "KIW-1000",
  customer_name: "Test Customer",
  project_type: null, address: null, lat: null, lng: null, geocoded_address: null,
  phone: null, email: null, contract_amount: null, deposit_amount: null,
  deposit_note: null, deposit_received_on: null, finish: null, finish_type: null,
  finish_sheen: null, color: null, mounting: null, due_date: null,
  current_stage: "measure", est_number: null, scope: null, notes: null,
  archived: false, is_subcontractor: false, subcontractor_name: null, subcontractor_phone: null, subcontractor_split_pct: null, subcontractor_amount_paid: null, subcontractor_paid_on: null, subcontractor_notes: null, created_at: "2026-08-01T00:00:00.000Z",
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
  const rendered=render(<MeasureEditor job={job} sheet={sheetWith(measured)} lang="en" workerName="Tester" />);
  fireEvent.change(screen.getByRole('combobox',{name:'Project controls'}),{target:{value:'structure'}});
  return rendered;
}

const click = (name: RegExp) => act(() => { fireEvent.click(screen.getByRole("button", { name })); });

beforeEach(() => { push.mockReset(); });
afterEach(cleanup);

describe('multi-flight contextual measurements',()=>{
 it.each(['This flight only','All flights'])('applies typical steps with scope: %s',(scope)=>{
  show(0);
  fireEvent.change(screen.getByLabelText('Typical rise'),{target:{value:'7 1/4'}});
  fireEvent.change(screen.getByLabelText('Typical run'),{target:{value:'11 1/2'}});
  fireEvent.change(screen.getByLabelText('Typical nosing'),{target:{value:'1'}});
  click(new RegExp(`^${scope}$`));click(/Type the list instead/);
  expect((screen.getAllByLabelText('Rise')[0] as HTMLInputElement).value).toBe('7 1/4');
  fireEvent.change(screen.getByRole('combobox',{name:'Flight'}),{target:{value:'1'}});
  if(screen.queryByRole('button',{name:/Type the list instead/}))click(/Type the list instead/);
  expect((screen.getAllByLabelText('Rise')[0] as HTMLInputElement).value).toBe(scope==='All flights'?'7 1/4':'');
  expect((screen.getAllByLabelText('Run')[0] as HTMLInputElement).value).toBe(scope==='All flights'?'11 1/2':'');
 });
 it('opens the flight still missing measurements',()=>{show(2);expect((screen.getByRole('combobox',{name:'Flight'}) as HTMLSelectElement).value).toBe('2');});
 it('switches flights without leaving the structure topic or changing measurements',()=>{
  show(1);fireEvent.change(screen.getByRole('combobox',{name:'Flight'}),{target:{value:'0'}});
  click(/Type the list instead/);expect((screen.getAllByLabelText('Rise')[0] as HTMLInputElement).value).toBe('7');
  fireEvent.change(screen.getByRole('combobox',{name:'Flight'}),{target:{value:'1'}});
  expect((screen.getByRole('combobox',{name:'Project controls'}) as HTMLSelectElement).value).toBe('structure');
  expect((screen.getAllByLabelText('Rise')[0] as HTMLInputElement).value).toBe('');
 });
 it('allows review navigation but blocks submission with blank flights',()=>{
  show(2);click(/^Shop package/);expect((screen.getByRole('button',{name:/Submit for shop review/}) as HTMLButtonElement).disabled).toBe(true);
 });
 it('keeps survey reachable after measured flights without an extra wizard',()=>{
  show(3);fireEvent.change(screen.getByRole('combobox',{name:'Project controls'}),{target:{value:'survey'}});
  expect(screen.getByRole('heading',{name:'Landings & level checks'})).toBeTruthy();expect(screen.queryByText(/Step 2 of 8/)).toBeNull();
 });
 it('can save and close for the day',()=>{show(1);click(/^Save & close$/);expect(push).toHaveBeenCalledWith('/shop/job/job-1/measure');});
});
it('keeps attached-panel edits across tools and exposes member/review details',()=>{
 installFetch();const sheet=sheetWith(0);sheet.data=attachedFabricationFixture();render(<MeasureEditor job={job} sheet={sheet} lang="en" workerName="Tester"/>);
 click(/^Railing panels$/);expect(screen.getByRole('group',{name:'Start connection'})).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Finished railing height above floor'),{target:{value:'43'}});
 fireEvent.click(screen.getByText('Members',{selector:'summary'}));expect(screen.getByRole('group',{name:'Top rail'})).toBeTruthy();
 click(/^Site objects$/);click(/^Railing panels$/);expect((screen.getByLabelText('Finished railing height above floor') as HTMLInputElement).value).toBe('43');
 fireEvent.click(screen.getByText('Verification & cuts',{selector:'summary'}));expect(screen.getByText(/Verification & cuts/)).toBeTruthy();
 click(/^Shop package/);expect(screen.getByText('Drawing submission retained')).toBeTruthy();
});
it('opens saved geometry directly without repeating project creation',()=>{
 show(1);expect(screen.queryByRole('heading',{name:'Where are we working?'})).toBeNull();expect((screen.getByRole('combobox',{name:'Flight'}) as HTMLSelectElement).value).toBe('1');
});
