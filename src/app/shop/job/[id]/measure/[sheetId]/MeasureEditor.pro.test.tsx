import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {cleanup,render,screen,fireEvent} from '@testing-library/react';
import type {Job} from '@/lib/shop/shared';
import {newPresetMeasureData,type FlightSegment,type MeasureSheet} from '@/lib/shop/measure';
import {mt} from '@/lib/shop/measure-i18n';
import {porchSiteFixture} from '@/lib/shop/measure-site.fixture';
import {stairGeometry,surfacePoint} from '@/lib/shop/measure-geometry';
import type {SceneViewportProps} from './SceneViewport';
import {sheetReadiness} from '@/lib/shop/measure-checks';
import {installFetch} from './useSheetSync.harness';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock('./SceneViewport',()=>({default:({data,onPostDrop}:SceneViewportProps)=><div data-testid="persistent-scene"><output hidden data-testid="scene-data">{JSON.stringify(data)}</output><button onClick={()=>{const tread=stairGeometry(data)?.treads.find(t=>t.segIdx===0&&t.stepIdx===1);if(tread&&data.posts[0])onPostDrop?.({postId:data.posts[0].id,segmentIndex:0,stepIndex:1,point:surfacePoint(tread,4,5)});}}>Drag post to second step</button></div>}));
vi.mock('./PrintSheet',()=>({default:()=>null}));
vi.mock('./ShopDrawingSubmission',()=>({default:()=> <div>Drawing submission retained</div>}));
import MeasureEditor from './MeasureEditor';
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

beforeEach(()=>{installFetch();});
afterEach(cleanup);
const click=(name:RegExp)=>fireEvent.click(screen.getByRole('button',{name}));
describe('single professional measuring workspace',()=>{
 it('keeps one scene mounted across tools and review without legacy navigation',()=>{
  render(<MeasureEditor job={job} sheet={sheetWith(0)} lang="en" workerName="Tester"/>);
  const scene=screen.getByTestId('persistent-scene');
  expect(screen.queryByRole('button',{name:'All tools'})).toBeNull();
  expect(screen.queryByLabelText('Measurement stages')).toBeNull();
  for(const name of [/^Dimensions & posts$/,/^Railing panels$/,/^Materials$/,/^Shop package/]){
   click(name);expect(screen.getAllByTestId('persistent-scene')).toHaveLength(1);expect(screen.getByTestId('persistent-scene')).toBe(scene);
  }
  expect(screen.getByText('Drawing submission retained')).toBeTruthy();
 });
 it('keeps photo controls and structure fields reachable in contextual tools',()=>{
  render(<MeasureEditor job={job} sheet={sheetWith(0)} lang="en" workerName="Tester"/>);
  fireEvent.change(screen.getByRole('combobox',{name:'Project controls'}),{target:{value:'structure'}});
  expect(screen.getByLabelText('Typical rise')).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox',{name:'Project controls'}),{target:{value:'photos'}});
  expect(screen.getByRole('heading',{name:'Photos'})).toBeTruthy();
  expect(screen.queryByLabelText('Typical rise')).toBeNull();
 });
 it('opens a missing measurement on the correct topic and flight',()=>{
  const sheet=sheetWith(0),gap=sheetReadiness(sheet.data,sheet.shape).fabGaps.find(g=>g.key==='flight_width'&&g.flight===2)!;
  render(<MeasureEditor job={job} sheet={sheet} lang="en" workerName="Tester"/>);
  click(/^Shop package/);
  const label=`${mt('en','gap_flight_width')} (${gap.detail})`;
  fireEvent.click(screen.getByRole('button',{name:new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}));
  expect((screen.getByRole('combobox',{name:'Project controls'}) as HTMLSelectElement).value).toBe('structure');
  expect((screen.getByRole('combobox',{name:'Flight'}) as HTMLSelectElement).value).toBe('2');
 });
 it('retains owner approval controls in the sole shop review',()=>{
  const sheet=sheetWith(3);sheet.status='submitted';
  render(<MeasureEditor job={job} sheet={sheet} lang="en" workerName="Owner" isAdmin/>);
  click(/^Shop package/);
  expect(screen.getByRole('button',{name:/Approve/})).toBeTruthy();
  expect(screen.getByRole('button',{name:/Send back/})).toBeTruthy();
 });
});

it('moves a post directly from the site scene, retains its identity and details, and opens the moved post editor',()=>{
 const sheet=sheetWith(0);sheet.data=porchSiteFixture();sheet.shape='stair_platform';const before=structuredClone(sheet.data.posts[0]);render(<MeasureEditor job={job} sheet={sheet} lang="en" workerName="Tester"/>);fireEvent.click(screen.getByRole('button',{name:'Drag post to second step'}));const data=JSON.parse(screen.getByTestId('scene-data').textContent!);expect(data.posts[0]).toEqual({...before,stepIdx:1,fromNosing:'4',fromEdge:'5',pos:'',side:'left'});expect(data.posts).toHaveLength(sheet.data.posts.length);expect(screen.getByRole('heading',{name:'Post position'})).toBeTruthy();
});
it('shows a global direct-drop datum error without silently changing measurements',()=>{
 const sheet=sheetWith(0);sheet.data=porchSiteFixture();sheet.data.datums.postRef='';sheet.shape='stair_platform';render(<MeasureEditor job={job} sheet={sheet} lang="en" workerName="Tester"/>);const before=screen.getByTestId('scene-data').textContent;fireEvent.click(screen.getByRole('button',{name:'Drag post to second step'}));expect(screen.getByTestId('scene-data').textContent).toBe(before);expect(screen.getByRole('alert').textContent).toContain('centerline');expect(screen.getByRole('button',{name:'Use measurements to post centerlines'})).toBeTruthy();
});

it('starts with existing structures before tread measurement without requiring them or changing saved data',()=>{
 const sheet=sheetWith(0);render(<MeasureEditor job={job} sheet={sheet} lang="en" workerName="Tester"/>);expect(screen.getByRole('heading',{name:'Start with the existing structures'})).toBeTruthy();expect(screen.getByRole('button',{name:'Existing column'})).toBeTruthy();const before=screen.getByTestId('scene-data').textContent;click(/^Dimensions & posts$/);expect(screen.getByRole('button',{name:'Add existing structures'})).toBeTruthy();expect(screen.getByRole('button',{name:'Segment 1 · flight'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Add existing structures'}));expect(screen.getByRole('button',{name:'Existing column'})).toBeTruthy();expect(screen.getByTestId('scene-data').textContent).toBe(before);
});
it('does not repeat the setup prompt or replace structural columns on an existing measured sheet',()=>{
 const sheet=sheetWith(0);sheet.data=porchSiteFixture();sheet.shape='stair_platform';render(<MeasureEditor job={job} sheet={sheet} lang="en" workerName="Tester"/>);expect(screen.queryByRole('heading',{name:'Start with the existing structures'})).toBeNull();const before=screen.getByTestId('scene-data').textContent;click(/^Dimensions & posts$/);expect(screen.queryByRole('button',{name:'Add existing structures'})).toBeNull();expect(screen.getByTestId('scene-data').textContent).toBe(before);
});
