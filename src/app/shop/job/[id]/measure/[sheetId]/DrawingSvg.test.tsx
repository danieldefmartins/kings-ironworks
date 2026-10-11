import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {porchSiteFixture} from '@/lib/shop/measure-site.fixture';
import {newSiteObject,siteMeshes} from '@/lib/shop/measure-site';
import {drawingProjection} from '@/lib/shop/measure-projection';
import DrawingSvg from './DrawingSvg';
afterEach(cleanup);
it('shows real site geometry in the same projection, within drawing bounds, only when requested',()=>{
 const data=porchSiteFixture(),before=JSON.stringify(data),mesh=siteMeshes(data.site)[0],view=render(<DrawingSvg data={data} lang="en" view="iso" showSiteContext/>);
 const face=document.querySelector(`[data-site-context="${mesh.id}"]`)!;
 const expected=mesh.faces.map(f=>f.map(i=>drawingProjection('iso',0).project(mesh.vertices[i])).map(p=>p.join(',')).join(' '));
 expect(expected).toContain(face.getAttribute('points'));
 const [x,y,width,height]=document.querySelector('svg')!.getAttribute('viewBox')!.split(' ').map(Number);
 for(const m of siteMeshes(data.site))for(const v of m.vertices){const p=drawingProjection('iso',0).project(v);expect(p[0]).toBeGreaterThanOrEqual(x);expect(p[0]).toBeLessThanOrEqual(x+width);expect(p[1]).toBeGreaterThanOrEqual(y);expect(p[1]).toBeLessThanOrEqual(y+height);}
 expect(JSON.stringify(data)).toBe(before);view.rerender(<DrawingSvg data={data} lang="en" view="iso"/>);expect(document.querySelector('[data-site-context]')).toBeNull();
});
it('excludes unknown objects instead of inventing geometry and names platform targets accurately',()=>{
 const data=porchSiteFixture();data.site!.objects.push(newSiteObject('wall','unknown','Unknown wall'));render(<DrawingSvg data={data} lang="en" view="side" showSiteContext onTapPlatform={()=>{}}/>);
 expect(document.querySelector('[data-site-context="unknown"]')).toBeNull();expect(screen.queryByRole('button',{name:'Step null'})).toBeNull();
 expect(screen.getByRole('button',{name:'Segment 2'})).toBeTruthy();
});

it('shows the reference house only in context view, without adding site geometry or dimensions',()=>{
 const data=porchSiteFixture();data.sceneSetup={environment:'exterior',projectType:'stairs',house:{side:'right',offset:'12'}};
 const before=JSON.stringify(data),meshes=siteMeshes(data.site);const view=render(<DrawingSvg data={data} lang="en" view="iso" showSiteContext/>);
 expect(screen.getByText('HOUSE · UNMEASURED REFERENCE')).toBeTruthy();expect(document.querySelector('[data-house-reference]')?.getAttribute('pointer-events')).toBe('none');expect(siteMeshes(data.site)).toEqual(meshes);expect(JSON.stringify(data)).toBe(before);
 view.rerender(<DrawingSvg data={data} lang="en" view="iso"/>);expect(document.querySelector('[data-house-reference]')).toBeNull();
});
