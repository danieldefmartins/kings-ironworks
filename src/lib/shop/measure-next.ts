import type { MeasureData, MeasureShape } from './measure';
import { parseMeas } from './measure-parse';
import type { Gap } from './measure-checks';
import { legacyStageForGap, type LegacyMeasureStage } from './measure-workspace';
import { isFaceMount, OPENING_DOOR_PRODUCTS, openingFabSize, unitTag, type OpeningProduct } from './measure-opening';
import { gateLeafCalc } from './measure-dims-gate';
import { isBearingRole, isSpanning, isVertical, ROLE_PREFIX } from './measure-structural';
import { blankMountGaps } from './measure-substrate';
import { postsOf, runTag } from './measure-wall-cap';
import { D_KEYS, DESIGN_KEYS, H_KEYS, pieceTag, W_KEYS } from './measure-shop-piece';
import { isSingleFlight, perFlightControls } from './measure-dims';
import { structuralCutReady } from './measure-dims-structural';
import { spiralSlotCalc as SLOT_CALC_SPIRAL } from './measure-dims-spiral';
import { fireSlotCalc as SLOT_CALC_FIRE } from './measure-dims-fire';
import { shopPieceSlotCalc as SLOT_CALC_SP } from './measure-dims-shop-piece';

/**
 * The measuring queue: every tape-measure number the sheet asks for, in the
 * order a measurer walks the job, so the editor can always put ONE field in
 * front of them — "Next: Step 3 · Rise" — and step to the following one.
 *
 * It is derived, never stored. A slot is listed while its requirement is open
 * (the same `requiredGaps` that paints fields red) or once it holds a value,
 * so the count can only show measurements this sheet really needs plus the
 * ones already taken. Requirements that are not a single number — a choice,
 * a photo, a post's mounting — stay in the queue as gaps that open the panel
 * where they are answered.
 */
export type SlotUnit = 'len' | 'deg' | 'count';
export interface NextSlot {
  id: string;
  /** Requirement this number answers (gap_<key>). */
  gap: string;
  /** Gap detail it pairs with, when the requirement names one (J2, #3, …). */
  detail?: string;
  /** Flight index (0-based, among flights) when it belongs to one. */
  flight?: number;
  segIdx?: number;
  stepIdx?: number;
  /** Shown position: step number across the stair, 1-based. */
  stepNumber?: number;
  /** i18n key of the field label (falls back to gap_<gap>). */
  labelKey: string;
  /** Free-text context (a level or side label, a joint tag). */
  tag?: string;
  unit: SlotUnit;
  /** Other requirements the same number also answers (a column's 1st / 2nd height). */
  alsoGaps?: string[];
  /** Asked even before a requirement names it (wall thickness before the wall is chosen). */
  ask?: (d: MeasureData) => boolean;
  /** The thing this number belongs to on a sheet with its own form: one opening, one member. */
  group?: { kind: 'opening' | 'member' | 'frame' | 'run' | 'post' | 'piece'; id: string; index: number; label: string };
  /** Which dimension of the group, for pointing at it on the elevation. */
  part?: string;
  /** 1-based reading number when a dimension is read more than once. */
  reading?: number;
  /** Slots sharing a copy key repeat the same number ("Same for all floors / columns / pieces"). */
  copyKey?: string;
  /** What the copy row calls its siblings. */
  copyNoun?: 'levels' | 'columns' | 'pieces';
  get: (d: MeasureData) => string;
  put: (d: MeasureData, value: string) => void;
}
export type NextItem =
  | { type: 'slot'; id: string; slot: NextSlot }
  | { type: 'gap'; id: string; gap: Gap };
export interface MeasureQueue {
  /** Every listed number, filled or not, in measuring order. */
  slots: NextSlot[];
  /** Open work in measuring order: empty numbers first by stage, then the rest. */
  open: NextItem[];
  done: number;
  total: number;
}

const STAGE_ORDER: LegacyMeasureStage[] = ['steps', 'level', 'posts', 'locations', 'setup', 'specs', 'photos', 'review'];
const has = (s: string | undefined | null) => !!s && s.trim() !== '';
type Bag = Record<string, unknown>;
const text = (o: Bag | null | undefined, k: string) => {
  const v = o?.[k];
  return typeof v === 'string' ? v : '';
};

