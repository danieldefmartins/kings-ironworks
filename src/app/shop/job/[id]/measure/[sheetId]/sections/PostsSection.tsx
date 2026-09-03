"use client";

// Every point the railing touches down on, in the order they run: where it
// sits, how it mounts, and what it mounts into.

import {
  type MeasureData,
  type PostMeasure,
  type CarryoverKey,
  MOUNT_OPTIONS,
} from "@/lib/shop/measure";
import { planPaths, newPlanPost } from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import {
  Card,
  Grid,
  MInput,
  MSelect,
  ChipRow,
  ChoiceMInput,
  setPost,
  postStepNumber,
  commonThicknessChoices,
  obstructionChoices,
} from "../fields";

export default function PostsSection({
  lang,
  data,
  set,
  posts,
  anchorOptions,
  carriedNote,
  removePost,
  setPhotoSlot,
  isSpiral,
  isWallRail,
  isCustom,
  isWell,
  isFire,
  isGate,
  isFence,
  isBalcony,
  isDeck,
}: {
  lang: string;
  data: MeasureData;
  set: (fn: (d: MeasureData) => void) => void;
  posts: PostMeasure[];
  anchorOptions: string[];
  carriedNote: (key: CarryoverKey, current: string) => string | undefined;
  removePost: (id: string) => void;
  setPhotoSlot: (s: { slot: string; label: string } | null) => void;
  isSpiral: boolean;
  isWallRail: boolean;
  isCustom: boolean;
  isWell: boolean;
  isFire: boolean;
  isGate: boolean;
  isFence: boolean;
  isBalcony: boolean;
  isDeck: boolean;
}) {
  return (
    <>
      {(() => {
        // Drawn shapes (custom, deck) carry points too — they are just located
        // on a drawn line instead of a tread. Everything below the position
        // fields is identical, so the card is shared.
        const isDrawn = isCustom || isDeck;
        const runs = isDrawn ? planPaths(data.plan) : [];
        const addPlanPoint = (pathId: string, segIdx: number) =>
          set((d) => void d.posts.push(newPlanPost(pathId, segIdx)));
        return !isSpiral && !isWallRail && !isWell && !isFire && !isGate && !isFence && !isBalcony && (
        // On a drawn shape the points live on the same screen as the drawing:
        // they hang off lines that do not exist until the drawing is made, so
        // asking for them on an earlier stage is asking the impossible.
        <Card stage={isDrawn ? "steps" : "locations"} title={`${mt(lang, "posts")} (${posts.length})`}>
          {/* Setback and edge distance are a layout decision, made once and
              repeated down the run — they were being typed per post, which is
              the same two numbers fourteen times and fourteen chances to type
              one of them differently. Set here, taken by every post added
              after, and pushed onto the existing ones on request. */}
          {posts.length > 0 && !isDrawn && (
            <PostStandards lang={lang} posts={posts} set={set} />
          )}
          {posts.length === 0 && (
            <div className="text-sm text-neutral-500">{mt(lang, "noPosts")}</div>
          )}
          <div className="space-y-3">
            {posts.map((po, n) => (
              <div key={po.id} className="border border-neutral-800 rounded-lg p-3 bg-neutral-950/60">
                <div className="flex items-center mb-2">
                  <span className="font-bold text-amber-400">
                    P{n + 1}{" "}
                    <span className="text-neutral-400 font-normal text-sm">
                      {po.pathId
                        ? `— ${runs.find((r) => r.id === po.pathId)?.label || mt(lang, "runLbl")} · ${mt(lang, "onLine")} ${(po.planSegIdx ?? 0) + 1}`
                        : po.stepIdx !== null
                          ? `— ${mt(lang, "onStep")} ${postStepNumber(data, po)}`
                          : `— ${mt(lang, "onPlatform")}`}
                    </span>
                  </span>
                  <button onClick={() => removePost(po.id)}
                    className="ml-auto text-xs text-red-400 border border-red-900 rounded-full px-2.5 py-1">
                    ✕ {mt(lang, "removePost")}
                  </button>
                </div>
                <ChipRow help="pointType"
                  label={mt(lang, "pointType")}
                  value={po.pointType}
                  options={([
                    ["railing_post", mt(lang, "point_railing_post")],
                    ["existing_post", mt(lang, "point_existing_post")],
                    ["concrete_wall", mt(lang, "point_concrete_wall")],
                    ["clip", mt(lang, "point_clip")],
                  ] as [string, string][])}
                  onChange={(v) => setPost(set, po.id, "pointType", v || "railing_post")}
                />
                <ChipRow help="stairSideLookingUp" label={mt(lang, "stairSideLookingUp")} value={po.side}
                  options={[["left", mt(lang, "leftLookingUp")], ["right", mt(lang, "rightLookingUp")]]}
                  onChange={(v) => setPost(set, po.id, "side", v)} />
                <Grid>
                  {po.pathId ? (
                    <>
                      <MSelect help="onRun" label={mt(lang, "onRun")} lang={lang}
                        value={po.pathId}
                        options={runs.map((r) => r.id)}
                        labels={Object.fromEntries(runs.map((r, ri) => [r.id, r.label || `${mt(lang, "runLbl")} ${ri + 1}`]))}
                        onChange={(v) => setPost(set, po.id, "pathId", v)} />
                      <MSelect help="onLine" label={mt(lang, "onLine")} lang={lang}
                        value={String((po.planSegIdx ?? 0) + 1)}
                        options={(runs.find((r) => r.id === po.pathId)?.segs || []).map((_, si) => String(si + 1))}
                        onChange={(v) => set((d) => {
                          const t = d.posts.find((x) => x.id === po.id);
                          if (t) t.planSegIdx = Math.max(0, (parseInt(v, 10) || 1) - 1);
                        })} />
                      <MInput help="alongLine" label={mt(lang, "alongLine")} value={po.pos}
                        onChange={(v) => setPost(set, po.id, "pos", v)} />
                    </>
                  ) : po.stepIdx !== null ? (
                    <>
                      <MInput help="distanceFromFirst" label={mt(lang, "distanceFromFirst")} value={po.distanceFromFirst}
                        onChange={(v) => setPost(set, po.id, "distanceFromFirst", v)} />
                      <MInput help="postSetback" label={mt(lang, "postSetback")} value={po.fromNosing}
                        onChange={(v) => setPost(set, po.id, "fromNosing", v)} />
                    </>
                  ) : (
                    <MInput help="alongPlatform" label={mt(lang, "alongPlatform")} value={po.pos}
                      onChange={(v) => setPost(set, po.id, "pos", v)} />
                  )}
                  <MInput help="fromEdge" label={mt(lang, "fromEdge")} value={po.fromEdge}
                    onChange={(v) => setPost(set, po.id, "fromEdge", v)} />
                  {po.pointType === "railing_post" && (
                    <>
                      <MSelect help="mountType" label={mt(lang, "mountType")} value={po.mount}
                        options={[...MOUNT_OPTIONS]} lang={lang}
                        carried={carriedNote("post.mount", po.mount)}
                        onClearCarried={() => setPost(set, po.id, "mount", "")}
                        onChange={(v) => { setPost(set, po.id, "mount", v); }} />
                      <MSelect help="anchorInto" label={mt(lang, "anchorInto")} value={po.anchor}
                        options={anchorOptions} lang={lang}
                        onChange={(v) => setPost(set, po.id, "anchor", v)} />
                    </>
                  )}
                  {po.pointType !== "railing_post" && (
                    <MSelect help="existingMaterial" label={mt(lang, "existingMaterial")} value={po.anchor}
                      options={anchorOptions} lang={lang}
                      onChange={(v) => setPost(set, po.id, "anchor", v)} />
                  )}
                  {(po.pointType === "existing_post" || po.pointType === "concrete_wall") && (
                    <>
                      <MInput help="existingPostWidth" label={mt(lang, "existingPostWidth")} value={po.existingW}
                        onChange={(v) => setPost(set, po.id, "existingW", v)} />
                      <MInput help="existingPostDepth" label={mt(lang, "existingPostDepth")} value={po.existingD}
                        onChange={(v) => setPost(set, po.id, "existingD", v)} />
                    </>
                  )}
                  {po.pointType === "existing_post" && (
                    <>
                      <ChoiceMInput label={mt(lang, "skirtProjection")} placeholder={mt(lang, "noneOrZero")} value={po.skirtProjection}
                        choices={commonThicknessChoices(lang)} onChange={(v) => setPost(set, po.id, "skirtProjection", v)} />
                      <MInput help="skirtHeight" label={mt(lang, "skirtHeight")} placeholder="—" value={po.skirtHeight}
                        onChange={(v) => setPost(set, po.id, "skirtHeight", v)} />
                      <MInput help="columnToWall" label={mt(lang, "columnToWall")} value={po.columnToWall}
                        onChange={(v) => setPost(set, po.id, "columnToWall", v)} />
                      <MInput help="columnToPlatformEdge" label={mt(lang, "columnToPlatformEdge")} value={po.columnToPlatformEdge}
                        onChange={(v) => setPost(set, po.id, "columnToPlatformEdge", v)} />
                    </>
                  )}
                  {po.pointType === "clip" && (
                    <MInput help="clipDetail" label={mt(lang, "clipDetail")} placeholder="—" value={po.clipDetail}
                      onChange={(v) => setPost(set, po.id, "clipDetail", v)} />
                  )}
                </Grid>
                <details className="mt-3">
                  <summary className="text-xs text-amber-400/80 cursor-pointer select-none">
                    + {mt(lang, "postMore")}
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <MInput help="postPlate" label={mt(lang, "postPlate")} placeholder="—" value={po.plate}
                      onChange={(v) => setPost(set, po.id, "plate", v)} />
                    <MInput help="postAnchors" label={mt(lang, "postAnchors")} placeholder="—" value={po.anchors}
                      carried={carriedNote("post.anchors", po.anchors)}
                      onClearCarried={() => setPost(set, po.id, "anchors", "")}
                      onChange={(v) => { setPost(set, po.id, "anchors", v); }} />
                    <MInput help="postSubstrate" label={mt(lang, "postSubstrate")} placeholder="—" value={po.substrate}
                      onChange={(v) => setPost(set, po.id, "substrate", v)} />
                    <MInput help="postEdgeDist" label={mt(lang, "postEdgeDist")} value={po.edgeDist}
                      onChange={(v) => setPost(set, po.id, "edgeDist", v)} />
                    <ChoiceMInput label={mt(lang, "postObstruction")} placeholder="—" value={po.obstruction}
                      choices={obstructionChoices(lang)} onChange={(v) => setPost(set, po.id, "obstruction", v)} />
                    <button
                      onClick={() =>
                        setPhotoSlot({
                          slot: `post_${po.id}`,
                          label: `${mt(lang, "postPhoto")} P${n + 1}`,
                        })
                      }
                      className="self-end px-3 py-2.5 rounded-lg border border-neutral-700 bg-neutral-800 text-sm text-neutral-200"
                    >
                      📷 {mt(lang, "postPhoto")}
                      {data.photos.some((ph) => ph.slot === `post_${po.id}`) ? " ✓" : ""}
                    </button>
                  </div>
                </details>
              </div>
            ))}
          </div>

          {isDrawn && (
            <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
                {mt(lang, "addPointToLine")}
              </div>
              {runs.length === 0 && (
                <div className="text-sm text-neutral-500">{mt(lang, "drawFirst")}</div>
              )}
              <div className="space-y-2">
                {runs.map((rn, ri) => (
                  rn.segs.length === 0 ? null : (
                    <div key={rn.id} className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-xs font-bold text-amber-400">
                        {rn.label || `${mt(lang, "runLbl")} ${ri + 1}`}
                      </span>
                      {rn.segs.map((_, si) => (
                        <button
                          key={si}
                          onClick={() => addPlanPoint(rn.id, si)}
                          className="rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs font-bold text-neutral-200"
                        >
                          ＋ {si + 1}
                        </button>
                      ))}
                    </div>
                  )
                ))}
              </div>
              <p className="mt-2 text-[11px] text-neutral-500">{mt(lang, "addPointHint")}</p>
            </div>
          )}
        </Card>
        );
      })()}

      {/* Railing */}
    </>
  );
}

