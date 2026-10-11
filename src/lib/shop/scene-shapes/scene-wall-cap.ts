// 3D adapter for wall-cap railings: the wall runs in plan with their turns,
// the cap at its measured top (stepping / sloping post to post), the drop side
// shown as the wall's full height, posts on the cap and the rail over them
// (raked follows the cap, stepped stays level between posts).
//
// Pure display: missing numbers draw at a typical size and are marked
// provisional (amber); nothing is written back.

import type { MeasureData } from "../measure";
import { Geo, SceneOut, emptyScene, type ShapeSceneOutput } from "./build-kit";
import { parseMeas } from "../measure-parse";
import { cornerTop, postStations, postsOf, runSloped, runTag, signedMeas, type WallCapData } from "../measure-wall-cap";
import type { Point3 } from "../measure-geometry";

const TYP = { run: 96, cap: 8, rail: 36, drop: 36, post: 1.5 };

export interface WallCapLayoutPost {
  mark: string;
  run: number;
  at: Point3; // centre of the post on the cap top
  top: number;
  provisional: boolean;
}

export interface WallCapLayout {
  runs: { from: Point3; to: Point3; dir: { x: number; y: number }; tops: [number, number]; provisional: boolean; stations: number[] }[];
  posts: WallCapLayoutPost[];
}

/** Plan layout of the wall: run 1 heads +X; each next run turns left (CCW) or right. */
export function wallCapLayout(w: WallCapData): WallCapLayout {
  const out: WallCapLayout = { runs: [], posts: [] };
  let heading = 0, x = 0, y = 0, lastTop = 0;
  const marks = postsOf(w);
  let k = 0;
  w.runs.forEach((r, ri) => {
    if (ri > 0) {
      const a = parseMeas(r.turn);
      heading += ((a ?? 90) * Math.PI) / 180 * (r.turnDir === "right" ? -1 : 1);
    }
    const len = parseMeas(r.length);
    const L = len ?? TYP.run;
    const dir = { x: Math.cos(heading), y: Math.sin(heading) };
    const stations = postStations(r, ri > 0);
    const tops = r.posts.map((p) => signedMeas(p.top));
    const known = tops.map((t, i) => ({ t, s: stations[i] })).filter((v): v is { t: number; s: number } => v.t !== null);
    const topAt = (s: number): number => {
      if (!known.length) return lastTop;
      if (s <= known[0].s) return known[0].t;
      for (let i = 1; i < known.length; i++) if (s <= known[i].s) {
        const a = known[i - 1], b = known[i];
        return b.s === a.s ? b.t : a.t + ((b.t - a.t) * (s - a.s)) / (b.s - a.s);
      }
      return known[known.length - 1].t;
    };
    const from = { x, y, z: topAt(0) }, to = { x: x + dir.x * L, y: y + dir.y * L, z: topAt(L) };
    out.runs.push({ from, to, dir, tops: [from.z, to.z], provisional: len === null || known.length === 0, stations });
    r.posts.forEach((p, pi) => {
      const s = Math.min(Math.max(stations[pi], 0), L);
      const t = tops[pi];
      const top = t ?? topAt(s);
      out.posts.push({ mark: marks[k++].mark, run: ri, at: { x: x + dir.x * s, y: y + dir.y * s, z: top }, top, provisional: t === null || parseMeas(p.capWidth) === null });
    });
    x = to.x; y = to.y; lastTop = to.z;
  });
  return out;
}

/** A wall stretch from a to b, `width` across, its own top at each end (walls slope), `depth` below the lower top. */
function wallStretch(geo: Geo, a: Point3, b: Point3, width: number, depth: number) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  const nx = (-dy / L) * (width / 2), ny = (dx / L) * (width / 2);
  const bottom = Math.min(a.z, b.z) - depth;
  const v = [
    { x: a.x + nx, y: a.y + ny, z: bottom }, { x: b.x + nx, y: b.y + ny, z: bottom }, { x: b.x - nx, y: b.y - ny, z: bottom }, { x: a.x - nx, y: a.y - ny, z: bottom },
    { x: a.x + nx, y: a.y + ny, z: a.z }, { x: b.x + nx, y: b.y + ny, z: b.z }, { x: b.x - nx, y: b.y - ny, z: b.z }, { x: a.x - nx, y: a.y - ny, z: a.z },
  ];
  geo.quad(v[3], v[2], v[1], v[0]).quad(v[4], v[5], v[6], v[7]).quad(v[0], v[1], v[5], v[4]).quad(v[1], v[2], v[6], v[5]).quad(v[2], v[3], v[7], v[6]).quad(v[3], v[0], v[4], v[7]);
}

export function wallCapScene(data: MeasureData): ShapeSceneOutput {
  const w = data.wallCap;
  if (!w || !w.runs.length) return emptyScene();
  const out = new SceneOut();
  const layout = wallCapLayout(w);
  const caps = postsOf(w).map((x) => parseMeas(x.p.capWidth)).filter((n): n is number => n !== null);
  const capW = caps.length ? caps.reduce((a, b) => a + b, 0) / caps.length : TYP.cap;
  const drop = parseMeas(w.drop);
  const depth = drop ?? TYP.drop;
  const rail = parseMeas(w.railHeight);
  const railH = rail ?? TYP.rail;
  if (drop === null) out.need("Wall · drop height");
  if (rail === null) out.need("Railing · height");

  layout.runs.forEach((r, i) => {
    // One mesh per run, split at every post so each stretch carries its own top.
    const pts = layout.posts.filter((p) => p.run === i).map((p) => p.at);
    const along = (p: Point3) => (p.x - r.from.x) * r.dir.x + (p.y - r.from.y) * r.dir.y;
    const chain = [r.from, ...pts, r.to].sort((a, b) => along(a) - along(b));
    const geo = new Geo();
    for (let j = 1; j < chain.length; j++) if (Math.hypot(chain[j].x - chain[j - 1].x, chain[j].y - chain[j - 1].y) >= 0.25) wallStretch(geo, chain[j - 1], chain[j], capW, depth);
    out.mesh(`wallcap:wall:${i}`, `${runTag(i)} · wall`, "site", geo, { provisional: r.provisional, referenceOnly: false, entity: { part: runTag(i), role: "wall" } });
    if (r.provisional) out.need(`${runTag(i)} · length / top of cap`);
  });

  const half = TYP.post / 2;
  for (const p of layout.posts) {
    const geo = new Geo().box({ x: p.at.x - half, y: p.at.y - half, z: p.top }, { x: p.at.x + half, y: p.at.y + half, z: p.top + railH });
    out.mesh(`wallcap:post:${p.mark}`, p.mark, "post", geo, { provisional: p.provisional || rail === null, entity: { part: p.mark, role: "post" } });
  }

  // Rail over the posts, run by run, carried round each corner from the last post before it.
  w.runs.forEach((r, i) => {
    const prev = layout.posts.filter((p) => p.run < i).at(-1);
    const ps = [...(prev ? [prev] : []), ...layout.posts.filter((p) => p.run === i)];
    if (ps.length < 2) return;
    const points: Point3[] = [];
    ps.forEach((p, j) => {
      const z = p.top + railH;
      if (r.rail === "stepped" && j > 0) points.push({ x: p.at.x, y: p.at.y, z: points[points.length - 1].z });
      points.push({ x: p.at.x, y: p.at.y, z });
    });
    out.line(`wallcap:rail:${i}`, `${runTag(i)} · rail`, "rail", points, { provisional: (!r.rail && runSloped(r, cornerTop(w, i))) || rail === null, entity: { part: runTag(i), role: "rail" } });
  });
  return out.done();
}
