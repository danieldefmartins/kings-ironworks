import type { MeasureData } from './measure';
import type { CalcAdapter, CalcSlot } from './measure-calc';
import { canopyCalc, gateCalc, openingCalc, wellCalc } from './measure-calc-open';

/**
 * Every work type's calculated numbers (Calculated · Approve · Modify on the
 * Next card). One line per adapter; the first that answers a slot id wins.
 */
export const CALC_ADAPTERS: CalcAdapter[] = [
  gateCalc,
  openingCalc,
  wellCalc,
  canopyCalc,
];

/** The calculation behind a Next-card slot, if any work type offers one. */
export function slotCalc(slotId: string, data: MeasureData): CalcSlot | null {
  for (const a of CALC_ADAPTERS) {
    const c = a(slotId, data);
    if (c) return c;
  }
  return null;
}
