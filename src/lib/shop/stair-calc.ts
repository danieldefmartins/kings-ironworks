// Stair layout arithmetic, and the fraction maths a tape measure speaks.
//
// Daniel: "a calculator that can split for example 120 5/8 divided by 7 3/4
// steps? this way we know how many steps we will have."
//
// The division never lands on a whole number — 120 5/8 over 7 3/4 is 15.565
// risers, and you cannot build 0.565 of a riser. What a stair builder actually
// wants is the two whole numbers either side of it, the exact riser each one
// gives, and which of them is legal. That is what this returns.

export const MAX_RISER = 7.75; // IRC R311.7.5.1 — max riser height
export const MIN_TREAD = 10; // IRC R311.7.5.2 — min tread depth
export const MAX_VARIATION = 0.375; // 3/8" between the largest and smallest riser

/** "120 5/8", "10' 6", "7-3/4", 96.5 → inches. Null when unreadable. */
export function parseInches(raw: string): number | null {
  if (!raw) return null;
  let t = raw.trim().toLowerCase().replace(/[”"]/g, "").replace(/in\b|inch(es)?\b/g, "").trim();
  if (!t) return null;
  let total = 0;
  const feet = t.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet|foot)\s*/);
  if (feet) {
    total += parseFloat(feet[1]) * 12;
    t = t.slice(feet[0].length).trim();
  }
  if (!t) return total;
  t = t.replace(/-/g, " ").trim();
  // "5 3/4" or "3/4" or "5.75"
  const mixed = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  const frac = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (mixed) total += parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
  else if (frac) total += parseInt(frac[1], 10) / parseInt(frac[2], 10);
  else if (/^\d+(\.\d+)?$/.test(t)) total += parseFloat(t);
  else return null;
  return total;
}

/** 7.5391 → `7 9/16"`. Rounded to the nearest 1/16, the finest mark on a tape. */
export function toFraction(n: number, denom = 16): string {
  if (!Number.isFinite(n)) return "—";
  const neg = n < 0;
  const abs = Math.abs(n);
  let whole = Math.floor(abs);
  let num = Math.round((abs - whole) * denom);
  if (num === denom) {
    whole += 1;
    num = 0;
  }
  const sign = neg ? "-" : "";
  if (num === 0) return `${sign}${whole}"`;
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const g = gcd(num, denom);
  return `${sign}${whole ? `${whole} ` : ""}${num / g}/${denom / g}"`;
}

export interface StairOption {
  risers: number;
  treads: number;
  riserHeight: number;
  /** Exact, before rounding to the tape. */
  riserExact: number;
  totalRun: number | null;
  angleDeg: number | null;
  riserOk: boolean;
  treadOk: boolean;
  /** 2R + T, the rule of thumb for a comfortable stair (24–25"). */
  ruleOfThumb: number | null;
  ruleOk: boolean;
}

/**
 * Whole-riser options around `totalRise / targetRiser`.
 *
 * Returns the candidates either side of the raw division plus a spread, so a
 * builder can see the trade: fewer risers means each one taller.
 */
export function stairOptions(
  totalRise: number,
  targetRiser = MAX_RISER,
  treadDepth: number | null = null,
  spread = 2
): { raw: number; options: StairOption[] } {
  const raw = targetRiser > 0 ? totalRise / targetRiser : 0;
  const centre = Math.round(raw);
  const seen = new Set<number>();
  const options: StairOption[] = [];
  for (let n = centre - spread; n <= centre + spread; n++) {
    if (n < 1 || seen.has(n)) continue;
    seen.add(n);
    const exact = totalRise / n;
    const treads = n - 1;
    const totalRun = treadDepth ? treadDepth * treads : null;
    const angleDeg = totalRun && totalRun > 0 ? (Math.atan2(totalRise, totalRun) * 180) / Math.PI : null;
    const rule = treadDepth ? 2 * exact + treadDepth : null;
    options.push({
      risers: n,
      treads,
      riserExact: exact,
      riserHeight: Math.round(exact * 16) / 16,
      totalRun,
      angleDeg,
      riserOk: exact <= MAX_RISER + 1e-9,
      treadOk: treadDepth === null ? true : treadDepth >= MIN_TREAD - 1e-9,
      ruleOfThumb: rule,
      ruleOk: rule === null ? true : rule >= 24 && rule <= 25,
    });
  }
  return { raw, options: options.sort((a, b) => a.risers - b.risers) };
}
