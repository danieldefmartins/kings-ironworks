import {useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {attachedFabricationFixture} from '@/lib/shop/measure-site.fixture';
import {siteMeshes} from '@/lib/shop/measure-site';
import {steelSources} from '@/lib/shop/measure-steel';
import HouseLayout from './HouseLayout';
import SiteDrawing,{siteAnchors} from './SiteDrawing';
import type {MeasureData} from '@/lib/shop/measure';
afterEach(cleanup);
function Harness(){const [data,setData]=useState(()=>{const d=attachedFabricationFixture();d.sceneSetup={environment:'exterior',projectType:'stairs',house:{side:'back'},placement:{x:'12',y:'0',z:'0',rotation:0}};return d;});return <><HouseLayout data={data} set={fn=>setData(prev=>{const d=structuredClone(prev);fn(d);return d;})} lang="en" onAddWall={()=>{}} onClose={()=>{}}/><output data-testid="saved">{JSON.stringify(data)}</output></>;}
const saved=()=>JSON.parse(screen.getByTestId('saved').textContent!) as MeasureData;
it('changes actual assembly placement without rewriting measurements or measured site structures',()=>{
 render(<Harness/>);const before=saved();fireEvent.click(screen.getByRole('button',{name:'Rotate stair and railing right 90 degrees'}));
 expect(saved().sceneSetup!.placement).toEqual({x:'12',y:'0',z:'0',rotation:90});expect(saved().segments).toEqual(before.segments);expect(saved().site).toEqual(before.site);expect(saved().posts).toEqual(before.posts);
 fireEvent.click(screen.getByRole('button',{name:'Left'}));expect(saved().sceneSetup!.house?.side).toBe('left');expect(saved().sceneSetup!.placement?.rotation).toBe(90);
 fireEvent.click(screen.getByText('Exact placement',{selector:'summary'}));fireEvent.change(screen.getByLabelText('X · inches'),{target:{value:"2' 6\""}});expect(saved().sceneSetup!.placement?.x).toBe("2' 6\"");
 fireEvent.click(screen.getByRole('button',{name:'Reset angle'}));expect(saved().sceneSetup!.placement).toEqual({x:"2' 6\"",y:'0',z:'0',rotation:0});
 fireEvent.click(screen.getByRole('button',{name:'Hide house'}));expect(saved().sceneSetup!.house).toBeNull();expect(saved().segments).toEqual(before.segments);
});
it('keeps the reference house out of site anchors and steel while offering an explicit measured wall action',()=>{
 const data=attachedFabricationFixture(),meshes=siteMeshes(data.site),anchors=siteAnchors(data),sources=steelSources(data);data.sceneSetup={environment:'exterior',projectType:'stairs',house:{side:'left'}};
 const add=vi.fn();render(<><HouseLayout data={data} set={()=>{}} lang="en" onAddWall={add} onClose={()=>{}}/><SiteDrawing data={data}/></>);
 expect(document.querySelector('[data-house-context="reference-only"]')).toBeTruthy();expect(siteMeshes(data.site)).toEqual(meshes);expect(siteAnchors(data)).toEqual(anchors);expect(steelSources(data)).toEqual(sources);
 fireEvent.click(screen.getByRole('button',{name:'Add measured wall'}));expect(add).toHaveBeenCalledOnce();
});
