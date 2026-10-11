import {useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {newMeasureData} from '@/lib/shop/measure';
import {SceneSetupSchema,sceneProjectLabel,sceneProjectOrder,type SceneSetup} from '@/lib/shop/measure-scene-setup';
import SceneStart from './SceneStart';
afterEach(cleanup);
it('shows location and work choices together and preserves measured work when either changes',()=>{
 const original=newMeasureData('straight',3);original.materials.post='Existing measured steel';const next=vi.fn(),saved=vi.fn();
 function Harness(){const [data,setData]=useState<typeof original&{sceneSetup?:SceneSetup}>(original);return <SceneStart data={data} set={fn=>setData(old=>{const d=structuredClone(old);fn(d);saved(d);return d;})} lang="en" onProjectChange={next}/>;}
 const {container}=render(<Harness/>);
 expect(container.querySelectorAll('svg')).toHaveLength(SceneSetupSchema.shape.projectType.options.length-1);
 expect(screen.getByRole('button',{name:'Window well'})).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Continue/})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Window well'}));
 expect(next).toHaveBeenCalledWith('window_well');
 fireEvent.click(screen.getByRole('button',{name:'Exterior'}));
 expect(next).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:'Interior'}));
 expect(screen.getByRole('button',{name:'Window well'}).getAttribute('aria-pressed')).toBe('true');
 const latest=saved.mock.calls.at(-1)![0];expect(latest.sceneSetup).toEqual({environment:'interior',projectType:'window_well'});expect(latest.routing.setting).toBe('interior');delete latest.sceneSetup;latest.routing.setting='';expect(latest).toEqual(original);
});
it('retains all project types and uses authoritative routing environment without extra steps',()=>{
 expect(SceneSetupSchema.safeParse({environment:'exterior',projectType:'window_well'}).success).toBe(true);expect(SceneSetupSchema.safeParse({environment:'roof',projectType:'unknown'}).success).toBe(false);
 const data=newMeasureData('straight',1);data.routing.setting='exterior';data.sceneSetup={environment:'interior',projectType:'stairs'};
 render(<SceneStart data={data} set={()=>{}} lang="en" onProjectChange={()=>{}}/>);
 for(const kind of sceneProjectOrder('exterior'))expect(screen.getByRole('button',{name:sceneProjectLabel(kind,'en')})).toBeTruthy();
 expect(screen.getByRole('button',{name:'Exterior'}).getAttribute('aria-pressed')).toBe('true');
 expect(screen.queryByText('1 / 2')).toBeNull();
});
it.each(['pt','es'])('translates compact setup in %s',lang=>{
 render(<SceneStart data={newMeasureData('custom',1)} set={()=>{}} lang={lang} onProjectChange={()=>{}}/>);
 expect(screen.queryByRole('button',{name:/Continuar/})).toBeNull();
 for(const kind of sceneProjectOrder(''))expect(screen.getByRole('button',{name:sceneProjectLabel(kind,lang)})).toBeTruthy();
});
