import {useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {porchSiteFixture} from '@/lib/shop/measure-site.fixture';
import {stairGeometry,surfacePoint} from '@/lib/shop/measure-geometry';
import type {MeasureData} from '@/lib/shop/measure';
import type {SceneViewportProps} from './SceneViewport';
import VisualMeasureWorkspace from './VisualMeasureWorkspace';
vi.mock('./ProWorkspace',()=>({WorkspaceScene:({data,onSelect,onPostDrop}:SceneViewportProps)=>{const tread=stairGeometry(data)!.treads.find(t=>t.segIdx===0&&t.stepIdx===1)!;return <><button onClick={()=>onSelect?.({postId:data.posts[0].id})}>Tap post</button><button onClick={()=>onPostDrop?.({postId:data.posts[0].id,segmentIndex:0,stepIndex:1,point:surfacePoint(tread,4,5)})}>Drop on next step</button><button onClick={()=>onPostDrop?.({postId:data.posts[0].id,segmentIndex:0,stepIndex:1,point:{x:-1000,y:-1000,z:-1000}})}>Drop outside support</button></>;}}));
afterEach(cleanup);
function Harness({initial}:{initial:MeasureData}){const [data,setData]=useState(initial);return <><output data-testid="saved" hidden>{JSON.stringify(data)}</output><VisualMeasureWorkspace embedded data={data} set={fn=>setData(old=>{const next=structuredClone(old);fn(next);return next;})} lang="en" shape="stair_platform"/></>;}
const saved=()=>JSON.parse(screen.getByTestId('saved').textContent!) as MeasureData;
// A drop says which step; the side and the typed setbacks stay as they were.
it('tap opens post editing and direct drop moves the same post while preserving its setbacks and fabrication details',()=>{
 const data=porchSiteFixture(),post=structuredClone(data.posts[0]);render(<Harness initial={data}/>);fireEvent.click(screen.getByText('Tap post'));expect(screen.getByRole('heading',{name:'Post position'})).toBeTruthy();expect(saved()).toEqual(data);fireEvent.click(screen.getByText('Drop on next step'));expect(saved().posts).toHaveLength(data.posts.length);expect(saved().posts[0]).toEqual({...post,stepIdx:1});
});
it('a blank post reference is no obstacle (the drop records centerlines) and invalid drops leave data untouched',()=>{
 const data=porchSiteFixture();data.datums.postRef='';render(<Harness initial={data}/>);fireEvent.click(screen.getByText('Drop on next step'));expect(saved().posts[0].stepIdx).toBe(1);expect(saved().datums.postRef).toBe('centerline');expect(screen.queryByRole('button',{name:'Use measurements to post centerlines'})).toBeNull();const before=saved();fireEvent.click(screen.getByText('Drop outside support'));expect(saved()).toEqual(before);expect(screen.getByRole('alert')).toBeTruthy();
});
