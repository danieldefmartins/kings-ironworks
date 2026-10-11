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
