"use client";

// The drawing, and everything a measurer does by tapping it: marking what is
// already standing on site, saying which side is walled, composing a run out
// of flights and landings, and placing the points the railing lands on.
//
// The prop list is wide because the coupling is: this is the one place where a
// tap has to reach the sheet. It is at least visible here, and checked, rather
// than reaching into a shared closure.

import {
  type MeasureData,
  type MeasureShape,
  type PlatformSegment,
  type PostMeasure,
} from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import {
  Card,
  ChipRow,
  ChoiceMInput,
  Grid,
  MInput,
  MSelect,
  SkirtSolver,
  commonThicknessChoices,
  setPost,
  type EditorStage,
} from "../fields";
import { useState } from "react";
import Sketch, { type SketchView } from "../Sketch";

export default function SketchSections({
  lang,
  data,
  set,
  shape,
  activeStage,
  focusSeg,
  view,
  viewList,
  setView,
  movingPostId,
  setMovingPostId,
  posts,
  platforms,
  anchorOptions,
  addStepPost,
  addPlatformPost,
  onMeasureStep,
  holdStepLocation,
  addPlanPost,
  holdPlanLocation,
  holdPlatformLocation,
  tapStructureStep,
  tapStructurePlatform,
  tapPost,
  removePost,
  toggleSketchWall,
}: {
  lang: string;
  data: MeasureData;
  set: (fn: (d: MeasureData) => void) => void;
  shape: MeasureShape;
  activeStage: EditorStage;
  focusSeg?: number;
  view: SketchView;
  viewList: [SketchView, string][];
  setView: (v: SketchView) => void;
  movingPostId: string | null;
  setMovingPostId: (id: string | null) => void;
  posts: PostMeasure[];
  platforms: { seg: PlatformSegment; i: number }[];
  anchorOptions: string[];
  addStepPost: (segIdx: number, stepIdx: number) => void;
  /** Tapping a tread while measuring opens that step, rather than placing a post. */
  onMeasureStep: (segIdx: number, stepIdx: number) => void;
  addPlatformPost: (segIdx: number) => void;
  holdStepLocation: (segIdx: number, stepIdx: number) => void;
  addPlanPost: (pathId: string, segIdx: number, t: number) => void;
  holdPlanLocation: (pathId: string, segIdx: number, t: number) => void;
  holdPlatformLocation: (segIdx: number) => void;
  tapStructureStep: (segIdx: number, stepIdx: number) => void;
  tapStructurePlatform: (segIdx: number) => void;
  tapPost: (id: string) => void;
  removePost: (id: string) => void;
  toggleSketchWall: (side: "left" | "right") => void;
}) {
  // Placing a post by thumb wants a bigger target than reading the drawing
  // does, and a stair with fourteen treads is a lot of nearly identical taps.
  const [zoom, setZoom] = useState(1);
  // The shape decides which of these cards mean anything; derived here rather
  // than passed as nine more booleans.
  const isSpiral = shape === "spiral";
  const isWallRail = shape === "wall_rail";
  const isCustom = shape === "custom";
  const isWell = shape === "window_well";
  const isFire = shape === "fire_escape";
  const isGate = shape === "gate";
  const isFence = shape === "fence";
  const isBalcony = shape === "balcony";
  // On the steps step the drawing is an input: a tap opens the tread it
  // landed on. Everywhere else a tap still places a point.
  const measuring = activeStage === "steps";
  return (
    <>
      {!isSpiral && !isWallRail && !isCustom && !isWell && !isFire && !isGate && !isFence && !isBalcony && (
        <Card stage="setup" title={`🏛 ${mt(lang, "existingStructuresTitle")}`}>
          <p className="mb-3 text-xs text-neutral-400">{mt(lang, "existingStructuresHint")}</p>
          <div className="mb-4 rounded-xl border border-neutral-700 bg-neutral-950/60 p-3">
            {viewList.length > 1 && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="ml-auto flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-800 px-1">
                  <button type="button" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.25).toFixed(2)))}
                    aria-label="-" className="h-9 w-9 text-lg font-bold text-neutral-300">−</button>
                  <span className="w-10 text-center text-[11px] font-bold text-neutral-400">{Math.round(zoom * 100)}%</span>
                  <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                    aria-label="+" className="h-9 w-9 text-lg font-bold text-neutral-300">+</button>
                </span>
                {viewList.map(([vw, key]) => (
                  <button key={vw} type="button" onClick={() => setView(vw)}
                    className={`min-h-[44px] shrink-0 rounded-full border px-3 text-xs font-bold ${view === vw ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}>
                    {mt(lang, key)}
                  </button>
                ))}
              </div>
            )}
            {movingPostId && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500 bg-amber-950/40 p-3 text-sm text-amber-200">
                <span className="flex-1">↔ {mt(lang, "movePostHint")}</span>
                <button type="button" onClick={() => setMovingPostId(null)} className="rounded-full border border-amber-700 px-2 py-1 text-xs">{mt(lang, "cancel")}</button>
              </div>
            )}
            <Sketch
              zoom={zoom}
              focusSeg={focusSeg}
              shape={shape}
              data={data}
              lang={lang}
              view={view}
              onTapStep={tapStructureStep}
              onTapPlatform={tapStructurePlatform}
              onHoldStep={holdStepLocation}
              onHoldPlatform={holdPlatformLocation}
              onTapPost={tapPost}
              onHoldPost={(id) => setMovingPostId(id)}
              onTapLine={addPlanPost}
              onHoldLine={holdPlanLocation}
              onToggleWallSide={toggleSketchWall}
            />
          </div>
          <p className="text-sm text-neutral-500">{mt(lang, "holdToAddExisting")}</p>
          <div className="space-y-3">
            {posts.filter((po) => po.pointType !== "railing_post").map((po, n) => (
              <div key={po.id} className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
                <div className="mb-2 flex items-center">
                  <span className="font-bold text-amber-400">E{n + 1} — {mt(lang, `point_${po.pointType}`)}</span>
                  <button type="button" onClick={() => removePost(po.id)} className="ml-auto rounded-full border border-red-900 px-2.5 py-1 text-xs text-red-400">
                    ✕ {mt(lang, "removePost")}
                  </button>
                </div>
                <Grid>
                  <ChipRow help="stairSideLookingUp" label={mt(lang, "stairSideLookingUp")} value={po.side}
                    options={[["left", mt(lang, "leftLookingUp")], ["right", mt(lang, "rightLookingUp")]]}
                    onChange={(v) => setPost(set, po.id, "side", v)} />
                  <MSelect help="existingMaterial" label={mt(lang, "existingMaterial")} value={po.anchor} options={anchorOptions} lang={lang}
                    onChange={(v) => setPost(set, po.id, "anchor", v)} />
                  <MInput help="existingPostWidth" label={mt(lang, "existingPostWidth")} value={po.existingW}
                    onChange={(v) => setPost(set, po.id, "existingW", v)} />
                  <MInput help="existingPostDepth" label={mt(lang, "existingPostDepth")} value={po.existingD}
                    onChange={(v) => setPost(set, po.id, "existingD", v)} />
                  <MInput help="columnToWall" label={mt(lang, "columnToWall")} value={po.columnToWall}
                    onChange={(v) => setPost(set, po.id, "columnToWall", v)} />
                  <MInput help="columnToPlatformEdge" label={mt(lang, "columnToPlatformEdge")} value={po.columnToPlatformEdge}
                    onChange={(v) => setPost(set, po.id, "columnToPlatformEdge", v)} />
                  {po.pointType === "existing_post" && <>
                    <ChoiceMInput label={mt(lang, "skirtProjection")} placeholder={mt(lang, "noneOrZero")} value={po.skirtProjection}
                      choices={commonThicknessChoices(lang)} onChange={(v) => setPost(set, po.id, "skirtProjection", v)} />
                    <MInput help="skirtHeight" label={mt(lang, "skirtHeight")} value={po.skirtHeight}
                      onChange={(v) => setPost(set, po.id, "skirtHeight", v)} />
                  </>}
                </Grid>
                <SkirtSolver lang={lang} po={po}
                  onGap={(v) => setPost(set, po.id, "infillGap", v)} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {platforms.filter(({ seg }) => seg.turn !== "none").length > 0 && (
        <Card stage="setup" title={`↪ ${mt(lang, "layoutDirectionTitle")}`}>
          <p className="mb-3 text-xs text-neutral-400">{mt(lang, "layoutDirectionHint")}</p>
          <div className="space-y-3">
            {platforms.filter(({ seg }) => seg.turn !== "none").map(({ seg, i }, landingIndex) => (
              <ChipRow key={i} label={`${mt(lang, "landing")} ${landingIndex + 1}`}
                value={seg.turn === "u" ? "left" : seg.turn}
                options={[["left", `↰ ${mt(lang, "turnLeft")}`], ["right", `↱ ${mt(lang, "turnRight")}`]]}
                onChange={(v) => set((d) => void ((d.segments[i] as PlatformSegment).turn = (v || "left") as "left" | "right"))} />
            ))}
          </div>
          {platforms.filter(({ seg }) => seg.turn !== "none").length === 2 && (
            <p className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950/50 p-2 text-xs text-neutral-400">{mt(lang, "threeFlightTurnHint")}</p>
          )}
        </Card>
      )}

      {/* The pieces this stair is built from used to be added here, at the
          top of the first step. They moved to SegmentsCard, below the steps:
          the flight count is already chosen when the sheet is made, and a
          piece added late has to say WHERE it goes. */}
      {/* Sketch (custom shapes draw their own plan below instead).
          It shows on the steps step too, where a tap means "measure this
          step" rather than "put a post here" — the drawing is the one thing
          on screen that knows which tread is which. */}
      {!isCustom && ["steps", "posts", "locations"].includes(activeStage) && (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
        <div className="font-bold mb-1">{mt(lang, "sketch")}</div>
        {!isSpiral && !isWallRail && (
          <div className="text-xs text-neutral-500 mb-2">
            {measuring ? mt(lang, "tapStepToMeasure") : mt(
              lang,
              isGate
                ? "sketchHintGate"
                : isFence
                ? "sketchHintFence"
                : isBalcony
                ? "sketchHintBalcony"
                : isFire
                ? "sketchHintFire"
                : isWell
                ? "sketchHintWell"
                : shape === "level_run" || shape === "ramp"
                  ? "sketchHintLevel"
                  : "sketchHintPosts"
            )}
          </div>
        )}
        {movingPostId && (
          <div className="mb-3 rounded-lg border border-amber-500 bg-amber-950/40 p-3 text-sm text-amber-200 flex items-center gap-2">
            <span className="flex-1">↔ {mt(lang, "movePostHint")}</span>
            <button type="button" onClick={() => setMovingPostId(null)} className="rounded-full border border-amber-700 px-2 py-1 text-xs">
              {mt(lang, "cancel")}
            </button>
          </div>
        )}
        {/* View chips — phones show one view; md+ adds a second beside it */}
        {viewList.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {viewList.map(([vw, key]) => (
              <button
                key={vw}
                onClick={() => setView(vw)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                  view === vw
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-neutral-700 bg-neutral-800 text-neutral-400"
                }`}
              >
                {mt(lang, key)}
              </button>
            ))}
          </div>
        )}
        {/* The chosen view is the one being read against the numbers being
            typed, so it gets two thirds of the card; the companion view is a
            reference, not a peer. */}
        <div className="md:grid md:grid-cols-3 md:gap-4 md:items-start">
          <div className="md:col-span-2">
            <div className="hidden md:block text-[11px] text-neutral-500 mb-1">
              {mt(lang, viewList.find(([vw]) => vw === view)?.[1] || viewList[0][1])}
            </div>
            <Sketch
              zoom={zoom}
              focusSeg={focusSeg}
              shape={shape}
              data={data}
              lang={lang}
              view={view}
              onTapStep={measuring ? onMeasureStep : addStepPost}
              onTapPlatform={measuring ? undefined : addPlatformPost}
              onHoldStep={holdStepLocation}
              onHoldPlatform={holdPlatformLocation}
              onTapPost={tapPost}
              onHoldPost={(id) => setMovingPostId(id)}
              onTapLine={addPlanPost}
              onHoldLine={holdPlanLocation}
              onToggleWallSide={toggleSketchWall}
            />
          </div>
          {viewList.length > 1 && (
            <div className="hidden md:block">
              <div className="text-[11px] text-neutral-500 mb-1">
                {mt(lang, viewList.find(([vw]) => vw !== view)![1])}
              </div>
              <Sketch
              zoom={zoom}
              focusSeg={focusSeg}
                shape={shape}
                data={data}
                lang={lang}
                view={viewList.find(([vw]) => vw !== view)![0]}
                onTapStep={measuring ? onMeasureStep : addStepPost}
                onTapPlatform={measuring ? undefined : addPlatformPost}
                onHoldStep={holdStepLocation}
                onHoldPlatform={holdPlatformLocation}
                onTapPost={tapPost}
              onHoldPost={(id) => setMovingPostId(id)}
              onTapLine={addPlanPost}
              onHoldLine={holdPlanLocation}
                onToggleWallSide={toggleSketchWall}
              />
            </div>
          )}
        </div>
      </div>
      )}

      {/* Spiral geometry */}
    </>
  );
}
