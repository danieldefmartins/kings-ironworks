import { describe, expect, it } from 'vitest';
import { newMeasureData, type FlightSegment } from './measure';
import { dimForSlot, sceneDims } from './measure-dims';

describe('rake on a stair with a platform', () => {
  it('has its line on the sketch, carrying the calculation from the steps', () => {
    const d = newMeasureData('stair_platform', 4);
    expect(dimForSlot(sceneDims(d, 'stair_platform'), 'overall.rake')).not.toBeNull();
    for (const st of (d.segments[0] as FlightSegment).steps) { st.rise = '7 1/4'; st.run = '10 1/2'; }
    // Nose of step 1 to the landing's edge: three rises plus the step up onto the landing, all four treads.
    const p = d.segments[1]; if (p.kind === 'platform') p.entryRise = '7 1/4';
    expect(dimForSlot(sceneDims(d, 'stair_platform'), 'overall.rake')!.calc).toBeCloseTo(Math.hypot(29, 42));
    // With no step up onto the landing measured, it ends at the last step's nose.
    if (p.kind === 'platform') p.entryRise = '';
    expect(dimForSlot(sceneDims(d, 'stair_platform'), 'overall.rake')!.calc).toBeCloseTo(Math.hypot(21.75, 31.5));
  });
});
