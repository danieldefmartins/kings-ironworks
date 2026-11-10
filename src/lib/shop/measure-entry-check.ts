// A second look at a step's number the moment it is typed, while the measurer
// is still standing on the stair. It never blocks and never changes a number:
// it says "look again" when a rise or tread does not sit with the others, or
// is not a size a step can be. The full cross-checks still run on the sheet.

import type { MeasureData } from "./measure";
import { formatIn, parseMeas } from "./measure-parse";
import { stepPart, type NextSlot } from "./measure-next";

/** Steps in one flight are built alike; more than this apart is worth a second look. */
export const STEP_OUTLIER = 0.375;
/** Outside these a number is almost certainly a typo (72 for 7 1/2, 1 for 11). */
export const STEP_RANGE = { rise: [3, 12], run: [6, 24] } as const;

export interface EntryWarning { kind: "range" | "outlier"; text: string }

const T = {
  range: {
    rise: { en: "Unusual riser — check the number", pt: "Espelho fora do comum — confira o número", es: "Contrahuella inusual — revise el número" },
    run: { en: "Unusual tread depth — check the number", pt: "Piso fora do comum — confira o número", es: "Huella inusual — revise el número" },
  },
  outlier: {
    en: (d: string, o: string) => `${d} off the other steps (${o})`,
    pt: (d: string, o: string) => `${d} diferente dos outros degraus (${o})`,
    es: (d: string, o: string) => `${d} distinto de los otros peldaños (${o})`,
  },
} as const;
type Lang = "en" | "pt" | "es";

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function entryWarning(slot: Pick<NextSlot, "id" | "segIdx" | "stepIdx">, data: MeasureData, value: string, lang: string): EntryWarning | null {
  const step = stepPart(slot);
  if (!step) return null;
  const n = parseMeas(value);
  if (n === null || !Number.isFinite(n) || n <= 0) return null;
  const l: Lang = lang === "pt" || lang === "es" ? lang : "en";
  const [lo, hi] = STEP_RANGE[step.key];
  if (n < lo || n > hi) return { kind: "range", text: T.range[step.key][l] };
  const seg = data.segments[step.segIdx];
  if (seg?.kind !== "flight") return null;
  const others = seg.steps
    .filter((s, i) => i !== step.stepIdx && !(step.key === "run" && s.winder))
    .map((s) => parseMeas(s[step.key]))
    .filter((v): v is number => v !== null && Number.isFinite(v) && v >= lo && v <= hi);
  if (!others.length) return null;
  const typical = median(others), diff = Math.abs(n - typical);
  if (diff <= STEP_OUTLIER + 1e-9) return null;
  return { kind: "outlier", text: T.outlier[l](formatIn(diff), formatIn(typical)) };
}
