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

export type {ShapeSceneAdapter,ShapeSceneOutput} from './build-kit';

export const SCENE_SHAPES:Partial<Record<MeasureShape,ShapeSceneAdapter>>={
 gate:gateScene,
 fence:fenceScene,
 deck:deckScene,
 balcony:balconyScene,
 window_well:windowWellScene,
};

/** The scene only receives the sheet's data, so the shape is read from the
 * block that only that shape's sheet carries. Stair-family sheets return null. */
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