/** The two numbers that repeat down a run, in one place. */
function PostStandards({
  lang,
  posts,
  set,
}: {
  lang: string;
  posts: PostMeasure[];
  set: (fn: (d: MeasureData) => void) => void;
}) {
  // Seeded from the run itself: whatever the first post that has an answer
  // says, rather than a second copy of the same number kept somewhere else.
  const setback = posts.find((p) => p.fromNosing.trim() !== "")?.fromNosing || "";
  const edge = posts.find((p) => p.fromEdge.trim() !== "")?.fromEdge || "";
  const applyAll = (field: "fromNosing" | "fromEdge", v: string) =>
    set((d) => d.posts.forEach((p) => void (p[field] = v)));
  const uneven =
    posts.some((p) => p.fromNosing.trim() !== "" && p.fromNosing !== setback) ||
    posts.some((p) => p.fromEdge.trim() !== "" && p.fromEdge !== edge);
  return (
    <div className="mb-3 rounded-xl border border-neutral-700 bg-neutral-950/40 p-3">
      <div className="text-xs font-bold text-neutral-300">{mt(lang, "sameEveryPost")}</div>
      <div className="mb-2 text-[11px] text-neutral-500">{mt(lang, "sameEveryPostHint")}</div>
      <Grid>
        <MInput help="postSetback" label={mt(lang, "postSetback")} value={setback}
          onChange={(v) => applyAll("fromNosing", v)} />
        <MInput help="fromEdge" label={mt(lang, "fromEdge")} value={edge}
          onChange={(v) => applyAll("fromEdge", v)} />
      </Grid>
      {/* Only offered when the run has actually drifted apart — otherwise it
          is a button that does nothing, which is worse than no button. */}
      {uneven && (
        <button
          type="button"
          onClick={() => {
            applyAll("fromNosing", setback);
            applyAll("fromEdge", edge);
          }}
          className="mt-2 min-h-[44px] w-full rounded-lg border border-amber-700 bg-amber-950/30 text-xs font-bold text-amber-300"
        >
          ⇊ {mt(lang, "applyToAllPosts")}
        </button>
      )}
    </div>
  );
}
