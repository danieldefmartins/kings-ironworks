import { normalizeMeasureData, type MeasureData } from './measure';
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
export function sketchupPayload(request: DrawingRequest) {
  const data = normalizeMeasureData(request.snapshot.data);
  const model = stairGeometry(data);
  if (!model) throw new Error('No supported measured geometry');
  const posts = drawingPosts(data, model);
  return {
    version: 1, id: request.id, title: request.snapshot.name || 'KIW railing',
    units: 'inches', draft: true, issues: drawingIssues(data),
    surfaces: model.treads.map(t => ({ label: t.number === null ? `Landing ${t.segIdx + 1}` : `Step ${t.number}`, corners: t.corners, provisional: t.provisional, rise: t.riseLabel, run: t.runLabel, width: t.widthLabel })),
    posts: posts.filter(p => p.base && p.top).map(p => ({ label: p.label, base: p.base!, top: p.top!, provisional: p.provisional, segment: p.post.segIdx, side: p.post.side })),
    transitions: landingConnections(data).flatMap((t, i) => {
      if (t.kind !== 'drop' && t.kind !== 'level') return [];
      const g = landingConnectionGeometry(data, t);
      return g ? [{ label: `T${i + 1}`, points: g.path, provisional: g.provisional }] : [];
    }),
    // Preserve field records alongside geometry for the shop reviewer.
    measurements: data,
  };
}
