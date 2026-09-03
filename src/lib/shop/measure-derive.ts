// Numbers the sheet already knows.
//
// A measure sheet asks for a lot of totals that are, arithmetically, the sum
// of things it has already been told: a flight's total rise is its risers
// added up, a fence's run is its bays added up, a deck's perimeter is its
// sides. Asking a measurer to re-enter those on a tablet, in a stairwell, is
// how a sheet ends up with a total that disagrees with its own parts.
//
// So they are DERIVED, in one place, and the field shows the derived value.
//
// Two rules make that safe:
//
//   1. Nothing here is written into the sheet. A derived value is computed
//      when it is shown, so it can never go stale behind an edited step, and
//      the stored string stays empty until a human types something. Every gap
//      check and every cross-check still reads the stored string, so a sheet
//      can never pass a requirement — or claim a verification — on the
//      strength of a number the app worked out for itself.
//   2. A derived value is labelled as derived, everywhere it appears.
//
// The second rule matters because several of these fields exist precisely to
// DISAGREE with the parts: an end-to-end tape on a fence run is what catches a
// bay entered as 8' when it is 6'. Showing the sum there is a convenience, and
// the sheet says so rather than reporting a check that nobody made.

import { parseMeas } from "./measure-parse";
import type {
  DeckData,
  FenceData,
  FlightSegment,
  MeasureData,
  PlatformSegment,
} from "./measure";

/** Inches → the string a measurer would have typed ('21 3/4', no unit mark). */
export function inchesToField(n: number): string {
  const sixteenths = Math.round(n * 16);
  const whole = Math.floor(sixteenths / 16);
  let num = sixteenths % 16;
  if (num === 0) return `${whole}`;
  let den = 16;
  while (num % 2 === 0) {
    num /= 2;
    den /= 2;
  }
  return `${whole ? `${whole} ` : ""}${num}/${den}`;
}

/** Sum a list of measurement strings; null if any of them is missing. */
function sumAll(vals: (string | undefined | null)[]): number | null {
  if (vals.length === 0) return null;
  let total = 0;
  for (const v of vals) {
    const n = parseMeas(v);
    if (n === null) return null;
    total += n;
  }
  return total;
}

export interface FlightTotals {
  /** Risers added up. */
  rise: number;
  /** Treads added up. */
  run: number;
  /** The pitch line those two imply, nose to nose. */
  rake: number;
}

/** What one flight's steps add up to — null until every step is measured. */
export function flightTotals(fl: FlightSegment): FlightTotals | null {
  if (fl.steps.length === 0) return null;
  const rise = sumAll(fl.steps.map((s) => s.rise));
  const run = sumAll(fl.steps.map((s) => s.run));
  if (rise === null || run === null) return null;
  return { rise, run, rake: Math.hypot(rise, run) };
}

export interface StairTotals {
  totalRise: number;
  /** Flights only — the going of the stair itself. */
  totalRun: number;
  /** Landings included: the floor space the whole assembly occupies. */
  totalRunWithLandings: number;
  rakeLength: number;
}

/** What the whole stair adds up to — null until every flight is measured. */
export function stairTotals(data: MeasureData): StairTotals | null {
  const flights = data.segments.filter((s) => s.kind === "flight") as FlightSegment[];
  if (flights.length === 0) return null;
  let rise = 0;
  let run = 0;
  for (const fl of flights) {
    const t = flightTotals(fl);
    if (!t) return null;
    rise += t.rise;
    run += t.run;
  }
  // Landings are part of the footprint but not of the pitch, so they are
  // carried separately rather than folded into the going.
  const plats = data.segments.filter((s) => s.kind === "platform") as PlatformSegment[];
  const platLen = sumAll(plats.map((p) => p.length));
  return {
    totalRise: rise,
    totalRun: run,
    totalRunWithLandings: platLen === null ? run : run + platLen,
    rakeLength: Math.hypot(rise, run),
  };
}

/** Fence bays added up. */
export function fenceRun(fence: FenceData | null | undefined): number | null {
  if (!fence || fence.segments.length === 0) return null;
  return sumAll(fence.segments.map((s) => s.length));
}

/** Railed deck sides added up. */
export function deckPerimeter(deck: DeckData | null | undefined): number | null {
  if (!deck || deck.sides.length === 0) return null;
  return sumAll(deck.sides.map((s) => s.length));
}

/**
 * What the field should show: what the measurer typed, or — while that is
 * blank — what the sheet works out, flagged as worked out.
 */
export interface Resolved {
  value: string;
  auto: boolean;
}
export function resolve(stored: string, calc: number | null): Resolved {
  if (stored.trim() !== "") return { value: stored, auto: false };
  return calc === null ? { value: "", auto: false } : { value: inchesToField(calc), auto: true };
}
