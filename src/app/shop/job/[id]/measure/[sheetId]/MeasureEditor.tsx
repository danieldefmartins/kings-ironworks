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
import { railSideSetback } from "@/lib/shop/measure";
import PrintSheet from "./PrintSheet";
import {useMeasureHistory} from "./useMeasureHistory";
import { useSheetSync } from "./useSheetSync";
import GateSections from "./shapes/GateSections";
import FenceSections from "./shapes/FenceSections";
import BalconySections from "./shapes/BalconySections";
import DeckSections from "./shapes/DeckSections";
import OpeningSections from "./shapes/OpeningSections";
import { MeasUnits } from "./MeasUnits";
import StructuralSections from "./shapes/StructuralSections";
import CanopySections from "./shapes/CanopySections";
import WallCapSections from "./shapes/WallCapSections";
import ShopPieceSections from "./shapes/ShopPieceSections";
import FireEscapeSections from "./shapes/FireEscapeSections";
import WellSections from "./shapes/WellSections";
import PointMenus from "./overlays/PointMenus";
import PhotoCapture from "./overlays/PhotoCapture";
import { BrandProvider } from "@/app/shop/brand/BrandContext";
import StepEditor, { type StepTarget } from "./overlays/StepEditor";
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
import SurveySection from "./sections/SurveySection";
import {reconcileFireSurvey} from "@/lib/shop/measure-survey";
import {
  EDITOR_STAGES,
  FRACTIONS,
  LangCtx,
  PlaceholderCtx,
  MissingCtx,
  SetupLockCtx,
  StageCtx,
  DetailStagesCtx,
  Card,
  type EditorStage,
} from "./fields";
import MoreMenu, { MoreItem } from "../../../../MoreMenu";
import SiteWorkspace from './SiteWorkspace';
import { SubstrateCtx } from './SubstrateEditor';
import FinishedSurfaces from './FinishedSurfaces';
import { mountLocations, surfacesFor } from '@/lib/shop/measure-substrate';
import ShopAppearance from '../../../../ShopAppearance';
import SteelWorkspace from './SteelWorkspace';
import ProWorkspace from './ProWorkspace';
import type {PostDropTarget} from './SceneViewport';
import {applyPostPoint} from '@/lib/shop/measure-scene-edit';
import {WorkspaceScene} from './ProWorkspace';
import {DETAIL_TOPICS,detailTopicForStage,detailStagesForTopic,detailTopicLabel,legacyStageForGap,type ProDetailsTopic} from '@/lib/shop/measure-workspace';
import type {SceneSelection} from '@/lib/shop/measure-scene';
import VisualMeasureWorkspace from './VisualMeasureWorkspace';
import SpecialtySteelBuilder from './SpecialtySteelBuilder';
import type {SteelCatalogItem} from '@/lib/shop/measure-steel';
import PanelWorkspace from './PanelWorkspace';
import NextMeasurement from './NextMeasurement';
import LaserControl, { LaserBrowserHint } from './LaserControl';
import {locateMeasure} from '@/lib/shop/measure-locate';
import {Check,ChevronDown,ChevronLeft,Redo2,Undo2} from 'lucide-react';
import type {PanelStage} from './AttachedRails';

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
  catalog = [],
  adminLink = false,
}: {
  catalog?: SteelCatalogItem[];
  /** Owner/admin: the overflow menu links to the admin hub (the shop top bar is hidden here). */
  adminLink?: boolean;
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
    set: syncSet,
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
    currentUpdatedAt,
  } = useSheetSync({
    sheet,
    jobId: job.id,
    status,
    onServerStatus: (next) => setStatus(next),
    onReopened: () => setInfo(mt(lang, "editWarning")),
  });
  const {set,undo,redo,canUndo,canRedo}=useMeasureHistory(dataRef,syncSet,data);
  const [reviewComment, setReviewComment] = useState(sheet.review_comment);
  const [info, setInfo] = useState<string | null>(null);
  const [photoSlot, setPhotoSlot] = useState<{ slot: string; label: string } | null>(null);
  const [placementMenu, setPlacementMenu] = useState<{ segIdx: number; stepIdx: number | null; side: "left" | "right"; pathId?: string; planSegIdx?: number; along?: string } | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  // Which step the drawing was tapped on, while measuring. Null the rest of
  // the time — on the posts step a tap on a tread still means "put a post
  // here", and the two must never be the same gesture.
  const [stepEdit, setStepEdit] = useState<{ segIdx: number; stepIdx: number } | null>(null);
  const [stepListOpen, setStepListOpen] = useState(false);
  const [movingPostId, setMovingPostId] = useState<string | null>(null);
  const [slotBusy, setSlotBusy] = useState<string | null>(null);
  const [slotErr, setSlotErr] = useState<string | null>(null);
  const [fracBar, setFracBar] = useState(false);
  const [activeFlight, setActiveFlight] = useState(() => firstOpenFlight(sheet.data));
  const tx=(en:string,pt:string,es:string)=>lang==='pt'?pt:lang==='es'?es:en;
  const [workspace,setWorkspace]=useState<'design'|'review'>('design');
  const [designTool,setDesignTool]=useState<'site'|'measure'|'panels'|'materials'|'details'|'specialty'>(['grate','ladder'].includes(sheet.data.sceneSetup?.projectType||'')?'specialty':'site');
  const hasExistingStructures=!!data.site?.objects.some(object=>['wall','column','post'].includes(object.kind))||data.posts.some(post=>post.pointType==='existing_post'||post.pointType==='concrete_wall');
  const [detailTopic,setDetailTopic]=useState<ProDetailsTopic>('project');
  const activeStage=detailStagesForTopic(detailTopic)[0];
  const [visualSite,setVisualSite]=useState<string|undefined>();
  const [visualPost,setVisualPost]=useState<string|undefined>();
  const [visualRail,setVisualRail]=useState<string|undefined>();
  const [visualTarget,setVisualTarget]=useState<{segment:number;step:number|null}|undefined>();
  const [postDropError,setPostDropError]=useState('');
  function dropScenePost(target:PostDropTarget){
    const draft=structuredClone(dataRef.current),original=draft.posts.find(p=>p.id===target.postId);
    if(!original||original.pointType!=='railing_post'){setPostDropError(tx('Select an existing railing post to move.','Selecione um poste de corrimão existente para mover.','Seleccione un poste de barandilla existente para mover.'));return;}
    const result=applyPostPoint(draft,target.postId,{segmentIndex:target.segmentIndex,stepIndex:target.stepIndex??null,worldPoint:target.point});
    if(!result.ok){setPostDropError(result.error);return;}
    const moved=draft.posts.find(p=>p.id===target.postId)!;set(d=>{const current=d.posts.find(p=>p.id===target.postId);if(current)Object.assign(current,moved);});setPostDropError('');selectScene({postId:target.postId});
  }
  const [panelStage,setPanelStage]=useState<PanelStage>('design');
  const toolLabels={site:tx('Existing site','Local existente','Sitio existente'),measure:tx('Dimensions & posts','Medidas e postes','Medidas y postes'),panels:tx('Railing panels','Painéis de corrimão','Paneles de barandilla'),specialty:tx('Grates & ladders','Grelhas e escadas','Rejillas y escaleras')} as const;
  // Openings are measured on a form of their own; the scene has nothing to show yet.
  const openingForm=sheet.shape==='opening'&&!!data.opening&&designTool!=='materials';
  // Structural steel is a member list, not a stair scene: its own form is the primary content.
  const structuralForm=sheet.shape==='structural'&&designTool!=='materials';
  // Canopies are a form of their own too, beside the 3D view of the wall and frame.
  const canopyForm=sheet.shape==='canopy'&&designTool!=='materials';
  
  // Wall-cap railings and shop pieces measure on forms of their own too.
  const wallCapForm=sheet.shape==='wall_cap'&&designTool!=='materials';
  const shopPieceForm=sheet.shape==='shop_piece'&&designTool!=='materials';
  const ownForm=openingForm||structuralForm||canopyForm||wallCapForm||shopPieceForm;
  function saveAndClose(){requestSave();router.push(`/shop/job/${job.id}/measure`);}
  function openDetails(topic:ProDetailsTopic){setDetailTopic(topic);if(topic==='review'){setWorkspace('review');return;}setWorkspace('design');setDesignTool('details');}
  function selectScene(target:SceneSelection){
    setWorkspace('design');
    if(target.siteId){setVisualSite(target.siteId);setDesignTool('site');}
    else if(target.postId){setVisualPost(target.postId);setVisualTarget(undefined);setDesignTool('measure');}
    else if(target.railId){setVisualRail(target.railId);setDesignTool('panels');}
    else if(target.segmentIndex!==undefined){setVisualPost(undefined);setVisualTarget({segment:target.segmentIndex,step:target.stepIndex??null});setDesignTool('measure');}
  }
  const viewList = sketchViews(sheet.shape);
  const [view, setView] = useState<SketchView>(viewList[0][0]);
  // Setback and edge distance repeat down a run: a new post takes them from
  // the run it is joining rather than waiting to be told the same two numbers
  // again. Whatever the measurer types on any post becomes the run's answer,
  // so this needs no separate place to keep it.
  function inheritLayout(d: MeasureData, po: PostMeasure) {
    po.fromNosing = d.posts.find((p) => p.id !== po.id && p.fromNosing.trim() !== "")?.fromNosing || po.fromNosing;
    po.fromEdge = railSideSetback(d) || po.fromEdge;
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
      inheritLayout(d, po);
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
      inheritLayout(d, po);
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
      inheritLayout(d, po);
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
      if (d.fire) { const purpose=d.fire.purpose; fn(d.fire); if(purpose!==d.fire.purpose)reconcileFireSurvey(d); }
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

  async function submitDrawing() {
    return enqueue(async () => {
      const res = await fetch("/shop/api/measure", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "submit_drawing", id: sheet.id, jobId: job.id, expectedUpdatedAt: currentUpdatedAt() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Drawing submission failed");
      noteUpdatedAt(result.updated_at);
      if (result.status) setStatus(result.status);
      return result;
    });
  }

  async function approveSheet(extra: Record<string, unknown> = {}) {
    const d = await enqueue(async () => {
      try {
        const res = await fetch("/shop/api/measure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "approve", id: sheet.id, jobId: job.id, ...extra, expectedUpdatedAt: currentUpdatedAt() }),
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
  const gapStage=(key:string):EditorStage=>(sheet.shape==='custom'||sheet.shape==='deck')&&key.startsWith('post')&&key!=='post_photo'?'steps':legacyStageForGap(key);
  // One set, rebuilt on every keystroke, of the requirements still open. A
  // field is red only while its key is in here AND the field is empty, so a
  // box stops being red the moment it is answered.
  const missingKeys = new Set(gaps.map((g) => g.key));

  // ---- The one thing to do next -------------------------------------------
  // Gaps come out of requiredGaps in validation order; the worker needs them
  // in measuring order, so they are sorted by the stage they belong to.
  const stageOrder = (st: EditorStage) => EDITOR_STAGES.findIndex((x) => x.id === st);
  const byStage = (a: Gap, b: Gap) => stageOrder(gapStage(a.key)) - stageOrder(gapStage(b.key));
  const orderedGaps = [...gaps].sort(byStage);
  const orderedDocGaps = [...docGaps].sort(byStage);
  const gapLabel = (g: Gap) =>
    g.key.startsWith("sub_")
      ? `${mt(lang, "gap_sub")} · ${mountLocations(data, sheet.shape, (k) => mt(lang, k), posts).find((l) => l.key === g.detail)?.label || ""}`
      : g.key === "photo"
      ? `${mt(lang, "gap_photo")}: ${mt(lang, `slot_${g.detail}`)}`
      : `${mt(lang, `gap_${g.key}`)}${g.detail ? ` (${g.detail})` : ""}`;
  function jumpToGap(st:EditorStage,flight?:number){if(flight!==undefined)setActiveFlight(flight);openDetails(detailTopicForStage(st));}
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
  const flights=allFlights.length>1?[allFlights[flightAt]]:allFlights;
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
  const multiFlight = allFlights.length > 1 || turns;
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
  // What the step overlay needs to say where it is: the number the measurer
  // reads on the drawing, which flight it belongs to, and how many steps that
  // flight has so the arrows know where the ends are.
  const stepTarget: StepTarget | null = (() => {
    if (!stepEdit) return null;
    const seg = data.segments[stepEdit.segIdx];
    if (!seg || seg.kind !== "flight") return null;
    const fi = allFlights.findIndex((f) => f.i === stepEdit.segIdx);
    if (fi < 0 || !seg.steps[stepEdit.stepIdx]) return null;
    let before = 0;
    for (let k = 0; k < fi; k++) before += allFlights[k].seg.steps.length;
    return {
      segIdx: stepEdit.segIdx,
      stepIdx: stepEdit.stepIdx,
      number: before + stepEdit.stepIdx + 1,
      flightLabel: multiFlightSheet ? `${mt(lang, "flight")} ${fi + 1}` : undefined,
      total: seg.steps.length,
    };
  })();
  function measureStep(segIdx: number, stepIdx: number) {
    setStepEdit({ segIdx, stepIdx });
  }
  function moveStep(delta: number) {
    setStepEdit((cur) => {
      if (!cur) return cur;
      const seg = dataRef.current.segments[cur.segIdx];
      if (!seg || seg.kind !== "flight") return cur;
      const next = cur.stepIdx + delta;
      return next < 0 || next >= seg.steps.length ? cur : { ...cur, stepIdx: next };
    });
  }
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
  // A first-run funnel, not a cage: a sheet that already has measurements in
  // it is never re-gated, and the escape hatch is always on the card.
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

  const detailContent=<DetailStagesCtx.Provider value={detailStagesForTopic(detailTopic)}><StageCtx.Provider value={activeStage}><SetupLockCtx.Provider value={false}>
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
          setupLocked={false}
          setSetupUnlocked={() => {}}
          showRoutingCard={showRoutingCard}
          routingSummary={routingSummary}
          standardFinishLine={standardFinishLine}
          usesStandardFinish={usesStandardFinish}
          hasFlights={hasFlights}
          needsPostReference={needsPostReference}
        />
        {/* Is the finished floor / tread / decking / siding down yet? Every
            height measured off a surface still waiting for its finish is
            re-expressed from where that finish will be. */}
        {surfacesFor(data, sheet.shape).length > 0 && (
          <Card stage="setup" title={`📏 ${mt(lang, "fin_title")}`}>
            <FinishedSurfaces lang={lang} data={data} shape={sheet.shape} set={set} />
          </Card>
        )}
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

        {allFlights.length>1&&['structure','survey','connections'].includes(detailTopic)&&<label className="mb-4 block text-sm font-semibold">{mt(lang,'flight')}<select className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3" value={activeFlight} onChange={e=>setActiveFlight(Number(e.target.value))}>{allFlights.map((_,i)=><option key={i} value={i}>{mt(lang,'flight')} {i+1} · {flightGapList[i].length} {tx('open measurements','medidas pendentes','medidas pendientes')}</option>)}</select></label>}
        <SketchSections embedded
          focusSeg={allFlights[flightAt]?.i}
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
          onMeasureStep={measureStep}
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
        {(
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
          stepListOpen={stepListOpen}
          setStepListOpen={setStepListOpen}
        />
        {/* The pieces this stair is made of, after the steps rather than before
            them: the flight count came from the sheet picker, and what shows up
            here is the curve or the extra landing nobody knew about. */}
        {<SegmentsCard lang={lang} data={data} set={set} />}
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
  </SetupLockCtx.Provider></StageCtx.Provider></DetailStagesCtx.Provider>;
  const reviewContent=<StageCtx.Provider value="review"><SetupLockCtx.Provider value={false}>
        {isFire && fire && <FireEscapeSections lang={lang} fire={fire} firePurpose={firePurpose} fireSurvey={fireSurvey} setFire={setFire} setLevel={setLevel} />}
        <SurveySection data={data} lang={lang} set={set} sheetId={sheet.id} directSlotPhoto={directSlotPhoto} slotBusy={slotBusy} slotErr={slotErr}/>
        <ReviewSection embedded
          data={data}
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
          submitDrawing={submitDrawing}
          approveSheet={approveSheet}
          sendBackSheet={sendBackSheet}
          set={set}
          codeDefault={orgSettings?.defaults?.codeProfile}
        />  </SetupLockCtx.Provider></StageCtx.Provider>;

  return (
    <BrandProvider branding={orgSettings?.branding}>
    <LangCtx.Provider value={lang}><MeasUnits.Provider value={units}>
    <SubstrateCtx.Provider value={{ data, set, shape: sheet.shape, lang, posts, anchorOptions: orgSettings?.options?.anchors || [], onPhoto: (slot, label) => setPhotoSlot({ slot, label }) }}>
    <PlaceholderCtx.Provider value={unitPh}>
    {/* What the sheet is waiting on, carried down to every field — the ones in
        the page and the ones in the step overlay alike — so a
        required-and-empty box paints itself red. Blockers only: the follow-ups
        a sheet can be submitted without have never stopped anybody, and
        colouring those red teaches a measurer to ignore the colour. */}
    <MissingCtx.Provider value={missingKeys}>
      {/* Room for the fixed action bar at the bottom. */}
      <div data-measure-ui className="print:hidden">
        {/* Focus mode: one slim bar. Back saves and closes; the rest is the
            sheet, its save state, history and a menu for housekeeping. */}
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-[var(--shop-glass)] pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-0.5 px-1.5 sm:px-3">
            <button type="button" aria-label={tx('Save & close','Salvar e fechar','Guardar y cerrar')} onClick={saveAndClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-700 active:bg-slate-100"><ChevronLeft aria-hidden className="h-6 w-6"/></button>
            <div className="min-w-0 flex-1 px-1">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => saveName(name)}
                placeholder={shapeLabel(lang, sheet.shape)}
                aria-label={lang==='pt'?'Nome do desenho':lang==='es'?'Nombre del dibujo':'Drawing name'}
                className="block w-full truncate rounded-md bg-transparent text-[16px] font-semibold leading-5 tracking-tight text-slate-900 outline-none focus:bg-slate-100"
              />
              <div className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-slate-500">
                {status !== "in_progress" && <span className={`shrink-0 rounded-full px-1.5 font-bold ${status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{status === "approved" ? `✓ ${mt(lang, "approvedBadge")} · ${mt(lang, "revLabel")} ${rev}` : mt(lang, "submittedBadge")}</span>}
                <span className="truncate">{shapeLabel(lang, sheet.shape)} · {job.customer_name}</span>
              </div>
            </div>
            {/* Autosave is trusted quietly; it only asks for a tap when something went wrong. */}
            {(saveState === "queued" || saveState === "error") ? (
              <button type="button" onClick={requestSave} className="min-h-10 shrink-0 rounded-full border border-amber-500 bg-amber-50 px-3 text-xs font-bold text-amber-800">⬇ {mt(lang, "saveNow")}</button>
            ) : (
              <span role="status" title={saveState === "saving" ? mt(lang, "saving") : saveState === "dirty" ? mt(lang, "unsaved") : mt(lang, "savedAll")} className="grid h-10 w-8 shrink-0 place-items-center">
                {saveState === "saving" ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 motion-reduce:animate-none"/> : saveState === "dirty" ? <span className="h-2 w-2 rounded-full bg-amber-500"/> : <Check aria-hidden className="h-4 w-4 text-emerald-600" strokeWidth={2.5}/>}
                <span className="sr-only">{saveState === "saving" ? mt(lang, "saving") : saveState === "dirty" ? mt(lang, "unsaved") : mt(lang, "savedAll")}</span>
              </span>
            )}
            <button type="button" aria-label={lang==='pt'?'Desfazer':lang==='es'?'Deshacer':'Undo'} disabled={!canUndo} onClick={undo} className="grid h-11 w-10 shrink-0 place-items-center rounded-full text-slate-700 active:bg-slate-100 disabled:opacity-25"><Undo2 aria-hidden className="h-5 w-5"/></button>
            <button type="button" aria-label={lang==='pt'?'Refazer':lang==='es'?'Rehacer':'Redo'} disabled={!canRedo} onClick={redo} className="grid h-11 w-10 shrink-0 place-items-center rounded-full text-slate-700 active:bg-slate-100 disabled:opacity-25"><Redo2 aria-hidden className="h-5 w-5"/></button>
            <LaserControl lang={lang} units={units}/>
            <MoreMenu ghost label={mt(lang, "moreLabel")} closeLabel={mt(lang, "closeLabel")}>
              {(close) => (
                <>
                  <MoreItem onClick={() => { close(); saveAndClose(); }}>
                    ‹ {tx('Save & close','Salvar e fechar','Guardar y cerrar')}
                  </MoreItem>
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
                    🖨 {mt(lang, "drawingPrint")}
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
                  <LaserBrowserHint lang={lang}/>
                  <ShopAppearance lang={lang}/>
                  {adminLink && <MoreItem href="/shop/admin">🛡 {lang==='pt'?'Administração':lang==='es'?'Administración':'Admin'}</MoreItem>}
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
        </header>
      <div className="mx-auto max-w-[1600px] px-3 pb-28 pt-3 sm:px-4">
        {!online && (
          <div className="-mx-3 -mt-3 mb-3 bg-amber-600 px-4 py-2 text-center text-sm font-bold text-black sm:-mx-4">
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
        <ProWorkspace data={data} shape={sheet.shape} lang={lang} onSelect={selectScene} onPostDrop={dropScenePost} wide={workspace==='review'||(canopyForm&&!data.canopy?.kind)} stacked={ownForm}
          lead={workspace==='review'||(structuralForm&&!data.structural?.members.length)||(canopyForm&&!data.canopy?.kind)?undefined:<NextMeasurement data={data} shape={sheet.shape} gaps={gaps} lang={lang} unitPlaceholder={unitPh} set={set} gapLabel={gapLabel}
            onOpenGap={g=>{if(ownForm){locateMeasure({gap:g.key,gapDetail:g.detail,scroll:true});return;}jumpToGap(gapStage(g.key),g.flight);if(g.key.startsWith('sub_')){window.setTimeout(()=>locateMeasure({gap:g.key,gapDetail:g.detail,scroll:true}),350);return;}requestAnimationFrame(()=>document.querySelector('[aria-label="Selection tools"]')?.scrollIntoView?.({block:'start',behavior:'smooth'}));}}
            onShow={slot=>{if(ownForm){locateMeasure({groupId:slot.group?.id,groupKind:slot.group?.kind,part:slot.part,scroll:true});return;}if(slot.segIdx!==undefined)selectScene({segmentIndex:slot.segIdx,stepIndex:slot.stepIdx??null});}}
            onDone={()=>{setWorkspace('review');requestAnimationFrame(()=>window.scrollTo?.({top:0,behavior:'smooth'}));}}/>}
          nav={<nav aria-label="Professional workspace" className="flex gap-1 rounded-2xl bg-slate-100 p-1">
            {([['drawing',tx('Drawing','Desenho','Dibujo')],['materials',tx('Materials','Materiais','Materiales')],['review',tx('Shop package','Pacote da oficina','Paquete del taller')]] as const).map(([key,label])=>{const on=key==='review'?workspace==='review':workspace==='design'&&(key==='materials'?designTool==='materials':designTool!=='materials');return <button type="button" key={key} aria-current={on?'page':undefined} className={`flex min-h-11 flex-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-[15px] font-semibold transition-colors ${on?'bg-white text-slate-900 shadow-sm':'text-slate-500'}`} onClick={()=>{if(key==='review')setWorkspace('review');else{setWorkspace('design');if(key==='materials')setDesignTool('materials');else if(designTool==='materials')setDesignTool('measure');}}}>{label}{key==='review'&&ready.remaining>0&&<span className="rounded-full bg-amber-100 px-1.5 text-[11px] tabular-nums text-amber-900">{ready.remaining}</span>}</button>;})}
          </nav>}
          toolbar={designTool==='materials'||ownForm?undefined:<label className="relative flex h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800">
            <span className="min-w-0 flex-1 truncate">{designTool==='details'?detailTopicLabel(detailTopic,lang):toolLabels[designTool as keyof typeof toolLabels]}</span><ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-slate-500"/>
            <select aria-label={tx('Tool','Ferramenta','Herramienta')} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={designTool==='details'?detailTopic:designTool} onChange={e=>{const v=e.target.value;if(v in toolLabels){setDesignTool(v as keyof typeof toolLabels);}else openDetails(v as ProDetailsTopic);}}>
              <optgroup label={tx('Drawing','Desenho','Dibujo')}>{(Object.keys(toolLabels) as (keyof typeof toolLabels)[]).map(tool=><option key={tool} value={tool}>{toolLabels[tool]}</option>)}</optgroup>
              <optgroup label={tx('Project controls','Controles do projeto','Controles del proyecto')}>{DETAIL_TOPICS.filter(topic=>topic!=='review').map(topic=><option key={topic} value={topic}>{detailTopicLabel(topic,lang)}</option>)}</optgroup>
            </select>
          </label>}>
          <div hidden={workspace!=='design'}>
          {postDropError&&<div role="alert" className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{postDropError}{data.datums.postRef!=='centerline'&&<button type="button" className="mt-2 block min-h-11 rounded-xl bg-white px-3 font-semibold" onClick={()=>{set(d=>{d.datums.postRef='centerline';});setPostDropError('');}}>{tx('Use measurements to post centerlines','Usar medidas ao centro dos postes','Usar medidas al centro de postes')}</button>}</div>}
          {openingForm?<OpeningSections lang={lang} data={data} set={set} finishOptions={finishOptions} colorOptions={colorOptions} setPhotoSlot={setPhotoSlot} directSlotPhoto={directSlotPhoto} slotBusy={slotBusy} slotErr={slotErr}/>:wallCapForm||shopPieceForm?<>{wallCapForm?<WallCapSections lang={lang} data={data} set={set}/>:<ShopPieceSections lang={lang} data={data} set={set}/>}<div className="mt-4 scroll-mt-24"><StageCtx.Provider value="photos"><PhotosSection lang={lang} data={data} shape={sheet.shape} setPhotoSlot={setPhotoSlot} directSlotPhoto={directSlotPhoto} slotBusy={slotBusy} slotErr={slotErr}/></StageCtx.Provider></div></>:canopyForm?<><CanopySections lang={lang} data={data} set={set}/>{!!data.canopy?.kind&&<div data-cn-photos="" className="mt-4 scroll-mt-24"><StageCtx.Provider value="photos"><PhotosSection lang={lang} data={data} shape={sheet.shape} setPhotoSlot={setPhotoSlot} directSlotPhoto={directSlotPhoto} slotBusy={slotBusy} slotErr={slotErr}/></StageCtx.Provider></div>}</>:structuralForm?<><StructuralSections lang={lang} data={data} set={set}/>{!!data.structural?.members.some(m=>m.role==='column'||m.role==='post')&&<section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><h3 className="mb-3 text-[15px] font-semibold text-slate-900">{mt(lang,'fin_title')}</h3><FinishedSurfaces lang={lang} data={data} shape={sheet.shape} set={set}/></section>}{!!data.structural?.members.length&&<div data-st-photos="" className="mt-4 scroll-mt-24"><StageCtx.Provider value="photos"><PhotosSection lang={lang} data={data} shape={sheet.shape} setPhotoSlot={setPhotoSlot} directSlotPhoto={directSlotPhoto} slotBusy={slotBusy} slotErr={slotErr}/></StageCtx.Provider></div>}</>:<>
            {designTool==='site'&&!hasExistingStructures&&<h2 className="mb-3 px-1 text-lg font-semibold tracking-tight text-slate-900">{tx('Start with the existing structures','Comece pelas estruturas existentes','Comience con las estructuras existentes')}</h2>}
            {designTool==='site'&&<SiteWorkspace embedded key={`site:${visualSite||''}`} initialObjectId={visualSite} data={data} set={set} lang={lang} onPanels={()=>setDesignTool('panels')} onContinue={()=>setDesignTool('measure')} onDetails={()=>openDetails('photos')} onPost={id=>selectScene({postId:id})} onMeasure={(segment,step)=>{if(segment!==undefined)selectScene({segmentIndex:segment,stepIndex:step??null});else setDesignTool('measure');}}/>}
            {designTool==='measure'&&<>{!hasExistingStructures&&<div className="mb-3"><button type="button" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-indigo-700" onClick={()=>{setVisualSite(undefined);setDesignTool('site');}}>{tx('Add existing structures','Adicionar estruturas existentes','Añadir estructuras existentes')}</button></div>}<VisualMeasureWorkspace embedded key={`measure:${visualPost||''}:${visualTarget?.segment??''}:${visualTarget?.step??''}`} initialPostId={visualPost} initialTarget={visualTarget} data={data} set={set} lang={lang} shape={sheet.shape} mode="measure" onSiteObject={id=>selectScene({siteId:id})} onAttached={id=>selectScene({railId:id})}/><div className="mt-3 flex flex-wrap gap-2">{(['structure','survey','connections'] as const).map(topic=><button type="button" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold" key={topic} onClick={()=>{if(visualTarget)setActiveFlight(Math.max(0,allFlights.findIndex(f=>f.i===visualTarget.segment)));openDetails(topic);}}>{detailTopicLabel(topic,lang)}</button>)}</div></>}
            {designTool==='panels'&&<PanelWorkspace embedded selectedRailId={visualRail} onSelectRail={setVisualRail} onSceneSelect={selectScene} data={data} set={set} lang={lang} stage={panelStage} onStageChange={setPanelStage} onSite={()=>setDesignTool('site')} onReview={()=>setWorkspace('review')}/>}
            {designTool==='materials'&&<><SteelWorkspace embedded onSceneSelect={selectScene} data={data} set={set} catalog={catalog} lang={lang} sheetId={sheet.id}/><button type="button" className="mt-3 min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold" onClick={()=>openDetails('specifications')}>{detailTopicLabel('specifications',lang)}</button></>}
            {designTool==='specialty'&&<><WorkspaceScene data={data} lang={lang} onSelect={selectScene}/><SpecialtySteelBuilder assemblies={data.specialtySteel||[]} onChange={assemblies=>set(d=>{d.specialtySteel=assemblies;})} lang={lang}/></>}
            {designTool==='details'&&<><WorkspaceScene data={data} lang={lang} onSelect={selectScene}/><h2 className="mb-3 text-lg font-bold">{detailTopicLabel(detailTopic,lang)}</h2>{detailContent}</>}
          </>}
          </div>
          {workspace==='review'&&<div className="mx-auto max-w-5xl"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{tx('Shop package','Pacote da oficina','Paquete del taller')}</h2><button type="button" className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold" onClick={()=>{setWorkspace('design');setDesignTool('materials');}}>{tx('Materials & stock','Materiais e barras','Materiales y barras')}</button></div>{reviewContent}</div>}
        </ProWorkspace>
      </div>
      </div>

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
      {/* One step at a time, opened by tapping the drawing */}
      <StepEditor
        lang={lang}
        data={data}
        target={stepTarget}
        onClose={() => setStepEdit(null)}
        onMove={moveStep}
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
        codeDefault={orgSettings?.defaults?.codeProfile}
      />
    </MissingCtx.Provider>
    </PlaceholderCtx.Provider>
    </SubstrateCtx.Provider>
    </MeasUnits.Provider></LangCtx.Provider>
    </BrandProvider>
  );
}

// Sequential step numbering across flights (bottom flight first).
