"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job, OrgSettings } from "@/lib/shop/shared";
import {
  ANCHOR_OPTIONS,
  MATERIAL_PRESETS,
  MOUNT_OPTIONS,
  RAIL_KIND_OPTIONS,
  RAIL_SIDE_OPTIONS,
  newPost,
  newSpan,
  newFlightSegment,
  newPlatformSegment,
  blankRamp,
  blankCurve,
  ATTACH_TARGETS,
  METHODS_BY_ATTACH,
  HARDWARE_METHODS,
  HW_REQUIRED,
  FASTENER_METHODS,
  type TermHardware,
  requiredPhotoSlots,
  OPTIONAL_PHOTO_SLOTS,
  sheetProgress,
  normalizeMeasureData,
  type FlightSegment,
  type MeasureData,
  type FinishSpec,
  type MeasureSheet,
  type PlatformSegment,
  type PostMeasure,
  type RampSegment,
  type CurveSegment,
  type Termination,
  type WellDeliverable,
  type WellData,
  type FireEscapeData,
  type FireLevel,
  type FireCondition,
  type GateData,
  type FenceData,
  type FenceSegment,
  type BalconyData,
  newFenceSegment,
  FIRE_PURPOSES,
  CONDITION_RATINGS,
  newFireLevel,
  type WallBand,
  WELL_DELIVERABLES,
  newWallBand,
} from "@/lib/shop/measure";
import {
  runChecks,
  requiredGaps,
  formatIn,
  orderedPosts,
  mergeTolerances,
  wellClearance,
  type CheckResult,
} from "@/lib/shop/measure-checks";
import { mt, optLabel, shapeLabel } from "@/lib/shop/measure-i18n";
import { helpText } from "@/lib/shop/measure-help";
import { SPEC_OPTIONS, specValue } from "@/lib/shop/i18n";
import Sketch, { sketchViews, type SketchView } from "./Sketch";
import PlanDraw from "./PlanDraw";
import PhotoMarkup from "./PhotoMarkup";
import PrintSheet from "./PrintSheet";
import { queueEdit, clearEdit, getEdit } from "@/lib/shop/outbox";

const FRACTIONS = [
  '1/16"', '1/8"', '3/16"', '1/4"', '5/16"', '3/8"', '7/16"', '1/2"',
  '9/16"', '5/8"', '11/16"', '3/4"', '13/16"', '7/8"', '15/16"', "°",
];
// Tokens that glue directly onto the number (5 + ' = 5', not 5 ')
const NOSPACE = new Set(["'", '"', "°"]);

// Placeholder for measurement inputs, driven by the sheet's unit choice.
const PlaceholderCtx = createContext<string>("—");
// Leaf fields look up their own help text, so they need the language.
const LangCtx = createContext<string>("en");

type EditorStage = "setup" | "posts" | "level" | "steps" | "locations" | "specs" | "photos" | "review";
const StageCtx = createContext<EditorStage>("setup");

const EDITOR_STAGES: { id: EditorStage; icon: string; labelKey: string }[] = [
  { id: "setup", icon: "1", labelKey: "stageSite" },
  { id: "posts", icon: "2", labelKey: "stagePostsBasic" },
  { id: "level", icon: "3", labelKey: "stageLevelCheck" },
  { id: "steps", icon: "4", labelKey: "stageSteps" },
  { id: "locations", icon: "5", labelKey: "stageAnglesLocations" },
  { id: "specs", icon: "6", labelKey: "stageShop" },
  { id: "photos", icon: "7", labelKey: "stagePhotos" },
  { id: "review", icon: "8", labelKey: "stageReview" },
];

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

