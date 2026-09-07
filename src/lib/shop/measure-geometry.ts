import type { MeasureData } from './measure';
import { parseMeas } from './measure-parse';

export interface MeasuredTread {
  segIdx: number;
  stepIdx: number | null;
  number: number | null;
  x: number;
  z: number;
  rise: number;
  run: number;
  width: number;
  riseLabel: string;
  runLabel: string;
  widthLabel: string;
  provisional: boolean;
}

const positive = (value: string) => {
  const n = parseMeas(value);
  return n !== null && Number.isFinite(n) && n > 0 ? n : null;
};

/** Field geometry in inches. Placeholder sizes are display-only, never saved.
 * Turned, branched and winder assemblies keep their existing schematic until
 * we can resolve their actual placement. A selected rectangular flight can
 * still be measured independently of the assembly around it. */
export function stairGeometry(data: MeasureData, focusSeg?: number) {
  const selected = data.segments.map((segment, index) => ({ segment, index }))
    .filter(({ index }) => focusSeg === undefined || index === focusSeg);
  if (!selected.length || selected.some(({ segment }) =>
    segment.kind === 'flight' ? segment.steps.some(s => s.winder) || (focusSeg === undefined && !!segment.branch)
      : segment.kind !== 'platform' || segment.turn !== 'none' || (!!segment.slope.trim() && parseMeas(segment.slope) !== 0)
  )) return null;
  const flight = selected.find(({ segment }) => segment.kind === 'flight')?.segment;
  const defaultWidth = flight?.kind === 'flight' ? positive(flight.width) : null;
  const treads: MeasuredTread[] = [];
  let x = 0, z = 0, number = 0;
  data.segments.forEach((segment, segIdx) => {
    if (focusSeg !== undefined && segIdx !== focusSeg) {
      if (segment.kind === 'flight') number += segment.steps.length;
      return;
    }
    if (segment.kind === 'flight') {
      segment.steps.forEach((step, stepIdx) => {
        const rise = positive(step.rise), run = positive(step.run), width = positive(segment.width);
        const r = rise ?? 7, d = run ?? 11;
        z += r;
        treads.push({ segIdx, stepIdx, number: ++number, x, z, rise: r, run: d, width: width ?? 36,
          riseLabel: rise === null ? '?' : step.rise, runLabel: run === null ? '?' : step.run,
          widthLabel: width === null ? '?' : segment.width, provisional: rise === null || run === null || width === null });
        x += d;
      });
    } else if (segment.kind === 'platform') {
      const run = positive(segment.length), width = positive(segment.depth);
      treads.push({ segIdx, stepIdx: null, number: null, x, z, rise: 0, run: run ?? 36,
        width: width ?? defaultWidth ?? 36, riseLabel: '', runLabel: run === null ? '?' : segment.length,
        widthLabel: width === null ? '?' : segment.depth, provisional: run === null || width === null });
      x += run ?? 36;
    }
  });
  if (!treads.length) return null;
  return { treads, run: x, rise: z, provisional: treads.some(t => t.provisional) };
}
