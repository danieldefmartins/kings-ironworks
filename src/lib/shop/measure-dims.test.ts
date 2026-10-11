import { describe, expect, it } from 'vitest';
import { newMeasureData, normalizeMeasureData, type FlightSegment, type MeasureData, type PlatformSegment } from './measure';
import { sheetReadiness } from './measure-checks';
import { measurementQueue } from './measure-next';
import { dimForSlot, dimText, isSingleFlight, linearDim, sceneDims, stairDims, stairSlotsForKey } from './measure-dims';
import { angleCheck, angleState, approveFlightAngle, approveJointAngle, flightAngleCalc, jointAngleCalc } from './measure-angle';
import { measureScene } from './measure-scene';

const straight = (steps = 4, rise = '7 1/2', run = '11') => {
  const d = normalizeMeasureData(newMeasureData('straight', steps));
  const fl = d.segments[0] as FlightSegment;
  fl.steps.forEach(s => { s.rise = rise; s.run = run; });
  fl.width = '36';
  return d;
};
const landing = () => {
  const d = normalizeMeasureData(newMeasureData('l_shape', 3));
  d.segments.forEach(s => {
    if (s.kind === 'flight') { s.width = '36'; s.steps.forEach(st => { st.rise = '7'; st.run = '11'; }); }
  });
  return d;
};
const byKey = (d: MeasureData) => new Map(stairDims(d).map(x => [x.key, x]));

describe('dimension lines: measured vs calculated vs unknown', () => {
  it('floor to floor is calculated from the risers until it is measured', () => {
    const d = straight(4);
    let f2f = byKey(d).get('f2f')!;
    expect(f2f.state).toBe('calculated');
    expect(f2f.calc).toBe(30);
    expect(f2f.value).toBeNull();
    d.overall.floorToFloor = '30 1/4';
    f2f = byKey(d).get('f2f')!;
    expect(f2f.state).toBe('measured');
    expect(f2f.value).toBe(30.25);
  });

  it('is unknown ("?") while a riser is missing and nothing is measured', () => {
    const d = straight(3);
    (d.segments[0] as FlightSegment).steps[1].rise = '';
    expect(byKey(d).get('f2f')!.state).toBe('unknown');
  });

  it('total run and rake on a straight flight follow the steps (rake = rise and run in a right triangle)', () => {
    const d = straight(4, '7', '11');
    const m = byKey(d);
    expect(m.get('totalRun')!.calc).toBe(44);
    expect(m.get('rake')!.calc).toBeCloseTo(Math.hypot(28, 44), 6);
    d.overall.rakeLength = '52';
    expect(byKey(d).get('rake')!.state).toBe('measured');
  });

  it('a platform carries length, depth and a diagonal calculated from them', () => {
    const d = landing();
    const pi = d.segments.findIndex(s => s.kind === 'platform');
    const p = d.segments[pi] as PlatformSegment;
    let m = byKey(d);
    expect(m.get(`platLength:${pi}`)!.state).toBe('unknown');
    expect(m.get(`platDiag:${pi}`)!.calc).toBeNull();
    p.length = '48'; p.depth = '36';
    m = byKey(d);
    expect(m.get(`platLength:${pi}`)!.value).toBe(48);
    expect(m.get(`platDiag:${pi}`)!.state).toBe('calculated');
    expect(m.get(`platDiag:${pi}`)!.calc).toBe(60);
    expect(m.get(`platDiag:${pi}`)!.dashed?.length).toBe(1);
  });

  it('a linear dimension has two extension lines, the dimension line and two ticks', () => {
    const dim = linearDim({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }, 12);
    expect(dim.lines).toHaveLength(5);
    expect(dim.anchor).toEqual({ x: 5, y: -12, z: 0 });
  });

  it('formats as the shop writes it', () => {
    expect(dimText(30.25, 'len')).toBe('30-1/4"');
    expect(dimText(104.5, 'len')).toBe(`8' 8-1/2"`);
    expect(dimText(33.42, 'deg')).toBe('33.4°');
  });
});

describe('single flight: no multi-flight questions, on the sketch or in the queue', () => {
  it('draws none of the multi-flight dimensions', () => {
    const d = straight(5);
    expect(isSingleFlight(d)).toBe(true);
    const kinds = new Set(stairDims(d).map(x => x.kind));
    for (const k of ['jointGap', 'jointAngle', 'platLength', 'platDepth', 'platDiag', 'entryRise', 'flightRise', 'flightRun', 'flightRake']) expect(kinds.has(k as never)).toBe(false);
    for (const k of ['f2f', 'totalRun', 'rake', 'width', 'angle', 'railHeight']) expect(kinds.has(k as never)).toBe(true);
  });

  it('asks none of them, and requires none of them', () => {
    const d = straight(5);
    const gaps = sheetReadiness(d, 'straight').fabGaps;
    const q = measurementQueue(d, 'straight', gaps);
    const ids = q.slots.map(s => s.id);
    expect(ids.some(id => /^j\d|^s\d+\.rake$|ctrlRise|ctrlRun|\.entryRise|\.length$|\.depth$|\.diag$/.test(id))).toBe(false);
    expect(gaps.some(g => /^joint_|^landing_|^flight_rake/.test(g.key))).toBe(false);
  });
});

