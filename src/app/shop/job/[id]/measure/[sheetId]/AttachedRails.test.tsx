import {useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {attachedPorchFixture,attachedFabricationFixture} from '@/lib/shop/measure-site.fixture';
import {siteRailSignature} from '@/lib/shop/measure-site-rails';
import SiteWorkspace from './SiteWorkspace';
import AttachedRails from './AttachedRails';
function Harness({fabrication=false}:{fabrication?:boolean}){
 const [data,setData]=useState(()=>{const d=fabrication?attachedFabricationFixture():attachedPorchFixture();d.site!.rails![0].checkedSignature=siteRailSignature(d.site,d.site!.rails![0]);return d;});
 return <SiteWorkspace data={data} set={fn=>setData(prev=>{const next=structuredClone(prev);fn(next);return next;})} lang="en" onContinue={()=>{}} onMeasure={()=>{}} onDetails={()=>{}}/>;
}
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('updates the visible panel with the host and revokes its previous field verification',()=>{
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));fireEvent.click(screen.getByRole('button',{name:/Porch side railing/}));
 const panel=document.querySelector('[data-attached-rail] polygon')!;const before=panel.getAttribute('points');
 fireEvent.click(screen.getByRole('button',{name:'3. Review & cuts'}));
 const check=screen.getByRole('checkbox',{name:/Field layout verified/}) as HTMLInputElement;expect(check.checked).toBe(true);
 fireEvent.click(screen.getByText(/Site objects/,{selector:'summary'}));
 fireEvent.click(screen.getByRole('button',{name:/House wall.*Verified/}));
 fireEvent.click(screen.getByText('Position & more details',{selector:'summary'}));
 fireEvent.change(screen.getByLabelText('X · along'),{target:{value:'126'}});
 expect(panel.getAttribute('points')).not.toBe(before);expect(check.checked).toBe(false);
 expect((screen.getByRole('checkbox',{name:/Field measurements verified/}) as HTMLInputElement).checked).toBe(false);
});
it('adds a blank railing and supports removal with undo',()=>{
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));
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
 render(<Harness fabrication/>);fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));fireEvent.click(screen.getByRole('button',{name:/Porch side railing/}));
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
 render(<Harness fabrication/>);fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));fireEvent.click(screen.getByRole('button',{name:/Porch side railing/}));
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
 render(<Harness fabrication/>);fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));fireEvent.click(screen.getByRole('button',{name:/Porch side railing/}));
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

it('adds and removes a second top rail with explicit dimensions and a new cut mark',()=>{
 render(<Harness fabrication/>);fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));fireEvent.click(screen.getByRole('button',{name:/Porch side railing/}));
 fireEvent.click(screen.getByRole('button',{name:'2. Members & gaps'}));
 fireEvent.click(screen.getByRole('button',{name:'Add second top rail'}));
 const second=screen.getByRole('group',{name:'Second top rail'});
 fireEvent.change(within(second).getByLabelText('Width across railing'),{target:{value:'1'}});
 fireEvent.change(within(second).getByLabelText('Depth normal to rake'),{target:{value:'1/2'}});
 fireEvent.change(within(second).getByLabelText('Section'),{target:{value:'solid'}});
 fireEvent.change(screen.getByLabelText('Vertical drop between top faces'),{target:{value:'4'}});
 fireEvent.click(screen.getByRole('button',{name:'3. Review & cuts'}));
 expect(screen.getByRole('cell',{name:'SR1-T2'})).toBeTruthy();
 expect((screen.getByRole('checkbox',{name:/Field layout verified/}) as HTMLInputElement).checked).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'2. Members & gaps'}));
 fireEvent.click(screen.getByRole('button',{name:'Remove second top rail'}));
 fireEvent.click(screen.getByRole('button',{name:'3. Review & cuts'}));
 expect(screen.queryByRole('cell',{name:'SR1-T2'})).toBeNull();
 expect(screen.getByRole('cell',{name:'SR1-T'})).toBeTruthy();
});

