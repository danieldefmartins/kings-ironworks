import { describe, expect, it } from 'vitest';
import { newMeasureData, type FlightSegment } from './measure';
import { stairGeometry, landingGrade } from './measure-geometry';

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
  it('draws turns and flags missing winder measurements while retaining focused flights', () => {
    const data = fixture();
    data.segments.push({kind:'platform',length:'48',depth:'42',diag:'',slope:'',slopeDir:'',turn:'left'});
    expect(stairGeometry(data)?.treads).toHaveLength(3);
    expect(stairGeometry(data,0)?.provisional).toBe(false);
    (data.segments[0] as FlightSegment).steps[0].winder = true;
    expect(stairGeometry(data,0)?.provisional).toBe(true);
  });
  it('retains sheet step numbers and segment IDs when focusing a later flight', () => {
    const data = fixture(); data.segments.push(structuredClone(data.segments[0]));
    const model = stairGeometry(data,1)!;
    expect(model.treads[0]).toMatchObject({segIdx:1,stepIdx:0,number:3,x:0,z:7});
  });
});

describe('assembly placement',()=>{
  const assembly=(turn:'left'|'right'|'u'|'none')=>{
    const d=fixture();d.segments.push({kind:'platform',length:'48',depth:'84',diag:'',slope:'0',slopeDir:'',turn,exitOffset:'0'},structuredClone(d.segments[0]));return d;
  };
  it('rotates upper flights left and right in plan without changing their rise',()=>{
    const left=stairGeometry(assembly('left'))!,right=stairGeometry(assembly('right'))!;
    const l=left.treads[3].corners,r=right.treads[3].corners;
    expect(l[1].x).toBeCloseTo(l[0].x);expect(l[1].y).toBeLessThan(l[0].y);
    expect(r[1].x).toBeCloseTo(r[0].x);expect(r[1].y).toBeGreaterThan(r[0].y);
    expect(left.rise).toBe(29);expect(right.rise).toBe(29);
  });
  it('turns a switchback through 180 degrees',()=>{
    const t=stairGeometry(assembly('u'))!.treads[3];
    expect(t.corners[1].x).toBeLessThan(t.corners[0].x);expect(t.corners[1].y).toBeCloseTo(t.corners[0].y);
  });
  it('uses measured landing departure offsets',()=>{
    const d=assembly('left');const landing=d.segments[1];if(landing.kind!=='platform')throw Error();
    landing.exitOffset='6';expect(stairGeometry(d)!.treads[3].corners[0].x).toBe(28);
    landing.exitOffset='';expect(stairGeometry(d)!.provisional).toBe(true);
  });
  it('branches from the shared landing instead of stacking branch elevations',()=>{
    const d=assembly('none'),left=d.segments[2] as FlightSegment;left.branch='left';left.branchOffset='0';
    const right=structuredClone(left);right.branch='right';d.segments.push(right);
    const m=stairGeometry(d)!;
    expect(m.treads[3].z).toBe(m.treads[5].z);expect(m.rise).toBe(29);
    expect(m.treads[3].corners[1].y).toBeLessThan(m.treads[3].corners[0].y);
    expect(m.treads[5].corners[1].y).toBeGreaterThan(m.treads[5].corners[0].y);
  });
  it('parses landing grades without treating inches per foot as degrees',()=>{
    expect(landingGrade('3/8"/ft')).toBeCloseTo(.03125);
    expect(landingGrade('45°')).toBeCloseTo(1);
    expect(landingGrade('abc')).toBeNull();expect(landingGrade('90')).toBeNull();
    const d=assembly('none'),p=d.segments[1];if(p.kind!=='platform')throw Error();p.slope='3/8"/ft';p.slopeDir='Right';
    const t=stairGeometry(d)!.treads[2];expect(t.corners[3].z-t.corners[0].z).toBeCloseTo(-84*.03125);
    p.slopeDir='unknown';expect(stairGeometry(d)!.provisional).toBe(true);
  });
  it('constructs a measured wedge and mirrors its direction',()=>{
    const d=fixture(),f=d.segments[0] as FlightSegment;
    f.steps=f.steps.slice(0,1);f.width='36';d.datums.walkline='12';
    Object.assign(f.steps[0],{winder:true,turnDeg:'60',turnDirection:'left',runIn:'0',runOut:'36',run:'12'});
    const l=stairGeometry(d)!;expect(l.provisional).toBe(false);expect(l.treads[0].corners[2].y).toBeCloseTo(18);
    f.steps[0].turnDirection='right';const r=stairGeometry(d)!;
    expect(r.treads[0].corners[1].y).toBeCloseTo(18);expect(r.provisional).toBe(false);
    f.steps[0].runOut='40';expect(stairGeometry(d)!.provisional).toBe(true);
  });
  it('draws a ramp from horizontal run and vertical rise',()=>{
    const d=fixture();d.segments=[{kind:'ramp',runH:'120',length:'',rise:'12',width:'48',angleDeg:''}];
    const m=stairGeometry(d)!;expect(m.treads[0].corners[1]).toEqual({x:120,y:0,z:12});expect(m.provisional).toBe(false);
  });
  it('builds a curve with finite coordinates and no synthetic editable steps',()=>{
    const d=fixture();d.segments=[{kind:'curve',radius:'60',chord:'',arc:'',sweepDeg:'90',rise:'10',direction:'right',width:'36'}];
    const m=stairGeometry(d)!;expect(m.rise).toBeCloseTo(10);expect(m.treads.every(t=>t.stepIdx===null&&t.corners.every(p=>Number.isFinite(p.x+p.y+p.z)))).toBe(true);
  });
});