export default function MeasureEditor({
  job,
  sheet,
  lang,
  workerName,
  isAdmin = false,
  nameById = {},
  orgSettings,
  history = [],
}: {
  job: Job;
  sheet: MeasureSheet;
  lang: string;
  workerName: string;
  isAdmin?: boolean;
  nameById?: Record<string, string>;
  orgSettings?: OrgSettings;
  history?: { at: string; action: string; workerId: string | null }[];
}) {
  const router = useRouter();
  const [data, setData] = useState<MeasureData>(sheet.data);
  const [name, setName] = useState(sheet.name || "");
  const [status, setStatus] = useState(sheet.status);
  const [rev, setRev] = useState(sheet.current_rev || 0);
  const [reviewComment, setReviewComment] = useState(sheet.review_comment);
  const [info, setInfo] = useState<string | null>(null);
  const [photoSlot, setPhotoSlot] = useState<{ slot: string; label: string } | null>(null);
  const [placementMenu, setPlacementMenu] = useState<{ segIdx: number; stepIdx: number | null; side: "left" | "right" } | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [movingPostId, setMovingPostId] = useState<string | null>(null);
  const [slotBusy, setSlotBusy] = useState<string | null>(null);
  const [slotErr, setSlotErr] = useState<string | null>(null);
  const statusRef = useRef(sheet.status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  const [saveState, setSaveState] = useState<
    "idle" | "dirty" | "saving" | "saved" | "error" | "conflict" | "queued"
  >("idle");
  // True whenever this sheet has an edit sitting in the local queue that the
  // server has not taken yet.
  const [pendingLocal, setPendingLocal] = useState(false);
  const [restored, setRestored] = useState(false);
  const [online, setOnline] = useState(true);
  const [opErr, setOpErr] = useState<string | null>(null);
  const [fracBar, setFracBar] = useState(false);
  // Custom sheets open directly on the drawing canvas; otherwise the user
  // lands on the existing-site setup step.
  const [activeStage, setActiveStage] = useState<EditorStage>(sheet.shape === "custom" ? "steps" : "setup");
  const viewList = sketchViews(sheet.shape);
  const [view, setView] = useState<SketchView>(viewList[0][0]);
  const firstRender = useRef(true);

  // Serialized mutation pipeline: autosave/rename/status/delete run one at a
  // time in order, so responses can't apply out of order and the concurrency
  // base (updated_at) stays fresh.
  const dataRef = useRef(data);
  const dirtyRef = useRef(false);
  const conflictRef = useRef(false);
  const baseUpdatedAt = useRef(sheet.updated_at);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const pendingRef = useRef(false);
  const saveQueuedRef = useRef(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    pendingRef.current = pendingLocal;
  }, [pendingLocal]);

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
    // Durable first. If the network call never lands — or the tab dies
    // mid-flight — the measurements are already on the device.
    await queueEdit({
      sheetId: sheet.id,
      jobId: job.id,
      data: payload,
      baseUpdatedAt: baseUpdatedAt.current,
      queuedAt: Date.now(),
    });
    setPendingLocal(true);
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
        // The server has it; the local copy is no longer needed.
        await clearEdit(sheet.id);
        setPendingLocal(false);
        setSaveState("saved");
      }
      // else: newer edits exist; their own debounce triggers the next save
    } catch {
      // The edit is safe on the device. Say so, rather than "save failed",
      // which reads like the work is gone.
      setSaveState(navigator.onLine === false ? "queued" : "error");
    }
  }

  // Retry whatever is sitting in the queue for this sheet.
  function flushOutbox() {
    if (conflictRef.current || !dirtyRef.current) return;
    requestSave();
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

  // Recover anything this device queued and never managed to send — after a
  // reload, a crash, or a shift that ended out of signal. The queued payload
  // is newer than the row the page just rendered, so it wins on screen; if the
  // sheet also moved on the server the flush returns 409 and the existing
  // conflict banner takes over. Nothing is overwritten silently.
  useEffect(() => {
    let cancelled = false;
    getEdit(sheet.id).then((pending) => {
      if (cancelled || !pending) return;
      setPendingLocal(true);
      setRestored(true);
      setData(normalizeMeasureData(pending.data));
      dirtyRef.current = true;
      setSaveState("dirty");
      // Try immediately: the reason for the reload is often that signal came back.
      setTimeout(requestSave, 300);
    });
    return () => {
      cancelled = true;
    };
    // runs once for this sheet; requestSave reads only refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.id]);

  // Connectivity: retry the moment the tablet is back, and whenever the
  // measurer returns to the tab (walking out of a stairwell rarely fires an
  // "online" event on its own).
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine !== false);
    sync();
    const onOnline = () => {
      sync();
      flushOutbox();
    };
    const onVisible = () => {
      sync();
      if (document.visibilityState === "visible") flushOutbox();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", sync);
    document.addEventListener("visibilitychange", onVisible);
    // Backstop for the case where neither event fires.
    const t = setInterval(() => {
      if (dirtyRef.current && !conflictRef.current) flushOutbox();
    }, 20000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", sync);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (dirtyRef.current || pendingRef.current) {
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
    if (movingPostId) {
      set((d) => {
        const po = d.posts.find((p) => p.id === movingPostId);
        if (po) { po.segIdx = segIdx; po.stepIdx = stepIdx; po.pos = ""; }
      });
      setMovingPostId(null);
      return;
    }
    const existing = dataRef.current.posts.find((p) => p.segIdx === segIdx && p.stepIdx === stepIdx);
    if (existing) {
      setSelectedPostId(existing.id);
      return;
    }
    set((d) => {
      const po = newPost(segIdx, stepIdx);
      const o = d.datums.orientation;
      po.side = o === "right_wall" ? "left" : "right";
      d.posts.push(po);
    });
  }

  function addPlatformPost(segIdx: number) {
    if (movingPostId) {
      set((d) => {
        const po = d.posts.find((p) => p.id === movingPostId);
        if (po) { po.segIdx = segIdx; po.stepIdx = null; po.distanceFromFirst = ""; }
      });
      setMovingPostId(null);
      return;
    }
    const existing = dataRef.current.posts.find((p) => p.segIdx === segIdx && p.stepIdx === null);
    if (existing) {
      setSelectedPostId(existing.id);
      return;
    }
    set((d) => {
      const po = newPost(segIdx, null);
      const o = d.datums.orientation;
      po.side = o === "right_wall" ? "left" : "right";
      d.posts.push(po);
    });
  }

  function addTypedPoint(pointType: PostMeasure["pointType"]) {
    if (!placementMenu) return;
    set((d) => {
      const po = newPost(placementMenu.segIdx, placementMenu.stepIdx);
      po.pointType = pointType;
      po.side = placementMenu.side;
      if (pointType === "concrete_wall" || pointType === "clip") {
        po.anchor = "Concrete";
        po.substrate = "Concrete";
      }
      d.posts.push(po);
    });
    setPlacementMenu(null);
  }

  // Tapping an item on the sketch opens what-to-do-with-it (move / remove).
  // While another item is being moved, the tap is a destination instead, so
  // landing on top of an existing marker still drops it there.
  function tapPost(id: string) {
    if (movingPostId) {
      const target = dataRef.current.posts.find((po) => po.id === id);
      if (!target) return;
      if (target.stepIdx === null) addPlatformPost(target.segIdx);
      else addStepPost(target.segIdx, target.stepIdx);
      return;
    }
    setSelectedPostId(id);
  }

  function setGate(fn: (g: GateData) => void) {
    set((d) => { if (d.gate) fn(d.gate); });
  }
  function setFence(fn: (f: FenceData) => void) {
    set((d) => { if (d.fence) fn(d.fence); });
  }
  function setSeg(id: string, fn: (sg: FenceSegment) => void) {
    setFence((f) => {
      const sg = f.segments.find((x) => x.id === id);
      if (sg) fn(sg);
    });
  }
  function setBalcony(fn: (b: BalconyData) => void) {
    set((d) => { if (d.balcony) fn(d.balcony); });
  }

  function setFire(fn: (f: FireEscapeData) => void) {
    set((d) => {
      if (d.fire) fn(d.fire);
    });
  }

  function setLevel(id: string, fn: (l: FireLevel) => void) {
    setFire((f) => {
      const l = f.levels.find((x) => x.id === id);
      if (l) fn(l);
    });
  }

  function setWell(fn: (w: WellData) => void) {
    set((d) => {
      if (d.well) fn(d.well);
    });
  }

  function toggleDeliverable(k: WellDeliverable) {
    setWell((w) => {
      w.deliverables = w.deliverables.includes(k)
        ? w.deliverables.filter((x) => x !== k)
        : [...w.deliverables, k];
    });
  }

  function setBand(id: string, key: keyof WallBand, value: string) {
    setWell((w) => {
      const b = w.bands.find((x) => x.id === id);
      if (b && key !== "id") b[key] = value;
    });
  }

  function defaultSide(): "left" | "right" {
    return dataRef.current.datums.orientation === "right_wall" ? "left" : "right";
  }

  // Holding a location always offers the "what is here?" choices. Moving an
  // item is reached by holding the item's own marker, or by its Relocate
  // button — an item already on a tread must not block adding a second one.
  function holdStepLocation(segIdx: number, stepIdx: number) {
    setPlacementMenu({ segIdx, stepIdx, side: defaultSide() });
  }

  function holdPlatformLocation(segIdx: number) {
    setPlacementMenu({ segIdx, stepIdx: null, side: defaultSide() });
  }

  // Existing Structures stage: a plain tap opens the same choices, so adding a
  // wall or column never depends on a long press landing correctly.
  function tapStructureStep(segIdx: number, stepIdx: number) {
    if (movingPostId) return addStepPost(segIdx, stepIdx);
    setPlacementMenu({ segIdx, stepIdx, side: defaultSide() });
  }

  function tapStructurePlatform(segIdx: number) {
    if (movingPostId) return addPlatformPost(segIdx);
    setPlacementMenu({ segIdx, stepIdx: null, side: defaultSide() });
  }

  function setSpan(idx: number, key: "label" | "topSpan" | "lowerSpan" | "note", value: string) {
    set((d) => {
      const sp = d.spans[idx];
      if (sp) sp[key] = value;
    });
  }

  function setTerm(idx: number, end: "start" | "end", key: string, value: string) {
    set((d) => {
      const t = d.spans[idx]?.[end] as unknown as Record<string, string> | undefined;
      if (t) t[key] = value;
    });
  }

  function setHw(idx: number, end: "start" | "end", key: string, value: string) {
    set((d) => {
      const t = d.spans[idx]?.[end];
      if (t) (t.hardware as unknown as Record<string, string>)[key] = value;
    });
  }

  function removePost(id: string) {
    set((d) => {
      d.posts = d.posts.filter((p) => p.id !== id);
    });
  }

  function toggleSketchWall(side: "left" | "right") {
    set((d) => {
      const current = d.datums.orientation;
      let left = current === "left_wall" || current === "both_wall";
      let right = current === "right_wall" || current === "both_wall";
      if (side === "left") left = !left;
      else right = !right;
      d.datums.orientation = left && right ? "both_wall" : left ? "left_wall" : right ? "right_wall" : "both_open";
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

  async function saveDraft() {
    await saveName(name);
    await enqueue(async () => {
      if (dirtyRef.current) await doSave();
    });
    if (!conflictRef.current && !dirtyRef.current) {
      setInfo(mt(lang, "draftSaved"));
    }
  }

  async function submitSheet() {
    const d = await mutate({ type: "submit" }, "Submit failed");
    if (d) {
      setStatus("submitted");
      setInfo(null);
      setReviewComment(null);
    }
  }

  async function approveSheet(extra: Record<string, unknown> = {}) {
    const d = await enqueue(async () => {
      try {
        const res = await fetch("/shop/api/measure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "approve", id: sheet.id, jobId: job.id, ...extra }),
        });
        const j = await res.json().catch(() => ({}));
        if (res.ok) {
          if (j.updated_at) baseUpdatedAt.current = j.updated_at;
          setOpErr(null);
          return j as Record<string, unknown>;
        }
        return { __fail: true, ...j } as Record<string, unknown>;
      } catch {
        return { __fail: true, error: "Network error" } as Record<string, unknown>;
      }
    });
    if (!d) return;
    if (d.__fail) {
      // VERIFY warnings need explicit reviewer acknowledgment
      if (d.needsAck) {
        const list = ((d.warnings as string[]) || [])
          .map((k) => `• ${mt(lang, `check_${k}`)}`)
          .join("\n");
        if (confirm(`${mt(lang, "ackWarningsPrompt")}\n\n${list}`)) {
          return approveSheet({ ...extra, ackWarnings: true });
        }
        return;
      }
      // drawn shapes are reference geometry — confirm before approving
      if (d.needsReference) {
        if (confirm(mt(lang, "refConfirmPrompt"))) {
          return approveSheet({ ...extra, confirmReference: true });
        }
        return;
      }
      setOpErr(String(d.error || "Approve failed"));
      return;
    }
    setStatus("approved");
    if (typeof d.rev === "number") setRev(d.rev);
    setInfo(null);
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
  const orgTol = mergeTolerances(orgSettings?.tolerances);
  // org-configurable lists with KIW constants as fallback
  const presets = {
    post: orgSettings?.presets?.post?.length ? orgSettings.presets.post : [...MATERIAL_PRESETS.post],
    topRail: orgSettings?.presets?.topRail?.length ? orgSettings.presets.topRail : [...MATERIAL_PRESETS.topRail],
    picket: orgSettings?.presets?.picket?.length ? orgSettings.presets.picket : [...MATERIAL_PRESETS.picket],
    bottomRail: orgSettings?.presets?.bottomRail?.length ? orgSettings.presets.bottomRail : [...MATERIAL_PRESETS.bottomRail],
  };
  const anchorOptions = orgSettings?.options?.anchors?.length
    ? orgSettings.options.anchors
    : [...ANCHOR_OPTIONS];
  const finishOptions = Array.from(new Set([
    ...(orgSettings?.options?.finishes?.length ? orgSettings.options.finishes : SPEC_OPTIONS.finish_type),
    "Galvanizing + DTM Epoxy",
    "Galvanizing + Powder Coat",
  ]));
  const colorOptions = orgSettings?.options?.colors?.length
    ? orgSettings.options.colors
    : [...SPEC_OPTIONS.color];
  const checks = runChecks(data, sheet.shape, orgTol);
  const gaps = requiredGaps(data, sheet.shape);
  const redChecks = checks.filter((c) => c.level === "red");
  const canSubmit = gaps.length === 0 && redChecks.length === 0;
  const gapStage = (key: string): EditorStage => {
    if (key === "orientation" || key === "floor_change" || key.endsWith("_adjustment")) return "setup";
    if (key.startsWith("gate_")) return key === "gate_opener" || key === "gate_power" || key === "gate_safety" ? "specs" : "setup";
    if (key.startsWith("fence_")) return key.startsWith("fence_seg") ? "steps" : "setup";
    if (key.startsWith("bal_")) return key.includes("anchor") || key.includes("embed") || key.includes("edge_distance") || key.includes("slab") ? "locations" : "setup";
    if (key.startsWith("fire_")) {
      if (key.startsWith("fire_stair") || key === "fire_floor_to_floor") return "steps";
      if (key.startsWith("fire_ladder")) return "specs";
      if (key.includes("rating") || key.includes("condition") || key === "fire_load_test" || key === "fire_repair_scope") return "review";
      return "setup";
    }
    if (key.startsWith("well_")) {
      if (key.startsWith("well_grate") || key.startsWith("well_ladder") || key.startsWith("well_gate")) return "specs";
      if (key.startsWith("well_wall") || key === "well_post_to_wall" || key === "well_band_fields") return "locations";
      return "setup";
    }
    if (key === "photo" || key === "post_photo" || key === "term_photo") return "photos";
    if (key.startsWith("post")) return "locations";
    if (key.startsWith("span") || key.startsWith("term") ||
        ["rail_height", "returns", "extensions", "brackets"].includes(key)) return "posts";
    if (key.startsWith("mat_") || key === "splices" || key === "max_piece") return "specs";
    if (key === "steps" || key === "winder") return "steps";
    if (key.includes("angle") || key.includes("rake")) return "locations";
    if (key.startsWith("landing_")) return "level";
    return "steps";
  };
  const stageMissing = EDITOR_STAGES.reduce<Record<EditorStage, number>>((acc, s) => {
    acc[s.id] = gaps.filter((g) => gapStage(g.key) === s.id).length;
    return acc;
  }, { setup: 0, posts: 0, level: 0, steps: 0, locations: 0, specs: 0, photos: 0, review: redChecks.length });
  const activeStageIndex = EDITOR_STAGES.findIndex((s) => s.id === activeStage);
  const isSpiral = sheet.shape === "spiral";
  const isWallRail = sheet.shape === "wall_rail";
  const isCustom = sheet.shape === "custom";
  const isFire = sheet.shape === "fire_escape";
  const fire = data.fire;
  const firePurpose = fire?.purpose || "";
  const fireSurvey = isFire && (firePurpose === "inspect" || firePurpose === "repair");
  const fireNew = isFire && firePurpose === "new";
  const isGate = sheet.shape === "gate";
  const isFence = sheet.shape === "fence";
  const isBalcony = sheet.shape === "balcony";
  const gate = data.gate;
  const fence = data.fence;
  const balcony = data.balcony;
  const isWell = sheet.shape === "window_well";
  const well = data.well;
  const wellWants = (k: WellDeliverable) => !!well?.deliverables.includes(k);
  const clearance = wellClearance(well);
  const flights = data.segments
    .map((s, i) => ({ seg: s, i }))
    .filter((x) => x.seg.kind === "flight") as { seg: FlightSegment; i: number }[];
  const platforms = data.segments
    .map((s, i) => ({ seg: s, i }))
    .filter((x) => x.seg.kind === "platform") as { seg: PlatformSegment; i: number }[];
  const ramps = data.segments
    .map((s, i) => ({ seg: s, i }))
    .filter((x) => x.seg.kind === "ramp") as { seg: RampSegment; i: number }[];
  const curves = data.segments
    .map((s, i) => ({ seg: s, i }))
    .filter((x) => x.seg.kind === "curve") as { seg: CurveSegment; i: number }[];
  const isBuilder = sheet.shape === "builder";
  const turns = data.segments.some(
    (sg) => sg.kind === "platform" && (sg as PlatformSegment).turn !== "none"
  );
  const multiFlight = flights.length > 1 || turns;
  const hasFlights = flights.length > 0;
  const hasWinders = flights.some(({ seg }) => seg.steps.some((step) => step.winder));
  const hasHandrail = data.rail.kind === "Handrail" || data.rail.kind === "Both";
  const hasGuardrail = data.rail.kind !== "Handrail";
  // Datums and the wall/open orientation describe a stair run. A well or a
  // fire escape carries its own reference frame, so the card stays hidden.
  const needsPostReference = !isWallRail && !isCustom && !isSpiral && !isWell && !isFire && !isGate && !isFence && !isBalcony;

  // Direct slot photo: the native OS picker (camera / photo library) uploads
  // straight into the slot — the markup modal stays a separate, optional step.
  async function directSlotPhoto(slot: string, label: string, file: File) {
    setSlotBusy(slot);
    setSlotErr(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("jobId", job.id);
      form.append("category", "Measurements");
      form.append("label", `${name || shapeLabel(lang, sheet.shape)} — ${label}`);
      const res = await fetch("/shop/api/photo", { method: "POST", body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.path) throw new Error(d.error || "");
      set((dd) => {
        dd.photos = [
          ...dd.photos.filter((p) => p.slot !== slot),
          { slot, path: d.path, takenAt: new Date().toISOString() },
        ];
      });
    } catch (e) {
      const msg = e instanceof Error && e.message ? `: ${e.message}` : "";
      setSlotErr(`${label} — ${mt(lang, "uploadFailed")}${msg}`);
    } finally {
      setSlotBusy(null);
    }
  }

  return (
    <LangCtx.Provider value={lang}>
    <PlaceholderCtx.Provider value={unitPh}>
      <div className="p-4 max-w-4xl mx-auto pb-32 print:hidden">
        {!online && (
          <div className="sticky top-0 z-30 -mx-4 mb-3 bg-amber-600 px-4 py-2 text-center text-sm font-bold text-black">
            {mt(lang, "offlineBanner")}
          </div>
        )}

        {restored && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-700 bg-amber-950/40 p-3">
            <span className="flex-1 text-sm text-amber-200">⬇ {mt(lang, "restoredMsg")}</span>
            <button onClick={() => setRestored(false)}
              className="rounded-full border border-amber-700 px-2.5 py-1 text-xs text-amber-200">
              {mt(lang, "dismiss")}
            </button>
          </div>
        )}

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
              onClick={() => {
                fetch("/shop/api/measure", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ type: "log_print", id: sheet.id, jobId: job.id, rev }),
                }).catch(() => {});
                window.print();
              }}
              className="text-xs font-bold rounded-full px-3 py-2 border bg-neutral-800 border-neutral-600 text-neutral-200"
            >
              🖨 {mt(lang, "printSheet")}
            </button>
            <button
              type="button"
              onClick={saveDraft}
              disabled={saveState === "saving" || saveState === "conflict"}
              className="text-xs font-bold rounded-full px-3 py-2 border bg-amber-500 border-amber-400 text-black disabled:opacity-50"
            >
              💾 {mt(lang, "saveDraft")}
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
              {saveState === "queued" && (
                <span className="text-amber-300">⬇ {mt(lang, "savedOnDevice")}</span>
              )}
              {saveState === "error" && (
                <button
                  onClick={requestSave}
                  className="text-amber-300 border border-amber-700 bg-amber-950/40 rounded-full px-2.5 py-1 font-bold"
                >
                  ⬇ {mt(lang, "savedOnDevice")} — {mt(lang, "retry")}
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

        <div className="sticky top-0 z-30 -mx-4 px-4 py-2 mb-4 bg-neutral-950/95 backdrop-blur border-y border-neutral-800">
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Measurement stages">
            {EDITOR_STAGES.map((s) => {
              const missing = stageMissing[s.id];
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setActiveStage(s.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-left ${
                    activeStage === s.id
                      ? "border-amber-500 bg-amber-500/10 text-amber-300"
                      : "border-neutral-700 bg-neutral-900 text-neutral-300"
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wide">{s.icon}. {mt(lang, s.labelKey)}</span>
                  <span className={`block text-[10px] mt-0.5 ${missing ? "text-amber-400" : "text-green-400"}`}>
                    {missing ? `${missing} ${mt(lang, "stageMissing")}` : mt(lang, "stageComplete")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <StageCtx.Provider value={activeStage}>
        {/* Datums & orientation — where every measurement originates */}
        {(hasFlights || needsPostReference) && <Card stage="setup" title={`🧭 ${mt(lang, "datumsTitle")}`}>
          <div className="mb-3 rounded-lg border border-amber-900/50 bg-amber-500/5 p-3 text-sm text-amber-200">
            {mt(lang, "sketchOrientationHint")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {needsPostReference && <ChipRow help="postRefLbl"
              label={mt(lang, "postRefLbl")}
              value={data.datums.postRef}
              options={[
                ["centerline", mt(lang, "postRef_centerline")],
                ["face", mt(lang, "postRef_face")],
              ]}
              onChange={(v) => set((d) => void (d.datums.postRef = v as "" | "centerline" | "face"))}
            />}
          </div>
        </Card>}

        {isGate && gate && (
          <>
            <Card stage="setup" title={`🚪 ${mt(lang, "gateTitle")}`}>
              <p className="mb-3 text-xs text-neutral-400">{mt(lang, "gateHint")}</p>
              <Grid>
                <MSelect help="gateUse" label={mt(lang, "gateUse")} value={gate.use} lang={lang}
                  options={["driveway", "walk", "service", "pool"]}
                  labels={Object.fromEntries(["driveway", "walk", "service", "pool"].map((k) => [k, mt(lang, `gateU_${k}`)]))}
                  onChange={(v) => setGate((g) => void (g.use = v as GateData["use"]))} />
                <MSelect help="gateOperation" label={mt(lang, "gateOperation")} value={gate.operation} lang={lang}
                  options={["single_swing", "double_swing", "slide", "bifold"]}
                  labels={Object.fromEntries(["single_swing", "double_swing", "slide", "bifold"].map((k) => [k, mt(lang, `gateO_${k}`)]))}
                  onChange={(v) => setGate((g) => void (g.operation = v as GateData["operation"]))} />
                <MInput help="gateWidthTop" label={mt(lang, "gateWidthTop")} value={gate.widthTop}
                  onChange={(v) => setGate((g) => void (g.widthTop = v))} />
                <MInput help="gateWidthBottom" label={mt(lang, "gateWidthBottom")} value={gate.widthBottom}
                  onChange={(v) => setGate((g) => void (g.widthBottom = v))} />
                <MInput help="gateHeightHinge" label={mt(lang, "gateHeightHinge")} value={gate.heightHinge}
                  onChange={(v) => setGate((g) => void (g.heightHinge = v))} />
                <MInput help="gateHeightLatch" label={mt(lang, "gateHeightLatch")} placeholder="—" value={gate.heightLatch}
                  onChange={(v) => setGate((g) => void (g.heightLatch = v))} />
                <MInput help="gateDiagA" label={mt(lang, "gateDiagA")} placeholder="—" value={gate.diagA}
                  onChange={(v) => setGate((g) => void (g.diagA = v))} />
                <MInput help="gateDiagB" label={mt(lang, "gateDiagB")} placeholder="—" value={gate.diagB}
                  onChange={(v) => setGate((g) => void (g.diagB = v))} />
              </Grid>

              <div className="mt-4 mb-2 text-sm font-bold text-neutral-300">{mt(lang, "gateGroundTitle")}</div>
              <p className="mb-2 text-xs text-neutral-400">{mt(lang, "gateGroundHint")}</p>
              <Grid>
                <MInput help="gateGroundClearance" label={mt(lang, "gateGroundClearance")} value={gate.groundClearance}
                  onChange={(v) => setGate((g) => void (g.groundClearance = v))} />
                <MInput help="gateGradeRise" label={mt(lang, "gateGradeRise")} value={gate.gradeRise}
                  onChange={(v) => setGate((g) => void (g.gradeRise = v))} />
                <MInput help="gateSurface" label={mt(lang, "gateSurface")} value={gate.surface}
                  onChange={(v) => setGate((g) => void (g.surface = v))} />
                <ChipRow help="gateSwingDir" label={mt(lang, "gateSwingDir")} value={gate.swingDir}
                  options={[["in", mt(lang, "gateSwingIn")], ["out", mt(lang, "gateSwingOut")], ["both", mt(lang, "gateSwingBoth")]]}
                  onChange={(v) => setGate((g) => void (g.swingDir = v as GateData["swingDir"]))} />
                <ChipRow help="gateHingeSide" label={mt(lang, "gateHingeSide")} value={gate.hingeSide}
                  options={[["left", mt(lang, "leftLookingUp")], ["right", mt(lang, "rightLookingUp")]]}
                  onChange={(v) => setGate((g) => void (g.hingeSide = v as GateData["hingeSide"]))} />
              </Grid>
            </Card>

            <Card stage="specs" title={`🔧 ${mt(lang, "gatePostsHardware")}`}>
              <label className="mb-3 flex items-center gap-2 text-sm text-neutral-300">
                <input type="checkbox" checked={gate.postsExisting}
                  onChange={(e) => setGate((g) => void (g.postsExisting = e.target.checked))}
                  className="h-5 w-5 accent-amber-500" />
                {mt(lang, "gatePostsExisting")}
              </label>
              <Grid>
                <MInput help="gatePostSize" label={mt(lang, "gatePostSize")} value={gate.postSize}
                  onChange={(v) => setGate((g) => void (g.postSize = v))} />
                <MInput help="gatePostMaterial" label={mt(lang, "gatePostMaterial")} placeholder="—" value={gate.postMaterial}
                  onChange={(v) => setGate((g) => void (g.postMaterial = v))} />
                <MInput help="gateFooting" label={mt(lang, "gateFooting")} value={gate.footingDepth}
                  onChange={(v) => setGate((g) => void (g.footingDepth = v))} />
                <MInput help="gateInfill" label={mt(lang, "gateInfill")} value={gate.infill}
                  onChange={(v) => setGate((g) => void (g.infill = v))} />
                <MInput help="gatePicketSpacing" label={mt(lang, "gatePicketSpacing")} placeholder="—" value={gate.picketSpacing}
                  onChange={(v) => setGate((g) => void (g.picketSpacing = v))} />
                <MInput help="gateHinges" label={mt(lang, "gateHinges")} value={gate.hinges}
                  onChange={(v) => setGate((g) => void (g.hinges = v))} />
                <MInput help="gateLatch" label={mt(lang, "gateLatch")} value={gate.latch}
                  onChange={(v) => setGate((g) => void (g.latch = v))} />
                <MInput help="gateDropRod" label={mt(lang, "gateDropRod")} placeholder="—" value={gate.dropRod}
                  onChange={(v) => setGate((g) => void (g.dropRod = v))} />
              </Grid>
              <label className="mt-4 mb-3 flex items-center gap-2 text-sm text-neutral-300">
                <input type="checkbox" checked={gate.automated}
                  onChange={(e) => setGate((g) => void (g.automated = e.target.checked))}
                  className="h-5 w-5 accent-amber-500" />
                {mt(lang, "gateAutomated")}
              </label>
              {gate.automated && (
                <Grid>
                  <MInput help="gateOpener" label={mt(lang, "gateOpener")} value={gate.opener}
                    onChange={(v) => setGate((g) => void (g.opener = v))} />
                  <ChipRow help="gatePower" label={mt(lang, "gatePower")} value={gate.powerAtGate}
                    options={[["yes", mt(lang, "fireOp_yes")], ["no", mt(lang, "gateNo")], ["unknown", mt(lang, "gateUnknown")]]}
                    onChange={(v) => setGate((g) => void (g.powerAtGate = v as GateData["powerAtGate"]))} />
                  <MInput help="gateSafety" label={mt(lang, "gateSafety")} value={gate.safetyDevices}
                    onChange={(v) => setGate((g) => void (g.safetyDevices = v))} />
                </Grid>
              )}
            </Card>
          </>
        )}

        {isFence && fence && (
          <>
            <Card stage="setup" title={`🚧 ${mt(lang, "fenceTitle")}`}>
              <p className="mb-3 text-xs text-neutral-400">{mt(lang, "fenceHint")}</p>
              <Grid>
                <MInput help="fenceTotalRun" label={mt(lang, "fenceTotalRun")} value={fence.totalRun}
                  onChange={(v) => setFence((f) => void (f.totalRun = v))} />
                <MInput help="fenceHeight" label={mt(lang, "fenceHeight")} value={fence.height}
                  onChange={(v) => setFence((f) => void (f.height = v))} />
                <MInput help="fencePanelWidth" label={mt(lang, "fencePanelWidth")} placeholder="—" value={fence.panelWidth}
                  onChange={(v) => setFence((f) => void (f.panelWidth = v))} />
                <MInput help="fencePostSpacing" label={mt(lang, "fencePostSpacing")} value={fence.postSpacing}
                  onChange={(v) => setFence((f) => void (f.postSpacing = v))} />
                <MInput help="fencePostSize" label={mt(lang, "fencePostSize")} value={fence.postSize}
                  onChange={(v) => setFence((f) => void (f.postSize = v))} />
                <MInput help="fenceFooting" label={mt(lang, "fenceFooting")} value={fence.footingDepth}
                  onChange={(v) => setFence((f) => void (f.footingDepth = v))} />
                <MInput help="fencePicketSpacing" label={mt(lang, "fencePicketSpacing")} placeholder="—" value={fence.picketSpacing}
                  onChange={(v) => setFence((f) => void (f.picketSpacing = v))} />
                <MInput help="fenceGates" label={mt(lang, "fenceGates")} placeholder="—" value={fence.gates}
                  onChange={(v) => setFence((f) => void (f.gates = v))} />
                <MInput help="fenceStartTerm" label={mt(lang, "fenceStartTerm")} value={fence.startTerm}
                  onChange={(v) => setFence((f) => void (f.startTerm = v))} />
                <MInput help="fenceEndTerm" label={mt(lang, "fenceEndTerm")} value={fence.endTerm}
                  onChange={(v) => setFence((f) => void (f.endTerm = v))} />
                <MInput help="fenceUtilities" label={mt(lang, "fenceUtilities")} value={fence.utilities}
                  onChange={(v) => setFence((f) => void (f.utilities = v))} />
              </Grid>
            </Card>

            {fence.segments.map((sg, i) => (
              <Card key={sg.id} stage="steps" title={`${mt(lang, "fenceSegment")} ${sg.label || i + 1}`}>
                <div className="mb-3 flex items-center gap-2">
                  <input value={sg.label} onChange={(e) => setSeg(sg.id, (x) => void (x.label = e.target.value))}
                    placeholder={mt(lang, "fenceSegLabel")}
                    className="w-40 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-2 text-base" />
                  {fence.segments.length > 1 && (
                    <button type="button"
                      onClick={() => setFence((f) => void (f.segments = f.segments.filter((x) => x.id !== sg.id)))}
                      className="ml-auto rounded-full border border-red-900 px-2.5 py-1 text-xs text-red-400">
                      ✕ {mt(lang, "removePost")}
                    </button>
                  )}
                </div>
                <Grid>
                  <MInput help="fenceSegLength" label={mt(lang, "fenceSegLength")} value={sg.length}
                    onChange={(v) => setSeg(sg.id, (x) => void (x.length = v))} />
                  <MInput help="fenceSegPanels" label={mt(lang, "fenceSegPanels")} placeholder="—" value={sg.panels}
                    onChange={(v) => setSeg(sg.id, (x) => void (x.panels = v))} />
                  <MInput help="fenceSegHeight" label={mt(lang, "fenceSegHeight")} placeholder="—" value={sg.height}
                    onChange={(v) => setSeg(sg.id, (x) => void (x.height = v))} />
                  <MInput help="fenceSegTurn" label={mt(lang, "fenceSegTurn")} placeholder="°" value={sg.turnDeg}
                    onChange={(v) => setSeg(sg.id, (x) => void (x.turnDeg = v))} />
                  <MInput help="fenceSegGrade" label={mt(lang, "fenceSegGrade")} placeholder="—" value={sg.gradeChange}
                    onChange={(v) => setSeg(sg.id, (x) => void (x.gradeChange = v))} />
                  <ChipRow help="fenceSegFollows" label={mt(lang, "fenceSegFollows")} value={sg.followsGrade}
                    options={[["racked", mt(lang, "fenceRacked")], ["stepped", mt(lang, "fenceStepped")]]}
                    onChange={(v) => setSeg(sg.id, (x) => void (x.followsGrade = v as FenceSegment["followsGrade"]))} />
                  <MInput help="fenceSegObstruction" label={mt(lang, "fenceSegObstruction")} placeholder="—" value={sg.obstruction}
                    onChange={(v) => setSeg(sg.id, (x) => void (x.obstruction = v))} />
                </Grid>
              </Card>
            ))}

            <Card stage="steps" title={mt(lang, "fenceMoreTitle")}>
              <button type="button"
                onClick={() => setFence((f) => void f.segments.push(newFenceSegment(String(f.segments.length + 1))))}
                className="w-full rounded-xl border border-amber-600 bg-amber-500/10 py-3 font-bold text-amber-300">
                + {mt(lang, "fenceAddSegment")}
              </button>
            </Card>
          </>
        )}

        {isBalcony && balcony && (
          <>
            <Card stage="setup" title={`🏗 ${mt(lang, "balTitle")}`}>
              <p className="mb-3 text-xs text-neutral-400">{mt(lang, "balHint")}</p>
              <Grid>
                <MSelect help="balKind" label={mt(lang, "balKind")} value={balcony.kind} lang={lang}
                  options={["balcony", "juliet", "deck_edge", "roof_edge"]}
                  labels={Object.fromEntries(["balcony", "juliet", "deck_edge", "roof_edge"].map((k) => [k, mt(lang, `balK_${k}`)]))}
                  onChange={(v) => setBalcony((b) => void (b.kind = v as BalconyData["kind"]))} />
                <MSelect help="balMount" label={mt(lang, "balMount")} value={balcony.mount} lang={lang}
                  options={["top", "fascia", "core_drill", "embedded"]}
                  labels={Object.fromEntries(["top", "fascia", "core_drill", "embedded"].map((k) => [k, mt(lang, `balM_${k}`)]))}
                  onChange={(v) => setBalcony((b) => void (b.mount = v as BalconyData["mount"]))} />
                <MInput help="balEdgeLength" label={mt(lang, "balEdgeLength")} value={balcony.edgeLength}
                  onChange={(v) => setBalcony((b) => void (b.edgeLength = v))} />
                <MInput help="balProjection" label={mt(lang, "balProjection")} placeholder="—" value={balcony.projection}
                  onChange={(v) => setBalcony((b) => void (b.projection = v))} />
                <MInput help="balGuardHeight" label={mt(lang, "balGuardHeight")} value={balcony.guardHeight}
                  onChange={(v) => setBalcony((b) => void (b.guardHeight = v))} />
                <MInput help="balPicketSpacing" label={mt(lang, "balPicketSpacing")} placeholder="—" value={balcony.picketSpacing}
                  onChange={(v) => setBalcony((b) => void (b.picketSpacing = v))} />
                <MInput help="balReturns" label={mt(lang, "balReturns")} value={balcony.returns}
                  onChange={(v) => setBalcony((b) => void (b.returns = v))} />
                <MInput help="balCorners" label={mt(lang, "balCorners")} placeholder="—" value={balcony.corners}
                  onChange={(v) => setBalcony((b) => void (b.corners = v))} />
                <MInput help="balFinishedFloor" label={mt(lang, "balFinishedFloor")} value={balcony.finishedFloor}
                  onChange={(v) => setBalcony((b) => void (b.finishedFloor = v))} />
                <MInput help="balDrainage" label={mt(lang, "balDrainage")} placeholder="—" value={balcony.drainage}
                  onChange={(v) => setBalcony((b) => void (b.drainage = v))} />
                {balcony.kind === "juliet" && (
                  <MInput help="balDoorOpening" label={mt(lang, "balDoorOpening")} value={balcony.doorOpening}
                    onChange={(v) => setBalcony((b) => void (b.doorOpening = v))} />
                )}
              </Grid>
            </Card>

            <Card stage="locations" title={`⚙ ${mt(lang, "balAnchorTitle")}`}>
              <p className="mb-3 text-xs text-neutral-400">{mt(lang, "balAnchorHint")}</p>
              <Grid>
                <MInput help="balSlabMaterial" label={mt(lang, "balSlabMaterial")} value={balcony.slabMaterial}
                  onChange={(v) => setBalcony((b) => void (b.slabMaterial = v))} />
                <MInput help="balSlabThickness" label={mt(lang, "balSlabThickness")} value={balcony.slabThickness}
                  onChange={(v) => setBalcony((b) => void (b.slabThickness = v))} />
                <MInput help="balAnchorType" label={mt(lang, "balAnchorType")} value={balcony.anchorType}
                  onChange={(v) => setBalcony((b) => void (b.anchorType = v))} />
                <MInput help="balEmbedment" label={mt(lang, "balEmbedment")} value={balcony.anchorEmbedment}
                  onChange={(v) => setBalcony((b) => void (b.anchorEmbedment = v))} />
                <MInput help="balEdgeDistance" label={mt(lang, "balEdgeDistance")} value={balcony.edgeDistance}
                  onChange={(v) => setBalcony((b) => void (b.edgeDistance = v))} />
                <MInput help="balMinCover" label={mt(lang, "balMinCover")} placeholder="—" value={balcony.minCover}
                  onChange={(v) => setBalcony((b) => void (b.minCover = v))} />
                <MInput help="balPlatePlan" label={mt(lang, "balPlatePlan")} placeholder="—" value={balcony.platePlan}
                  onChange={(v) => setBalcony((b) => void (b.platePlan = v))} />
                <MInput help="balEdgeCondition" label={mt(lang, "balEdgeCondition")} placeholder="—" value={balcony.edgeCondition}
                  onChange={(v) => setBalcony((b) => void (b.edgeCondition = v))} />
              </Grid>
            </Card>
          </>
        )}

        {isFire && fire && (
          <>
            <Card stage="setup" title={`🧯 ${mt(lang, "fireTitle")}`}>
              <p className="mb-3 text-xs text-neutral-400">{mt(lang, "fireHint")}</p>
              <div className="mb-4">
                <div className="mb-2 text-sm font-bold text-neutral-300">{mt(lang, "firePurpose")}</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {FIRE_PURPOSES.map((k) => (
                    <button key={k} type="button"
                      onClick={() => setFire((f) => void (f.purpose = k))}
                      className={`rounded-xl border p-3 text-left ${firePurpose === k ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}>
                      <div className="text-sm font-bold">{mt(lang, `fireP_${k}`)}</div>
                      <div className="mt-0.5 text-[11px] opacity-80">{mt(lang, `firePd_${k}`)}</div>
                    </button>
                  ))}
                </div>
              </div>
              <Grid>
                <MInput help="fireStories" label={mt(lang, "fireStories")} value={fire.stories}
                  onChange={(v) => setFire((f) => void (f.stories = v))} />
                <MInput help="fireWallMaterial" label={mt(lang, "fireWallMaterial")} value={fire.wallMaterial}
                  onChange={(v) => setFire((f) => void (f.wallMaterial = v))} />
                <MInput help="fireTotalHeight" label={mt(lang, "fireTotalHeight")} value={fire.totalHeight}
                  onChange={(v) => setFire((f) => void (f.totalHeight = v))} />
                <MInput help="fireAccess" label={mt(lang, "fireAccess")} placeholder="—" value={fire.access}
                  onChange={(v) => setFire((f) => void (f.access = v))} />
              </Grid>
              {fire.purpose === "repair" && (
                <div className="mt-3">
                  <MInput help="fireViolations" label={mt(lang, "fireViolations")} value={fire.violations}
                    onChange={(v) => setFire((f) => void (f.violations = v))} />
                </div>
              )}
            </Card>

            {fire.levels.map((l, i) => {
              const lowest = i === fire.levels.length - 1;
              return (
                <Card key={l.id} stage="steps" title={`${mt(lang, "fireLevel")} ${l.label || i + 1}`}>
                  <div className="mb-3 flex items-center gap-2">
                    <input value={l.label} onChange={(e) => setLevel(l.id, (x) => void (x.label = e.target.value))}
                      placeholder={mt(lang, "fireLevelLabel")}
                      className="w-40 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-2 text-base" />
                    {fire.levels.length > 1 && (
                      <button type="button"
                        onClick={() => setFire((f) => void (f.levels = f.levels.filter((x) => x.id !== l.id)))}
                        className="ml-auto rounded-full border border-red-900 px-2.5 py-1 text-xs text-red-400">
                        ✕ {mt(lang, "removePost")}
                      </button>
                    )}
                  </div>
                  <Grid>
                    <MInput help="firePlatLength" label={mt(lang, "firePlatLength")} value={l.platLength}
                      onChange={(v) => setLevel(l.id, (x) => void (x.platLength = v))} />
                    <MInput help="firePlatWidth" label={mt(lang, "firePlatWidth")} value={l.platWidth}
                      onChange={(v) => setLevel(l.id, (x) => void (x.platWidth = v))} />
                    <MInput help="fireHeightGrade" label={mt(lang, "fireHeightGrade")} value={l.heightAboveGrade}
                      onChange={(v) => setLevel(l.id, (x) => void (x.heightAboveGrade = v))} />
                    {!lowest && (
                      <MInput help="fireFloorToFloor" label={mt(lang, "fireFloorToFloor")} value={l.floorToFloor}
                        onChange={(v) => setLevel(l.id, (x) => void (x.floorToFloor = v))} />
                    )}
                    <MInput help="fireDeck" label={mt(lang, "fireDeck")} value={l.deck}
                      onChange={(v) => setLevel(l.id, (x) => void (x.deck = v))} />
                    <ChipRow help="fireOpening" label={mt(lang, "fireOpening")} value={l.openingType}
                      options={[["window", mt(lang, "feWindow")], ["door", mt(lang, "feDoor")]]}
                      onChange={(v) => setLevel(l.id, (x) => void (x.openingType = v as FireLevel["openingType"]))} />
                    <MInput help="fireOpeningW" label={mt(lang, "fireOpeningW")} placeholder="—" value={l.openingW}
                      onChange={(v) => setLevel(l.id, (x) => void (x.openingW = v))} />
                    <MInput help="fireSillToPlatform" label={mt(lang, "fireSillToPlatform")} placeholder="—" value={l.sillToPlatform}
                      onChange={(v) => setLevel(l.id, (x) => void (x.sillToPlatform = v))} />
                    <MInput help="fireGuardHeight" label={mt(lang, "fireGuardHeight")} value={l.guardHeight}
                      onChange={(v) => setLevel(l.id, (x) => void (x.guardHeight = v))} />
                    <MInput help="firePicketSpacing" label={mt(lang, "firePicketSpacing")} value={l.picketSpacing}
                      onChange={(v) => setLevel(l.id, (x) => void (x.picketSpacing = v))} />
                  </Grid>

                  {!lowest && (
                    <>
                      <div className="mt-4 mb-2 text-sm font-bold text-neutral-300">{mt(lang, "fireStairDown")}</div>
                      <Grid>
                        <MInput help="fireStairRisers" label={mt(lang, "fireStairRisers")} value={l.stairRisers}
                          onChange={(v) => setLevel(l.id, (x) => void (x.stairRisers = v))} />
                        <MInput help="fireStairRise" label={mt(lang, "fireStairRise")} value={l.stairRise}
                          onChange={(v) => setLevel(l.id, (x) => void (x.stairRise = v))} />
                        <MInput help="fireStairRun" label={mt(lang, "fireStairRun")} value={l.stairRun}
                          onChange={(v) => setLevel(l.id, (x) => void (x.stairRun = v))} />
                        <MInput help="fireStairWidth" label={mt(lang, "fireStairWidth")} value={l.stairWidth}
                          onChange={(v) => setLevel(l.id, (x) => void (x.stairWidth = v))} />
                        <MInput help="fireStairAngle" label={mt(lang, "fireStairAngle")} placeholder="°" value={l.stairAngle}
                          onChange={(v) => setLevel(l.id, (x) => void (x.stairAngle = v))} />
                      </Grid>
                    </>
                  )}

                  <div className="mt-4 mb-2 text-sm font-bold text-neutral-300">{mt(lang, "fireAnchorage")}</div>
                  <Grid>
                    <MInput help="fireAnchorType" label={mt(lang, "fireAnchorType")} value={l.anchorType}
                      onChange={(v) => setLevel(l.id, (x) => void (x.anchorType = v))} />
                    <MInput help="fireAnchorCount" label={mt(lang, "fireAnchorCount")} value={l.anchorCount}
                      onChange={(v) => setLevel(l.id, (x) => void (x.anchorCount = v))} />
                    <MInput help="fireAnchorSpacing" label={mt(lang, "fireAnchorSpacing")} placeholder="—" value={l.anchorSpacing}
                      onChange={(v) => setLevel(l.id, (x) => void (x.anchorSpacing = v))} />
                  </Grid>

                  {fireSurvey && (
                    <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
                      <div className="mb-2 text-sm font-bold text-neutral-300">{mt(lang, "fireConditionTitle")}</div>
                      <ConditionFields lang={lang} c={l.condition}
                        onField={(k, v) => setLevel(l.id, (x) => void ((x.condition as unknown as Record<string, string>)[k] = v))} />
                    </div>
                  )}
                </Card>
              );
            })}

            <Card stage="steps" title={mt(lang, "fireAddLevelTitle")}>
              <button type="button"
                onClick={() => setFire((f) => void f.levels.push(newFireLevel(String(f.levels.length + 1))))}
                className="w-full rounded-xl border border-amber-600 bg-amber-500/10 py-3 font-bold text-amber-300">
                + {mt(lang, "fireAddLevel")}
              </button>
            </Card>

            <Card stage="specs" title={`🪜 ${mt(lang, "fireLadderTitle")}`}>
              <label className="mb-3 flex items-center gap-2 text-sm text-neutral-300">
                <input type="checkbox" checked={fire.ladder.present}
                  onChange={(e) => setFire((f) => void (f.ladder.present = e.target.checked))}
                  className="h-5 w-5 accent-amber-500" />
                {mt(lang, "fireLadderPresent")}
              </label>
              {fire.ladder.present && (
                <>
                  <Grid>
                    <MSelect help="fireLadderType" label={mt(lang, "fireLadderType")} value={fire.ladder.type} lang={lang}
                      options={["drop", "swing", "counterbalance", "fixed"]}
                      labels={Object.fromEntries(["drop", "swing", "counterbalance", "fixed"].map((k) => [k, mt(lang, `fireLT_${k}`)]))}
                      onChange={(v) => setFire((f) => void (f.ladder.type = v as never))} />
                    <MInput help="fireLadderLength" label={mt(lang, "fireLadderLength")} value={fire.ladder.length}
                      onChange={(v) => setFire((f) => void (f.ladder.length = v))} />
                    <MInput help="fireLadderWidth" label={mt(lang, "fireLadderWidth")} value={fire.ladder.width}
                      onChange={(v) => setFire((f) => void (f.ladder.width = v))} />
                    <MInput help="fireLadderRung" label={mt(lang, "fireLadderRung")} value={fire.ladder.rungSpacing}
                      onChange={(v) => setFire((f) => void (f.ladder.rungSpacing = v))} />
                    <MInput help="fireStowed" label={mt(lang, "fireStowed")} value={fire.ladder.stowedAboveGrade}
                      onChange={(v) => setFire((f) => void (f.ladder.stowedAboveGrade = v))} />
                    <MInput help="fireDeployed" label={mt(lang, "fireDeployed")} value={fire.ladder.deployedAboveGrade}
                      onChange={(v) => setFire((f) => void (f.ladder.deployedAboveGrade = v))} />
                    <MInput help="fireLandingSurface" label={mt(lang, "fireLandingSurface")} value={fire.ladder.landingSurface}
                      onChange={(v) => setFire((f) => void (f.ladder.landingSurface = v))} />
                    <MInput help="fireObstructions" label={mt(lang, "fireObstructions")} placeholder="—" value={fire.ladder.obstructions}
                      onChange={(v) => setFire((f) => void (f.ladder.obstructions = v))} />
                  </Grid>
                  {fireSurvey && (
                    <div className="mt-3">
                      <ChipRow help="fireLadderOperates" label={mt(lang, "fireLadderOperates")} value={fire.ladder.operates}
                        options={[["yes", mt(lang, "fireOp_yes")], ["stiff", mt(lang, "fireOp_stiff")], ["seized", mt(lang, "fireOp_seized")]]}
                        onChange={(v) => setFire((f) => void (f.ladder.operates = v as never))} />
                    </div>
                  )}
                </>
              )}
            </Card>

            {fireSurvey && (
              <Card stage="review" title={`📋 ${mt(lang, "fireOverallTitle")}`}>
                <ConditionFields lang={lang} c={fire.overall}
                  onField={(k, v) => setFire((f) => void ((f.overall as unknown as Record<string, string>)[k] = v))} />
                <div className="mt-3">
                  <Grid>
                    <MInput help="fireLoadTest" label={mt(lang, "fireLoadTest")} value={fire.loadTest}
                      onChange={(v) => setFire((f) => void (f.loadTest = v))} />
                    <MInput help="firePaintSystem" label={mt(lang, "firePaintSystem")} placeholder="—" value={fire.paintSystem}
                      onChange={(v) => setFire((f) => void (f.paintSystem = v))} />
                  </Grid>
                </div>
              </Card>
            )}
          </>
        )}

        {isWell && well && (
          <>
            <Card stage="setup" title={`🪟 ${mt(lang, "wellTitle")}`}>
              <p className="mb-3 text-xs text-neutral-400">{mt(lang, "wellHint")}</p>
              <div className="mb-4">
                <div className="mb-2 text-sm font-bold text-neutral-300">{mt(lang, "wellDeliverables")}</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {WELL_DELIVERABLES.map((k) => {
                    const on = well.deliverables.includes(k);
                    return (
                      <button key={k} type="button" onClick={() => toggleDeliverable(k)}
                        className={`rounded-xl border p-3 text-sm font-bold ${on ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}>
                        {on ? "✓ " : ""}{mt(lang, `wellD_${k}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Grid>
                <MSelect help="wellConstruction" label={mt(lang, "wellConstruction")} value={well.construction} lang={lang}
                  options={["poured_concrete", "block", "corrugated", "stone", "timber"]}
                  labels={Object.fromEntries(["poured_concrete", "block", "corrugated", "stone", "timber"].map((k) => [k, mt(lang, `wellC_${k}`)]))}
                  onChange={(v) => setWell((w) => void (w.construction = v as WellData["construction"]))} />
                <MInput help="wellLengthAtHouse" label={mt(lang, "wellLengthAtHouse")} value={well.lengthAtHouse}
                  onChange={(v) => setWell((w) => void (w.lengthAtHouse = v))} />
                <MInput help="wellProjection" label={mt(lang, "wellProjection")} value={well.projection}
                  onChange={(v) => setWell((w) => void (w.projection = v))} />
                <MInput help="wellWallThickness" label={mt(lang, "wellWallThickness")} value={well.wallThickness}
                  onChange={(v) => setWell((w) => void (w.wallThickness = v))} />
                <MInput help="wellInsideLength" label={mt(lang, "wellInsideLength")} value={well.insideLength}
                  onChange={(v) => setWell((w) => void (w.insideLength = v))} />
                <MInput help="wellInsideProjection" label={mt(lang, "wellInsideProjection")} value={well.insideProjection}
                  onChange={(v) => setWell((w) => void (w.insideProjection = v))} />
                <MInput help="wellDepth" label={mt(lang, "wellDepth")} value={well.depth}
                  onChange={(v) => setWell((w) => void (w.depth = v))} />
                <MInput help="wellTopToGrade" label={mt(lang, "wellTopToGrade")} placeholder="—" value={well.topToGrade}
                  onChange={(v) => setWell((w) => void (w.topToGrade = v))} />
                <MInput help="wellDiagA" label={mt(lang, "wellDiagA")} value={well.diagA}
                  onChange={(v) => setWell((w) => void (w.diagA = v))} />
                <MInput help="wellDiagB" label={mt(lang, "wellDiagB")} value={well.diagB}
                  onChange={(v) => setWell((w) => void (w.diagB = v))} />
              </Grid>
              <div className="mt-4 mb-2 text-sm font-bold text-neutral-300">{mt(lang, "wellWindowTitle")}</div>
              <Grid>
                <MInput help="wellWindowW" label={mt(lang, "wellWindowW")} value={well.windowW}
                  onChange={(v) => setWell((w) => void (w.windowW = v))} />
                <MInput help="wellWindowH" label={mt(lang, "wellWindowH")} value={well.windowH}
                  onChange={(v) => setWell((w) => void (w.windowH = v))} />
                <MInput help="wellSillToFloor" label={mt(lang, "wellSillToFloor")} value={well.sillToFloor}
                  onChange={(v) => setWell((w) => void (w.sillToFloor = v))} />
                <MSelect help="wellWindowSwing" label={mt(lang, "wellWindowSwing")} value={well.windowSwing} lang={lang}
                  options={["in", "out", "slider", "fixed"]}
                  labels={{ in: mt(lang, "wellSwingIn"), out: mt(lang, "wellSwingOut"), slider: mt(lang, "wellSlider"), fixed: mt(lang, "wellFixed") }}
                  onChange={(v) => setWell((w) => void (w.windowSwing = v as WellData["windowSwing"]))} />
              </Grid>
            </Card>

            {wellWants("guard") && (
              <Card stage="locations" title={`📐 ${mt(lang, "wellWallTitle")}`}>
                <p className="mb-3 text-xs text-neutral-400">{mt(lang, "wellWallHint")}</p>
                <Grid>
                  <MInput help="wellWallRef" label={mt(lang, "wellWallRef")} value={well.wallRef}
                    onChange={(v) => setWell((w) => void (w.wallRef = v))} />
                  <MInput help="wellMaxSphere" label={mt(lang, "wellMaxSphere")} value={well.maxSphere}
                    onChange={(v) => setWell((w) => void (w.maxSphere = v))} />
                </Grid>

                <div className="mt-4 mb-2 flex items-center">
                  <span className="text-sm font-bold text-neutral-300">{mt(lang, "wellBands")}</span>
                  <button type="button"
                    onClick={() => setWell((w) => void w.bands.push(newWallBand()))}
                    className="ml-auto rounded-full border border-amber-600 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300">
                    + {mt(lang, "wellAddBand")}
                  </button>
                </div>
                {well.bands.length === 0 && (
                  <p className="mb-3 text-sm text-neutral-500">{mt(lang, "wellNoBands")}</p>
                )}
                <div className="space-y-3">
                  {well.bands.map((b, i) => (
                    <div key={b.id} className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
                      <div className="mb-2 flex items-center">
                        <span className="font-bold text-amber-400">{mt(lang, "wellBand")} {i + 1}</span>
                        <button type="button"
                          onClick={() => setWell((w) => void (w.bands = w.bands.filter((x) => x.id !== b.id)))}
                          className="ml-auto rounded-full border border-red-900 px-2.5 py-1 text-xs text-red-400">
                          ✕ {mt(lang, "removePost")}
                        </button>
                      </div>
                      <Grid>
                        <MInput help="wellBandLabel" label={mt(lang, "wellBandLabel")} value={b.label}
                          onChange={(v) => setBand(b.id, "label", v)} />
                        <MInput help="wellBandSetback" label={mt(lang, "wellBandSetback")} value={b.setback}
                          onChange={(v) => setBand(b.id, "setback", v)} />
                        <MInput help="wellBandFrom" label={mt(lang, "wellBandFrom")} placeholder="—" value={b.fromTop}
                          onChange={(v) => setBand(b.id, "fromTop", v)} />
                        <MInput help="wellBandTo" label={mt(lang, "wellBandTo")} placeholder="—" value={b.toTop}
                          onChange={(v) => setBand(b.id, "toTop", v)} />
                      </Grid>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <MInput help="wellPostToWall" label={mt(lang, "wellPostToWall")} value={well.postToWall}
                    onChange={(v) => setWell((w) => void (w.postToWall = v))} />
                </div>

                {/* The answer: where the post is allowed to sit. */}
                {clearance && (
                  <div className={`mt-4 rounded-xl border p-4 ${clearance.impossible || (clearance.worst !== null && clearance.worst > clearance.sphere) ? "border-red-700 bg-red-950/40" : "border-green-700 bg-green-950/30"}`}>
                    <div className="text-sm font-bold text-neutral-200">{mt(lang, "wellSolverTitle")}</div>
                    {clearance.impossible ? (
                      <p className="mt-2 text-sm text-red-300">{mt(lang, "wellSolverImpossible")}</p>
                    ) : (
                      <>
                        <p className="mt-2 text-2xl font-black text-amber-300">
                          {formatIn(clearance.allowed)}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {mt(lang, "wellSolverMax")} {well.wallRef || mt(lang, "wellProudFace")}
                        </p>
                        <p className="mt-2 text-xs text-neutral-400">
                          {formatIn(clearance.sphere)} − {formatIn(clearance.maxSetback)} ({clearance.deepest || "—"})
                        </p>
                        {clearance.worst !== null && (
                          <p className={`mt-2 text-sm font-bold ${clearance.worst > clearance.sphere ? "text-red-300" : "text-green-300"}`}>
                            {clearance.worst > clearance.sphere ? "✗" : "✓"} {mt(lang, "wellSolverActual")} {formatIn(clearance.worst)} {mt(lang, "wellAt")} {clearance.deepest || "—"}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
                <Grid>
                  <MInput help="wellGuardHeight" label={mt(lang, "wellGuardHeight")} value={well.guardHeight}
                    onChange={(v) => setWell((w) => void (w.guardHeight = v))} />
                </Grid>
              </Card>
            )}

            {(wellWants("gate") || wellWants("ladder") || wellWants("grate")) && (
              <Card stage="specs" title={`🔧 ${mt(lang, "wellPartsTitle")}`}>
                {wellWants("gate") && (
                  <div className="mb-4">
                    <div className="mb-2 text-sm font-bold text-neutral-300">{mt(lang, "wellD_gate")}</div>
                    <Grid>
                      <MInput help="wellGateWidth" label={mt(lang, "wellGateWidth")} value={well.gateWidth}
                        onChange={(v) => setWell((w) => void (w.gateWidth = v))} />
                      <ChipRow help="wellGateSwing" label={mt(lang, "wellGateSwing")} value={well.gateSwing}
                        options={[["in", mt(lang, "wellSwingIn")], ["out", mt(lang, "wellSwingOut")]]}
                        onChange={(v) => setWell((w) => void (w.gateSwing = v as WellData["gateSwing"]))} />
                      <ChipRow help="wellGateHinge" label={mt(lang, "wellGateHinge")} value={well.gateHinge}
                        options={[["left", mt(lang, "leftLookingUp")], ["right", mt(lang, "rightLookingUp")]]}
                        onChange={(v) => setWell((w) => void (w.gateHinge = v as WellData["gateHinge"]))} />
                      <MInput help="wellGateLatch" label={mt(lang, "wellGateLatch")} placeholder="—" value={well.gateLatch}
                        onChange={(v) => setWell((w) => void (w.gateLatch = v))} />
                    </Grid>
                  </div>
                )}
                {wellWants("ladder") && (
                  <div className="mb-4">
                    <div className="mb-2 text-sm font-bold text-neutral-300">{mt(lang, "wellD_ladder")}</div>
                    <Grid>
                      <MInput help="wellLadderWidth" label={mt(lang, "wellLadderWidth")} value={well.ladderWidth}
                        onChange={(v) => setWell((w) => void (w.ladderWidth = v))} />
                      <MInput help="wellLadderRungs" label={mt(lang, "wellLadderRungs")} value={well.ladderRungs}
                        onChange={(v) => setWell((w) => void (w.ladderRungs = v))} />
                      <MInput help="wellLadderSpacing" label={mt(lang, "wellLadderSpacing")} value={well.ladderSpacing}
                        onChange={(v) => setWell((w) => void (w.ladderSpacing = v))} />
                      <MInput help="wellLadderStandoff" label={mt(lang, "wellLadderStandoff")} value={well.ladderStandoff}
                        onChange={(v) => setWell((w) => void (w.ladderStandoff = v))} />
                      <MInput help="wellLadderTopExt" label={mt(lang, "wellLadderTopExt")} placeholder="—" value={well.ladderTopExt}
                        onChange={(v) => setWell((w) => void (w.ladderTopExt = v))} />
                    </Grid>
                  </div>
                )}
                {wellWants("grate") && (
                  <div>
                    <div className="mb-2 text-sm font-bold text-neutral-300">{mt(lang, "wellD_grate")}</div>
                    <Grid>
                      <MSelect help="wellGrateBearing" label={mt(lang, "wellGrateBearing")} value={well.grateBearing} lang={lang}
                        options={["surface", "recessed", "angle_frame"]}
                        labels={Object.fromEntries(["surface", "recessed", "angle_frame"].map((k) => [k, mt(lang, `wellGB_${k}`)]))}
                        onChange={(v) => setWell((w) => void (w.grateBearing = v as WellData["grateBearing"]))} />
                      <MInput help="wellGrateInfill" label={mt(lang, "wellGrateInfill")} value={well.grateInfill}
                        onChange={(v) => setWell((w) => void (w.grateInfill = v))} />
                      <MInput help="wellGrateLoad" label={mt(lang, "wellGrateLoad")} value={well.grateLoad}
                        onChange={(v) => setWell((w) => void (w.grateLoad = v))} />
                    </Grid>
                    <label className="mt-3 flex items-center gap-2 text-sm text-neutral-300">
                      <input type="checkbox" checked={well.grateHinged}
                        onChange={(e) => setWell((w) => void (w.grateHinged = e.target.checked))}
                        className="h-5 w-5 accent-amber-500" />
                      {mt(lang, "wellGrateHinged")}
                    </label>
                  </div>
                )}
              </Card>
            )}
          </>
        )}

        {!isSpiral && !isWallRail && !isCustom && !isWell && !isFire && !isGate && !isFence && !isBalcony && (
          <Card stage="setup" title={`🏛 ${mt(lang, "existingStructuresTitle")}`}>
            <p className="mb-3 text-xs text-neutral-400">{mt(lang, "existingStructuresHint")}</p>
            <div className="mb-4 rounded-xl border border-neutral-700 bg-neutral-950/60 p-3">
              {viewList.length > 1 && (
                <div className="mb-3 flex gap-2">
                  {viewList.map(([vw, key]) => (
                    <button key={vw} type="button" onClick={() => setView(vw)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold ${view === vw ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}>
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
                shape={sheet.shape}
                data={data}
                lang={lang}
                view={view}
                onTapStep={tapStructureStep}
                onTapPlatform={tapStructurePlatform}
                onHoldStep={holdStepLocation}
                onHoldPlatform={holdPlatformLocation}
                onTapPost={tapPost}
                onHoldPost={(id) => setMovingPostId(id)}
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

        {/* Mixed assembly: build the staircase segment by segment */}
        {isBuilder && (
          <Card stage="steps" title={`🧱 ${mt(lang, "segmentsTitle")}`}>
            <div className="text-xs text-neutral-500 mb-3">{mt(lang, "segmentsHint")}</div>
            <div className="flex flex-wrap gap-2">
              <SmallBtn onClick={() => set((d) => void d.segments.push(newFlightSegment(3)))}>
                {mt(lang, "addFlightSeg")}
              </SmallBtn>
              <SmallBtn onClick={() => set((d) => void d.segments.push(newPlatformSegment("left")))}>
                {mt(lang, "addLandingSeg")}
              </SmallBtn>
              <SmallBtn onClick={() => set((d) => void d.segments.push(blankRamp()))}>
                {mt(lang, "addRampSeg")}
              </SmallBtn>
              <SmallBtn onClick={() => set((d) => void d.segments.push(blankCurve()))}>
                {mt(lang, "addCurveSeg")}
              </SmallBtn>
              {data.segments.length > 1 && (
                <SmallBtn
                  onClick={() =>
                    set((d) => {
                      const last = d.segments.length - 1;
                      d.segments.pop();
                      d.posts = d.posts.filter((po) => po.segIdx !== last);
                    })
                  }
                >
                  {mt(lang, "removeLastSeg")}
                </SmallBtn>
              )}
            </div>
          </Card>
        )}

        {/* Sketch (custom shapes draw their own plan below instead) */}
        {!isCustom && ["posts", "locations"].includes(activeStage) && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
          <div className="font-bold mb-1">{mt(lang, "sketch")}</div>
          {!isSpiral && !isWallRail && (
            <div className="text-xs text-neutral-500 mb-2">
              {mt(
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
                  : sheet.shape === "level_run" || sheet.shape === "ramp"
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
            <div className="flex gap-2 mb-3">
              {viewList.map(([vw, key]) => (
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
          )}
          <div className="md:grid md:grid-cols-2 md:gap-4 md:items-start">
            <div>
              <div className="hidden md:block text-[11px] text-neutral-500 mb-1">
                {mt(lang, viewList.find(([vw]) => vw === view)?.[1] || viewList[0][1])}
              </div>
              <Sketch
                shape={sheet.shape}
                data={data}
                lang={lang}
                view={view}
                onTapStep={addStepPost}
                onTapPlatform={addPlatformPost}
                onHoldStep={holdStepLocation}
                onHoldPlatform={holdPlatformLocation}
                onTapPost={tapPost}
                onHoldPost={(id) => setMovingPostId(id)}
                onToggleWallSide={toggleSketchWall}
              />
            </div>
            {viewList.length > 1 && (
              <div className="hidden md:block">
                <div className="text-[11px] text-neutral-500 mb-1">
                  {mt(lang, viewList.find(([vw]) => vw !== view)![1])}
                </div>
                <Sketch
                  shape={sheet.shape}
                  data={data}
                  lang={lang}
                  view={viewList.find(([vw]) => vw !== view)![0]}
                  onTapStep={addStepPost}
                  onTapPlatform={addPlatformPost}
                  onHoldStep={holdStepLocation}
                  onHoldPlatform={holdPlatformLocation}
                  onTapPost={tapPost}
                onHoldPost={(id) => setMovingPostId(id)}
                  onToggleWallSide={toggleSketchWall}
                />
              </div>
            )}
          </div>
        </div>
        )}

        {/* Spiral geometry */}
        {isSpiral && data.spiral && (
          <Card stage="steps" title={mt(lang, "spiralTitle")}>
            <Grid>
              <MInput help="floorToFloor" label={mt(lang, "floorToFloor")} value={data.spiral.floorToFloor}
                onChange={(v) => set((d) => void (d.spiral!.floorToFloor = v))} />
              <MInput help="treadsCount" label={mt(lang, "treadsCount")} placeholder="—" value={data.spiral.treads}
                onChange={(v) => set((d) => void (d.spiral!.treads = v))} />
              <MInput help="rotation" label={mt(lang, "rotation")} placeholder="°" value={data.spiral.rotationDeg}
                onChange={(v) => set((d) => void (d.spiral!.rotationDeg = v))} />
              <MInput help="diameter" label={mt(lang, "diameter")} value={data.spiral.diameter}
                onChange={(v) => set((d) => void (d.spiral!.diameter = v))} />
              <MInput help="columnSize" label={mt(lang, "columnSize")} value={data.spiral.columnSize}
                onChange={(v) => set((d) => void (d.spiral!.columnSize = v))} />
              <MInput help="clearWidth" label={mt(lang, "clearWidth")} value={data.spiral.clearWidth}
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
              <MInput help="landingNote" label={mt(lang, "landingNote")} placeholder="—" value={data.spiral.landingNote}
                onChange={(v) => set((d) => void (d.spiral!.landingNote = v))} />
            </div>
          </Card>
        )}

        {/* Flights — one measured row per step */}
        {flights.map(({ seg, i }, fi) => (
          <Card stage="level" key={`level-${i}`} title={`📏 ${mt(lang, "straightedgeCheck")} ${flights.length > 1 ? fi + 1 : ""}`}>
            <p className="mb-3 text-xs text-neutral-400">{mt(lang, "straightedgeHint")}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {seg.steps.map((st, si) => (
                <MInput key={si} label={`${mt(lang, "step")} ${stepNumber(flights, fi, si)} — ${mt(lang, "levelGap")}`}
                  placeholder={mt(lang, "touchingZero")} value={st.levelGap || ""}
                  onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].levelGap = v))} />
              ))}
            </div>
          </Card>
        ))}

        {flights.map(({ seg, i }, fi) => (
          <Card stage="locations" key={`angle-${i}`} title={`📐 ${mt(lang, "stairAngle")}${flights.length > 1 ? ` ${fi + 1}` : ""}`}>
            <p className="mb-3 text-xs text-neutral-400">{mt(lang, "angleFinderHint")}</p>
            <Grid>
              <MInput help="stairAngle" label={mt(lang, "stairAngle")} value={seg.angleDeg} placeholder="°"
                onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).angleDeg = v))} />
              <ChoiceMInput label={`${mt(lang, "angleBreak")} — ${mt(lang, "angleBreakHint")}`}
                choices={[["No change", mt(lang, "choiceNoChange")]]} placeholder="—" value={seg.angleBreak}
                onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).angleBreak = v))} />
            </Grid>
          </Card>
        ))}

        {hasWinders && (
          <Card stage="steps" title={`◺ ${mt(lang, "winderSetupTitle")}`}>
            <ChoiceMInput label={mt(lang, "walklineLbl")} hint={mt(lang, "walklineInfo")} hintDiagram="walkline" value={data.datums.walkline}
              choices={[["Mid-tread", mt(lang, "choiceMidTread")], ['12" from narrow edge', mt(lang, "choiceWalkline12")]]}
              onChange={(v) => set((d) => void (d.datums.walkline = v))} />
          </Card>
        )}

        {flights.map(({ seg, i }, fi) => (
          <Card stage="steps"
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
                  // spread first: winder fields and nosing survive the fill
                  fl.steps = fl.steps.map((st) => ({
                    ...st,
                    rise: nr || st.rise,
                    run: nu || st.run,
                  }));
                })
              }
            />

            {/* header row only where the compact grid shows (sm+) */}
            <div className="hidden sm:grid grid-cols-[2.2rem_1fr_1fr_1fr_3rem] gap-2 items-end mb-1 text-[11px] text-neutral-400">
              <span>#</span>
              {/* On tablets the per-field labels are hidden and this row is
                  what the measurer reads, so the explanations live here too. */}
              <span className="flex items-center">
                {mt(lang, "rise")}
                <InfoHint text={helpText(lang, "rise")!} />
              </span>
              <span className="flex items-center">
                {mt(lang, "run")}
                <InfoHint text={helpText(lang, "run")!} />
              </span>
              <span className="flex items-center">
                {mt(lang, "nosing")}
                <InfoHint text={helpText(lang, "nosing")!} />
              </span>
              <span>◺</span>
            </div>
            {seg.steps.map((st, si) => (
              <div
                key={si}
                className="mb-3 rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 sm:mb-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:grid sm:grid-cols-[2.2rem_1fr_1fr_1fr_3rem] sm:gap-2 sm:items-center"
              >
                <div className="sm:hidden text-xs font-bold text-amber-400 mb-2">
                  {mt(lang, "step")} {stepNumber(flights, fi, si)}
                </div>
                <span className="hidden sm:block text-sm font-bold text-neutral-400 text-center border border-neutral-800 rounded-full w-7 h-7 leading-[26px]">
                  {stepNumber(flights, fi, si)}
                </span>
                <div className="grid grid-cols-1 gap-2 sm:contents">
                  <MInput help="rise" label={mt(lang, "rise")} labelClass="sm:hidden" value={st.rise}
                    onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].rise = v))} />
                  <MInput help="run" label={mt(lang, "run")} labelClass="sm:hidden" value={st.run}
                    onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].run = v))} />
                  <MInput help="nosing" label={mt(lang, "nosing")} labelClass="sm:hidden" value={st.nosing}
                    onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].nosing = v))} />
                </div>
                {/* winder toggle — triangular tread that turns the stair */}
                <button
                  onClick={() =>
                    set((d) => {
                      const stp = (d.segments[i] as FlightSegment).steps[si];
                      stp.winder = !stp.winder;
                    })
                  }
                  className={`mt-2 sm:mt-0 px-2 py-2 rounded-lg border text-sm font-bold ${
                    st.winder
                      ? "border-amber-500 bg-amber-500/10 text-amber-300"
                      : "border-neutral-700 bg-neutral-800 text-neutral-500"
                  }`}
                  title={mt(lang, "winderLbl")}
                >
                  ◺ <span className="sm:hidden">{mt(lang, "winderLbl")}</span>
                </button>
                {st.winder && (
                  <div className="mt-2 sm:col-span-5 grid grid-cols-1 sm:grid-cols-3 gap-2 border border-amber-900/50 rounded-lg p-2 bg-amber-500/5">
                    <MInput help="winderRunIn" label={mt(lang, "winderRunIn")} value={st.runIn || ""}
                      onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].runIn = v))} />
                    <MInput help="winderRunOut" label={mt(lang, "winderRunOut")} value={st.runOut || ""}
                      onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].runOut = v))} />
                    <MInput help="winderTurn" label={mt(lang, "winderTurn")} placeholder="°" value={st.turnDeg || ""}
                      onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].turnDeg = v))} />
                  </div>
                )}
                {si === 0 && (
                  <div className="mt-2 sm:mt-0 sm:col-span-5">
                    <SmallBtn
                      onClick={() =>
                        set((d) => {
                          const fl = d.segments[i] as FlightSegment;
                          const s1 = fl.steps[0];
                          // copy dimensions only — each step keeps its own
                          // winder flag and winder measurements
                          fl.steps = fl.steps.map((st) => ({
                            ...st,
                            rise: s1.rise,
                            run: s1.run,
                            nosing: s1.nosing,
                          }));
                        })
                      }
                    >
                      ⇊ {mt(lang, "copyToAll")}
                    </SmallBtn>
                  </div>
                )}
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
            </div>
            <Grid>
              <MInput help="width" label={mt(lang, "width")} value={seg.width}
                onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).width = v))} />
            </Grid>
            {multiFlight && (
              <div className="mt-3 border border-neutral-800 rounded-lg p-3 bg-neutral-950/40">
                <div className="text-xs text-neutral-500 mb-2">{mt(lang, "flightCtrlHint")}</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <MInput help="flightRake" label={mt(lang, "flightRake")} value={seg.rake}
                    onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).rake = v))} />
                  <MInput help="flightCtrlRise" label={mt(lang, "flightCtrlRise")} value={seg.ctrlRise}
                    onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).ctrlRise = v))} />
                  <MInput help="flightCtrlRun" label={mt(lang, "flightCtrlRun")} value={seg.ctrlRun}
                    onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).ctrlRun = v))} />
                </div>
              </div>
            )}
          </Card>
        ))}

        {/* Platforms / landings */}
        {platforms.map(({ seg, i }) => (
          <Card stage="level" key={i} title={mt(lang, seg.turn === "none" ? "platform" : "landing")}>
            <Grid>
              <MInput help="length" label={mt(lang, "length")} value={seg.length}
                onChange={(v) => set((d) => void ((d.segments[i] as PlatformSegment).length = v))} />
              <MInput help="depth" label={mt(lang, "depth")} value={seg.depth}
                onChange={(v) => set((d) => void ((d.segments[i] as PlatformSegment).depth = v))} />
              <MInput help="landingDiag" label={mt(lang, "landingDiag")} value={seg.diag}
                onChange={(v) => set((d) => void ((d.segments[i] as PlatformSegment).diag = v))} />
              <ChoiceMInput label={`${mt(lang, "slope")} — ${mt(lang, "slopeHint")}`} value={seg.slope}
                choices={[["0", mt(lang, "choiceLevel")]]}
                onChange={(v) => set((d) => void ((d.segments[i] as PlatformSegment).slope = v))} />
              {seg.slope.trim() !== "" && (
                <ChoiceMInput label={mt(lang, "slopeDir")} placeholder="—" value={seg.slopeDir}
                  choices={slopeDirectionChoices(lang)} onChange={(v) => set((d) => void ((d.segments[i] as PlatformSegment).slopeDir = v))} />
              )}
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

        {/* Ramps (one card per ramp segment) */}
        {ramps.map(({ seg, i }) => (
          <Card stage="steps" key={i} title={`${mt(lang, "shape_ramp")}${ramps.length > 1 || isBuilder ? ` #${i + 1}` : ""}`}>
            <Grid>
              <MInput help="rampSlopeLen" label={mt(lang, "rampSlopeLen")} value={seg.length}
                onChange={(v) => set((d) => void ((d.segments[i] as RampSegment).length = v))} />
              <MInput help="rampRunH" label={mt(lang, "rampRunH")} value={seg.runH}
                onChange={(v) => set((d) => void ((d.segments[i] as RampSegment).runH = v))} />
              <MInput help="totalRise" label={mt(lang, "totalRise")} value={seg.rise}
                onChange={(v) => set((d) => void ((d.segments[i] as RampSegment).rise = v))} />
              <MInput help="stairAngle" label={mt(lang, "stairAngle")} value={seg.angleDeg} placeholder="°"
                onChange={(v) => set((d) => void ((d.segments[i] as RampSegment).angleDeg = v))} />
              <MInput help="width" label={mt(lang, "width")} value={seg.width}
                onChange={(v) => set((d) => void ((d.segments[i] as RampSegment).width = v))} />
            </Grid>
          </Card>
        ))}

        {/* Curves */}
        {curves.map(({ seg, i }) => (
          <Card stage="steps" key={i} title={`⌒ ${mt(lang, "curveTitle")}${isBuilder ? ` #${i + 1}` : ""}`}>
            <Grid>
              <MInput help="curveRadius" label={mt(lang, "curveRadius")} value={seg.radius}
                onChange={(v) => set((d) => void ((d.segments[i] as CurveSegment).radius = v))} />
              <MInput help="curveChord" label={mt(lang, "curveChord")} value={seg.chord}
                onChange={(v) => set((d) => void ((d.segments[i] as CurveSegment).chord = v))} />
              <MInput help="curveArc" label={mt(lang, "curveArc")} value={seg.arc}
                onChange={(v) => set((d) => void ((d.segments[i] as CurveSegment).arc = v))} />
              <MInput help="curveSweep" label={mt(lang, "curveSweep")} placeholder="°" value={seg.sweepDeg}
                onChange={(v) => set((d) => void ((d.segments[i] as CurveSegment).sweepDeg = v))} />
              <MInput help="curveRise" label={mt(lang, "curveRise")} value={seg.rise}
                onChange={(v) => set((d) => void ((d.segments[i] as CurveSegment).rise = v))} />
              <MInput help="width" label={mt(lang, "width")} value={seg.width}
                onChange={(v) => set((d) => void ((d.segments[i] as CurveSegment).width = v))} />
            </Grid>
            <div className="mt-3">
              <ChipRow help="turn"
                label={mt(lang, "turn")}
                value={seg.direction}
                options={[
                  ["left", `↰ ${mt(lang, "turnLeft")}`],
                  ["right", `↱ ${mt(lang, "turnRight")}`],
                ]}
                onChange={(v) =>
                  set((d) => void ((d.segments[i] as CurveSegment).direction = (v || "left") as "left" | "right"))
                }
              />
            </div>
          </Card>
        ))}

        {/* Posts */}
        {!isSpiral && !isWallRail && !isCustom && !isWell && !isFire && !isGate && !isFence && !isBalcony && (
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
                          onChange={(v) => setPost(set, po.id, "mount", v)} />
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
                        onChange={(v) => setPost(set, po.id, "anchors", v)} />
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
        {(!isWell || wellWants("guard")) && (!isFire || fireNew) && (
        <Card stage="posts" title={mt(lang, "railSection")}>
          <Grid>
            <MSelect help="railKind" label={mt(lang, "railKind")} value={data.rail.kind}
              options={[...RAIL_KIND_OPTIONS]} lang={lang}
              onChange={(v) => set((d) => void (d.rail.kind = v))} />
            <MInput help="railHeight" label={mt(lang, "railHeight")} value={data.rail.height}
              onChange={(v) => set((d) => void (d.rail.height = v))} />
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
        <Card stage="specs" title={mt(lang, "materialsTitle")}>
          <div className="space-y-3">
            {!isWallRail && <PresetInput label={mt(lang, "matPost")} value={data.materials.post}
              presets={presets.post}
              onChange={(v) => set((d) => void (d.materials.post = v))} />}
            <PresetInput label={mt(lang, "matTopRail")} value={data.materials.topRail}
              presets={presets.topRail}
              onChange={(v) => set((d) => void (d.materials.topRail = v))} />
            {hasGuardrail && <PresetInput label={mt(lang, "matPicket")} value={data.materials.picket}
              presets={presets.picket}
              onChange={(v) => set((d) => void (d.materials.picket = v))} />}
            <Grid>
              {hasGuardrail && <>
                <MInput help="matPicketSpacing" label={mt(lang, "matPicketSpacing")} value={data.materials.picketSpacing}
                  onChange={(v) => set((d) => void (d.materials.picketSpacing = v))} />
                <MSelect help="matBottomRail" label={mt(lang, "matBottomRail")} value={data.materials.bottomRail}
                  options={presets.bottomRail} lang={lang}
                  onChange={(v) => set((d) => void (d.materials.bottomRail = v))} />
              </>}
              <MSelect help="finish" label={mt(lang, "finish")} value={data.materials.finish}
                options={finishOptions} lang={lang} spec
                onChange={(v) => set((d) => void (d.materials.finish = v))} />
              <MSelect help="color" label={mt(lang, "color")} value={data.materials.color}
                options={colorOptions} lang={lang} spec
                onChange={(v) => set((d) => void (d.materials.color = v))} />
            </Grid>
            <MInput help="matNotes" label={mt(lang, "matNotes")} placeholder="—" value={data.materials.notes}
              onChange={(v) => set((d) => void (d.materials.notes = v))} />
          </div>
        </Card>

        {/* Site & finish conditions — what surface existed when measured */}
        <Card stage="setup" title={`🧱 ${mt(lang, "finishTitle")}`}>
          <ChipRow help="floorChangeQuestion"
            label={mt(lang, "floorChangeQuestion")}
            value={data.finish.floorChange}
            options={[
              ["none", mt(lang, "floorChangeNone")],
              ["bottom", mt(lang, "floorChangeBottom")],
              ["top", mt(lang, "floorChangeTop")],
              ["both", mt(lang, "floorChangeBoth")],
            ]}
            onChange={(v) => set((d) => void (d.finish.floorChange = v as FinishSpec["floorChange"]))}
          />
          <Grid>
            {(data.finish.floorChange === "bottom" || data.finish.floorChange === "both") && (
              <MInput help="bottomAdjustment" label={mt(lang, "bottomAdjustment")} placeholder='+ 3/4"' value={data.finish.bottomAdjustment}
                onChange={(v) => set((d) => void (d.finish.bottomAdjustment = v))} />
            )}
            {(data.finish.floorChange === "top" || data.finish.floorChange === "both") && (
              <MInput help="topAdjustment" label={mt(lang, "topAdjustment")} placeholder='+ 3/4"' value={data.finish.topAdjustment}
                onChange={(v) => set((d) => void (d.finish.topAdjustment = v))} />
            )}
            {(hasFlights || isSpiral) && (
              <MInput help="treadCovering" label={mt(lang, "treadCovering")} placeholder="—" value={data.finish.treadCovering}
                onChange={(v) => set((d) => void (d.finish.treadCovering = v))} />
            )}
            {(isWallRail || data.datums.orientation.includes("wall")) && (
              <MInput help="wallFinish" label={mt(lang, "wallFinish")} placeholder="—" value={data.finish.wallFinish}
                onChange={(v) => set((d) => void (d.finish.wallFinish = v))} />
            )}
            <ChoiceMInput label={mt(lang, "demoPending")} placeholder="—" value={data.finish.demoPending}
              choices={[["No", mt(lang, "choiceNo")], ["Yes", mt(lang, "choiceYes")]]}
              onChange={(v) => set((d) => void (d.finish.demoPending = v))} />
          </Grid>
          {((data.finish.floorChange !== "" && data.finish.floorChange !== "none") || data.finish.demoPending === "Yes") && <button
            onClick={() => set((d) => void (d.finish.verifyAfterFinishes = !d.finish.verifyAfterFinishes))}
            className={`mt-3 px-3 py-2.5 rounded-lg border text-sm font-semibold ${
              data.finish.verifyAfterFinishes
                ? "border-amber-500 bg-amber-500/10 text-amber-300"
                : "border-neutral-700 bg-neutral-800 text-neutral-300"
            }`}
          >
            {data.finish.verifyAfterFinishes ? "☑" : "☐"} {mt(lang, "verifyAfterFinishes")}
          </button>}
        </Card>

        {/* Field-observed constraints that determine later fabrication decisions. */}
        <Card stage="specs" title={`🔩 ${mt(lang, "fabTitle")}`}>
          <Grid>
            <ChoiceMInput label={mt(lang, "fabMaxPiece")} placeholder="—" value={data.fab.maxPiece}
              choices={[["No restriction", mt(lang, "choiceNoRestriction")]]}
              onChange={(v) => set((d) => void (d.fab.maxPiece = v))} />
            <ChoiceMInput label={mt(lang, "fabAccess")} placeholder="—" value={data.fab.access}
              choices={accessChoices(lang)}
              onChange={(v) => set((d) => void (d.fab.access = v))} />
            {sheet.shape === "level_run" && (
              <ChoiceMInput label={mt(lang, "fabGate")} placeholder="—" value={data.fab.gate}
                choices={[["No gate", mt(lang, "choiceNoGate")], ["Gate included", mt(lang, "choiceGateIncluded")]]}
                onChange={(v) => set((d) => void (d.fab.gate = v))} />
            )}
          </Grid>
        </Card>

        {/* Control dimensions — independent measurements the software cross-checks */}
        {!isCustom && hasFlights && (
        <Card stage="locations" title={`🎯 ${mt(lang, "controlsTitle")}`}>
          <div className="text-xs text-neutral-500 mb-3">{mt(lang, "controlsHint")}</div>
          <Grid>
            {!isSpiral && sheet.shape !== "level_run" && sheet.shape !== "ramp" && (
              <MInput help="floorToFloor" label={mt(lang, "floorToFloor")} value={data.overall.floorToFloor}
                onChange={(v) => set((d) => void (d.overall.floorToFloor = v))} />
            )}
            {!multiFlight && (
              <MInput help="totalRun" label={mt(lang, "totalRun")} value={data.overall.totalRun}
                onChange={(v) => set((d) => void (d.overall.totalRun = v))} />
            )}
            {!isSpiral && !multiFlight && (
              <MInput help="rakeLength" label={mt(lang, "rakeLength")} value={data.overall.rakeLength}
                onChange={(v) => set((d) => void (d.overall.rakeLength = v))} />
            )}
            {!isSpiral && sheet.shape !== "level_run" && (
              <>
                <MInput help="widthBottom" label={mt(lang, "widthBottom")} value={data.overall.widthBottom}
                  onChange={(v) => set((d) => void (d.overall.widthBottom = v))} />
                <MInput help="widthMid" label={mt(lang, "widthMid")} value={data.overall.widthMid}
                  onChange={(v) => set((d) => void (d.overall.widthMid = v))} />
                <MInput help="widthTop" label={mt(lang, "widthTop")} value={data.overall.widthTop}
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
        )}

        {/* Custom shape: draw the plan, then dimension every line */}
        {isCustom && data.plan && (
          <Card stage="steps" title={`✏️ ${mt(lang, "drawTitle")}`}>
            <PlanDraw
              plan={data.plan}
              lang={lang}
              onChange={(next) => set((d) => void (d.plan = next))}
            />
            {data.plan.segs.length > 0 && (
              <div className="mt-4">
                <div className="font-bold text-sm mb-2">{mt(lang, "planSegs")}</div>
                <div className="space-y-3">
                  {data.plan.segs.map((sg, i) => (
                    <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-3">
                      <div className="mb-2 font-bold text-amber-400">{mt(lang, "segment")} {i + 1}</div>
                      <ChipRow help="segmentType" label={mt(lang, "segmentType")} value={sg.kind || ""}
                        options={(["flight", "landing", "level", "ramp", "curve"] as const).map((kind) => [kind, mt(lang, `segment_${kind}`)])}
                        onChange={(v) => set((d) => void (d.plan!.segs[i].kind = v as typeof sg.kind))} />
                      <div className="mt-3"><Grid>
                        <MInput help="length" label={mt(lang, "length")} value={sg.len}
                          onChange={(v) => set((d) => void (d.plan!.segs[i].len = v))} />
                        <MInput help="width" label={mt(lang, "width")} value={sg.width || ""}
                          onChange={(v) => set((d) => void (d.plan!.segs[i].width = v))} />
                        {sg.kind === "flight" && <>
                          <MInput help="stepsThisFlight" label={mt(lang, "stepsThisFlight")} placeholder="0" value={sg.steps || ""}
                            onChange={(v) => set((d) => {
                              const ps = d.plan!.segs[i];
                              ps.steps = v;
                              const count = Math.max(0, Math.min(60, Number.parseInt(v, 10) || 0));
                              ps.stepMeasures = Array.from({ length: count }, (_, si) =>
                                ps.stepMeasures?.[si] || { rise: "", run: "", nosing: "", levelGap: "" }
                              );
                            })} />
                          <MInput help="typicalRise" label={mt(lang, "typicalRise")} value={sg.rise || ""}
                            onChange={(v) => set((d) => void (d.plan!.segs[i].rise = v))} />
                          <MInput help="typicalRun" label={mt(lang, "typicalRun")} value={sg.run || ""}
                            onChange={(v) => set((d) => void (d.plan!.segs[i].run = v))} />
                        </>}
                        {(sg.kind === "ramp" || sg.kind === "curve") && (
                          <MInput help="segmentRise" label={mt(lang, "segmentRise")} value={sg.rise || ""}
                            onChange={(v) => set((d) => void (d.plan!.segs[i].rise = v))} />
                        )}
                      </Grid></div>
                      {sg.kind === "flight" && (sg.stepMeasures?.length || 0) > 0 && (
                        <details className="mt-3 rounded-lg border border-neutral-800 p-3">
                          <summary className="cursor-pointer text-sm font-bold text-amber-300">{mt(lang, "individualStepCorrections")}</summary>
                          <div className="mt-3">
                            <SmallBtn onClick={() => set((d) => {
                              const ps = d.plan!.segs[i];
                              ps.stepMeasures = ps.stepMeasures.map((st) => ({ ...st, rise: ps.rise, run: ps.run }));
                            })}>⇊ {mt(lang, "fillTypicalAll")}</SmallBtn>
                            <div className="mt-3 space-y-2">
                              {sg.stepMeasures.map((st, si) => (
                                <div key={si} className="grid grid-cols-[2rem_1fr_1fr] items-end gap-2">
                                  <span className="pb-3 text-center text-sm font-bold text-neutral-400">{si + 1}</span>
                                  <MInput help="rise" label={mt(lang, "rise")} value={st.rise}
                                    onChange={(v) => set((d) => void (d.plan!.segs[i].stepMeasures[si].rise = v))} />
                                  <MInput help="run" label={mt(lang, "run")} value={st.run}
                                    onChange={(v) => set((d) => void (d.plan!.segs[i].stepMeasures[si].run = v))} />
                                </div>
                              ))}
                            </div>
                          </div>
                        </details>
                      )}
                      <div className="mt-3">
                        <MInput help="notes" label={mt(lang, "notes")} placeholder="—" value={sg.note}
                          onChange={(v) => set((d) => void (d.plan!.segs[i].note = v))} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Photo checklist — required evidence, slot by slot */}
        <Card stage="photos" title={`📷 ${mt(lang, "photoChecklist")}`}>
          <div className="text-xs text-neutral-500 mb-3">{mt(lang, "photosHint")}</div>
          {slotErr && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg p-2.5 mb-3">
              {slotErr}
            </div>
          )}
          <div className="space-y-2">
            {requiredPhotoSlots(sheet.shape).map((slot) => (
              <SlotRow key={slot} slot={slot} label={mt(lang, `slot_${slot}`)} required
                data={data} lang={lang} busy={slotBusy === slot}
                onFile={(f) => directSlotPhoto(slot, mt(lang, `slot_${slot}`), f)}
                onTake={() => setPhotoSlot({ slot, label: mt(lang, `slot_${slot}`) })} />
            ))}
            {OPTIONAL_PHOTO_SLOTS.map((slot) => (
              <SlotRow key={slot} slot={slot} label={mt(lang, `slot_${slot}`)} required={false}
                data={data} lang={lang} busy={slotBusy === slot}
                onFile={(f) => directSlotPhoto(slot, mt(lang, `slot_${slot}`), f)}
                onTake={() => setPhotoSlot({ slot, label: mt(lang, `slot_${slot}`) })} />
            ))}
          </div>
        </Card>

        {/* Change history — from the immutable audit trail. Anyone may edit
            any sheet; this makes every hand that touched it visible. */}
        {history.length > 0 && (
          <Card stage="review" title={`🕘 ${mt(lang, "historyTitle")}`}>
            {sheet.created_by && (
              <div className="text-xs text-neutral-500 mb-2">
                {mt(lang, "histOriginalBy")}{" "}
                <span className="text-neutral-300 font-semibold">
                  {nameById[sheet.created_by] || "—"}
                </span>
              </div>
            )}
            <div className="space-y-1.5">
              {history.map((h, i) => {
                const otherEdit =
                  h.action === "sheet_update" &&
                  !!sheet.created_by &&
                  !!h.workerId &&
                  h.workerId !== sheet.created_by;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-sm rounded-lg px-2.5 py-1.5 border ${
                      otherEdit
                        ? "border-amber-700/60 bg-amber-950/30"
                        : "border-neutral-800 bg-neutral-950/40"
                    }`}
                  >
                    <span className="text-neutral-500 text-xs shrink-0 tabular-nums">
                      {new Date(h.at).toLocaleString()}
                    </span>
                    <span className="font-semibold truncate">
                      {h.workerId ? nameById[h.workerId] || "—" : "—"}
                    </span>
                    <span className="text-neutral-400 truncate">
                      {mt(lang, `hist_${h.action}`)}
                    </span>
                    {otherEdit && (
                      <span className="ml-auto text-[11px] text-amber-300 shrink-0">
                        ⚠ {mt(lang, "histOtherEdit")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Review & submit — checks, gaps, and the approval gate */}
        <Card stage="review" title={`✅ ${mt(lang, "reviewTitle")}`}>
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
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStage(gapStage(g.key));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="w-full text-left rounded-md px-2 py-1.5 -mx-2 hover:bg-neutral-800 active:bg-neutral-700"
                    >
                      •{" "}
                      {g.key === "photo"
                        ? `${mt(lang, "gap_photo")}: ${mt(lang, `slot_${g.detail}`)}`
                        : `${mt(lang, `gap_${g.key}`)}${g.detail ? ` (${g.detail})` : ""}`}
                      <span className="float-right text-amber-400" aria-hidden>→</span>
                    </button>
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
                disabled={!canSubmit || pendingLocal || saveState === "dirty" || saveState === "saving"}
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
                    onClick={() => approveSheet()}
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
              <a
                href={`/shop/job/${job.id}/measure/${sheet.id}/rev/${rev}`}
                className="inline-block text-xs font-bold border border-green-700 bg-green-950/40 text-green-300 rounded-full px-3 py-2 mb-2"
              >
                🔒 {mt(lang, "viewLockedRev")} — {mt(lang, "revLabel")} {rev} ›
              </a>
              <div className="text-xs text-amber-300/80">⚠ {mt(lang, "editWarning")}</div>
            </div>
          )}
        </Card>
        <div className="flex gap-3 mt-2">
          {activeStageIndex > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveStage(EDITOR_STAGES[activeStageIndex - 1].id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex-1 rounded-xl border border-neutral-700 bg-neutral-900 py-3 font-bold text-neutral-200"
            >
              ← {mt(lang, "previousStage")}
            </button>
          )}
          {activeStageIndex < EDITOR_STAGES.length - 1 && (
            <button
              type="button"
              onClick={() => {
                setActiveStage(EDITOR_STAGES[activeStageIndex + 1].id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex-1 rounded-xl border border-amber-500 bg-amber-500 py-3 font-bold text-black"
            >
              {mt(lang, "nextStage")} →
            </button>
          )}
        </div>
        </StageCtx.Provider>
      </div>

      {placementMenu && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-4" onClick={() => setPlacementMenu(null)}>
          <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-bold mb-1">{mt(lang, "choosePointType")}</div>
            <div className="text-xs text-neutral-400 mb-3">{mt(lang, "choosePointHint")}</div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(["left", "right"] as const).map((side) => (
                <button key={side} type="button" onClick={() => setPlacementMenu((m) => m ? { ...m, side } : m)}
                  className={`rounded-xl border p-3 font-bold ${placementMenu.side === side ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-neutral-700 bg-neutral-800"}`}>
                  {mt(lang, side === "left" ? "leftLookingUp" : "rightLookingUp")}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["railing_post", "existing_post", "concrete_wall", "clip"] as const).map((type) => (
                <button key={type} type="button" onClick={() => addTypedPoint(type)}
                  className="rounded-xl border border-neutral-700 bg-neutral-800 p-4 text-left font-bold active:bg-neutral-700">
                  {type === "railing_post" ? "▣" : type === "existing_post" ? "▤" : type === "concrete_wall" ? "▥" : "⊣"}{" "}
                  {mt(lang, `point_${type}`)}
                </button>
              ))}
            </div>
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
        branding={orgSettings?.branding}
      />
    </PlaceholderCtx.Provider>
    </LangCtx.Provider>
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

function ConditionFields({
  lang,
  c,
  onField,
}: {
  lang: string;
  c: FireCondition;
  onField: (key: string, value: string) => void;
}) {
  return (
    <>
      <ChipRow help="fireRating" label={mt(lang, "fireRating")} value={c.rating}
        options={CONDITION_RATINGS.map((r) => [r, mt(lang, `fireR_${r}`)] as [string, string])}
        onChange={(v) => onField("rating", v)} />
      <div className="mt-3">
        <Grid>
          <MInput help="fireRust" label={mt(lang, "fireRust")} placeholder="—" value={c.rust} onChange={(v) => onField("rust", v)} />
          <MInput help="fireSectionLoss" label={mt(lang, "fireSectionLoss")} placeholder="—" value={c.sectionLoss} onChange={(v) => onField("sectionLoss", v)} />
          <MInput help="fireCracks" label={mt(lang, "fireCracks")} placeholder="—" value={c.cracks} onChange={(v) => onField("cracks", v)} />
          <MInput help="fireDeckCondition" label={mt(lang, "fireDeckCondition")} placeholder="—" value={c.deck} onChange={(v) => onField("deck", v)} />
          <MInput help="fireGuardCondition" label={mt(lang, "fireGuardCondition")} placeholder="—" value={c.guards} onChange={(v) => onField("guards", v)} />
          <MInput help="fireAnchorCondition" label={mt(lang, "fireAnchorCondition")} value={c.anchors} onChange={(v) => onField("anchors", v)} />
        </Grid>
      </div>
      <div className="mt-3">
        <MInput help="fireCondNotes" label={mt(lang, "fireCondNotes")} placeholder="—" value={c.notes} onChange={(v) => onField("notes", v)} />
      </div>
    </>
  );
}

function Card({
  title,
  children,
  stage,
}: {
  title: string;
  children: React.ReactNode;
  stage: EditorStage;
}) {
  const activeStage = useContext(StageCtx);
  if (activeStage !== stage) return null;
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
  hint,
  hintDiagram,
  help,
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  labelClass?: string;
  hint?: string;
  hintDiagram?: "bottom" | "top" | "nosing" | "walkline";
  /** i18n key of this field, used to find its plain-language explanation */
  help?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const unitPh = useContext(PlaceholderCtx);
  const lang = useContext(LangCtx);
  const explain = hint || (help ? helpText(lang, help) : null);
  return (
    <div className="block min-w-0">
      {label && (
        <div className={`text-[11px] text-neutral-400 flex items-center mb-1 ${labelClass}`}>
          {label}
          {explain && <InfoHint text={explain} diagram={hintDiagram} />}
        </div>
      )}
      <input
        data-m="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || unitPh}
        autoComplete="off"
        aria-label={label}
        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-2.5 text-base"
      />
    </div>
  );
}

function InfoHint({ text, diagram }: { text: string; diagram?: "bottom" | "top" | "nosing" | "walkline" }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement | null>(null);

  // Tapping anywhere else closes it — a measurer with gloves on should not
  // have to find a small × to get back to the form.
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // Capture phase, so it fires even when the thing tapped stops propagation.
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <span ref={wrap} className="relative ml-1 inline-block align-middle">
      <button
        type="button"
        aria-label={text}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((value) => !value);
        }}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-700 text-xs font-bold text-amber-300 active:bg-amber-500/20"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-7 z-50 block w-72 max-w-[80vw] rounded-lg border border-neutral-600 bg-neutral-800 p-3 text-left text-xs font-normal leading-relaxed text-neutral-100 shadow-xl"
        >
          {diagram && <MeasurementHintDiagram kind={diagram} />}
          {text}
        </span>
      )}
    </span>
  );
}

function ChoiceMInput({
  label,
  value,
  onChange,
  choices,
  placeholder,
  hint,
  hintDiagram,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  choices: [string, string][];
  placeholder?: string;
  hint?: string;
  hintDiagram?: "bottom" | "top" | "nosing" | "walkline";
}) {
  return (
    <div>
      <MInput label={label} value={value} onChange={onChange} placeholder={placeholder} hint={hint} hintDiagram={hintDiagram} />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {choices.map(([stored, shown]) => (
          <button key={stored} type="button" onClick={() => onChange(stored)}
            className={`rounded-full border px-2.5 py-1.5 text-xs ${value === stored ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-neutral-700 bg-neutral-800 text-neutral-300"}`}>
            {shown}
          </button>
        ))}
      </div>
    </div>
  );
}

function commonThicknessChoices(lang: string): [string, string][] {
  return [
    ["0", mt(lang, "choiceNone")],
    ['3/4"', '3/4"'],
    ['1"', '1"'],
    ['1 1/2"', '1 1/2"'],
  ];
}

function slopeDirectionChoices(lang: string): [string, string][] {
  return [
    ["Left", mt(lang, "choiceLeft")],
    ["Right", mt(lang, "choiceRight")],
    ["Toward stairs", mt(lang, "choiceTowardStairs")],
    ["Away from stairs", mt(lang, "choiceAwayStairs")],
  ];
}

function obstructionChoices(lang: string): [string, string][] {
  return [
    ["None", mt(lang, "choiceNone")],
    ["Joist", mt(lang, "choiceJoist")],
    ["Pipe", mt(lang, "choicePipe")],
    ["Wire", mt(lang, "choiceWire")],
  ];
}

function accessChoices(lang: string): [string, string][] {
  return [
    ["Direct walk-in", mt(lang, "choiceWalkIn")],
    ["Stairs", mt(lang, "choiceAccessStairs")],
    ["Elevator", mt(lang, "choiceElevator")],
    ["Crane / lift", mt(lang, "choiceCrane")],
  ];
}

function MeasurementHintDiagram({ kind }: { kind: "bottom" | "top" | "nosing" | "walkline" }) {
  if (kind === "walkline") {
    return (
      <svg viewBox="0 0 220 90" className="mb-2 w-full rounded bg-neutral-950" aria-hidden>
        <path d="M18 74 L105 12 L202 74 Z" fill="none" stroke="#a3a3a3" strokeWidth="2" />
        <path d="M55 70 Q108 42 170 66" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="5 3" />
        <line x1="38" y1="70" x2="55" y2="70" stroke="#fbbf24" strokeWidth="2" />
        <path d="M38 70l5-3v6zM55 70l-5-3v6z" fill="#fbbf24" />
        <text x="106" y="42" fill="#fbbf24" fontSize="15" fontWeight="700">↟</text>
      </svg>
    );
  }
  const highlightBottom = kind === "bottom";
  const highlightTop = kind === "top";
  const highlightNosing = kind === "nosing";
  return (
    <svg viewBox="0 0 220 100" className="mb-2 w-full rounded bg-neutral-950" aria-hidden>
      <path d="M12 84h34V68h34V52h34V36h34V20h60" fill="none" stroke="#d4d4d4" strokeWidth="3" />
      <line x1="10" y1="84" x2="58" y2="84" stroke={highlightBottom ? "#f59e0b" : "#737373"} strokeWidth={highlightBottom ? 6 : 2} />
      <line x1="148" y1="20" x2="210" y2="20" stroke={highlightTop ? "#f59e0b" : "#737373"} strokeWidth={highlightTop ? 6 : 2} />
      {[46, 80, 114, 148].map((x, i) => <circle key={x} cx={x} cy={68 - i * 16} r={highlightNosing ? 5 : 2.5} fill={highlightNosing ? "#f59e0b" : "#737373"} />)}
      <text x="18" y="97" fill={highlightBottom ? "#fbbf24" : "#a3a3a3"} fontSize="11" fontWeight="700">0 ↓</text>
      <text x="180" y="13" fill={highlightTop ? "#fbbf24" : "#a3a3a3"} fontSize="11" fontWeight="700">0 ↑</text>
      {highlightNosing && <text x="91" y="92" fill="#fbbf24" fontSize="15" fontWeight="700">••••</text>}
      <path d="M18 62v-30m0 0l-5 8m5-8l5 8" stroke="#fbbf24" strokeWidth="2" />
      <text x="27" y="40" fill="#fbbf24" fontSize="13">↑</text>
    </svg>
  );
}

function MSelect({
  label,
  value,
  options,
  onChange,
  lang,
  help,
  spec = false,
  labels,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  lang: string;
  help?: string;
  spec?: boolean;
  labels?: Record<string, string>;
}) {
  return (
    <div className="block min-w-0">
      <div className="mb-1 flex items-center text-[11px] text-neutral-400">
        {label}
        {help && helpText(lang, help) && <InfoHint text={helpText(lang, help)!} />}
      </div>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-2.5 text-base appearance-none"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? (spec ? specValue(lang, o) : optLabel(lang, o))}
          </option>
        ))}
      </select>
    </div>
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
  help,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
  help?: string;
}) {
  const lang = useContext(LangCtx);
  const explain = help ? helpText(lang, help) : null;
  return (
    <div>
      <div className="mb-1 flex items-center text-[11px] text-neutral-400">
        {label}
        {explain && <InfoHint text={explain} />}
      </div>
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
        <MInput help="nominalRise" label={mt(lang, "nominalRise")} value={nr} onChange={setNr} />
        <MInput help="nominalRun" label={mt(lang, "nominalRun")} value={nu} onChange={setNu} />
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
  busy,
  onFile,
  onTake,
}: {
  slot: string;
  label: string;
  required: boolean;
  data: MeasureData;
  lang: string;
  busy: boolean;
  onFile: (f: File) => void;
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
      {/* Primary: the OS's own photo sheet (Take Photo / Photo Library) */}
      <label
        className={`px-3 py-2 rounded-lg border text-xs font-bold shrink-0 cursor-pointer ${
          busy ? "opacity-50 pointer-events-none " : ""
        }${
          ph
            ? "border-neutral-700 bg-neutral-800 text-neutral-300"
            : "border-amber-600 bg-amber-500/10 text-amber-300"
        }`}
      >
        {busy ? mt(lang, "uploading") : ph ? mt(lang, "retake") : `📷 ${mt(lang, "choosePhoto")}`}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>
      {/* Secondary: annotate on a photo (opens the markup canvas) */}
      <button
        onClick={onTake}
        title={mt(lang, "markUp")}
        className="px-2.5 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs shrink-0"
        aria-label={mt(lang, "markUp")}
      >
        ✏️
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

function TermEditor({
  lang,
  title,
  t,
  anchorOptions,
  postOptions,
  spanOptions,
  hasPhoto,
  onField,
  onHw,
  onPhoto,
}: {
  lang: string;
  title: string;
  t: Termination;
  anchorOptions: string[];
  postOptions: [string, string][];
  spanOptions: [string, string][];
  hasPhoto: boolean;
  onField: (key: string, value: string) => void;
  onHw: (key: string, value: string) => void;
  onPhoto: () => void;
}) {
  const allowed = METHODS_BY_ATTACH[t.attachTo] || [];
  const needsHw = !!t.method && (HARDWARE_METHODS as string[]).includes(t.method);
  const needsFastener = !!t.method && (FASTENER_METHODS as string[]).includes(t.method);
  const requiredDims = new Set(HW_REQUIRED[t.method] || []);
  const isWall = t.attachTo === "wall";
  const isColumn = t.attachTo === "existing_post";
  const isWoodFloor = t.attachTo === "floor" && t.material === "Wood";

  const HW_FIELDS: [keyof TermHardware, string][] = [
    ["profile", "hwProfile"],
    ["thickness", "hwThickness"],
    ["holeDia", "hwHoleDia"],
    ["holeSpacing", "hwHoleSpacing"],
    ["edgeDist", "hwEdgeDist"],
    ["embedment", "hwEmbedment"],
    ["orientation", "hwOrientation"],
    ["weldSize", "hwWeldSize"],
  ];
  const requiredFields = HW_FIELDS.filter(([k]) => requiredDims.has(k));
  const optionalFields = HW_FIELDS.filter(([k]) => !requiredDims.has(k));

  return (
    <div className="mt-3 border border-neutral-800 rounded-lg p-3">
      <div className="text-xs font-bold text-neutral-300 mb-2">⚓ {title}</div>
      <ChipRow help="connAttachTo"
        label={mt(lang, "connAttachTo")}
        value={t.attachTo}
        options={ATTACH_TARGETS.map((o) => [o, mt(lang, `attach_${o}`)] as [string, string])}
        onChange={(v) => {
          onField("attachTo", v);
          onField("method", ""); // methods depend on the target
        }}
      />
      {/* topology: this end must point at a real post / span */}
      {t.attachTo === "free_post" && (
        <div className="mt-3">
          <MSelect label={`${mt(lang, "postRefLblSel")} *`} value={t.postId}
            options={postOptions.map(([id]) => id)} lang={lang}
            labels={Object.fromEntries(postOptions)}
            onChange={(v) => onField("postId", v)} />
        </div>
      )}
      {t.attachTo === "continue" && (
        <div className="mt-3">
          <MSelect label={`${mt(lang, "spanRefLblSel")} *`} value={t.spanRef}
            options={spanOptions.map(([id]) => id)} lang={lang}
            labels={Object.fromEntries(spanOptions)}
            onChange={(v) => onField("spanRef", v)} />
        </div>
      )}
      {allowed.length > 0 && (
        <div className="mt-3">
          <ChipRow help="connMethod"
            label={mt(lang, "connMethod")}
            value={t.method}
            options={allowed.map((o) => [o, mt(lang, `method_${o}`)] as [string, string])}
            onChange={(v) => onField("method", v)}
          />
        </div>
      )}
      {(isWall || isColumn || t.attachTo === "floor") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <MSelect help="connMaterial" label={mt(lang, "connMaterial")} value={t.material}
            options={anchorOptions} lang={lang}
            onChange={(v) => onField("material", v)} />
          {(isWall || isWoodFloor) && (
            <MInput
              label={mt(lang, isWall ? "backingLbl" : "backingWoodLbl")}
              placeholder="—" value={t.backing}
              onChange={(v) => onField("backing", v)} />
          )}
          {isColumn && (
            <>
              <MInput help="columnWLbl" label={mt(lang, "columnWLbl")} value={t.columnW}
                onChange={(v) => onField("columnW", v)} />
              <MInput help="columnDLbl" label={mt(lang, "columnDLbl")} value={t.columnD}
                onChange={(v) => onField("columnD", v)} />
            </>
          )}
        </div>
      )}
      {isColumn && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <MInput help="moldingLbl" label={mt(lang, "moldingLbl")} placeholder="—" value={t.molding}
            onChange={(v) => onField("molding", v)} />
          {t.molding.trim() !== "" && (
            <MInput help="moldingHeightLbl" label={mt(lang, "moldingHeightLbl")} value={t.moldingHeight}
              onChange={(v) => onField("moldingHeight", v)} />
          )}
          <MInput help="plumbLbl" label={mt(lang, "plumbLbl")} placeholder="—" value={t.plumb}
            onChange={(v) => onField("plumb", v)} />
        </div>
      )}
      {needsHw && (
        <div className="mt-3 border border-neutral-800 rounded-lg p-3 bg-neutral-900/60">
          <div className="text-xs font-bold text-neutral-400 mb-2">🔩 {mt(lang, "hardwareTitle")}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {needsFastener && (
              <>
                <MInput label={`${mt(lang, "hwFastener")} *`} placeholder="—" value={t.hardware.fastener}
                  onChange={(v) => onHw("fastener", v)} />
                <MInput label={`${mt(lang, "hwQty")} *`} placeholder="—" value={t.hardware.qty}
                  onChange={(v) => onHw("qty", v)} />
              </>
            )}
            <MInput label={`${mt(lang, "hwElevation")} *`} value={t.hardware.elevation}
              onChange={(v) => onHw("elevation", v)} />
            <ChipRow
              label={`${mt(lang, "hwShopField")} *`}
              value={t.hardware.shopField}
              options={[
                ["shop_weld", mt(lang, "shop_weld")],
                ["field_bolt", mt(lang, "field_bolt")],
              ]}
              onChange={(v) => onHw("shopField", v)}
            />
            {/* the dimensions the shop needs to FABRICATE this connection */}
            {requiredFields.map(([k, lbl]) => (
              <MInput key={k} label={`${mt(lang, lbl)} *`}
                placeholder={k === "profile" || k === "orientation" ? "—" : undefined}
                value={t.hardware[k]}
                onChange={(v) => onHw(k, v)} />
            ))}
          </div>
          {optionalFields.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-amber-400/80 cursor-pointer select-none">
                + {mt(lang, "postMore")}
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {optionalFields.map(([k, lbl]) => (
                  <MInput key={k} label={mt(lang, lbl)}
                    placeholder={k === "profile" || k === "orientation" ? "—" : undefined}
                    value={t.hardware[k]}
                    onChange={(v) => onHw(k, v)} />
                ))}
              </div>
            </details>
          )}
          <button
            onClick={onPhoto}
            className={`mt-3 px-3 py-2.5 rounded-lg border text-sm font-bold ${
              hasPhoto
                ? "border-neutral-700 bg-neutral-800 text-neutral-300"
                : "border-amber-600 bg-amber-500/10 text-amber-300"
            }`}
          >
            📷 {mt(lang, "termPhoto")} {hasPhoto ? "✓" : "*"}
          </button>
        </div>
      )}
    </div>
  );
}
