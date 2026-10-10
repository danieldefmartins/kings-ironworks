import {useState} from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {porchSiteFixture} from '@/lib/shop/measure-site.fixture';
import SiteWorkspace from './SiteWorkspace';

function Harness({measure=()=>{}}:{measure?:(segment?:number,step?:number|null,flightIndex?:number)=>void}) {
  const [data,setData]=useState(porchSiteFixture);
  return <SiteWorkspace data={data} set={fn=>setData(prev=>{const next=structuredClone(prev);fn(next);return next;})} lang="en" onContinue={()=>{}} onMeasure={measure} onDetails={()=>{}}/>;
}
afterEach(cleanup);
describe('site builder field workflow',()=>{
  it('zooms the actual site drawing, fits it again, and never edits measurements',()=>{
    const data=porchSiteFixture(),before=JSON.stringify(data),save=vi.fn();
    render(<SiteWorkspace data={data} set={save} lang="en" onContinue={()=>{}} onMeasure={()=>{}} onDetails={()=>{}}/>);
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
  it('requires re-verification after changing a measured dimension',()=>{
    render(<Harness/>);
    const check=screen.getByRole('checkbox',{name:/Field measurements verified/}) as HTMLInputElement;
    expect(check.checked).toBe(true);
    fireEvent.change(screen.getByLabelText('Length'),{target:{value:'8 1/2'}});
    expect(check.checked).toBe(false);
    expect(screen.getByRole('button',{name:/House wall.*Needs verification/})).toBeTruthy();
    fireEvent.click(check);expect(check.checked).toBe(true);
  });
  it('adds a blank column without replacing measured objects or inventing dimensions',()=>{
    render(<Harness/>);
    fireEvent.click(screen.getByText(/Add to site/,{selector:'summary'}));
    fireEvent.click(screen.getByRole('button',{name:'＋ Column'}));
    expect(screen.getByRole('button',{name:/House wall.*Verified/})).toBeTruthy();
    expect(screen.getByRole('button',{name:/Column 3.*Needs verification/})).toBeTruthy();
    expect((screen.getByLabelText('Length') as HTMLInputElement).value).toBe('');
    expect((screen.getByRole('checkbox',{name:/Field measurements verified/}) as HTMLInputElement).disabled).toBe(true);
  });
  it('inserts a new flight and directs measuring to that flight',()=>{
    const measure=vi.fn();render(<Harness measure={measure}/>);
    fireEvent.click(screen.getByText(/Add to site/,{selector:'summary'}));
    fireEvent.click(screen.getByRole('button',{name:'＋ Stairs'}));
    fireEvent.click(screen.getByRole('button',{name:'Add and measure'}));
    expect(measure).toHaveBeenCalledWith(2,null,1);
  });
  it('clears all site verification when the common datum changes',()=>{
    render(<Harness/>);
    fireEvent.click(screen.getByText('Site reference point',{selector:'summary'}));
    fireEvent.change(screen.getByLabelText(/Site reference point/),{target:{value:'New field reference'}});
    expect(screen.getByRole('button',{name:/House wall.*Needs verification/})).toBeTruthy();
    expect(screen.getByRole('button',{name:/Left column.*Needs verification/})).toBeTruthy();
  });
});
