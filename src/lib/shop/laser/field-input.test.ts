import { describe, expect, it } from 'vitest';
import { fillLaserField, isLaserField, laserFieldUnit } from './field-input';
describe('distance field eligibility', () => {
  it.each(['fireAnchorCount', 'fireStairRisers', 'wellLadderRungs', 'treadsCount', 'deckPostCount', 'stepsThisFlight'])('rejects the shared quantity input %s', help => {
    expect(laserFieldUnit(help)).toBe('count');
  });
  it('rejects degree/count/text placeholders and accepts length', () => {
    expect(laserFieldUnit('stairAngle', '°')).toBe('deg');
    expect(laserFieldUnit(undefined, '0')).toBe('count');
    expect(laserFieldUnit(undefined, '—')).toBe('text');
    expect(laserFieldUnit('railHeight')).toBe('len');
  });
  it('requires a measurement marker and respects disabled/readonly/unit attributes', () => {
    const input = document.createElement('input');
    expect(isLaserField(input)).toBe(false);
    input.dataset.m = '1'; input.dataset.laserUnit = 'len';
    expect(isLaserField(input)).toBe(true);
    input.disabled = true; expect(fillLaserField(input, '12"')).toBe(false);
    input.disabled = false; input.readOnly = true; expect(isLaserField(input)).toBe(false);
    input.readOnly = false; input.dataset.laserUnit = 'count'; expect(isLaserField(input)).toBe(false);
    expect(input.value).toBe('');
  });
});
