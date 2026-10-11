import { describe, expect, it } from 'vitest';
import { newMeasureData, type FlightSegment, type MeasureData, type PlatformSegment } from './measure';
import { applyStairSuggestion, stairSuggestion, withSuggestionGhosts } from './measure-post-suggest-stair';
import { postLayout } from './measure-post-layout';
import { measureScene } from './measure-scene';

/** 5 steps + a 48×36 platform, rail 36", 1-1/2" posts. */
function fivePlusPlatform(): MeasureData {
  const d = newMeasureData('stair_platform', 5);
  d.rail.height = '36';
  d.materials.post = '1-1/2" sq tube';
  d.datums.postRef = 'centerline';
  const fl = d.segments[0] as FlightSegment;
  fl.width = '36';
  fl.steps.forEach((s) => { s.rise = '7'; s.run = '11'; });
  Object.assign(d.segments[1] as PlatformSegment, { entryRise: '7', length: '48', depth: '36', slope: '0' });
  return d;
}

function checkRails(d: MeasureData, ghost: boolean) {
  const scene = measureScene(d);
  const layout = postLayout(d)!;
  const rails = scene.lines.filter((l) => l.kind === 'rail');
  const ids = rails.map((l) => l.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const side of ['left', 'right'] as const) {
    const line = layout.posts.filter((p) => p.side === side);
    const bottom = line.find((p) => !p.onLanding), start = line.find((p) => p.onLanding);
    expect(bottom).toBeTruthy();
    expect(start).toBeTruthy();
    const rail = rails.find((l) => l.id === `rail:${bottom!.post.id}:${start!.post.id}`);
    expect(rail, `${side}: bottom → platform start`).toBeTruthy();
    const pts = rail!.points;
    expect(pts.length).toBeGreaterThanOrEqual(3);
    for (const k of ['x', 'y', 'z'] as const) {
      expect(pts[0][k]).toBeCloseTo(bottom!.top[k]);
      expect(pts[pts.length - 1][k]).toBeCloseTo(start!.top[k]);
    }
    expect(pts[pts.length - 2].z).toBeCloseTo(start!.top.z);
    if (ghost) expect(rail!.provisional).toBe(true);
  }
}

describe('3D rail lines run post to post across segments', () => {
  it('placed posts: the flight rail climbs to the platform-start post', () => {
    const d = fivePlusPlatform();
    applyStairSuggestion(d);
    expect(d.posts.some((p) => p.suggested === 'ghost')).toBe(false);
    checkRails(d, false);
  });
  it('suggested ghost posts: same continuous rail, drawn provisional', () => {
    const d = fivePlusPlatform();
    const g = withSuggestionGhosts(d, stairSuggestion(d));
    expect(g.posts.length).toBe(6);
    checkRails(g, true);
  });
});