function slotsFor(data: MeasureData, shape: MeasureShape): NextSlot[] {
  const out: NextSlot[] = [];
  const field = (
    id: string, gap: string, labelKey: string, obj: (d: MeasureData) => Bag | null | undefined, key: string,
    extra: Partial<NextSlot> = {},
  ) => out.push({
    id, gap, labelKey, unit: 'len', ...extra,
    get: d => text(obj(d), key),
    put: (d, v) => { const o = obj(d); if (o) o[key] = v; },
  });
  const seg = (i: number) => (d: MeasureData) => d.segments[i] as unknown as Bag | undefined;
  const flightList = data.segments.map((s, i) => ({ s, i })).filter(x => x.s.kind === 'flight');
  // One flight, no landing, no turn: the multi-flight numbers (a flight's own
  // rake and totals, joints, landings) do not exist on this stair.
  const single = isSingleFlight(data), controls = !single && perFlightControls(data);
  let stepNo = 0;
  // Walk the stair the way it is climbed: a flight's steps and its own numbers,
  // then the landing it arrives on, then the next flight.
  data.segments.forEach((sg, si) => {
    if (sg.kind === 'flight') {
      const fi = flightList.findIndex(x => x.i === si), i = si, s = sg;
      s.steps.forEach((st, k) => {
        stepNo += 1;
        const step = (d: MeasureData) => {
          const g = d.segments[i];
          return g && g.kind === 'flight' ? (g.steps[k] as unknown as Bag) : undefined;
        };
        const at = { flight: fi, segIdx: i, stepIdx: k, stepNumber: stepNo };
        field(`s${i}.${k}.rise`, 'steps', 'nx_rise', step, 'rise', at);
        field(`s${i}.${k}.run`, 'steps', 'nx_tread', step, 'run', at);
        if (st.winder) {
          field(`s${i}.${k}.runIn`, 'winder', 'winderRunIn', step, 'runIn', at);
          field(`s${i}.${k}.runOut`, 'winder', 'winderRunOut', step, 'runOut', at);
          field(`s${i}.${k}.turn`, 'winder', 'winderTurn', step, 'turnDeg', { ...at, unit: 'deg' });
        }
      });
      const at = { flight: fi, segIdx: i };
      field(`s${i}.width`, 'flight_width', 'width', seg(i), 'width', at);
      if (controls) {
        field(`s${i}.rake`, 'flight_rake', 'flightRake', seg(i), 'rake', at);
        // Optional diagnosis (which of rise or run is off): listed once taken, never demanded.
        field(`s${i}.ctrlRise`, 'flight_ctrl_rise', 'flightCtrlRise', seg(i), 'ctrlRise', at);
        field(`s${i}.ctrlRun`, 'flight_ctrl_run', 'flightCtrlRun', seg(i), 'ctrlRun', at);
      }
      field(`s${i}.angle`, 'flight_angle', 'stairAngle', seg(i), 'angleDeg', { ...at, unit: 'deg' });
    } else if (sg.kind === 'platform') {
      if (single) return;
      const tag = data.segments.length > 2 ? `#${si}` : undefined;
      const at = { segIdx: si, tag: tag && `#${si + 1}` };
      field(`s${si}.entryRise`, 'landing_entry_rise', 'segmentRise', seg(si), 'entryRise', { ...at, detail: `#${si + 1}` });
      if (shape === 'level_run') field(`s${si}.length`, 'run_length', 'length', seg(si), 'length', at);
      else field(`s${si}.length`, 'landing_length', 'length', seg(si), 'length', { ...at, detail: tag });
      field(`s${si}.depth`, 'landing_depth', 'depth', seg(si), 'depth', { ...at, detail: tag });
      field(`s${si}.diag`, 'landing_diag', 'landingDiag', seg(si), 'diag', { ...at, detail: tag });
    } else if (sg.kind === 'ramp') {
      const detail = shape === 'builder' ? `#${si + 1}` : undefined, at = { segIdx: si, detail, tag: detail };
      field(`s${si}.rampRise`, 'ramp_geometry', 'segmentRise', seg(si), 'rise', at);
      field(`s${si}.rampRun`, 'ramp_geometry', 'rampRunH', seg(si), 'runH', at);
      field(`s${si}.rampLength`, 'ramp_geometry', 'rampSlopeLen', seg(si), 'length', at);
      field(`s${si}.rampAngle`, 'ramp_geometry', 'stairAngle', seg(si), 'angleDeg', { ...at, unit: 'deg' });
      field(`s${si}.rampWidth`, 'ramp_geometry', 'width', seg(si), 'width', at);
    }
  });
  if (shape === 'spiral') {
    // Up the column, then round it: floor to floor and its treads (the riser
    // follows from them), the diameter, then the turn and each tread's share.
    const sp = (d: MeasureData) => d.spiral as unknown as Bag | null;
    const calcReady = (id: string) => (d: MeasureData) => (SLOT_CALC_SPIRAL(id, d)?.calc ?? null) !== null;
    field('spiral.f2f', 'floor_to_floor', 'floorToFloor', sp, 'floorToFloor');
    field('spiral.treads', 'spiral_treads', 'nx_spTreads', sp, 'treads', { unit: 'count', ask: d => !!d.spiral });
    field('spiral.riser', 'spiral_riser', 'nx_spRiser', sp, 'riser', { ask: calcReady('spiral.riser') });
    field('spiral.dia', 'diameter', 'diameter', sp, 'diameter');
    field('spiral.rotation', 'spiral_rotation', 'nx_spRotation', sp, 'rotationDeg', { unit: 'deg', ask: d => !!d.spiral });
    field('spiral.treadAngle', 'spiral_tread_angle', 'nx_spTreadAngle', sp, 'treadAngle', { unit: 'deg', ask: calcReady('spiral.treadAngle') });
  } else if (flightList.length) {
    // The overall numbers close the stair: after every step and landing.
    const ov = (d: MeasureData) => d.overall as unknown as Bag;
    field('overall.f2f', 'floor_to_floor', 'floorToFloor', ov, 'floorToFloor');
    field('overall.totalRun', 'total_run', 'totalRun', ov, 'totalRun');
    field('overall.rake', 'rake', 'rakeLength', ov, 'rakeLength');
  }
  if (!single) (data.joints || []).forEach((j, n) => {
    const tag = `J${j.afterSegment + 1}`;
    const jo = (d: MeasureData) => (d.joints || [])[n] as unknown as Bag | undefined;
    field(`j${n}.gap`, 'joint_gap', 'jointGap', jo, 'gap', { detail: tag, tag });
    field(`j${n}.angle`, 'joint_angle_change', 'jointAngleChange', jo, 'angleChange', { detail: tag, tag, unit: 'deg' });
  });
  const fin = (d: MeasureData) => d.finish as unknown as Bag;
  field('finish.bottom', 'bottom_adjustment', 'bottomAdjustment', fin, 'bottomAdjustment');
  field('finish.top', 'top_adjustment', 'topAdjustment', fin, 'topAdjustment');
  field('rail.height', 'rail_height', 'railHeight', d => d.rail as unknown as Bag, 'height');

  const table = (prefix: string, obj: (d: MeasureData) => Bag | null | undefined, rows: [string, string, string, SlotUnit?][], extra: Partial<NextSlot> = {}) =>
    rows.forEach(([gap, labelKey, key, unit]) => field(`${prefix}.${key}`, gap, labelKey, obj, key, { ...extra, unit: unit || 'len' }));
  if (shape === 'gate' && data.gate) gateSlots(data, field);
  if (shape === 'fence' && data.fence) {
    // Walk the line run by run, then the totals and heights that check it.
    data.fence.segments.forEach((sg, n) => {
      const tag = sg.label || `#${n + 1}`;
      field(`fence.seg${n}`, 'fence_seg_length', 'fenceSegLength', d => d.fence?.segments[n] as unknown as Bag | undefined, 'length', { detail: tag, tag });
    });
    table('fence', d => d.fence as unknown as Bag, [
      ['fence_total_run', 'fenceTotalRun', 'totalRun'], ['fence_height', 'fenceHeight', 'height'],
      ['fence_post_spacing', 'fencePostSpacing', 'postSpacing'], ['fence_footing', 'fenceFooting', 'footingDepth'],
    ]);
  }
  if (shape === 'balcony' && data.balcony) table('bal', d => d.balcony as unknown as Bag, [
    ['bal_edge_length', 'balEdgeLength', 'edgeLength'], ['bal_guard_height_f', 'balGuardHeight', 'guardHeight'],
    ['bal_finished_floor', 'balFinishedFloor', 'finishedFloor'], ['bal_slab_thickness', 'balSlabThickness', 'slabThickness'],
    ['bal_embedment_f', 'balEmbedment', 'anchorEmbedment'], ['bal_edge_distance_f', 'balEdgeDistance', 'edgeDistance'],
    ['bal_door_opening', 'balDoorOpening', 'doorOpening'],
  ]);
  if (shape === 'deck' && data.deck) {
    // Round the deck side by side, then the totals that check the walk.
    data.deck.sides.forEach((sd, n) => {
      const tag = sd.label || `#${n + 1}`, side = (d: MeasureData) => d.deck?.sides[n] as unknown as Bag | undefined;
      table(`deck.side${n}`, side, [
        ['deck_side_length', 'deckSideLength', 'length'], ['deck_side_height', 'deckSideHeight', 'heightAboveGrade'],
        ['deck_opening_width', 'deckSideOpeningWidth', 'openingWidth'],
      ], { detail: tag, tag });
    });
    table('deck', d => d.deck as unknown as Bag, [
      ['deck_total_perimeter', 'deckTotalPerimeter', 'totalPerimeter'], ['deck_guard_height_f', 'deckGuardHeight', 'guardHeight'],
      ['deck_post_spacing_f', 'deckPostSpacing', 'postSpacing'],
    ]);
  }
  if (shape === 'fire_escape' && data.fire) {
    table('fire', d => d.fire as unknown as Bag, [['fire_total_height', 'fireTotalHeight', 'totalHeight']]);
    const levels = data.fire.levels.length;
    data.fire.levels.forEach((l, n) => {
      const tag = l.label || `#${n + 1}`, lv = (d: MeasureData) => d.fire?.levels[n] as unknown as Bag | undefined;
      // A level's own height above grade is never another's; the rest usually repeat floor to floor.
      const rows: [string, string, string, SlotUnit?][] = [
        ['fire_plat_length', 'firePlatLength', 'platLength'], ['fire_plat_width', 'firePlatWidth', 'platWidth'],
        ['fire_height_grade', 'fireHeightGrade', 'heightAboveGrade'], ['fire_guard_height', 'fireGuardHeight', 'guardHeight'],
        ['fire_picket_spacing', 'firePicketSpacing', 'picketSpacing'], ['fire_anchor_count', 'fireAnchorCount', 'anchorCount', 'count'],
        ['fire_stair_risers', 'fireStairRisers', 'stairRisers', 'count'], ['fire_stair_rise', 'fireStairRise', 'stairRise'],
        ['fire_stair_run', 'fireStairRun', 'stairRun'], ['fire_stair_angle', 'fireStairAngle', 'stairAngle', 'deg'],
        ['fire_stair_width', 'fireStairWidth', 'stairWidth'], ['fire_floor_to_floor', 'fireFloorToFloor', 'floorToFloor'],
      ];
      rows.forEach(([gap, labelKey, key, unit]) => field(`fire.l${n}.${key}`, gap, labelKey, lv, key, {
        detail: tag, tag, unit: unit || 'len',
        ...(key === 'heightAboveGrade' || key === 'stairAngle' ? {} : { copyKey: `fire:${key}`, copyNoun: 'levels' as const }),
        // The angle is the stair's rise over its run: offered to approve once both are in.
        ...(key === 'stairAngle' ? { ask: (d: MeasureData) => n < levels - 1 && (SLOT_CALC_FIRE(`fire.l${n}.stairAngle`, d)?.calc ?? null) !== null } : {}),
      }));
    });
    table('fire.ladder', d => d.fire?.ladder as unknown as Bag | undefined, [
      ['fire_ladder_length', 'fireLadderLength', 'length'], ['fire_ladder_width', 'fireLadderWidth', 'width'],
      ['fire_ladder_rung', 'fireLadderRung', 'rungSpacing'],
    ]);
  }
  if (shape === 'window_well' && data.well) wellSlots(data, field);
  if (shape === 'opening' && data.opening) openingSlots(data, field);
  if (shape === 'structural' && data.structural) structuralSlots(data, field);
  if (shape === 'canopy' && data.canopy?.kind) canopySlots(data, field);
  if (shape === 'wall_cap' && data.wallCap) wallCapSlots(data, field);
  if (shape === 'shop_piece' && data.shopPiece) shopPieceSlots(data, field);
  return out;
}

