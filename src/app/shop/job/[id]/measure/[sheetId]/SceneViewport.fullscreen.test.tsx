import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {newMeasureData,normalizeMeasureData} from '@/lib/shop/measure';
vi.mock('@/lib/shop/scene-viewport-engine',()=>({createSceneViewport:()=>({update:()=>{},fit:()=>{},zoom:()=>{},dispose:()=>{}})}));
import SceneViewport from './SceneViewport';
afterEach(cleanup);
it('opens edge to edge and returns to the same scroll position on close or Escape',async()=>{
 const scrollTo=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 Object.defineProperty(window,'scrollY',{value:640,configurable:true});
 vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{cb(0);return 0;});
 const {container}=render(<SceneViewport data={normalizeMeasureData(newMeasureData('l_shape',3))} lang="en" compact/>);
 const root=container.querySelector('[data-scene-viewport]')!;
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Full screen'}));});
 expect(root.getAttribute('data-fullscreen')).toBe('true');
 expect(root.className).toContain('fixed inset-0');
 expect(document.documentElement.style.overflow).toBe('hidden');
 // the view and zoom controls stay available over the drawing
 expect(screen.getByRole('group',{name:'Views'})).toBeTruthy();
 expect(screen.getByRole('button',{name:'Zoom in'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Exit full screen'}));
 expect(root.getAttribute('data-fullscreen')).toBeNull();
 expect(document.documentElement.style.overflow).toBe('');
 expect(scrollTo).toHaveBeenLastCalledWith(0,640);
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Full screen'}));});
 fireEvent.keyDown(window,{key:'Escape'});
 expect(root.getAttribute('data-fullscreen')).toBeNull();
});

it('cancels delayed scroll restoration when the viewport unmounts',async()=>{
 vi.useFakeTimers();
 const scrollTo=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 try{
  const {unmount}=render(<SceneViewport data={normalizeMeasureData(newMeasureData('straight',3))} lang="en" compact/>);
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Full screen'}));});
  fireEvent.click(screen.getByRole('button',{name:'Exit full screen'}));
  unmount();scrollTo.mockClear();
  act(()=>vi.advanceTimersByTime(1000));
  expect(scrollTo).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
 }finally{vi.useRealTimers();}
});
