import type { MeasureData } from './measure';
import { formatIn, parseMeas } from './measure-parse';

/**
 * Calculated · Approve · Modify, for any number on any work type that the other
 * numbers already give (a gate's leaf widths, an opening's "fabricate to" size,
 * a canopy's fall, a well guard's height). The stair angles keep their own
 * helpers (measure-angle.ts); this is the same contract for lengths too.
 *
 *   calc     what the other numbers imply (null = nothing to approve yet)
 *   unit     'len' (inches, stored in the shop's notation) | 'deg'
 *   source   how the stored value was set
 *   approve  store the calculation, source 'calculated-approved'
 *   read     store a reading or a decision, source 'measured'
 *   tol      [green, yellow] bands for the cross-check; null = no check
 *            (a deliberate choice, like an unequal leaf split)
 *
 * A shape adds one adapter `(slotId, data) => CalcSlot | null` to
 * CALC_ADAPTERS in measure-calc-registry.ts.
 */
export type CalcSource = '' | 'calculated-approved' | 'measured';
export interface CalcSlot {
  calc: number | null;
  unit: 'len' | 'deg';
  source?: CalcSource;
  approve: (d: MeasureData) => void;
  read: (d: MeasureData, v: string) => void;
  tol?: [number, number] | null;
}
export type CalcAdapter = (slotId: string, data: MeasureData) => CalcSlot | null;

/** Length bands: within 1/8" agrees, within 1/2" worth a look, beyond that red. */
export const LEN_TOL: [number, number] = [0.125, 0.5];
export const DEG_TOL: [number, number] = [1, 2.5];

/** What gets stored when a calculation is approved: a finder's 0.1°, or inches to the 1/16". */
export function calcText(calc: number, unit: 'len' | 'deg'): string {
  if (unit === 'deg') return String(Math.round(calc * 10) / 10);
  return formatIn(Math.round(calc * 16) / 16);
}

/** Approved while the stored text is still exactly what the calculation gives; anything else is a reading. */
export function calcState(value: string, source: CalcSource | undefined, calc: number | null, unit: 'len' | 'deg'): 'empty' | 'approved' | 'measured' {
  if (!value.trim()) return 'empty';
  if (source === 'calculated-approved' && calc !== null && calcText(calc, unit) === value.trim()) return 'approved';
  return 'measured';
}

export type CalcLevel = 'green' | 'yellow' | 'red';
/** A reading held against the calculation. */
export function calcCheck(calc: number | null, measured: number | null, tol: [number, number] | null | undefined, unit: 'len' | 'deg' = 'len'): { level: CalcLevel; delta: number } | null {
  if (calc === null || measured === null || !tol) return null;
  const raw = (unit === 'deg' ? Math.abs(measured) : measured) - calc;
  const delta = unit === 'deg' ? Math.round(raw * 10) / 10 : Math.round(raw * 16) / 16;
  const off = Math.abs(delta);
  return { level: off <= tol[0] + 1e-9 ? 'green' : off <= tol[1] + 1e-9 ? 'yellow' : 'red', delta };
}

type Bag = Record<string, unknown>;
/**
 * A CalcSlot over one string field and its source field on an object found
 * fresh in each draft (`at(d)`), so approve / read work on the editor's copy.
 */
export function fieldCalc(
  data: MeasureData, at: (d: MeasureData) => object | null | undefined, key: string, sourceKey: string,
  calc: number | null, unit: 'len' | 'deg' = 'len', tol: [number, number] | null = unit === 'deg' ? DEG_TOL : LEN_TOL,
): CalcSlot | null {
  const o = at(data) as Bag | null | undefined;
  if (!o) return null;
  return {
    calc, unit, tol, source: (o[sourceKey] as CalcSource | undefined) ?? '',
    approve: (d) => {
      const x = at(d) as Bag | null | undefined;
      if (!x || calc === null) return;
      x[key] = calcText(calc, unit);
      x[sourceKey] = 'calculated-approved';
    },
    read: (d, v) => {
      const x = at(d) as Bag | null | undefined;
      if (!x) return;
      x[key] = v;
      x[sourceKey] = v.trim() ? 'measured' : '';
    },
  };
}

/** A positive measurement or null. */
export function lenOf(s: string | undefined | null): number | null {
  const n = parseMeas(s ?? '');
  return n !== null && Number.isFinite(n) && n > 0 ? n : null;
}
