"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/shop/db";
import {
  ANCHOR_OPTIONS,
  MATERIAL_PRESETS,
  MOUNT_OPTIONS,
  RAIL_KIND_OPTIONS,
  RAIL_SIDE_OPTIONS,
  newPostId,
  sheetProgress,
  type FlightSegment,
  type MeasureData,
  type MeasureSheet,
  type PlatformSegment,
  type PostMeasure,
  type RampSegment,
} from "@/lib/shop/measure";
import { mt, optLabel, shapeLabel } from "@/lib/shop/measure-i18n";
import { SPEC_OPTIONS, specValue } from "@/lib/shop/i18n";
import Sketch, { sketchViews } from "./Sketch";
import PhotoMarkup from "./PhotoMarkup";
import PrintSheet from "./PrintSheet";

const FRACTIONS = [
  '1/16"', '1/8"', '3/16"', '1/4"', '5/16"', '3/8"', '7/16"', '1/2"',
  '9/16"', '5/8"', '11/16"', '3/4"', '13/16"', '7/8"', '15/16"', "°",
];
// Tokens that glue directly onto the number (5 + ' = 5', not 5 ')
const NOSPACE = new Set(["'", '"', "°"]);

// Placeholder for measurement inputs, driven by the sheet's unit choice.
const PlaceholderCtx = createContext<string>("—");

