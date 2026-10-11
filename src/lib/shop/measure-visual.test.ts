import {expect,it} from 'vitest';
import {newMeasureData} from './measure';
import {visualPitch} from './measure-visual';
it('calculates pitch only from complete measured rise and run, preserving measured angle',()=>{
 const d=newMeasureData('straight',2),s=d.segments[0];if(s.kind!=='flight')throw Error();s.angleDeg='31';expect(visualPitch(d,0)).toBeNull();
 s.steps.forEach(t=>{t.rise='7';t.run='11';});expect(visualPitch(d,0)).toBeCloseTo(Math.atan2(14,22)*180/Math.PI);expect(s.angleDeg).toBe('31');
 s.steps[1].run='';expect(visualPitch(d,0)).toBeNull();
});
it('uses horizontal run for ramp pitch and rejects zero run',()=>{const d=newMeasureData('ramp',0),s=d.segments[0];if(s.kind!=='ramp')throw Error();s.rise='12';s.runH='144';s.length='999';expect(visualPitch(d,0)).toBeCloseTo(Math.atan2(12,144)*180/Math.PI);s.runH='0';expect(visualPitch(d,0)).toBeNull();});