/**
 * A gate is read as an opening: the clear width at the top and at the grade,
 * the post on each side, the clearance under the leaf and the grade it swings
 * over; then the leaf widths those numbers give (approve or modify).
 */
function gateSlots(data: MeasureData, field: FieldFn) {
  const gate = (d: MeasureData) => d.gate as unknown as Bag | null | undefined;
  const swings = (d: MeasureData) => !!d.gate && ['single_swing', 'double_swing', 'bifold'].includes(d.gate.operation);
  field('gate.widthTop', 'gate_width_top', 'gateWidthTop', gate, 'widthTop', { part: 'widthTop' });
  field('gate.widthBottom', 'gate_width_bottom', 'gateWidthBottom', gate, 'widthBottom', { part: 'widthBottom' });
  field('gate.heightHinge', 'gate_height_hinge', 'gateHeightHinge', gate, 'heightHinge', { part: 'heightHinge' });
  // The latch post too: the two heights are what show the grade across the opening.
  field('gate.heightLatch', 'gate_height_latch', 'gateHeightLatch', gate, 'heightLatch', { part: 'heightLatch', ask: d => !!d.gate && has(d.gate.heightHinge) });
  field('gate.groundClearance', 'gate_ground_clearance', 'gateGroundClearance', gate, 'groundClearance', { part: 'groundClearance' });
  field('gate.gradeRise', 'gate_grade_rise', 'gateGradeRise', gate, 'gradeRise', { part: 'gradeRise' });
  field('gate.leafA', 'gate_leaf', data.gate?.operation === 'double_swing' ? 'gateLeafFirst' : 'gateLeafA', gate, 'leafA', { part: 'leafA', ask: d => swings(d) && gateLeafCalc(d.gate!).a !== null });
  field('gate.leafB', 'gate_leaf', 'gateLeafB', gate, 'leafB', { part: 'leafB', ask: d => d.gate?.operation === 'double_swing' && gateLeafCalc(d.gate!).b !== null });
}

