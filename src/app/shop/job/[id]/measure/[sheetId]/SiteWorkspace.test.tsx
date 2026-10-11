import {useState} from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {porchSiteFixture} from '@/lib/shop/measure-site.fixture';
import SiteWorkspace from './SiteWorkspace';
import type {MeasureData} from '@/lib/shop/measure';
import {resolveSite} from '@/lib/shop/measure-wall-placement';

function Harness({measure=()=>{}}:{measure?:(segment?:number,step?:number|null,flightIndex?:number)=>void}) {
  const [data,setData]=useState(porchSiteFixture);
  return <><SiteWorkspace data={data} set={fn=>setData(prev=>{const next=structuredClone(prev);fn(next);return next;})} lang="en" onContinue={()=>{}} onMeasure={measure} onDetails={()=>{}}/><output hidden data-testid="saved">{JSON.stringify(data)}</output></>;
}
const saved=()=>JSON.parse(screen.getByTestId('saved').textContent!) as MeasureData;
function chooseEdge(side:string){const select=screen.getByLabelText('Or choose edge');const option=within(select).getByRole('option',{name:side}) as HTMLOptionElement;fireEvent.change(select,{target:{value:option.value}});}
afterEach(cleanup);
describe('site builder field workflow',()=>{
  it('zooms the actual site drawing, fits it again, and never edits measurements',()=>{
    const data=porchSiteFixture(),before=JSON.stringify(data),save=vi.fn();
    render(<SiteWorkspace data={data} set={save} lang="en" onContinue={()=>{}} onMeasure={()=>{}} onDetails={()=>{}}/>);
    fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));
    const viewport=document.querySelector('[data-site-viewport]') as HTMLDivElement;
    const drawing=viewport.firstElementChild as HTMLDivElement;
    for(const view of ['Top','Front','3D']) {
      fireEvent.click(screen.getByRole('button',{name:view}));
      fireEvent.click(screen.getByRole('button',{name:'Zoom in'}));
      expect(drawing.style.width).toBe('150%');
      viewport.scrollLeft=80;viewport.scrollTop=40;
      fireEvent.click(screen.getByRole('button',{name:/Fit/}));
      expect(drawing.style.width).toBe('100%');
      expect(viewport.scrollLeft).toBe(0);expect(viewport.scrollTop).toBe(0);
    }
    const touches=(gap:number)=>[{clientX:0,clientY:0},{clientX:gap,clientY:0}];
    fireEvent.touchStart(viewport,{touches:touches(100)});
    fireEvent.touchMove(viewport,{touches:touches(200)});
    expect(drawing.style.width).toBe('200%');
    fireEvent.touchEnd(viewport,{touches:[]});
    expect(save).not.toHaveBeenCalled();expect(JSON.stringify(data)).toBe(before);
  });
  it('starts with the sketch and opens only the selected object inspector',()=>{
    render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));
    expect(screen.queryByRole('region',{name:'Selected site object'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Existing wall'}));
    expect(screen.queryByRole('region',{name:'Selected site object'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Place wall · Left · segment 1'}));
    expect(screen.getByRole('region',{name:'Selected site object'})).toBeTruthy();
    expect(screen.getByLabelText('Wall thickness')).toBeTruthy();
    expect((screen.getByRole('textbox',{name:'Name'}).closest('details') as HTMLDetailsElement).open).toBe(false);
    fireEvent.click(screen.getByRole('button',{name:'Close object inspector'}));
    expect(screen.queryByRole('region',{name:'Selected site object'})).toBeNull();
    fireEvent.click(screen.getByText(/Site objects/,{selector:'summary'}));
    expect(screen.getByRole('button',{name:/Wall 2.*Needs verification/})).toBeTruthy();
  });
  it('opens the exact dimension input when its sketch label is tapped',()=>{
    render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));
    fireEvent.click(screen.getByText(/Site objects/,{selector:'summary'}));
    fireEvent.click(screen.getByRole('button',{name:/House wall.*Verified/}));
    fireEvent.click(screen.getByRole('button',{name:'Edit House wall height'}));
    expect(document.activeElement).toBe(screen.getByLabelText('Height'));
  });
  it('requires re-verification after changing a measured dimension',()=>{
    render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));
    fireEvent.click(screen.getByText(/Site objects/,{selector:'summary'}));
    fireEvent.click(screen.getByRole('button',{name:/House wall.*Verified/}));
    fireEvent.click(screen.getByText('Position & more details',{selector:'summary'}));
    const check=screen.getByRole('checkbox',{name:/Field measurements verified/}) as HTMLInputElement;
    expect(check.checked).toBe(true);
    fireEvent.change(screen.getByLabelText('Length'),{target:{value:'8 1/2'}});
    expect(check.checked).toBe(false);
    expect(screen.getByRole('button',{name:/House wall.*Needs verification/})).toBeTruthy();
    fireEvent.click(check);expect(check.checked).toBe(true);
  });
  it('adds a blank column without replacing measured objects or inventing dimensions',()=>{
    render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));
    fireEvent.click(screen.getByRole('button',{name:'Existing column'}));
    fireEvent.click(screen.getByText(/Site objects/,{selector:'summary'}));
    fireEvent.click(screen.getByText('Position & more details',{selector:'summary'}));
    expect(screen.getByRole('button',{name:/House wall.*Verified/})).toBeTruthy();
    expect(screen.getByRole('button',{name:/Column 3.*Needs verification/})).toBeTruthy();
    expect((screen.getByLabelText('Length') as HTMLInputElement).value).toBe('');
    expect((screen.getByRole('checkbox',{name:/Field measurements verified/}) as HTMLInputElement).disabled).toBe(true);
  });
  it('inserts a new flight and directs measuring to that flight',()=>{
    const measure=vi.fn();render(<Harness measure={measure}/>);fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));
    fireEvent.click(screen.getByText('Add stairs, landing or ramp',{selector:'summary'}));fireEvent.click(screen.getByRole('button',{name:'Stairs'}));
    fireEvent.click(screen.getByRole('button',{name:'Add and measure'}));
    expect(measure).toHaveBeenCalledWith(2,null,1);
  });
  it('clears all site verification when the common datum changes',()=>{
    render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));
    fireEvent.click(screen.getByText('Site reference point',{selector:'summary'}));
    fireEvent.change(screen.getByLabelText(/Site reference point/),{target:{value:'New field reference'}});
    fireEvent.click(screen.getByText(/Site objects/,{selector:'summary'}));
    expect(screen.getByRole('button',{name:/House wall.*Needs verification/})).toBeTruthy();
    expect(screen.getByRole('button',{name:/Left column.*Needs verification/})).toBeTruthy();
  });
});

