// Next-card behaviours for the railed-run work types, on the shared slot
// machinery (measure-calc-struct.ts: calculation by slot id, source kept in
// data.calcSources; copy between slots sharing a copyKey):
//   - runSlotCalc: a value the other numbers already give — a deck corner
//     (closure or square), a ramp's slope with its 1:12 verdict;
//   - tagRunCopies: which numbers repeat ("Same for all sides / segments /
//     posts"): every deck side's height above grade and opening width, a
//     fence of equal segments, every wall-cap post's cap width and core edges.
import type { MeasureData } from './measure';
import type { NextSlot } from './measure-next';
import { deckTurnCalc, rampAngleCalc, rampRatio } from './measure-run-calc';

export interface RunCalcResult {
  calc: number | null;
  verdict?: { key: string; vars: Record<string, string | number>; level: 'green' | 'yellow' | 'red' };
}

export function runSlotCalc(slotId: string, data: MeasureData): RunCalcResult | null {
  let m = slotId.match(/^deck\.side(\d+)\.turnDeg$/);
  if (m) return data.deck?.sides[Number(m[1])] ? { calc: deckTurnCalc(data, Number(m[1])) } : null;
  m = slotId.match(/^s(\d+)\.rampAngle$/);
  if (m) {
    const i = Number(m[1]);
    if (data.segments[i]?.kind !== 'ramp') return null;
    const r = rampRatio(data, i);
    return {
      calc: rampAngleCalc(data, i),
      verdict: r ? { key: r.ok ? 'nx_ramp_ok' : 'nx_ramp_steep', vars: { r: Math.round(r.ratio * 10) / 10 }, level: r.level } : undefined,
    };
  }
  return null;
}

/** Mark the slots that repeat one number across sides, segments or posts. */
export function tagRunCopies(slots: NextSlot[]) {
  for (const s of slots) {
    let m = s.id.match(/^deck\.side\d+\.(heightAboveGrade|openingWidth)$/);
    if (m) { s.copyKey = `deck:${m[1]}`; s.copyNoun = 'sides'; continue; }
    if (/^fence\.seg\d+$/.test(s.id)) { s.copyKey = 'fence:seg'; s.copyNoun = 'segments'; continue; }
    m = s.id.match(/^wc\.[^.]+\.(capWidth|edgeHigh|edgeLow)$/);
    if (m) { s.copyKey = `wc:${m[1]}`; s.copyNoun = 'posts'; }
  }
}
