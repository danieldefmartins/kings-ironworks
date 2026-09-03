"use client";

// Adding a piece to a stair that is already on the sheet.
//
// The flight count is chosen when the sheet is created, so this card is not
// where a measurer starts — it is where they go when the stair turns out to
// have something the picker could not know about: a curve at the bottom, a
// landing that was not on the plan, one more flight than anyone counted.
//
// So it sits at the END of the steps step, folded shut, and it asks WHERE the
// piece goes before it creates it. That question is the whole point. A curve
// appended to the end of the list tells the shop to fabricate the turn on top
// of the stair instead of between flight 1 and its landing, and the joints
// either side of it then describe the wrong two pieces.

import { useState } from "react";
import {
  blankCurve,
  blankRamp,
  insertSegment,
  newFlightSegment,
  newPlatformSegment,
  removeSegment,
  type MeasureData,
  type Segment,
} from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import { Card, SmallBtn } from "../fields";

type PieceKind = "flight" | "landing" | "ramp" | "curve";

const PIECES: { kind: PieceKind; labelKey: string; make: () => Segment }[] = [
  { kind: "flight", labelKey: "addFlightSeg", make: () => newFlightSegment(3) },
  { kind: "landing", labelKey: "addLandingSeg", make: () => newPlatformSegment("left") },
  { kind: "ramp", labelKey: "addRampSeg", make: () => blankRamp() },
  { kind: "curve", labelKey: "addCurveSeg", make: () => blankCurve() },
];

/** "Flight 2", "Landing 1" — numbered within its own kind, the way a
 *  measurer says it out loud, not by its index in the segment list. */
export function pieceLabel(lang: string, segments: Segment[], i: number): string {
  const seg = segments[i];
  if (!seg) return `#${i + 1}`;
  const nth = segments.slice(0, i + 1).filter((s) => s.kind === seg.kind).length;
  const word =
    seg.kind === "flight"
      ? mt(lang, "flight")
      : seg.kind === "platform"
        ? mt(lang, "landing")
        : seg.kind === "ramp"
          ? mt(lang, "ramp")
          : mt(lang, "curve");
  return `${word} ${nth}`;
}

export default function SegmentsCard({
  lang,
  data,
  set,
}: {
  lang: string;
  data: MeasureData;
  set: (fn: (d: MeasureData) => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PieceKind | null>(null);
  const [added, setAdded] = useState(false);
  const segs = data.segments;

  function place(at: number) {
    const piece = PIECES.find((p) => p.kind === pending);
    if (!piece) return;
    set((d) => insertSegment(d, at, piece.make()));
    setPending(null);
    setAdded(true);
  }

  return (
    <Card stage="steps" title={`🧱 ${mt(lang, "segmentsTitle")}`}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-[48px] w-full items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-950/40 px-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-neutral-200">
              {segs.length} {mt(lang, "segmentsCount")}
            </span>
            <span className="block text-[11px] text-neutral-500">
              {mt(lang, "segmentsOpen")}
            </span>
          </span>
          <span aria-hidden className="shrink-0 text-neutral-400">
            +
          </span>
        </button>
      ) : (
        <>
          <div className="mb-3 text-xs text-neutral-500">{mt(lang, "segmentsHint")}</div>
          {/* The stair as it stands, bottom piece first — the order the shop
              will weld it in, and the order the joints are numbered in. */}
          <div className="mb-3 space-y-1">
            {segs.map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/40 px-2 py-2"
              >
                <span className="w-6 shrink-0 text-center text-[11px] font-bold text-neutral-500">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {pieceLabel(lang, segs, i)}
                </span>
                {segs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => set((d) => removeSegment(d, i))}
                    className="shrink-0 rounded-lg border border-neutral-700 px-2 py-1.5 text-[11px] font-bold text-neutral-400"
                  >
                    ✕ {mt(lang, "segmentRemove")}
                  </button>
                )}
              </div>
            ))}
          </div>

          {pending ? (
            <div className="rounded-xl border border-amber-700 bg-amber-950/20 p-3">
              <div className="mb-2 text-sm font-bold text-amber-200">
                {mt(lang, `add${pending === "landing" ? "Landing" : pending === "curve" ? "Curve" : pending === "ramp" ? "Ramp" : "Flight"}Seg`)}
                {" · "}
                {mt(lang, "segmentWhere")}
              </div>
              <div className="space-y-1">
                {Array.from({ length: segs.length + 1 }, (_, at) => (
                  <button
                    key={at}
                    type="button"
                    onClick={() => place(at)}
                    className="flex min-h-[48px] w-full items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-left text-sm font-bold text-neutral-200"
                  >
                    <span className="min-w-0 flex-1">
                      {at === 0
                        ? mt(lang, "segmentAtBottom")
                        : `${mt(lang, "segmentAfter")} ${pieceLabel(lang, segs, at - 1)}`}
                      {at === segs.length && at !== 0 ? ` · ${mt(lang, "segmentTop")}` : ""}
                    </span>
                    <span aria-hidden className="shrink-0 text-neutral-500">
                      →
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="mt-2 min-h-[44px] w-full rounded-lg border border-neutral-700 text-xs font-bold text-neutral-400"
              >
                {mt(lang, "cancel")}
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {PIECES.map((p) => (
                  <SmallBtn key={p.kind} onClick={() => { setAdded(false); setPending(p.kind); }}>
                    {mt(lang, p.labelKey)}
                  </SmallBtn>
                ))}
              </div>
              {/* A new piece brings two new boundaries with it, and a joint
                  nobody measured is the shop guessing how the stair connects. */}
              {added && (
                <div className="mt-3 rounded-lg border border-green-700 bg-green-600/10 px-3 py-2 text-xs text-green-300">
                  ✓ {mt(lang, "segmentAdded")}
                </div>
              )}
            </>
          )}
        </>
      )}
    </Card>
  );
}
