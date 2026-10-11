import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {porchSiteFixture} from '@/lib/shop/measure-site.fixture';
import {newSiteObject,siteMeshes} from '@/lib/shop/measure-site';
import SiteDrawing,{siteAnchors} from './SiteDrawing';
afterEach(cleanup);
it('renders selectable editor-only ghosts without creating dimensions, anchors or fabrication geometry',()=>{
 const data=porchSiteFixture();const blank=newSiteObject('wall','blank-wall','Unmeasured house');data.site!.objects.push(blank);const before=JSON.stringify(data),select=vi.fn();
 const view=render(<SiteDrawing data={data} draftObjects onSelect={select}/>);
 const ghost=screen.getByRole('button',{name:'Unmeasured house · Not measured'});expect(ghost.getAttribute('data-position-known')).toBe('false');
 fireEvent.click(ghost);expect(select).toHaveBeenCalledWith('blank-wall');
 expect(JSON.stringify(data)).toBe(before);expect(siteMeshes(data.site).some(m=>m.id==='blank-wall')).toBe(false);expect(siteAnchors(data).some(a=>a.id.startsWith('blank-wall:'))).toBe(false);
 view.rerender(<SiteDrawing data={data}/>);expect(document.querySelector('[data-site-ghost]')).toBeNull();
});
it('uses a recorded origin for the placeholder but replaces it only when actual geometry is complete',()=>{
 const data=porchSiteFixture();const object={...newSiteObject('column','new-column','New column'),x:'180',y:'24',z:'0'};data.site!.objects.push(object);
 const view=render(<SiteDrawing data={data} draftObjects onSelect={()=>{}}/>);expect(screen.getByRole('button',{name:'New column · Not measured'}).getAttribute('data-position-known')).toBe('true');expect(siteMeshes(data.site).some(m=>m.id===object.id)).toBe(false);
 object.length='6';object.depth='6';object.height='96';view.rerender(<SiteDrawing data={data} draftObjects onSelect={()=>{}}/>);
 expect(screen.queryByRole('button',{name:'New column · Not measured'})).toBeNull();expect(siteMeshes(data.site).some(m=>m.id===object.id)).toBe(true);
});

it('places walls through real sketch edge targets and previews unfinished walls at that edge only',()=>{
 const data=porchSiteFixture(),before=JSON.stringify(data),pick=vi.fn();
 const view=render(<SiteDrawing data={data} wallPlacement onWallEdge={pick}/>);
 fireEvent.click(screen.getByRole('button',{name:'Place wall · Left · segment 1'}));
 const [segmentId,side]=pick.mock.calls[0];expect(side).toBe('left');expect(JSON.stringify(data)).toBe(before);
 const wall={...newSiteObject('wall','anchored','Left stair wall'),wallAnchor:{segmentId,side,gap:'0',startExtension:'0',endExtension:'0',baseOffset:'0'}};
 data.site!.objects.push(wall);
 view.rerender(<SiteDrawing data={data} draftObjects onSelect={()=>{}}/>);
 expect(document.querySelector('[data-wall-preview="anchored"]')).toBeTruthy();
 expect(document.querySelector('[data-site-ghost="anchored"]')).toBeNull();
 expect(siteAnchors(data).some(a=>a.id.startsWith('anchored:'))).toBe(false);
 view.rerender(<SiteDrawing data={data}/>);expect(document.querySelector('[data-wall-preview]')).toBeNull();
});
