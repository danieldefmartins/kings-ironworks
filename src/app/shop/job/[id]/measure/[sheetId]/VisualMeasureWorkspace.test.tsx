import {useState} from 'react';
import {afterEach,expect,it} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {newMeasureData,type MeasureData} from '@/lib/shop/measure';
import VisualMeasureWorkspace from './VisualMeasureWorkspace';
afterEach(cleanup);
const saved=():MeasureData=>JSON.parse(screen.getByTestId('saved-measurement').textContent!);
function Harness(){const [data,setData]=useState(()=>newMeasureData('straight',2));return <><output hidden data-testid="saved-measurement">{JSON.stringify(data)}</output><VisualMeasureWorkspace data={data} set={fn=>setData(d=>{const copy=structuredClone(d);fn(copy);return copy;})} lang="en" shape="straight"/></>;}
it('opens only the selected dimensions, preserves measurements, and closes the inspector',()=>{
 render(<Harness/>);expect(screen.queryByLabelText('Tread depth')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Segment 1 · flight'}));
 fireEvent.change(screen.getByLabelText('Tread depth'),{target:{value:'11'}});fireEvent.change(screen.getByLabelText('Riser height'),{target:{value:'7'}});fireEvent.change(screen.getByLabelText('Width'),{target:{value:'36'}});
 expect(saved().segments[0]).toMatchObject({width:'36',steps:[{run:'11',rise:'7'},{}]});
 fireEvent.click(screen.getByRole('button',{name:'Done'}));expect(screen.queryByLabelText('Tread depth')).toBeNull();
});
it('adds a post on the selected support and moves actual offsets without guessed side or datum',()=>{
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'Segment 1 · flight'}));fireEvent.click(screen.getByRole('button',{name:'Add railing post here'}));
 expect(saved().posts[0]).toMatchObject({segIdx:0,stepIdx:0,side:'',fromNosing:'',fromEdge:''});
 fireEvent.click(screen.getByRole('button',{name:'Right'}));fireEvent.change(screen.getByLabelText('From side edge'),{target:{value:'3 1/2'}});fireEvent.change(screen.getByLabelText('From tread nosing / support edge'),{target:{value:'4'}});
 expect(saved().posts[0]).toMatchObject({side:'right',fromNosing:'4',fromEdge:'3 1/2'});
});

it('opens the site-tapped step and repeats dimensions only within its flight, with undo',()=>{
 function TargetHarness(){const [data,setData]=useState(()=>{const d=newMeasureData('l_shape',2,2);for(const s of d.segments)if(s.kind==='flight')s.steps.forEach((t,i)=>{t.run=String(10+i);t.rise='7';});return d;});return <><output hidden data-testid="saved-measurement">{JSON.stringify(data)}</output><VisualMeasureWorkspace data={data} set={fn=>setData(d=>{const copy=structuredClone(d);fn(copy);return copy;})} lang="en" shape="l_shape" initialTarget={{segment:2,step:1}}/></>;}
 render(<TargetHarness/>);expect((screen.getByLabelText('Tread depth') as HTMLInputElement).value).toBe('11');
 fireEvent.click(screen.getByRole('button',{name:'Previous step'}));expect((screen.getByLabelText('Tread depth') as HTMLInputElement).value).toBe('10');
 fireEvent.click(screen.getByRole('button',{name:'Next step'}));fireEvent.change(screen.getByLabelText('Tread depth'),{target:{value:'12'}});
 fireEvent.click(screen.getByRole('button',{name:'Copy to all treads'}));
 expect(saved().segments[0]).toMatchObject({steps:[{run:'10'},{run:'11'}]});expect(saved().segments[2]).toMatchObject({steps:[{run:'12'},{run:'12'}]});
 fireEvent.click(screen.getByRole('button',{name:'Undo copied measurements'}));expect(saved().segments[2]).toMatchObject({steps:[{run:'10'},{run:'12'}]});
});

