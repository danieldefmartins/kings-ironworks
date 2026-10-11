import { describe, expect, it } from 'vitest';
import { newMeasureData, newPost, type FlightSegment, type PlatformSegment, type MeasureData } from './measure';
import { postLayout, picketLayout, sectionWidth, POST_CHECK_TOL } from './measure-post-layout';

const RAKE = Math.atan(7 / 11) * 180 / Math.PI;
const fill = (fl: FlightSegment, rise = '7', run = '11', width = '36') => {
  fl.width = width;
  fl.steps.forEach(s => { s.rise = rise; s.run = run; });
};
const post = (d: MeasureData, segIdx: number, stepIdx: number | null, side: 'left' | 'right', along: string, edge = '1 1/2') => {
  const p = newPost(segIdx, stepIdx);
  p.side = side; p.fromEdge = edge;
  if (stepIdx === null) p.pos = along; else p.fromNosing = along;
  d.posts.push(p);
  return p;
};
const base = (d: MeasureData) => {
  d.rail.height = '36';
  d.materials.post = '1-1/2" sq tube';
  d.materials.picket = '1/2" sq solid';
  d.datums.postRef = 'centerline';
  return d;
};
const straight = () => {
  const d = base(newMeasureData('straight', 4));
  fill(d.segments[0] as FlightSegment);
  return d;
};
const lShape = () => {
  const d = base(newMeasureData('l_shape', 3, 3));
  fill(d.segments[0] as FlightSegment);
  fill(d.segments[2] as FlightSegment);
  const pl = d.segments[1] as PlatformSegment;
  Object.assign(pl, { entryRise: '7', length: '36', depth: '36', slope: '0', exitOffset: '0' });
  return d;
};

describe('section widths', () => {
  it('reads post and picket sizes from material lines', () => {
    expect(sectionWidth('1-1/2" sq tube')).toBe(1.5);
    expect(sectionWidth('2" flat bar')).toBe(2);
    expect(sectionWidth('1/2" sq solid')).toBe(0.5);
    expect(sectionWidth('5/8" sq solid')).toBe(0.625);
    expect(sectionWidth('1-1/2" Sch40 pipe')).toBe(1.9);
    expect(sectionWidth('Molded cap rail')).toBeNull();
    expect(sectionWidth('')).toBeNull();
  });
});

describe('picket spacing', () => {
  it('keeps every opening under the sphere with the fewest pickets', () => {
    const p = picketLayout(31.5, 0.5, 4)!;
    expect(p.count).toBe(7);
    expect(p.gap).toBeCloseTo(3.5);
    expect(p.oc).toBeCloseTo(4);
    expect(p.firstAt).toBeCloseTo(3.75);
    expect(picketLayout(31.5, 0.5, 4, 30)!.ocSloped).toBeCloseTo(4 / Math.cos(Math.PI / 6));
  });
  it('needs no picket in a span already narrower than the sphere', () => {
    expect(picketLayout(3.5, 0.5, 4)!.count).toBe(0);
    expect(picketLayout(0, 0.5, 4)).toBeNull();
  });
});

