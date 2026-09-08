import {describe,it,expect} from 'vitest';
import {blenderPayload,type DrawingRequest} from './shop-drawings';
import {newMeasureData} from './measure';
describe('custom drawing payload',()=>{
  it('preserves a special project without inventing staircase geometry',()=>{
    const data=newMeasureData('gate',1);data.gate!.widthTop='120';
    const p=blenderPayload({id:'test',source_updated_at:'2026-09-08',snapshot:{name:'Gate',shape:'gate',data}} as DrawingRequest);
    expect(p.surfaces).toEqual([]);expect(p.posts).toEqual([]);
    expect(p.measurements.gate?.widthTop).toBe('120');expect(p.shape).toBe('gate');
    expect(p.issues).toContain('drawingNoGeometry');expect(p.draft).toBe(true);
  });
});
