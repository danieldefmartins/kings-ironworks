import {expect,it} from 'vitest';
import {sceneLabel} from './measure-scene-label';
import {measureScene} from './measure-scene';
import {newMeasureData} from './measure';
it('translates generated step labels without rewriting named site objects',()=>{
 const item=measureScene(newMeasureData('straight',2)).meshes[0];
 expect(sceneLabel(item,'pt')).toBe('Degrau 1');expect(sceneLabel(item,'es')).toBe('Peldaño 1');
 expect(sceneLabel({...item,label:'Step 1',entity:{siteId:'custom-name'}},'es')).toBe('Step 1');
});
