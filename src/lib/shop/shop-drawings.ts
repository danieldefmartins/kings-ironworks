import { flightWalls, normalizeMeasureData, type MeasureData } from './measure';
import { stairGeometry } from './measure-geometry';
import { drawingIssues, drawingPosts } from './measure-drawing';
import { landingConnections, landingConnectionGeometry } from './measure-landings';

export type DrawingRequest = {
  id: string; org_id: string; sheet_id: string; job_id: string;
  snapshot: { name: string | null; shape: string; data: MeasureData };
  source_updated_at: string; requested_at: string;
  status: 'queued' | 'generating' | 'ready' | 'failed' | 'approved';
  worker_id: string | null; lease_token: string | null; lease_until: string | null;
  artifact_path: string | null; error: string | null;
};

/** Inches, never pixels. Unresolved geometry travels as explicit draft issues. */
export function blenderPayload(request: DrawingRequest) {
  const data = normalizeMeasureData(request.snapshot.data);
  const model = stairGeometry(data);
  const surfaces = model?.treads ?? [];
  const posts = model ? drawingPosts(data, model) : [];
  return {
    version: 2, engine: 'blender', id: request.id, title: request.snapshot.name || 'KIW railing',
    shape: request.snapshot.shape, sourceUpdatedAt: request.source_updated_at, units: 'inches', draft: true, issues: drawingIssues(data),
    surfaces: surfaces.map(t => ({ segment: t.segIdx, step: t.stepIdx, riseDepth: t.rise, label: t.number === null ? `Landing ${t.segIdx + 1}` : `Step ${t.number}`, corners: t.corners, provisional: t.provisional, rise: t.riseLabel, run: t.runLabel, width: t.widthLabel })),
    walls: surfaces.flatMap(t => {
      const seg=data.segments[t.segIdx];
      const override=seg.kind==='flight'&&t.stepIdx!==null?seg.steps[t.stepIdx].wallSide:undefined;
      const walls=override?{left:override==='left'||override==='both',right:override==='right'||override==='both'}:flightWalls(seg,data.datums.orientation);
      return (['left','right'] as const).filter(side=>walls[side]).map(side=>({segment:t.segIdx,points:side==='left'?[t.corners[0],t.corners[1]]:[t.corners[3],t.corners[2]]}));
    }),
    posts: posts.filter(p => p.base && p.top).map(p => ({ label: p.label, sourcePost: p.post, base: p.base!, top: p.top!, provisional: p.provisional, segment: p.post.segIdx, side: p.post.side, pointType: p.post.pointType, firstStepToPostEdge: p.post.firstStepToPostEdge })),
    transitions: landingConnections(data).flatMap((t, i) => {
      if (t.kind !== 'drop' && t.kind !== 'level') return [];
      const g = landingConnectionGeometry(data, t);
      return g ? [{ label: `T${i + 1}`, points: g.path, provisional: g.provisional }] : [];
    }),
    // Preserve field records alongside geometry for the shop reviewer.
    measurements: data,
  };
}
