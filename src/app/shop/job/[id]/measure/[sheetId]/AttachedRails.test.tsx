import {useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {attachedPorchFixture,attachedFabricationFixture} from '@/lib/shop/measure-site.fixture';
import {siteRailSignature} from '@/lib/shop/measure-site-rails';
import SiteWorkspace from './SiteWorkspace';
function Harness({fabrication=false}:{fabrication?:boolean}){
 const [data,setData]=useState(()=>{const d=fabrication?attachedFabricationFixture():attachedPorchFixture();d.site!.rails![0].checkedSignature=siteRailSignature(d.site,d.site!.rails![0]);return d;});
 return <SiteWorkspace data={data} set={fn=>setData(prev=>{const next=structuredClone(prev);fn(next);return next;})} lang="en" onContinue={()=>{}} onMeasure={()=>{}} onDetails={()=>{}}/>;
}
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('updates the visible panel with the host and revokes its previous field verification',()=>{
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:/Porch side railing/}));
 const panel=document.querySelector('[data-attached-rail] polygon')!;const before=panel.getAttribute('points');
 fireEvent.click(screen.getByRole('button',{name:'3. Review & cuts'}));
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

it('records shop review separately and clears both checks after changing a cut gap',()=>{
 render(<Harness fabrication/>);fireEvent.click(screen.getByRole('button',{name:/Porch side railing/}));
 fireEvent.click(screen.getByRole('button',{name:'3. Review & cuts'}));
 const field=screen.getByRole('checkbox',{name:/Field layout verified/}) as HTMLInputElement;
 const shop=screen.getByRole('checkbox',{name:/Shop details checked/}) as HTMLInputElement;
 expect(field.checked).toBe(true);expect(shop.disabled).toBe(false);
 fireEvent.click(shop);expect(shop.checked).toBe(true);expect(field.checked).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'2. Members & gaps'}));
 fireEvent.change(screen.getByLabelText('Start gap · horizontal'),{target:{value:'1/4'}});
 fireEvent.click(screen.getByRole('button',{name:'3. Review & cuts'}));
 expect(field.checked).toBe(false);expect(shop.checked).toBe(false);expect(shop.disabled).toBe(true);
 expect(screen.getByText('Calculated cut schedule')).toBeTruthy();
});

it('shows one task at a time and preserves edits when switching steps',()=>{
 render(<Harness fabrication/>);fireEvent.click(screen.getByRole('button',{name:/Porch side railing/}));
 expect(screen.getByRole('group',{name:'Start connection'})).toBeTruthy();
 expect(screen.queryByRole('group',{name:'Top rail'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Continue: Members & gaps →'}));
 expect(screen.queryByRole('group',{name:'Start connection'})).toBeNull();
 const top=screen.getByRole('group',{name:'Top rail'});
 fireEvent.change(within(top).getByLabelText('Width across railing'),{target:{value:'2'}});
 fireEvent.click(screen.getByRole('button',{name:'Continue: Review & cuts →'}));
 expect(screen.queryByRole('group',{name:'Top rail'})).toBeNull();
 expect(screen.getByRole('button',{name:'Download cut CSV'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'2. Members & gaps'}));
 expect((within(screen.getByRole('group',{name:'Top rail'})).getByLabelText('Width across railing') as HTMLInputElement).value).toBe('2');
});

it('reuses member sizes without reusing the original opening or verification',()=>{
 render(<Harness fabrication/>);fireEvent.click(screen.getByRole('button',{name:/Porch side railing/}));
 fireEvent.click(screen.getByRole('button',{name:'Use design for another opening'}));
 expect((within(screen.getByRole('group',{name:'Start connection'})).getByLabelText('Attach to') as HTMLSelectElement).value).toBe('');
 expect((within(screen.getByRole('group',{name:'End connection'})).getByLabelText(/Floor elevation above structure bottom/) as HTMLInputElement).value).toBe('');
 expect(document.querySelectorAll('[data-attached-rail]')).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:'2. Members & gaps'}));
 expect((within(screen.getByRole('group',{name:'Top rail'})).getByLabelText('Width across railing') as HTMLInputElement).value).toBe('1 1/2');
 fireEvent.change(within(screen.getByRole('group',{name:'Top rail'})).getByLabelText('Width across railing'),{target:{value:'2'}});
 fireEvent.click(screen.getByRole('button',{name:'3. Review & cuts'}));
 expect((screen.getByRole('checkbox',{name:/Field layout verified/}) as HTMLInputElement).checked).toBe(false);
 expect((screen.getByRole('checkbox',{name:/Shop details checked/}) as HTMLInputElement).checked).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:/SR1 · Porch side railing.*Layout verified/}));
 fireEvent.click(screen.getByRole('button',{name:'2. Members & gaps'}));
 expect((within(screen.getByRole('group',{name:'Top rail'})).getByLabelText('Width across railing') as HTMLInputElement).value).toBe('1 1/2');
});
