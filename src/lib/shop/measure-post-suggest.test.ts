import { describe, expect, it } from 'vitest';
import { newMeasureData, type FlightSegment, type PlatformSegment, type MeasureData } from './measure';
import { layoutRun, stepCounts, layoutRuns, pointAlong, type PostRun } from './measure-post-suggest';
import {
  stairSuggestion, applyStairSuggestion, reconcileSuggestedPosts, isUntouchedSuggestion, withSuggestionGhosts,
  stairReadyForPosts, ownPostsOnSides, adoptOwnPosts,
} from './measure-post-suggest-stair';
import { postLayout } from './measure-post-layout';

const line = (len: number, anchors: number[], blocked?: number[]): PostRun => ({
  id: 'r', group: 'g', path: [{ x: 0, y: 0, z: 0 }, { x: len, y: 0, z: 0 }],
  anchors: anchors.map((at, i) => ({ at, role: `a${i}` })), blocked,
});

describe('generic run engine', () => {
  it('adds no posts to a run already within the limit', () => {
    const l = layoutRun(line(60, [0, 60]), { maxSpacing: 72 });
    expect(l.count).toBe(2);
    expect(l.defaultCount).toBe(2);
    expect(l.spans).toEqual([60]);
    expect(l.overMax).toBe(false);
  });
  it('splits a long span into equal spans under the max', () => {
    const l = layoutRun(line(200, [0, 200]), { maxSpacing: 72 });
    expect(l.count).toBe(4);
    expect(l.spanEach).toBeCloseTo(200 / 3);
    l.posts.map((p) => p.at).forEach((at, i) => expect(at).toBeCloseTo(i * 200 / 3));
  });
  it('N posts → equal spans with the anchors fixed', () => {
    const l = layoutRun(line(240, [0, 240]), { maxSpacing: 72 }, 7);
    expect(l.count).toBe(7);
    expect(l.spanEach).toBeCloseTo(40);
    expect(l.posts[0].at).toBe(0);
    expect(l.posts[6].at).toBe(240);
  });
  it('keeps every anchor and shares extra posts to the longest spans', () => {
    const l = layoutRun(line(150, [0, 100, 150]), { maxSpacing: 72 });
    expect(l.posts.filter((p) => p.anchor).map((p) => p.at)).toEqual([0, 100, 150]);
    expect(l.count).toBe(4); // 100 needs one between, 50 needs none
    const more = layoutRun(line(150, [0, 100, 150]), { maxSpacing: 72 }, 6);
    expect(more.spans.map((s) => Math.round(s * 100) / 100)).toEqual([33.33, 33.33, 33.33, 25, 25]);
  });
  it('re-spaces when the count changes, and never drops below the anchors', () => {
    const run = line(300, [0, 300]);
    expect(layoutRun(run, { maxSpacing: 72 }, 6).spanEach).toBeCloseTo(60);
    expect(layoutRun(run, { maxSpacing: 72 }, 3).spanEach).toBeCloseTo(150);
    expect(layoutRun(run, { maxSpacing: 72 }, 1).count).toBe(2);
  });
  it('flags a span over the max spacing, and a crowded one', () => {
    expect(layoutRun(line(300, [0, 300]), { maxSpacing: 72 }, 3).overMax).toBe(true);
    expect(layoutRun(line(300, [0, 300]), { maxSpacing: 72 }).overMax).toBe(false);
    expect(layoutRun(line(40, [0, 40]), { maxSpacing: 72 }, 5).underMin).toBe(true);
  });
  it('never puts a post in a blocked interval', () => {
    const l = layoutRun(line(300, [0, 200, 300], [0]), { maxSpacing: 72 }, 6);
    expect(l.posts.filter((p) => !p.anchor).every((p) => p.interval === 1)).toBe(true);
    expect(l.overMax).toBe(true);
  });
  it('linked runs step together; unlinked only the one', () => {
    const a = { ...line(200, [0, 200]), id: 'left' }, b = { ...line(200, [0, 200]), id: 'right' };
    const lays = layoutRuns([a, b], { maxSpacing: 72 });
    expect(stepCounts(lays, 'left', 1, true)).toEqual({ left: 5, right: 5 });
    expect(stepCounts(lays, 'left', -1, false)).toEqual({ left: 3 });
  });
  it('walks a polyline', () => {
    const p = pointAlong([{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 10, z: 10 }], 15);
    expect(p).toEqual({ x: 10, y: 5, z: 5 });
  });
});

