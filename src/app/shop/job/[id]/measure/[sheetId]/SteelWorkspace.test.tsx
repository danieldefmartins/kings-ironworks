import {useState} from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {attachedFabricationFixture} from '@/lib/shop/measure-site.fixture';
import SteelWorkspace from './SteelWorkspace';
import type {MeasureData} from '@/lib/shop/measure';
import {nativeGeometrySignature} from '@/lib/shop/measure-native-steel';
const catalog=[{id:'steel',sku:'FB-TEST',display:'Test flat bar',spec:'1 1/2 x 3/8',category:'flat_bar',grade:'A36',unit:'ft',stock_length_ft:24}];
function Harness({sheetId,initialData}:{sheetId?:string;initialData?:MeasureData}={}){const [data,setData]=useState(()=>initialData||attachedFabricationFixture());return <SteelWorkspace data={data} set={fn=>setData(prev=>{const next=structuredClone(prev);fn(next);return next;})} catalog={catalog} lang="en" sheetId={sheetId}/>;}
beforeEach(()=>{vi.stubGlobal('requestAnimationFrame',(fn:()=>void)=>{fn();return 1;});HTMLElement.prototype.scrollIntoView=vi.fn();});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('assigns catalog stock to a tapped component, calculates whole bars and supports undo',()=>{
 render(<Harness/>);fireEvent.click(within(screen.getByRole('group',{name:'Select member material'})).getByRole('button',{name:'Second top rail'}));
 fireEvent.click(screen.getByRole('button',{name:/Test flat bar/}));
 expect((screen.getByLabelText('Stock bar length') as HTMLInputElement).value).toBe("24'");
 fireEvent.change(screen.getByLabelText('Length 1'),{target:{value:'150'}});
 fireEvent.change(screen.getByLabelText('Quantity'),{target:{value:'3'}});
 fireEvent.click(screen.getByRole('button',{name:'Review stock →'}));
 fireEvent.change(screen.getByLabelText('Saw kerf · inches'),{target:{value:'1/8'}});
 fireEvent.change(screen.getByLabelText('Trim EACH end · inches'),{target:{value:'1/4'}});
 fireEvent.click(screen.getByRole('checkbox',{name:/I checked every assigned/}));
 expect(screen.getByText('3 × 24′ · Test flat bar')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Download stock schedule'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'1. Assign steel'}));
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

it('keeps the canvas and stock review in separate steps without losing the selected member',()=>{
 render(<Harness/>);
 expect(screen.queryByRole('heading',{name:'Stock needed'})).toBeNull();
 fireEvent.click(within(screen.getByRole('group',{name:'Select member material'})).getByRole('button',{name:'Top rail'}));
 fireEvent.change(screen.getByLabelText('Member name'),{target:{value:'Entry top rail'}});
 fireEvent.click(screen.getByRole('button',{name:'Review stock →'}));
 expect(screen.getByRole('heading',{name:'Stock needed'})).toBeTruthy();
 expect(screen.queryByLabelText('Member name')?.closest('[hidden]')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'1. Assign steel'}));
 expect((screen.getByLabelText('Member name') as HTMLInputElement).value).toBe('Entry top rail');
});
it('opens a measured member directly by name without creating a duplicate',()=>{
 render(<Harness/>);
 const select=screen.getByLabelText('Measured members');
 const option=within(select).getAllByRole('option').find(o=>o.textContent?.includes('SR1-T')) as HTMLOptionElement;
 fireEvent.change(select,{target:{value:option.value}});
 expect(screen.getByText('Linked measured member')).toBeTruthy();
 fireEvent.change(select,{target:{value:option.value}});
 expect(within(screen.getByLabelText('Assigned members')).getAllByRole('button')).toHaveLength(1);
});

it('imports native drawing cuts without replacing manual assignments and reports stale-drawing errors',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({snapshot:{signature:'geometry',sourceUpdatedAt:'today',drawingId:'drawing',sources:[],pending:['Post connection']}}))).mockResolvedValueOnce(new Response(JSON.stringify({error:'Generate a new drawing for these measurements.'}),{status:409}));
 vi.stubGlobal('fetch',fetch);render(<Harness sheetId="sample-sheet"/>);
 fireEvent.click(within(screen.getByRole('group',{name:'Select member material'})).getByRole('button',{name:'Top rail'}));
 fireEvent.change(screen.getByLabelText('Member name'),{target:{value:'Keep this assignment'}});
 const button=screen.getByRole('button',{name:'Import stair & railing cuts from drawing'});fireEvent.click(button);
 await waitFor(()=>expect(screen.getByText('Cuts imported. Some members still need review in the drawing.')).toBeTruthy());
 expect(fetch).toHaveBeenCalledWith('/shop/api/shop-drawings/native-cuts?sheet=sample-sheet');
 expect((screen.getByLabelText('Member name') as HTMLInputElement).value).toBe('Keep this assignment');
 fireEvent.click(button);await waitFor(()=>expect(screen.getByText('Generate a new drawing for these measurements.')).toBeTruthy());
 expect((screen.getByLabelText('Member name') as HTMLInputElement).value).toBe('Keep this assignment');
});

it('distinguishes checked assignments from unassigned members and stale drawing cuts',()=>{
 const data=attachedFabricationFixture();data.nativeSteel={signature:'old geometry',sourceUpdatedAt:'2026-10-10',drawingId:'drawing',sources:[],pending:['P1','P2']};
 render(<Harness initialData={data}/>);
 expect(screen.getByText('18 measured members unassigned')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'2. Stock & review'}));
 expect(screen.getByText(/Imported drawing cuts are outdated/)).toBeTruthy();
 expect(screen.getByText(/2 drawing members still need resolved fabrication cuts/)).toBeTruthy();
});
it('limits native bulk assignment to the selected section and hides unsupported resizing',()=>{
 const data=attachedFabricationFixture();data.nativeSteel={signature:nativeGeometrySignature(data),sourceUpdatedAt:'2026-10-10',drawingId:'drawing',pending:[],sources:['F01-L-V1','F01-L-V2','F02-L-V1'].map(mark=>({key:`native:${mark}`,label:mark,role:'picket',length:30,profile:'1.5 x .375 solid',signature:'drawing'}))};
 render(<Harness initialData={data}/>);fireEvent.change(screen.getByLabelText('Measured members'),{target:{value:'native:F01-L-V1'}});fireEvent.click(screen.getByRole('button',{name:/Test flat bar/}));
 expect(screen.queryByRole('button',{name:'Use this catalog size in the drawing'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Use for unassigned pickets in this panel'}));
 const assigned=within(screen.getByLabelText('Assigned members'));expect(assigned.getAllByRole('button')).toHaveLength(2);expect(assigned.queryByRole('button',{name:/F02/})).toBeNull();
});
