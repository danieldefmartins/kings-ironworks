// 3D adapter for shop pieces: each piece drawn as a tube frame at its
// fabricate-to size (four corner legs, top and bottom rings), side by side,
// and — when it fits a niche — the niche itself as a wireframe around it at
// its tightest measured size.
//
// Pure display: missing sizes draw at a typical size, marked provisional.

import type { MeasureData } from "../measure";
import { Geo, SceneOut, emptyScene, type ShapeSceneOutput } from "./build-kit";
import type { Point3 } from "../measure-geometry";
import { pieceQty, pieceTag } from "../measure-shop-piece";
import { spBuildSize } from "../measure-dims-shop-piece";
import { preMirrorScene } from "./pre-mirror";

const TYP = { w: 36, h: 36, d: 12 };
const TUBE = 1.5;
const GAP = 18;

/** The 12 members of a rectangular frame W (x) × D (y) × H (z) from origin o, into one mesh. */
export function frameGeo(o: Point3, w: number, d: number, h: number, t = TUBE): Geo {
  const T = Math.min(t, w / 4, d / 4, h / 4);
  const at = (x: number, y: number, z: number): Point3 => ({ x: o.x + x, y: o.y + y, z: o.z + z });
  const g = new Geo();
  for (const [x, y] of [[0, 0], [w - T, 0], [w - T, d - T], [0, d - T]] as const) g.box(at(x, y, 0), at(x + T, y + T, h));
  for (const z of [0, h - T]) {
    g.box(at(T, 0, z), at(w - T, T, z + T));
    g.box(at(T, d - T, z), at(w - T, d, z + T));
    g.box(at(0, T, z), at(T, d - T, z + T));
    g.box(at(w - T, T, z), at(w, d - T, z + T));
  }
  return g;
}

function boxEdges(o: Point3, w: number, d: number, h: number): Point3[][] {
  const p = (x: number, y: number, z: number): Point3 => ({ x: o.x + x, y: o.y + y, z: o.z + z });
  const ring = (z: number) => [p(0, 0, z), p(w, 0, z), p(w, d, z), p(0, d, z), p(0, 0, z)];
  return [ring(0), ring(h), [p(0, 0, 0), p(0, 0, h)], [p(w, 0, 0), p(w, 0, h)], [p(w, d, 0), p(w, d, h)], [p(0, d, 0), p(0, d, h)]];
}

export function shopPieceScene(data: MeasureData): ShapeSceneOutput {
  return preMirrorScene(build(data));
}

function build(data: MeasureData): ShapeSceneOutput {
  const s = data.shopPiece;
  if (!s || !s.pieces.length) return emptyScene();
  const out = new SceneOut();
  let x = 0;
  s.pieces.forEach((p, i) => {
    const tag = pieceTag(p, i);
    const f = spBuildSize(s, p);
    const provisional = f.width === null || f.height === null || f.depth === null;
    if (provisional) out.need(`${tag} · size`);
    const w = f.width ?? TYP.w, h = f.height ?? TYP.h, d = f.depth ?? TYP.d;
    const c = f.niche ? f.clearance : 0;
    out.mesh(`shoppiece:${p.id}`, `${tag}${pieceQty(p) > 1 ? ` ×${pieceQty(p)}` : ""}`, "attached", frameGeo({ x: x + c, y: 0, z: 0 }, w, d, h), { provisional, referenceOnly: false, entity: { part: tag, role: "frame" } });
    if (f.niche) {
      const nw = f.open.w ?? w + 2 * c, nh = f.open.h ?? h + c, nd = f.open.d ?? d + c;
      boxEdges({ x, y: 0, z: 0 }, nw, nd, nh).forEach((points, k) =>
        out.line(`shoppiece:niche:${p.id}:${k}`, `${tag} · niche`, "wall-edge", points, { provisional: f.open.w === null || f.open.h === null || f.open.d === null, entity: { part: tag, role: "niche" } })
      );
      x += nw + GAP;
    } else x += w + GAP;
  });
  return out.done();
}
