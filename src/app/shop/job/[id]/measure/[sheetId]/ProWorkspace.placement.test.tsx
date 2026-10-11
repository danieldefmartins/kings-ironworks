import {useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {porchSiteFixture} from '@/lib/shop/measure-site.fixture';
import type {MeasureData} from '@/lib/shop/measure';
import type {SceneViewportProps} from './SceneViewport';
import type SiteDrawingComponent from './SiteDrawing';
import type {ComponentProps} from 'react';
vi.mock('./SceneViewport',()=>({default:({onUnavailable}:SceneViewportProps)=><button onClick={onUnavailable}>Use fallback</button>}));
vi.mock('./SiteDrawing',async importOriginal=>({...await importOriginal<typeof import('./SiteDrawing')>(),default:({view,move,onMove}:ComponentProps<typeof SiteDrawingComponent>)=><div><span>Reference view: {view}</span><button disabled={!move} onClick={()=>onMove?.(12,24)}>Pick reference ground</button></div>}));
import ProWorkspace from './ProWorkspace';
import SiteWorkspace from './SiteWorkspace';
afterEach(cleanup);
function Harness(){const [data,setData]=useState(porchSiteFixture);return <><ProWorkspace data={data} lang="en"><SiteWorkspace embedded data={data} set={fn=>setData(old=>{const next=structuredClone(old);fn(next);return next;})} lang="en" onContinue={()=>{}} onMeasure={()=>{}} onDetails={()=>{}}/></ProWorkspace><output hidden data-testid="saved">{JSON.stringify(data)}</output></>;}
const saved=()=>JSON.parse(screen.getByTestId('saved').textContent!) as MeasureData;
it.each([['Existing column','column'],['Existing post','post']])('places %s through the shared 2D fallback without replacing existing records',(label,kind)=>{
 render(<Harness/>);const before=saved();fireEvent.click(screen.getByRole('button',{name:'Use fallback'}));fireEvent.click(screen.getByRole('button',{name:label}));expect(saved()).toEqual(before);expect(screen.getByText('Reference view: plan')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Pick reference ground'}));
 const after=saved();expect(after.site!.objects.slice(0,-1)).toEqual(before.site!.objects);expect(after.site!.objects.at(-1)).toMatchObject({kind,x:'12',y:'24',z:'0',length:'',depth:'',height:'',verified:false,source:'unknown'});expect(after.posts).toEqual(before.posts);expect(screen.getByRole('region',{name:'Selected site object'})).toBeTruthy();
});
it('brings the shared scene into view when placement begins, without jumping on subsequent data edits',()=>{
 render(<Harness/>);const scene=screen.getByRole('region',{name:'Job scene'}),scroll=vi.fn();scene.scrollIntoView=scroll;
 fireEvent.click(screen.getByRole('button',{name:'Existing column'}));expect(scroll).toHaveBeenCalledOnce();expect(scroll).toHaveBeenCalledWith({block:'start',behavior:'smooth'});
 fireEvent.click(screen.getByRole('button',{name:'Use fallback'}));fireEvent.click(screen.getByRole('button',{name:'Pick reference ground'}));fireEvent.change(screen.getByLabelText('Height'),{target:{value:'96'}});expect(scroll).toHaveBeenCalledOnce();
});
