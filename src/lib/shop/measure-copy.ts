import type { MeasureData } from './measure';
import { copyableStepValue } from './measure-next';

/**
 * "Same for all …" beyond the stair steps: a number (or a whole set of
 * numbers) that repeats across identical things — every opening of a sheet,
 * every canopy post. Copies only into empty fields by default; `overwrite`
 * replaces every one that reads differently. The Next card shows the button,
 * the count, the Only empty / Replace all choice and the Undo toast.
 *
 * A shape adds one adapter `(slotId, data) => CopyPlan | null` to COPY_ADAPTERS.
 */
export interface CopyWrite { get: (d: MeasureData) => string; set: (d: MeasureData, v: string) => void }
export interface CopyPlan {
  /** nxText keys: the button, and the toast for 1 / {n} things. */
  labelKey: string;
  copiedKey: string;
  copied1Key: string;
  /** The fields to write, per target thing, with the value each takes. */
  targets: (overwrite: boolean) => { thing: string; writes: { w: CopyWrite; value: string }[] }[];
}
export type CopyAdapter = (slotId: string, data: MeasureData) => CopyPlan | null;

type Bag = Record<string, string>;
const field = (find: (d: MeasureData) => Bag | undefined, key: string): CopyWrite => ({
  get: (d) => find(d)?.[key] ?? '',
  set: (d, v) => { const o = find(d); if (o) o[key] = v; },
});

const OPENING_SIZE = ['wTop', 'wMid', 'wBot', 'hLeft', 'hCenter', 'hRight', 'diagA', 'diagB', 'reveal'] as const;

/** An opening's size, onto the other openings: every number this one holds. */
export const openingCopy: CopyAdapter = (id, data) => {
  const m = id.match(/^op\.(.+)\.(wTop|wMid|wBot|hLeft|hCenter|hRight|diagA|diagB|reveal)$/);
  const o = data.opening;
  if (!m || !o || o.units.length < 2) return null;
  const from = o.units.find((u) => u.id === m[1]);
  if (!from) return null;
  return {
    labelKey: 'nx_copyOpenings', copiedKey: 'nx_copiedOpenings', copied1Key: 'nx_copiedOpening1',
    targets: (overwrite) => o.units.filter((u) => u.id !== from.id).map((u) => ({
      thing: u.id,
      writes: OPENING_SIZE.filter((k) => copyableStepValue(from[k]))
        .filter((k) => (overwrite ? (u[k] || '').trim() !== from[k].trim() : !(u[k] || '').trim()))
        .map((k) => ({ w: field((d) => d.opening?.units.find((x) => x.id === u.id) as unknown as Bag | undefined, k), value: from[k] })),
    })).filter((t) => t.writes.length > 0),
  };
};

/** A canopy post's height onto the other posts. */
export const canopyPostCopy: CopyAdapter = (id, data) => {
  const m = id.match(/^cn\.post\.(.+)$/);
  const c = data.canopy;
  if (!m || !c || c.posts.length < 2) return null;
  const from = c.posts.find((p) => p.id === m[1]);
  if (!from || !copyableStepValue(from.height)) return null;
  return {
    labelKey: 'nx_copyPosts', copiedKey: 'nx_copiedPosts', copied1Key: 'nx_copiedPost1',
    targets: (overwrite) => c.posts.filter((p) => p.id !== from.id && (overwrite ? p.height.trim() !== from.height.trim() : !p.height.trim()))
      .map((p) => ({ thing: p.id, writes: [{ w: field((d) => d.canopy?.posts.find((x) => x.id === p.id) as unknown as Bag | undefined, 'height'), value: from.height }] })),
  };
};

/** One line per adapter. */
export const COPY_ADAPTERS: CopyAdapter[] = [
  openingCopy,
  canopyPostCopy,
];

export function slotCopy(slotId: string, data: MeasureData): CopyPlan | null {
  for (const a of COPY_ADAPTERS) {
    const p = a(slotId, data);
    if (p) return p;
  }
  return null;
}

/** Apply a copy; returns how many things changed and what to put back on Undo. */
export function applyCopy(data: MeasureData, plan: CopyPlan, overwrite: boolean): { n: number; before: { w: CopyWrite; old: string; value: string }[] } {
  const targets = plan.targets(overwrite), before: { w: CopyWrite; old: string; value: string }[] = [];
  for (const t of targets) for (const { w, value } of t.writes) { before.push({ w, old: w.get(data), value }); w.set(data, value); }
  return { n: targets.length, before };
}
