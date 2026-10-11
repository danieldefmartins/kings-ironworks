// Wall-rail brackets — the post-suggestion engine (measure-post-suggest.ts)
// applied to the brackets of a wall-mounted handrail.
//
// A wall rail is one run along the sloped rail line, from its first nosing to
// its last. Two brackets are FIXED: one near each end (BRACKET_END_INSET in from
// the rail's ends, the way the shop hangs them so the end does not cantilever).
// The rest are spread evenly between them, no span longer than the bracket
// spacing allowed (48" by default). The − N + stepper changes the count and the
// engine re-spaces them; the approved plan is written as "5 @ 46-1/2"" in
// rail.brackets — the same text the field has always held and the 3D reads.
import type { MeasureData } from './measure';
import { formatIn } from './measure-parse';
import { layoutRun, type PostRun, type RunLayout } from './measure-post-suggest';

/** Most allowed between bracket centres along the rail, inches. */
export const DEFAULT_BRACKET_SPACING = 48;
/** End brackets sit this far in from the rail's ends (never past the middle). */
export const BRACKET_END_INSET = 6;

/** The one run a wall rail's brackets share, `runLen` inches along the slope. */
export function bracketRun(runLen: number): PostRun {
  const L = Math.max(0, runLen), inset = Math.min(BRACKET_END_INSET, L / 4);
  return {
    id: 'brackets',
    path: [{ x: 0, y: 0, z: 0 }, { x: L, y: 0, z: 0 }],
    anchors: [{ at: inset, role: 'bottom' }, { at: L - inset, role: 'top' }],
  };
}

/** The bracket layout for a run: the suggested count, or the one asked for. */
export function suggestBrackets(runLen: number, count?: number | null, maxSpacing = DEFAULT_BRACKET_SPACING): RunLayout {
  return layoutRun(bracketRun(runLen), { maxSpacing, minSpacing: 12 }, count);
}

/** The plan as the sheet writes it: "5 @ 46-1/2"". */
export function bracketText(layout: RunLayout): string {
  const each = layout.spanEach ?? (layout.spans.length ? layout.spans.reduce((a, b) => a + b, 0) / layout.spans.length : 0);
  return `${layout.count} @ ${formatIn(each)}`;
}

/** Count written on the sheet now ("5 @ 48"" → 5), or null. */
export function sheetBracketCount(data: MeasureData): number | null {
  const m = (data.rail.brackets || '').trim().match(/^\(?(\d+)\)?\s*(?:@|at|x|×)/i);
  return m ? Number(m[1]) : null;
}
