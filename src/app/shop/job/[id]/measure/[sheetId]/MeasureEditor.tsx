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
  newPost,
  requiredPhotoSlots,
  OPTIONAL_PHOTO_SLOTS,
  sheetProgress,
  type FlightSegment,
  type MeasureData,
  type MeasureSheet,
  type PlatformSegment,
  type PostMeasure,
  type RampSegment,
} from "@/lib/shop/measure";
import {
  runChecks,
  requiredGaps,
  formatIn,
  type CheckResult,
} from "@/lib/shop/measure-checks";
import { mt, optLabel, shapeLabel } from "@/lib/shop/measure-i18n";
import { SPEC_OPTIONS, specValue } from "@/lib/shop/i18n";
import Sketch, { sketchViews, sortPlatPosts } from "./Sketch";
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

// Posts in the same order the sketch numbers them (walk segments bottom-up;
// several posts may share a tread, landing posts sort by measured position).
export function orderedPosts(data: MeasureData): PostMeasure[] {
  const out: PostMeasure[] = [];
  data.segments.forEach((seg, si) => {
    if (seg.kind === "flight") {
      seg.steps.forEach((_, i) => {
        out.push(...data.posts.filter((po) => po.segIdx === si && po.stepIdx === i));
      });
    } else {
      out.push(...sortPlatPosts(data.posts.filter((po) => po.segIdx === si)));
    }
  });
  return out;
}

