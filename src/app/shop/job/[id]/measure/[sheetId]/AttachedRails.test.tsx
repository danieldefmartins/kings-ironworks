import {useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {attachedPorchFixture} from '@/lib/shop/measure-site.fixture';
import {siteRailSignature} from '@/lib/shop/measure-site-rails';
import SiteWorkspace from './SiteWorkspace';
function Harness(){
 const [data,setData]=useState(()=>{const d=attachedPorchFixture();d.site!.rails![0].checkedSignature=siteRailSignature(d.site,d.site!.rails![0]);return d;});
 return <SiteWorkspace data={data} set={fn=>setData(prev=>{const next=structuredClone(prev);fn(next);return next;})} lang="en" onContinue={()=>{}} onMeasure={()=>{}} onDetails={()=>{}}/>;
}
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('updates the visible panel with the host and revokes its previous field verification',()=>{
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:/Porch side railing/}));
 const panel=document.querySelector('[data-attached-rail] polygon')!;const before=panel.getAttribute('points');
 const check=screen.getByRole('checkbox',{name:/Field layout verified/}) as HTMLInputElement;expect(check.checked).toBe(true);
 fireEvent.change(screen.getByLabelText('X · along'),{target:{value:'126'}});
 expect(panel.getAttribute('points')).not.toBe(before);expect(check.checked).toBe(false);
 expect((screen.getByRole('checkbox',{name:/Field measurements verified/}) as HTMLInputElement).checked).toBe(false);
});
it('adds a blank railing and supports removal with undo',()=>{
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);render(<Harness/>);
 fireEvent.click(screen.getByRole('button',{name:'＋ Add attached railing'}));
 expect((screen.getByLabelText('Finished railing height above floor') as HTMLInputElement).value).toBe('');
 expect(document.querySelectorAll('[data-attached-rail]')).toHaveLength(1);
 const start=screen.getByRole('group',{name:'Start connection'});
 fireEvent.change(within(start).getByLabelText('Attach to'),{target:{value:'column-1'}});
 fireEvent.click(screen.getByRole('button',{name:'Remove railing'}));expect(confirm).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:/Restore removed railing/}));
 expect((within(screen.getByRole('group',{name:'Start connection'})).getByLabelText('Attach to') as HTMLSelectElement).value).toBe('column-1');
 expect(screen.getByRole('button',{name:/Porch side railing/})).toBeTruthy();
});