// ---- stairs -----------------------------------------------------------------
const fill = (fl: FlightSegment, n?: number) => {
  fl.width = '36';
  if (n) fl.steps = fl.steps.slice(0, n);
  fl.steps.forEach((s) => { s.rise = '7'; s.run = '11'; });
};
const prep = (d: MeasureData) => {
  d.rail.height = '36';
  d.materials.post = '1-1/2" sq tube';
  d.datums.postRef = 'centerline';
  return d;
};
/** Daniel's everyday job: 5 steps and a platform. */
const fivePlusPlatform = () => {
  const d = prep(newMeasureData('stair_platform', 5));
  fill(d.segments[0] as FlightSegment);
  Object.assign(d.segments[1] as PlatformSegment, { entryRise: '7', length: '48', depth: '36', slope: '0' });
  return d;
};
const where = (d: MeasureData, side: 'left' | 'right') =>
  d.posts.filter((p) => p.side === side).map((p) => (p.stepIdx === null ? `L${p.segIdx}@${p.pos}` : `S${p.stepIdx}@${p.fromNosing}`));

describe('stair adapter', () => {
  it('waits until the treads are measured', () => {
    const d = prep(newMeasureData('stair_platform', 5));
    expect(stairReadyForPosts(d)).toBe(false);
    expect(stairSuggestion(d)).toBeNull();
  });

  it('5 steps + platform → bottom, platform start, platform end on each side', () => {
    const d = fivePlusPlatform();
    const s = stairSuggestion(d)!;
    expect(s.posts).toHaveLength(6);
    for (const side of ['left', 'right'] as const) {
      const lay = s.layouts.find((l) => l.run.id === side)!;
      expect(lay.posts.map((p) => p.role)).toEqual(['bottom', 'platformStart', 'end']);
    }
    applyStairSuggestion(d);
    expect(where(d, 'left')).toEqual(['S0@5 1/2', 'L1@1 1/2', 'L1@46 1/2']);
    expect(d.posts.every(isUntouchedSuggestion)).toBe(true);
  });

  it('mirrors left and right: same treads, same setbacks', () => {
    const d = fivePlusPlatform();
    applyStairSuggestion(d);
    expect(where(d, 'left')).toEqual(where(d, 'right'));
    const lay = postLayout(d)!;
    const l = lay.posts.filter((p) => p.side === 'left'), r = lay.posts.filter((p) => p.side === 'right');
    l.forEach((p, i) => expect(p.height).toBeCloseTo(r[i].height));
  });

  it('a recorded wall gets no posts', () => {
    const d = fivePlusPlatform();
    d.datums.orientation = 'left_wall';
    const s = stairSuggestion(d)!;
    expect(s.posts.every((p) => p.side === 'right')).toBe(true);
    expect(s.walled.left).toBe(true);
    expect(s.posts).toHaveLength(3);
  });

  it('removing one side removes its suggested posts; adding it back restores them', () => {
    const d = fivePlusPlatform();
    applyStairSuggestion(d);
    d.rail.side = 'Right';
    reconcileSuggestedPosts(d);
    expect(d.posts).toHaveLength(3);
    expect(d.posts.every((p) => p.side === 'right')).toBe(true);
    d.rail.side = 'Both';
    reconcileSuggestedPosts(d);
    expect(d.posts).toHaveLength(6);
  });

  it('splits a long flight evenly under the max spacing', () => {
    const d = prep(newMeasureData('straight', 15));
    fill(d.segments[0] as FlightSegment);
    const lay = stairSuggestion(d)!.layouts[0];
    // 14 treads x 11" = 154" centre to centre -> three equal spans of 51-1/3"
    expect(lay.count).toBe(4);
    expect(lay.spanEach).toBeCloseTo(154 / 3);
    applyStairSuggestion(d);
    const spans = postLayout(d)!.spans.filter((sp) => sp.side === 'left').map((sp) => sp.run);
    expect(spans).toHaveLength(3);
    spans.forEach((r) => expect(r).toBeCloseTo(154 / 3, 1));
  });

  it('never puts a post on the nosing edge', () => {
    // 143" in two: the midpoint falls exactly on a nosing; it moves 1-1/2" onto the tread.
    const d = prep(newMeasureData('straight', 14));
    fill(d.segments[0] as FlightSegment);
    applyStairSuggestion(d);
    const mid = d.posts.filter((p) => p.side === 'left')[1];
    expect(mid.fromNosing).toBe('1 1/2');
  });

  it('honours the sheet max spacing', () => {
    const d = prep(newMeasureData('straight', 14));
    fill(d.segments[0] as FlightSegment);
    d.rail.maxPostSpacing = "4'";
    expect(stairSuggestion(d)!.layouts[0].count).toBe(4);
    expect(stairSuggestion({ ...d, rail: { ...d.rail, maxPostSpacing: '' } }, '150')!.layouts[0].count).toBe(2);
  });

  it('count change re-spaces only untouched suggestions', () => {
    const d = prep(newMeasureData('straight', 14));
    fill(d.segments[0] as FlightSegment);
    applyStairSuggestion(d);
    d.rail.postPlan = { ...d.rail.postPlan, left: 6, right: 6 };
    reconcileSuggestedPosts(d);
    expect(d.posts.filter((p) => p.side === 'left')).toHaveLength(6);
    // The measurer moves one post: it is theirs now.
    const mine = d.posts.find((p) => p.side === 'right' && p.stepIdx === 0)!;
    mine.fromNosing = '3';
    expect(isUntouchedSuggestion(mine)).toBe(false);
    expect(ownPostsOnSides(d, ['right']).map((p) => p.id)).toEqual([mine.id]);
    d.rail.postPlan = { ...d.rail.postPlan, left: 4, right: 4 };
    reconcileSuggestedPosts(d);
    expect(d.posts.find((p) => p.id === mine.id)?.fromNosing).toBe('3');
    expect(d.posts.filter((p) => p.side === 'right' && p.stepIdx === 0)).toHaveLength(1);
    // Asked and allowed: it goes back to the suggestion.
    adoptOwnPosts(d, [mine.id]);
    d.rail.postPlan = { ...d.rail.postPlan, left: 5, right: 5 };
    reconcileSuggestedPosts(d);
    expect(d.posts.some((p) => p.id === mine.id)).toBe(false);
    expect(d.posts.filter((p) => p.side === 'right')).toHaveLength(5);
  });

  it('re-suggests when the stair changes', () => {
    const d = fivePlusPlatform();
    applyStairSuggestion(d);
    (d.segments[1] as PlatformSegment).length = '60';
    expect(reconcileSuggestedPosts(d)).toBe(true);
    expect(where(d, 'left')).toContain('L1@58 1/2');
    expect(reconcileSuggestedPosts(d)).toBe(false);
  });

  it('flight + platform + flight: bottom, platform start, platform end, top', () => {
    const d = prep(newMeasureData('l_shape', 4, 4));
    fill(d.segments[0] as FlightSegment);
    fill(d.segments[2] as FlightSegment);
    Object.assign(d.segments[1] as PlatformSegment, { turn: 'none', entryRise: '7', length: '48', depth: '36', slope: '0', exitOffset: '0' });
    const s = stairSuggestion(d)!;
    expect(s.layouts[0].posts.map((p) => p.role)).toEqual(['bottom', 'platformStart', 'platformEnd', 'top']);
    applyStairSuggestion(d);
    // Two-flight stairs default to a 3-1/2" side setback (railSideSetback).
    expect(where(d, 'left')).toEqual(['S0@5 1/2', 'L1@3 1/2', 'L1@44 1/2', 'S3@5 1/2']);
  });

  it('L turn: corner post on the outer side only', () => {
    const d = prep(newMeasureData('l_shape', 4, 4));
    fill(d.segments[0] as FlightSegment);
    fill(d.segments[2] as FlightSegment);
    Object.assign(d.segments[1] as PlatformSegment, { turn: 'left', entryRise: '7', length: '36', depth: '36', slope: '0', exitOffset: '0' });
    const s = stairSuggestion(d)!;
    const roles = (side: string) => s.layouts.find((l) => l.run.id === side)!.posts.filter((p) => p.anchor).map((p) => p.role);
    expect(roles('right')).toEqual(['bottom', 'platformStart', 'corner', 'platformEnd', 'top']);
    expect(roles('left')).toEqual(['bottom', 'platformStart', 'top']);
  });

  it('U turn: two outer corners', () => {
    const d = prep(newMeasureData('u_shape', 4, 4));
    fill(d.segments[0] as FlightSegment);
    fill(d.segments[2] as FlightSegment);
    Object.assign(d.segments[1] as PlatformSegment, { turn: 'u', uDirection: 'right', entryRise: '7', length: '36', depth: '76', slope: '0', exitOffset: '0' });
    const s = stairSuggestion(d)!;
    const left = s.layouts.find((l) => l.run.id === 'left')!.posts.filter((p) => p.anchor).map((p) => p.role);
    expect(left.filter((r) => r === 'corner')).toHaveLength(2);
    const right = s.layouts.find((l) => l.run.id === 'right')!.posts.filter((p) => p.anchor).map((p) => p.role);
    expect(right).toEqual(['bottom', 'platformStart', 'platformEnd', 'top']);
  });

  it('deck-to-grade (one flight): bottom and top', () => {
    const d = prep(newMeasureData('straight', 6));
    fill(d.segments[0] as FlightSegment);
    const s = stairSuggestion(d)!;
    expect(s.layouts.map((l) => l.posts.map((p) => p.role))).toEqual([['bottom', 'top'], ['bottom', 'top']]);
  });

  it('ghost posts for the 3D never reach the sheet', () => {
    const d = fivePlusPlatform();
    const g = withSuggestionGhosts(d, stairSuggestion(d));
    expect(g.posts).toHaveLength(6);
    expect(g.posts.every((p) => p.suggested === 'ghost')).toBe(true);
    expect(d.posts).toHaveLength(0);
  });

  it('leaves sheets that never took a suggestion alone', () => {
    const d = fivePlusPlatform();
    expect(reconcileSuggestedPosts(d)).toBe(false);
    expect(d.posts).toHaveLength(0);
  });
});
