import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { newMeasureData, newPost, normalizeMeasureData } from '@/lib/shop/measure';
import DrawingWorkspace from './DrawingWorkspace';
afterEach(cleanup);
describe('drawing workspace', () => {
  it('pinches within zoom limits in every view and expanded mode without placing a post', () => {
    const edit=vi.fn();
    render(<DrawingWorkspace data={newMeasureData('straight',4)} lang="en" onMeasureStep={edit} placingPosts/>);
    const viewport=document.querySelector('[data-drawing-viewport]')!;
    const touches=(gap:number)=>[{identifier:1,clientX:50,clientY:100},{identifier:2,clientX:50+gap,clientY:100}];
    for(const view of ['Side view','Top view','3D view']) {
      fireEvent.click(screen.getByRole('button',{name:view}));
      fireEvent.touchStart(viewport,{touches:touches(100)});
      fireEvent.touchMove(viewport,{touches:touches(200)});
      expect(screen.getByText('200%')).toBeTruthy();
      fireEvent.touchMove(viewport,{touches:touches(900)});
      expect(screen.getByText('400%')).toBeTruthy();
      fireEvent.touchMove(viewport,{touches:touches(10)});
      expect(screen.getByText('100%')).toBeTruthy();
      fireEvent.touchEnd(viewport,{touches:[]});
      fireEvent.click(screen.getByRole('button',{name:'Step 2'}),{detail:1});
      expect(edit).not.toHaveBeenCalled();
    }
    fireEvent.click(screen.getByRole('button',{name:'Expand'}));
    fireEvent.touchStart(viewport,{touches:touches(100)});
    fireEvent.touchMove(viewport,{touches:touches(150)});
    expect(screen.getByText('150%')).toBeTruthy();
    fireEvent.touchCancel(viewport,{touches:[]});
    // A fresh, deliberate single-finger tap works immediately after the gesture.
    fireEvent.touchStart(viewport,{touches:[touches(100)[0]]});
    fireEvent.touchEnd(viewport,{touches:[]});
    fireEvent.click(screen.getByRole('button',{name:'Step 2'}),{detail:1});
    expect(edit).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button',{name:/Reset/}));
    expect(screen.getByText('100%')).toBeTruthy();
  });
  it('allows single-finger scrolling but suppresses a click after dragging', () => {
    const edit=vi.fn();render(<DrawingWorkspace data={newMeasureData('straight',3)} lang="en" onMeasureStep={edit}/>);
    const viewport=document.querySelector('[data-drawing-viewport]')!;
    fireEvent.touchStart(viewport,{touches:[{clientX:10,clientY:10}]});
    expect(fireEvent.touchMove(viewport,{touches:[{clientX:10,clientY:50}]})).toBe(true);
    fireEvent.touchEnd(viewport,{touches:[]});
    fireEvent.click(screen.getByRole('button',{name:'Step 1'}),{detail:1});
    expect(edit).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('button',{name:'Step 1'}),{key:'Enter'});
    expect(edit).toHaveBeenCalledWith(0,0);
  });
  it('shows independent first-step to post-edge measurements in every view', () => {
    const data=newMeasureData('straight',6);
    data.posts=[0,2,5].map((step,index)=>({...newPost(0,step),firstStepToPostEdge:['2','24 1/2','58'][index]}));
    render(<DrawingWorkspace data={data} lang="en" onMeasureStep={vi.fn()}/>);
    for(const view of ['Side view','Top view','3D view']) {
      fireEvent.click(screen.getByRole('button',{name:view}));
      const labels=Array.from(document.querySelectorAll('[data-post-distance]'));
      expect(labels).toHaveLength(3);
      for(let i=0;i<3;i++) {
        expect(labels[i].textContent).toContain(`First-step edge → post edge · P${i+1}`);
        expect(labels[i].textContent).toContain(data.posts[i].firstStepToPostEdge);
      }
    }
  });
  it('does not reinterpret an older tread-edge measurement as a post-edge measurement', () => {
    const data=newMeasureData('straight',2);
    data.posts=[{...newPost(0,1),distanceFromFirst:'11'}];
    delete (data.posts[0] as Partial<typeof data.posts[0]>).firstStepToPostEdge;
    const normalized=normalizeMeasureData(data);
    expect(normalized.posts[0].firstStepToPostEdge).toBe('');
    expect(normalized.posts[0].distanceFromFirst).toBe('11');
  });
  it('targets the same step in each view without changing measurements', () => {
    const data = newMeasureData('straight', 4), before = JSON.stringify(data), edit = vi.fn();
    render(<DrawingWorkspace data={data} lang="en" onMeasureStep={edit}/>);
    for (const view of ['Side view','Top view','3D view']) {
      fireEvent.click(screen.getByRole('button',{name:view}));
      fireEvent.click(screen.getByRole('button',{name:'Step 3'}));
      expect(edit).toHaveBeenLastCalledWith(0,2);
    }
    expect(JSON.stringify(data)).toBe(before);
  });
  it('keeps the chosen view on expand and restores scrolling on Escape', () => {
    render(<DrawingWorkspace data={newMeasureData('straight',3)} lang="en" onMeasureStep={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button',{name:'3D view'}));
    fireEvent.click(screen.getByRole('button',{name:'Expand'}));
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('button',{name:'3D view'}).getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(window,{key:'Escape'});
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(screen.getByRole('button',{name:'Expand'}));
  });
  it('allows keyboard selection of a tread', () => {
    const edit=vi.fn();render(<DrawingWorkspace data={newMeasureData('straight',3)} lang="pt" onMeasureStep={edit}/>);
    fireEvent.keyDown(document.querySelectorAll('rect[role="button"]')[1],{key:'Enter'});
    expect(edit).toHaveBeenCalledWith(0,1);
  });
});
