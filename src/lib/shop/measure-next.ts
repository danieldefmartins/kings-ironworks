import type { MeasureData, MeasureShape } from './measure';
import type { Gap } from './measure-checks';
import { legacyStageForGap, type LegacyMeasureStage } from './measure-workspace';

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
  let stepNo = 0;
  flightList.forEach(({ s, i }, fi) => {
    if (s.kind !== 'flight') return;
    s.steps.forEach((st, k) => {
      stepNo += 1;
      const step = (d: MeasureData) => {
        const sg = d.segments[i];
        return sg && sg.kind === 'flight' ? (sg.steps[k] as unknown as Bag) : undefined;
      };
      const at = { flight: fi, segIdx: i, stepIdx: k, stepNumber: stepNo };
      field(`s${i}.${k}.rise`, 'steps', 'rise', step, 'rise', at);
      field(`s${i}.${k}.run`, 'steps', 'run', step, 'run', at);
      if (st.winder) {
        field(`s${i}.${k}.runIn`, 'winder', 'winderRunIn', step, 'runIn', at);
        field(`s${i}.${k}.runOut`, 'winder', 'winderRunOut', step, 'runOut', at);
        field(`s${i}.${k}.turn`, 'winder', 'winderTurn', step, 'turnDeg', { ...at, unit: 'deg' });
      }
    });
    const at = { flight: fi, segIdx: i };
    field(`s${i}.width`, 'flight_width', 'width', seg(i), 'width', at);
    field(`s${i}.rake`, 'flight_rake', 'flightRake', seg(i), 'rake', at);
    field(`s${i}.angle`, 'flight_angle', 'stairAngle', seg(i), 'angleDeg', { ...at, unit: 'deg' });
  });
  data.segments.forEach((sg, si) => {
    if (sg.kind === 'platform') {
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
    const sp = (d: MeasureData) => d.spiral as unknown as Bag | null;
    field('spiral.f2f', 'floor_to_floor', 'floorToFloor', sp, 'floorToFloor');
    field('spiral.dia', 'diameter', 'diameter', sp, 'diameter');
  } else if (flightList.length) {
    const ov = (d: MeasureData) => d.overall as unknown as Bag;
    field('overall.f2f', 'floor_to_floor', 'floorToFloor', ov, 'floorToFloor');
    field('overall.totalRun', 'total_run', 'totalRun', ov, 'totalRun');
    field('overall.rake', 'rake', 'rakeLength', ov, 'rakeLength');
  }
  (data.joints || []).forEach((j, n) => {
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
  if (shape === 'gate' && data.gate) table('gate', d => d.gate as unknown as Bag, [
    ['gate_width_top', 'gateWidthTop', 'widthTop'], ['gate_width_bottom', 'gateWidthBottom', 'widthBottom'],
    ['gate_height_hinge', 'gateHeightHinge', 'heightHinge'], ['gate_ground_clearance', 'gateGroundClearance', 'groundClearance'],
    ['gate_grade_rise', 'gateGradeRise', 'gradeRise'],
  ]);
  if (shape === 'fence' && data.fence) {
    table('fence', d => d.fence as unknown as Bag, [
      ['fence_total_run', 'fenceTotalRun', 'totalRun'], ['fence_height', 'fenceHeight', 'height'],
      ['fence_post_spacing', 'fencePostSpacing', 'postSpacing'], ['fence_footing', 'fenceFooting', 'footingDepth'],
    ]);
    data.fence.segments.forEach((sg, n) => {
      const tag = sg.label || `#${n + 1}`;
      field(`fence.seg${n}`, 'fence_seg_length', 'fenceSegLength', d => d.fence?.segments[n] as unknown as Bag | undefined, 'length', { detail: tag, tag });
    });
  }
  if (shape === 'balcony' && data.balcony) table('bal', d => d.balcony as unknown as Bag, [
    ['bal_edge_length', 'balEdgeLength', 'edgeLength'], ['bal_guard_height_f', 'balGuardHeight', 'guardHeight'],
    ['bal_finished_floor', 'balFinishedFloor', 'finishedFloor'], ['bal_slab_thickness', 'balSlabThickness', 'slabThickness'],
    ['bal_embedment_f', 'balEmbedment', 'anchorEmbedment'], ['bal_edge_distance_f', 'balEdgeDistance', 'edgeDistance'],
    ['bal_door_opening', 'balDoorOpening', 'doorOpening'],
  ]);
  if (shape === 'deck' && data.deck) {
    table('deck', d => d.deck as unknown as Bag, [
      ['deck_total_perimeter', 'deckTotalPerimeter', 'totalPerimeter'], ['deck_guard_height_f', 'deckGuardHeight', 'guardHeight'],
      ['deck_post_spacing_f', 'deckPostSpacing', 'postSpacing'],
    ]);
    data.deck.sides.forEach((sd, n) => {
      const tag = sd.label || `#${n + 1}`, side = (d: MeasureData) => d.deck?.sides[n] as unknown as Bag | undefined;
      table(`deck.side${n}`, side, [
        ['deck_side_length', 'deckSideLength', 'length'], ['deck_side_height', 'deckSideHeight', 'heightAboveGrade'],
        ['deck_opening_width', 'deckSideOpeningWidth', 'openingWidth'],
      ], { detail: tag, tag });
    });
  }
  if (shape === 'fire_escape' && data.fire) {
    table('fire', d => d.fire as unknown as Bag, [['fire_total_height', 'fireTotalHeight', 'totalHeight']]);
    data.fire.levels.forEach((l, n) => {
      const tag = l.label || `#${n + 1}`, lv = (d: MeasureData) => d.fire?.levels[n] as unknown as Bag | undefined;
      table(`fire.l${n}`, lv, [
        ['fire_plat_length', 'firePlatLength', 'platLength'], ['fire_plat_width', 'firePlatWidth', 'platWidth'],
        ['fire_height_grade', 'fireHeightGrade', 'heightAboveGrade'], ['fire_guard_height', 'fireGuardHeight', 'guardHeight'],
        ['fire_picket_spacing', 'firePicketSpacing', 'picketSpacing'], ['fire_anchor_count', 'fireAnchorCount', 'anchorCount', 'count'],
        ['fire_stair_risers', 'fireStairRisers', 'stairRisers', 'count'], ['fire_stair_rise', 'fireStairRise', 'stairRise'],
        ['fire_stair_run', 'fireStairRun', 'stairRun'], ['fire_stair_width', 'fireStairWidth', 'stairWidth'],
        ['fire_floor_to_floor', 'fireFloorToFloor', 'floorToFloor'],
      ], { detail: tag, tag });
    });
    table('fire.ladder', d => d.fire?.ladder as unknown as Bag | undefined, [
      ['fire_ladder_length', 'fireLadderLength', 'length'], ['fire_ladder_width', 'fireLadderWidth', 'width'],
      ['fire_ladder_rung', 'fireLadderRung', 'rungSpacing'],
    ]);
  }
  if (shape === 'window_well' && data.well) table('well', d => d.well as unknown as Bag, [
    ['well_length', 'wellLengthAtHouse', 'lengthAtHouse'], ['well_projection', 'wellProjection', 'projection'],
    ['well_depth', 'wellDepth', 'depth'], ['well_thickness', 'wellWallThickness', 'wallThickness'],
    ['well_guard_height', 'wellGuardHeight', 'guardHeight'], ['well_post_to_wall', 'wellPostToWall', 'postToWall'],
    ['well_gate_width', 'wellGateWidth', 'gateWidth'], ['well_ladder_width', 'wellLadderWidth', 'ladderWidth'],
    ['well_ladder_rungs', 'wellLadderRungs', 'ladderRungs', 'count'], ['well_ladder_spacing', 'wellLadderSpacing', 'ladderSpacing'],
    ['well_ladder_standoff', 'wellLadderStandoff', 'ladderStandoff'],
  ]);
  return out;
}

const gapId = (g: Gap) => `gap:${g.key}:${g.detail ?? ''}:${g.flight ?? ''}`;
const matches = (slot: NextSlot, g: Gap) =>
  g.key === slot.gap && (slot.detail === undefined || g.detail === slot.detail) && (slot.flight === undefined || g.flight === undefined || g.flight === slot.flight);
const stageRank = (key: string) => STAGE_ORDER.indexOf(legacyStageForGap(key));

/** Build the queue from the sheet and its open requirements (fab gaps). */
export function measurementQueue(data: MeasureData, shape: MeasureShape, gaps: readonly Gap[]): MeasureQueue {
  const all = slotsFor(data, shape);
  const listed = all.filter(s => has(s.get(data)) || gaps.some(g => matches(s, g)));
  // Stable sort: measuring stage first, then the walk order the slots were built in.
  const slots = listed.map((s, i) => ({ s, i })).sort((a, b) => stageRank(a.s.gap) - stageRank(b.s.gap) || a.i - b.i).map(x => x.s);
  const openSlots = slots.filter(s => !has(s.get(data)));
  const covered = (g: Gap) => slots.some(s => matches(s, g));
  const rest = gaps.filter(g => !covered(g)).map((g, i) => ({ g, i })).sort((a, b) => stageRank(a.g.key) - stageRank(b.g.key) || a.i - b.i).map(x => x.g);
  const open: NextItem[] = [
    ...openSlots.map(slot => ({ type: 'slot' as const, id: slot.id, slot })),
    ...rest.map(gap => ({ type: 'gap' as const, id: gapId(gap), gap })),
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
