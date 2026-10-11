// Per-shape 3D adapters for the measure scene. measureScene() runs the adapter
// registered for the sheet's shape and merges its meshes / lines / pending.
// Keep SCENE_SHAPES a plain object literal: one line per shape.
import type {MeasureData,MeasureShape} from '../measure';
import type {ShapeSceneAdapter} from './build-kit';
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

export type {ShapeSceneAdapter,ShapeSceneOutput} from './build-kit';
/** @deprecated name kept for the opening/structural/... adapters; same type. */
export type SceneShapeAdapter=ShapeSceneAdapter;

export const SCENE_SHAPES:Partial<Record<MeasureShape,ShapeSceneAdapter>>={
 gate:gateScene,
 fence:fenceScene,
 deck:deckScene,
 balcony:balconyScene,
 window_well:windowWellScene,
 opening:openingScene,
 structural:structuralScene,
 fire_escape:fireEscapeScene,
 spiral:spiralScene,
 // Only when the caller names the shape: on paper a wall rail is a stair flight
 // and a custom sheet is a drawing, which a deck also carries.
 wall_rail:wallRailScene,
 custom:customScene,
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
 return null;
}
