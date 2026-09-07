import type { MeasureData, StepMeasure } from './measure';
import { parseMeas } from './measure-parse';

const positive = (value: string | undefined) => {
  const n = parseMeas(value || '');
  return n !== null && Number.isFinite(n) && n > 0;
};

// This counts recorded step dimensions, not fabrication readiness or approval.
export function stepDimensionsRecorded(step: StepMeasure) {
  return positive(step.rise) && positive(step.run) && (!step.winder ||
    (positive(step.runIn) && positive(step.runOut) && positive(step.turnDeg) && !!step.turnDirection));
}
export function measurementProgress(data: MeasureData) {
  const flights = data.segments.filter(s => s.kind === 'flight');
  const steps = flights.flatMap(f => f.steps);
  return {
    total: steps.length,
    recorded: steps.filter(stepDimensionsRecorded).length,
    widths: flights.filter(f => positive(f.width)).length,
    flights: flights.length,
    posts: data.posts.filter(p => p.pointType === 'railing_post').length,
    photos: data.photos.length,
  };
}
