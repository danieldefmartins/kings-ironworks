import {expect,it} from 'vitest';
import {sceneLabel} from './measure-scene-label';
import {measureScene} from './measure-scene';
import {newMeasureData} from './measure';
it('translates generated step labels without rewriting named site objects',()=>{
 const item=measureScene(newMeasureData('straight',2)).meshes[0];
 expect(sceneLabel(item,'pt')).toBe('Degrau 1');expect(sceneLabel(item,'es')).toBe('Peldaño 1');
 expect(sceneLabel({...item,label:'Step 1',entity:{siteId:'custom-name'}},'es')).toBe('Step 1');
});
it('translates adapter labels while preserving custom marks and profiles',()=>{
 const base=measureScene(newMeasureData('straight',2)).meshes[0];
 const item=(id:string,label:string)=>({...base,id,label,entity:{}});
 expect(sceneLabel(item('canopy:front','Front beam'),'pt')).toBe('Viga frontal');
 expect(sceneLabel(item('canopy:post-1','Post Front left'),'es')).toBe('Poste Front left');
 expect(sceneLabel(item('opening:wall:1','Front left · wall'),'es')).toBe('Front left · muro');
 expect(sceneLabel(item('wallcap:rail:0','R1 · rail'),'pt')).toBe('R1 · corrimão');
 expect(sceneLabel(item('shoppiece:niche:1:0','Window · niche'),'es')).toBe('Window · nicho');
 expect(sceneLabel(item('struct:1','left beam · W8×10'),'pt')).toBe('left beam · W8×10');
 expect(sceneLabel(item('well:band:1','Window'),'pt')).toBe('Window');
 expect(sceneLabel(item('fire:deck:1','Wall · platform'),'pt')).toBe('Wall · patamar');
 expect(sceneLabel(item('gate:leaf:0','Gate leaf 1'),'es')).toBe('Hoja de puerta 1');
 expect(sceneLabel(item('fence:segment:1','Fence segment Front · rail'),'pt')).toBe('Trecho da cerca Front · rail');
 expect(sceneLabel(item('struct:slab:1','Front · wall · slab'),'es')).toBe('Front · wall · losa');
 expect(sceneLabel(item('deck:opening:1','Deck side A · Stair opening'),'es')).toBe('Lado de terraza A · Abertura de escalera');
});