/**
 * A window well is read from the top of its wall: along the house, out from
 * it, down to the floor, the wall's thickness, how far it stands above grade;
 * for a guard, the wall's bands off the proud face, then the guard itself;
 * then the gate and ladder.
 */
function wellSlots(data: MeasureData, field: FieldFn) {
  const w = data.well!;
  const well = (d: MeasureData) => d.well as unknown as Bag | null | undefined;
  const guard = (d: MeasureData) => !!d.well?.deliverables.includes('guard');
  const row = (gap: string, labelKey: string, key: string, extra: Partial<NextSlot> = {}) => field(`well.${key}`, gap, labelKey, well, key, { part: key, ...extra });
  row('well_length', 'wellLengthAtHouse', 'lengthAtHouse');
  row('well_projection', 'wellProjection', 'projection');
  row('well_depth', 'wellDepth', 'depth');
  row('well_thickness', 'wellWallThickness', 'wallThickness');
  // The guard height is set from here: asked whenever there is a guard.
  row('well_top_to_grade', 'wellTopToGrade', 'topToGrade', { ask: guard });
  if (w.deliverables.includes('guard')) w.bands.forEach((b, n) => {
    const id = b.id, tag = b.label.trim() || `#${n + 1}`;
    const band = (d: MeasureData) => d.well?.bands.find(x => x.id === id) as unknown as Bag | undefined;
    for (const [k, label] of [['setback', 'wellBandSetback'], ['fromTop', 'wellBandFrom'], ['toTop', 'wellBandTo']] as const) {
      field(`well.band.${id}.${k}`, 'well_band', label, band, k, { detail: tag, tag, part: `band:${id}:${k}`, ask: guard });
    }
  });
  row('well_guard_height', 'wellGuardHeight', 'guardHeight');
  row('well_post_to_wall', 'wellPostToWall', 'postToWall');
  row('well_gate_width', 'wellGateWidth', 'gateWidth');
  row('well_ladder_width', 'wellLadderWidth', 'ladderWidth');
  row('well_ladder_rungs', 'wellLadderRungs', 'ladderRungs', { unit: 'count' });
  row('well_ladder_spacing', 'wellLadderSpacing', 'ladderSpacing');
  row('well_ladder_standoff', 'wellLadderStandoff', 'ladderStandoff');
}

type FieldFn = (id: string, gap: string, labelKey: string, obj: (d: MeasureData) => Bag | null | undefined, key: string, extra?: Partial<NextSlot>) => void;

/**
 * An opening is read the way a tape goes round a hole in a wall: across the
 * top, middle and bottom, down the left, centre and right, corner to corner,
 * then into the reveal. Each opening is finished before the next one; the
 * Juliet and door numbers that belong to the whole sheet come last.
 */
