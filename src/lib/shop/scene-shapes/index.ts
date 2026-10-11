// Per-shape 3D adapters for the measure scene. measureScene() runs the adapter
// registered for the sheet's shape and merges its meshes / lines / pending.
// Keep SCENE_SHAPES a plain object literal: one line per shape.
import type {MeasureData,MeasureShape} from '../measure';
import type {ShapeSceneAdapter} from './build-kit';
import {preMirrorScene} from './pre-mirror';
import {gateScene} from './scene-gate';
import {fenceScene} from './scene-fence';
import {deckScene} from './scene-deck';
import {balconyScene} from './scene-balcony';
import {windowWellScene} from './scene-window-well';
import {openingScene} from './scene-opening';
import {structuralScene} from './scene-structural';
import {fireEscapeScene} from './scene-fire-escape';
import {spiralScene} from './scene-spiral';
import {wallRailScene} from './scene-wall-rail';
import {customScene} from './scene-custom';
import {canopyScene} from './scene-canopy';
import {wallCapScene} from './scene-wall-cap';
import {shopPieceScene} from './scene-shop-piece';

export type {ShapeSceneAdapter,ShapeSceneOutput} from './build-kit';
/** @deprecated name kept for the opening/structural/... adapters; same type. */
export type SceneShapeAdapter=ShapeSceneAdapter;

// Shapes modelled in true plan (outside toward −y, +x to the right seen from
// outside, + turns to the left) are flipped once here so the viewport's stair
// mirror (scene-mirror.ts) shows them as modelled. Canopy is modelled from the
// house side (+y out) and reads right through the mirror as it is; stairs,
// ramps and wall rails are stair-convention.
export const SCENE_SHAPES:Partial<Record<MeasureShape,ShapeSceneAdapter>>={
 gate:d=>preMirrorScene(gateScene(d)),
 fence:d=>preMirrorScene(fenceScene(d)),
 deck:d=>preMirrorScene(deckScene(d)),
 balcony:d=>preMirrorScene(balconyScene(d)),
 window_well:d=>preMirrorScene(windowWellScene(d)),
 opening:d=>preMirrorScene(openingScene(d)),
 structural:structuralScene,
 fire_escape:fireEscapeScene,
 spiral:spiralScene,
 // Only when the caller names the shape: on paper a wall rail is a stair flight
 // and a custom sheet is a drawing, which a deck also carries.
 wall_rail:wallRailScene,
 custom:d=>preMirrorScene(customScene(d)),
 canopy:canopyScene,
 wall_cap:d=>preMirrorScene(wallCapScene(d)),
 shop_piece:shopPieceScene,
};

/** The scene may only receive the sheet's data, so the shape is read from the
 * block that only that shape's sheet carries. Stair-family, wall-rail and
 * custom sheets return null — pass the shape to measureScene for those. */
export function sceneShapeOf(data:MeasureData):MeasureShape|null{
 if(data.gate)return 'gate';
 if(data.fence)return 'fence';
 if(data.deck)return 'deck';
 if(data.balcony)return 'balcony';
 if(data.well)return 'window_well';
 if(data.fire)return 'fire_escape';
 if(data.spiral)return 'spiral';
 if(data.opening)return 'opening';
 if(data.structural)return 'structural';
 if(data.canopy)return 'canopy';
 if(data.wallCap)return 'wall_cap';
 if(data.shopPiece)return 'shop_piece';
 return null;
}
