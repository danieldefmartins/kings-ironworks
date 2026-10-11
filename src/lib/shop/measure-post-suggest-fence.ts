// Post suggestion — fence runs.
//
// A fence is a chain of straight segments; a segment ends where the line turns
// (a corner) or where the grade changes (each segment carries its own rise).
// Fixed posts: both ends of the run and every corner / grade break. Between
// them, equal panels within the post spacing. The count IS the segment's panel
// count (panels = posts − 1), so the sheet, the checks and the 3D all read the
// same number.
import type { MeasureData } from "./measure";
import type { Point3 } from "./measure-geometry";
import { siteNumber } from "./measure-site";
import { layoutRuns, type PostRun } from "./measure-post-suggest";
import { distinctPosts, num, runMaxSpacing, type RunAdapter, type RunSuggestion } from "./measure-post-suggest-runs";

export const fenceRunId = (segId: string) => `fence:${segId}`;
const signed = (s: string | undefined | null) => {
  const t = (s ?? "").trim().replace(/[−–]/g, "-");
  return t ? siteNumber(t) : null;
};

/** Panel width the fence is built to: its post spacing, else its panel width, else the sheet / org / 6'. */
export function fenceSpacing(data: MeasureData, orgDefault?: string | null): number {
  const f = data.fence;
  return runMaxSpacing(data, orgDefault, num(f?.postSpacing) ?? num(f?.panelWidth));
}

export interface FenceChain {
  runs: PostRun[];
  /** Plan ribbon per segment, for the preview. */
  ribbons: Point3[][];
  complete: boolean;
}

/** The run in plan: starts at the origin heading +X, turns at each segment end (+ = left), grade carried along. */
export function fenceChain(data: MeasureData): FenceChain | null {
  const f = data.fence;
  if (!f || !f.segments.length) return null;
  let x = 0, y = 0, z = 0, heading = 0;
  const runs: PostRun[] = [], ribbons: Point3[][] = [];
  const segs = f.segments;
  for (let i = 0; i < segs.length; i++) {
    const sg = segs[i], L = num(sg.length);
    if (L === null) break;
    const ux = Math.cos(heading), uy = Math.sin(heading), rise = signed(sg.gradeChange) ?? 0;
    const a = { x, y, z }, b = { x: x + ux * L, y: y + uy * L, z: z + rise };
    const turn = signed(sg.turnDeg) ?? 0;
    const next = segs[i + 1];
    const endRole = !next ? "end" : turn !== 0 ? "corner" : "grade";
    runs.push({ id: fenceRunId(sg.id), path: [a, b], anchors: [{ at: 0, role: i === 0 ? "end" : "joint" }, { at: L, role: endRole }] });
    // Across first: the preview reads a fence left to right.
    const nx = -uy * 3, ny = ux * 3;
    ribbons.push([{ x: a.x - nx, y: a.y - ny, z: 0 }, { x: a.x + nx, y: a.y + ny, z: 0 }, { x: b.x + nx, y: b.y + ny, z: 0 }, { x: b.x - nx, y: b.y - ny, z: 0 }]);
    x = b.x; y = b.y; z = b.z;
    heading += (turn * Math.PI) / 180;
  }
  if (!runs.length) return null;
  return { runs, ribbons, complete: runs.length === segs.length };
}

/** The measurer's counts: panels + 1 where the segment has a panel count. */
function fenceCounts(data: MeasureData): Record<string, number> {
  const out: Record<string, number> = {};
  for (const sg of data.fence?.segments || []) {
    const n = num(sg.panels);
    if (n !== null) out[fenceRunId(sg.id)] = Math.round(n) + 1;
  }
  return out;
}

export function fenceSuggestion(data: MeasureData, orgDefault?: string | null): RunSuggestion | null {
  const f = data.fence;
  const chain = fenceChain(data);
  if (!f || !chain || !chain.complete) return null;
  const maxSpacing = fenceSpacing(data, orgDefault);
  const layouts = layoutRuns(chain.runs, { maxSpacing }, fenceCounts(data));
  const labels: RunSuggestion["labels"] = {}, notes: NonNullable<RunSuggestion["notes"]> = {};
  f.segments.forEach((sg, i) => {
    const id = fenceRunId(sg.id);
    labels[id] = { key: "segment", n: sg.label || i + 1 };
    const rise = signed(sg.gradeChange), l = layouts.find((x) => x.run.id === id);
    // On a slope every bay climbs the same: what a stepped panel steps, what a racked one rakes.
    if (rise && l && l.count > 1) notes[id] = { key: "gradePerBay", value: Math.abs(rise) / (l.count - 1) };
  });
  return {
    layouts, labels, notes, maxSpacing, outlines: chain.ribbons, walls: [], linked: false,
    approved: f.segments.every((sg) => num(sg.panels) !== null),
    total: distinctPosts(layouts).length,
  };
}

function writeCounts(d: MeasureData, counts: Record<string, number>) {
  for (const sg of d.fence?.segments || []) {
    const c = counts[fenceRunId(sg.id)];
    if (c !== undefined) sg.panels = String(Math.max(1, c - 1));
  }
}

export const fenceAdapter: RunAdapter = {
  suggest: fenceSuggestion,
  setCounts: (d, counts) => writeCounts(d, counts),
  approve: (d, org) => {
    const s = fenceSuggestion(d, org);
    if (!s) return;
    // Only the segments still without a panel count: a count already written is the measurer's.
    const own = fenceCounts(d);
    writeCounts(d, Object.fromEntries(s.layouts.filter((l) => own[l.run.id] === undefined).map((l) => [l.run.id, l.count])));
  },
};
