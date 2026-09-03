"use client";

// One step, measured where the measurer is looking.
//
// The steps stage used to be a list of rows: fourteen treads, three fields
// each, a screen and a half of identical boxes with nothing to say which row
// is the tread you are standing next to. The drawing knows — so tapping a step
// in the drawing opens that step, and only that step, with the arrows to walk
// up the flight without going back to the list.
//
// The list is still there behind "Type the list instead", because a measurer
// with all fourteen risers already written on a scrap of paper wants to type,
// not tap.

import { mt } from "@/lib/shop/measure-i18n";
import type { FlightSegment, MeasureData } from "@/lib/shop/measure";
import { MInput } from "../fields";

export interface StepTarget {
  segIdx: number;
  stepIdx: number;
  /** Number shown to the measurer — sequential across flights, bottom first. */
  number: number;
  /** "Lower flight" and the like, when the stair has more than one. */
  flightLabel?: string;
  /** How many steps this flight has, for "3 of 6". */
  total: number;
}

export default function StepEditor({
  lang,
  data,
  target,
  onClose,
  onMove,
  set,
}: {
  lang: string;
  data: MeasureData;
  target: StepTarget | null;
  onClose: () => void;
  /** −1 / +1 within the flight; the caller decides where the ends are. */
  onMove: (delta: number) => void;
  set: (fn: (d: MeasureData) => void) => void;
}) {
  if (!target) return null;
  const seg = data.segments[target.segIdx];
  if (!seg || seg.kind !== "flight") return null;
  const st = seg.steps[target.stepIdx];
  if (!st) return null;

  const edit = (fn: (s: FlightSegment["steps"][number]) => void) =>
    set((d) => {
      const fl = d.segments[target.segIdx] as FlightSegment;
      fn(fl.steps[target.stepIdx]);
    });
  const below = target.stepIdx > 0 ? seg.steps[target.stepIdx - 1] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center print:hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-500 text-sm font-bold text-amber-300">
            {target.number}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold">
              {mt(lang, "step")} {target.number}
            </span>
            <span className="block text-[11px] text-neutral-500">
              {target.flightLabel ? `${target.flightLabel} · ` : ""}
              {target.stepIdx + 1} {mt(lang, "stepOf")} {target.total}
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={mt(lang, "closeLabel")}
            className="h-11 w-11 shrink-0 rounded-full border border-neutral-700 text-neutral-400"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MInput help="rise" label={mt(lang, "rise")} value={st.rise}
            onChange={(v) => edit((s) => void (s.rise = v))} />
          <MInput help="run" label={mt(lang, "run")} value={st.run}
            onChange={(v) => edit((s) => void (s.run = v))} />
          <MInput help="nosing" label={mt(lang, "nosing")} value={st.nosing}
            onChange={(v) => edit((s) => void (s.nosing = v))} />
        </div>

        {/* Most steps are the step below it. One tap beats three fields. */}
        {below && (
          <button
            type="button"
            onClick={() =>
              edit((s) => {
                s.rise = below.rise;
                s.run = below.run;
                s.nosing = below.nosing;
              })
            }
            className="mt-3 min-h-[48px] w-full rounded-xl border border-neutral-700 bg-neutral-950/40 text-sm font-bold text-neutral-300"
          >
            ⇊ {mt(lang, "sameAsPrevious")}
          </button>
        )}

        <button
          type="button"
          onClick={() => edit((s) => void (s.winder = !s.winder))}
          className={`mt-2 min-h-[48px] w-full rounded-xl border text-sm font-bold ${
            st.winder
              ? "border-amber-500 bg-amber-500/10 text-amber-300"
              : "border-neutral-700 bg-neutral-800 text-neutral-400"
          }`}
        >
          ◺ {mt(lang, "winderLbl")}
        </button>
        {st.winder && (
          <div className="mt-2 grid grid-cols-1 gap-2 rounded-xl border border-amber-900/50 bg-amber-500/5 p-2 sm:grid-cols-3">
            <MInput help="winderRunIn" label={mt(lang, "winderRunIn")} value={st.runIn || ""}
              onChange={(v) => edit((s) => void (s.runIn = v))} />
            <MInput help="winderRunOut" label={mt(lang, "winderRunOut")} value={st.runOut || ""}
              onChange={(v) => edit((s) => void (s.runOut = v))} />
            <MInput help="winderTurn" label={mt(lang, "winderTurn")} placeholder="°" value={st.turnDeg || ""}
              onChange={(v) => edit((s) => void (s.turnDeg = v))} />
          </div>
        )}

        {/* Walk the flight without closing: the whole point of measuring by
            tapping is not going back to a list between every step. */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={target.stepIdx === 0}
            onClick={() => onMove(-1)}
            className="min-h-[52px] flex-1 rounded-xl border border-neutral-700 bg-neutral-900 font-bold text-neutral-200 disabled:opacity-30"
          >
            ↓ {mt(lang, "prevStep")}
          </button>
          {target.stepIdx + 1 < target.total ? (
            <button
              type="button"
              onClick={() => onMove(1)}
              className="min-h-[52px] flex-1 rounded-xl border border-amber-500 bg-amber-500 font-bold text-black"
            >
              {mt(lang, "nextStepBtn")} ↑
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[52px] flex-1 rounded-xl border border-green-600 bg-green-600/10 font-bold text-green-300"
            >
              ✓ {mt(lang, "stepDone")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
