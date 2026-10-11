import {describe, expect, it} from 'vitest';
import {newMeasureData, type FlightSegment, type MeasureData, type PlatformSegment} from './measure';
import {stairGeometry} from './measure-geometry';
import {runChecks} from './measure-checks';
import {effectiveAlign, offsetFor, platformLayout} from './measure-platform-placement';

/** Flight 36" wide, a 60" long × 96" deep platform, flight again. */
function sheet(turn: PlatformSegment['turn'], extra: Partial<PlatformSegment> = {}, uDirection?: 'left' | 'right'): MeasureData {
  const d = newMeasureData('straight', 2);
  const f = d.segments[0] as FlightSegment;
  f.width = '36'; f.steps.forEach(s => {s.rise = '7'; s.run = '11';});
  const p: PlatformSegment = {kind: 'platform', entryRise: '7', length: '60', depth: '96', diag: '', slope: '0', slopeDir: '', turn, ...extra};
  if (uDirection) p.uDirection = uDirection;
  d.segments.push(p, structuredClone(f));
  return d;
}
const model = (d: MeasureData) => stairGeometry(d)!;
const platform = (d: MeasureData) => model(d).treads.find(t => t.stepIdx === null)!;
const upper = (d: MeasureData) => model(d).treads.filter(t => t.segIdx === 2)[0];
/** Y span (across) of a tread in plan. */
const span = (c: {y: number}[]) => [Math.min(...c.map(p => p.y)), Math.max(...c.map(p => p.y))];

describe('straight platform', () => {
  it('centres both flights when nothing is measured (no longer left-aligned)', () => {
    const d = sheet('none');
    expect(effectiveAlign(d.segments[1] as PlatformSegment, 'entry')).toBe('center');
    // Incoming flight occupies y 0..36; a centred 96" platform spans -30..66.
    expect(span(platform(d).corners)).toEqual([-30, 66]);
    expect(span(upper(d).corners)).toEqual([0, 36]);
    // A blank offset on a wider platform is still a preview, not a measurement.
    expect(model(d).provisional).toBe(true);
  });
  it('places the stairs 3\' 0" from the left edge of the platform', () => {
    const d = sheet('none', {entryAlign: 'custom', entryFrom: 'left', entryOffset: `3' 0"`, exitAlign: 'center'});
    expect(span(platform(d).corners)).toEqual([-36, 60]);
    expect(span(upper(d).corners)).toEqual([-6, 30]);
    expect(model(d).provisional).toBe(false);
  });
  it('measures from the right edge when the measurer picks it', () => {
    const d = sheet('none', {entryAlign: 'custom', entryFrom: 'right', entryOffset: '36', exitAlign: 'right'});
    // 96 - 36 - 36 = 24" from the left edge.
    expect(span(platform(d).corners)).toEqual([-24, 72]);
    expect(span(upper(d).corners)).toEqual([36, 72]);
  });
  it('flush left / centred / flush right need no tape', () => {
    for (const [align, lo] of [['left', 0], ['center', -30], ['right', -60]] as const) {
      const d = sheet('none', {entryAlign: align, exitAlign: align});
      expect(span(platform(d).corners)[0]).toBe(lo);
      expect(model(d).provisional).toBe(false);
    }
  });
  it('keeps legacy explicit offsets exactly where they were', () => {
    const d = sheet('none', {entryOffset: '8', exitOffset: '4'});
    expect(effectiveAlign(d.segments[1] as PlatformSegment, 'entry')).toBe('custom');
    expect(span(platform(d).corners)).toEqual([-8, 88]);
    expect(span(upper(d).corners)).toEqual([-4, 32]);
  });
});

describe('L landings', () => {
  it('places a left turn along the left edge from its left end (looking up the next flight)', () => {
    const d = sheet('left', {entryAlign: 'left', exitAlign: 'custom', exitFrom: 'left', exitOffset: '6'});
    const c = upper(d).corners;
    expect(c[0].x).toBeCloseTo(22 + 6); // platform starts at x=22 after two 11" treads
    expect(c[1].y).toBeLessThan(c[0].y);
    const right = sheet('left', {entryAlign: 'left', exitAlign: 'custom', exitFrom: 'right', exitOffset: '6'});
    // 60 - 6 - 36 = 18 from the left end.
    expect(upper(right).corners[0].x).toBeCloseTo(22 + 18);
  });
  it('places a right turn from the far end, which is its left looking out', () => {
    const d = sheet('right', {entryAlign: 'left', exitAlign: 'left'});
    const c = upper(d).corners;
    expect(c[0].x).toBeCloseTo(22 + 60); expect(c[0].y).toBeCloseTo(96);
    expect(c[1].y).toBeGreaterThan(c[0].y);
  });
  it('centres the turned flight on a blank exit', () => {
    const d = sheet('left', {entryAlign: 'center'});
    expect(upper(d).corners[0].x).toBeCloseTo(22 + 12);
  });
});

describe('U returns', () => {
  it('defaults a right return to flush outer edges without overlap', () => {
    const d = sheet('u', {}, 'right');
    expect(span(platform(d).corners)).toEqual([0, 96]);
    expect(span(upper(d).corners)).toEqual([60, 96]);
    expect(platformLayout(d, 1)!.overlap).toBe(false);
  });
  it('mirrors for a left return', () => {
    const d = sheet('u', {}, 'left');
    expect(span(platform(d).corners)).toEqual([-60, 36]);
    expect(span(upper(d).corners)).toEqual([-60, -24]);
    expect(platformLayout(d, 1)!.overlap).toBe(false);
  });
  it('reads a legacy left-return exit offset from the right end as before', () => {
    const d = sheet('u', {entryOffset: '60', exitOffset: '4'}, 'left');
    expect(span(upper(d).corners)).toEqual([-56, -20]);
  });
  it('flags flights that land on top of each other', () => {
    const d = sheet('u', {entryAlign: 'center', exitAlign: 'center'}, 'right');
    expect(platformLayout(d, 1)!.overlap).toBe(true);
    expect(model(d).provisional).toBe(true);
    expect(runChecks(d, 'stair_platform').find(c => c.key === 'landing_fit' && c.detail?.includes('overlap'))?.level).toBe('red');
  });
});

describe('fit check', () => {
  it('reds an offset that hangs the stairs off the platform, with the numbers', () => {
    const d = sheet('none', {entryAlign: 'custom', entryFrom: 'left', entryOffset: '70', exitAlign: 'center'});
    const layout = platformLayout(d, 1)!;
    expect(layout.entry!.overhang).toBe(10);
    expect(model(d).provisional).toBe(true);
    const check = runChecks(d, 'stair_platform').find(c => c.key === 'landing_fit' && c.detail?.endsWith('entry'));
    expect(check).toMatchObject({level: 'red', expected: 96, actual: 106, delta: 10});
  });
  it('greens a placement that fits and skips blank defaults', () => {
    const d = sheet('none', {entryAlign: 'custom', entryOffset: '36'});
    const checks = runChecks(d, 'stair_platform').filter(c => c.key === 'landing_fit');
    expect(checks).toHaveLength(1);
    expect(checks[0]).toMatchObject({level: 'green', expected: 96, actual: 72});
  });
  it('converts a drag position into the offset typed from either edge, in 1/8"', () => {
    expect(offsetFor(36.06, 96, 36, 'left')).toBe(36);
    expect(offsetFor(24, 96, 36, 'right')).toBe(36);
  });
});