it('records wall sides and connection type without creating house geometry or changing offsets',()=>{
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'Segment 1 · flight'}));
 const before=saved();fireEvent.click(screen.getByRole('button',{name:'Both'}));expect(saved().segments[0]).toMatchObject({wallSide:'both',steps:before.segments[0].kind==='flight'?before.segments[0].steps:[]});
 fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));
 expect(document.querySelectorAll('[data-wall-segment]')).toHaveLength(4);expect(saved().site).toEqual(before.site);
 fireEvent.click(screen.getByRole('button',{name:'Add railing post here'}));fireEvent.change(screen.getByLabelText('From side edge'),{target:{value:'3'}});
 fireEvent.change(screen.getByLabelText('Connection type'),{target:{value:'concrete_wall'}});expect(saved().posts[0]).toMatchObject({pointType:'concrete_wall',fromEdge:'3',segIdx:0,stepIdx:0});
 fireEvent.click(screen.getByText('Reference and height'));fireEvent.change(screen.getByLabelText('Mounting method'),{target:{value:'Bracket'}});fireEvent.change(screen.getByLabelText('Anchor substrate'),{target:{value:'Concrete'}});
 expect(saved().posts[0]).toMatchObject({pointType:'concrete_wall',mount:'Bracket',anchor:'Concrete',fromEdge:'3'});expect(saved().site).toEqual(before.site);
});

function CopyHarness({initial}:{initial:MeasureData}){const [data,setData]=useState(initial);return <><output hidden data-testid="saved-measurement">{JSON.stringify(data)}</output><VisualMeasureWorkspace data={data} set={fn=>setData(d=>{const copy=structuredClone(d);fn(copy);return copy;})} lang="en" shape="l_shape" initialTarget={{segment:0,step:0}}/></>;}
it('copies valid populated measurements across all flights, preserves blanks and other geometry, and undoes affected fields',()=>{
 const data=newMeasureData('l_shape',2,2);for(const flight of data.segments)if(flight.kind==='flight')flight.steps.forEach((step,i)=>Object.assign(step,{run:String(10+i),rise:'7',nosing:'1',levelGap:'1/4',winder:i===1,runIn:'6',runOut:'16',turnDeg:'15',wallSide:'left'}));
 if(data.segments[0].kind==='flight')Object.assign(data.segments[0].steps[0],{run:'12 1/2',rise:'',nosing:'0'});
 const before=structuredClone(data);render(<CopyHarness initial={data}/>);fireEvent.change(screen.getByLabelText('Apply to'),{target:{value:'all'}});fireEvent.click(screen.getByRole('button',{name:'Copy to all treads'}));
 const after=saved();expect(after.segments[1]).toEqual(before.segments[1]);for(const [index,flight] of after.segments.entries())if(flight.kind==='flight'){const original=before.segments[index];if(original.kind!=='flight')throw Error('fixture');flight.steps.forEach((step,i)=>{expect(step).toEqual({...original.steps[i],run:'12 1/2',nosing:'0'});});}
 fireEvent.click(screen.getByRole('button',{name:'Undo copied measurements'}));expect(saved()).toEqual(before);
});
it('skips invalid fields, leaves blank source fields alone, and preserves later edits when undoing a copy',()=>{
 const data=newMeasureData('straight',2);if(data.segments[0].kind==='flight'){Object.assign(data.segments[0].steps[0],{run:'bad',rise:'7',nosing:''});Object.assign(data.segments[0].steps[1],{run:'11',rise:'8',nosing:'1'});}
 render(<CopyHarness initial={data}/>);fireEvent.click(screen.getByRole('button',{name:'Copy to all treads'}));expect(saved().segments[0]).toMatchObject({steps:[{run:'bad',rise:'7',nosing:''},{run:'11',rise:'7',nosing:'1'}]});
 fireEvent.click(screen.getByRole('button',{name:'Next step'}));fireEvent.change(screen.getByLabelText('Riser height'),{target:{value:'7 1/2'}});fireEvent.click(screen.getByRole('button',{name:'Undo copied measurements'}));expect(saved().segments[0]).toMatchObject({steps:[{rise:'7'},{rise:'7 1/2'}]});
});
it('disables copying when no valid populated dimension exists',()=>{
 const data=newMeasureData('straight',2);if(data.segments[0].kind==='flight')Object.assign(data.segments[0].steps[0],{run:'-1',rise:'0',nosing:'bad'});render(<CopyHarness initial={data}/>);expect((screen.getByRole('button',{name:'Copy to all treads'}) as HTMLButtonElement).disabled).toBe(true);
});
