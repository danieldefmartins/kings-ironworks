import type {Point3} from './measure-geometry';
import type {MeasureScene, SceneSelection} from './measure-scene';

/**
 * The measure model is drawn looking up the stair with +y to the RIGHT
 * (tread corners: near-left y=0, near-right y=width; a left turn heads −y).
 * The 2D drawings honour that. three.js is right-handed with z up, where +y
 * sits to the LEFT of +x — so the raw 3D showed every stair mirrored: a left
 * turn drawn turning right, stairs "3' from the left edge" of a platform drawn
 * 3' from its right edge, the left wall on the right.
 *
 * The 3D therefore shows the scene mirrored across y, and every point picked
 * in it is mirrored back before it reaches the sheet. Stored data never moves.
 */
const flip = (p: Point3): Point3 => ({x: p.x, y: -p.y, z: p.z});

export function mirrorScene(scene: MeasureScene): MeasureScene {
  return {
    ...scene,
    // A reflection reverses winding; reverse each face to keep it facing out.
    meshes: scene.meshes.map(m => ({...m, vertices: m.vertices.map(flip), faces: m.faces.map(f => [...f].reverse())})),
    lines: scene.lines.map(l => ({...l, points: l.points.map(flip)})),
    bounds: {
      min: {...scene.bounds.min, y: -scene.bounds.max.y},
      max: {...scene.bounds.max, y: -scene.bounds.min.y},
    },
  };
}

/** A point picked in the (mirrored) 3D, back in sheet coordinates. */
export function sheetPoint(p: Point3): Point3 {
  return flip(p);
}

export function sheetSelection<T extends SceneSelection>(selection: T): T {
  return selection.point ? {...selection, point: flip(selection.point)} : selection;
}
