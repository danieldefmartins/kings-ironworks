"use client";

// What happens when a measurer taps the sketch: choose what is at that
// point, or act on a point that is already there.

import { mt } from "@/lib/shop/measure-i18n";
import {
  newPost,
  type MeasureData,
  type PostMeasure,
  type RoutingSpec,
} from "@/lib/shop/measure";

export default function PointMenus({
  lang,
  data,
  placementMenu,
  setPlacementMenu,
  selectedPostId,
  setSelectedPostId,
  setMovingPostId,
  addTypedPoint,
  removePost,
  routing,
  set,
}: {
  lang: string;
  data: MeasureData;
  placementMenu: { segIdx: number; stepIdx: number | null; side: "left" | "right" } | null;
  setPlacementMenu: (m: { segIdx: number; stepIdx: number | null; side: "left" | "right" } | null) => void;
  selectedPostId: string | null;
  setSelectedPostId: (id: string | null) => void;
  setMovingPostId: (id: string | null) => void;
  addTypedPoint: (t: PostMeasure["pointType"]) => void;
  removePost: (id: string) => void;
  routing: RoutingSpec;
  set: (fn: (d: MeasureData) => void) => void;
}) {
  return (
    <>
    {placementMenu && (
      <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-4" onClick={() => setPlacementMenu(null)}>
        <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-4" onClick={(e) => e.stopPropagation()}>
          <div className="text-lg font-bold mb-1">{mt(lang, "choosePointType")}</div>
          <div className="text-xs text-neutral-400 mb-3">{mt(lang, "choosePointHint")}</div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {(["left", "right"] as const).map((side) => (
              <button key={side} type="button" onClick={() => setPlacementMenu({ ...placementMenu, side })}
                className={`rounded-xl border p-3 font-bold ${placementMenu.side === side ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-neutral-700 bg-neutral-800"}`}>
                {mt(lang, side === "left" ? "leftLookingUp" : "rightLookingUp")}
              </button>
            ))}
          </div>
          {/* Told at the start that nothing is already there, the menu leads
              with the only thing that usually is: a new railing post. The
              rest stay one tap away — a column can always turn up on site. */}
          {routing.existing === "none" ? (
            <>
              <button type="button" onClick={() => addTypedPoint("railing_post")}
                className="w-full rounded-xl border border-amber-600 bg-amber-500/10 p-4 text-left font-bold text-amber-300 active:bg-amber-500/20">
                ▣ {mt(lang, "point_railing_post")}
              </button>
              <details className="mt-2">
                <summary className="cursor-pointer select-none py-2 text-xs text-neutral-400">
                  + {mt(lang, "placementOther")}
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["existing_post", "concrete_wall", "clip"] as const).map((type) => (
                    <button key={type} type="button" onClick={() => addTypedPoint(type)}
                      className="rounded-xl border border-neutral-700 bg-neutral-800 p-4 text-left font-bold active:bg-neutral-700">
                      {type === "existing_post" ? "▤" : type === "concrete_wall" ? "▥" : "⊣"}{" "}
                      {mt(lang, `point_${type}`)}
                    </button>
                  ))}
                </div>
              </details>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(["railing_post", "existing_post", "concrete_wall", "clip"] as const).map((type) => (
                <button key={type} type="button" onClick={() => addTypedPoint(type)}
                  className="rounded-xl border border-neutral-700 bg-neutral-800 p-4 text-left font-bold active:bg-neutral-700">
                  {type === "railing_post" ? "▣" : type === "existing_post" ? "▤" : type === "concrete_wall" ? "▥" : "⊣"}{" "}
                  {mt(lang, `point_${type}`)}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setPlacementMenu(null)} className="w-full mt-3 rounded-xl border border-neutral-700 py-3">
            {mt(lang, "cancel")}
          </button>
        </div>
      </div>
    )}

    {selectedPostId && (() => {
      const selected = data.posts.find((po) => po.id === selectedPostId);
      if (!selected) return null;
      return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center" onClick={() => setSelectedPostId(null)}>
          <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 text-lg font-bold">{mt(lang, `point_${selected.pointType}`)}</div>
            <div className="mb-4 text-xs text-neutral-400">{mt(lang, "selectedPointHint")}</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setMovingPostId(selected.id); setSelectedPostId(null); }}
                className="rounded-xl border border-amber-600 bg-amber-500/10 p-4 font-bold text-amber-300">
                ↔ {mt(lang, "relocatePoint")}
              </button>
              <button type="button" onClick={() => { removePost(selected.id); setSelectedPostId(null); }}
                className="rounded-xl border border-red-800 bg-red-950/40 p-4 font-bold text-red-300">
                ✕ {mt(lang, "removePost")}
              </button>
              <button type="button" onClick={() => {
                set((d) => {
                  const po = newPost(selected.segIdx, selected.stepIdx);
                  po.pointType = selected.pointType;
                  po.side = selected.side === "left" ? "right" : "left";
                  po.anchor = selected.anchor;
                  po.substrate = selected.substrate;
                  d.posts.push(po);
                });
                setSelectedPostId(null);
              }} className="col-span-2 rounded-xl border border-neutral-600 bg-neutral-800 p-3 font-bold text-neutral-200">
                ＋ {mt(lang, "addOtherSide")}
              </button>
            </div>
            <button type="button" onClick={() => setSelectedPostId(null)} className="mt-3 w-full rounded-xl border border-neutral-700 py-3">
              {mt(lang, "cancel")}
            </button>
          </div>
        </div>
      );
    })()}

    </>
  );
}