function openingSlots(data: MeasureData, field: FieldFn) {
  const o = data.opening!;
  o.units.forEach((u, n) => {
    const detail = unitTag(u, n), id = u.id;
    const unit = (d: MeasureData) => d.opening?.units.find(x => x.id === id) as unknown as Bag | undefined;
    const group = { kind: 'opening' as const, id, index: n, label: u.label.trim() };
    const at = (part: string): Partial<NextSlot> => ({ detail, group, part });
    for (const k of ['wTop', 'wMid', 'wBot'] as const) field(`op.${id}.${k}`, 'op_widths', `nx_${k}`, unit, k, at(k));
    for (const k of ['hLeft', 'hCenter', 'hRight'] as const) field(`op.${id}.${k}`, 'op_heights', `nx_${k}`, unit, k, at(k));
    for (const k of ['diagA', 'diagB'] as const) field(`op.${id}.${k}`, 'op_diagonals', `nx_${k}`, unit, k, at(k));
    // Inside the reveal the piece has to fit the jamb depth; face-mounted it never sees it.
    if (!isFaceMount(o.mount)) field(`op.${id}.reveal`, 'op_reveal', 'nx_reveal', unit, 'reveal', at('reveal'));
    // The size the shop cuts to: calculated from the readings, approved or modified.
    for (const k of ['fabW', 'fabH'] as const) field(`op.${id}.${k}`, 'op_fab', `nx_${k}`, unit, k, {
      ...at(k), ask: d => { const oo = d.opening, uu = oo?.units.find(x => x.id === id); return !!oo && !!uu && openingFabSize(oo, uu) !== null; },
    });
  });
  const whole = (d: MeasureData) => d.opening as unknown as Bag | null;
  if (o.product === 'juliet') {
    field('op.julietSill', 'op_juliet_sill', 'nx_julietSill', whole, 'julietSill', { part: 'julietSill' });
    field('op.julietProjection', 'op_juliet_projection', 'nx_julietProjection', whole, 'julietProjection', { part: 'julietProjection' });
  }
  if (o.product && OPENING_DOOR_PRODUCTS.includes(o.product as OpeningProduct)) {
    field('op.threshold', 'op_door_threshold', 'nx_threshold', whole, 'threshold', { part: 'threshold' });
  }
}

/**
 * A canopy is read standing at the door: across the wall (width), out from it
 * (projection), up to the trim at each end, the underside at the wall, the
 * fall to the front, then the support (rod anchor or each post from its own
 * grade) and the door it has to clear.
 */
function canopySlots(data: MeasureData, field: FieldFn) {
  const c = data.canopy!;
  const whole = (d: MeasureData) => d.canopy as unknown as Bag | null | undefined;
  const at = (part: string): Partial<NextSlot> => ({ part });
  const sky = c.kind === 'skylight';
  field('cn.width', 'canopy_width', 'cn_width', whole, 'width', at('width'));
  field('cn.projection', 'canopy_projection', sky ? 'cn_length' : 'cn_projection', whole, 'projection', at('projection'));
  if (sky) {
    field('cn.curb', 'canopy_curb', 'cn_curb', whole, 'curb', at('curb'));
  } else {
    field('cn.soffitL', 'canopy_soffit_l', 'cn_soffitL', whole, 'soffitL', at('soffitL'));
    field('cn.soffitR', 'canopy_soffit_r', 'cn_soffitR', whole, 'soffitR', at('soffitR'));
    field('cn.mount', 'canopy_mount', 'cn_mount', whole, 'mount', at('mount'));
  }
  if (c.roof !== 'open') field('cn.fall', 'canopy_fall', 'cn_fall', whole, 'fall', at('fall'));
  if (sky) return;
  if (c.support === 'tie_rods') field('cn.rodRise', 'canopy_rod_rise', 'cn_rodRise', whole, 'rodRise', at('rodRise'));
  if (c.support === 'posts') c.posts.forEach((p, i) => {
    const id = p.id, detail = p.label || `P${i + 1}`;
    field(`cn.post.${id}`, 'canopy_post_height', 'cn_postHeight', d => d.canopy?.posts.find(x => x.id === id) as unknown as Bag | undefined, 'height', { detail, tag: detail, part: `post:${id}` });
  });
  if (c.kind === 'entry' || c.kind === 'door_hood') {
    const door = (d: MeasureData) => d.canopy?.door as unknown as Bag | undefined;
    field('cn.doorHead', 'canopy_door_head', 'cn_doorHead', door, 'head', at('doorHead'));
    if (c.door.swing === 'out') field('cn.doorWidth', 'canopy_door_width', 'cn_doorWidth', door, 'width', at('doorWidth'));
  }
}

const MASONRY = new Set(['', 'brick', 'block', 'concrete', 'stone']);

/**
 * Structural steel is read member by member in the order they were laid out:
 * the clear span twice (top and bottom, because once is how beams get cut
 * short), then each end — how far the steel sits in and how thick that wall
 * is — left before right; a column at every place its height was read. The
 * frame that ties them together, each member's cut length to approve, and the
 * longest piece the way in allows, close the walk.
 */
