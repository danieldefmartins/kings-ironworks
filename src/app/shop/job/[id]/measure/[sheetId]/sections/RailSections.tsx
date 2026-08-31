"use client";

// The rail as a set of pieces: how high it runs, and for every piece, its
// length and how BOTH of its ends attach to the world.

import {
  newSpan,
  type MeasureData,
  type PostMeasure,
  type CarryoverKey,
  type WellDeliverable,
  RAIL_SIDE_OPTIONS,
} from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import {
  Card,
  Grid,
  MInput,
  MSelect,
  TermEditor,
} from "../fields";

export default function RailSections({
  lang,
  data,
  set,
  posts,
  anchorOptions,
  carriedNote,
  setSpan,
  setTerm,
  setHw,
  setPhotoSlot,
  hasHandrail,
  isWallRail,
  isWell,
  isFire,
  isGate,
  isFence,
  fireNew,
  wellWants,
}: {
  lang: string;
  data: MeasureData;
  set: (fn: (d: MeasureData) => void) => void;
  posts: PostMeasure[];
  anchorOptions: string[];
  carriedNote: (key: CarryoverKey, current: string) => string | undefined;
  setSpan: (idx: number, key: "label" | "topSpan" | "lowerSpan" | "note", value: string) => void;
  setTerm: (idx: number, end: "start" | "end", key: string, value: string) => void;
  setHw: (idx: number, end: "start" | "end", key: string, value: string) => void;
  setPhotoSlot: (s: { slot: string; label: string } | null) => void;
  hasHandrail: boolean;
  isWallRail: boolean;
  isWell: boolean;
  isFire: boolean;
  isGate: boolean;
  isFence: boolean;
  fireNew: boolean;
  wellWants: (k: WellDeliverable) => boolean;
}) {
  return (
    <>
      {(!isWell || wellWants("guard")) && (!isFire || fireNew) && (
      <Card stage="posts" title={mt(lang, "railSection")}>
        <Grid>
          <MInput help="railHeight" label={mt(lang, "railHeight")} value={data.rail.height}
            carried={carriedNote("rail.height", data.rail.height)}
            onClearCarried={() => set((d) => void (d.rail.height = ""))}
            onChange={(v) => { set((d) => void (d.rail.height = v)); }} />
          {!isWallRail && (
            <MSelect help="railSide" label={mt(lang, "railSide")} value={data.rail.side}
              options={[...RAIL_SIDE_OPTIONS]} lang={lang}
              onChange={(v) => set((d) => void (d.rail.side = v))} />
          )}
          {hasHandrail && (
            <MInput help="extensions" label={mt(lang, "extensions")} value={data.rail.extensions}
              onChange={(v) => set((d) => void (d.rail.extensions = v))} />
          )}
          <MInput help="returnsLabel" label={mt(lang, "returnsLabel")} placeholder="—" value={data.rail.returns}
            onChange={(v) => set((d) => void (d.rail.returns = v))} />
          {isWallRail && (
            <MInput help="brackets" label={mt(lang, "brackets")} placeholder="—" value={data.rail.brackets}
              onChange={(v) => set((d) => void (d.rail.brackets = v))} />
          )}
        </Grid>
      </Card>
      )}

      {/* Rail spans — every piece: length + BOTH end terminations */}
      {(!isWell || wellWants("guard")) && (!isFire || fireNew) && !isGate && !isFence && (
      <Card stage="posts" title={`🔗 ${mt(lang, "spansTitle")}`}>
        <div className="text-xs text-neutral-500 mb-3">{mt(lang, "spansHint")}</div>
        <div className="space-y-4">
          {data.spans.map((sp, si) => (
            <div key={sp.id} className="border border-neutral-700 rounded-xl p-3 bg-neutral-950/60">
              <div className="flex items-center mb-2">
                <span className="font-bold text-amber-400">
                  {mt(lang, "spanLabel")} #{si + 1}
                </span>
                {data.spans.length > 1 && (
                  <button
                    onClick={() => set((d) => void (d.spans = d.spans.filter((x) => x.id !== sp.id)))}
                    className="ml-auto text-xs text-red-400 border border-red-900 rounded-full px-2.5 py-1"
                  >
                    ✕ {mt(lang, "removeConn")}
                  </button>
                )}
              </div>
              <MInput help="spanName" label={mt(lang, "spanName")} placeholder="—" value={sp.label}
                onChange={(v) => setSpan(si, "label", v)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <MInput help="topSpanLbl" label={mt(lang, "topSpanLbl")} value={sp.topSpan}
                  onChange={(v) => setSpan(si, "topSpan", v)} />
                {(sp.start.molding.trim() !== "" || sp.end.molding.trim() !== "") && (
                  <MInput label={`${mt(lang, "lowerSpanLbl")} — ${mt(lang, "lowerSpanHint")}`}
                    value={sp.lowerSpan}
                    onChange={(v) => setSpan(si, "lowerSpan", v)} />
                )}
              </div>
              {(["start", "end"] as const).map((endKey) => (
                <TermEditor
                  key={endKey}
                  lang={lang}
                  title={mt(lang, endKey === "start" ? "startTerm" : "endTerm")}
                  t={sp[endKey]}
                  anchorOptions={anchorOptions}
                  postOptions={posts.map((po, pi) => [po.id, `P${pi + 1}`] as [string, string])}
                  spanOptions={data.spans
                    .map((other, oi) => [other.id, `${mt(lang, "spanLabel")} #${oi + 1}${other.label ? ` — ${other.label}` : ""}`] as [string, string])
                    .filter(([oid]) => oid !== sp.id)}
                  hasPhoto={data.photos.some((ph) => ph.slot === `term_${sp.id}_${endKey}`)}
                  onField={(k, v) => setTerm(si, endKey, k, v)}
                  onHw={(k, v) => setHw(si, endKey, k, v)}
                  onPhoto={() =>
                    setPhotoSlot({
                      slot: `term_${sp.id}_${endKey}`,
                      label: `${mt(lang, "termPhoto")} — ${mt(lang, "spanLabel")} ${si + 1} ${mt(lang, endKey === "start" ? "startTerm" : "endTerm")}`,
                    })
                  }
                />
              ))}
              <div className="mt-3">
                <MInput help="notes" label={mt(lang, "notes")} placeholder="—" value={sp.note}
                  onChange={(v) => setSpan(si, "note", v)} />
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => set((d) => void d.spans.push(newSpan()))}
          className="mt-3 px-4 py-2.5 rounded-lg border border-amber-600 bg-amber-500/10 text-amber-300 text-sm font-bold"
        >
          {mt(lang, "addSpan")}
        </button>
      </Card>
      )}

      {/* Materials */}
    </>
  );
}
