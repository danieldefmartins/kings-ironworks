import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {porchSiteFixture} from '@/lib/shop/measure-site.fixture';
import {newSiteObject,siteMeshes} from '@/lib/shop/measure-site';
import {drawingProjection} from '@/lib/shop/measure-projection';
import DrawingSvg from './DrawingSvg';
import {drawingPosts} from '@/lib/shop/measure-drawing';
import {stairGeometry} from '@/lib/shop/measure-geometry';
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

it('carries an anchored draft into the measuring sketch but excludes it from printable geometry',async()=>{
 const {wallPlacementEdges}=await import('@/lib/shop/measure-wall-placement');
 const data=porchSiteFixture(),edge=wallPlacementEdges(data)[0];
 data.site!.objects.push({...newSiteObject('wall','draft-anchor','Stair wall'),wallAnchor:{segmentId:edge.segmentId,side:edge.side,gap:'0',startExtension:'0',endExtension:'0',baseOffset:'0'}});
 const view=render(<DrawingSvg data={data} lang="en" view="iso" showSiteContext draftSiteObjects/>);
 expect(document.querySelector('[data-draft-wall="draft-anchor"]')).toBeTruthy();
 expect(document.querySelector('[data-site-context="draft-anchor"]')).toBeNull();
 view.rerender(<DrawingSvg data={data} lang="en" view="iso" showSiteContext/>);
 expect(document.querySelector('[data-draft-wall="draft-anchor"]')).toBeNull();
});
it('draws a measured platform riser from the shared geometry in side and isometric views',async()=>{
 const {newMeasureData}=await import('@/lib/shop/measure');const {stairGeometry}=await import('@/lib/shop/measure-geometry');
 const data=newMeasureData('stair_platform',1);const flight=data.segments[0],platform=data.segments[1];if(flight.kind!=='flight'||platform.kind!=='platform')throw Error();flight.width='36';flight.steps[0].rise='7';flight.steps[0].run='11';Object.assign(platform,{entryRise:'6 1/2',length:'48',depth:'36',slope:'0'});
 const before=JSON.stringify(data),t=stairGeometry(data)!.treads[1];const [a,, ,d]=t.corners;const low={...a,z:a.z-t.rise};
 const view=render(<DrawingSvg data={data} lang="en" view="side" onDimension={()=>{}}/>);
 const side=drawingProjection('side',0).project;expect([...document.querySelectorAll('polyline')].map(p=>p.getAttribute('points'))).toContain([low,a,t.corners[1]].map(p=>side(p).join(',')).join(' '));expect(screen.getByRole('button',{name:'Edit rise · segment 2'})).toBeTruthy();expect(screen.getByText('6 1/2')).toBeTruthy();
 view.rerender(<DrawingSvg data={data} lang="en" view="iso"/>);const iso=drawingProjection('iso',0).project;expect([...document.querySelectorAll('polygon')].map(p=>p.getAttribute('points'))).toContain([low,a,d,{...d,z:d.z-t.rise}].map(p=>iso(p).join(',')).join(' '));expect(JSON.stringify(data)).toBe(before);
});

it('draws a selectable face connection marker and rail continuation instead of a fabricated support post',()=>{
 const data=porchSiteFixture(),post=data.posts[1];post.pointType='existing_post';post.supportAttachment={objectId:'column-1',face:'left',along:.5,angle:0,elevation:'0',connection:'Measured clip',gap:'1/8'};const tap=vi.fn(),before=JSON.stringify(data);render(<DrawingSvg data={data} lang="en" view="iso" showSiteContext onTapPost={tap}/>);
 const marker=document.querySelector(`[data-support-terminal="${post.id}"]`)!;expect(marker).toBeTruthy();expect(marker.querySelector('[data-post-axis]')).toBeNull();expect(marker.querySelector('circle')).toBeTruthy();const line=[...document.querySelectorAll('[data-native-rail]')].find(node=>node.getAttribute('data-native-rail')?.includes(post.id))!;expect(line).toBeTruthy();const terminal=drawingPosts(data,stairGeometry(data)!).find(p=>p.post.id===post.id)!,point=drawingProjection('iso',0).project(terminal.top!);expect([line.getAttribute('x2'),line.getAttribute('y2')]).toEqual(point.map(String));fireEvent.click(marker.querySelector('[role="button"]')!);expect(tap).toHaveBeenCalledWith(post.id);expect(JSON.stringify(data)).toBe(before);
});
