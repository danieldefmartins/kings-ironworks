// Left must be left. The viewport mirrors every scene across y so a stair
// (modelled with +y to the climber's right) reads the right way round
// (scene-mirror.ts). Shapes modelled in true plan are pre-mirrored so that,
// AS SHOWN, the default camera (front, at −y) stands outside / in front of the
// work, +x runs to its right, a left turn turns left seen from above, and the
// house is behind. Every check below is on the scene as the viewport shows it.
import { describe, expect, it } from 'vitest';
import { newMeasureData, type MeasureShape } from '../measure';
import { measureScene } from '../measure-scene';
import { mirrorScene } from '../scene-mirror';
import { sceneDims } from '../measure-dims';
import { newWallCapRun } from '../measure-wall-cap';
import { balconyFixture, deckFixture, fenceFixture, gateFixture, wellFixture } from './scene-shapes.fixture';
import { customFixture, openingFixture } from './scene-shapes-b.fixture';
import type { MeasureData } from '../measure';

const shown = (d: MeasureData, shape?: MeasureShape) => mirrorScene(measureScene(d, shape));
const ys = (pts: { y: number }[]) => pts.map((p) => p.y);
const meshY = (s: ReturnType<typeof shown>, pred: (id: string, label: string) => boolean) =>
  ys(s.meshes.filter((m) => pred(m.id, m.label)).flatMap((m) => m.vertices));

describe('3D reads the right way round', () => {
  it('deck: house behind, the outline turns left as measured', () => {
    const s = shown(deckFixture());
    const deck = s.meshes.find((m) => m.id === 'deck:surface')!;
    const house = meshY(s, (id) => id === 'house:deck');
    expect(Math.min(...house)).toBeGreaterThanOrEqual(Math.max(...ys(deck.vertices)) - 1);
    // Side 1 → side 2 is a measured left turn: counter-clockwise seen from above.
    const v = deck.vertices;
    let area = 0;
    for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length]; area += a.x * b.y - b.x * a.y; }
    expect(area).toBeGreaterThan(0);
  });
  it('deck dimension lines sit on the deck as shown', () => {
    const d = deckFixture(), s = shown(d), dims = mirrorScene({ meshes: [], lines: sceneDims(d, 'deck').map((x) => ({ id: x.key, label: '', kind: 'dim' as const, provisional: false, referenceOnly: true, entity: {}, points: x.lines.flat() })), bounds: s.bounds, pending: [] });
    const deck = s.meshes.find((m) => m.id === 'deck:surface')!;
    const dy = ys(dims.lines.flatMap((l) => l.points)), sy = ys(deck.vertices);
    // Same side of the axis as the deck itself (a mirrored dim set would sit on the other side).
    expect(Math.sign(dy.reduce((a, b) => a + b, 0))).toBe(Math.sign(sy.reduce((a, b) => a + b, 0)));
  });
  it('fence: a left turn heads away to the left of the run', () => {
    const d = fenceFixture(), s = shown(d), B = d.fence!.segments[1].id;
    expect(Math.min(...meshY(s, (id) => id === `fence:posts:${B}`))).toBeGreaterThan(-5);
    expect(Math.max(...meshY(s, (id) => id === `fence:posts:${B}`))).toBeGreaterThan(150);
  });
  it('balcony: projects toward the viewer from the wall behind', () => {
    const s = shown(balconyFixture());
    expect(Math.min(...meshY(s, (id) => id === 'balcony:slab'))).toBeLessThan(-50);
    expect(Math.min(...meshY(s, (id) => id === 'house:balcony'))).toBeGreaterThanOrEqual(-0.01);
  });
  it('wall cap: run 2 turning left turns left', () => {
    const d = newMeasureData('wall_cap', 0), w = d.wallCap!;
    w.runs[0].length = '120';
    w.runs.push(newWallCapRun(1, { length: '60', turn: '90', turnDir: 'left' }));
    const s = shown(d, 'wall_cap');
    expect(Math.max(...meshY(s, (id) => id === 'wallcap:wall:1'))).toBeGreaterThan(50);
  });
  it('custom: a line drawn down the screen runs toward the viewer', () => {
    const s = shown(customFixture(), 'custom');
    const rail = s.meshes.find((m) => m.id.startsWith('plan:rail:'))!;
    expect(Math.min(...ys(rail.vertices))).toBeLessThan(-50);
  });
  it('gate: the measurer stands outside; an inward swing goes away from them', () => {
    const d = gateFixture();
    d.gate!.swingDir = 'in';
    const ground = meshY(shown(d), (id) => id === 'gate:ground');
    expect(Math.max(...ground)).toBeGreaterThan(20);
    expect(Math.min(...ground)).toBeGreaterThan(-5);
  });
  it('opening: the wall and its reveal stand behind the face the viewer sees', () => {
    const y = meshY(shown(openingFixture()), (id) => id.startsWith('opening:wall:'));
    expect(Math.max(...y)).toBeGreaterThan(4);
    expect(Math.min(...y)).toBeGreaterThan(-1);
  });
  it('window well: the well comes out toward the viewer, the house behind', () => {
    const s = shown(wellFixture());
    expect(Math.min(...meshY(s, (id) => id === 'well:liner'))).toBeLessThan(-20);
    expect(Math.min(...meshY(s, (id) => id === 'house:well'))).toBeGreaterThan(-1);
  });
  it('canopy: projects toward the viewer; its left end is on the viewer\'s left', () => {
    const d = newMeasureData('canopy', 0);
    Object.assign(d.canopy!, { kind: 'entry', width: '96', projection: '48' });
    const s = shown(d, 'canopy');
    const front = s.meshes.find((m) => m.label === 'Front beam')!, left = s.meshes.find((m) => m.label === 'Side rail L')!, right = s.meshes.find((m) => m.label === 'Side rail R')!;
    expect(Math.max(...ys(front.vertices))).toBeLessThan(-20);
    expect(Math.max(...left.vertices.map((p) => p.x))).toBeLessThan(Math.min(...right.vertices.map((p) => p.x)));
  });
});
