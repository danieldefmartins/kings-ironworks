import {useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {newMeasureData,type MeasureData} from '@/lib/shop/measure';
import {porchSiteFixture} from '@/lib/shop/measure-site.fixture';
import type {SceneViewportProps} from './SceneViewport';
// The renderer owns raycasting; these tests exercise its world-space selection
// contract through the real site editing UI and real persistence callback.
vi.mock('./SceneViewport',()=>({default:({groundPick,onSelect,wallPlacement,onWallEdge}:SceneViewportProps)=><div aria-label="3D test viewport"><button type="button" disabled={!wallPlacement} onClick={()=>onWallEdge?.('legacy-segment-1','left')}>Pick wall edge</button><button type="button" disabled={!groundPick} onClick={()=>onSelect?.({point:{x:-12.04,y:24.02,z:0}})}>Pick ground point</button><button type="button" onClick={()=>onSelect?.({siteId:'wall-1'})}>Pick surveyed wall</button></div>}));
import SiteWorkspace from './SiteWorkspace';
afterEach(cleanup);
const saved=()=>JSON.parse(screen.getByTestId('saved-3d').textContent!) as MeasureData;
function Harness({initial=porchSiteFixture()}:{initial?:MeasureData}){const [data,setData]=useState(initial);return <><SiteWorkspace data={data} set={fn=>setData(old=>{const next=structuredClone(old);fn(next);return next;})} lang="en" onContinue={()=>{}} onMeasure={()=>{}} onDetails={()=>{}}/><output hidden data-testid="saved-3d">{JSON.stringify(data)}</output></>;}
it.each([['Existing column','column'],['Existing post','post']])('creates %s only after a world-space pick',(label,kind)=>{
 render(<Harness/>);const before=saved();expect(screen.getByLabelText('3D test viewport')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:label}));expect(saved()).toEqual(before);expect(screen.queryByRole('region',{name:'Selected site object'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Pick ground point'}));const result=saved();expect(result.site!.objects).toHaveLength(before.site!.objects.length+1);expect(result.site!.objects.slice(0,-1)).toEqual(before.site!.objects);expect(result.site!.objects.at(-1)).toMatchObject({kind,x:'-12.0625',y:'24',z:'0',length:'',depth:'',height:'',source:'unknown',verified:false});expect(screen.getByRole('region',{name:'Selected site object'})).toBeTruthy();expect((screen.getByRole('button',{name:'Pick ground point'}) as HTMLButtonElement).disabled).toBe(true);
});
it('cancels pending placement without edits and opens a surveyed object from the 3D selection',()=>{
 render(<Harness/>);const before=saved();fireEvent.click(screen.getByRole('button',{name:'Existing column'}));fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(saved()).toEqual(before);fireEvent.click(screen.getByRole('button',{name:'Pick surveyed wall'}));expect(screen.getByRole('region',{name:'Selected site object'})).toBeTruthy();expect((screen.getByLabelText('Height') as HTMLInputElement).value).toBe('84');expect(saved()).toEqual(before);
});

it('keeps all three existing structures visible and creates a wall through the 3D edge action',()=>{
 render(<Harness/>);const before=saved(),group=screen.getByRole('group',{name:'Existing site structures'});
 expect(group.className).toContain('grid-cols-3');expect(group.className).not.toContain('overflow');
 for(const name of ['Existing wall','Existing column','Existing post'])expect(screen.getByRole('button',{name}).closest('details')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Existing wall'}));expect(saved()).toEqual(before);
 fireEvent.click(screen.getByRole('button',{name:'Pick wall edge'}));expect(saved().site!.objects.at(-1)).toMatchObject({kind:'wall',height:'',depth:'',wallAnchor:{segmentId:'legacy-segment-1',side:'left'}});expect(saved().posts).toEqual(before.posts);
});

it('places an independent wall on a custom site with no segments and keeps dimensions unknown',()=>{
 const data=newMeasureData('custom',1);data.segments=[];render(<Harness initial={data}/>);const before=saved();
 fireEvent.click(screen.getByRole('button',{name:'Existing wall'}));fireEvent.click(screen.getByRole('button',{name:'Place independently'}));expect(saved()).toEqual(before);
 fireEvent.click(screen.getByRole('button',{name:'Pick ground point'}));const wall=saved().site!.objects.at(-1)!;
 expect(wall).toMatchObject({kind:'wall',x:'-12.0625',y:'24',z:'0',length:'',depth:'',height:'',verified:false,source:'unknown'});expect(wall.wallAnchor).toBeUndefined();expect(saved().segments).toEqual([]);expect(saved().posts).toEqual(before.posts);
});
it('cancels independent wall placement without changing existing site records',()=>{
 render(<Harness/>);const before=saved();fireEvent.click(screen.getByRole('button',{name:'Existing wall'}));fireEvent.click(screen.getByRole('button',{name:'Place independently'}));fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(saved()).toEqual(before);
});
