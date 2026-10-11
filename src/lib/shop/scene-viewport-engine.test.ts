import {afterEach,expect,it,vi} from 'vitest';
import type {OrthographicCamera} from 'three';
import {createSceneViewport} from './scene-viewport-engine';
import {newMeasureData} from './measure';
import {measureScene} from './measure-scene';
import {applyKind} from './measure-canopy';
import {applyTemplate} from './measure-structural';
const {render}=vi.hoisted(()=>({render:vi.fn()}));
// Exercise the real scene/camera/controls, replacing only the GPU boundary.
vi.mock('three',async importOriginal=>({
 ...await importOriginal<typeof import('three')>(),
 WebGLRenderer:class {
  domElement=document.createElement('canvas');
  setPixelRatio(){} setSize(){} dispose(){} forceContextLoss(){}
  render=render;
 },
}));
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
it.each(['canopy','structural'] as const)('fits the first %s template after an empty chooser',shape=>{
 let paint:FrameRequestCallback=()=>{};
 vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{paint=fn;return 1;});
 vi.stubGlobal('cancelAnimationFrame',vi.fn());
 vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}});
 const host=document.createElement('div'),overlay=document.createElement('div');
 Object.defineProperties(host,{clientWidth:{value:390},clientHeight:{value:456}});
 const viewport=createSceneViewport(host,overlay,vi.fn());
 try {
  const data=newMeasureData(shape,1),options={dark:false,site:true,rails:true,lang:'pt'};
  const empty=measureScene(data,shape);expect(empty.meshes.length+empty.lines.length).toBe(0);
  viewport.update(empty,options);viewport.fit('iso');
  if(shape==='canopy')applyKind(data.canopy!,'entry');else applyTemplate(data.structural!,'beam');
  viewport.update(measureScene(data,shape),options);paint(0);
  const camera=render.mock.calls.at(-1)![1] as OrthographicCamera;
  expect(camera.top-camera.bottom).toBeGreaterThan(50);
  expect(host.querySelector('canvas')?.getAttribute('aria-label')).toContain('Desenho de medição');
  // Edits preserve the worker's chosen zoom once the first model is framed.
  viewport.zoom(2);viewport.update(measureScene(data,shape),options);paint(1);
  expect(camera.zoom).toBe(2);
 }finally{viewport.dispose();}
});
