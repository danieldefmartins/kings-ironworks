import {useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {newMeasureData} from '@/lib/shop/measure';
import {SceneSetupSchema,type SceneSetup} from '@/lib/shop/measure-scene-setup';
import SceneStart from './SceneStart';
afterEach(cleanup);
it('guides environment and project choices without resetting measured work',()=>{
 const original=newMeasureData('straight',3);original.materials.post='Existing measured steel';const next=vi.fn(),saved=vi.fn();
 function Harness(){const [data,setData]=useState<typeof original&{sceneSetup?:SceneSetup}>(original);return <SceneStart data={data} set={fn=>setData(old=>{const d=structuredClone(old);fn(d);saved(d);return d;})} lang="en" onContinue={next}/>;}
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:/ExteriorOutside/}));
 expect((screen.getByRole('button',{name:/Build the site/}) as HTMLButtonElement).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Window well'}));fireEvent.click(screen.getByRole('button',{name:/Build the site/}));expect(next).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:/Exterior · Change/}));fireEvent.click(screen.getByRole('button',{name:/InteriorInside/}));
 const latest=saved.mock.calls.at(-1)![0];expect(latest.sceneSetup).toEqual({environment:'interior',projectType:'window_well'});expect(latest.routing.setting).toBe('interior');delete latest.sceneSetup;latest.routing.setting='';expect(latest).toEqual(original);
});
it('validates stored choices and keeps all project types available',()=>{expect(SceneSetupSchema.safeParse({environment:'exterior',projectType:'window_well'}).success).toBe(true);expect(SceneSetupSchema.safeParse({environment:'roof',projectType:'unknown'}).success).toBe(false);render(<SceneStart data={{...newMeasureData('straight',1),sceneSetup:{environment:'interior',projectType:'stairs'}}} set={()=>{}} lang="en" onContinue={()=>{}}/>);for(const name of ['Stairs','Landing','Ramp','Railing','Window well','Grate','Ladder','Custom metalwork'])expect(screen.getByRole('button',{name})).toBeTruthy();});