describe('Next walk and the lit dimension', () => {
  it('walks a landing when it is reached and the overall numbers right after the steps', () => {
    const d = landing();
    (d.segments.filter(s => s.kind === 'flight') as FlightSegment[]).forEach(f => f.steps.forEach(st => { st.rise = ''; st.run = ''; }));
    const q = measurementQueue(d, 'l_shape', sheetReadiness(d, 'l_shape').fabGaps);
    const ids = q.open.flatMap(i => (i.type === 'slot' ? [i.id] : []));
    const pi = d.segments.findIndex(s => s.kind === 'platform');
    const lastStep0 = ids.lastIndexOf('s0.2.run'), plat = ids.indexOf(`s${pi}.length`), nextFlight = ids.indexOf(`s${pi + 1}.0.rise`);
    expect(lastStep0).toBeLessThan(plat);
    expect(plat).toBeLessThan(nextFlight);
    expect(ids.indexOf(`s${pi}.diag`)).toBeLessThan(nextFlight);
    expect(ids.indexOf('overall.f2f')).toBeGreaterThan(ids.lastIndexOf(`s${pi + 1}.2.run`));
  });

  it('every stair slot with a line maps to exactly one dimension', () => {
    const d = landing();
    const dims = sceneDims(d, 'l_shape');
    const pi = d.segments.findIndex(s => s.kind === 'platform');
    expect(dimForSlot(dims, 'overall.f2f')?.key).toBe('f2f');
    expect(dimForSlot(dims, `s${pi}.diag`)?.key).toBe(`platDiag:${pi}`);
    expect(dimForSlot(dims, 'j0.gap')?.key).toBe('jointGap:0');
    expect(dimForSlot(dims, 'j0.angle')?.key).toBe('jointAngle:0');
    expect(stairSlotsForKey('flightRake:2')).toEqual(['s2.rake']);
    expect(dimForSlot(dims, 's0.0.rise')).toBeNull();
  });

  it('dimension lines reach the scene as segment pairs', () => {
    const scene = measureScene(straight(4), 'straight');
    const dims = scene.lines.filter(l => l.dim);
    expect(dims.find(l => l.dim!.key === 'f2f')?.pairs).toBe(true);
    expect(dims.every(l => l.points.length % 2 === 0)).toBe(true);
  });

  it('other work types draw no stair dimensions', () => {
    const d = straight(3);
    expect(sceneDims(d, 'gate')).toEqual([]);
  });
});

describe('stair angle: approve or modify', () => {
  it('calculates the pitch from the steps, else from the control rise and run', () => {
    const d = straight(4, '7', '11');
    const fl = d.segments[0] as FlightSegment;
    expect(flightAngleCalc(fl)).toBeCloseTo((Math.atan2(28, 44) * 180) / Math.PI, 6);
    fl.steps[0].run = '';
    expect(flightAngleCalc(fl)).toBeNull();
    fl.ctrlRise = '28'; fl.ctrlRun = '44';
    expect(flightAngleCalc(fl)).toBeCloseTo(32.47, 2);
  });

  it('approve stores the calculated angle with its source; a re-measured stair makes it a reading again', () => {
    const d = straight(4, '7', '11');
    expect(approveFlightAngle(d, 0)).toBe(true);
    const fl = d.segments[0] as FlightSegment;
    expect(fl.angleDeg).toBe('32.5');
    expect(fl.angleSource).toBe('calculated-approved');
    expect(angleState(fl.angleDeg, fl.angleSource, flightAngleCalc(fl))).toBe('approved');
    fl.steps.forEach(s => { s.rise = '8'; });
    expect(angleState(fl.angleDeg, fl.angleSource, flightAngleCalc(fl))).toBe('measured');
  });

  it('a finder reading is checked against the calculation: green ≤1°, yellow ≤2.5°, red beyond', () => {
    expect(angleCheck(33.4, 34)?.level).toBe('green');
    expect(angleCheck(33.4, 35.5)?.level).toBe('yellow');
    expect(angleCheck(33.4, 37)?.level).toBe('red');
    expect(angleCheck(33.4, 32)?.delta).toBe(-1.4);
    expect(angleCheck(null, 30)).toBeNull();
  });

  it('a joint angle change is the difference of the two pitches, and can be approved', () => {
    const d = landing();
    const j = d.joints[0];
    const calc = jointAngleCalc(d, j);
    expect(calc).toBeCloseTo((Math.atan2(21, 33) * 180) / Math.PI, 6);
    expect(approveJointAngle(d, 0)).toBe(true);
    expect(d.joints[0].angleChangeSource).toBe('calculated-approved');
    expect(d.joints[0].angleChange).toBe(String(Math.round(calc! * 10) / 10));
  });
});
