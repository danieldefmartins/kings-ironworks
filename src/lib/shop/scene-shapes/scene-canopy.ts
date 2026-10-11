// 3D adapter for canopy sheets (entry canopy, door hood, pergola, carport,
// skylight frame). Pure display: inches, Z up, the house wall on y = 0 and the
// canopy projecting toward +y, x along the width from the left end.
//
// Missing dimensions draw at a typical proportion and the steel is marked
// provisional (amber) until width, projection and the wall height are measured.

import type { MeasureData } from "../measure";
import type { Point3 } from "../measure-geometry";
import type { SceneLine, SceneMesh } from "../measure-scene";
import { canopyGeometry, hasDoor, isSkylight, sheds, type CanopyData } from "../measure-canopy";
import { parseMeas } from "../measure-parse";

export type CanopyScene = { meshes: SceneMesh[]; lines: SceneLine[]; pending: string[] };

const num = (s: string | undefined) => (s && s.trim() ? parseMeas(s) : null);

/** Axis-aligned in x, sloped in z: bottom face follows zAt(y). */
function slab(x0: number, x1: number, y0: number, y1: number, zAt: (y: number) => number, h: number) {
  const v: Point3[] = [
    { x: x0, y: y0, z: zAt(y0) },
    { x: x1, y: y0, z: zAt(y0) },
    { x: x1, y: y1, z: zAt(y1) },
    { x: x0, y: y1, z: zAt(y1) },
  ];
  const vertices = [...v, ...v.map((p) => ({ ...p, z: p.z + h }))];
  const faces = [[3, 2, 1, 0], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  return { vertices, faces };
}

function box(cx: number, cy: number, z0: number, z1: number, s: number) {
  return slab(cx - s / 2, cx + s / 2, cy - s / 2, cy + s / 2, () => z0, z1 - z0);
}

export function canopyScene(data: MeasureData): CanopyScene {
  const c = (data as MeasureData & { canopy?: CanopyData | null }).canopy;
  const meshes: SceneMesh[] = [];
  const lines: SceneLine[] = [];
  if (!c || !c.kind) return { meshes, lines, pending: [] };

  const g = canopyGeometry(c);
  const W = g.width && g.width > 0 ? g.width : 72;
  const P = g.projection && g.projection > 0 ? g.projection : 48;
  const D = g.depth && g.depth > 0 ? g.depth : 6;
  const sky = isSkylight(c);
  const H = sky ? num(c.curb) ?? 6 : g.mount ?? 90;
  const fall = g.fall ?? (sheds(c) ? (P / 12) * 0.5 : 0);
  const provisional = g.width === null || g.projection === null || (!sky && g.mount === null);
  const under = (y: number) => H - fall * (y / P);
  const item = (id: string, label: string, kind: SceneMesh["kind"], referenceOnly = false) => ({
    id: `canopy:${id}`,
    label,
    kind,
    provisional,
    referenceOnly,
    entity: { part: `canopy:${id}` },
  });
  const t = 2; // frame member width

  if (sky) {
    // Curb on the roof, frame on the curb, pitched by the measured fall.
    meshes.push({ ...item("curb", "Curb", "house", true), ...slab(0, W, 0, P, (y) => -fall * (y / P), H) });
    meshes.push({ ...item("frame", "Skylight frame", "attached"), ...slab(-t, W + t, -t, P + t, (y) => H - fall * (y / P), 1.5) });
    if (c.roof !== "open") meshes.push({ ...item("roofing", "Roofing", "surface"), ...slab(0, W, 0, P, (y) => H + 1.5 - fall * (y / P), 0.5) });
    return { meshes, lines, pending: provisional ? ["Canopy"] : [] };
  }

  // House wall (reference only), door and the existing trim line.
  const sL = num(c.soffitL);
  const sR = num(c.soffitR);
  const wallTop = Math.max(sL ?? 0, sR ?? 0, H + D + (num(c.rodRise) ?? 0)) + 18;
  meshes.push({
    ...item("wall", "House wall", "house", true),
    vertices: [
      { x: -24, y: 0, z: 0 },
      { x: W + 24, y: 0, z: 0 },
      { x: W + 24, y: 0, z: wallTop },
      { x: -24, y: 0, z: wallTop },
    ],
    faces: [[0, 1, 2, 3]],
  });
  if (sL !== null || sR !== null) {
    lines.push({ ...item("trim", "Trim / soffit", "house", true), points: [{ x: -24, y: 0.5, z: sL ?? sR! }, { x: W + 24, y: 0.5, z: sR ?? sL! }] });
  }
  if (hasDoor(c) && c.door.swing !== "none") {
    const dw = num(c.door.width) ?? 36;
    const dh = num(c.door.head) ?? 82;
    const x0 = W / 2 - dw / 2;
    lines.push({
      ...item("door", "Door", "house", true),
      points: [{ x: x0, y: 0.5, z: 0 }, { x: x0, y: 0.5, z: dh }, { x: x0 + dw, y: 0.5, z: dh }, { x: x0 + dw, y: 0.5, z: 0 }],
    });
  }

  // Frame: ledger at the wall, front beam, two side rails — all following the fall.
  meshes.push({ ...item("ledger", "Ledger", "attached"), ...slab(0, W, 0, t, under, D) });
  meshes.push({ ...item("front", "Front beam", "attached"), ...slab(0, W, P - t, P, under, D) });
  meshes.push({ ...item("side-l", "Side rail L", "attached"), ...slab(0, t, t, P - t, under, D) });
  meshes.push({ ...item("side-r", "Side rail R", "attached"), ...slab(W - t, W, t, P - t, under, D) });
  if (c.roof === "open") {
    // Pergola slats every ~12".
    const n = Math.max(1, Math.round(W / 12));
    for (let i = 1; i < n; i++) {
      const x = (W * i) / n;
      meshes.push({ ...item(`slat-${i}`, `Slat ${i}`, "attached"), ...slab(x - 0.75, x + 0.75, 0, P, (y) => under(y) + D, 2) });
    }
  } else {
    meshes.push({ ...item("roofing", "Roofing", "surface"), ...slab(0, W, 0, P, (y) => under(y) + D, 0.5) });
  }

  if (c.gutter === "front") {
    const gd = num(c.gutterDrop) ?? 4;
    meshes.push({ ...item("gutter", "Gutter", "attached"), ...slab(0, W, P, P + 4, () => under(P) - gd, gd + D * 0.6) });
  }

  // Support.
  if (c.support === "posts") {
    const n = Math.max(1, c.posts.length);
    c.posts.forEach((p, i) => {
      const x = n === 1 ? W / 2 : t / 2 + ((W - t) * i) / (n - 1);
      const h = num(p.height);
      const top = under(P);
      // A post measured from its own grade shows the grade falling under it.
      const base = h !== null ? top - h : 0;
      meshes.push({ ...item(`post-${p.id}`, p.label ? `Post ${p.label}` : `Post ${i + 1}`, "post"), ...box(x, P - t / 2, base, top, 4), provisional: provisional || h === null });
    });
  } else if (c.support === "tie_rods") {
    const rise = num(c.rodRise) ?? 18;
    for (const x of [t / 2, W - t / 2]) {
      lines.push({ ...item(`rod-${x}`, "Tie rod", "rail"), points: [{ x, y: 0, z: H + D + rise }, { x, y: P - t, z: under(P - t) + D }] });
    }
  } else if (c.support === "brackets") {
    const reach = Math.min(P * 0.75, 36);
    for (const x of [t / 2, W - t / 2]) {
      const low = H - reach;
      lines.push({ ...item(`bracket-${x}`, "Bracket", "rail"), points: [{ x, y: 0, z: H }, { x, y: 0, z: low }, { x, y: reach, z: under(reach) }] });
    }
  }

  return { meshes, lines, pending: provisional ? ["Canopy"] : [] };
}