// Insert a token into the focused measurement input via the native value
// setter so React's controlled state picks it up.
function insertToken(tok: string) {
  const el = document.activeElement as HTMLInputElement | null;
  if (!el || el.tagName !== "INPUT" || el.dataset.m !== "1") return;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  if (!setter) return;
  const sep = el.value && !el.value.endsWith(" ") && !NOSPACE.has(tok) ? " " : "";
  setter.call(el, el.value + sep + tok);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// Posts in the same order the sketch numbers them (walk segments bottom-up).
export function orderedPosts(data: MeasureData): PostMeasure[] {
  const out: PostMeasure[] = [];
  data.segments.forEach((seg, si) => {
    if (seg.kind === "flight") {
      seg.steps.forEach((_, i) => {
        const p = data.posts.find((po) => po.segIdx === si && po.stepIdx === i);
        if (p) out.push(p);
      });
    } else {
      out.push(...data.posts.filter((po) => po.segIdx === si));
    }
  });
  return out;
}

export default function MeasureEditor({
  job,
  sheet,
  lang,
  workerName,
}: {
  job: Job;
  sheet: MeasureSheet;
  lang: string;
  workerName: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<MeasureData>(sheet.data);
  const [name, setName] = useState(sheet.name || "");
  const [status, setStatus] = useState(sheet.status);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [fracBar, setFracBar] = useState(false);
  const [view, setView] = useState<"side" | "front">("side");
  const firstRender = useRef(true);

  const units = data.units || "in";
  const unitPh = units === "ftin" ? `0' 0"` : `0"`;
  const fracTokens = units === "ftin" ? ["'", '"', ...FRACTIONS] : FRACTIONS;
  const [, sideKey, frontKey] = sketchViews(sheet.shape);

  // Autosave (debounced) whenever measurements change.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/shop/api/measure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "update", id: sheet.id, data }),
        });
        setSaveState(res.ok ? "saved" : "idle");
      } catch {
        setSaveState("idle");
      }
    }, 900);
    return () => clearTimeout(t);
  }, [data, sheet.id]);

  // Show the fraction bar only while a measurement input is focused.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      setFracBar(!!el && (el as HTMLInputElement).dataset?.m === "1");
    };
    const onFocusOut = () => {
      requestAnimationFrame(() => {
        const el = document.activeElement as HTMLElement | null;
        setFracBar(!!el && (el as HTMLInputElement).dataset?.m === "1");
      });
    };
    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("focusout", onFocusOut);
    return () => {
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  function set(fn: (d: MeasureData) => void) {
    setData((prev) => {
      const next = structuredClone(prev) as MeasureData;
      fn(next);
      return next;
    });
  }

  function toggleStepPost(segIdx: number, stepIdx: number) {
    set((d) => {
      const i = d.posts.findIndex((p) => p.segIdx === segIdx && p.stepIdx === stepIdx);
      if (i >= 0) d.posts.splice(i, 1);
      else
        d.posts.push({
          id: newPostId(),
          segIdx,
          stepIdx,
          pos: "",
          fromNosing: "",
          fromEdge: "",
          mount: "",
          anchor: "",
        });
    });
  }

  function addPlatformPost(segIdx: number) {
    set((d) => {
      d.posts.push({
        id: newPostId(),
        segIdx,
        stepIdx: null,
        pos: "",
        fromNosing: "",
        fromEdge: "",
        mount: "",
        anchor: "",
      });
    });
  }

  function removePost(id: string) {
    set((d) => {
      d.posts = d.posts.filter((p) => p.id !== id);
    });
  }

  async function saveName(n: string) {
    await fetch("/shop/api/measure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "rename", id: sheet.id, name: n }),
    });
  }

  async function toggleStatus() {
    const next = status === "ready" ? "in_progress" : "ready";
    setStatus(next);
    await fetch("/shop/api/measure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "status", id: sheet.id, status: next }),
    });
  }

  async function deleteSheet() {
    if (!confirm(mt(lang, "confirmDelete"))) return;
    await fetch("/shop/api/measure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "delete", id: sheet.id }),
    });
    router.push(`/shop/job/${job.id}/measure`);
  }

  const prog = sheetProgress(data);
  const posts = orderedPosts(data);
  const isSpiral = sheet.shape === "spiral";
  const isWallRail = sheet.shape === "wall_rail";
  const flights = data.segments
    .map((s, i) => ({ seg: s, i }))
    .filter((x) => x.seg.kind === "flight") as { seg: FlightSegment; i: number }[];
  const platforms = data.segments
    .map((s, i) => ({ seg: s, i }))
    .filter((x) => x.seg.kind === "platform") as { seg: PlatformSegment; i: number }[];
  const ramp = data.segments.find((s) => s.kind === "ramp") as RampSegment | undefined;

  return (
    <PlaceholderCtx.Provider value={unitPh}>
      <div className="p-4 max-w-4xl mx-auto pb-32 print:hidden">
        {/* Header */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📐</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => saveName(name)}
              placeholder={shapeLabel(lang, sheet.shape)}
              className="flex-1 bg-transparent text-xl font-display font-bold outline-none border-b border-transparent focus:border-amber-500"
            />
          </div>
          <div className="text-xs text-neutral-400 mb-3">
            {shapeLabel(lang, sheet.shape)} · {job.customer_name} · {prog.filled}/{prog.total}{" "}
            {mt(lang, "filled")}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={toggleStatus}
              className={`text-xs font-bold rounded-full px-3 py-2 border ${
                status === "ready"
                  ? "bg-green-600/20 border-green-500 text-green-300"
                  : "bg-neutral-800 border-neutral-600 text-neutral-200"
              }`}
            >
              {status === "ready" ? `✓ ${mt(lang, "ready")}` : mt(lang, "readyToggle")}
            </button>
            <button
              onClick={() => window.print()}
              className="text-xs font-bold rounded-full px-3 py-2 border bg-neutral-800 border-neutral-600 text-neutral-200"
            >
              🖨 {mt(lang, "printSheet")}
            </button>
            <button
              onClick={deleteSheet}
              className="text-xs font-bold rounded-full px-3 py-2 border bg-red-950/40 border-red-800 text-red-300"
            >
              {mt(lang, "deleteSheet")}
            </button>
            <span className="ml-auto text-xs text-neutral-500">
              {saveState === "saving"
                ? mt(lang, "saving")
                : saveState === "saved"
                  ? `✓ ${mt(lang, "savedAll")}`
                  : ""}
            </span>
          </div>
          {/* Units */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[11px] text-neutral-400">{mt(lang, "unitsLabel")}:</span>
            {(
              [
                ["in", `${mt(lang, "unitsIn")} (")`],
                ["ftin", `${mt(lang, "unitsFtIn")} (' ")`],
              ] as const
            ).map(([u, label]) => (
              <button
                key={u}
                onClick={() => set((d) => void (d.units = u))}
                className={`text-xs font-bold rounded-full px-3 py-1.5 border ${
                  units === u
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-neutral-700 bg-neutral-800 text-neutral-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sketch */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
          <div className="font-bold mb-1">{mt(lang, "sketch")}</div>
          {!isSpiral && !isWallRail && (
            <div className="text-xs text-neutral-500 mb-2">
              {mt(
                lang,
                sheet.shape === "level_run" || sheet.shape === "ramp"
                  ? "sketchHintLevel"
                  : "sketchHintPosts"
              )}
            </div>
          )}
          {/* View toggle — phones see one view at a time; md+ shows both */}
          <div className="flex gap-2 mb-3 md:hidden">
            {(
              [
                ["side", sideKey],
                ["front", frontKey],
              ] as const
            ).map(([vw, key]) => (
              <button
                key={vw}
                onClick={() => setView(vw)}
                className={`px-3 py-1.5 rounded-full border text-xs font-bold ${
                  view === vw
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-neutral-700 bg-neutral-800 text-neutral-400"
                }`}
              >
                {mt(lang, key)}
              </button>
            ))}
          </div>
          <div className="md:grid md:grid-cols-2 md:gap-4 md:items-start">
            <div className={view === "side" ? "" : "hidden md:block"}>
              <div className="hidden md:block text-[11px] text-neutral-500 mb-1">
                {mt(lang, sideKey)}
              </div>
              <Sketch
                shape={sheet.shape}
                data={data}
                lang={lang}
                view="side"
                onTapStep={toggleStepPost}
                onTapPlatform={addPlatformPost}
              />
            </div>
            <div className={view === "front" ? "" : "hidden md:block"}>
              <div className="hidden md:block text-[11px] text-neutral-500 mb-1">
                {mt(lang, frontKey)}
              </div>
              <Sketch
                shape={sheet.shape}
                data={data}
                lang={lang}
                view="front"
                onTapStep={toggleStepPost}
                onTapPlatform={addPlatformPost}
              />
            </div>
          </div>
        </div>

        {/* Spiral geometry */}
        {isSpiral && data.spiral && (
          <Card title={mt(lang, "spiralTitle")}>
            <Grid>
              <MInput label={mt(lang, "floorToFloor")} value={data.spiral.floorToFloor}
                onChange={(v) => set((d) => void (d.spiral!.floorToFloor = v))} />
              <MInput label={mt(lang, "treadsCount")} placeholder="—" value={data.spiral.treads}
                onChange={(v) => set((d) => void (d.spiral!.treads = v))} />
              <MInput label={mt(lang, "rotation")} placeholder="°" value={data.spiral.rotationDeg}
                onChange={(v) => set((d) => void (d.spiral!.rotationDeg = v))} />
              <MInput label={mt(lang, "diameter")} value={data.spiral.diameter}
                onChange={(v) => set((d) => void (d.spiral!.diameter = v))} />
              <MInput label={mt(lang, "columnSize")} value={data.spiral.columnSize}
                onChange={(v) => set((d) => void (d.spiral!.columnSize = v))} />
              <MInput label={mt(lang, "clearWidth")} value={data.spiral.clearWidth}
                onChange={(v) => set((d) => void (d.spiral!.clearWidth = v))} />
            </Grid>
            <div className="mt-3">
              <div className="text-[11px] text-neutral-400 mb-1">{mt(lang, "direction")}</div>
              <div className="flex gap-2">
                {(["ccw", "cw"] as const).map((dir) => (
                  <button key={dir}
                    onClick={() => set((d) => void (d.spiral!.direction = dir))}
                    className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
                      data.spiral!.direction === dir
                        ? "border-amber-500 bg-amber-500/10 text-amber-300"
                        : "border-neutral-700 bg-neutral-800 text-neutral-300"
                    }`}>
                    {dir === "ccw" ? "⟲" : "⟳"} {mt(lang, dir)}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <MInput label={mt(lang, "landingNote")} placeholder="—" value={data.spiral.landingNote}
                onChange={(v) => set((d) => void (d.spiral!.landingNote = v))} />
            </div>
          </Card>
        )}

        {/* Flights — one measured row per step */}
        {flights.map(({ seg, i }, fi) => (
          <Card
            key={i}
            title={
              flights.length > 1
                ? `${mt(lang, fi === 0 ? "lowerFlight" : "upperFlight")}`
                : mt(lang, "steps")
            }
          >
            {/* header row only where the compact grid shows (sm+) */}
            <div className="hidden sm:grid grid-cols-[2.2rem_1fr_1fr_1fr] gap-2 items-end mb-1 text-[11px] text-neutral-400">
              <span>#</span>
              <span>{mt(lang, "rise")}</span>
              <span>{mt(lang, "run")}</span>
              <span>{mt(lang, "nosing")}</span>
            </div>
            {seg.steps.map((st, si) => (
              <div
                key={si}
                className="mb-3 rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 sm:mb-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:grid sm:grid-cols-[2.2rem_1fr_1fr_1fr] sm:gap-2 sm:items-center"
              >
                <div className="sm:hidden text-xs font-bold text-amber-400 mb-2">
                  {mt(lang, "step")} {stepNumber(flights, fi, si)}
                </div>
                <span className="hidden sm:block text-sm font-bold text-neutral-400 text-center border border-neutral-800 rounded-full w-7 h-7 leading-[26px]">
                  {stepNumber(flights, fi, si)}
                </span>
                <div className="grid grid-cols-1 gap-2 sm:contents">
                  <MInput label={mt(lang, "rise")} labelClass="sm:hidden" value={st.rise}
                    onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].rise = v))} />
                  <MInput label={mt(lang, "run")} labelClass="sm:hidden" value={st.run}
                    onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].run = v))} />
                  <MInput label={mt(lang, "nosing")} labelClass="sm:hidden" value={st.nosing}
                    onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].nosing = v))} />
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 mt-2 mb-3">
              <SmallBtn onClick={() => set((d) => void (d.segments[i] as FlightSegment).steps.push({ rise: "", run: "", nosing: "" }))}>
                {mt(lang, "addStep")}
              </SmallBtn>
              <SmallBtn
                onClick={() =>
                  set((d) => {
                    const fl = d.segments[i] as FlightSegment;
                    if (fl.steps.length > 1) {
                      fl.steps.pop();
                      d.posts = d.posts.filter(
                        (p) => !(p.segIdx === i && p.stepIdx !== null && p.stepIdx >= fl.steps.length)
                      );
                    }
                  })
                }
              >
                {mt(lang, "removeStep")}
              </SmallBtn>
              <SmallBtn
                onClick={() =>
                  set((d) => {
                    const fl = d.segments[i] as FlightSegment;
                    const s1 = fl.steps[0];
                    fl.steps = fl.steps.map(() => ({ ...s1 }));
                  })
                }
              >
                {mt(lang, "copyToAll")}
              </SmallBtn>
            </div>
            <Grid>
              <MInput label={mt(lang, "width")} value={seg.width}
                onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).width = v))} />
              <MInput label={mt(lang, "stairAngle")} value={seg.angleDeg} placeholder="°"
                onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).angleDeg = v))} />
            </Grid>
            <div className="mt-3">
              <MInput label={`${mt(lang, "angleBreak")} — ${mt(lang, "angleBreakHint")}`}
                placeholder="—" value={seg.angleBreak}
                onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).angleBreak = v))} />
            </div>
          </Card>
        ))}

        {/* Platforms / landings */}
        {platforms.map(({ seg, i }) => (
          <Card key={i} title={mt(lang, seg.turn === "none" ? "platform" : "landing")}>
            <Grid>
              <MInput label={mt(lang, "length")} value={seg.length}
                onChange={(v) => set((d) => void ((d.segments[i] as PlatformSegment).length = v))} />
              <MInput label={mt(lang, "depth")} value={seg.depth}
                onChange={(v) => set((d) => void ((d.segments[i] as PlatformSegment).depth = v))} />
              <MInput label={`${mt(lang, "slope")} — ${mt(lang, "slopeHint")}`} value={seg.slope}
                onChange={(v) => set((d) => void ((d.segments[i] as PlatformSegment).slope = v))} />
              <MInput label={mt(lang, "slopeDir")} placeholder="—" value={seg.slopeDir}
                onChange={(v) => set((d) => void ((d.segments[i] as PlatformSegment).slopeDir = v))} />
            </Grid>
            {(seg.turn === "left" || seg.turn === "right") && (
              <div className="mt-3">
                <div className="text-[11px] text-neutral-400 mb-1">{mt(lang, "turn")}</div>
                <div className="flex gap-2">
                  {(["left", "right"] as const).map((tn) => (
                    <button key={tn}
                      onClick={() => set((d) => void ((d.segments[i] as PlatformSegment).turn = tn))}
                      className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
                        seg.turn === tn
                          ? "border-amber-500 bg-amber-500/10 text-amber-300"
                          : "border-neutral-700 bg-neutral-800 text-neutral-300"
                      }`}>
                      {tn === "left" ? "↰" : "↱"} {mt(lang, tn === "left" ? "turnLeft" : "turnRight")}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}

        {/* Ramp */}
        {ramp && (
          <Card title={mt(lang, "shape_ramp")}>
            <Grid>
              <MInput label={mt(lang, "length")} value={ramp.length}
                onChange={(v) => set((d) => void ((d.segments[0] as RampSegment).length = v))} />
              <MInput label={mt(lang, "totalRise")} value={ramp.rise}
                onChange={(v) => set((d) => void ((d.segments[0] as RampSegment).rise = v))} />
              <MInput label={mt(lang, "stairAngle")} value={ramp.angleDeg} placeholder="°"
                onChange={(v) => set((d) => void ((d.segments[0] as RampSegment).angleDeg = v))} />
              <MInput label={mt(lang, "width")} value={ramp.width}
                onChange={(v) => set((d) => void ((d.segments[0] as RampSegment).width = v))} />
            </Grid>
          </Card>
        )}

        {/* Posts */}
        {!isSpiral && !isWallRail && (
          <Card title={`${mt(lang, "posts")} (${posts.length})`}>
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
                  <Grid>
                    {po.stepIdx !== null ? (
                      <MInput label={mt(lang, "fromNosing")} value={po.fromNosing}
                        onChange={(v) => setPost(set, po.id, "fromNosing", v)} />
                    ) : (
                      <MInput label={mt(lang, "alongPlatform")} value={po.pos}
                        onChange={(v) => setPost(set, po.id, "pos", v)} />
                    )}
                    <MInput label={mt(lang, "fromEdge")} value={po.fromEdge}
                      onChange={(v) => setPost(set, po.id, "fromEdge", v)} />
                    <MSelect label={mt(lang, "mountType")} value={po.mount}
                      options={[...MOUNT_OPTIONS]} lang={lang}
                      onChange={(v) => setPost(set, po.id, "mount", v)} />
                    <MSelect label={mt(lang, "anchorInto")} value={po.anchor}
                      options={[...ANCHOR_OPTIONS]} lang={lang}
                      onChange={(v) => setPost(set, po.id, "anchor", v)} />
                  </Grid>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Railing */}
        <Card title={mt(lang, "railSection")}>
          <Grid>
            <MSelect label={mt(lang, "railKind")} value={data.rail.kind}
              options={[...RAIL_KIND_OPTIONS]} lang={lang}
              onChange={(v) => set((d) => void (d.rail.kind = v))} />
            <MInput label={mt(lang, "railHeight")} value={data.rail.height}
              onChange={(v) => set((d) => void (d.rail.height = v))} />
            {!isWallRail && (
              <MSelect label={mt(lang, "railSide")} value={data.rail.side}
                options={[...RAIL_SIDE_OPTIONS]} lang={lang}
                onChange={(v) => set((d) => void (d.rail.side = v))} />
            )}
            <MInput label={mt(lang, "extensions")} value={data.rail.extensions}
              onChange={(v) => set((d) => void (d.rail.extensions = v))} />
            <MInput label={mt(lang, "returnsLabel")} placeholder="—" value={data.rail.returns}
              onChange={(v) => set((d) => void (d.rail.returns = v))} />
            {isWallRail && (
              <MInput label={mt(lang, "brackets")} placeholder="—" value={data.rail.brackets}
                onChange={(v) => set((d) => void (d.rail.brackets = v))} />
            )}
          </Grid>
        </Card>

        {/* Materials */}
        <Card title={mt(lang, "materialsTitle")}>
          <div className="space-y-3">
            <PresetInput label={mt(lang, "matPost")} value={data.materials.post}
              presets={[...MATERIAL_PRESETS.post]}
              onChange={(v) => set((d) => void (d.materials.post = v))} />
            <PresetInput label={mt(lang, "matTopRail")} value={data.materials.topRail}
              presets={[...MATERIAL_PRESETS.topRail]}
              onChange={(v) => set((d) => void (d.materials.topRail = v))} />
            <PresetInput label={mt(lang, "matPicket")} value={data.materials.picket}
              presets={[...MATERIAL_PRESETS.picket]}
              onChange={(v) => set((d) => void (d.materials.picket = v))} />
            <Grid>
              <MInput label={mt(lang, "matPicketSpacing")} value={data.materials.picketSpacing}
                onChange={(v) => set((d) => void (d.materials.picketSpacing = v))} />
              <MSelect label={mt(lang, "matBottomRail")} value={data.materials.bottomRail}
                options={[...MATERIAL_PRESETS.bottomRail]} lang={lang}
                onChange={(v) => set((d) => void (d.materials.bottomRail = v))} />
              <MSelect label={mt(lang, "finish")} value={data.materials.finish}
                options={[...SPEC_OPTIONS.finish_type]} lang={lang} spec
                onChange={(v) => set((d) => void (d.materials.finish = v))} />
              <MSelect label={mt(lang, "color")} value={data.materials.color}
                options={[...SPEC_OPTIONS.color]} lang={lang} spec
                onChange={(v) => set((d) => void (d.materials.color = v))} />
            </Grid>
            <MInput label={mt(lang, "matNotes")} placeholder="—" value={data.materials.notes}
              onChange={(v) => set((d) => void (d.materials.notes = v))} />
          </div>
        </Card>

        {/* Overall */}
        <Card title={mt(lang, "overallTitle")}>
          <Grid>
            <MInput label={mt(lang, "totalRise")} value={data.overall.totalRise}
              onChange={(v) => set((d) => void (d.overall.totalRise = v))} />
            <MInput label={mt(lang, "totalRun")} value={data.overall.totalRun}
              onChange={(v) => set((d) => void (d.overall.totalRun = v))} />
            {!isSpiral && (
              <MInput label={mt(lang, "rakeLength")} value={data.overall.rakeLength}
                onChange={(v) => set((d) => void (d.overall.rakeLength = v))} />
            )}
          </Grid>
          <div className="mt-3">
            <div className="text-[11px] text-neutral-400 mb-1">{mt(lang, "notes")}</div>
            <textarea
              value={data.overall.notes}
              onChange={(e) => set((d) => void (d.overall.notes = e.target.value))}
              rows={3}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-base"
            />
          </div>
        </Card>

        {/* Photos + markup */}
        <Card title={mt(lang, "photosTitle")}>
          <div className="text-xs text-neutral-500 mb-3">{mt(lang, "photosHint")}</div>
          <PhotoMarkup jobId={job.id} sheetName={name || shapeLabel(lang, sheet.shape)} lang={lang} />
        </Card>
      </div>

      {/* Fraction quick-keys */}
      {fracBar && (
        <div className="fixed bottom-0 inset-x-0 bg-neutral-900/95 border-t border-neutral-700 p-2 flex gap-1.5 overflow-x-auto print:hidden z-40">
          {fracTokens.map((f) => (
            <button
              key={f}
              onPointerDown={(e) => {
                e.preventDefault();
                insertToken(f);
              }}
              className="shrink-0 px-3 py-2.5 rounded-lg bg-neutral-800 border border-neutral-600 text-amber-300 font-bold text-sm"
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Print-only branded sheet */}
      <PrintSheet
        job={job}
        sheet={{ ...sheet, name: name || null, status }}
        data={data}
        lang={lang}
        workerName={workerName}
        posts={posts}
      />
    </PlaceholderCtx.Provider>
  );
}

// Sequential step numbering across flights (bottom flight first).
function stepNumber(
  flights: { seg: FlightSegment; i: number }[],
  fi: number,
  si: number
): number {
  let n = 0;
  for (let k = 0; k < fi; k++) n += flights[k].seg.steps.length;
  return n + si + 1;
}

function postStepNumber(data: MeasureData, po: PostMeasure): number {
  let n = 0;
  for (let si = 0; si < data.segments.length; si++) {
    const seg = data.segments[si];
    if (seg.kind !== "flight") continue;
    if (si === po.segIdx) return n + (po.stepIdx ?? 0) + 1;
    n += seg.steps.length;
  }
  return (po.stepIdx ?? 0) + 1;
}

function setPost(
  set: (fn: (d: MeasureData) => void) => void,
  id: string,
  key: keyof PostMeasure,
  value: string
) {
  set((d) => {
    const po = d.posts.find((p) => p.id === id);
    if (po) (po[key] as string) = value;
  });
}

// ---- Small UI pieces -------------------------------------------------------

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
      <div className="font-bold mb-3">{title}</div>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  // phones: one full-width field per row; larger screens: two columns
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function SmallBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-200">
      {children}
    </button>
  );
}

function MInput({
  label,
  labelClass = "",
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  labelClass?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const unitPh = useContext(PlaceholderCtx);
  return (
    <label className="block min-w-0">
      {label && (
        <span className={`text-[11px] text-neutral-400 block mb-1 ${labelClass}`}>
          {label}
        </span>
      )}
      <input
        data-m="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || unitPh}
        autoComplete="off"
        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-2.5 text-base"
      />
    </label>
  );
}

function MSelect({
  label,
  value,
  options,
  onChange,
  lang,
  spec = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  lang: string;
  spec?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-[11px] text-neutral-400 block mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-2.5 text-base appearance-none"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {spec ? specValue(lang, o) : optLabel(lang, o)}
          </option>
        ))}
      </select>
    </label>
  );
}

function PresetInput({
  label,
  value,
  presets,
  onChange,
}: {
  label: string;
  value: string;
  presets: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <MInput label={label} value={value} onChange={onChange} placeholder="—" />
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {presets.map((pr) => (
          <button key={pr} onClick={() => onChange(pr)}
            className={`text-xs px-2.5 py-1.5 rounded-full border ${
              value === pr
                ? "border-amber-500 bg-amber-500/10 text-amber-300"
                : "border-neutral-700 bg-neutral-800/70 text-neutral-400"
            }`}>
            {pr}
          </button>
        ))}
      </div>
    </div>
  );
}
