"use client";

import { useEffect, useState } from "react";
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
  requiredPhotoSlots,
  OPTIONAL_PHOTO_SLOTS,
  sheetProgress,
  type FlightSegment,
  type FinishSpec,
  type DatumsSpec,
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
  type WallBand,
  type Carryover,
  type CarryoverKey,
  type CarryoverSource,
} from "@/lib/shop/measure";
import {
  sheetReadiness,
  orderedPosts,
  mergeTolerances,
  wellClearance,
  type Gap,
} from "@/lib/shop/measure-checks";
import { mt, optLabel, shapeLabel } from "@/lib/shop/measure-i18n";
import { helpText } from "@/lib/shop/measure-help";
import { SPEC_OPTIONS } from "@/lib/shop/i18n";
import Sketch, { sketchViews, type SketchView } from "./Sketch";
import PlanDraw from "./PlanDraw";
import PrintSheet from "./PrintSheet";
import { useSheetSync } from "./useSheetSync";
import GateSections from "./shapes/GateSections";
import FenceSections from "./shapes/FenceSections";
import BalconySections from "./shapes/BalconySections";
import FireEscapeSections from "./shapes/FireEscapeSections";
import WellSections from "./shapes/WellSections";
import SectionsDrawer from "./overlays/SectionsDrawer";
import PointMenus from "./overlays/PointMenus";
import PhotoCapture from "./overlays/PhotoCapture";
import FractionBar from "./overlays/FractionBar";
import {
  EDITOR_STAGES,
  FRACTIONS,
  LangCtx,
  PlaceholderCtx,
  SetupLockCtx,
  StageCtx,
  type EditorStage,
  stepNumber,
  postStepNumber,
  setPost,
  Card,
  ChipRow,
  ChoiceMInput,
  CheckRow,
  GapList,
  Grid,
  InfoHint,
  MInput,
  MSelect,
  NominalFill,
  PresetInput,
  SkirtSolver,
  SlotRow,
  SmallBtn,
  TermEditor,
  accessChoices,
  commonThicknessChoices,
  obstructionChoices,
  slopeDirectionChoices,
} from "./fields";
import MoreMenu, { MoreItem } from "../../../../MoreMenu";

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
  const [placementMenu, setPlacementMenu] = useState<{ segIdx: number; stepIdx: number | null; side: "left" | "right" } | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [movingPostId, setMovingPostId] = useState<string | null>(null);
  const [slotBusy, setSlotBusy] = useState<string | null>(null);
  const [slotErr, setSlotErr] = useState<string | null>(null);
  const [fracBar, setFracBar] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  // Custom sheets open directly on the drawing canvas; otherwise the user
  // lands on the existing-site setup step.
  const [activeStage, setActiveStage] = useState<EditorStage>(sheet.shape === "custom" ? "steps" : "setup");
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
  const nextTarget: { stage: EditorStage; label: string } | null = orderedGaps.length
    ? { stage: gapStage(orderedGaps[0].key), label: gapLabel(orderedGaps[0]) }
    : redChecks.length
      ? { stage: "review", label: mt(lang, "check_" + redChecks[0].key) }
      : orderedDocGaps.length
        ? { stage: gapStage(orderedDocGaps[0].key), label: gapLabel(orderedDocGaps[0]) }
        : null;
  function goToStage(st: EditorStage) {
    setActiveStage(st);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  // Jumping to a specific missing item must never land on a step that is
  // holding its content back — the routing card still comes first, but the
  // item the worker asked for is there too.
  function jumpToGap(st: EditorStage) {
    if (st === "setup") setSetupUnlocked(true);
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

  // ---- Early routing --------------------------------------------------------
  // Which of the routing questions this shape has any use for. A gate has no
  // stair orientation; a fire escape inspection orders no finish.
  const routing = data.routing;
  const asksOrientation = needsPostReference;
  const asksRailKind = (!isWell || wellWants("guard")) && (!isFire || fireNew);
  const asksFloorChange = !isWell && !isFire && !isGate && !isFence && !isBalcony;
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
              onClick={() => jumpToGap(nextTarget ? nextTarget.stage : "review")}
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
        {showRoutingCard ? (
          <Card stage="setup" always title={`🧭 ${mt(lang, "routingTitle")}`}>
            <p className="mb-3 text-xs text-neutral-400">{mt(lang, "routingHint")}</p>
            <div className="space-y-4">
              <ChipRow
                label={mt(lang, "routingSetting")}
                value={routing.setting}
                options={[
                  ["interior", mt(lang, "routingInterior")],
                  ["exterior", mt(lang, "routingExterior")],
                ]}
                onChange={(v) => setRouting((r) => void (r.setting = v as typeof r.setting))}
              />
              {asksRailKind && (
                <ChipRow
                  help="railKind"
                  label={mt(lang, "railKind")}
                  value={data.rail.kind}
                  options={RAIL_KIND_OPTIONS.map((o) => [o, optLabel(lang, o)] as [string, string])}
                  onChange={(v) => set((d) => void (d.rail.kind = v))}
                />
              )}
              {asksOrientation && (
                <ChipRow
                  help="orientation"
                  label={mt(lang, "orientationLbl")}
                  value={data.datums.orientation}
                  options={[
                    ["left_wall", mt(lang, "orient_left_wall")],
                    ["right_wall", mt(lang, "orient_right_wall")],
                    ["both_wall", mt(lang, "orient_both_wall")],
                    ["both_open", mt(lang, "orient_both_open")],
                  ]}
                  onChange={(v) => set((d) => void (d.datums.orientation = v as DatumsSpec["orientation"]))}
                />
              )}
              {asksExisting && (
                <ChipRow
                  label={mt(lang, "routingExisting")}
                  value={routing.existing}
                  options={[
                    ["none", mt(lang, "routingExistingNone")],
                    ["posts", mt(lang, "routingExistingPosts")],
                    ["columns", mt(lang, "routingExistingColumns")],
                    ["both", mt(lang, "routingExistingBoth")],
                  ]}
                  onChange={(v) => setRouting((r) => void (r.existing = v as typeof r.existing))}
                />
              )}
              {asksFloorChange && (
                <>
                  <ChipRow
                    help="floorChangeQuestion"
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
                  <ChipRow
                    label={mt(lang, "demoPending")}
                    value={data.finish.demoPending}
                    options={[["No", mt(lang, "choiceNo")], ["Yes", mt(lang, "choiceYes")]]}
                    onChange={(v) => set((d) => void (d.finish.demoPending = v))}
                  />
                </>
              )}
              {asksStdFinish && (
                <div>
                  <ChipRow
                    label={mt(lang, "routingStdFinish")}
                    value={routing.standardFinish}
                    options={[
                      ["yes", mt(lang, "routingStdYes")],
                      ["no", mt(lang, "routingStdNo")],
                    ]}
                    onChange={(v) => setRouting((r) => void (r.standardFinish = v as typeof r.standardFinish))}
                  />
                  {usesStandardFinish && standardFinishLine && (
                    <div className="mt-1.5 text-xs text-neutral-400">
                      {mt(lang, "routingStdFinishIs")}: <span className="text-neutral-200">{standardFinishLine}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {setupLocked && (
              <div className="mt-4 border-t border-neutral-800 pt-3">
                <div className="text-xs text-neutral-400">
                  {routingAnswered}/{routingTotal} · {mt(lang, "routingRemaining")}
                </div>
                <button
                  type="button"
                  onClick={() => setSetupUnlocked(true)}
                  className="mt-2 min-h-[48px] rounded-lg border border-neutral-700 bg-neutral-800 px-4 text-sm font-bold text-neutral-300"
                >
                  {mt(lang, "routingShowAll")}
                </button>
              </div>
            )}
            {routingDone && routingOpen && (
              <button
                type="button"
                onClick={() => setRoutingOpen(false)}
                className="mt-4 min-h-[48px] w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 text-sm font-bold text-neutral-300"
              >
                {mt(lang, "routingCollapse")}
              </button>
            )}
          </Card>
        ) : (
          <Card stage="setup" always title={`🧭 ${mt(lang, "routingTitle")}`}>
            <div className="flex items-center gap-3">
              <span className="flex-1 text-sm text-neutral-300">
                ✓ {mt(lang, "routingDone")} · {routingSummary.join(" · ")}
              </span>
              <button
                type="button"
                onClick={() => setRoutingOpen(true)}
                className="min-h-[48px] shrink-0 rounded-lg border border-neutral-700 bg-neutral-800 px-4 text-sm font-bold text-neutral-300"
              >
                {mt(lang, "routingRedo")}
              </button>
            </div>
          </Card>
        )}
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

        {!isSpiral && !isWallRail && !isCustom && !isWell && !isFire && !isGate && !isFence && !isBalcony && (
          <Card stage="setup" title={`🏛 ${mt(lang, "existingStructuresTitle")}`}>
            <p className="mb-3 text-xs text-neutral-400">{mt(lang, "existingStructuresHint")}</p>
            <div className="mb-4 rounded-xl border border-neutral-700 bg-neutral-950/60 p-3">
              {viewList.length > 1 && (
                <div className="mb-3 flex gap-2">
                  {viewList.map(([vw, key]) => (
                    <button key={vw} type="button" onClick={() => setView(vw)}
                      className={`min-h-[44px] rounded-full border px-4 text-xs font-bold ${view === vw ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}>
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
        <Card stage="specs" title={mt(lang, "materialsTitle")}>
          <div className="space-y-3">
            {!isWallRail && <PresetInput label={mt(lang, "matPost")} value={data.materials.post}
              presets={presets.post}
              carried={carriedNote("materials.post", data.materials.post)}
              onClearCarried={() => set((d) => void (d.materials.post = ""))}
              onChange={(v) => { set((d) => void (d.materials.post = v)); }} />}
            <PresetInput label={mt(lang, "matTopRail")} value={data.materials.topRail}
              presets={presets.topRail}
              carried={carriedNote("materials.topRail", data.materials.topRail)}
              onClearCarried={() => set((d) => void (d.materials.topRail = ""))}
              onChange={(v) => { set((d) => void (d.materials.topRail = v)); }} />
            {hasGuardrail && <PresetInput label={mt(lang, "matPicket")} value={data.materials.picket}
              presets={presets.picket}
              carried={carriedNote("materials.picket", data.materials.picket)}
              onClearCarried={() => set((d) => void (d.materials.picket = ""))}
              onChange={(v) => { set((d) => void (d.materials.picket = v)); }} />}
            <Grid>
              {hasGuardrail && <>
                <MInput help="matPicketSpacing" label={mt(lang, "matPicketSpacing")} value={data.materials.picketSpacing}
                  carried={carriedNote("materials.picketSpacing", data.materials.picketSpacing)}
                  onClearCarried={() => set((d) => void (d.materials.picketSpacing = ""))}
                  onChange={(v) => { set((d) => void (d.materials.picketSpacing = v)); }} />
                <MSelect help="matBottomRail" label={mt(lang, "matBottomRail")} value={data.materials.bottomRail}
                  options={presets.bottomRail} lang={lang}
                  carried={carriedNote("materials.bottomRail", data.materials.bottomRail)}
                  onClearCarried={() => set((d) => void (d.materials.bottomRail = ""))}
                  onChange={(v) => { set((d) => void (d.materials.bottomRail = v)); }} />
              </>}
              {usesStandardFinish ? (
                <div className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-950/60 p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] text-neutral-400">{mt(lang, "routingStdFinishIs")}</span>
                    <span className="block truncate text-sm font-bold text-neutral-100">
                      {standardFinishLine || "—"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setRouting((r) => void (r.standardFinish = "no"))}
                    className="min-h-[48px] shrink-0 rounded-lg border border-neutral-700 bg-neutral-800 px-4 text-sm font-bold text-neutral-300"
                  >
                    {mt(lang, "carriedChange")}
                  </button>
                </div>
              ) : (
                <>
                  <MSelect help="finish" label={mt(lang, "finish")} value={data.materials.finish}
                    options={finishOptions} lang={lang} spec
                    carried={carriedNote("materials.finish", data.materials.finish)}
                    onClearCarried={() => set((d) => void (d.materials.finish = ""))}
                    onChange={(v) => { set((d) => void (d.materials.finish = v)); }} />
                  <MSelect help="color" label={mt(lang, "color")} value={data.materials.color}
                    options={colorOptions} lang={lang} spec
                    carried={carriedNote("materials.color", data.materials.color)}
                    onClearCarried={() => set((d) => void (d.materials.color = ""))}
                    onChange={(v) => { set((d) => void (d.materials.color = v)); }} />
                </>
              )}
            </Grid>
            <MInput help="matNotes" label={mt(lang, "matNotes")} placeholder="—" value={data.materials.notes}
              onChange={(v) => set((d) => void (d.materials.notes = v))} />
          </div>
        </Card>

        {/* Site & finish conditions — what surface existed when measured */}
        <Card stage="setup" title={`🧱 ${mt(lang, "finishTitle")}`}>
          {!asksFloorChange && (
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
          )}
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
            {!asksFloorChange && (
              <ChoiceMInput label={mt(lang, "demoPending")} placeholder="—" value={data.finish.demoPending}
                choices={[["No", mt(lang, "choiceNo")], ["Yes", mt(lang, "choiceYes")]]}
                onChange={(v) => set((d) => void (d.finish.demoPending = v))} />
            )}
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
              carried={carriedNote("fab.maxPiece", data.fab.maxPiece)}
              onClearCarried={() => set((d) => void (d.fab.maxPiece = ""))}
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

          {carriedSummary.length > 0 && (
            <div className="mb-4 rounded-lg border border-sky-900 bg-sky-950/30 p-3">
              <div className="text-xs font-bold text-sky-200">
                ↩ {mt(lang, "carriedReviewTitle")} ({carriedSummary.length})
              </div>
              <div className="mt-1 text-sm text-neutral-300">{carriedSummary.join(" · ")}</div>
              <div className="mt-1 text-xs text-neutral-400">{mt(lang, "carriedReviewNote")}</div>
            </div>
          )}

          {/* Two lists, never merged: what stops the shop, and what the file
              still owes. Both jump to the stage that answers them. */}
          {orderedGaps.length > 0 && (
            <GapList
              title={`${mt(lang, "blockersTitle")} (${orderedGaps.length})`}
              tone="amber"
              items={orderedGaps}
              label={gapLabel}
              onJump={(g) => jumpToGap(gapStage(g.key))}
            />
          )}
          {orderedDocGaps.length > 0 && (
            <GapList
              title={`${mt(lang, "followUpsTitle")} (${orderedDocGaps.length})`}
              tone="sky"
              items={orderedDocGaps}
              label={gapLabel}
              onJump={(g) => jumpToGap(gapStage(g.key))}
            />
          )}

          {status === "in_progress" && (
            <>
              {redChecks.length > 0 && (
                <div className="text-sm text-red-300 mb-2">⛔ {mt(lang, "redBlock")}</div>
              )}
              {ready.complete && (
                <div className="text-sm text-green-300 mb-2">✓ {mt(lang, "allClear")}</div>
              )}
              {ready.docsOpen && (
                <div className="text-sm text-sky-300 mb-2">
                  ✓ {mt(lang, "readyForShop")} — {mt(lang, "docsOpenNote")}
                </div>
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
