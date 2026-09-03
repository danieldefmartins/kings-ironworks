"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job, OrgSettings } from "@/lib/shop/shared";
import {
  ANCHOR_OPTIONS,
  MATERIAL_PRESETS,
  newPost,
  newPlanPost,
  planPaths,
  sheetProgress,
  type FlightSegment,
  type MeasureData,
  type MeasureSheet,
  type PlatformSegment,
  type PostMeasure,
  type RampSegment,
  type CurveSegment,
  type WellDeliverable,
  type WellData,
  type FireEscapeData,
  type FireLevel,
  type GateData,
  type FenceData,
  type FenceSegment,
  type BalconyData,
  type DeckData,
  type DeckSide,
  type WallBand,
  type Carryover,
  type CarryoverKey,
  type CarryoverSource,
} from "@/lib/shop/measure";
import {
  sheetReadiness,
  flightGaps,
  orderedPosts,
  mergeTolerances,
  parseMeas,
  wellClearance,
  type Gap,
} from "@/lib/shop/measure-checks";
import { mt, optLabel, shapeLabel } from "@/lib/shop/measure-i18n";
import { SPEC_OPTIONS } from "@/lib/shop/i18n";
import { sketchViews, type SketchView } from "./Sketch";
import PrintSheet from "./PrintSheet";
import { useSheetSync } from "./useSheetSync";
import GateSections from "./shapes/GateSections";
import FenceSections from "./shapes/FenceSections";
import BalconySections from "./shapes/BalconySections";
import DeckSections from "./shapes/DeckSections";
import FireEscapeSections from "./shapes/FireEscapeSections";
import WellSections from "./shapes/WellSections";
import SectionsDrawer from "./overlays/SectionsDrawer";
import PointMenus from "./overlays/PointMenus";
import PhotoCapture from "./overlays/PhotoCapture";
import FractionBar from "./overlays/FractionBar";
import RoutingCard from "./sections/RoutingCard";
import SketchSections from "./sections/SketchSections";
import StairSections from "./sections/StairSections";
import SegmentsCard from "./sections/SegmentsCard";
import JointSections from "./sections/JointSections";
import PostsSection from "./sections/PostsSection";
import RailSections from "./sections/RailSections";
import ShopSections from "./sections/ShopSections";
import PlanSection from "./sections/PlanSection";
import PhotosSection from "./sections/PhotosSection";
import ReviewSection from "./sections/ReviewSection";
import {
  EDITOR_STAGES,
  FRACTIONS,
  LangCtx,
  PlaceholderCtx,
  SetupLockCtx,
  StageCtx,
  type EditorStage,
} from "./fields";
import MoreMenu, { MoreItem } from "../../../../MoreMenu";

