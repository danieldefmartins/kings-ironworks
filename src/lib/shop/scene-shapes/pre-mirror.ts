// The 3D shows every scene mirrored across y (scene-mirror.ts) so a STAIR —
// modelled with +y to the climber's right — reads the right way round. Shapes
// that are modelled in true plan instead (the fire escape with its platforms
// toward the viewer at −y, a spiral's turning direction, a structural member
// list standing in rows behind the frame, a shop piece's niche running back
// from its front face) would come out back to front: platforms behind the
// building wall, a counter-clockwise spiral drawn clockwise. Their adapters
// pass their output through here, so after the viewport's mirror they read as
// modelled. Their dimension lines (measure-dims-*.ts) go through the same flip.
import type {Point3} from '../measure-geometry';
import type {SceneDim} from '../measure-dims';
import type {ShapeSceneOutput} from './build-kit';

const flip = (p: Point3): Point3 => ({x: p.x, y: -p.y, z: p.z});

export function preMirrorScene(out: ShapeSceneOutput): ShapeSceneOutput {
  return {
    ...out,
    meshes: out.meshes.map(m => ({...m, vertices: m.vertices.map(flip), faces: m.faces.map(f => [...f].reverse())})),
    lines: out.lines.map(l => ({...l, points: l.points.map(flip)})),
  };
}

export function preMirrorDims(dims: SceneDim[]): SceneDim[] {
  return dims.map(d => ({
    ...d,
    lines: d.lines.map(([a, b]) => [flip(a), flip(b)] as [Point3, Point3]),
    ...(d.dashed ? {dashed: d.dashed.map(([a, b]) => [flip(a), flip(b)] as [Point3, Point3])} : {}),
    anchor: flip(d.anchor),
  }));
}
