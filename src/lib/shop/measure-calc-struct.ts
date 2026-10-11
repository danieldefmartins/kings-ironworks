import type { MeasureData, MeasureShape } from './measure';
import { calcText, DEG_TOL, LEN_TOL, type CalcAdapter, type CalcSlot, type CalcSource } from './measure-calc';
import type { CopyAdapter } from './measure-copy';
import { sheetReadiness } from './measure-checks';
import { measurementQueue, slotById, slotCopyTargets } from './measure-next';
import { structuralSlotCalc } from './measure-dims-structural';
import { fireSlotCalc } from './measure-dims-fire';
import { spiralSlotCalc } from './measure-dims-spiral';
import { shopPieceSlotCalc } from './measure-dims-shop-piece';
import { runSlotCalc } from './measure-next-runs';

/**
 * Calculated · Approve · Modify and "Same for all …" for structural steel,
 * fire escapes, spirals and shop pieces, on the shared registries
 * (measure-calc-registry.ts, measure-copy.ts).
 *
 * Each shape's own file answers `(slotId, data) => { calc, note? }`:
 *   structural   cut length (with weight) · frame diagonal B from A
 *   fire escape  each level's stair angle from its rise over its run
 *   spiral       riser = floor to floor ÷ treads · tread angle = rotation ÷ treads
 *   shop piece   fabricate-to width / height / depth = tightest reading − clearance
 * The value goes through the slot's own get / put; how it was set is kept in
 * `data.calcSources[slotId]`, so no shape needs a source field of its own.
 *
 * Copy: slots that share a `copyKey` (measure-next.ts) repeat one number —
 * every floor of a fire escape (never a height above grade, never a stair onto
 * the ladder level), every column, every piece of the same type.
 */
export interface CalcResult { calc: number | null; note?: string; verdict?: CalcSlot['verdict'] }

const SHAPE_OF: [RegExp, MeasureShape, (id: string, d: MeasureData) => CalcResult | null][] = [
  [/^st\./, 'structural', structuralSlotCalc],
  [/^fire\./, 'fire_escape', fireSlotCalc],
  [/^spiral\./, 'spiral', spiralSlotCalc],
  [/^sp\./, 'shop_piece', shopPieceSlotCalc],
  [/^deck\./, 'deck', runSlotCalc],
  [/^fence\./, 'fence', () => null],
  [/^wc\./, 'wall_cap', () => null],
  [/^s\d+\.ramp/, 'ramp', runSlotCalc],
];
const shapeFor = (id: string) => SHAPE_OF.find(([re]) => re.test(id));

export const structCalc: CalcAdapter = (slotId, data) => {
  const hit = shapeFor(slotId);
  const r = hit?.[2](slotId, data);
  if (!hit || !r) return null;
  const slot = slotById(data, hit[1], slotId);
  if (!slot || slot.unit === 'count') return null;
  const unit = slot.unit, fn = hit[2];
  const mark = (d: MeasureData, src: CalcSource) => {
    const m = { ...(d.calcSources || {}) };
    if (src) m[slotId] = src; else delete m[slotId];
    d.calcSources = m;
  };
  return {
    calc: r.calc, unit, note: r.note, verdict: r.verdict, tol: unit === 'deg' ? DEG_TOL : LEN_TOL, source: data.calcSources?.[slotId] ?? '',
    approve: (d) => {
      const now = fn(slotId, d)?.calc ?? null, s = slotById(d, hit[1], slotId);
      if (now === null || !s) return;
      s.put(d, calcText(now, unit));
      mark(d, 'calculated-approved');
    },
    read: (d, v) => {
      const s = slotById(d, hit[1], slotId);
      if (!s) return;
      s.put(d, v);
      mark(d, v.trim() ? 'measured' : '');
    },
  };
};

const NOUN_KEYS = {
  levels: ['nx_copyAll_levels', 'nx_copied_levels', 'nx_copied1_levels'],
  columns: ['nx_copyAll_columns', 'nx_copied_columns', 'nx_copied1_columns'],
  pieces: ['nx_copyAll_pieces', 'nx_copied_pieces', 'nx_copied1_pieces'],
  sides: ['nx_copyAll_sides', 'nx_copied_sides', 'nx_copied1_sides'],
  segments: ['nx_copyAll_segments', 'nx_copied_segments', 'nx_copied1_segments'],
  posts: ['nx_copyAll_posts', 'nx_copied_posts', 'nx_copied1_posts'],
} as const;

export const structCopy: CopyAdapter = (slotId, data) => {
  const hit = shapeFor(slotId);
  if (!hit) return null;
  const shape = hit[1], slot = slotById(data, shape, slotId);
  if (!slot?.copyKey || !slot.copyNoun) return null;
  // Only what this sheet lists: a level without a stair never takes a stair number.
  const slots = measurementQueue(data, shape, sheetReadiness(data, shape).fabGaps).slots;
  if (slots.filter(s => s.copyKey === slot.copyKey).length < 2) return null;
  const [labelKey, copiedKey, copied1Key] = NOUN_KEYS[slot.copyNoun];
  return {
    labelKey, copiedKey, copied1Key,
    targets: (overwrite) => {
      const value = slot.get(data);
      return slotCopyTargets(slots, data, slot, overwrite).map(t => ({
        thing: t.id,
        writes: [{ w: { get: (d: MeasureData) => slotById(d, shape, t.id)?.get(d) ?? '', set: (d: MeasureData, v: string) => slotById(d, shape, t.id)?.put(d, v) }, value }],
      }));
    },
  };
};