// Where a multi-flight sheet should open. Reopening on flight 1 after a day
// spent finishing it is the moment a measurer decides the app is not paying
// attention; reopening on the flight that still owes numbers is the moment
// they decide it is.
function firstOpenFlight(data: MeasureData): number {
  const fl = (data?.segments || []).filter((s) => s.kind === "flight") as FlightSegment[];
  if (fl.length < 2) return 0;
  const i = fl.findIndex((f, idx) => flightGaps(f, idx, { needRake: true, multi: true }).length > 0);
  return i < 0 ? 0 : i;
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
  carryover = null,
}: {
  job: Job;
  sheet: MeasureSheet;
  lang: string;
  workerName: string;
  isAdmin?: boolean;
  nameById?: Record<string, string>;
  orgSettings?: OrgSettings;
  history?: { at: string; action: string; workerId: string | null }[];
  /** Shop-standard answers from the last finished sheet, or null on the first one. */
  carryover?: { values: Carryover; source: CarryoverSource } | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(sheet.name || "");
  const [status, setStatus] = useState(sheet.status);
  const [rev, setRev] = useState(sheet.current_rev || 0);
  // Durability, autosave, offline recovery and the mutation queue all live in
  // useSheetSync. Nothing below this line needs to know how a save happens.
  const {
    data,
    set,
    dataRef,
    saveState,
    pendingLocal,
    restored,
    dismissRestored,
    online,
    opErr,
    setOpErr,
    requestSave,
    enqueue,
    mutate,
    noteUpdatedAt,
  } = useSheetSync({
    sheet,
    jobId: job.id,
    status,
    onServerStatus: (next) => setStatus(next),
    onReopened: () => setInfo(mt(lang, "editWarning")),
  });
  const [reviewComment, setReviewComment] = useState(sheet.review_comment);
  const [info, setInfo] = useState<string | null>(null);
  const [photoSlot, setPhotoSlot] = useState<{ slot: string; label: string } | null>(null);
  const [placementMenu, setPlacementMenu] = useState<{ segIdx: number; stepIdx: number | null; side: "left" | "right"; pathId?: string; planSegIdx?: number; along?: string } | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [movingPostId, setMovingPostId] = useState<string | null>(null);
  const [slotBusy, setSlotBusy] = useState<string | null>(null);
  const [slotErr, setSlotErr] = useState<string | null>(null);
  const [fracBar, setFracBar] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [activeFlight, setActiveFlight] = useState(() => firstOpenFlight(sheet.data));
  // Custom sheets open directly on the drawing canvas; otherwise the user
  // lands on the existing-site setup step.
  // Open on measuring, not on a page of site questions.
  const [activeStage, setActiveStage] = useState<EditorStage>("steps");
  const viewList = sketchViews(sheet.shape);
  const [view, setView] = useState<SketchView>(viewList[0][0]);
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

  // Distance along a drawn line, from where the finger landed — but only when
  // that line already carries a measured length. Otherwise there is nothing to
  // scale against and the measurer fills it in.
  function alongLine(pathId: string, segIdx: number, t: number): string {
    const seg = planPaths(dataRef.current.plan).find((r) => r.id === pathId)?.segs[segIdx];
    const len = parseMeas(seg?.len);
    return len !== null && len > 0 ? String(Math.round(len * t * 4) / 4) : "";
  }

  // Tapping a drawn line does what tapping a tread does: drop a railing post,
  // or land the point currently being moved.
  function addPlanPost(pathId: string, segIdx: number, t: number) {
    if (movingPostId) {
      set((d) => {
        const po = d.posts.find((x) => x.id === movingPostId);
        if (po) {
          po.pathId = pathId;
          po.planSegIdx = segIdx;
          po.pos = alongLine(pathId, segIdx, t);
        }
      });
      setMovingPostId(null);
      return;
    }
    set((d) => {
      const po = newPlanPost(pathId, segIdx);
      po.pos = alongLine(pathId, segIdx, t);
      d.posts.push(po);
    });
  }

  function holdPlanLocation(pathId: string, segIdx: number, t: number) {
    setPlacementMenu({
      segIdx: 0,
      stepIdx: null,
      side: "right",
      pathId,
      planSegIdx: segIdx,
      along: alongLine(pathId, segIdx, t),
    });
  }

  function addTypedPoint(pointType: PostMeasure["pointType"]) {
    if (!placementMenu) return;
    set((d) => {
      const po = placementMenu.pathId
        ? newPlanPost(placementMenu.pathId, placementMenu.planSegIdx ?? 0)
        : newPost(placementMenu.segIdx, placementMenu.stepIdx);
      if (placementMenu.pathId && placementMenu.along) po.pos = placementMenu.along;
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
  function setDeck(fn: (dk: DeckData) => void) {
    set((d) => { if (d.deck) fn(d.deck); });
  }
  function setDeckSide(id: string, fn: (s: DeckSide) => void) {
    set((d) => { const sd = d.deck?.sides.find((x) => x.id === id); if (sd) fn(sd); });
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
          noteUpdatedAt(j.updated_at);
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
      // No need to stop the autosave by hand — a successful delete does it.
      router.push(`/shop/job/${job.id}/measure`);
    }
  }

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
  // One completeness model for the whole screen. Header line, stage chips,
  // review verdict and the submit button all read from this, so the worker is
  // never shown two different answers to "am I done?".
  const ready = sheetReadiness(data, sheet.shape, orgTol);
  const checks = ready.checks;
  const gaps = ready.fabGaps;
  const docGaps = ready.docGaps;
  const redChecks = ready.redChecks;
  const canSubmit = ready.ready;
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
    // A gap has to name the step that can actually answer it. Joints are only
    // editable on the joints step, and a flight's rake sits on its step card —
    // sending either to a step that shows neither is a dead end.
    if (key.startsWith("joint_")) return "locations";
    if (key === "flight_width" || key === "flight_rake") return "steps";
    if (key === "flight_angle") return "locations";
    if (key.startsWith("post")) return "locations";
    if (key.startsWith("span") || key.startsWith("term") ||
        ["rail_height", "returns", "extensions", "brackets"].includes(key)) return "posts";
    if (key.startsWith("mat_") || key === "splices" || key === "max_piece") return "specs";
    if (key === "steps" || key === "winder") return "steps";
    if (key.includes("angle") || key.includes("rake")) return "locations";
    if (key.startsWith("landing_")) return "level";
    return "steps";
  };
  const zeroByStage = (): Record<EditorStage, number> => ({
    setup: 0, posts: 0, level: 0, steps: 0, locations: 0, specs: 0, photos: 0, review: 0,
  });
  // Blockers and follow-ups are counted separately so a stage can say "3
  // missing" or "2 photos to add" — never one number standing for both.
  const stageMissing = gaps.reduce((acc, g) => {
    acc[gapStage(g.key)] += 1;
    return acc;
  }, zeroByStage());
  stageMissing.review += redChecks.length;
  const stageDocs = docGaps.reduce((acc, g) => {
    acc[gapStage(g.key)] += 1;
    return acc;
  }, zeroByStage());
  const activeStageIndex = EDITOR_STAGES.findIndex((s) => s.id === activeStage);

  // ---- The one thing to do next -------------------------------------------
  // Gaps come out of requiredGaps in validation order; the worker needs them
  // in measuring order, so they are sorted by the stage they belong to.
  const stageOrder = (st: EditorStage) => EDITOR_STAGES.findIndex((x) => x.id === st);
  const byStage = (a: Gap, b: Gap) => stageOrder(gapStage(a.key)) - stageOrder(gapStage(b.key));
  const orderedGaps = [...gaps].sort(byStage);
  const orderedDocGaps = [...docGaps].sort(byStage);
  const gapLabel = (g: Gap) =>
    g.key === "photo"
      ? `${mt(lang, "gap_photo")}: ${mt(lang, `slot_${g.detail}`)}`
      : `${mt(lang, `gap_${g.key}`)}${g.detail ? ` (${g.detail})` : ""}`;
  const targetOf = (g: Gap) => ({ stage: gapStage(g.key), label: gapLabel(g), flight: g.flight });
  const nextTarget: { stage: EditorStage; label: string; flight?: number } | null = orderedGaps.length
    ? targetOf(orderedGaps[0])
    : redChecks.length
      ? { stage: "review" as EditorStage, label: mt(lang, "check_" + redChecks[0].key) }
      : orderedDocGaps.length
        ? targetOf(orderedDocGaps[0])
        : null;
  function goToStage(st: EditorStage) {
    setActiveStage(st);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function nextStage() {
    const st = EDITOR_STAGES[EDITOR_STAGES.findIndex((x) => x.id === activeStage) + 1];
    if (!st) return;
    // A new step starts at flight 1: the step is asking a different question,
    // and it asks it of every flight.
    setActiveFlight(0);
    setActiveStage(st.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function goToFlight(i: number) {
    setActiveFlight(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  // Leaving mid-stair is allowed and normal — a flight can be behind a locked
  // door or a scaffold that comes down tomorrow. What is not allowed is
  // leaving without knowing it: the sheet list carries the unfinished flight
  // count, and the sheet reopens on the flight that still owes numbers.
  function finishLater() {
    requestSave();
    router.push(`/shop/job/${job.id}/measure`);
  }
  // Jumping to a specific missing item must never land on a step that is
  // holding its content back — the routing card still comes first, but the
  // item the worker asked for is there too.
  function jumpToGap(st: EditorStage, flight?: number) {
    if (st === "setup") setSetupUnlocked(true);
    // On a multi-flight sheet a gap belongs to one flight, and the stage only
    // shows one flight at a time — landing on the stage without switching the
    // flight shows the measurer a card that is already filled in.
    if (flight !== undefined) setActiveFlight(flight);
    goToStage(st);
  }
  // Nothing measured yet reads as "Start measuring" rather than "Continue".
  const started = sheetProgress(data).filled > 0 || data.photos.length > 0;

  // ---- Carried-over answers ------------------------------------------------
  // A field is badged only while it still reads exactly as it was suggested.
  // The moment the measurer edits it, the value is theirs and the badge goes.
  const carriedLabel = mt(
    lang,
    carryover?.source === "shop" ? "carriedFromShop" : "carriedFromLast"
  );
  // No stored provenance is needed: the badge is true exactly while the field
  // still holds the suggested value, and editing it clears the badge by
  // definition. Sheets created before this feature simply carry nothing.
  const carriedNote = (key: CarryoverKey, current: string): string | undefined => {
    const v = current.trim();
    return v !== "" && carryover?.values[key] === v ? carriedLabel : undefined;
  };
  const carriedSummary = ([
    ["materials.post", data.materials.post],
    ["materials.topRail", data.materials.topRail],
    ["materials.picket", data.materials.picket],
    ["materials.picketSpacing", data.materials.picketSpacing],
    ["materials.bottomRail", data.materials.bottomRail],
    ["materials.finish", data.materials.finish],
    ["materials.color", data.materials.color],
    ["rail.height", data.rail.height],
    ["fab.maxPiece", data.fab.maxPiece],
  ] as [CarryoverKey, string][])
    .filter(([k, v]) => !!carriedNote(k, v))
    .map(([, v]) => v);
  const units = data.units || "in";
  const unitPh = units === "ftin" ? `0' 0"` : `0"`;
  const fracTokens = units === "ftin" ? ["'", '"', ...FRACTIONS] : FRACTIONS;

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
  const isDeck = sheet.shape === "deck";
  const gate = data.gate;
  const fence = data.fence;
  const balcony = data.balcony;
  const deck = data.deck;
  const isWell = sheet.shape === "window_well";
  const well = data.well;
  const wellWants = (k: WellDeliverable) => !!well?.deliverables.includes(k);
  const clearance = wellClearance(well);
  const allFlights = data.segments
    .map((s, i) => ({ seg: s, i }))
    .filter((x) => x.seg.kind === "flight") as { seg: FlightSegment; i: number }[];
  // One flight at a time.
  //
  // Generating every flight up front meant every section repeated itself once
  // per flight, so the measurer met all the straightedge cards, then all the
  // angle cards, then all the step cards — jumping between flights inside each
  // section and never finishing anything. Daniel: "I think if we complete 1st
  // the same way we had the single flight staircase is better, we see results
  // and this makes an user happy to see improvement."
  //
  // So the sections see ONE flight and look exactly like the single-flight
  // sheet. The joints come after the last one, which is also the only moment
  // they can be answered — a joint needs the flights on both sides of it
  // measured before its gap and angle mean anything.
  const multiFlightSheet = allFlights.length > 1;
  const flightAt = Math.min(activeFlight, Math.max(0, allFlights.length - 1));
  // The joints step is a step of the angles stage — that is where the joint
  // cards live. Landing on it from another stage would otherwise drop the
  // one-flight-at-a-time rule and put every flight on screen at once.
  const onJointsStep =
    multiFlightSheet && activeFlight >= allFlights.length && activeStage === "locations";
  const flights = multiFlightSheet && !onJointsStep ? [allFlights[flightAt]] : allFlights;
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

  // ---- Flight by flight ----------------------------------------------------
  // The sheet is measured one flight at a time, so the screen has to be able
  // to say, for every flight, whether it is finished — and to refuse to move
  // on to the next step while any of them is not. Anything less and a
  // three-flight stair leaves the shop with one flight measured and nobody
  // aware of it until the steel does not fit.
  const flightGapList = allFlights.map(({ seg }, i) =>
    flightGaps(seg, i, { needRake: turns || allFlights.length > 1, multi: multiFlightSheet })
  );
  const flightStarted = allFlights.map(({ seg }) =>
    seg.steps.some((st) => st.rise.trim() !== "" || st.run.trim() !== "") ||
    seg.width.trim() !== "" ||
    seg.angleDeg.trim() !== ""
  );
  const flightDone = flightGapList.map((g) => g.length === 0);
  const flightsFinished = flightDone.filter(Boolean).length;
  const openFlights = flightDone.map((d, i) => (d ? -1 : i)).filter((i) => i >= 0);
  const jointGaps = gaps.filter((g) => g.key.startsWith("joint_"));
  const hasJoints = (data.joints || []).length > 0;
  // The stages that show one flight at a time. Everything after them describes
  // the whole sheet, so they are the only place this gate applies.
  const flightStageIds: EditorStage[] = ["steps", "locations", "level"];
  const onFlightStage = multiFlightSheet && flightStageIds.includes(activeStage);
  // Gaps for one flight that THIS step can actually answer. The step gate has
  // to be per step: a flight's angle lives on the angles step, so demanding it
  // before leaving the steps step would trap the measurer on a card that never
  // asks for it.
  const flightStageOpen = allFlights
    .map((_, i) => i)
    .filter((i) => flightGapList[i].some((g) => gapStage(g.key) === activeStage));
  const jointStageOpen =
    hasJoints && jointGaps.some((g) => gapStage(g.key) === activeStage);
  const stageFlightsBlocked = onFlightStage && (flightStageOpen.length > 0 || jointStageOpen);
  // The flight the measurer is standing on is already on screen; the list is
  // for the ones they cannot see.
  const otherOpenFlights = openFlights.filter((i) => onJointsStep || i !== flightAt);
  const hasWinders = flights.some(({ seg }) => seg.steps.some((step) => step.winder));
  const hasHandrail = data.rail.kind === "Handrail" || data.rail.kind === "Both";
  const hasGuardrail = data.rail.kind !== "Handrail";
  // Datums and the wall/open orientation describe a stair run. A well or a
  // fire escape carries its own reference frame, so the card stays hidden.
  const needsPostReference = !isWallRail && !isCustom && !isSpiral && !isWell && !isFire && !isGate && !isFence && !isBalcony && !isDeck;

  // ---- Early routing --------------------------------------------------------
  // Which of the routing questions this shape has any use for. A gate has no
  // stair orientation; a fire escape inspection orders no finish.
  const routing = data.routing;
  const asksOrientation = needsPostReference;
  const asksRailKind = (!isWell || wellWants("guard")) && (!isFire || fireNew);
  const asksFloorChange = !isWell && !isFire && !isGate && !isFence && !isBalcony && !isDeck;
  const asksExisting = !isGate && !isFence && !isFire;
  const asksStdFinish = !isFire || fireNew;
  const routingChecks: boolean[] = [
    !!routing.setting,
    ...(asksRailKind ? [!!data.rail.kind] : []),
    ...(asksOrientation ? [!!data.datums.orientation] : []),
    ...(asksExisting ? [!!routing.existing] : []),
    ...(asksFloorChange ? [!!data.finish.floorChange] : []),
    ...(asksFloorChange ? [!!data.finish.demoPending] : []),
    ...(asksStdFinish ? [!!routing.standardFinish] : []),
  ];
  const routingAnswered = routingChecks.filter(Boolean).length;
  const routingTotal = routingChecks.length;
  const routingDone = routingAnswered === routingTotal;
  // The routing card collapses once answered; "Show everything anyway" is the
  // escape hatch for a measurer who wants the whole step regardless.
  const [routingOpen, setRoutingOpen] = useState(false);
  const [setupUnlocked, setSetupUnlocked] = useState(false);
  // A first-run funnel, not a cage: a sheet that already has measurements in
  // it is never re-gated, and the escape hatch is always on the card.
  const setupLocked = !routingDone && !setupUnlocked && !started;
  const showRoutingCard = !routingDone || routingOpen;
  const setRouting = (fn: (r: typeof routing) => void) => set((d) => fn(d.routing));
  // The shop's usual finish for this sheet — whatever the sheet already holds,
  // which is the seeded default or the answer carried from the last job.
  const standardFinishLine = [data.materials.finish, data.materials.color]
    .filter((x) => x.trim() !== "")
    .join(" — ");
  const usesStandardFinish = routing.standardFinish === "yes";
  const existingLabelKey: Record<string, string> = {
    none: "routingExistingNone",
    posts: "routingExistingPosts",
    columns: "routingExistingColumns",
    both: "routingExistingBoth",
  };
  const routingSummary = [
    routing.setting && mt(lang, routing.setting === "interior" ? "routingInterior" : "routingExterior"),
    asksRailKind && data.rail.kind && optLabel(lang, data.rail.kind),
    asksExisting && routing.existing && mt(lang, existingLabelKey[routing.existing]),
    asksStdFinish && usesStandardFinish && standardFinishLine,
  ].filter((x): x is string => !!x);

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
            <button onClick={dismissRestored}
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
            {shapeLabel(lang, sheet.shape)} · {job.customer_name}
          </div>
          {/* Status and the save state are the only things the measurer needs
              from the header. Print, units and delete are housekeeping. */}
          <div className="flex items-center gap-2">
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
            {/* Autosave is trusted out loud. "Save now" only appears when
                something has actually gone wrong. */}
            <span className="min-w-0 flex-1 truncate text-xs">
              {saveState === "saving" && (
                <span className="text-neutral-500">{mt(lang, "saving")}</span>
              )}
              {(saveState === "saved" || saveState === "idle") && (
                <span className="text-neutral-500">✓ {mt(lang, "savedAll")}</span>
              )}
              {saveState === "dirty" && (
                <span className="text-amber-400">● {mt(lang, "unsaved")}</span>
              )}
              {(saveState === "queued" || saveState === "error") && (
                <button
                  onClick={requestSave}
                  className="min-h-[48px] rounded-full border border-amber-700 bg-amber-950/40 px-3 font-bold text-amber-300"
                >
                  ⬇ {mt(lang, "savedOnDevice")} — {mt(lang, "saveNow")}
                </button>
              )}
            </span>
            <MoreMenu label={mt(lang, "moreLabel")} closeLabel={mt(lang, "closeLabel")}>
              {(close) => (
                <>
                  <MoreItem
                    onClick={() => {
                      close();
                      fetch("/shop/api/measure", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type: "log_print", id: sheet.id, jobId: job.id, rev }),
                      }).catch(() => {});
                      window.print();
                    }}
                  >
                    🖨 {mt(lang, "printSheet")}
                  </MoreItem>
                  <div className="pt-2 text-[11px] uppercase tracking-widest text-neutral-500">
                    {mt(lang, "unitsLabel")}
                  </div>
                  <div className="flex gap-2">
                    {(
                      [
                        ["in", `${mt(lang, "unitsIn")} (")`],
                        ["ftin", `${mt(lang, "unitsFtIn")} (' ")`],
                      ] as const
                    ).map(([u, label]) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => set((d) => void (d.units = u))}
                        className={`min-h-[48px] flex-1 rounded-xl border px-3 text-sm font-bold ${
                          units === u
                            ? "border-amber-500 bg-amber-500/10 text-amber-300"
                            : "border-neutral-700 bg-neutral-800 text-neutral-300"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <MoreItem
                    danger
                    onClick={() => {
                      close();
                      deleteSheet();
                    }}
                  >
                    ✕ {mt(lang, "deleteSheet")}
                  </MoreItem>
                </>
              )}
            </MoreMenu>
          </div>
        </div>

        <div className="sticky top-0 z-30 -mx-4 px-4 py-2 mb-4 bg-neutral-950/95 backdrop-blur border-y border-neutral-800">
          {/* The single truth, and the single next action. Everything else on
              this screen is secondary to it. */}
          {status === "in_progress" && (
            <button
              type="button"
              onClick={() => jumpToGap(nextTarget ? nextTarget.stage : "review", nextTarget?.flight)}
              className={`mb-2 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left min-h-[64px] ${
                ready.remaining > 0
                  ? "border-amber-500 bg-amber-500/10 active:bg-amber-500/20"
                  : "border-green-600 bg-green-600/10 active:bg-green-600/20"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-base font-bold ${
                    ready.remaining > 0 ? "text-amber-300" : "text-green-300"
                  }`}
                >
                  {ready.remaining > 0
                    ? `${ready.remaining} ${mt(lang, ready.remaining === 1 ? "itemLeft" : "itemsLeft")} · ${mt(lang, started ? "continueMeasuring" : "startMeasuring")}`
                    : `✓ ${mt(lang, ready.complete ? "allDone" : "readyForShop")}`}
                </span>
                {nextTarget && (
                  <span className="mt-0.5 block truncate text-sm text-neutral-300">
                    {mt(lang, "nextUp")}: {nextTarget.label}
                  </span>
                )}
                {ready.docsOpen && (
                  <span className="mt-0.5 block text-xs text-neutral-400">
                    {ready.docRemaining} {mt(lang, "docsStillToAdd")}
                  </span>
                )}
              </span>
              <span aria-hidden className="shrink-0 text-2xl text-neutral-400">
                →
              </span>
            </button>
          )}
          {/* A phone cannot show eight stages at once, and half-clipped chips
              tell a worker nothing. There, one line says where they are and
              opens the full list; a tablet has the room for the strip. */}
          <button
            type="button"
            onClick={() => setSectionsOpen(true)}
            className="flex min-h-[48px] w-full items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-left sm:hidden"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                {mt(lang, "stepWord")} {activeStageIndex + 1} {mt(lang, "ofWord")} {EDITOR_STAGES.length}
              </span>
              <span className="block truncate text-sm font-bold text-neutral-100">
                {mt(lang, EDITOR_STAGES[activeStageIndex]?.labelKey || "stageSite")}
                {stageMissing[activeStage]
                  ? ` · ${stageMissing[activeStage]} ${mt(lang, "stageMissing")}`
                  : stageDocs[activeStage]
                    ? ` · ${stageDocs[activeStage]} ${mt(lang, "stageToAdd")}`
                    : ""}
              </span>
            </span>
            <span aria-hidden className="shrink-0 text-neutral-400">
              ☰
            </span>
          </button>
          <div className="hidden gap-2 overflow-x-auto pb-1 sm:flex" aria-label="Measurement stages">
            {EDITOR_STAGES.map((s) => {
              const missing = stageMissing[s.id];
              const docs = stageDocs[s.id];
              // Review is a verdict on the whole sheet, not a stage with its
              // own to-do list: it must never read "Complete" while anything
              // is still blocking submission.
              const note =
                s.id === "review"
                  ? missing
                    ? { text: mt(lang, "chipNotReady"), tone: "text-amber-400" }
                    : { text: mt(lang, "chipReady"), tone: "text-green-400" }
                  : missing
                    ? { text: `${missing} ${mt(lang, "stageMissing")}`, tone: "text-amber-400" }
                    : docs
                      ? { text: `${docs} ${mt(lang, "stageToAdd")}`, tone: "text-sky-400" }
                      : { text: mt(lang, "stageDone"), tone: "text-green-400" };
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToStage(s.id)}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-left min-h-[48px] ${
                    activeStage === s.id
                      ? "border-amber-500 bg-amber-500/10 text-amber-300"
                      : "border-neutral-700 bg-neutral-900 text-neutral-300"
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wide">{s.icon}. {mt(lang, s.labelKey)}</span>
                  <span className={`block text-[10px] mt-0.5 ${note.tone}`}>{note.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        <StageCtx.Provider value={activeStage}>
        <SetupLockCtx.Provider value={setupLocked}>

        {/* Routing — the few answers that decide what the rest of this sheet
            needs to ask at all. */}
        <RoutingCard
          lang={lang}
          data={data}
          set={set}
          routing={routing}
          setRouting={setRouting}
          asksOrientation={asksOrientation}
          asksRailKind={asksRailKind}
          asksExisting={asksExisting}
          asksFloorChange={asksFloorChange}
          asksStdFinish={asksStdFinish}
          routingAnswered={routingAnswered}
          routingTotal={routingTotal}
          routingDone={routingDone}
          routingOpen={routingOpen}
          setRoutingOpen={setRoutingOpen}
          setupLocked={setupLocked}
          setSetupUnlocked={setSetupUnlocked}
          showRoutingCard={showRoutingCard}
          routingSummary={routingSummary}
          standardFinishLine={standardFinishLine}
          usesStandardFinish={usesStandardFinish}
          hasFlights={hasFlights}
          needsPostReference={needsPostReference}
        />
        {isGate && gate && (
          <GateSections
            lang={lang}
            gate={gate}
            setGate={setGate}
          />
        )}

        {isFence && fence && (
          <FenceSections
            lang={lang}
            fence={fence}
            setFence={setFence}
            setSeg={setSeg}
          />
        )}

        {isDeck && deck && (
          <DeckSections
            lang={lang}
            deck={deck}
            setDeck={setDeck}
            setSide={setDeckSide}
          />
        )}

        {isBalcony && balcony && (
          <BalconySections
            lang={lang}
            balcony={balcony}
            setBalcony={setBalcony}
          />
        )}

        {isFire && fire && (
          <FireEscapeSections
            lang={lang}
            fire={fire}
            firePurpose={firePurpose}
            fireSurvey={fireSurvey}
            setFire={setFire}
            setLevel={setLevel}
          />
        )}

        {isWell && well && (
          <WellSections
            lang={lang}
            well={well}
            clearance={clearance}
            setWell={setWell}
            toggleDeliverable={toggleDeliverable}
            setBand={setBand}
            wellWants={wellWants}
          />
        )}

        {/* Which flight is being measured, which ones are finished, and what
            the unfinished ones still owe. Progress a measurer can see, rather
            than one long form that never visibly shortens — and no way to
            believe a stair is measured while two of its flights are blank. */}
        {multiFlightSheet && (
          <div className="mb-4 rounded-xl border border-neutral-700 bg-neutral-900 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold">
                {onJointsStep
                  ? mt(lang, "jointTableTitle")
                  : `${mt(lang, "flight")} ${flightAt + 1} ${mt(lang, "ofWord")} ${allFlights.length}`}
              </span>
              <span className="text-[11px] text-neutral-500">
                {onJointsStep ? mt(lang, "jointsAfterFlights") : mt(lang, "oneFlightAtATime")}
              </span>
            </div>
            {/* The count that moves. Every finished flight fills a bar segment
                green and stays green — the visible reward for finishing one. */}
            <div className="mt-2 flex items-center gap-2">
              <span className="flex flex-1 gap-1">
                {allFlights.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded ${
                      flightDone[i]
                        ? "bg-green-500"
                        : flightStarted[i]
                          ? "bg-amber-500/60"
                          : "bg-neutral-800"
                    }`}
                  />
                ))}
              </span>
              <span
                className={`shrink-0 text-[11px] font-bold ${
                  flightsFinished === allFlights.length ? "text-green-400" : "text-amber-300"
                }`}
              >
                {flightsFinished === allFlights.length
                  ? `✓ ${mt(lang, "allFlightsDone")}`
                  : `${flightsFinished}/${allFlights.length} ${mt(lang, "flightsMeasured")}`}
              </span>
            </div>
            <div className="mt-2 flex gap-1.5">
              {allFlights.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToFlight(i)}
                  className={`min-h-[48px] min-w-9 flex-1 rounded-lg border text-xs font-bold ${
                    !onJointsStep && i === flightAt
                      ? "border-amber-500 bg-amber-500/10 text-amber-300"
                      : flightDone[i]
                        ? "border-green-700 bg-green-600/10 text-green-300"
                        : "border-neutral-700 bg-neutral-800 text-neutral-400"
                  }`}
                >
                  <span className="block">{i + 1}</span>
                  <span
                    className={`block text-[10px] font-bold ${
                      flightDone[i] ? "text-green-400" : "text-amber-400"
                    }`}
                  >
                    {flightDone[i] ? "✓" : flightGapList[i].length}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => goToFlight(allFlights.length)}
                className={`min-h-[48px] flex-1 rounded-lg border px-2 text-xs font-bold ${
                  onJointsStep
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : hasJoints && jointGaps.length === 0
                      ? "border-green-700 bg-green-600/10 text-green-300"
                      : "border-neutral-700 bg-neutral-800 text-neutral-400"
                }`}
              >
                <span className="block">🔗</span>
                {hasJoints && (
                  <span
                    className={`block text-[10px] font-bold ${
                      jointGaps.length === 0 ? "text-green-400" : "text-amber-400"
                    }`}
                  >
                    {jointGaps.length === 0 ? "✓" : jointGaps.length}
                  </span>
                )}
              </button>
            </div>
            {/* Named, not counted: "Flight 3 — not started" is the sentence
                that stops a stair leaving half measured. */}
            {otherOpenFlights.length > 0 && (
              <div className="mt-2 space-y-1">
                {otherOpenFlights.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToFlight(i)}
                    className="flex w-full items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/40 px-2 py-2 text-left text-[11px] text-neutral-300"
                  >
                    <span className="flex-1">
                      {mt(lang, "flight")} {i + 1} —{" "}
                      {flightStarted[i]
                        ? `${flightGapList[i].length} ${mt(lang, "flightLeftToDo")}`
                        : mt(lang, "flightNotStarted")}
                    </span>
                    <span className="text-neutral-500">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <SketchSections
          focusSeg={multiFlightSheet && !onJointsStep ? allFlights[flightAt]?.i : undefined}
          lang={lang}
          data={data}
          set={set}
          shape={sheet.shape}
          activeStage={activeStage}
          view={view}
          viewList={viewList}
          setView={setView}
          movingPostId={movingPostId}
          setMovingPostId={setMovingPostId}
          posts={posts}
          platforms={platforms}
          anchorOptions={anchorOptions}
          addStepPost={addStepPost}
          addPlatformPost={addPlatformPost}
          holdStepLocation={holdStepLocation}
          addPlanPost={addPlanPost}
          holdPlanLocation={holdPlanLocation}
          holdPlatformLocation={holdPlatformLocation}
          tapStructureStep={tapStructureStep}
          tapStructurePlatform={tapStructurePlatform}
          tapPost={tapPost}
          removePost={removePost}
          toggleSketchWall={toggleSketchWall}
        />
        {/* Joints last: a joint's gap and angle only mean something once the
            flights on both sides of it have been measured. */}
        {(!multiFlightSheet || onJointsStep) && (
          <JointSections lang={lang} data={data} set={set} />
        )}
        <StairSections
          lang={lang}
          data={data}
          set={set}
          isSpiral={isSpiral}
          isBuilder={isBuilder}
          hasWinders={hasWinders}
          multiFlight={multiFlight}
          flights={flights}
          platforms={platforms}
          ramps={ramps}
          curves={curves}
        />
        {/* The pieces this stair is made of, after the steps rather than before
            them: the flight count came from the sheet picker, and what shows up
            here is the curve or the extra landing nobody knew about. */}
        {isBuilder && <SegmentsCard lang={lang} data={data} set={set} />}
        <PostsSection
          lang={lang}
          data={data}
          set={set}
          posts={posts}
          anchorOptions={anchorOptions}
          carriedNote={carriedNote}
          removePost={removePost}
          setPhotoSlot={setPhotoSlot}
          isSpiral={isSpiral}
          isWallRail={isWallRail}
          isCustom={isCustom}
          isWell={isWell}
          isFire={isFire}
          isGate={isGate}
          isFence={isFence}
          isBalcony={isBalcony}
          isDeck={isDeck}
        />
        <RailSections
          lang={lang}
          data={data}
          set={set}
          posts={posts}
          anchorOptions={anchorOptions}
          carriedNote={carriedNote}
          setSpan={setSpan}
          setTerm={setTerm}
          setHw={setHw}
          setPhotoSlot={setPhotoSlot}
          hasHandrail={hasHandrail}
          isWallRail={isWallRail}
          isWell={isWell}
          isFire={isFire}
          isGate={isGate}
          isFence={isFence}
          fireNew={fireNew}
          wellWants={wellWants}
        />
        <ShopSections
          lang={lang}
          data={data}
          set={set}
          presets={presets}
          finishOptions={finishOptions}
          colorOptions={colorOptions}
          carriedNote={carriedNote}
          setRouting={setRouting}
          usesStandardFinish={usesStandardFinish}
          standardFinishLine={standardFinishLine}
          asksFloorChange={asksFloorChange}
          hasGuardrail={hasGuardrail}
          hasFlights={hasFlights}
          multiFlight={multiFlight}
          isSpiral={isSpiral}
          isWallRail={isWallRail}
          isCustom={isCustom}
          shape={sheet.shape}
        />
        <PlanSection
          lang={lang}
          data={data}
          set={set}
          /* Decks draw too: the perimeter is rarely a plain rectangle. */
          isCustom={isCustom || isDeck}
        />
        <PhotosSection
          lang={lang}
          data={data}
          shape={sheet.shape}
          setPhotoSlot={setPhotoSlot}
          directSlotPhoto={directSlotPhoto}
          slotBusy={slotBusy}
          slotErr={slotErr}
        />
        <ReviewSection
          lang={lang}
          sheet={sheet}
          job={job}
          status={status}
          rev={rev}
          isAdmin={isAdmin}
          nameById={nameById}
          history={history}
          checks={checks}
          ready={ready}
          redChecks={redChecks}
          orderedGaps={orderedGaps}
          orderedDocGaps={orderedDocGaps}
          carriedSummary={carriedSummary}
          canSubmit={canSubmit}
          pendingLocal={pendingLocal}
          saveState={saveState}
          gapLabel={gapLabel}
          gapStage={gapStage}
          jumpToGap={jumpToGap}
          submitSheet={submitSheet}
          approveSheet={approveSheet}
          sendBackSheet={sendBackSheet}
        />
        {/* The bottom of the screen is where a measurer looks for "what now".
            On a multi-flight stair that answer is the NEXT FLIGHT, not the next
            step — the flight tabs are up the page and easy to miss, so the
            forward button itself walks the flights. The step only moves on
            once every flight this step asks about has been answered. */}
        <div className="mt-2 space-y-2">
          {stageFlightsBlocked && (
            <div className="rounded-xl border border-amber-700 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
              ⚠ {mt(lang, "finishFlightsFirst")}
              {flightStageOpen.length > 0
                ? ` — ${flightStageOpen.map((i) => `${mt(lang, "flight")} ${i + 1}`).join(", ")}`
                : hasJoints
                  ? ` — ${mt(lang, "jointTableTitle")}`
                  : ""}
            </div>
          )}
          <div className="flex gap-3">
            {activeStageIndex > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveFlight(0);
                  setActiveStage(EDITOR_STAGES[activeStageIndex - 1].id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex-1 rounded-xl border border-neutral-700 bg-neutral-900 py-3 font-bold text-neutral-200"
              >
                ← {mt(lang, "previousStage")}
              </button>
            )}
            {/* Flight → flight → joints, in the order they are walked. While
                anything on this step is still open the walk button IS the
                forward button; once nothing is, the step change takes over as
                the primary and walking becomes a quiet second line. */}
            {onFlightStage && stageFlightsBlocked ? (
              !onJointsStep && flightAt + 1 < allFlights.length ? (
                <button
                  type="button"
                  onClick={() => goToFlight(flightAt + 1)}
                  className="flex-1 rounded-xl border border-amber-500 bg-amber-500 py-3 font-bold text-black"
                >
                  {mt(lang, "saveAndNextFlight")} ({flightAt + 2}) →
                </button>
              ) : flightStageOpen.length > 0 ? (
                <button
                  type="button"
                  onClick={() => goToFlight(flightStageOpen[0])}
                  className="flex-1 rounded-xl border border-amber-500 bg-amber-500/10 py-3 font-bold text-amber-300"
                >
                  {flightStageOpen.length} {mt(lang, "flight")} · {mt(lang, "goToFlight")} →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => goToFlight(allFlights.length)}
                  className="flex-1 rounded-xl border border-amber-500 bg-amber-500/10 py-3 font-bold text-amber-300"
                >
                  ⚠ {mt(lang, "jointTableTitle")} →
                </button>
              )
            ) : onFlightStage && !onJointsStep && hasJoints && activeStage === "locations" &&
              flightAt + 1 >= allFlights.length ? (
              <button
                type="button"
                onClick={() => goToFlight(allFlights.length)}
                className="flex-1 rounded-xl border border-amber-500 bg-amber-500 py-3 font-bold text-black"
              >
                {mt(lang, "saveAndJoints")} 🔗
              </button>
            ) : (
              activeStageIndex < EDITOR_STAGES.length - 1 && (
                <button
                  type="button"
                  onClick={nextStage}
                  className="flex-1 rounded-xl border border-amber-500 bg-amber-500 py-3 font-bold text-black"
                >
                  {onFlightStage
                    ? `✓ ${mt(lang, "allFlightsDone")} · ${mt(lang, "nextStage")} →`
                    : `${mt(lang, "nextStage")} →`}
                </button>
              )
            )}
          </div>
          {/* Nothing on this step is waiting, but there are still flights the
              measurer may want to look over. Quiet, and out of the way of the
              step they are actually finished with. */}
          {onFlightStage && !stageFlightsBlocked && !onJointsStep &&
            flightAt + 1 < allFlights.length && (
              <button
                type="button"
                onClick={() => goToFlight(flightAt + 1)}
                className="min-h-[48px] w-full rounded-xl border border-neutral-700 bg-neutral-900 text-sm font-bold text-neutral-300"
              >
                {mt(lang, "flight")} {flightAt + 2} →
              </button>
            )}
          {/* Stopping for the day is a first-class move on a stair that takes
              two visits, so it gets its own button instead of a back gesture
              that leaves the measurer wondering whether anything was kept. */}
          {onFlightStage && (
            <button
              type="button"
              onClick={finishLater}
              className="min-h-[48px] w-full rounded-xl border border-neutral-700 bg-neutral-900 text-sm font-bold text-neutral-300"
            >
              ⬇ {mt(lang, "finishLater")}
            </button>
          )}
        </div>
        </SetupLockCtx.Provider>
        </StageCtx.Provider>
      </div>

      {sectionsOpen && (
        <SectionsDrawer
          lang={lang}
          activeStage={activeStage}
          stageMissing={stageMissing}
          stageDocs={stageDocs}
          onPick={(st) => {
            setSectionsOpen(false);
            goToStage(st);
          }}
          onClose={() => setSectionsOpen(false)}
        />
      )}
      <PointMenus
        lang={lang}
        data={data}
        placementMenu={placementMenu}
        setPlacementMenu={setPlacementMenu}
        selectedPostId={selectedPostId}
        setSelectedPostId={setSelectedPostId}
        setMovingPostId={setMovingPostId}
        addTypedPoint={addTypedPoint}
        removePost={removePost}
        routing={routing}
        set={set}
      />
      {/* Photo capture + markup modal */}
      <PhotoCapture
        lang={lang}
        jobId={job.id}
        sheetName={name || shapeLabel(lang, sheet.shape)}
        slot={photoSlot}
        set={set}
        onClose={() => setPhotoSlot(null)}
      />
      {/* Fraction quick-keys */}
      <FractionBar show={fracBar} tokens={fracTokens} />
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