export default function MeasureEditor({
  job,
  sheet,
  lang,
  workerName,
  isAdmin = false,
  nameById = {},
}: {
  job: Job;
  sheet: MeasureSheet;
  lang: string;
  workerName: string;
  isAdmin?: boolean;
  nameById?: Record<string, string>;
}) {
  const router = useRouter();
  const [data, setData] = useState<MeasureData>(sheet.data);
  const [name, setName] = useState(sheet.name || "");
  const [status, setStatus] = useState(sheet.status);
  const [rev, setRev] = useState(sheet.current_rev || 0);
  const [reviewComment, setReviewComment] = useState(sheet.review_comment);
  const [info, setInfo] = useState<string | null>(null);
  const [photoSlot, setPhotoSlot] = useState<{ slot: string; label: string } | null>(null);
  const statusRef = useRef(sheet.status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  const [saveState, setSaveState] = useState<
    "idle" | "dirty" | "saving" | "saved" | "error" | "conflict"
  >("idle");
  const [opErr, setOpErr] = useState<string | null>(null);
  const [fracBar, setFracBar] = useState(false);
  const [view, setView] = useState<"side" | "front">("side");
  const firstRender = useRef(true);

  // Serialized mutation pipeline: autosave/rename/status/delete run one at a
  // time in order, so responses can't apply out of order and the concurrency
  // base (updated_at) stays fresh.
  const dataRef = useRef(data);
  const dirtyRef = useRef(false);
  const conflictRef = useRef(false);
  const baseUpdatedAt = useRef(sheet.updated_at);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const saveQueuedRef = useRef(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const p = queueRef.current.then(fn, fn);
    queueRef.current = p.then(
      () => undefined,
      () => undefined
    );
    return p;
  }

  async function doSave(): Promise<void> {
    if (conflictRef.current) return;
    const payload = dataRef.current;
    setSaveState("saving");
    try {
      const res = await fetch("/shop/api/measure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "update",
          id: sheet.id,
          jobId: job.id,
          data: payload,
          baseUpdatedAt: baseUpdatedAt.current,
        }),
      });
      if (res.status === 409) {
        conflictRef.current = true;
        setSaveState("conflict");
        return;
      }
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Save failed");
      if (d.updated_at) baseUpdatedAt.current = d.updated_at;
      // Any edit takes an approved/submitted sheet back to measuring.
      if (d.status && d.status !== statusRef.current) {
        const was = statusRef.current;
        setStatus(d.status);
        if (was === "approved" || was === "submitted") {
          setInfo(mt(lang, "editWarning"));
        }
      }
      if (dataRef.current === payload) {
        dirtyRef.current = false;
        setSaveState("saved");
      }
      // else: newer edits exist; their own debounce triggers the next save
    } catch {
      setSaveState("error");
    }
  }

  function requestSave() {
    if (saveQueuedRef.current || conflictRef.current) return;
    saveQueuedRef.current = true;
    enqueue(async () => {
      saveQueuedRef.current = false;
      if (!dirtyRef.current) return;
      await doSave();
    });
  }

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
    dirtyRef.current = true;
    setSaveState("dirty");
    const t = setTimeout(requestSave, 900);
    return () => clearTimeout(t);
    // requestSave reads only refs, so it is stable across renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Protect measurements on the way out: warn before closing with unsaved
  // edits, and fire a keepalive save when the page or component goes away.
  useEffect(() => {
    const flush = () => {
      if (!dirtyRef.current || conflictRef.current) return;
      try {
        fetch("/shop/api/measure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            type: "update",
            id: sheet.id,
            jobId: job.id,
            data: dataRef.current,
            baseUpdatedAt: baseUpdatedAt.current,
          }),
        });
      } catch {
        // last-chance save; nothing further to do
      }
    };
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", warn);
      flush(); // in-app navigation unmounts the editor
    };
  }, [sheet.id, job.id]);

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

  function addStepPost(segIdx: number, stepIdx: number) {
    set((d) => {
      d.posts.push(newPost(segIdx, stepIdx));
    });
  }

  function addPlatformPost(segIdx: number) {
    set((d) => {
      d.posts.push(newPost(segIdx, null));
    });
  }

  function removePost(id: string) {
    set((d) => {
      d.posts = d.posts.filter((p) => p.id !== id);
    });
  }

  // Small mutations share the queue and surface failures instead of
  // pretending they worked. Returns the response body, or null on failure.
  async function mutate(
    body: Record<string, unknown>,
    failMsg: string
  ): Promise<Record<string, unknown> | null> {
    return enqueue(async () => {
      try {
        const res = await fetch("/shop/api/measure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, id: sheet.id, jobId: job.id }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || failMsg);
        if (d.updated_at) baseUpdatedAt.current = d.updated_at;
        setOpErr(null);
        return d as Record<string, unknown>;
      } catch (e) {
        setOpErr(e instanceof Error ? e.message : failMsg);
        return null;
      }
    });
  }

  async function saveName(n: string) {
    await mutate({ type: "rename", name: n }, "Rename failed");
  }

  async function submitSheet() {
    const d = await mutate({ type: "submit" }, "Submit failed");
    if (d) {
      setStatus("submitted");
      setInfo(null);
      setReviewComment(null);
    }
  }

  async function approveSheet() {
    const d = await mutate({ type: "approve" }, "Approve failed");
    if (d) {
      setStatus("approved");
      if (typeof d.rev === "number") setRev(d.rev);
      setInfo(null);
    }
  }

  async function sendBackSheet() {
    const comment = window.prompt(mt(lang, "sendBackPrompt")) ?? "";
    const d = await mutate({ type: "sendback", comment }, "Send back failed");
    if (d) {
      setStatus("in_progress");
      setReviewComment(comment || null);
    }
  }

  async function deleteSheet() {
    if (!confirm(mt(lang, "confirmDelete"))) return;
    const ok = await mutate({ type: "delete" }, "Delete failed");
    if (ok) {
      dirtyRef.current = false; // nothing left to save on unmount
      router.push(`/shop/job/${job.id}/measure`);
    }
  }

  const prog = sheetProgress(data);
  const posts = orderedPosts(data);
  const checks = runChecks(data, sheet.shape);
  const gaps = requiredGaps(data, sheet.shape);
  const redChecks = checks.filter((c) => c.level === "red");
  const canSubmit = gaps.length === 0 && redChecks.length === 0;
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
        {saveState === "conflict" && (
          <div className="bg-red-950/50 border border-red-700 rounded-xl p-3 mb-4 flex items-center gap-3">
            <span className="text-sm text-red-200 flex-1">
              ⚠ {mt(lang, "conflictMsg")}
            </span>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-bold bg-red-700 text-white rounded-full px-3 py-2 shrink-0"
            >
              {mt(lang, "reload")}
            </button>
          </div>
        )}
        {opErr && (
          <div className="bg-red-950/50 border border-red-700 rounded-xl p-3 mb-4 text-sm text-red-200">
            ⚠ {opErr}
          </div>
        )}
        {info && (
          <div className="bg-amber-950/40 border border-amber-700 rounded-xl p-3 mb-4 text-sm text-amber-200 flex items-center gap-3">
            <span className="flex-1">⚠ {info}</span>
            <button onClick={() => setInfo(null)} className="text-xs border border-amber-700 rounded-full px-2 py-1">✕</button>
          </div>
        )}
        {status === "in_progress" && reviewComment && (
          <div className="bg-amber-950/40 border border-amber-700 rounded-xl p-3 mb-4 text-sm text-amber-200">
            📝 {mt(lang, "reviewComment")}: {reviewComment}
          </div>
        )}
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
            <span
              className={`text-xs font-bold rounded-full px-3 py-2 border ${
                status === "approved"
                  ? "bg-green-600/20 border-green-500 text-green-300"
                  : status === "submitted"
                    ? "bg-amber-500/10 border-amber-500 text-amber-300"
                    : "bg-neutral-800 border-neutral-600 text-neutral-300"
              }`}
            >
              {status === "approved"
                ? `✓ ${mt(lang, "approvedBadge")} · ${mt(lang, "revLabel")} ${rev}`
                : status === "submitted"
                  ? mt(lang, "submittedBadge")
                  : mt(lang, "inProgress")}
            </span>
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
            <span className="ml-auto text-xs">
              {saveState === "saving" && (
                <span className="text-neutral-500">{mt(lang, "saving")}</span>
              )}
              {saveState === "saved" && (
                <span className="text-neutral-500">✓ {mt(lang, "savedAll")}</span>
              )}
              {saveState === "dirty" && (
                <span className="text-amber-400">● {mt(lang, "unsaved")}</span>
              )}
              {saveState === "error" && (
                <button
                  onClick={requestSave}
                  className="text-red-300 border border-red-800 bg-red-950/40 rounded-full px-2.5 py-1 font-bold"
                >
                  ⚠ {mt(lang, "saveFailed")} — {mt(lang, "retry")}
                </button>
              )}
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

        {/* Datums & orientation — where every measurement originates */}
        <Card title={`🧭 ${mt(lang, "datumsTitle")}`}>
          <div className="text-[11px] text-neutral-400 mb-1">{mt(lang, "orientationLbl")}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {(["left_wall", "right_wall", "both_open", "both_wall"] as const).map((o) => (
              <button
                key={o}
                onClick={() => set((d) => void (d.datums.orientation = o))}
                className={`px-3 py-2.5 rounded-lg border text-sm font-semibold text-left ${
                  data.datums.orientation === o
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-neutral-700 bg-neutral-800 text-neutral-300"
                }`}
              >
                {mt(lang, `orient_${o}`)}
              </button>
            ))}
          </div>
          <Grid>
            <MInput label={mt(lang, "bottomDatum")} placeholder="—" value={data.datums.bottomDatum}
              onChange={(v) => set((d) => void (d.datums.bottomDatum = v))} />
            <MInput label={mt(lang, "topDatum")} placeholder="—" value={data.datums.topDatum}
              onChange={(v) => set((d) => void (d.datums.topDatum = v))} />
            <MInput label={mt(lang, "nosingRefLbl")} placeholder="—" value={data.datums.nosingRef}
              onChange={(v) => set((d) => void (d.datums.nosingRef = v))} />
          </Grid>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <ChipRow
              label={mt(lang, "postRefLbl")}
              value={data.datums.postRef}
              options={[
                ["centerline", mt(lang, "postRef_centerline")],
                ["face", mt(lang, "postRef_face")],
              ]}
              onChange={(v) => set((d) => void (d.datums.postRef = v as "" | "centerline" | "face"))}
            />
            <ChipRow
              label={mt(lang, "surfaceState")}
              value={data.datums.surfaceState}
              options={[
                ["finished", mt(lang, "surf_finished")],
                ["unfinished", mt(lang, "surf_unfinished")],
                ["mixed", mt(lang, "surf_mixed")],
              ]}
              onChange={(v) =>
                set((d) => void (d.datums.surfaceState = v as "" | "finished" | "unfinished" | "mixed"))
              }
            />
          </div>
        </Card>

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
                onTapStep={addStepPost}
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
                onTapStep={addStepPost}
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
            {/* typical step: enter once, correct exceptions */}
            <NominalFill
              lang={lang}
              onFill={(nr, nu) =>
                set((d) => {
                  const fl = d.segments[i] as FlightSegment;
                  fl.steps = fl.steps.map((st) => ({
                    rise: nr || st.rise,
                    run: nu || st.run,
                    nosing: st.nosing,
                  }));
                })
              }
            />

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
                  <details className="mt-3">
                    <summary className="text-xs text-amber-400/80 cursor-pointer select-none">
                      + {mt(lang, "postMore")}
                    </summary>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <MInput label={mt(lang, "postPlate")} placeholder="—" value={po.plate}
                        onChange={(v) => setPost(set, po.id, "plate", v)} />
                      <MInput label={mt(lang, "postAnchors")} placeholder="—" value={po.anchors}
                        onChange={(v) => setPost(set, po.id, "anchors", v)} />
                      <MInput label={mt(lang, "postSubstrate")} placeholder="—" value={po.substrate}
                        onChange={(v) => setPost(set, po.id, "substrate", v)} />
                      <MInput label={mt(lang, "postEdgeDist")} value={po.edgeDist}
                        onChange={(v) => setPost(set, po.id, "edgeDist", v)} />
                      <MInput label={mt(lang, "postObstruction")} placeholder="—" value={po.obstruction}
                        onChange={(v) => setPost(set, po.id, "obstruction", v)} />
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

        {/* Site & finish conditions — what surface existed when measured */}
        <Card title={`🧱 ${mt(lang, "finishTitle")}`}>
          <Grid>
            <MInput label={mt(lang, "bottomSurface")} placeholder="—" value={data.finish.bottomSurface}
              onChange={(v) => set((d) => void (d.finish.bottomSurface = v))} />
            <MInput label={mt(lang, "topSurface")} placeholder="—" value={data.finish.topSurface}
              onChange={(v) => set((d) => void (d.finish.topSurface = v))} />
            <MInput label={mt(lang, "futureTopping")} placeholder="—" value={data.finish.futureTopping}
              onChange={(v) => set((d) => void (d.finish.futureTopping = v))} />
            <MInput label={mt(lang, "treadCovering")} placeholder="—" value={data.finish.treadCovering}
              onChange={(v) => set((d) => void (d.finish.treadCovering = v))} />
            <MInput label={mt(lang, "wallFinish")} placeholder="—" value={data.finish.wallFinish}
              onChange={(v) => set((d) => void (d.finish.wallFinish = v))} />
            <MInput label={mt(lang, "demoPending")} placeholder="—" value={data.finish.demoPending}
              onChange={(v) => set((d) => void (d.finish.demoPending = v))} />
          </Grid>
          <button
            onClick={() => set((d) => void (d.finish.verifyAfterFinishes = !d.finish.verifyAfterFinishes))}
            className={`mt-3 px-3 py-2.5 rounded-lg border text-sm font-semibold ${
              data.finish.verifyAfterFinishes
                ? "border-amber-500 bg-amber-500/10 text-amber-300"
                : "border-neutral-700 bg-neutral-800 text-neutral-300"
            }`}
          >
            {data.finish.verifyAfterFinishes ? "☑" : "☐"} {mt(lang, "verifyAfterFinishes")}
          </button>
        </Card>

        {/* Fabrication details (conditional per shape) */}
        <Card title={`🔩 ${mt(lang, "fabTitle")}`}>
          <Grid>
            {data.segments.length > 1 && (
              <>
                <MInput label={mt(lang, "fabCorners")} placeholder="—" value={data.fab.corners}
                  onChange={(v) => set((d) => void (d.fab.corners = v))} />
                <MInput label={mt(lang, "fabFlightConnection")} placeholder="—" value={data.fab.flightConnection}
                  onChange={(v) => set((d) => void (d.fab.flightConnection = v))} />
              </>
            )}
            {!isWallRail && (
              <>
                <MInput label={mt(lang, "fabBottomClearance")} value={data.fab.bottomClearance}
                  onChange={(v) => set((d) => void (d.fab.bottomClearance = v))} />
                <MInput label={mt(lang, "fabInfill")} placeholder="—" value={data.fab.infill}
                  onChange={(v) => set((d) => void (d.fab.infill = v))} />
              </>
            )}
            <MInput label={mt(lang, "fabSplices")} placeholder="—" value={data.fab.splices}
              onChange={(v) => set((d) => void (d.fab.splices = v))} />
            <MInput label={mt(lang, "fabMaxPiece")} placeholder="—" value={data.fab.maxPiece}
              onChange={(v) => set((d) => void (d.fab.maxPiece = v))} />
            <MInput label={mt(lang, "fabAccess")} placeholder="—" value={data.fab.access}
              onChange={(v) => set((d) => void (d.fab.access = v))} />
            {sheet.shape === "level_run" && (
              <MInput label={mt(lang, "fabGate")} placeholder="—" value={data.fab.gate}
                onChange={(v) => set((d) => void (d.fab.gate = v))} />
            )}
            <MInput label={mt(lang, "fabTouchup")} placeholder="—" value={data.fab.touchup}
              onChange={(v) => set((d) => void (d.fab.touchup = v))} />
          </Grid>
        </Card>

        {/* Control dimensions — independent measurements the software cross-checks */}
        <Card title={`🎯 ${mt(lang, "controlsTitle")}`}>
          <div className="text-xs text-neutral-500 mb-3">{mt(lang, "controlsHint")}</div>
          <Grid>
            {!isSpiral && sheet.shape !== "level_run" && sheet.shape !== "ramp" && (
              <MInput label={mt(lang, "floorToFloor")} value={data.overall.floorToFloor}
                onChange={(v) => set((d) => void (d.overall.floorToFloor = v))} />
            )}
            <MInput label={mt(lang, "totalRise")} value={data.overall.totalRise}
              onChange={(v) => set((d) => void (d.overall.totalRise = v))} />
            <MInput label={mt(lang, "totalRun")} value={data.overall.totalRun}
              onChange={(v) => set((d) => void (d.overall.totalRun = v))} />
            {!isSpiral && (
              <MInput label={mt(lang, "rakeLength")} value={data.overall.rakeLength}
                onChange={(v) => set((d) => void (d.overall.rakeLength = v))} />
            )}
            {!isSpiral && sheet.shape !== "level_run" && (
              <>
                <MInput label={mt(lang, "widthBottom")} value={data.overall.widthBottom}
                  onChange={(v) => set((d) => void (d.overall.widthBottom = v))} />
                <MInput label={mt(lang, "widthMid")} value={data.overall.widthMid}
                  onChange={(v) => set((d) => void (d.overall.widthMid = v))} />
                <MInput label={mt(lang, "widthTop")} value={data.overall.widthTop}
                  onChange={(v) => set((d) => void (d.overall.widthTop = v))} />
              </>
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

        {/* Photo checklist — required evidence, slot by slot */}
        <Card title={`📷 ${mt(lang, "photoChecklist")}`}>
          <div className="text-xs text-neutral-500 mb-3">{mt(lang, "photosHint")}</div>
          <div className="space-y-2">
            {requiredPhotoSlots(sheet.shape).map((slot) => (
              <SlotRow key={slot} slot={slot} label={mt(lang, `slot_${slot}`)} required
                data={data} lang={lang}
                onTake={() => setPhotoSlot({ slot, label: mt(lang, `slot_${slot}`) })} />
            ))}
            {OPTIONAL_PHOTO_SLOTS.map((slot) => (
              <SlotRow key={slot} slot={slot} label={mt(lang, `slot_${slot}`)} required={false}
                data={data} lang={lang}
                onTake={() => setPhotoSlot({ slot, label: mt(lang, `slot_${slot}`) })} />
            ))}
          </div>
        </Card>

        {/* Review & submit — checks, gaps, and the approval gate */}
        <Card title={`✅ ${mt(lang, "reviewTitle")}`}>
          <div className="text-xs text-neutral-500 mb-2">{mt(lang, "neverCorrects")}</div>
          <div className="space-y-1.5 mb-4">
            {checks.map((c, i) => (
              <CheckRow key={`${c.key}${i}`} c={c} lang={lang} />
            ))}
          </div>

          {gaps.length > 0 && (
            <div className="border border-neutral-700 rounded-lg p-3 mb-4 bg-neutral-950/60">
              <div className="text-xs font-bold text-neutral-300 mb-1.5">
                {mt(lang, "gapsTitle")} ({gaps.length})
              </div>
              <ul className="text-sm text-neutral-400 space-y-1">
                {gaps.map((g, i) => (
                  <li key={i}>
                    •{" "}
                    {g.key === "photo"
                      ? `${mt(lang, "gap_photo")}: ${mt(lang, `slot_${g.detail}`)}`
                      : `${mt(lang, `gap_${g.key}`)}${g.detail ? ` (${g.detail})` : ""}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status === "in_progress" && (
            <>
              {redChecks.length > 0 && (
                <div className="text-sm text-red-300 mb-2">⛔ {mt(lang, "redBlock")}</div>
              )}
              {canSubmit && (
                <div className="text-sm text-green-300 mb-2">✓ {mt(lang, "allClear")}</div>
              )}
              <button
                onClick={submitSheet}
                disabled={!canSubmit || saveState === "dirty" || saveState === "saving"}
                className="w-full bg-amber-500 text-black font-bold rounded-xl py-4 text-lg disabled:opacity-40"
              >
                {mt(lang, "submitReview")}
              </button>
            </>
          )}

          {status === "submitted" && (
            <div>
              <div className="text-sm font-bold text-amber-300 mb-1">
                {mt(lang, "submittedBadge")}
              </div>
              {sheet.submitted_by && nameById[sheet.submitted_by] && (
                <div className="text-xs text-neutral-400 mb-3">
                  {mt(lang, "submittedByLbl")}: {nameById[sheet.submitted_by]}
                </div>
              )}
              {isAdmin && (
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <button
                    onClick={approveSheet}
                    className="flex-1 bg-green-600 text-white font-bold rounded-xl py-4"
                  >
                    ✓ {mt(lang, "approve")}
                  </button>
                  <button
                    onClick={sendBackSheet}
                    className="flex-1 border border-neutral-600 bg-neutral-800 text-neutral-200 font-bold rounded-xl py-4"
                  >
                    ↩ {mt(lang, "sendBack")}
                  </button>
                </div>
              )}
            </div>
          )}

          {status === "approved" && (
            <div>
              <div className="text-sm font-bold text-green-300 mb-1">
                ✓ {mt(lang, "approvedBadge")} · {mt(lang, "revLabel")} {rev}
              </div>
              {sheet.approved_by && nameById[sheet.approved_by] && (
                <div className="text-xs text-neutral-400 mb-2">
                  {mt(lang, "approvedByLbl")}: {nameById[sheet.approved_by]}
                  {sheet.approved_at ? ` · ${new Date(sheet.approved_at).toLocaleString()}` : ""}
                </div>
              )}
              <div className="text-xs text-amber-300/80">⚠ {mt(lang, "editWarning")}</div>
            </div>
          )}
        </Card>
      </div>

      {/* Photo capture + markup modal */}
      {photoSlot && (
        <PhotoMarkup
          jobId={job.id}
          sheetName={name || shapeLabel(lang, sheet.shape)}
          lang={lang}
          slot={photoSlot.slot}
          slotLabel={photoSlot.label}
          onSaved={(path, strokes) => {
            set((d) => {
              d.photos = [
                ...d.photos.filter((p) => p.slot !== photoSlot.slot),
                { slot: photoSlot.slot, path, takenAt: new Date().toISOString() },
              ];
              if (strokes.length > 0) d.annotations[path] = strokes;
            });
            setPhotoSlot(null);
          }}
          onClose={() => setPhotoSlot(null)}
        />
      )}

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
        sheet={{ ...sheet, name: name || null, status, current_rev: rev }}
        data={data}
        lang={lang}
        workerName={workerName}
        posts={posts}
        nameById={nameById}
        checks={checks}
        gapCount={gaps.length}
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

function ChipRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-[11px] text-neutral-400 mb-1">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => onChange(value === val ? "" : val)}
            className={`px-3 py-2 rounded-lg border text-sm font-semibold ${
              value === val
                ? "border-amber-500 bg-amber-500/10 text-amber-300"
                : "border-neutral-700 bg-neutral-800 text-neutral-300"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}

function NominalFill({
  lang,
  onFill,
}: {
  lang: string;
  onFill: (rise: string, run: string) => void;
}) {
  const [nr, setNr] = useState("");
  const [nu, setNu] = useState("");
  return (
    <div className="border border-neutral-800 rounded-lg p-3 mb-3 bg-neutral-950/40">
      <div className="text-xs font-bold text-neutral-300 mb-2">
        {mt(lang, "nominalTitle")}
        <span className="font-normal text-neutral-500"> — {mt(lang, "fillHint")}</span>
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <MInput label={mt(lang, "nominalRise")} value={nr} onChange={setNr} />
        <MInput label={mt(lang, "nominalRun")} value={nu} onChange={setNu} />
        <button
          onClick={() => (nr || nu) && onFill(nr, nu)}
          className="px-3 py-2.5 rounded-lg bg-amber-500/90 text-black text-sm font-bold"
        >
          {mt(lang, "fillSteps")}
        </button>
      </div>
    </div>
  );
}

function SlotRow({
  slot,
  label,
  required,
  data,
  lang,
  onTake,
}: {
  slot: string;
  label: string;
  required: boolean;
  data: MeasureData;
  lang: string;
  onTake: () => void;
}) {
  const ph = data.photos.find((p) => p.slot === slot);
  return (
    <div className="flex items-center gap-3 border border-neutral-800 rounded-lg p-2.5 bg-neutral-950/40">
      <span className={`text-lg ${ph ? "" : "opacity-40"}`}>{ph ? "✅" : "📷"}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold truncate">{label}</span>
        <span className={`block text-[11px] ${required && !ph ? "text-red-400" : "text-neutral-500"}`}>
          {ph
            ? new Date(ph.takenAt).toLocaleString()
            : mt(lang, required ? "requiredLbl" : "optionalLbl")}
        </span>
      </span>
      <button
        onClick={onTake}
        className={`px-3 py-2 rounded-lg border text-xs font-bold shrink-0 ${
          ph
            ? "border-neutral-700 bg-neutral-800 text-neutral-300"
            : "border-amber-600 bg-amber-500/10 text-amber-300"
        }`}
      >
        {ph ? mt(lang, "retake") : mt(lang, "choosePhoto")}
      </button>
    </div>
  );
}

const LEVEL_STYLE: Record<string, string> = {
  green: "bg-green-600/20 border-green-500 text-green-300",
  yellow: "bg-amber-500/15 border-amber-500 text-amber-300",
  red: "bg-red-600/20 border-red-500 text-red-300",
  na: "bg-neutral-800 border-neutral-700 text-neutral-500",
};

function CheckRow({ c, lang }: { c: CheckResult; lang: string }) {
  const fmt = (n: number | null) =>
    n === null ? "—" : c.unit === "deg" ? `${n.toFixed(1)}°` : formatIn(n);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`text-[10px] font-bold rounded-full border px-2 py-0.5 shrink-0 w-24 text-center ${LEVEL_STYLE[c.level]}`}
      >
        {c.level === "na" ? "…" : mt(lang, c.level === "green" ? "levelGreen" : c.level === "yellow" ? "levelYellow" : "levelRed")}
      </span>
      <span className="flex-1 text-neutral-300 min-w-0">
        {mt(lang, `check_${c.key}`)}
        {c.detail ? ` ${c.detail}` : ""}
      </span>
      <span className="text-xs text-neutral-500 shrink-0 text-right">
        {c.level === "na"
          ? mt(lang, "checkNa")
          : `${mt(lang, "calcLbl")} ${fmt(c.expected)} · ${mt(lang, "measLbl")} ${fmt(c.actual)}${
              c.delta !== null && c.key !== "width_var"
                ? ` · ${mt(lang, "offByLbl")} ${c.unit === "deg" ? `${Math.abs(c.delta).toFixed(1)}°` : formatIn(Math.abs(c.delta))}`
                : ""
            }`}
      </span>
    </div>
  );
}