describe('straight stair', () => {
  it('locates posts, heights to the nosing-line rail and the span between them', () => {
    const d = straight();
    const p1 = post(d, 0, 0, 'right', '2'), p2 = post(d, 0, 3, 'right', '2');
    const L = postLayout(d)!;
    const [a, b] = L.posts;
    expect(a.post.id).toBe(p1.id);
    expect(b.post.id).toBe(p2.id);
    expect([a.base.x, a.base.y, a.base.z].map(n => +n.toFixed(6))).toEqual([2, 34.5, 7]);
    expect(a.height).toBeCloseTo(36 + 2 * 7 / 11);
    expect([b.base.x, b.base.z].map(n => +n.toFixed(6))).toEqual([35, 28]);
    expect(b.height).toBeCloseTo(36 + 2 * 7 / 11);
    expect(a.provisional).toBe(false);
    const s = L.spans[0];
    expect(s.kind).toBe('rake');
    expect(s.run).toBeCloseTo(33);
    expect(s.rise).toBeCloseTo(21);
    expect(s.angle).toBeCloseTo(RAKE);
    expect(s.length).toBeCloseTo(Math.hypot(33, 21));
    expect(s.clearRun).toBeCloseTo(31.5);
    expect(s.clearLength).toBeCloseTo(Math.hypot(33, 21) * 31.5 / 33);
    expect(s.pickets).toMatchObject({ count: 7 });
    expect(s.pickets!.gap).toBeCloseTo(3.5);
  });
  it('turns face-of-post setbacks into centres', () => {
    const d = straight(); d.datums.postRef = 'face';
    post(d, 0, 1, 'left', '1');
    const [a] = postLayout(d)!.posts;
    expect(a.base.x).toBeCloseTo(11 + 1.75);
    expect(a.base.y).toBeCloseTo(1.5 + 0.75);
  });
  it('calculates the first-step distance and flags a typed one that disagrees by more than 1/4"', () => {
    const d = straight();
    const p1 = post(d, 0, 0, 'right', '2'), p2 = post(d, 0, 3, 'right', '2');
    p1.firstStepToPostEdge = '1 1/4';
    p2.firstStepToPostEdge = '34 5/8';
    const [a, b] = postLayout(d)!.posts;
    expect(a.fromFirstStep).toBeCloseTo(1.25);
    expect(a.mismatch).toBe(false);
    expect(b.fromFirstStep).toBeCloseTo(34.25);
    expect(Math.abs(b.fromFirstStep! - b.measuredFromFirst!)).toBeGreaterThan(POST_CHECK_TOL);
    expect(b.mismatch).toBe(true);
  });
  it('orders posts up the run regardless of the order they were added', () => {
    const d = straight();
    post(d, 0, 3, 'right', '2'); post(d, 0, 0, 'right', '2'); post(d, 0, 1, 'right', '5');
    const L = postLayout(d)!;
    expect(L.posts.map(p => p.base.x)).toEqual([2, 16, 35]);
    expect(L.spans.map(s => s.run.toFixed(2))).toEqual(['14.00', '19.00']);
  });
  it('keeps left and right rail lines apart', () => {
    const d = straight();
    post(d, 0, 0, 'right', '2'); post(d, 0, 0, 'left', '2'); post(d, 0, 3, 'right', '2'); post(d, 0, 3, 'left', '2');
    const L = postLayout(d)!;
    expect(L.spans).toHaveLength(2);
    expect(L.spans.every(s => s.from.side === s.to.side)).toBe(true);
  });
  it('marks values provisional while the rail height is missing', () => {
    const d = straight(); d.rail.height = '';
    post(d, 0, 0, 'right', '2');
    expect(postLayout(d)!.posts[0].provisional).toBe(true);
    expect(postLayout(d)!.railHeightKnown).toBe(false);
  });
});

describe('L-shaped stair with a landing', () => {
  it('runs the rail rake → level through the landing knee and turns the corner', () => {
    const d = lShape();
    // Outside of a left turn is the right side.
    post(d, 0, 0, 'right', '2');
    post(d, 1, null, 'right', '34 1/2');
    post(d, 2, 2, 'right', '2');
    const L = postLayout(d)!;
    const [, landing, c] = L.posts;
    expect(landing.onLanding).toBe(true);
    expect(landing.height).toBeCloseTo(36);
    expect(landing.base.z).toBeCloseTo(28);
    const up = L.spans[0];
    expect(up.kind).toBe('transition');
    expect(up.pieces.map(p => p.kind)).toEqual(['rake', 'level']);
    expect(up.pieces[0].angle).toBeCloseTo(RAKE);
    // Rake from P1 to the landing edge (33 − 2 = 31 horizontal), then level to the corner post.
    expect(up.pieces[0].run).toBeCloseTo(31);
    expect(up.pieces[1].run).toBeCloseTo(34.5);
    expect(up.run).toBeCloseTo(65.5);
    expect(up.length).toBeCloseTo(Math.hypot(31, 31 * 7 / 11) + 34.5);
    expect(c.fromFirstStep).toBeNull();
    const out = L.spans[1];
    expect(out.kind).toBe('transition');
    expect(out.pieces.map(p => p.kind)).toEqual(['level', 'rake']);
    expect(out.pieces[1].angle).toBeCloseTo(RAKE);
    expect(out.to.height).toBeCloseTo(36 + 2 * 7 / 11);
  });
  it('carries one rail line from flight to flight through a landing with no post on it', () => {
    const d = lShape();
    post(d, 0, 0, 'right', '2');
    post(d, 2, 2, 'right', '2');
    const s = postLayout(d)!.spans[0];
    expect(s.pieces.map(p => p.kind)).toEqual(['rake', 'level', 'rake']);
    expect(s.rise).toBeCloseTo(s.to.top.z - s.from.top.z);
    expect(s.pieces[1].run).toBeGreaterThan(30);
  });
});
