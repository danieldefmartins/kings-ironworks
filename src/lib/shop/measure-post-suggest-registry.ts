// Which post-suggestion adapter speaks for which work type (stairs and level
// runs keep their own: measure-post-suggest-stair.ts). One line per shape.
import type { MeasureData, MeasureShape } from "./measure";
import type { RunAdapter } from "./measure-post-suggest-runs";
import { deckAdapter } from "./measure-post-suggest-deck";
import { fenceAdapter } from "./measure-post-suggest-fence";
import { wallCapAdapter } from "./measure-post-suggest-wall-cap";
import { balconyAdapter } from "./measure-post-suggest-balcony";
import { rampAdapter } from "./measure-post-suggest-ramp";
import { customAdapter } from "./measure-post-suggest-custom";

export const RUN_SUGGEST: Partial<Record<MeasureShape, RunAdapter>> = {
  deck: deckAdapter,
  fence: fenceAdapter,
  wall_cap: wallCapAdapter,
  balcony: balconyAdapter,
  ramp: rampAdapter,
  custom: customAdapter,
};

/** Inside every edit: untouched suggested posts follow the measurements (record-based shapes). */
export function reconcileRunSuggestions(d: MeasureData, shape: MeasureShape | null | undefined, orgDefault?: string | null): boolean {
  const a = shape ? RUN_SUGGEST[shape] : undefined;
  return a?.reconcile ? a.reconcile(d, orgDefault) : false;
}

/** The sheet the 3D draws: suggested posts added as ghosts until approved. */
export function withRunGhosts(data: MeasureData, shape: MeasureShape | null | undefined, orgDefault?: string | null): MeasureData {
  const a = shape ? RUN_SUGGEST[shape] : undefined;
  return a?.ghosts ? a.ghosts(data, orgDefault) : data;
}
