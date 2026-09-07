import { describe, expect, it } from 'vitest';
import { measurementProgress, stepDimensionsRecorded } from './measure-progress';
import { newMeasureData, type FlightSegment } from './measure';
describe('visible measurement progress', () => {
  it('counts each step separately instead of one grouped missing-steps gap', () => {
    const data = newMeasureData('straight', 3);
    const flight = data.segments[0] as FlightSegment;
    expect(measurementProgress(data)).toMatchObject({ recorded: 0, total: 3, widths: 0 });
    Object.assign(flight.steps[0], { rise: '7 1/2', run: '11' });
    expect(measurementProgress(data).recorded).toBe(1);
    Object.assign(flight.steps[1], { rise: '7', run: '10' });
    flight.width = '36';
    expect(measurementProgress(data)).toMatchObject({ recorded: 2, widths: 1 });
    flight.steps[0].run = '';
    expect(measurementProgress(data).recorded).toBe(1);
  });
  it('does not reward invalid or incomplete turning geometry', () => {
    expect(stepDimensionsRecorded({ rise: '-7', run: '11', nosing: '' })).toBe(false);
    expect(stepDimensionsRecorded({ rise: '7', run: '0', nosing: '' })).toBe(false);
    expect(stepDimensionsRecorded({ rise: '7', run: 'abc', nosing: '' })).toBe(false);
    const step = { rise: '7', run: '11', nosing: '', winder: true, runIn: '5', runOut: '17', turnDeg: '30' };
    expect(stepDimensionsRecorded(step)).toBe(false);
    expect(stepDimensionsRecorded({ ...step, turnDirection: 'left' })).toBe(true);
  });
});
