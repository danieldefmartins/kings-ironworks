import {useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import type {MeasureData} from '@/lib/shop/measure';
import {porchSiteFixture} from '@/lib/shop/measure-site.fixture';
import type {SceneViewportProps} from './SceneViewport';
// The renderer owns raycasting; these tests exercise its world-space selection
// contract through the real site editing UI and real persistence callback.
vi.mock('./SceneViewport',()=>({default:({groundPick,onSelect}:SceneViewportProps)=><div aria-label="3D test viewport"><button type="button" disabled={!groundPick} onClick={()=>onSelect?.({point:{x:-12.04,y:24.02,z:0}})}>Pick ground point</button><button type="button" onClick={()=>onSelect?.({siteId:'wall-1'})}>Pick surveyed wall</button></div>}));
import SiteWorkspace from './SiteWorkspace';
afterEach(cleanup);
const saved=()=>JSON.parse(screen.getByTestId('saved-3d').textContent!) as MeasureData;
function Harness(){const [data,setData]=useState(porchSiteFixture);return <><SiteWorkspace data={data} set={fn=>setData(old=>{const next=structuredClone(old);fn(next);return next;})} lang="en" onContinue={()=>{}} onMeasure={()=>{}} onDetails={()=>{}}/><output hidden data-testid="saved-3d">{JSON.stringify(data)}</output></>;}
it('starts in 3D and creates a provisional column only after a world-space pick',()=>{
 render(<Harness/>);const before=saved();expect(screen.getByLabelText('3D test viewport')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Column'}));expect(saved()).toEqual(before);expect(screen.queryByRole('region',{name:'Selected site object'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Pick ground point'}));const result=saved();expect(result.site!.objects).toHaveLength(before.site!.objects.length+1);expect(result.site!.objects.slice(0,-1)).toEqual(before.site!.objects);expect(result.site!.objects.at(-1)).toMatchObject({kind:'column',x:'-12.0625',y:'24',z:'0',length:'',depth:'',height:'',source:'unknown',verified:false});expect(screen.getByRole('region',{name:'Selected site object'})).toBeTruthy();expect((screen.getByRole('button',{name:'Pick ground point'}) as HTMLButtonElement).disabled).toBe(true);
});
it('cancels pending placement without edits and opens a surveyed object from the 3D selection',()=>{
 render(<Harness/>);const before=saved();fireEvent.click(screen.getByRole('button',{name:'Column'}));fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(saved()).toEqual(before);fireEvent.click(screen.getByRole('button',{name:'Pick surveyed wall'}));expect(screen.getByRole('region',{name:'Selected site object'})).toBeTruthy();expect((screen.getByLabelText('Height') as HTMLInputElement).value).toBe('84');expect(saved()).toEqual(before);
});