function structuralSlots(data: MeasureData, field: FieldFn) {
  const s = data.structural!;
  const cuts: (() => void)[] = [];
  s.members.forEach((m, n) => {
    const id = m.id, detail = m.mark || ROLE_PREFIX[m.role];
    const member = (d: MeasureData) => d.structural?.members.find(x => x.id === id) as unknown as Bag | undefined;
    const group = { kind: 'member' as const, id, index: n, label: detail };
    const bearing = isBearingRole(m.role);
    if (isSpanning(m.role)) {
      field(`st.${id}.spanA`, 'struct_span', bearing ? 'nx_spanA' : 'nx_lengthA', member, 'spanA', { detail, group, part: 'span', reading: 1 });
      field(`st.${id}.spanB`, 'struct_span_second', bearing ? 'nx_spanB' : 'nx_lengthB', member, 'spanB', { detail, group, part: 'span', reading: 2 });
    }
    if (bearing) {
      for (const [end, key] of [['L', 'bearingL'], ['R', 'bearingR']] as const) {
        const b = (d: MeasureData) => d.structural?.members.find(x => x.id === id)?.[key] as unknown as Bag | undefined;
        const at = { detail: `${detail} ${end}`, group };
        field(`st.${id}.${key}.length`, 'struct_bearing_len', `nx_bearing${end}`, b, 'length', { ...at, part: `bearing${end}` });
        // Asked with the bearing while the wall is unknown or masonry: the tape is already there.
        field(`st.${id}.${key}.wall`, 'struct_wall', `nx_wall${end}`, b, 'wall', {
          ...at, part: `wall${end}`,
          ask: d => {
            const mm = d.structural?.members.find(x => x.id === id);
            if (!mm || !isBearingRole(mm.role)) return false;
            const framed = mm.role === 'beam' && !!d.structural?.frame.on && !mm.spanA.trim() && !mm.spanB.trim();
            return !framed && MASONRY.has(mm[key].substrate);
          },
        });
      }
    }
    if (isVertical(m.role)) {
      m.heights.forEach((r, k) => {
        const rid = r.id;
        const reading = (d: MeasureData) => d.structural?.members.find(x => x.id === id)?.heights.find(x => x.id === rid) as unknown as Bag | undefined;
        field(`st.${id}.h.${rid}`, 'struct_heights', m.role === 'cover' ? 'nx_coverHeight' : 'nx_colHeight', reading, 'value', {
          detail, group, part: `height:${k}`, reading: k + 1, tag: r.label.trim() || undefined, alsoGaps: ['struct_heights_second'],
          copyKey: m.role === 'cover' ? 'st:coverHeight' : 'st:colHeight', copyNoun: 'columns',
        });
      });
    }
    // The cut the member's numbers give, with its weight: approved, or modified and checked — once every number is in.
    cuts.push(() => field(`st.${id}.cut`, 'struct_cut', 'nx_cutLen', member, 'cutLen', { detail, group, part: 'cut', ask: d => structuralCutReady(d, id) }));
  });
  if (s.frame.on) {
    const fr = (d: MeasureData) => d.structural?.frame as unknown as Bag | undefined;
    const group = { kind: 'frame' as const, id: 'frame', index: 0, label: '' };
    // Outside in: the hole first, then the steel that goes in it.
    field('st.frame.opening', 'struct_frame_opening', 'nx_frameOpening', fr, 'opening', { group, part: 'opening' });
    field('st.frame.cc', 'struct_frame_cc', 'nx_frameCc', fr, 'cc', { group, part: 'cc' });
    field('st.frame.diagA', 'struct_frame_diag', 'nx_diagA', fr, 'diagA', { group, part: 'diagA' });
    field('st.frame.diagB', 'struct_frame_diag', 'nx_diagB', fr, 'diagB', { group, part: 'diagB' });
  }
  cuts.forEach(c => c());
  if (s.members.length) field('st.access.maxLength', 'struct_max_length', 'nx_maxLength', d => d.structural?.access as unknown as Bag | undefined, 'maxLength', { part: 'maxLength' });
}

/**
 * A wall-cap railing is walked the way the crew walks the wall: the drop and
 * the rail height first (they decide the guard), then run by run — its length,
 * then at every post the cap width, the top of cap and, when cored, the edge
 * distance to the walk face and to the drop face.
 */
function wallCapSlots(data: MeasureData, field: FieldFn) {
  const w = data.wallCap!;
  const whole = (d: MeasureData) => d.wallCap as unknown as Bag | null;
  field('wc.drop', 'wc_drop', 'wc_drop', whole, 'drop', { part: 'drop' });
  field('wc.railHeight', 'wc_rail_height', 'wc_railHeight', whole, 'railHeight', { part: 'railHeight' });
  if (w.mount === 'core') {
    field('wc.coreDia', 'wc_core_dia', 'wc_coreDia', whole, 'coreDia', { part: 'coreDia' });
    field('wc.coreDepth', 'wc_core_depth', 'wc_coreDepth', whole, 'coreDepth', { part: 'coreDepth' });
  }
  if (w.mount === 'side_high' || w.mount === 'side_low') field('wc.faceDepth', 'wc_face_depth', 'wc_faceDepth', whole, 'faceDepth', { part: 'faceDepth' });
  const marks = postsOf(w);
  w.runs.forEach((r, ri) => {
    const rid = r.id, tag = runTag(ri);
    const run = (d: MeasureData) => d.wallCap?.runs.find(x => x.id === rid) as unknown as Bag | undefined;
    const rgroup = { kind: 'run' as const, id: rid, index: ri, label: tag };
    field(`wc.${rid}.length`, 'wc_run_length', 'wc_runLength', run, 'length', { detail: tag, tag, group: rgroup, part: 'length' });
    if (ri > 0) field(`wc.${rid}.turn`, 'wc_turn', 'wc_turnAngle', run, 'turn', { detail: tag, tag, group: rgroup, part: 'turn', unit: 'deg' });
    r.posts.forEach((p) => {
      const pid = p.id, mark = marks.find(m => m.p.id === pid)?.mark || '';
      const post = (d: MeasureData) => d.wallCap?.runs.find(x => x.id === rid)?.posts.find(x => x.id === pid) as unknown as Bag | undefined;
      const at = (part: string): Partial<NextSlot> => ({ detail: mark, tag: mark, group: { kind: 'post', id: pid, index: ri, label: mark }, part });
      field(`wc.${pid}.capWidth`, 'wc_cap_width', 'wc_capWidth', post, 'capWidth', at('capWidth'));
      field(`wc.${pid}.top`, 'wc_top', 'wc_top', post, 'top', at('top'));
      if (w.mount === 'core') {
        field(`wc.${pid}.edgeHigh`, 'wc_edges', 'wc_edgeHigh', post, 'edgeHigh', at('edgeHigh'));
        field(`wc.${pid}.edgeLow`, 'wc_edges', 'wc_edgeLow', post, 'edgeLow', at('edgeLow'));
      }
    });
  });
}

