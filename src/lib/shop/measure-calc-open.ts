import type { MeasureData } from './measure';
import { fieldCalc, LEN_TOL, type CalcAdapter } from './measure-calc';
import { gateLeafCalc, signedOf } from './measure-dims-gate';
import { openingFabSize } from './measure-opening';
import { canopyFallCalc } from './measure-canopy';
import { codeLimits, effectiveCodeSettings, effectiveOccupancy } from './measure-code';

/**
 * Calculated numbers on the gate, opening, window-well and canopy sheets,
 * offered on the Next card to approve or modify:
 *
 *   gate.leafA / gate.leafB   leaf widths from the opening and the gaps;
 *                             double: equal split until leaf A is set, then
 *                             leaf B takes the rest (an unequal split)
 *   op.<id>.fabW / fabH       the "fabricate to" size (openingFabSize)
 *   well.guardHeight          code guard height, less what the wall already
 *                             stands above grade (more when it sits below)
 *   cn.fall                   the projection at the minimum pitch
 */

/** Guard height above the top of the well wall that reaches the code height above grade. */
export function wellGuardCalc(data: MeasureData): number | null {
  const w = data.well;
  if (!w || !w.deliverables.includes('guard')) return null;
  const rise = signedOf(w.topToGrade);
  if (rise === null) return null;
  const s = effectiveCodeSettings(data), lim = codeLimits(s, effectiveOccupancy(data, s));
  const h = lim.guardHeight - rise;
  return h >= 1 ? h : null;
}

export const gateCalc: CalcAdapter = (id, data) => {
  const g = data.gate;
  if (!g || (id !== 'gate.leafA' && id !== 'gate.leafB')) return null;
  const leaf = gateLeafCalc(g), at = (d: MeasureData) => d.gate;
  if (id === 'gate.leafA') {
    // On a double gate leaf A is a choice (equal or not): no cross-check colour.
    return fieldCalc(data, at, 'leafA', 'leafASource', leaf.a, 'len', leaf.double ? null : LEN_TOL);
  }
  return leaf.double ? fieldCalc(data, at, 'leafB', 'leafBSource', leaf.b) : null;
};

export const openingCalc: CalcAdapter = (id, data) => {
  const m = id.match(/^op\.(.+)\.(fabW|fabH)$/);
  const o = data.opening;
  if (!m || !o) return null;
  const u = o.units.find((x) => x.id === m[1]);
  if (!u) return null;
  const fab = openingFabSize(o, u), key = m[2] as 'fabW' | 'fabH';
  const at = (d: MeasureData) => d.opening?.units.find((x) => x.id === m[1]);
  return fieldCalc(data, at, key, `${key}Source`, fab ? (key === 'fabW' ? fab.width : fab.height) : null);
};

export const wellCalc: CalcAdapter = (id, data) =>
  // Higher than the code height is never wrong: no cross-check colour.
  id === 'well.guardHeight' && data.well ? fieldCalc(data, (d) => d.well, 'guardHeight', 'guardHeightSource', wellGuardCalc(data), 'len', null) : null;

export const canopyCalc: CalcAdapter = (id, data) =>
  // More fall than the minimum is a choice, not an error: no cross-check colour.
  id === 'cn.fall' && data.canopy ? fieldCalc(data, (d) => d.canopy, 'fall', 'fallSource', canopyFallCalc(data.canopy), 'len', null) : null;
