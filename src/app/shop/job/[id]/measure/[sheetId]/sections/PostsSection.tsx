"use client";

// Every point the railing touches down on, in the order they run: where it
// sits, how it mounts, and what it mounts into.

import {
  type MeasureData,
  type PostMeasure,
  type CarryoverKey,
  MOUNT_OPTIONS,
} from "@/lib/shop/measure";
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
      {!isSpiral && !isWallRail && !isCustom && !isWell && !isFire && !isGate && !isFence && !isBalcony && !isDeck && (
        <Card stage="locations" title={`${mt(lang, "posts")} (${posts.length})`}>
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
                      {po.stepIdx !== null
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
                  {po.stepIdx !== null ? (
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
        </Card>
      )}

      {/* Railing */}
    </>
  );
}