/**
 * A shop piece in a niche is read the way a tape goes round a box: the widths
 * back, front, top, bottom; the heights left, right, back; the depths top and
 * bottom; then corner to corner across the front. A freestanding or wall piece
 * is just its width, height and depth.
 */
function shopPieceSlots(data: MeasureData, field: FieldFn) {
  const s = data.shopPiece!;
  s.pieces.forEach((p, n) => {
    const id = p.id, detail = pieceTag(p, n);
    const piece = (d: MeasureData) => d.shopPiece?.pieces.find(x => x.id === id) as unknown as Bag | undefined;
    const at = (part: string): Partial<NextSlot> => ({ detail, tag: detail, group: { kind: 'piece', id, index: n, label: detail }, part });
    // Identical pieces (same type) usually read the same: "Same for all pieces".
    const same = (k: string): Partial<NextSlot> => ({ ...at(k), copyKey: `sp:${p.type || '-'}:${k}`, copyNoun: 'pieces' });
    if (s.niche) {
      for (const k of W_KEYS) field(`sp.${id}.${k}`, 'sp_widths', `sp_nx_${k}`, piece, k, same(k));
      for (const k of H_KEYS) field(`sp.${id}.${k}`, 'sp_heights', `sp_nx_${k}`, piece, k, same(k));
      for (const k of D_KEYS) field(`sp.${id}.${k}`, 'sp_depths', `sp_nx_${k}`, piece, k, same(k));
      for (const k of ['diagA', 'diagB'] as const) field(`sp.${id}.${k}`, 'sp_diagonals', `sp_${k}`, piece, k, at(k));
      // Fabricate-to: the tightest reading less the clearance, approved or modified.
      for (const k of ['fabW', 'fabH', 'fabD'] as const) field(`sp.${id}.${k}`, 'sp_fab', `nx_${k}`, piece, k, { ...at(k), ask: d => (SLOT_CALC_SP(`sp.${id}.${k}`, d)?.calc ?? null) !== null });
    } else {
      field(`sp.${id}.w`, 'sp_width', 'sp_w', piece, DESIGN_KEYS.w, same(DESIGN_KEYS.w));
      field(`sp.${id}.h`, 'sp_height', 'sp_h', piece, DESIGN_KEYS.h, same(DESIGN_KEYS.h));
      field(`sp.${id}.d`, 'sp_depth', 'sp_d', piece, DESIGN_KEYS.d, same(DESIGN_KEYS.d));
    }
  });
}

const gapId = (g: Gap) => `gap:${g.key}:${g.detail ?? ''}:${g.flight ?? ''}`;
const matches = (slot: NextSlot, g: Gap) =>
  (g.key === slot.gap || !!slot.alsoGaps?.includes(g.key)) && (slot.detail === undefined || g.detail === slot.detail) && (slot.flight === undefined || g.flight === undefined || g.flight === slot.flight);
// A gate, fence, balcony, deck, fire escape, well, opening or steel member is
// measured by its own dimensions first; the shared stair stages follow.
const OWN_SHAPE = /^(gate|fence|bal|deck|fire|well|op|struct|canopy|wc|sp)_/;
// The stair's geometry is one walk: landings where they are reached, the
// overall numbers right after the last step (not later with the posts).
const WALK_WITH_STEPS = new Set(['spiral_treads', 'spiral_riser', 'diameter', 'spiral_rotation', 'spiral_tread_angle', 'landing_entry_rise', 'landing_length', 'landing_depth', 'landing_diag', 'flight_ctrl_rise', 'flight_ctrl_run', 'floor_to_floor', 'total_run', 'rake']);
const stageRank = (key: string) => (OWN_SHAPE.test(key) ? -1 : WALK_WITH_STEPS.has(key) ? STAGE_ORDER.indexOf('steps') : STAGE_ORDER.indexOf(legacyStageForGap(key)));

/** One slot of the sheet by id, whether or not it is listed now. */
export function slotById(data: MeasureData, shape: MeasureShape, id: string): NextSlot | undefined {
  return slotsFor(data, shape).find(s => s.id === id);
}

