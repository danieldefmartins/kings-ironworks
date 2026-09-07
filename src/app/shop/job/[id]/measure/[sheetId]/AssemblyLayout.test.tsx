import {useState} from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect} from 'vitest';
import {newMeasureData,newPresetMeasureData} from '@/lib/shop/measure';
import AssemblyLayout from './AssemblyLayout';
function Harness(){
 const [data,setData]=useState(()=>{const d=newMeasureData('straight',2);d.segments.push({kind:'platform',length:'48',depth:'84',diag:'',slope:'0',slopeDir:'',turn:'left'},structuredClone(d.segments[0]));return d;});
 return <><AssemblyLayout data={data} lang="en" set={fn=>setData(d=>{const next=structuredClone(d);fn(next);return next;})}/><output data-testid="landing">{JSON.stringify(data.segments[1])}</output></>;
}
it('lets a measurer correct the whole-stair turn and landing registration together',()=>{
 render(<Harness/>);
 const turn=screen.getByRole('combobox');
 expect(turn.querySelectorAll('option')).toHaveLength(4);
 fireEvent.change(turn,{target:{value:'u'}});
 fireEvent.change(screen.getByLabelText('Incoming flight · left-edge offset'),{target:{value:'8'}});
 const landing=JSON.parse(screen.getByTestId('landing').textContent!);
 expect(landing).toMatchObject({turn:'u',entryOffset:'8',length:'48',depth:'84'});
 fireEvent.change(turn,{target:{value:'none'}});
 expect(JSON.parse(screen.getByTestId('landing').textContent!).turn).toBe('none');
});

it('applies one turn direction to all four landings in a five-flight staircase',()=>{
 const {data}=newPresetMeasureData('multi_flight',3,5);
 const {container}=render(<AssemblyLayout data={data} lang="en" set={fn=>fn(data)}/>);
 fireEvent.change(container.querySelector('select')!,{target:{value:'right'}});
 expect(data.segments.filter(s=>s.kind==='platform').map(s=>s.turn)).toEqual(['right','right','right','right']);
});