it('embeds one panel inspector with collapsible details and preserves review invalidation without wizard navigation',()=>{
 function Embedded(){const [data,setData]=useState(()=>{const d=attachedFabricationFixture(),r=d.site!.rails![0];r.checkedSignature=siteRailSignature(d.site,r);r.fabrication!.reviewedSignature=siteRailSignature(d.site,r);return d;});return <AttachedRails embedded autoSelect data={data} set={fn=>setData(old=>{const next=structuredClone(old);fn(next);return next;})} lang="en"/>;}
 render(<Embedded/>);expect(screen.queryByRole('navigation')).toBeNull();expect(screen.queryByRole('button',{name:/Continue:/})).toBeNull();
 fireEvent.click(screen.getByText('Members',{selector:'summary'}));const top=screen.getByRole('group',{name:'Top rail'});fireEvent.change(within(top).getByLabelText('Width across railing'),{target:{value:'2'}});
 fireEvent.click(screen.getByText('Verification & cuts',{selector:'summary'}));expect((screen.getByRole('checkbox',{name:/Field layout verified/}) as HTMLInputElement).checked).toBe(false);expect((screen.getByRole('checkbox',{name:/Shop details checked/}) as HTMLInputElement).checked).toBe(false);expect(screen.getByRole('button',{name:'Download cut CSV'})).toBeTruthy();
 fireEvent.click(screen.getByText('Members',{selector:'summary'}));fireEvent.click(screen.getByText('Members',{selector:'summary'}));expect((within(screen.getByRole('group',{name:'Top rail'})).getByLabelText('Width across railing') as HTMLInputElement).value).toBe('2');
});

it('opens the externally selected rail and keeps scene selection synchronized with local panel choices',()=>{
 function Embedded(){const [data,setData]=useState(()=>{const d=attachedFabricationFixture(),second=structuredClone(d.site!.rails![0]);second.id='second-panel';second.label='Other opening';second.height='42';d.site!.rails!.push(second);return d;}),[selected,select]=useState('panel-1');return <><button type="button" onClick={()=>select('second-panel')}>Pick other panel in scene</button><output data-testid="selected-panel">{selected}</output><AttachedRails embedded selectedRailId={selected} onSelectRail={select} data={data} set={fn=>setData(old=>{const next=structuredClone(old);fn(next);return next;})} lang="en"/></>;}
 render(<Embedded/>);fireEvent.click(screen.getByRole('button',{name:'Pick other panel in scene'}));fireEvent.click(screen.getByText('Connections',{selector:'summary'}));expect((screen.getByLabelText('Finished railing height above floor') as HTMLInputElement).value).toBe('42');
 fireEvent.click(screen.getByRole('button',{name:/SR1 · Porch side railing/}));expect(screen.getByTestId('selected-panel').textContent).toBe('panel-1');fireEvent.click(screen.getByText('Connections',{selector:'summary'}));expect((screen.getByLabelText('Finished railing height above floor') as HTMLInputElement).value).toBe('36');
});
it('commits fractional inches from a selected face edge and retains the last saved position for invalid drafts',()=>{
 const saved=vi.fn();function ExactHarness(){const [data,setData]=useState(attachedPorchFixture);return <AttachedRails data={data} set={fn=>setData(old=>{const next=structuredClone(old);fn(next);saved(next);return next;})} lang="en" autoSelect/>;}
 render(<ExactHarness/>);const start=()=>within(screen.getByRole('group',{name:'Start connection'}));
 const distance=()=>start().getByLabelText(/From near edge · inches/) as HTMLInputElement;
 expect(distance().value).toBe('4');fireEvent.change(distance(),{target:{value:'2 1/2'}});expect(saved).not.toHaveBeenCalled();fireEvent.blur(distance());expect(saved.mock.calls.at(-1)![0].site.rails[0].start.along).toBe(.3125);expect(saved.mock.calls.at(-1)![0].site.rails[0].checkedSignature).toBe('');
 const count=saved.mock.calls.length;fireEvent.change(distance(),{target:{value:'9'}});fireEvent.blur(distance());expect(saved).toHaveBeenCalledTimes(count);expect(start().getByRole('alert').textContent).toContain('Last saved position is unchanged');
 fireEvent.change(distance(),{target:{value:''}});fireEvent.blur(distance());expect(saved).toHaveBeenCalledTimes(count);
});