/** Build the queue from the sheet and its open requirements (fab gaps). */
export function measurementQueue(data: MeasureData, shape: MeasureShape, gaps: readonly Gap[]): MeasureQueue {
  const all = slotsFor(data, shape);
  const listed = all.filter(s => has(s.get(data)) || s.ask?.(data) || gaps.some(g => matches(s, g)));
  // Stable sort: measuring stage first, then the walk order the slots were built in.
  const slots = listed.map((s, i) => ({ s, i })).sort((a, b) => stageRank(a.s.gap) - stageRank(b.s.gap) || a.i - b.i).map(x => x.s);
  const openSlots = slots.filter(s => !has(s.get(data)));
  // A requirement is answered by its numbers only while one of them is still
  // empty; otherwise (a reading row deleted, say) it stays on the list itself.
  const covered = (g: Gap) => openSlots.some(s => matches(s, g));
  const rest = gaps.filter(g => !covered(g)).map((g, i) => ({ g, i })).sort((a, b) => stageRank(a.g.key) - stageRank(b.g.key) || a.i - b.i).map(x => x.g);
  // What each post, bracket, hinge or bearing fastens into: not a number, so
  // an "Open" item after the measurements, never counted as one.
  const mounting = blankMountGaps(data, shape).filter(g => !gaps.some(x => x.key === g.key && x.detail === g.detail));
  const open: NextItem[] = [
    ...openSlots.map(slot => ({ type: 'slot' as const, id: slot.id, slot })),
    ...rest.map(gap => ({ type: 'gap' as const, id: gapId(gap), gap })),
    ...mounting.map(gap => ({ type: 'gap' as const, id: gapId(gap), gap })),
  ];
  return { slots, open, done: slots.length - openSlots.length, total: slots.length };
}

/**
 * Where "Next ›" goes from `currentId`: the first open item after it in
 * measuring order, wrapping round, never the current one again while
 * anything else is open. An unknown or finished current id starts from the top.
 */
export function nextOpenItem(queue: MeasureQueue, currentId: string | null, direction: 1 | -1 = 1): NextItem | null {
  const { open, slots } = queue;
  if (!open.length) return null;
  if (!currentId) return open[0];
  const order = [...slots.map(s => s.id), ...open.filter(i => i.type === 'gap').map(i => i.id)];
  const at = order.indexOf(currentId);
  if (at < 0) return open[0];
  const openIds = new Set(open.map(i => i.id));
  for (let step = 1; step <= order.length; step++) {
    const id = order[(at + direction * step + order.length * step) % order.length];
    if (id !== currentId && openIds.has(id)) return open.find(i => i.id === id)!;
  }
  return openIds.has(currentId) ? open.find(i => i.id === currentId)! : open[0];
}

/** The item on screen: the remembered one while it still exists, else the first open one. */
export function currentItem(queue: MeasureQueue, currentId: string | null): NextItem | null {
  if (currentId) {
    const slot = queue.slots.find(s => s.id === currentId);
    if (slot) return { type: 'slot', id: slot.id, slot };
    const gap = queue.open.find(i => i.id === currentId);
    if (gap) return gap;
  }
  return queue.open[0] ?? null;
}

/** The part of a step a slot measures, when it is one: its riser or its tread. */
export function stepPart(slot: Pick<NextSlot, 'id' | 'segIdx' | 'stepIdx'>): { segIdx: number; stepIdx: number; key: 'rise' | 'run' } | null {
  if (slot.segIdx === undefined || slot.stepIdx === undefined) return null;
  const key = slot.id.endsWith('.rise') ? 'rise' : slot.id.endsWith('.run') ? 'run' : null;
  return key ? { segIdx: slot.segIdx, stepIdx: slot.stepIdx, key } : null;
}

/** A rise or tread worth copying: a real, positive measurement. */
export function copyableStepValue(value: string | undefined | null): boolean {
  const v = (value || '').trim(), n = v ? parseMeas(v) : null;
  return n !== null && Number.isFinite(n) && n > 0;
}

/**
 * The other steps of the same flight a rise or tread would be copied onto:
 * the empty ones, or (overwrite) every one that does not already read the same.
 * A winder's tread is its own shape, so a straight tread depth never lands on it.
 */
export function stepCopyTargets(data: MeasureData, segIdx: number, stepIdx: number, key: 'rise' | 'run', overwrite = false): number[] {
  const seg = data.segments[segIdx];
  if (!seg || seg.kind !== 'flight') return [];
  const from = seg.steps[stepIdx];
  if (!from || !copyableStepValue(from[key])) return [];
  const value = from[key].trim();
  return seg.steps.flatMap((st, k) => {
    if (k === stepIdx || (key === 'run' && (st.winder || from.winder))) return [];
    const now = (st[key] || '').trim();
    if (overwrite ? now === value : now !== '') return [];
    return [k];
  });
}

/** Copy one step's rise or tread onto the rest of its flight. Returns how many steps changed. */
export function copyStepValue(data: MeasureData, segIdx: number, stepIdx: number, key: 'rise' | 'run', overwrite = false): number {
  const targets = stepCopyTargets(data, segIdx, stepIdx, key, overwrite);
  const seg = data.segments[segIdx];
  if (!targets.length || seg?.kind !== 'flight') return 0;
  const value = seg.steps[stepIdx][key];
  for (const k of targets) seg.steps[k][key] = value;
  return targets.length;
}

/**
 * Copy to all: the other listed slots that repeat this one's number (same
 * copy key) — the empty ones, or (overwrite) every one not already reading the
 * same. Only slots this sheet lists, so a level without a stair never receives
 * a stair number.
 */
export function slotCopyTargets(slots: readonly NextSlot[], data: MeasureData, slot: NextSlot, overwrite = false): NextSlot[] {
  if (!slot.copyKey) return [];
  const v = slot.get(data).trim();
  if (!copyableStepValue(v)) return [];
  return slots.filter(s => {
    if (s.id === slot.id || s.copyKey !== slot.copyKey) return false;
    const now = s.get(data).trim();
    return overwrite ? now !== v : now === '';
  });
}

/** Copy a slot's number onto its siblings. Returns how many changed. */
export function copySlotValue(slots: readonly NextSlot[], data: MeasureData, slot: NextSlot, overwrite = false): number {
  const targets = slotCopyTargets(slots, data, slot, overwrite), v = slot.get(data);
  for (const t of targets) t.put(data, v);
  return targets.length;
}
