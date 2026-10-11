// The drawing is the input on the steps step. A tap there opens the tread it
// landed on; the same tap on the posts step still places a post, and the two
// must never be confused.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Job } from "@/lib/shop/shared";
import { newMeasureData, type MeasureSheet } from "@/lib/shop/measure";
import { installFetch } from "./useSheetSync.harness";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }));
import type {SceneViewportProps} from './SceneViewport';
vi.mock('./SceneViewport',()=>({default:({data,onSelect}:SceneViewportProps)=><div>{data.segments.flatMap((s,i)=>s.kind==='flight'?s.steps.map((_,j)=><button key={`${i}-${j}`} onClick={()=>onSelect?.({segmentIndex:i,stepIndex:j})}>Pick step {j+1}</button>):[])}{data.posts.map((p,i)=><button key={p.id} onClick={()=>onSelect?.({postId:p.id})}>Pick post {i+1}</button>)}</div>}));
vi.mock('./PrintSheet',()=>({default:()=>null}));
import MeasureEditor from "./MeasureEditor";

const job: Job = {
  id: "job-1", job_number: "KIW-1000", customer_name: "Test Customer",
  project_type: null, address: null, lat: null, lng: null, geocoded_address: null,
  phone: null, email: null, contract_amount: null, deposit_amount: null,
  deposit_note: null, deposit_received_on: null, finish: null, finish_type: null,
  finish_sheen: null, color: null, mounting: null, due_date: null,
  current_stage: "measure", est_number: null, scope: null, notes: null,
  archived: false, is_subcontractor: false, subcontractor_name: null, subcontractor_phone: null, subcontractor_split_pct: null, subcontractor_amount_paid: null, subcontractor_paid_on: null, subcontractor_notes: null, created_at: "2026-08-01T00:00:00.000Z",
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
  const rendered=render(<MeasureEditor job={job} sheet={sheet} lang="en" workerName="T" />);

  return {data,...rendered};
}
afterEach(cleanup);

describe('measuring with the shared scene',()=>{
 it('opens the selected tread without creating a post',()=>{show();fireEvent.click(screen.getByRole('button',{name:'Pick step 3'}));expect(screen.getByRole('heading',{name:'Step 3'})).toBeTruthy();expect(screen.queryByRole('button',{name:'Pick post 1'})).toBeNull();});
 it('walks up and down a flight in the contextual inspector',()=>{show();fireEvent.click(screen.getByRole('button',{name:'Pick step 1'}));fireEvent.click(screen.getByRole('button',{name:'Next step'}));expect(screen.getByRole('heading',{name:'Step 2'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Previous step'}));expect(screen.getByRole('heading',{name:'Step 1'})).toBeTruthy();});
 it('changes only the selected step and retains it across tool switches',()=>{
  show(3);fireEvent.click(screen.getByRole('button',{name:'Pick step 2'}));fireEvent.change(screen.getByLabelText('Riser height'),{target:{value:'7 1/4'}});
  fireEvent.click(screen.getByRole('button',{name:'Previous step'}));expect((screen.getByLabelText('Riser height') as HTMLInputElement).value).toBe('');
  fireEvent.click(screen.getByRole('button',{name:'Site objects'}));fireEvent.click(screen.getByRole('button',{name:'Pick step 2'}));expect((screen.getByLabelText('Riser height') as HTMLInputElement).value).toBe('7 1/4');
 });
 it('adds a post explicitly and returns to step dimensions',()=>{
  show(4);fireEvent.click(screen.getByRole('button',{name:'Pick step 1'}));fireEvent.click(screen.getByRole('button',{name:'Add railing post here'}));expect(screen.getByRole('heading',{name:'Post position'})).toBeTruthy();expect(screen.getByRole('button',{name:'Pick post 1'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Pick step 2'}));expect(screen.getByRole('heading',{name:'Step 2'})).toBeTruthy();
 });
 it('keeps the detailed row list optional and missing-field highlighting accurate',()=>{
  show(3);fireEvent.change(screen.getByRole('combobox',{name:'Project controls'}),{target:{value:'structure'}});
  expect(screen.queryByRole('button',{name:/Copy step 1 to all/})).toBeNull();fireEvent.click(screen.getByRole('button',{name:/Type the list instead/}));
  expect(screen.getByRole('button',{name:/Copy step 1 to all/})).toBeTruthy();
  const rise=screen.getAllByLabelText('Rise')[0] as HTMLInputElement,nosing=screen.getAllByLabelText('Nosing')[0] as HTMLInputElement;
  expect(rise.className).toContain('border-red-500');expect(nosing.className).not.toContain('border-red-500');fireEvent.change(rise,{target:{value:'7'}});expect((screen.getAllByLabelText('Rise')[0] as HTMLInputElement).className).not.toContain('border-red-500');
 });
 it('retains run setback and edge defaults when explicitly adding the next post',()=>{
  show(4);fireEvent.click(screen.getByRole('button',{name:'Pick step 1'}));fireEvent.click(screen.getByRole('button',{name:'Add railing post here'}));
  fireEvent.change(screen.getByLabelText('From tread nosing / support edge'),{target:{value:'2'}});fireEvent.change(screen.getByLabelText('From side edge'),{target:{value:'3'}});
  fireEvent.click(screen.getByRole('button',{name:'Pick step 3'}));fireEvent.click(screen.getByRole('button',{name:'Add railing post here'}));
  expect((screen.getByLabelText('From tread nosing / support edge') as HTMLInputElement).value).toBe('2');expect((screen.getByLabelText('From side edge') as HTMLInputElement).value).toBe('3');
 });
});