it('cancels choosing an anchored wall without saving or changing any existing measurement',()=>{
 const data=porchSiteFixture(),before=JSON.stringify(data),save=vi.fn();render(<SiteWorkspace data={data} set={save} lang="en" onContinue={()=>{}} onMeasure={()=>{}} onDetails={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Existing wall'}));expect(screen.getByText('Choose a wall edge')).toBeTruthy();expect(screen.queryByRole('region',{name:'Selected site object'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(save).not.toHaveBeenCalled();expect(JSON.stringify(data)).toBe(before);
});
it('places a wall on the chosen right edge and edits its side without exposing XYZ or guessed dimensions',()=>{
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));const before=saved();fireEvent.click(screen.getByRole('button',{name:'Existing wall'}));fireEvent.click(screen.getByRole('button',{name:'Place wall · Right · segment 1'}));
 const wall=saved().site!.objects.at(-1)!;expect(wall.wallAnchor).toMatchObject({segmentId:'legacy-segment-1',side:'right',gap:'0',startExtension:'0',endExtension:'0',baseOffset:'0'});expect(wall.height).toBe('');expect(wall.depth).toBe('');expect(wall.x).toBe('');
 expect(screen.queryByLabelText('Length')).toBeNull();expect(screen.queryByLabelText('X · along')).toBeNull();
 fireEvent.change(screen.getByLabelText('Wall thickness'),{target:{value:'6'}});fireEvent.change(screen.getByLabelText('Wall height'),{target:{value:'84'}});
 expect(resolveSite(saved())!.objects.at(-1)!.length).not.toBe('');
 fireEvent.click(within(screen.getByLabelText('Wall edge')).getByRole('button',{name:'Left'}));expect(saved().site!.objects.at(-1)!.wallAnchor?.side).toBe('left');
 expect(saved().segments.map(s=>({...s,id:undefined}))).toEqual(before.segments.map(s=>({...s,id:undefined})));
});
it('converts an existing absolute wall only after edge selection and preserves its original recorded values',()=>{
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'2D drawing'}));const before=saved().site!.objects[0];fireEvent.click(screen.getByText(/Site objects/,{selector:'summary'}));fireEvent.click(screen.getByRole('button',{name:/House wall.*Verified/}));
 fireEvent.click(screen.getByRole('button',{name:'Place against stairs'}));expect(screen.queryByRole('button',{name:'Place independently'})).toBeNull();expect(saved().site!.objects[0]).toEqual(before);fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(saved().site!.objects[0]).toEqual(before);
 fireEvent.click(screen.getByRole('button',{name:'Place against stairs'}));chooseEdge('Left');const after=saved().site!.objects[0];expect(after.wallAnchor?.side).toBe('left');expect(after.verified).toBe(false);const {wallAnchor:ignored,verified,...fields}=after;void ignored;void verified;const {verified:wasVerified,...original}=before;void wasVerified;expect(fields).toEqual(original);
 expect(screen.queryByLabelText('X · along')).toBeNull();expect(screen.queryByLabelText('Length')).toBeNull();
});

it('centers the actual viewport when placement starts without scrolling again on measurement edits',()=>{
 const data=porchSiteFixture(),set=vi.fn(),props={data,set,lang:'en',onContinue:()=>{},onMeasure:()=>{},onDetails:()=>{}};
 const {rerender}=render(<SiteWorkspace {...props}/>);
 const viewport=document.querySelector('[data-scene-viewport]') as HTMLElement,scroll=vi.fn();viewport.scrollIntoView=scroll;
 fireEvent.click(screen.getByRole('button',{name:'Existing wall'}));
 expect(scroll).toHaveBeenCalledWith({block:'center',behavior:'smooth'});
 rerender(<SiteWorkspace {...props} data={structuredClone(data)}/>);
 expect(scroll).toHaveBeenCalledTimes(1);
});
