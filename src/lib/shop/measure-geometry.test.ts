import { describe, expect, it } from 'vitest';
import { newMeasureData, type FlightSegment } from './measure';
import { stairGeometry } from './measure-geometry';

const fixture = () => {
  const data = newMeasureData('straight', 2);
  const fl = data.segments[0] as FlightSegment;
  fl.width = '36';
  fl.steps[0].rise = '7'; fl.steps[0].run = '10';
  fl.steps[1].rise = '7 1/2'; fl.steps[1].run = '12';
  return data;
};
describe('measured stair geometry', () => {
  it('preserves unequal risers and treads with cumulative coordinates', () => {
    const model = stairGeometry(fixture())!;
    expect(model.treads.map(t => [t.x, t.z, t.run])).toEqual([[0, 7, 10], [10, 14.5, 12]]);
    expect(model.provisional).toBe(false);
    expect(model.run).toBe(22);
  });
  it('does not write placeholder values into a measurement sheet', () => {
    const data = newMeasureData('straight', 3), before = JSON.stringify(data);
    expect(stairGeometry(data)?.provisional).toBe(true);
    expect(stairGeometry(data)?.treads[0].riseLabel).toBe('?');
    expect(JSON.stringify(data)).toBe(before);
  });
  it('treats invalid and nonpositive measurements as unresolved', () => {
    const data = fixture(), fl = data.segments[0] as FlightSegment;
    fl.steps[0].run = 'abc'; fl.steps[1].rise = '-2'; fl.width = '0';
    const model = stairGeometry(data)!;
    expect(model.provisional).toBe(true);
    expect(model.treads[0].runLabel).toBe('?');
    expect(model.treads[1].riseLabel).toBe('?');
    expect(model.treads.every(t => Number.isFinite(t.x + t.z))).toBe(true);
  });
  it('keeps a landing at the top elevation with its own measured footprint', () => {
    const data = fixture();
    data.segments.push({kind:'platform',length:'48',depth:'42',diag:'',slope:'',slopeDir:'',turn:'none'});
    expect(stairGeometry(data)?.treads[2]).toMatchObject({x:22,z:14.5,run:48,width:42,stepIdx:null});
  });
  it('declines unresolved assembly turns and winders but allows a focused flight', () => {
    const data = fixture();
    data.segments.push({kind:'platform',length:'48',depth:'42',diag:'',slope:'',slopeDir:'',turn:'left'});
    expect(stairGeometry(data)).toBeNull();
    expect(stairGeometry(data,0)?.provisional).toBe(false);
    (data.segments[0] as FlightSegment).steps[0].winder = true;
    expect(stairGeometry(data,0)).toBeNull();
  });
  it('retains sheet step numbers and segment IDs when focusing a later flight', () => {
    const data = fixture(); data.segments.push(structuredClone(data.segments[0]));
    const model = stairGeometry(data,1)!;
    expect(model.treads[0]).toMatchObject({segIdx:1,stepIdx:0,number:3,x:0,z:7});
  });
});
