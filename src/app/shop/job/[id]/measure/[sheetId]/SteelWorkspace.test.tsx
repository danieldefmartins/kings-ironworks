import {useState} from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {attachedFabricationFixture} from '@/lib/shop/measure-site.fixture';
import SteelWorkspace from './SteelWorkspace';
const catalog=[{id:'steel',sku:'FB-TEST',display:'Test flat bar',spec:'1 1/2 x 3/8',category:'flat_bar',grade:'A36',unit:'ft',stock_length_ft:24}];
function Harness(){const [data,setData]=useState(attachedFabricationFixture);return <SteelWorkspace data={data} set={fn=>setData(prev=>{const next=structuredClone(prev);fn(next);return next;})} catalog={catalog} lang="en"/>;}
beforeEach(()=>{vi.stubGlobal('requestAnimationFrame',(fn:()=>void)=>{fn();return 1;});HTMLElement.prototype.scrollIntoView=vi.fn();});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('assigns catalog stock to a tapped component, calculates whole bars and supports undo',()=>{
 render(<Harness/>);fireEvent.click(within(screen.getByRole('group',{name:'Select member material'})).getByRole('button',{name:'Second top rail'}));
 fireEvent.click(screen.getByRole('button',{name:/Test flat bar/}));
 expect((screen.getByLabelText('Stock bar length') as HTMLInputElement).value).toBe("24'");
 fireEvent.change(screen.getByLabelText('Length 1'),{target:{value:'150'}});
 fireEvent.change(screen.getByLabelText('Quantity'),{target:{value:'3'}});
 fireEvent.change(screen.getByLabelText('Saw kerf · inches'),{target:{value:'1/8'}});
 fireEvent.change(screen.getByLabelText('Trim EACH end · inches'),{target:{value:'1/4'}});
 fireEvent.click(screen.getByRole('checkbox',{name:/I checked every assigned/}));
 expect(screen.getByText('3 × 24′ · Test flat bar')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Download stock schedule'})).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Length 1'),{target:{value:'140'}});
 expect(screen.queryByRole('button',{name:'Download stock schedule'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Remove assignment'}));
 fireEvent.click(screen.getByRole('button',{name:'Undo removal'}));
 expect((screen.getByLabelText('Length 1') as HTMLInputElement).value).toBe('140');
});
it('links a tapped measured picket and assigns the same SKU to the remaining pickets',()=>{
 render(<Harness/>);fireEvent.change(screen.getByLabelText('Choose assembly'),{target:{value:'measured'}});
 fireEvent.click(screen.getByRole('button',{name:'Assign material SR1-V1'}));
 expect(screen.getByText('Linked measured member')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:/Test flat bar/}));
 fireEvent.click(screen.getByRole('button',{name:'Use for unassigned pickets in this panel'}));
 expect(screen.getAllByRole('button',{name:/Porch side railing · SR1-V\d+\s*Test flat bar/})).toHaveLength(16);
});
