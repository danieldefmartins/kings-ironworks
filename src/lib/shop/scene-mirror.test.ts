import {expect, it} from 'vitest';
import {newMeasureData, type FlightSegment, type PlatformSegment} from './measure';
import {measureScene} from './measure-scene';
import {mirrorScene, sheetSelection} from './scene-mirror';

function lStair(turn: 'left' | 'right') {
  const d = newMeasureData('straight', 2);
  const f = d.segments[0] as FlightSegment;
  f.width = '36'; f.steps.forEach(s => {s.rise = '7'; s.run = '11';});
  const p: PlatformSegment = {kind: 'platform', entryRise: '7', length: '36', depth: '36', diag: '', slope: '0', slopeDir: '', turn, entryAlign: 'left', exitAlign: 'left'};
  d.segments.push(p, structuredClone(f));
  return d;
}
// In three.js (right-handed, z up) a viewer walking +x has +y on their LEFT.
const upperHeading = (turn: 'left' | 'right') => {
  const scene = mirrorScene(measureScene(lStair(turn)));
  const step = scene.meshes.find(m => m.kind === 'surface' && m.entity.segmentIndex === 2 && m.entity.stepIndex === 0)!;
  return step.vertices[1].y - step.vertices[0].y;
};

it('shows a left turn turning left in the 3D (and a right turn right)', () => {
  expect(upperHeading('left')).toBeGreaterThan(0);
  expect(upperHeading('right')).toBeLessThan(0);
});

it('keeps bounds ordered and faces wound outward after mirroring', () => {
  const raw = measureScene(lStair('left')), m = mirrorScene(raw);
  expect(m.bounds.min.y).toBe(-raw.bounds.max.y);
  expect(m.bounds.max.y).toBe(-raw.bounds.min.y);
  expect(m.meshes[0].faces[0]).toEqual([...raw.meshes[0].faces[0]].reverse());
});

it('mirrors picked points back to sheet coordinates', () => {
  expect(sheetSelection({segmentIndex: 1, point: {x: 1, y: -4, z: 2}}).point).toEqual({x: 1, y: 4, z: 2});
  const noPoint = {postId: 'a'};
  expect(sheetSelection(noPoint)).toBe(noPoint);
});
