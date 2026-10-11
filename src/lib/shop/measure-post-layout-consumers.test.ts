// One source of truth for post tops: the post layout. Every consumer — the 3D
// post meshes, the 2D/Blender drawing posts and the Blender post cuts — must
// land on the same rail-line point the Posts card and the 3D label show.
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { porchSiteFixture } from './measure-site.fixture';
import { postLayout } from './measure-post-layout';
import { drawingPosts } from './measure-drawing';
import { stairGeometry } from './measure-geometry';
import { measureScene } from './measure-scene';
import { orderedPosts } from './measure-checks';
import { blenderPayload, type DrawingRequest } from './shop-drawings';
import type { MeasureData } from './measure';

const request = (data: MeasureData) => ({ id: 'f0000000-0000-4000-8000-000000000077', source_updated_at: '2026-10-11T00:00:00Z', snapshot: { name: 'SYNTHETIC post tops', shape: 'stair_platform', data } }) as unknown as DrawingRequest;

/** Nosing-line datum, posts at different setbacks — the case where the old base+height top was wrong. */
const nosingFixture = () => {
  const d = porchSiteFixture();
  d.fab.railHeightDatum = '';
  d.posts.filter(p => p.side === 'right').forEach((p, i) => { p.fromNosing = i ? '8' : '2'; });
  return d;
};

for (const [name, make] of [['nosing-line datum', nosingFixture], ['finished top at each post', porchSiteFixture]] as const) {
  describe(`post tops agree everywhere — ${name}`, () => {
    it('drawing posts, 3D meshes and the Blender payload use the calculated rail point', () => {
      const d = make();
      const layout = postLayout(d, orderedPosts(d))!;
      const drawn = drawingPosts(d, stairGeometry(d)!);
      const scene = measureScene(d);
      const payload = blenderPayload(request(d));
      expect(layout.posts.length).toBe(4);
      for (const lp of layout.posts) {
        const dp = drawn.find(p => p.post.id === lp.post.id)!;
        expect(dp.top!.z).toBeCloseTo(lp.top.z, 6);
        expect(dp.base!.z).toBeCloseTo(lp.base.z, 6);
        const mesh = scene.meshes.find(m => m.id === `post:${lp.post.id}`)!;
        expect(Math.max(...mesh.vertices.map(v => v.z))).toBeCloseTo(lp.top.z, 6);
        const pp = payload.posts.find(p => p.sourcePost.id === lp.post.id)!;
        expect(pp.top.z).toBeCloseTo(lp.top.z, 6);
        expect(pp.top.z - pp.base.z).toBeCloseTo(lp.height, 6);
      }
      // The 3D span label rides the same rail line (drawn 10" above it).
      const span = layout.spans[0];
      const dim = scene.lines.find(l => l.id === `dim:${span.from.post.id}:${span.to.post.id}`)!;
      expect(dim.points[0].z - 10).toBeCloseTo(span.from.top.z, 6);
      expect(dim.points.at(-1)!.z - 10).toBeCloseTo(span.to.top.z, 6);
    });
  });
}

it('nosing-line posts sit on one straight rail regardless of setback', () => {
  const d = nosingFixture();
  const right = postLayout(d)!.posts.filter(p => p.side === 'right');
  const [a, b] = right;
  // Rail through the two tops runs parallel to the nosing line (7/11), 36" above it.
  expect((b.top.z - a.top.z) / (b.base.x - a.base.x)).toBeCloseTo(7 / 11, 6);
  expect(a.height).toBeCloseTo(36 + 2 * 7 / 11, 6);
  expect(b.height).toBeCloseTo(36 + 8 * 7 / 11, 6);
});

// The Blender shop package cuts posts from the payload tops; prove the cut
// length is the calculated height less the cap and fitting gap, plus embedment.
let python = false;
try { execFileSync('python3', ['--version']); python = true; } catch { /* no python here */ }
(python ? it : it.skip)('Blender post cut length matches the calculated post height', () => {
  const d = porchSiteFixture();
  const layout = postLayout(d, orderedPosts(d))!;
  const dir = mkdtempSync(join(tmpdir(), 'kiw-cut-'));
  const file = join(dir, 'payload.json');
  writeFileSync(file, JSON.stringify(blenderPayload(request(d))));
  const script = 'import json,sys;from assembly import build_assembly;a=build_assembly(json.load(open(sys.argv[1])));print(json.dumps(a.get("post_cuts",[])))';
  const cuts = JSON.parse(execFileSync('python3', ['-c', script, file], { cwd: resolve(__dirname, '../../../scripts/blender') }).toString()) as { mark: string; shortLength: number; longLength: number; embedment: number; topCutDeg: number; width: number }[];
  expect(cuts.length).toBe(layout.posts.length);
  const cap = 3 / 8, gap = 1 / 16;
  for (const c of cuts) {
    const lp = layout.posts.find(p => p.label === c.mark)!;
    const theta = Math.atan(lp.slope), cos = Math.cos(theta);
    // Post centre: rail top − cap thickness (vertical, on the rake) − fitting gap, above the surface.
    const centre = lp.height - cap / cos - gap;
    expect((c.shortLength + c.longLength) / 2 - c.embedment).toBeCloseTo(centre, 4);
    expect(c.longLength - c.shortLength).toBeCloseTo(c.width * Math.tan(theta), 4);
  }
});
