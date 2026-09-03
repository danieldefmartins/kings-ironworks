"use client";

// Auto-generated measurement sketch. Draws the chosen railing shape with a
// value box on every step/field — entered numbers show in gold, missing ones
// as "—" — and lets the crew tap a tread to place a post.

import type {
  CurveSegment,
  FlightSegment,
  MeasureData,
  MeasureShape,
  PlatformSegment,
  PostMeasure,
  RampSegment,
  SpiralData,
  WellData,
  FireEscapeData,
  GateData,
  FenceData,
  BalconyData,
} from "@/lib/shop/measure";
import { flightWalls, planPaths } from "@/lib/shop/measure";
import { mt, optLabel } from "@/lib/shop/measure-i18n";
import { formatIn, orderedPosts, parseMeas, sortPlatPosts, wellClearance } from "@/lib/shop/measure-checks";
export { sortPlatPosts };

const RUN = 46;
const RISE = 26;
const PLAT = 130;

interface Palette {
  line: string;
  dim: string;
  val: string;
  miss: string;
  post: string;
  ghost: string;
}

const DARK: Palette = {
  line: "#d4d4d4",
  dim: "#8a8a8a",
  val: "#fbbf24",
  miss: "#666666",
  post: "#f59e0b",
  ghost: "#3a3a3a",
};
const LIGHT: Palette = {
  line: "#1f1f1f",
  dim: "#666666",
  val: "#b45309",
  miss: "#b91c1c",
  post: "#92400e",
  ghost: "#d9d9d9",
};

function v(s: string | undefined, p: Palette) {
  const has = s && s.trim() !== "";
  return { text: has ? s!.trim() : "—", fill: has ? p.val : p.miss };
}

export type SketchView = "plan" | "front" | "side";

// Ordered views a shape offers (first = default), with their i18n label keys.
// Crews read plan (top) views best — the full path of the rail — so stairs
// lead with the top view.
export function sketchViews(shape: MeasureShape): [SketchView, string][] {
  if (shape === "spiral")
    return [
      ["front", "planView"],
      ["side", "sideView"],
    ];
  if (shape === "level_run")
    return [
      ["front", "frontView"],
      ["side", "sectionView"],
    ];
  if (shape === "custom") return [["plan", "planView"]];
  // A well is read from above for the footprint and in section for the wall
  // profile — the section is where the 4" gap problem is actually visible.
  if (shape === "window_well")
    return [
      ["plan", "planView"],
      ["side", "sectionView"],
    ];
  // A fire escape is read as an elevation — the whole stack at once.
  if (shape === "fire_escape")
    return [
      ["front", "elevationView"],
      ["plan", "planView"],
    ];
  if (shape === "gate") return [["front", "elevationView"]];
  if (shape === "fence") return [["front", "elevationView"]];
  if (shape === "balcony")
    return [
      ["side", "sectionView"],
      ["front", "elevationView"],
    ];
  if (shape === "ramp")
    return [
      ["side", "sideView"],
      ["front", "frontView"],
    ];
  return [
    ["plan", "planView"],
    ["side", "sideView"],
    ["front", "frontView"],
  ];
}

export default function Sketch({
  shape,
  data,
  lang,
  light = false,
  view = "side",
  onTapStep,
  onTapPlatform,
  onHoldStep,
  onTapPost,
  onHoldPost,
  onTapLine,
  onHoldLine,
  onHoldPlatform,
  onToggleWallSide,
  focusSeg,
}: {
  shape: MeasureShape;
  data: MeasureData;
  lang: string;
  light?: boolean;
  view?: SketchView;
  onTapStep?: (segIdx: number, stepIdx: number) => void;
  onTapPlatform?: (segIdx: number) => void;
  onHoldStep?: (segIdx: number, stepIdx: number) => void;
  onTapPost?: (postId: string) => void;
  onHoldPost?: (postId: string) => void;
  onTapLine?: (pathId: string, segIdx: number, t: number) => void;
  onHoldLine?: (pathId: string, segIdx: number, t: number) => void;
  onHoldPlatform?: (segIdx: number) => void;
  onToggleWallSide?: (side: "left" | "right") => void;
  /** Draw only this segment. Placing a post on a three-flight drawing means
   *  hunting for the right tread among forty; while one flight is being
   *  measured, the drawing shows that flight. */
  focusSeg?: number;
}) {
  const p = light ? LIGHT : DARK;

  if (shape === "custom" || shape === "deck")
    return (
      <CustomPlanSketch
        data={data}
        p={p}
        lang={lang}
        onTapLine={onTapLine}
        onHoldLine={onHoldLine}
        onTapPost={onTapPost}
        onHoldPost={onHoldPost}
      />
    );
  if (shape === "gate") return <GateSketch gate={data.gate} p={p} lang={lang} />;
  if (shape === "fence") return <FenceSketch fence={data.fence} p={p} lang={lang} />;
  if (shape === "balcony")
    return view === "front" ? (
      <BalconyElevationSketch bal={data.balcony} p={p} lang={lang} />
    ) : (
      <BalconySectionSketch bal={data.balcony} p={p} lang={lang} />
    );
  if (shape === "fire_escape")
    return view === "plan" ? (
      <FirePlanSketch fire={data.fire} p={p} lang={lang} />
    ) : (
      <FireElevationSketch fire={data.fire} p={p} lang={lang} />
    );
  if (shape === "window_well")
    return view === "plan" ? (
      <WellPlanSketch well={data.well} p={p} lang={lang} />
    ) : (
      <WellSectionSketch well={data.well} p={p} lang={lang} />
    );
  if (shape === "spiral")
    return view === "front" ? (
      <SpiralSketch spiral={data.spiral} p={p} lang={lang} />
    ) : (
      <SpiralSideSketch spiral={data.spiral} p={p} lang={lang} />
    );
  if (shape === "level_run")
    return view === "front" ? (
      <LevelSketch data={data} p={p} lang={lang} onTapPlatform={onTapPlatform} onHoldPlatform={onHoldPlatform} />
    ) : (
      <LevelSectionSketch data={data} p={p} lang={lang} />
    );
  if (view === "plan")
    return (
      <PlanSketch
        focusSeg={focusSeg}
        shape={shape}
        data={data}
        p={p}
        lang={lang}
        onTapStep={onTapStep}
        onTapPlatform={onTapPlatform}
        onHoldStep={onHoldStep}
        onTapPost={onTapPost}
        onHoldPost={onHoldPost}
        onHoldPlatform={onHoldPlatform}
        onToggleWallSide={onToggleWallSide}
      />
    );
  if (view === "front") return <FrontSketch data={data} p={p} lang={lang} />;
  if (shape === "ramp")
    return <RampSketch data={data} p={p} lang={lang} onTapPlatform={onTapPlatform} />;
  return (
    <StairSketch
      focusSeg={focusSeg}
      shape={shape}
      data={data}
      p={p}
      lang={lang}
      onTapStep={onTapStep}
      onTapPlatform={onTapPlatform}
    />
  );
}

function OrientBanner({
  data,
  lang,
  p,
  x = 20,
  y = 14,
  w = 340,
}: {
  data: MeasureData;
  lang: string;
  p: Palette;
  x?: number;
  y?: number;
  w?: number; // canvas width — font shrinks so the banner never clips
}) {
  const o = data.datums?.orientation;
  const fs = Math.max(4.5, Math.min(8.5, w / 42));
  return (
    <text x={x} y={y} fontSize={fs} fontWeight={700} fill={o ? p.val : p.miss} letterSpacing="0.5">
      {mt(lang, "orientBanner")}
      {o ? ` · ${mt(lang, `orient_${o}`)}` : " · ?"}
    </text>
  );
}

// ---- Plan (top) view — the full path of the rail from above ----------------

// SVG transform numbers must serialise identically on the server and in the
// browser, or React tears the sketch down and re-renders it as a hydration
// mismatch. Trig results differ in their last float digit between the two, so
// round before they reach the attribute.
const r3 = (n: number) => Math.round(n * 1000) / 1000;

const PLAN_TREAD = 17; // px per tread along the run
const PLAN_W = 54; // stair strip width in px
const PLAN_LAND = 66; // landing square

function landingOutline(
  turn: PlatformSegment["turn"],
  size: number,
  top: number,
  bottom: number,
  switchbackOffset: number,
  hasIncomingFlight: boolean,
  hasOutgoingFlight: boolean,
) {
  const halfOpening = PLAN_W / 2;
  const mid = size / 2;
  const parts: string[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number) => parts.push(`M ${x1} ${y1} L ${x2} ${y2}`);

  // Top/bottom openings are where a 90-degree outgoing flight joins.
  if (turn === "left" && hasOutgoingFlight) {
    line(0, top, mid - halfOpening, top);
    line(mid + halfOpening, top, size, top);
  } else line(0, top, size, top);
  if (turn === "right" && hasOutgoingFlight) {
    line(0, bottom, mid - halfOpening, bottom);
    line(mid + halfOpening, bottom, size, bottom);
  } else line(0, bottom, size, bottom);

  // A straight continuation exits through the right edge.
  if (turn === "none" && hasOutgoingFlight) {
    line(size, top, size, -halfOpening);
    line(size, halfOpening, size, bottom);
  } else line(size, top, size, bottom);

  // Incoming and U-return flights use separate openings on the left edge.
  if (hasIncomingFlight) line(0, top, 0, -halfOpening);
  else line(0, top, 0, turn === "u" && hasOutgoingFlight ? switchbackOffset - halfOpening : bottom);
  if (hasIncomingFlight && turn === "u" && hasOutgoingFlight) {
    line(0, halfOpening, 0, switchbackOffset - halfOpening);
    line(0, switchbackOffset + halfOpening, 0, bottom);
  } else if (hasIncomingFlight) line(0, halfOpening, 0, bottom);
  else if (turn === "u" && hasOutgoingFlight) line(0, switchbackOffset + halfOpening, 0, bottom);
  return parts.join(" ");
}

// Touch targets on the sketch are only a few millimetres wide. `touch-action:
// none` is what actually stops the browser from treating a hold as the start
// of a page pan and firing pointercancel — preventDefault() on pointerdown
// does not. The rest keeps iOS from popping the selection callout mid-hold.
const PRESS_STYLE: React.CSSProperties = {
  cursor: "pointer",
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
};

const HOLD_MS = 500;
const DRAG_SLOP = 16; // px of finger travel before a press counts as a drag

interface PressState {
  timer: ReturnType<typeof setTimeout> | null;
  done: boolean; // the press already fired, or was dragged away
  ox: number;
  oy: number;
}

// The press must survive re-renders. This editor re-renders constantly while a
// finger is down (autosave banner, cross-checks, the issue toast), and a
// closure-local timer would be thrown away with the old handler — the press
// then died silently: no tap, and a stray hold from the orphaned timer. Keyed
// on the DOM node, which React keeps across those re-renders.
const pressState = new WeakMap<Element, PressState>();

// A touch produces a compatibility `click` a moment after pointerup, at the
// same coordinates. Since a press acts on pointerup, that click lands on
// whatever the press just opened — it was dismissing the point-type sheet the
// instant it appeared. preventDefault on pointerdown does not stop it, so drop
// the one click that follows.
function swallowNextClick() {
  if (typeof document === "undefined") return;
  const eat = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    done();
  };
  const done = () => {
    document.removeEventListener("click", eat, true);
    clearTimeout(t);
  };
  const t = setTimeout(done, 400);
  document.addEventListener("click", eat, true);
}

function endPress(el: Element): PressState | undefined {
  const st = pressState.get(el);
  if (st?.timer) clearTimeout(st.timer);
  pressState.delete(el);
  return st;
}

// Same two gestures as pressHandlers, but for a target where WHERE you
// pressed matters. The position is read once at pointerdown and remembered,
// because the hold fires later from a timer, by which time the event is gone.
function linePressHandlers(
  tap: (e: React.PointerEvent<SVGElement>) => void,
  hold: (e: React.PointerEvent<SVGElement>) => void
) {
  let at: React.PointerEvent<SVGElement> | null = null;
  const base = pressHandlers(
    () => { if (at) tap(at); },
    () => { if (at) hold(at); }
  );
  return {
    ...base,
    onPointerDown: (e: React.PointerEvent<SVGElement>) => {
      at = e;
      base.onPointerDown(e);
    },
  };
}

function pressHandlers(tap?: () => void, hold?: () => void) {
  return {
    style: PRESS_STYLE,
    onPointerDown: (e: React.PointerEvent<SVGElement>) => {
      e.preventDefault();
      const el = e.currentTarget;
      endPress(el);
      // No setPointerCapture here: touch pointers are implicitly captured to
      // the element that took the pointerdown, so a fingertip drifting off a
      // 3 mm target still completes its press. Asking for capture explicitly
      // is redundant and costs the quick tap.
      const st: PressState = { timer: null, done: false, ox: e.clientX, oy: e.clientY };
      st.timer = setTimeout(() => {
        st.timer = null;
        st.done = true;
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
        hold?.();
      }, HOLD_MS);
      pressState.set(el, st);
    },
    onPointerMove: (e: React.PointerEvent<SVGElement>) => {
      const st = pressState.get(e.currentTarget);
      if (!st?.timer) return;
      // Only a deliberate drag cancels — jitter during a hold must not.
      if (Math.hypot(e.clientX - st.ox, e.clientY - st.oy) > DRAG_SLOP) {
        clearTimeout(st.timer);
        st.timer = null;
        st.done = true;
      }
    },
    onPointerUp: (e: React.PointerEvent<SVGElement>) => {
      e.preventDefault();
      const st = endPress(e.currentTarget);
      if (!st) return;
      swallowNextClick();
      if (!st.done) tap?.();
    },
    onPointerCancel: (e: React.PointerEvent<SVGElement>) => void endPress(e.currentTarget),
    onContextMenu: (e: React.MouseEvent<SVGElement>) => e.preventDefault(),
  };
}

function PlanSketch({
  focusSeg,
  shape,
  data,
  p,
  lang,
  onTapStep,
  onTapPlatform,
  onHoldStep,
  onTapPost,
  onHoldPost,
  onHoldPlatform,
  onToggleWallSide,
}: {
  shape: MeasureShape;
  data: MeasureData;
  p: Palette;
  lang: string;
  onTapStep?: (segIdx: number, stepIdx: number) => void;
  onTapPlatform?: (segIdx: number) => void;
  onHoldStep?: (segIdx: number, stepIdx: number) => void;
  onTapPost?: (postId: string) => void;
  onHoldPost?: (postId: string) => void;
  onHoldPlatform?: (segIdx: number) => void;
  onToggleWallSide?: (side: "left" | "right") => void;
  focusSeg?: number;
}) {
  const wallRail = shape === "wall_rail";
  const o = data.datums?.orientation;
  // Walls are resolved PER SEGMENT, not once for the sheet. A switchback turns
  // you through 180°, so a wall on your left going up the first flight is on
  // your right going up the second — one sheet-level value can only describe a
  // single-flight stair honestly. Each flight may carry its own; those that do
  // not fall back to the sheet orientation, which is what every existing sheet
  // and every single-flight stair does.
  const wallsAt = (segIdx: number) => flightWalls(data.segments[segIdx], o);
  // Sheet-level defaults, still used where a drawing has no segment in hand.
  const openLeft = o === "right_wall" || o === "both_open" || o === "";
  const openRight = o === "left_wall" || o === "both_open" || o === "" || o === undefined;
  // Walled edges are drawn as a wall: same line, several times thicker, in the
  // dim tone rather than the stair tone.
  const edgeStroke = (isLeft: boolean, segIdx?: number) => {
    const w = segIdx === undefined ? { left: !openLeft, right: !openRight } : wallsAt(segIdx);
    const walled = isLeft ? w.left : w.right;
    return walled
      ? { stroke: p.dim, strokeWidth: 6, opacity: 0.75 }
      : { stroke: p.line, strokeWidth: 2, opacity: 1 };
  };

  interface Placed {
    node: React.ReactNode;
    corners: { x: number; y: number }[];
  }
  const groups: Placed[] = [];
  let cx = 0;
  let cy = 0;
  let ang = 0; // degrees; 0 = travelling right
  let postNo = 0;
  let branchBase: { x: number; y: number; ang: number } | null = null;

  const rot = (x: number, y: number, deg: number) => {
    const r = (deg * Math.PI) / 180;
    return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) };
  };
  const world = (lx: number, ly: number) => {
    const r = rot(lx, ly, ang);
    return { x: cx + r.x, y: cy + r.y };
  };

  const stepTurn = (st: FlightSegment["steps"][number]): number => {
    if (!st.winder) return 0;
    const t = parseMeas(st.turnDeg || "");
    return t === null ? 0 : t;
  };

  data.segments.forEach((seg, segIdx) => {
    // Skipping also skips the cursor advance, so the focused segment draws
    // from the origin instead of wherever it would have sat in the whole run.
    if (focusSeg !== undefined && segIdx !== focusSeg) return;
    if (seg.kind === "flight" && seg.branch && branchBase) {
      cx = branchBase.x;
      cy = branchBase.y;
      ang = branchBase.ang + (seg.branch === "left" ? -35 : 35);
    }
    if (seg.kind === "flight" && (seg as FlightSegment).steps.some((st) => stepTurn(st) !== 0)) {
      // winder flight: each tread renders in its own frame; the direction of
      // travel rotates after every turning tread — drawing the wedges
      const fl = seg as FlightSegment;
      const wv = v(fl.width, p);
      fl.steps.forEach((st, i) => {
        const els: React.ReactNode[] = [
          <line key="t" x1={0} y1={-PLAN_W / 2} x2={0} y2={PLAN_W / 2} stroke={p.ghost} strokeWidth={1.2} />,
          <line key="e1" x1={0} y1={-PLAN_W / 2} x2={PLAN_TREAD} y2={-PLAN_W / 2} {...edgeStroke(true, segIdx)} />,
          <line key="e2" x1={0} y1={PLAN_W / 2} x2={PLAN_TREAD} y2={PLAN_W / 2} {...edgeStroke(false, segIdx)} />,
        ];
        if (st.winder) {
          els.push(
            <text key="w" x={PLAN_TREAD / 2} y={4} fontSize={7} textAnchor="middle" fill={p.post}>
              ◺
            </text>
          );
        }
        const stepPosts = data.posts.filter((po) => po.segIdx === segIdx && po.stepIdx === i);
        if (!wallRail) {
          // The area target goes down first so the point markers stay on top
          // and keep their own press handlers reachable.
          if (onTapStep) {
            els.push(
              <rect key="tap" x={0} y={-PLAN_W / 2} width={PLAN_TREAD} height={PLAN_W}
                fill="transparent"
                {...pressHandlers(() => onTapStep(segIdx, i), () => onHoldStep?.(segIdx, i))} />
            );
          }
          stepPosts.forEach((po) => {
            postNo += 1;
            const py = po.side === "left" ? -PLAN_W / 2 : po.side === "right" ? PLAN_W / 2 : openRight && !openLeft ? PLAN_W / 2 : -PLAN_W / 2;
            els.push(
              <PlanPoint key={`p${po.id}`} po={po} x={PLAN_TREAD / 2} y={py} n={postNo} p={p} onTap={onTapPost} onHold={onHoldPost} />
            );
          });
        }
        if (i === 0) {
          els.push(
            <text key="wl" x={-8} y={4} fontSize={8.5} textAnchor="end" fill={wv.fill}>
              {wv.text}
            </text>
          );
        }
        groups.push({
          node: (
            <g key={`wfl${segIdx}-${i}`} transform={`translate(${r3(cx)} ${r3(cy)}) rotate(${r3(ang)})`}>
              {els}
            </g>
          ),
          corners: [world(0, -PLAN_W / 2 - 20), world(PLAN_TREAD, -PLAN_W / 2 - 20), world(0, PLAN_W / 2 + 20), world(PLAN_TREAD, PLAN_W / 2 + 20)],
        });
        const end = world(PLAN_TREAD, 0);
        cx = end.x;
        cy = end.y;
        ang += stepTurn(st); // the wedge turns the travel direction
      });
      return;
    }
    if (seg.kind === "curve") {
      // radius section: edge arcs at ±W/2 around the centerline radius
      const cv = seg as CurveSegment;
      const sweepMeas = parseMeas(cv.sweepDeg);
      const Rm = parseMeas(cv.radius);
      const Cm = parseMeas(cv.chord);
      let sweep = sweepMeas !== null && sweepMeas > 0 ? sweepMeas : null;
      if (sweep === null && Rm !== null && Rm > 0 && Cm !== null && Cm > 0 && Cm / (2 * Rm) <= 1) {
        sweep = (2 * Math.asin(Cm / (2 * Rm)) * 180) / Math.PI;
      }
      if (sweep === null) sweep = 90;
      const sgn = cv.direction === "left" ? -1 : 1;
      const Rd = 78; // display radius
      const rv = v(cv.radius, p);
      const av = v(cv.arc, p);
      // circle center is perpendicular to travel
      const centerLocal = { x: 0, y: sgn * Rd };
      const th = (sweep * Math.PI) / 180;
      const rotPt = (px: number, py: number) => {
        // rotate local point around centerLocal by sgn*th
        const dx = px - centerLocal.x;
        const dy = py - centerLocal.y;
        const c = Math.cos(sgn * th);
        const sn = Math.sin(sgn * th);
        return { x: centerLocal.x + dx * c - dy * sn, y: centerLocal.y + dx * sn + dy * c };
      };
      const endLocal = rotPt(0, 0);
      const largeArc = sweep > 180 ? 1 : 0;
      const svgSweep = sgn === 1 ? 1 : 0;
      const edge = (off: number) => {
        const r = Rd - sgn * off;
        const s0 = { x: 0, y: off };
        const s1 = rotPt(0, off);
        return `M ${s0.x} ${s0.y} A ${Math.abs(r)} ${Math.abs(r)} 0 ${largeArc} ${svgSweep} ${s1.x} ${s1.y}`;
      };
      const mid = rotHalf(centerLocal, sgn, th / 2);
      const els: React.ReactNode[] = [
        <path key="e1" d={edge(-PLAN_W / 2)} fill="none" stroke={p.line} strokeWidth={2} />,
        <path key="e2" d={edge(PLAN_W / 2)} fill="none" stroke={p.line} strokeWidth={2} />,
        <path key="cl" d={edge(0)} fill="none" stroke={p.ghost} strokeWidth={1} strokeDasharray="4 4" />,
        <text key="r" x={mid.x} y={mid.y - sgn * 14} fontSize={8.5} textAnchor="middle" fill={rv.fill}>
          R {rv.text}
        </text>,
        <text key="a" x={mid.x} y={mid.y - sgn * 14 + 11} fontSize={8.5} textAnchor="middle" fill={av.fill}>
          ⌒ {av.text}
        </text>,
      ];
      const curvePosts = sortPlatPosts(data.posts.filter((po) => po.segIdx === segIdx));
      if (onTapPlatform && !wallRail) {
        els.push(
          <path key="tap" d={edge(0)} fill="none" stroke="transparent" strokeWidth={PLAN_W}
            {...pressHandlers(() => onTapPlatform(segIdx), () => onHoldPlatform?.(segIdx))} />
        );
      }
      curvePosts.forEach((po, idx) => {
        postNo += 1;
        const frac = (idx + 1) / (curvePosts.length + 1);
        const pp = rotPt2(centerLocal, sgn, th * frac, 0, po.side === "right" ? PLAN_W / 2 : -PLAN_W / 2);
        els.push(
          <PlanPoint key={`cp${po.id}`} po={po} x={pp.x} y={pp.y} n={postNo} p={p} onTap={onTapPost} onHold={onHoldPost} />
        );
      });
      groups.push({
        node: (
          <g key={`cu${segIdx}`} transform={`translate(${r3(cx)} ${r3(cy)}) rotate(${r3(ang)})`}>
            {els}
          </g>
        ),
        corners: [
          world(0, -Rd - PLAN_W),
          world(0, Rd + PLAN_W),
          world(endLocal.x, endLocal.y - PLAN_W),
          world(endLocal.x, endLocal.y + PLAN_W),
          world(Rd + PLAN_W, 0),
          world(-Rd - PLAN_W, 0),
        ],
      });
      const endW = world(endLocal.x, endLocal.y);
      cx = endW.x;
      cy = endW.y;
      ang += sgn * sweep;
      return;
    }
    if (seg.kind === "ramp") {
      const rp = seg as RampSegment;
      const len = 90;
      const lv = v(rp.length, p);
      const els: React.ReactNode[] = [
        <line key="e1" x1={0} y1={-PLAN_W / 2} x2={len} y2={-PLAN_W / 2} {...edgeStroke(true, segIdx)} />,
        <line key="e2" x1={0} y1={PLAN_W / 2} x2={len} y2={PLAN_W / 2} {...edgeStroke(false, segIdx)} />,
        <line key="ar" x1={8} y1={0} x2={len - 8} y2={0} stroke={p.ghost} strokeWidth={1.2} />,
        <text key="l" x={len / 2} y={-PLAN_W / 2 - 6} fontSize={8.5} textAnchor="middle" fill={lv.fill}>
          {lv.text}
        </text>,
      ];
      const rampPosts = sortPlatPosts(data.posts.filter((po) => po.segIdx === segIdx));
      if (onTapPlatform && !wallRail) {
        els.push(
          <rect key="tap" x={0} y={-PLAN_W / 2} width={len} height={PLAN_W}
            fill="transparent"
            {...pressHandlers(() => onTapPlatform(segIdx), () => onHoldPlatform?.(segIdx))} />
        );
      }
      rampPosts.forEach((po, idx) => {
        postNo += 1;
        const frac = (idx + 1) / (rampPosts.length + 1);
        els.push(
          <PlanPoint key={`rp${po.id}`} po={po} x={frac * len} y={po.side === "left" ? -PLAN_W / 2 : po.side === "right" ? PLAN_W / 2 : openRight ? PLAN_W / 2 : -PLAN_W / 2} n={postNo} p={p} onTap={onTapPost} onHold={onHoldPost} />
        );
      });
      groups.push({
        node: (
          <g key={`rpg${segIdx}`} transform={`translate(${r3(cx)} ${r3(cy)}) rotate(${r3(ang)})`}>
            {els}
          </g>
        ),
        corners: [world(0, -PLAN_W), world(len, -PLAN_W), world(0, PLAN_W), world(len, PLAN_W)],
      });
      const end = world(len, 0);
      cx = end.x;
      cy = end.y;
      return;
    }
    if (seg.kind === "flight") {
      const fl = seg as FlightSegment;
      const len = fl.steps.length * PLAN_TREAD;
      const wv = v(fl.width, p);
      const els: React.ReactNode[] = [];
      // strip edges
      els.push(
        <line key="e1" x1={0} y1={-PLAN_W / 2} x2={len} y2={-PLAN_W / 2} {...edgeStroke(true, segIdx)} />,
        <line key="e2" x1={0} y1={PLAN_W / 2} x2={len} y2={PLAN_W / 2} {...edgeStroke(false, segIdx)} />
      );
      // tread lines + taps + posts
      fl.steps.forEach((_, i) => {
        els.push(
          <line key={`t${i}`} x1={i * PLAN_TREAD} y1={-PLAN_W / 2} x2={i * PLAN_TREAD} y2={PLAN_W / 2} stroke={p.ghost} strokeWidth={1.2} />
        );
        const stepPosts = data.posts.filter((po) => po.segIdx === segIdx && po.stepIdx === i);
        if (!wallRail) {
          if (onTapStep) {
            els.push(
              <rect key={`tap${i}`} x={i * PLAN_TREAD} y={-PLAN_W / 2} width={PLAN_TREAD} height={PLAN_W}
                fill="transparent"
                {...pressHandlers(() => onTapStep(segIdx, i), () => onHoldStep?.(segIdx, i))} />
            );
          }
          stepPosts.forEach((po, pi) => {
            postNo += 1;
            const py = po.side === "left" ? -PLAN_W / 2 : po.side === "right" ? PLAN_W / 2 : openRight && !openLeft ? PLAN_W / 2 : openLeft && !openRight ? -PLAN_W / 2 : pi % 2 === 0 ? PLAN_W / 2 : -PLAN_W / 2;
            els.push(
              <PlanPoint key={`p${po.id}`} po={po} x={i * PLAN_TREAD + PLAN_TREAD / 2} y={py} n={postNo} p={p} onTap={onTapPost} onHold={onHoldPost} />
            );
          });
        }
      });
      // width label across the strip start
      els.push(
        <text key="w" x={-8} y={4} fontSize={8.5} textAnchor="end" fill={wv.fill}>
          {wv.text}
        </text>
      );
      // step count label
      els.push(
        <text key="n" x={len / 2} y={PLAN_W / 2 + 14} fontSize={8} textAnchor="middle" fill={p.dim}>
          {fl.steps.length} × {mt(lang, "step").toLowerCase()}
        </text>
      );
      groups.push({
        node: (
          <g key={`fl${segIdx}`} transform={`translate(${r3(cx)} ${r3(cy)}) rotate(${r3(ang)})`}>
            {els}
          </g>
        ),
        corners: [world(0, -PLAN_W / 2 - 20), world(len, -PLAN_W / 2 - 20), world(0, PLAN_W / 2 + 20), world(len, PLAN_W / 2 + 20)],
      });
      const end = world(len, 0);
      cx = end.x;
      cy = end.y;
    } else if (seg.kind === "platform") {
      const pl = seg as PlatformSegment;
      const L = PLAN_LAND;
      const switchbackOffset = PLAN_W + 16;
      const platTop = -L / 2;
      const platBottom = pl.turn === "u" ? switchbackOffset + L / 2 : L / 2;
      const lv = v(pl.length, p);
      const dv = v(pl.depth, p);
      const els: React.ReactNode[] = [
        <path key="r" d={landingOutline(
          pl.turn,
          L,
          platTop,
          platBottom,
          switchbackOffset,
          data.segments[segIdx - 1]?.kind === "flight",
          data.segments[segIdx + 1]?.kind === "flight",
        )} fill="none" stroke={p.line} strokeWidth={2} />,
        <text key="l" x={L / 2} y={-L / 2 - 6} fontSize={8.5} textAnchor="middle" fill={lv.fill}>
          {lv.text}
        </text>,
        <text key="d" x={L + 6} y={3} fontSize={8.5} fill={dv.fill}>
          {dv.text}
        </text>,
      ];
      const platPosts = sortPlatPosts(data.posts.filter((po) => po.segIdx === segIdx));
      if (onTapPlatform && !wallRail) {
        els.push(
          <rect key="tap" x={0} y={platTop} width={L} height={platBottom - platTop} fill="transparent"
            {...pressHandlers(() => onTapPlatform(segIdx), () => onHoldPlatform?.(segIdx))} />
        );
      }
      platPosts.forEach((po, idx) => {
        postNo += 1;
        const frac = (idx + 1) / (platPosts.length + 1);
        els.push(
          <PlanPoint key={`pp${po.id}`} po={po} x={frac * L} y={po.side === "left" ? platTop : po.side === "right" ? platBottom : openRight ? platBottom : platTop} n={postNo} p={p} onTap={onTapPost} onHold={onHoldPost} />
        );
      });
      groups.push({
        node: (
          <g key={`pl${segIdx}`} transform={`translate(${r3(cx)} ${r3(cy)}) rotate(${r3(ang)})`}>
            {els}
          </g>
        ),
        corners: [world(0, platTop - 20), world(L, platTop - 20), world(0, platBottom + 20), world(L, platBottom + 20)],
      });
      // Enter at the center of the near edge. A turning flight must leave from
      // the center of the selected side edge—not the far-edge center—so the
      // next flight actually meets the landing in the plan view.
      if (pl.turn === "left") {
        const end = world(L / 2, -L / 2);
        cx = end.x;
        cy = end.y;
        ang -= 90;
      } else if (pl.turn === "right") {
        const end = world(L / 2, L / 2);
        cx = end.x;
        cy = end.y;
        ang += 90;
      } else if (pl.turn === "none") {
        const end = world(L, 0);
        cx = end.x;
        cy = end.y;
        const next = data.segments[segIdx + 1];
        if (next?.kind === "flight" && next.branch) branchBase = { x: cx, y: cy, ang };
      }
      else if (pl.turn === "u") {
        const end = world(0, switchbackOffset);
        cx = end.x;
        cy = end.y;
        // switchback: return from the adjacent opening of the same landing
        ang += 180;
      }
    }
  });

  // bounding box over all corners
  const xs = groups.flatMap((g) => g.corners.map((c) => c.x));
  const ys = groups.flatMap((g) => g.corners.map((c) => c.y));
  const minX = Math.min(0, ...xs) - 34;
  const minY = Math.min(0, ...ys) - 34;
  const maxX = Math.max(60, ...xs) + 34;
  const maxY = Math.max(40, ...ys) + 34;
  const w = maxX - minX;
  const h = maxY - minY;

  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="w-full" style={{ maxHeight: 420 }}>
      <OrientBanner data={data} lang={lang} p={p} x={minX + 8} y={minY + 12} w={w} />
      {onToggleWallSide && (
        <g transform={`translate(${minX + 8} ${minY + 20})`}>
          {(() => {
            // Share whatever width the drawing actually has, so both toggles
            // stay inside the viewBox however narrow the stair is.
            const tw = Math.max(58, Math.min(104, (w - 24) / 2));
            return (
              <>
                <WallSideToggle x={0} width={tw} side="left" wall={o === "left_wall" || o === "both_wall"} lang={lang} p={p} onToggle={onToggleWallSide} />
                <WallSideToggle x={tw + 8} width={tw} side="right" wall={o === "right_wall" || o === "both_wall"} lang={lang} p={p} onToggle={onToggleWallSide} />
              </>
            );
          })()}
        </g>
      )}
      {/* UP arrow at the start of travel */}
      <g>
        <line x1={-24} y1={0} x2={-8} y2={0} stroke={p.dim} strokeWidth={1.6} />
        <path d={`M -8 0 l -5 -3.5 v 7 z`} fill={p.dim} />
        <text x={-24} y={-6} fontSize={8} fill={p.dim}>
          UP ↑
        </text>
      </g>
      {groups.map((g) => g.node)}
    </svg>
  );
}

function pointStyle(po: PostMeasure, p: Palette) {
  if (po.pointType === "concrete_wall") return { color: "#9ca3af", r: 8, label: "C", square: true };
  if (po.pointType === "existing_post") {
    const wood = po.anchor.toLowerCase().includes("wood");
    return { color: wood ? "#b7793f" : "#38bdf8", r: 6, label: wood ? "W" : "S", square: true };
  }
  if (po.pointType === "clip") return { color: "#c084fc", r: 5, label: "CL", square: false };
  return { color: p.post, r: 4, label: "P", square: false };
}

function PlanPoint({ po, x, y, n, p, onTap, onHold }: {
  po: PostMeasure; x: number; y: number; n: number; p: Palette;
  onTap?: (id: string) => void; onHold?: (id: string) => void;
}) {
  const s = pointStyle(po, p);
  return (
    <g {...pressHandlers(() => onTap?.(po.id), () => onHold?.(po.id))}>
      <circle cx={x} cy={y} r={Math.max(12, s.r + 5)} fill="transparent" />
      {s.square
        ? <rect x={x - s.r} y={y - s.r} width={s.r * 2} height={s.r * 2} rx={po.pointType === "concrete_wall" ? 1 : 2} fill={s.color} />
        : <circle cx={x} cy={y} r={s.r} fill={s.color} />}
      <text x={x + s.r + 3} y={y - s.r - 2} fontSize={8} fontWeight={800} fill={s.color} pointerEvents="none">
        {s.label}{n}
      </text>
      {/* How far this post sits from the edge of the first step — the number
          the shop lays out from. It was recorded and never drawn, so the plan
          showed WHERE a post was without saying how far along. Daniel: "just
          a number on top of the posts like 53\" from the edge of 1st step." */}
      {po.distanceFromFirst?.trim() ? (
        <text x={x} y={y - s.r - 11} fontSize={7.5} fontWeight={700} textAnchor="middle" fill={p.val} pointerEvents="none">
          {po.distanceFromFirst.trim()}
        </text>
      ) : null}
    </g>
  );
}

function WallSideToggle({ x, width = 104, side, wall, lang, p, onToggle }: {
  x: number; width?: number; side: "left" | "right"; wall: boolean; lang: string; p: Palette; onToggle: (side: "left" | "right") => void;
}) {
  return (
    <g transform={`translate(${x} 0)`} onClick={() => onToggle(side)} style={{ cursor: "pointer" }}>
      <rect width={width} height={22} rx={6} fill={wall ? "#78350f" : "#262626"} stroke={wall ? p.val : p.dim} />
      <text x={width / 2} y={14.5} textAnchor="middle" fontSize={Math.min(7.5, width / 13)} fontWeight={800} fill={wall ? p.val : p.line}>
        {side === "left" ? mt(lang, "leftSideShort") : mt(lang, "rightSideShort")} · {mt(lang, wall ? "wallShort" : "openShort")}
      </text>
    </g>
  );
}

// ---- Custom drawn plan — every drawn line is a dimensioned segment ---------

// Where a placed point sits on the drawing: along its line, at the distance
// measured from that line's start. With no length entered yet there is nothing
// to scale against, so it rides at the midpoint until there is.
export function planPointXY(
  data: MeasureData,
  po: PostMeasure
): { x: number; y: number; nx: number; ny: number } | null {
  const path = planPaths(data.plan).find((pp) => pp.id === po.pathId);
  if (!path) return null;
  const i = po.planSegIdx ?? 0;
  const a = path.points[i];
  const b = path.points[(i + 1) % path.points.length];
  if (!a || !b) return null;
  const len = parseMeas(path.segs[i]?.len);
  const along = parseMeas(po.pos);
  const frac = len && len > 0 && along !== null ? Math.max(0, Math.min(1, along / len)) : 0.5;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  return { x: a.x + dx * frac, y: a.y + dy * frac, nx: -dy / L, ny: dx / L };
}

export function CustomPlanSketch({
  data,
  p,
  lang,
  onTapLine,
  onHoldLine,
  onTapPost,
  onHoldPost,
}: {
  data: MeasureData;
  p: Palette;
  lang: string;
  onTapLine?: (pathId: string, segIdx: number, t: number) => void;
  onHoldLine?: (pathId: string, segIdx: number, t: number) => void;
  onTapPost?: (postId: string) => void;
  onHoldPost?: (postId: string) => void;
}) {
  const paths = planPaths(data.plan).filter((pp) => pp.points.length > 0);
  if (paths.length === 0) {
    return (
      <svg viewBox="0 0 340 120" className="w-full" style={{ maxHeight: 200 }}>
        <text x={170} y={60} fontSize={11} textAnchor="middle" fill={p.miss}>
          {mt(lang, "gap_plan_drawing")}
        </text>
      </svg>
    );
  }
  // Every run shares one frame, so the drawing reads as a single site plan.
  const allPts = paths.flatMap((pp) => pp.points);
  const xs = allPts.map((q) => q.x);
  const ys = allPts.map((q) => q.y);
  const minX = Math.min(...xs) - 44;
  const minY = Math.min(...ys) - 34;
  const w = Math.max(...xs) - Math.min(...xs) + 88;
  const h = Math.max(...ys) - Math.min(...ys) + 68;

  const els: React.ReactNode[] = [];
  paths.forEach((path, pi) => {
    const pts = path.points;
    const segCount = path.closed && pts.length > 2 ? pts.length : pts.length - 1;
    for (let i = 0; i < segCount; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const lv = v(path.segs[i]?.len, p);
      const sg = path.segs[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const typeColor = sg?.kind === "flight" ? p.post
        : sg?.kind === "landing" ? "#38bdf8"
          : sg?.kind === "ramp" ? "#a78bfa"
            : sg?.kind === "curve" ? "#34d399"
              : p.line;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const L = Math.hypot(dx, dy) || 1;
      // label offset perpendicular to the line
      const ox = (-dy / L) * 11;
      const oy = (dx / L) * 11;
      // Where along this line a finger landed, so a tap places the point at
      // the spot it was aimed at rather than always at the middle.
      const along = (e: React.PointerEvent<SVGElement>) => {
        const svg = (e.currentTarget.ownerSVGElement || e.currentTarget) as SVGSVGElement;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const loc = pt.matrixTransform(svg.getScreenCTM()!.inverse());
        const L2 = dx * dx + dy * dy || 1;
        return Math.max(0, Math.min(1, ((loc.x - a.x) * dx + (loc.y - a.y) * dy) / L2));
      };
      els.push(
        <g key={`s${pi}-${i}`}>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={typeColor} strokeWidth={sg?.kind === "flight" ? 4 : 2.8} strokeLinecap="round" />
          {(onTapLine || onHoldLine) && (
            // Finger-width press target over the line: tap places a railing
            // post, press-and-hold opens the column / wall / clip menu — the
            // same two gestures every other sketch uses.
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="transparent" strokeWidth={16} strokeLinecap="round"
              {...linePressHandlers(
                (e) => onTapLine?.(path.id, i, along(e)),
                (e) => onHoldLine?.(path.id, i, along(e))
              )}
            />
          )}
          <circle cx={mx + ox * 1.9} cy={my + oy * 1.9} r={7} fill="none" stroke={p.ghost} />
          <text x={mx + ox * 1.9} y={my + oy * 1.9 + 3} fontSize={8} textAnchor="middle" fill={p.dim}>
            {i + 1}
          </text>
          <text x={mx + ox * 0.4} y={my + oy * 0.4 + 3} fontSize={9} fontWeight={700} textAnchor="middle" fill={lv.fill}>
            {lv.text}
          </text>
          {sg?.kind && (
            <text x={mx - ox * 1.1} y={my - oy * 1.1 + 3} fontSize={7.5} fontWeight={800} textAnchor="middle" fill={typeColor}>
              {sg.kind === "flight" ? `${mt(lang, "step")} × ${sg.steps || "?"}` : mt(lang, `segment_${sg.kind}`)}
            </text>
          )}
        </g>
      );
    }
    // Name each run at its first point, but only when there is more than one.
    if (paths.length > 1 && pts[0]) {
      els.push(
        <text key={`rl${pi}`} x={pts[0].x} y={pts[0].y - 10} fontSize={8} fontWeight={800} textAnchor="middle" fill={p.dim}>
          {path.label || `${pi + 1}`}
        </text>
      );
    }
    pts.forEach((q, i) => {
      els.push(<circle key={`v${pi}-${i}`} cx={q.x} cy={q.y} r={3} fill={p.post} />);
    });
  });

  // Placed points ride on top of the lines they belong to, numbered the same
  // way as on every other sketch, and answering the same tap and hold.
  orderedPosts(data).forEach((po, n) => {
    if (!po.pathId) return;
    const at = planPointXY(data, po);
    if (!at) return;
    els.push(
      <PlanPoint
        key={`pp${po.id}`}
        po={po}
        x={at.x + at.nx * 7}
        y={at.y + at.ny * 7}
        n={n + 1}
        p={p}
        onTap={onTapPost}
        onHold={onHoldPost}
      />
    );
  });

  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="w-full" style={{ maxHeight: 420 }}>
      <OrientBanner data={data} lang={lang} p={p} x={minX + 8} y={minY + 12} w={w} />
      {els}
    </svg>
  );
}

// ---- Stairs (straight / platform / L / U / wall rail) ----------------------

function StairSketch({
  focusSeg,
  shape,
  data,
  p,
  lang,
  onTapStep,
  onTapPlatform,
}: {
  shape: MeasureShape;
  data: MeasureData;
  p: Palette;
  lang: string;
  onTapStep?: (segIdx: number, stepIdx: number) => void;
  onTapPlatform?: (segIdx: number) => void;
  focusSeg?: number;
}) {
  const wallRail = shape === "wall_rail";

  // Pre-compute canvas size.
  let w = 90;
  let hRise = 0;
  for (const seg of data.segments) {
    if (seg.kind === "flight") {
      w += seg.steps.length * RUN;
      hRise += seg.steps.length * RISE;
    } else if (seg.kind === "platform") {
      w += PLAT;
    } else if (seg.kind === "curve") {
      w += 110;
      if (seg.rise.trim() !== "") hRise += 60;
    } else if (seg.kind === "ramp") {
      w += 130;
      hRise += 60;
    }
  }
  const H = hRise + 130;
  const baseY = H - 45;

  const els: React.ReactNode[] = [];
  const taps: React.ReactNode[] = [];
  let x = 40;
  let y = baseY;
  let outline = `M ${x} ${y}`;
  let firstNose: [number, number] | null = null;
  let lastNose: [number, number] | null = null;
  let postNo = 0;
  let globalStep = 0;

  data.segments.forEach((seg, segIdx) => {
    // Skipping also skips the cursor advance, so the focused segment draws
    // from the origin instead of wherever it would have sat in the whole run.
    if (focusSeg !== undefined && segIdx !== focusSeg) return;
    if (seg.kind === "flight") {
      const fl = seg as FlightSegment;
      fl.steps.forEach((st, i) => {
        const yTop = y - RISE;
        outline += ` L ${x} ${yTop} L ${x + RUN} ${yTop}`;
        if (!firstNose) firstNose = [x, yTop];
        lastNose = [x, yTop];
        globalStep += 1;

        // rise value (left of the riser)
        const rv = v(st.rise, p);
        els.push(
          <text key={`r${segIdx}-${i}`} x={x - 5} y={yTop + RISE / 2 + 3} fontSize={9} textAnchor="end" fill={rv.fill}>
            {rv.text}
          </text>
        );
        // run value (above the tread)
        const uv = v(st.run, p);
        els.push(
          <text key={`u${segIdx}-${i}`} x={x + RUN * 0.62} y={yTop - 5} fontSize={9} textAnchor="middle" fill={uv.fill}>
            {uv.text}
          </text>
        );
        // step number under the tread
        els.push(
          <g key={`n${segIdx}-${i}`}>
            <circle cx={x + RUN - 12} cy={y - RISE / 2 + 14} r={7} fill="none" stroke={p.ghost} />
            <text x={x + RUN - 12} y={y - RISE / 2 + 17} fontSize={8} textAnchor="middle" fill={p.dim}>
              {globalStep}
            </text>
          </g>
        );

        // posts on this step (a tread can carry more than one)
        const stepPosts = data.posts.filter(
          (po) => po.segIdx === segIdx && po.stepIdx === i
        );
        if (!wallRail) {
          stepPosts.forEach((po, pi) => {
            postNo += 1;
            const px = x + RUN * 0.26 + pi * 12;
            els.push(<PostGlyph key={`p${po.id}`} x={px} y={yTop} n={postNo} p={p} />);
          });
        }

        // tap target
        if (onTapStep && !wallRail) {
          const cx = x;
          taps.push(
            <rect
              key={`t${segIdx}-${i}`}
              x={cx}
              y={yTop - 66}
              width={RUN}
              height={66 + RISE}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onClick={() => onTapStep(segIdx, i)}
            />
          );
        }

        x += RUN;
        y = yTop;
      });
    } else if (seg.kind === "platform") {
      const pl = seg as PlatformSegment;
      const x0 = x;
      outline += ` L ${x + PLAT} ${y}`;

      const lv = v(pl.length, p);
      els.push(
        <g key={`plat${segIdx}`}>
          <text x={x0 + PLAT / 2} y={y - 26} fontSize={9} textAnchor="middle" fill={lv.fill}>
            ⟵ {lv.text} ⟶
          </text>
          <text x={x0 + PLAT / 2} y={y + 16} fontSize={8} textAnchor="middle" fill={p.dim}>
            {mt(lang, pl.turn === "none" ? "platform" : "landing")}
            {pl.slope && pl.slope.trim() !== "" ? ` · ${mt(lang, "slope")} ${pl.slope}${pl.slopeDir ? ` → ${pl.slopeDir}` : ""}` : ""}
          </text>
          {pl.turn !== "none" && (
            <text x={x0 + PLAT / 2} y={y + 28} fontSize={8} textAnchor="middle" fill={p.dim}>
              {mt(lang, "turn")}: {pl.turn === "u" ? "180°" : pl.turn === "left" ? mt(lang, "turnLeft") : mt(lang, "turnRight")}
            </text>
          )}
        </g>
      );

      // platform posts, ordered by measured position along the platform
      const platPosts = sortPlatPosts(data.posts.filter((po) => po.segIdx === segIdx));
      const platLen = parseMeas(pl.length);
      platPosts.forEach((po, idx) => {
        postNo += 1;
        const posIn = parseMeas(po.pos);
        const frac =
          posIn !== null && platLen && platLen > 0
            ? Math.min(0.95, Math.max(0.05, posIn / platLen))
            : (idx + 1) / (platPosts.length + 1);
        els.push(
          <PostGlyph key={`pp${segIdx}-${po.id}`} x={x0 + frac * PLAT} y={y} n={postNo} p={p} />
        );
      });

      if (onTapPlatform && !wallRail) {
        taps.push(
          <rect
            key={`tp${segIdx}`}
            x={x0}
            y={y - 66}
            width={PLAT}
            height={66}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onClick={() => onTapPlatform(segIdx)}
          />
        );
      }
      x += PLAT;
    } else if (seg.kind === "curve") {
      // side view of a curve: wavy line, rising when it climbs
      const cv = seg as CurveSegment;
      const len = 110;
      const drop = cv.rise.trim() === "" ? 0 : 60;
      const av = v(cv.arc, p);
      outline += ` q ${len / 3} ${-drop / 2 - 8} ${len / 2} ${-drop / 2}`;
      outline += ` q ${len / 6} ${8 - drop / 2} ${len / 2} ${-drop / 2}`;
      els.push(
        <text key={`cv${segIdx}`} x={x + len / 2} y={y - drop / 2 - 16} fontSize={9} textAnchor="middle" fill={av.fill}>
          ⌒ {av.text}
        </text>
      );
      if (onTapPlatform && !wallRail) {
        taps.push(
          <rect key={`tc${segIdx}`} x={x} y={y - drop - 66} width={len} height={66 + drop}
            fill="transparent" style={{ cursor: "pointer" }} onClick={() => onTapPlatform(segIdx)} />
        );
      }
      x += len;
      y -= drop;
    } else if (seg.kind === "ramp") {
      const rp = seg as RampSegment;
      const len = 130;
      const drop = 60;
      const lv = v(rp.length, p);
      outline += ` L ${x + len} ${y - drop}`;
      els.push(
        <text key={`rp${segIdx}`} x={x + len / 2} y={y - drop / 2 - 10} fontSize={9} textAnchor="middle" fill={lv.fill}
          transform={`rotate(${r3((Math.atan2(-drop, len) * 180) / Math.PI)} ${r3(x + len / 2)} ${r3(y - drop / 2 - 10)})`}>
          {lv.text}
        </text>
      );
      if (onTapPlatform && !wallRail) {
        taps.push(
          <rect key={`tr${segIdx}`} x={x} y={y - drop - 66} width={len} height={66 + drop}
            fill="transparent" style={{ cursor: "pointer" }} onClick={() => onTapPlatform(segIdx)} />
        );
      }
      x += len;
      y -= drop;
    }
  });

  // rake line nose-to-nose + angle
  if (firstNose && lastNose && (firstNose as number[])[0] !== (lastNose as number[])[0]) {
    const [x1, y1] = firstNose as [number, number];
    const [x2, y2] = lastNose as [number, number];
    const ext = 24;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const rl = v(data.overall.rakeLength, p);
    const av = v(firstFlightAngle(data), p);
    els.push(
      <g key="rake">
        <line
          x1={x1 - ux * ext}
          y1={y1 - uy * ext}
          x2={x2 + ux * ext}
          y2={y2 + uy * ext}
          stroke={p.dim}
          strokeDasharray="5 4"
          strokeWidth={1}
        />
        <text
          x={(x1 + x2) / 2 - 14}
          y={(y1 + y2) / 2 - 12}
          fontSize={10}
          fontWeight={700}
          textAnchor="middle"
          fill={rl.fill}
          transform={`rotate(${r3((Math.atan2(dy, dx) * 180) / Math.PI)} ${r3((x1 + x2) / 2 - 14)} ${r3((y1 + y2) / 2 - 12)})`}
        >
          {rl.text}
        </text>
        <text x={x1 + 30} y={y1 + 24} fontSize={10} fontWeight={700} fill={av.fill}>
          ∠ {av.text}
        </text>
      </g>
    );
  }

  // wall-rail brackets
  if (wallRail && firstNose && lastNose) {
    const [x1, y1] = firstNose as [number, number];
    const [x2, y2] = lastNose as [number, number];
    for (let i = 1; i <= 3; i++) {
      const fx = x1 + ((x2 - x1) * i) / 4;
      const fy = y1 + ((y2 - y1) * i) / 4;
      els.push(
        <g key={`br${i}`}>
          <line x1={fx} y1={fy - 34} x2={fx} y2={fy - 22} stroke={p.post} strokeWidth={2.5} />
          <circle cx={fx} cy={fy - 36} r={2.5} fill={p.post} />
        </g>
      );
    }
    els.push(
      <line
        key="wallrail"
        x1={x1 - 10}
        y1={y1 - 38}
        x2={x2 + 20}
        y2={y2 - 38 + ((y2 - y1) / Math.max(1, x2 - x1)) * 30}
        stroke={p.post}
        strokeWidth={2.5}
      />
    );
  }

  return (
    <svg viewBox={`0 0 ${w} ${H}`} className="w-full" style={{ maxHeight: 440 }}>
      {/* ground */}
      <line x1={12} y1={baseY} x2={w - 12} y2={baseY} stroke={p.ghost} strokeWidth={1.5} strokeDasharray="7 5" />
      <OrientBanner data={data} lang={lang} p={p} w={w} />
      <path d={outline} fill="none" stroke={p.line} strokeWidth={2.2} strokeLinejoin="round" />
      {els}
      {taps}
    </svg>
  );
}

function firstFlightAngle(data: MeasureData): string {
  for (const s of data.segments) if (s.kind === "flight") return s.angleDeg;
  return "";
}

// midpoint of an arc around a local center (used for curve labels)
function rotHalf(center: { x: number; y: number }, sgn: number, halfTh: number) {
  const dx = 0 - center.x;
  const dy = 0 - center.y;
  const c = Math.cos(sgn * halfTh);
  const sn = Math.sin(sgn * halfTh);
  return { x: center.x + dx * c - dy * sn, y: center.y + dx * sn + dy * c };
}
function rotPt2(
  center: { x: number; y: number },
  sgn: number,
  th: number,
  px: number,
  py: number
) {
  const dx = px - center.x;
  const dy = py - center.y;
  const c = Math.cos(sgn * th);
  const sn = Math.sin(sgn * th);
  return { x: center.x + dx * c - dy * sn, y: center.y + dx * sn + dy * c };
}

function PostGlyph({ x, y, n, p }: { x: number; y: number; n: number; p: Palette }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y - 54} stroke={p.post} strokeWidth={3} />
      <circle cx={x} cy={y - 57} r={3.4} fill={p.post} />
      <text x={x + 6} y={y - 58} fontSize={9} fontWeight={700} fill={p.post}>
        P{n}
      </text>
    </g>
  );
}

// ---- Level run / guardrail -------------------------------------------------

function LevelSketch({
  data,
  p,
  lang,
  onTapPlatform,
  onHoldPlatform,
}: {
  data: MeasureData;
  p: Palette;
  lang: string;
  onTapPlatform?: (segIdx: number) => void;
  onHoldPlatform?: (segIdx: number) => void;
}) {
  const seg = data.segments[0] as PlatformSegment | undefined;
  const W = 340;
  const railY = 60;
  const baseY = 150;
  const posts = sortPlatPosts(data.posts.filter((po) => po.segIdx === 0));
  const runLen = parseMeas(seg?.length || "");
  const lv = v(seg?.length || "", p);

  return (
    <svg viewBox={`0 0 ${W} 190`} className="w-full" style={{ maxHeight: 300 }}>
      <OrientBanner data={data} lang={lang} p={p} />
      <line x1={20} y1={baseY} x2={W - 20} y2={baseY} stroke={p.ghost} strokeWidth={1.5} strokeDasharray="7 5" />
      <line x1={30} y1={railY} x2={W - 30} y2={railY} stroke={p.line} strokeWidth={2.5} />
      {posts.map((po, i) => {
        const posIn = parseMeas(po.pos);
        const frac =
          posIn !== null && runLen && runLen > 0
            ? Math.min(0.97, Math.max(0.03, posIn / runLen))
            : (i + 1) / (posts.length + 1);
        const px = 30 + frac * (W - 60);
        return (
          <g key={po.id}>
            <line x1={px} y1={railY} x2={px} y2={baseY} stroke={p.post} strokeWidth={3} />
            <text x={px + 5} y={railY + 14} fontSize={9} fontWeight={700} fill={p.post}>
              P{i + 1}
            </text>
          </g>
        );
      })}
      {/* length dimension */}
      <line x1={30} y1={baseY + 18} x2={W - 30} y2={baseY + 18} stroke={p.dim} strokeWidth={1} />
      <text x={W / 2} y={baseY + 32} fontSize={10} fontWeight={700} textAnchor="middle" fill={lv.fill}>
        ⟵ {lv.text} ⟶
      </text>
      {seg?.slope && seg.slope.trim() !== "" && (
        <text x={W / 2} y={railY - 12} fontSize={8} textAnchor="middle" fill={p.dim}>
          {mt(lang, "slope")} {seg.slope}
          {seg.slopeDir ? ` → ${seg.slopeDir}` : ""}
        </text>
      )}
      {onTapPlatform && (
        <rect
          x={30}
          y={railY - 20}
          width={W - 60}
          height={baseY - railY + 20}
          fill="transparent"
          {...pressHandlers(() => onTapPlatform(0), () => onHoldPlatform?.(0))}
        />
      )}
    </svg>
  );
}

// ---- Ramp ------------------------------------------------------------------

function RampSketch({
  data,
  p,
  lang,
  onTapPlatform,
}: {
  data: MeasureData;
  p: Palette;
  lang: string;
  onTapPlatform?: (segIdx: number) => void;
}) {
  const seg = data.segments[0] as RampSegment | undefined;
  const posts = data.posts.filter((po) => po.segIdx === 0);
  const x1 = 30, y1 = 170, x2 = 300, y2 = 70;
  const lv = v(seg?.length || "", p);
  const av = v(seg?.angleDeg || "", p);
  const rv = v(seg?.rise || "", p);

  return (
    <svg viewBox="0 0 340 210" className="w-full" style={{ maxHeight: 300 }}>
      <line x1={12} y1={y1} x2={328} y2={y1} stroke={p.ghost} strokeWidth={1.5} strokeDasharray="7 5" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={p.line} strokeWidth={2.5} />
      <line x1={x2} y1={y2} x2={x2} y2={y1} stroke={p.ghost} strokeWidth={1.2} strokeDasharray="4 4" />
      {posts.map((po, i) => {
        const f = (i + 1) / (posts.length + 1);
        const px = x1 + (x2 - x1) * f;
        const py = y1 + (y2 - y1) * f;
        return (
          <g key={po.id}>
            <line x1={px} y1={py} x2={px} y2={py - 44} stroke={p.post} strokeWidth={3} />
            <circle cx={px} cy={py - 47} r={3} fill={p.post} />
            <text x={px + 5} y={py - 48} fontSize={9} fontWeight={700} fill={p.post}>
              P{i + 1}
            </text>
          </g>
        );
      })}
      <text x={(x1 + x2) / 2 - 10} y={(y1 + y2) / 2 - 14} fontSize={10} fontWeight={700} fill={lv.fill}
        transform={`rotate(${r3((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI)} ${r3((x1 + x2) / 2 - 10)} ${r3((y1 + y2) / 2 - 14)})`}>
        {lv.text}
      </text>
      <text x={x1 + 44} y={y1 - 8} fontSize={10} fontWeight={700} fill={av.fill}>
        ∠ {av.text}
      </text>
      <text x={x2 + 6} y={(y1 + y2) / 2} fontSize={9} fill={rv.fill}>
        {mt(lang, "rise")}: {rv.text}
      </text>
      {onTapPlatform && (
        <rect x={x1} y={40} width={x2 - x1} height={y1 - 40} fill="transparent"
          style={{ cursor: "pointer" }} onClick={() => onTapPlatform(0)} />
      )}
    </svg>
  );
}

// ---- Front elevation (stairs / ramp): width, post insets, rail height ------

function FrontSketch({
  data,
  p,
  lang,
}: {
  data: MeasureData;
  p: Palette;
  lang: string;
}) {
  const flight = data.segments.find((s) => s.kind === "flight") as FlightSegment | undefined;
  const rampSeg = data.segments.find((s) => s.kind === "ramp") as RampSegment | undefined;
  const widthVal = v(flight?.width || rampSeg?.width || "", p);
  const hv = v(data.rail.height, p);
  const firstPost = data.posts[0];
  const ev = v(firstPost?.fromEdge || "", p);

  const side = data.rail.side; // Left | Right | Both | ""
  // A wall beats a rail: where the stair runs against the house there is no
  // railing to draw, and drawing one there showed the crew a rail that will
  // never be fabricated. `datums.orientation` already records this looking UP
  // the stairs — it is what the ▦ markers below the stair read from — so the
  // rail drawing reads the same field rather than a second one that could
  // disagree with it.
  const orient = data.datums?.orientation || "";
  const wallLeft = orient === "left_wall" || orient === "both_wall";
  const wallRight = orient === "right_wall" || orient === "both_wall";
  const showLeft = !wallLeft && (side === "Left" || side === "Both" || side === "");
  const showRight = !wallRight && (side === "Right" || side === "Both" || side === "");
  const dimmed = side === ""; // no side chosen yet — show both faded

  const visibleSteps = Math.max(1, Math.min(flight?.steps.length || 1, 14));
  const stepGap = Math.max(5, Math.min(10, 90 / visibleSteps));
  const x0 = 52, x1 = 288, treadY = 176;
  const upperTreadY = treadY - (visibleSteps - 1) * stepGap;
  const railTop = Math.max(24, upperTreadY - 62);
  const inset = 26;
  const railColor = dimmed ? p.ghost : p.post;
  // Each tread up is drawn a little narrower, so the flight recedes instead of
  // stacking. Capped so a long flight does not taper away to a point.
  const taper = Math.min(46, 5.5 * visibleSteps);
  const shrinkAt = (i: number) => (visibleSteps <= 1 ? 0 : (i / (visibleSteps - 1)) * taper);
  const lx = (i: number) => x0 + shrinkAt(i);
  const rx = (i: number) => x1 - shrinkAt(i);
  const topI = visibleSteps - 1;

  return (
    <svg viewBox="0 0 340 235" className="w-full" style={{ maxHeight: 320 }}>
      {/* Looking upward from the bottom: every tread edge remains visible. */}
      <line x1={16} y1={210} x2={324} y2={210} stroke={p.ghost} strokeWidth={1.5} strokeDasharray="7 5" />
      {Array.from({ length: visibleSteps }, (_, i) => {
        const y = treadY - i * stepGap;
        return (
          <g key={i}>
            <line x1={lx(i)} y1={y} x2={rx(i)} y2={y} stroke={p.line} strokeWidth={i === 0 ? 2.8 : 1.7} />
            {/* the riser faces, angled inward, are what sell the depth */}
            <line x1={lx(i)} y1={y} x2={lx(Math.max(0, i - 1))} y2={y + stepGap} stroke={p.line} strokeWidth={1.4} />
            <line x1={rx(i)} y1={y} x2={rx(Math.max(0, i - 1))} y2={y + stepGap} stroke={p.line} strokeWidth={1.4} />
            <text x={lx(i) + 8} y={y - 2} fontSize={6.5} fill={p.dim}>{i + 1}</text>
          </g>
        );
      })}

      {/* stair width dimension */}
      <line x1={x0} y1={treadY + 14} x2={x1} y2={treadY + 14} stroke={p.dim} strokeWidth={1} />
      <text x={(x0 + x1) / 2} y={treadY + 27} fontSize={10} fontWeight={700} textAnchor="middle" fill={widthVal.fill}>
        ⟵ {mt(lang, "width")}: {widthVal.text} ⟶
      </text>

      {/* A wall is drawn as a wall: a thick solid band against the stair, so
          nobody mistakes the side against the house for a rail run. */}
      {wallLeft && (
        <g>
          <line x1={lx(0) - 6} y1={treadY + stepGap} x2={lx(topI) - 6} y2={railTop} stroke={p.dim} strokeWidth={7} strokeLinecap="square" opacity={0.55} />
          <text x={x0 - 11} y={(treadY + railTop) / 2} fontSize={8} fontWeight={700} fill={p.dim}
            textAnchor="middle" transform={`rotate(-90 ${x0 - 11} ${(treadY + railTop) / 2})`}>
            {mt(lang, "wallLabel")}
          </text>
        </g>
      )}
      {wallRight && (
        <g>
          <line x1={rx(0) + 6} y1={treadY + stepGap} x2={rx(topI) + 6} y2={railTop} stroke={p.dim} strokeWidth={7} strokeLinecap="square" opacity={0.55} />
          <text x={x1 + 11} y={(treadY + railTop) / 2} fontSize={8} fontWeight={700} fill={p.dim}
            textAnchor="middle" transform={`rotate(90 ${x1 + 11} ${(treadY + railTop) / 2})`}>
            {mt(lang, "wallLabel")}
          </text>
        </g>
      )}

      {/* posts + rail per side */}
      {showLeft && (
        <g>
          <line x1={lx(0) + inset} y1={treadY} x2={lx(topI) + inset} y2={railTop} stroke={railColor} strokeWidth={3.5} />
          <circle cx={x0 + inset} cy={railTop - 4} r={4.5} fill="none" stroke={railColor} strokeWidth={2.5} />
          <line x1={x0} y1={treadY - 8} x2={x0 + inset} y2={treadY - 8} stroke={p.dim} strokeWidth={1} />
          <text x={x0 + inset / 2} y={treadY - 13} fontSize={8.5} textAnchor="middle" fill={ev.fill}>
            {ev.text}
          </text>
        </g>
      )}
      {showRight && (
        <g>
          <line x1={rx(0) - inset} y1={treadY} x2={rx(topI) - inset} y2={railTop} stroke={railColor} strokeWidth={3.5} />
          <circle cx={x1 - inset} cy={railTop - 4} r={4.5} fill="none" stroke={railColor} strokeWidth={2.5} />
          <line x1={rx(0) - inset} y1={treadY - 8} x2={rx(0)} y2={treadY - 8} stroke={p.dim} strokeWidth={1} />
          <text x={x1 - inset / 2} y={treadY - 13} fontSize={8.5} textAnchor="middle" fill={ev.fill}>
            {ev.text}
          </text>
        </g>
      )}

      {/* rail height dimension */}
      <line x1={x1 + 18} y1={treadY} x2={x1 + 18} y2={railTop - 8} stroke={p.dim} strokeWidth={1} />
      <text x={x1 + 24} y={(treadY + railTop) / 2} fontSize={9} fontWeight={700} fill={hv.fill}
        transform={`rotate(90 ${r3(x1 + 24)} ${r3((treadY + railTop) / 2)})`} textAnchor="middle">
        {hv.text}
      </text>
      <text x={x1 + 4} y={railTop - 16} fontSize={8} fill={p.dim} textAnchor="end">
        {mt(lang, "railHeight")}
      </text>

      {/* edge-of-stair markers, looking up (wall/open from datums) */}
      <text x={x0} y={220} fontSize={8.5} textAnchor="middle" fill={p.dim}>
        {optLabel(lang, "Left")}
        {data.datums?.orientation === "left_wall" || data.datums?.orientation === "both_wall"
          ? " ▦"
          : data.datums?.orientation
            ? " ○"
            : ""}
      </text>
      <text x={x1} y={220} fontSize={8.5} textAnchor="middle" fill={p.dim}>
        {optLabel(lang, "Right")}
        {data.datums?.orientation === "right_wall" || data.datums?.orientation === "both_wall"
          ? " ▦"
          : data.datums?.orientation
            ? " ○"
            : ""}
      </text>
      <OrientBanner data={data} lang={lang} p={p} />
      <text x={(x0 + x1) / 2} y={64} fontSize={8.5} textAnchor="middle" fill={p.dim}>
        {mt(lang, "frontView")} — {mt(lang, "fromEdge")}
      </text>
    </svg>
  );
}

// ---- Level run section: post + rail height ---------------------------------

function LevelSectionSketch({
  data,
  p,
  lang,
}: {
  data: MeasureData;
  p: Palette;
  lang: string;
}) {
  const hv = v(data.rail.height, p);
  const firstPost = data.posts[0];
  const mount = firstPost?.mount || "";
  const cx = 170, groundY = 195, railTop = 66;

  return (
    <svg viewBox="0 0 340 235" className="w-full" style={{ maxHeight: 320 }}>
      <line x1={30} y1={groundY} x2={310} y2={groundY} stroke={p.line} strokeWidth={2.2} />
      <line x1={cx} y1={groundY} x2={cx} y2={railTop} stroke={p.post} strokeWidth={4} />
      <circle cx={cx} cy={railTop - 6} r={6} fill="none" stroke={p.post} strokeWidth={2.5} />
      {/* base */}
      <rect x={cx - 14} y={groundY - 4} width={28} height={4} fill={p.post} />
      {/* height dim */}
      <line x1={cx + 44} y1={groundY} x2={cx + 44} y2={railTop - 12} stroke={p.dim} strokeWidth={1} />
      <text x={cx + 52} y={(groundY + railTop) / 2} fontSize={10} fontWeight={700} fill={hv.fill}
        transform={`rotate(90 ${r3(cx + 52)} ${r3((groundY + railTop) / 2)})`} textAnchor="middle">
        {hv.text}
      </text>
      <text x={cx + 44} y={railTop - 20} fontSize={8} fill={p.dim} textAnchor="middle">
        {mt(lang, "railHeight")}
      </text>
      <text x={cx} y={groundY + 18} fontSize={8.5} textAnchor="middle" fill={mount ? p.val : p.miss}>
        {mt(lang, "mountType")}: {mount ? optLabel(lang, mount) : "—"}
      </text>
      <text x={cx} y={40} fontSize={8.5} textAnchor="middle" fill={p.dim}>
        {mt(lang, "sectionView")}
      </text>
    </svg>
  );
}

// ---- Spiral side elevation: floor-to-floor + column ------------------------

function SpiralSideSketch({
  spiral,
  p,
  lang,
}: {
  spiral: SpiralData | null;
  p: Palette;
  lang: string;
}) {
  const fv = v(spiral?.floorToFloor || "", p);
  const cv = v(spiral?.columnSize || "", p);
  const topY = 58, botY = 200, cx = 150;
  const treads = Math.min(12, Math.max(4, parseInt(spiral?.treads || "8", 10) || 8));
  const lines = Array.from({ length: treads }, (_, i) => {
    const y = botY - ((i + 1) * (botY - topY - 14)) / (treads + 1);
    const leftSide = i % 2 === 0;
    return (
      <line
        key={i}
        x1={leftSide ? cx - 58 : cx + 6}
        y1={y}
        x2={leftSide ? cx - 6 : cx + 58}
        y2={y}
        stroke={p.ghost}
        strokeWidth={2}
      />
    );
  });

  return (
    <svg viewBox="0 0 340 235" className="w-full" style={{ maxHeight: 320 }}>
      {/* floors */}
      <line x1={30} y1={botY} x2={310} y2={botY} stroke={p.line} strokeWidth={2.2} />
      <line x1={170} y1={topY} x2={318} y2={topY} stroke={p.line} strokeWidth={2.2} />
      {/* center column */}
      <rect x={cx - 5} y={topY} width={10} height={botY - topY} fill="none" stroke={p.post} strokeWidth={2.2} />
      {lines}
      {/* floor-to-floor dim */}
      <line x1={300} y1={botY} x2={300} y2={topY} stroke={p.dim} strokeWidth={1} />
      <text x={310} y={(botY + topY) / 2} fontSize={10} fontWeight={700} fill={fv.fill}
        transform={`rotate(90 ${310} ${r3((botY + topY) / 2)})`} textAnchor="middle">
        {fv.text}
      </text>
      <text x={296} y={topY - 8} fontSize={8} fill={p.dim} textAnchor="end">
        {mt(lang, "floorToFloor")}
      </text>
      <text x={cx} y={botY + 18} fontSize={8.5} textAnchor="middle" fill={cv.fill}>
        {mt(lang, "columnSize")}: {cv.text}
      </text>
      <text x={cx} y={40} fontSize={8.5} textAnchor="middle" fill={p.dim}>
        {mt(lang, "sideView")}
      </text>
    </svg>
  );
}

// ---- Spiral (plan view) ----------------------------------------------------

function SpiralSketch({
  spiral,
  p,
  lang,
}: {
  spiral: SpiralData | null;
  p: Palette;
  lang: string;
}) {
  const treads = Math.min(24, Math.max(4, parseInt(spiral?.treads || "12", 10) || 12));
  const cx = 130, cy = 115, r = 88;
  const dv = v(spiral?.diameter || "", p);
  const cv = v(spiral?.columnSize || "", p);
  const rv = v(spiral?.rotationDeg || "", p);
  const spokes = Array.from({ length: treads }, (_, i) => {
    const a = (i / treads) * Math.PI * 2 - Math.PI / 2;
    return (
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={cx + Math.cos(a) * r}
        y2={cy + Math.sin(a) * r}
        stroke={p.ghost}
        strokeWidth={1.2}
      />
    );
  });
  const arrow = spiral?.direction === "cw" ? "⟳" : "⟲";

  return (
    <svg viewBox="0 0 340 240" className="w-full" style={{ maxHeight: 320 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={p.line} strokeWidth={2.2} />
      {spokes}
      <circle cx={cx} cy={cy} r={9} fill="none" stroke={p.post} strokeWidth={2.5} />
      <text x={cx} y={cy - r - 10} fontSize={11} textAnchor="middle" fill={p.dim}>
        {arrow} {mt(lang, spiral?.direction === "cw" ? "cw" : "ccw")}
      </text>
      <line x1={cx - r} y1={cy + r + 16} x2={cx + r} y2={cy + r + 16} stroke={p.dim} strokeWidth={1} />
      <text x={cx} y={cy + r + 30} fontSize={10} fontWeight={700} textAnchor="middle" fill={dv.fill}>
        Ø {dv.text}
      </text>
      <text x={250} y={70} fontSize={9} fill={cv.fill}>
        {mt(lang, "columnSize")}: {cv.text}
      </text>
      <text x={250} y={88} fontSize={9} fill={rv.fill}>
        {mt(lang, "rotation")}: {rv.text}
      </text>
      <text x={250} y={106} fontSize={9} fill={p.dim}>
        {mt(lang, "treadsCount")}: {treads}
      </text>
    </svg>
  );
}

// ---- Window / egress well --------------------------------------------------

// Plan: the well box against the house, with the gate opening and the ladder
// marked where they were measured.
function WellPlanSketch({ well, p, lang }: { well: WellData | null; p: Palette; lang: string }) {
  const W = 340;
  const H = 258;
  const houseY = 34; // face of the house wall
  const wellL = 40;
  const wellR = W - 40;
  const wellB = 186;
  const th = 11; // drawn wall thickness

  const has = (k: keyof WellData) => {
    const val = well?.[k];
    return typeof val === "string" && val.trim() !== "";
  };
  const d = (k: keyof WellData) => v(typeof well?.[k] === "string" ? (well[k] as string) : "", p);
  const wants = (k: string) => !!well?.deliverables.includes(k as never);

  const gateW = 74;
  const gateX = (wellL + wellR) / 2 - gateW / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 320 }}>
      {/* house wall, hatched */}
      <defs>
        <pattern id="wellHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={p.ghost} strokeWidth="2.5" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={W} height={houseY} fill="url(#wellHatch)" stroke={p.line} strokeWidth={1} />
      <text x={8} y={houseY - 9} fontSize={8.5} fontWeight={700} fill={p.dim}>
        {mt(lang, "houseWall").toUpperCase()}
      </text>

      {/* well walls — three sides, open against the house */}
      <path
        d={`M ${wellL} ${houseY} L ${wellL} ${wellB} L ${wellR} ${wellB} L ${wellR} ${houseY}`}
        fill="none"
        stroke={p.line}
        strokeWidth={2.5}
      />
      <path
        d={`M ${wellL + th} ${houseY} L ${wellL + th} ${wellB - th} L ${wellR - th} ${wellB - th} L ${wellR - th} ${houseY}`}
        fill="none"
        stroke={p.line}
        strokeWidth={1.4}
      />

      {/* the basement window, in the foundation */}
      <rect x={wellL + 34} y={houseY - 4} width={wellR - wellL - 68} height={8} fill={p.ghost} stroke={p.line} strokeWidth={1.4} />
      <text x={(wellL + wellR) / 2} y={houseY + 20} fontSize={8} textAnchor="middle" fill={p.dim}>
        {mt(lang, "wellWindow")} {d("windowW").text}
      </text>

      {/* ladder, drawn against the house below the window */}
      {wants("ladder") && (
        <g>
          {[0, 1, 2].map((i) => (
            <line key={i} x1={wellL + 46} y1={houseY + 34 + i * 13} x2={wellL + 46 + 44} y2={houseY + 34 + i * 13} stroke={p.post} strokeWidth={2} />
          ))}
          <line x1={wellL + 46} y1={houseY + 30} x2={wellL + 46} y2={houseY + 34 + 2 * 13 + 4} stroke={p.post} strokeWidth={1.6} />
          <line x1={wellL + 90} y1={houseY + 30} x2={wellL + 90} y2={houseY + 34 + 2 * 13 + 4} stroke={p.post} strokeWidth={1.6} />
          <text x={wellL + 68} y={houseY + 34 + 3 * 13 + 6} fontSize={8} textAnchor="middle" fill={p.post}>
            {mt(lang, "wellLadder")}
          </text>
        </g>
      )}

      {/* grate hatching over the opening */}
      {wants("grate") && !wants("guard") && (
        <g>
          {Array.from({ length: 7 }, (_, i) => (
            <line key={i} x1={wellL + th + 6 + i * ((wellR - wellL - 2 * th - 12) / 6)} y1={houseY + 4}
              x2={wellL + th + 6 + i * ((wellR - wellL - 2 * th - 12) / 6)} y2={wellB - th - 4}
              stroke={p.ghost} strokeWidth={1.6} />
          ))}
          <text x={wellR - th - 6} y={wellB - th - 10} fontSize={8} textAnchor="end" fill={p.dim}>
            {mt(lang, "wellGrate")}
          </text>
        </g>
      )}

      {/* guard line along the top of the wall, with the gate opening */}
      {wants("guard") && (
        <g>
          <line x1={wellL} y1={wellB} x2={wants("gate") ? gateX : wellR} y2={wellB} stroke={p.post} strokeWidth={3.5} />
          {wants("gate") && <line x1={gateX + gateW} y1={wellB} x2={wellR} y2={wellB} stroke={p.post} strokeWidth={3.5} />}
          <line x1={wellL} y1={houseY} x2={wellL} y2={wellB} stroke={p.post} strokeWidth={3.5} />
          <line x1={wellR} y1={houseY} x2={wellR} y2={wellB} stroke={p.post} strokeWidth={3.5} />
          {/* end posts where the guard meets the house — the 4" problem */}
          <circle cx={wellL} cy={houseY + 3} r={4.5} fill={p.post} />
          <circle cx={wellR} cy={houseY + 3} r={4.5} fill={p.post} />
          {wants("gate") && (
            <g>
              <path d={`M ${gateX} ${wellB} A ${gateW} ${gateW} 0 0 1 ${gateX} ${wellB - gateW}`}
                fill="none" stroke={p.ghost} strokeWidth={1.2} strokeDasharray="4 3" />
              <text x={gateX + gateW / 2} y={wellB + 16} fontSize={8.5} textAnchor="middle" fill={p.post}>
                {mt(lang, "wellGate")} {d("gateWidth").text}
              </text>
            </g>
          )}
        </g>
      )}

      {/* dimensions */}
      <line x1={wellL} y1={wellB + 40} x2={wellR} y2={wellB + 40} stroke={p.dim} strokeWidth={1} />
      <text x={(wellL + wellR) / 2} y={wellB + 52} fontSize={9} textAnchor="middle" fill={d("lengthAtHouse").fill}>
        {d("lengthAtHouse").text}
      </text>
      <line x1={wellR + 16} y1={houseY} x2={wellR + 16} y2={wellB} stroke={p.dim} strokeWidth={1} />
      <text x={wellR + 20} y={(houseY + wellB) / 2} fontSize={9} fill={d("projection").fill}>
        {d("projection").text}
      </text>
      {(has("insideLength") || has("insideProjection")) && (
        <text x={wellL + th + 6} y={wellB - th - 10} fontSize={8} fill={p.dim}>
          {mt(lang, "wellInside")} {d("insideLength").text} × {d("insideProjection").text}
        </text>
      )}
    </svg>
  );
}

// Section: the house wall in profile with every measured band, the well below
// and the guard post standing off. This is the drawing that shows why a post
// set off the trim can still fail at the siding behind it.
function WellSectionSketch({ well, p, lang }: { well: WellData | null; p: Palette; lang: string }) {
  const W = 340;
  const H = 268;
  const proudX = 150; // the most-proud wall face (the datum)
  const topY = 96; // top of the well wall
  const floorY = 214;
  const wellOutX = 300;

  const d = (k: keyof WellData) => v(typeof well?.[k] === "string" ? (well[k] as string) : "", p);
  const wants = (k: string) => !!well?.deliverables.includes(k as never);
  const cl = wellClearance(well);

  // Bands drawn as steps back from the proud face; 1" ≈ 9px, capped so a big
  // number cannot run off the drawing.
  const SCALE = 9;
  const bands = (well?.bands || []).map((b) => ({
    label: b.label,
    back: Math.min(40, Math.max(0, parseMeas(b.setback) ?? 0)) * SCALE,
  }));

  const postX = cl?.actual !== null && cl?.actual !== undefined ? proudX - Math.min(60, cl.actual * SCALE) : proudX - 34;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 330 }}>
      <defs>
        <pattern id="wellHatch2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={p.ghost} strokeWidth="2.5" />
        </pattern>
      </defs>

      {/* the house, to the left; wall face steps out at the proud band */}
      <rect x={0} y={0} width={proudX} height={H} fill="url(#wellHatch2)" />
      <text x={8} y={16} fontSize={8.5} fontWeight={700} fill={p.dim}>
        {mt(lang, "houseWall").toUpperCase()}
      </text>

      {/* each measured band, stepped back from the proud face */}
      {bands.length === 0 ? (
        <line x1={proudX} y1={0} x2={proudX} y2={topY} stroke={p.line} strokeWidth={2} />
      ) : (
        bands.map((b, i) => {
          // Start below the HOUSE WALL caption so labels never sit under it.
          const BAND_TOP = 26;
          const bandH = (topY - BAND_TOP) / bands.length;
          const y0 = BAND_TOP + i * bandH;
          const x = proudX - b.back;
          return (
            <g key={i}>
              {i === 0 && <line x1={proudX} y1={0} x2={proudX} y2={y0} stroke={p.line} strokeWidth={2} />}
              <rect x={x} y={y0} width={proudX - x} height={bandH} fill="#00000022" />
              <line x1={x} y1={y0} x2={x} y2={y0 + bandH} stroke={p.line} strokeWidth={2} />
              <line x1={x} y1={y0 + bandH} x2={proudX} y2={y0 + bandH} stroke={p.line} strokeWidth={1} />
              <text x={6} y={y0 + bandH / 2 + 3} fontSize={7.5} fill={p.dim}>
                {b.label || `#${i + 1}`}
              </text>
            </g>
          );
        })
      )}
      {/* the well: top of wall, far wall, floor */}
      <line x1={proudX} y1={topY} x2={wellOutX} y2={topY} stroke={p.line} strokeWidth={2.5} />
      <line x1={wellOutX} y1={topY} x2={wellOutX} y2={floorY} stroke={p.line} strokeWidth={2.5} />
      <line x1={proudX} y1={floorY} x2={wellOutX} y2={floorY} stroke={p.line} strokeWidth={2.5} />

      {/* window in the foundation */}
      <rect x={proudX} y={topY + 18} width={7} height={62} fill={p.ghost} stroke={p.line} strokeWidth={1.2} />
      <text x={proudX + 12} y={topY + 34} fontSize={8} fill={d("windowH").fill}>
        {mt(lang, "wellWindow")} {d("windowH").text}
      </text>

      {/* ladder rungs against the house */}
      {wants("ladder") && (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={proudX + 10} y1={topY + 26 + i * 26} x2={proudX + 34} y2={topY + 26 + i * 26} stroke={p.post} strokeWidth={2.5} />
          ))}
          <text x={proudX + 40} y={floorY - 8} fontSize={8} fill={p.post}>
            {mt(lang, "wellRungSpacing")} {d("ladderSpacing").text}
          </text>
        </g>
      )}

      {/* depth */}
      <line x1={wellOutX + 14} y1={topY} x2={wellOutX + 14} y2={floorY} stroke={p.dim} strokeWidth={1} />
      <text x={wellOutX + 18} y={(topY + floorY) / 2} fontSize={9} fill={d("depth").fill}>
        {d("depth").text}
      </text>

      {/* guard: the end post standing off the proud face */}
      {wants("guard") && (
        <g>
          <line x1={postX} y1={topY} x2={postX} y2={topY - 72} stroke={p.post} strokeWidth={4} />
          <text x={postX + 8} y={topY - 74} fontSize={8.5} fill={p.post}>
            {mt(lang, "wellPost")}
          </text>
          {/* measured gap, off the proud face */}
          <line x1={postX} y1={topY - 30} x2={proudX} y2={topY - 30} stroke={p.dim} strokeWidth={1} />
          <text x={postX + 6} y={topY - 34} fontSize={8} fill={d("postToWall").fill}>
            {d("postToWall").text}
          </text>
          {/* the gap that actually governs, back at the deepest band */}
          {cl && cl.worst !== null && (
            <line x1={postX} y1={topY - 14} x2={proudX - Math.min(40, cl.maxSetback * SCALE)} y2={topY - 14}
              stroke={cl.worst > cl.sphere ? "#dc2626" : "#16a34a"} strokeWidth={2.5} />
          )}
        </g>
      )}

      {/* guard height */}
      {wants("guard") && (
        <text x={postX + 8} y={topY - 56} fontSize={8} fill={d("guardHeight").fill}>
          {d("guardHeight").text}
        </text>
      )}

      {/* The verdict gets its own line at the foot of the drawing, where it
          cannot collide with the wall bands. */}
      {wants("guard") && cl && cl.worst !== null && (
        <text x={4} y={H - 5} fontSize={9} fontWeight={700}
          fill={cl.worst > cl.sphere ? "#dc2626" : "#16a34a"}>
          {cl.worst > cl.sphere ? "\u2717" : "\u2713"} {formatIn(cl.worst)} {mt(lang, "wellAt")}{" "}
          {cl.deepest || "—"} ({mt(lang, "wellMaxWord")} {formatIn(cl.sphere)})
        </text>
      )}
    </svg>
  );
}

// ---- Fire escape -----------------------------------------------------------

const RATING_FILL: Record<string, string> = {
  pass: "#16a34a",
  monitor: "#d97706",
  fail: "#dc2626",
};

// Elevation: the building wall on the left, a balcony per floor stepping out
// from it, stairs zig-zagging between them and the drop ladder at the bottom.
function FireElevationSketch({ fire, p, lang }: { fire: FireEscapeData | null; p: Palette; lang: string }) {
  const levels = fire?.levels || [];
  const n = Math.max(1, levels.length);
  const LEVEL_H = 92;
  const wallX = 46;
  const platW = 150;
  // Room above the top deck for its label and guard, which are drawn upward.
  const topPad = 48;
  const H = topPad + n * LEVEL_H + 96;
  const W = 340;
  const gradeY = topPad + n * LEVEL_H + 62;
  const survey = fire?.purpose === "inspect" || fire?.purpose === "repair";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 520 }}>
      <defs>
        <pattern id="feHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={p.ghost} strokeWidth="2.5" />
        </pattern>
      </defs>

      {/* building */}
      <rect x={0} y={0} width={wallX} height={gradeY} fill="url(#feHatch)" />
      <line x1={wallX} y1={0} x2={wallX} y2={gradeY} stroke={p.line} strokeWidth={2.5} />

      {/* grade */}
      <line x1={0} y1={gradeY} x2={W} y2={gradeY} stroke={p.line} strokeWidth={2} />
      <text x={W - 4} y={gradeY + 13} fontSize={8} textAnchor="end" fill={p.dim}>
        {mt(lang, "feGrade").toUpperCase()}
      </text>

      {levels.map((l, i) => {
        const deckY = topPad + i * LEVEL_H;
        const lowest = i === levels.length - 1;
        const gv = v(l.guardHeight, p);
        const rating = l.condition.rating;
        const stroke = survey && rating ? RATING_FILL[rating] || p.line : p.line;

        return (
          <g key={l.id}>
            {/* the opening it serves */}
            <rect x={wallX - 13} y={deckY - 30} width={13} height={28} fill={p.ghost} stroke={p.line} strokeWidth={1.2} />
            {/* balcony deck */}
            <line x1={wallX} y1={deckY} x2={wallX + platW} y2={deckY} stroke={stroke} strokeWidth={3.5} />
            {/* guard */}
            <line x1={wallX + platW} y1={deckY} x2={wallX + platW} y2={deckY - 30} stroke={stroke} strokeWidth={2.5} />
            <line x1={wallX} y1={deckY - 30} x2={wallX + platW} y2={deckY - 30} stroke={stroke} strokeWidth={2} />
            {[0.25, 0.5, 0.75].map((f2) => (
              <line key={f2} x1={wallX + platW * f2} y1={deckY} x2={wallX + platW * f2} y2={deckY - 30}
                stroke={p.ghost} strokeWidth={1} />
            ))}
            {/* anchors into the wall */}
            <circle cx={wallX + 4} cy={deckY - 4} r={2.6} fill={p.post} />
            <circle cx={wallX + 4} cy={deckY - 24} r={2.6} fill={p.post} />

            {/* level label + guard height */}
            <text x={wallX + 6} y={deckY - 36} fontSize={9} fontWeight={700} fill={survey && rating ? stroke : p.val}>
              {l.label || `#${i + 1}`}
            </text>
            <text x={wallX + platW + 5} y={deckY - 14} fontSize={8} fill={gv.fill}>
              {gv.text}
            </text>

            {/* stair down to the level below */}
            {!lowest && (
              <g>
                <line x1={wallX + platW} y1={deckY} x2={wallX + 34} y2={deckY + LEVEL_H} stroke={stroke} strokeWidth={2.5} />
                <line x1={wallX + platW} y1={deckY - 30} x2={wallX + 34} y2={deckY + LEVEL_H - 30} stroke={p.ghost} strokeWidth={1.4} />
                <text x={wallX + platW / 2 + 22} y={deckY + LEVEL_H / 2 + 4} fontSize={8} fill={v(l.stairRisers, p).fill}>
                  {v(l.stairRisers, p).text} × {v(l.stairRise, p).text}
                </text>
              </g>
            )}

            {/* floor to floor */}
            {!lowest && (
              <g>
                <line x1={W - 16} y1={deckY} x2={W - 16} y2={deckY + LEVEL_H} stroke={p.dim} strokeWidth={1} />
                <text x={W - 13} y={deckY + LEVEL_H / 2} fontSize={8} fill={v(l.floorToFloor, p).fill}>
                  {v(l.floorToFloor, p).text}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* drop ladder from the lowest balcony */}
      {fire?.ladder.present && (() => {
        const lastY = topPad + (levels.length - 1) * LEVEL_H;
        const lx = wallX + platW - 26;
        const stow = v(fire.ladder.stowedAboveGrade, p);
        return (
          <g>
            <line x1={lx} y1={lastY} x2={lx} y2={gradeY - 22} stroke={p.post} strokeWidth={2} />
            <line x1={lx + 20} y1={lastY} x2={lx + 20} y2={gradeY - 22} stroke={p.post} strokeWidth={2} />
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1={lx} y1={lastY + 16 + i * 14} x2={lx + 20} y2={lastY + 16 + i * 14}
                stroke={p.post} strokeWidth={2} />
            ))}
            <text x={lx + 26} y={gradeY - 26} fontSize={8} fill={stow.fill}>
              {mt(lang, "feStowed")} {stow.text}
            </text>
            {fire.ladder.operates === "seized" && (
              <text x={lx + 26} y={gradeY - 14} fontSize={8.5} fontWeight={700} fill="#dc2626">
                {mt(lang, "feSeized")}
              </text>
            )}
          </g>
        );
      })()}

      {/* total height */}
      <line x1={12} y1={topPad} x2={12} y2={gradeY} stroke={p.dim} strokeWidth={1} />
      <text x={16} y={(topPad + gradeY) / 2} fontSize={9} fill={v(fire?.totalHeight, p).fill}>
        {v(fire?.totalHeight, p).text}
      </text>
    </svg>
  );
}

// Plan: one balcony seen from above — its footprint off the wall and the
// opening it serves.
function FirePlanSketch({ fire, p, lang }: { fire: FireEscapeData | null; p: Palette; lang: string }) {
  const W = 340;
  const H = 220;
  const wallY = 40;
  const l0 = fire?.levels[0];
  const left = 60;
  const right = W - 60;
  const bottom = 170;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 300 }}>
      <defs>
        <pattern id="fePlanHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={p.ghost} strokeWidth="2.5" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={W} height={wallY} fill="url(#fePlanHatch)" stroke={p.line} strokeWidth={1} />
      <text x={8} y={wallY - 9} fontSize={8.5} fontWeight={700} fill={p.dim}>
        {mt(lang, "feBuildingWall").toUpperCase()}
      </text>

      {/* the opening served */}
      <rect x={(left + right) / 2 - 30} y={wallY - 5} width={60} height={10} fill={p.ghost} stroke={p.line} strokeWidth={1.4} />
      <text x={(left + right) / 2} y={wallY + 22} fontSize={8} textAnchor="middle" fill={p.dim}>
        {l0?.openingType === "door" ? mt(lang, "feDoor") : mt(lang, "feWindow")} {v(l0?.openingW, p).text}
      </text>

      {/* balcony footprint */}
      <path d={`M ${left} ${wallY} L ${left} ${bottom} L ${right} ${bottom} L ${right} ${wallY}`}
        fill="none" stroke={p.post} strokeWidth={3} />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={left + 4 + i * ((right - left - 8) / 8)} y1={wallY + 4}
          x2={left + 4 + i * ((right - left - 8) / 8)} y2={bottom - 3} stroke={p.ghost} strokeWidth={1} />
      ))}

      {/* dimensions */}
      <line x1={left} y1={bottom + 20} x2={right} y2={bottom + 20} stroke={p.dim} strokeWidth={1} />
      <text x={(left + right) / 2} y={bottom + 34} fontSize={9} textAnchor="middle" fill={v(l0?.platLength, p).fill}>
        {v(l0?.platLength, p).text}
      </text>
      <line x1={right + 16} y1={wallY} x2={right + 16} y2={bottom} stroke={p.dim} strokeWidth={1} />
      <text x={right + 20} y={(wallY + bottom) / 2} fontSize={9} fill={v(l0?.platWidth, p).fill}>
        {v(l0?.platWidth, p).text}
      </text>
      <text x={left} y={bottom + 48} fontSize={8} fill={p.dim}>
        {l0?.label ? `${l0.label} — ` : ""}{mt(lang, "feDeck")}: {v(l0?.deck, p).text}
      </text>
    </svg>
  );
}

// ---- Gate ------------------------------------------------------------------

// Elevation looking at the opening: both posts, the leaf (or leaves), the
// clearance under it and the grade it has to swing over.
function GateSketch({ gate, p, lang }: { gate: GateData | null; p: Palette; lang: string }) {
  const W = 340;
  const H = 250;
  const leftX = 52;
  const rightX = 288;
  const topY = 44;
  const gradeY = 186;
  const clearY = gradeY - 16;

  const d = (k: keyof GateData) => v(typeof gate?.[k] === "string" ? (gate[k] as string) : "", p);
  const dbl = gate?.operation === "double_swing" || gate?.operation === "bifold";
  const slide = gate?.operation === "slide";
  const rise = parseMeas(gate?.gradeRise || "");
  const clear = parseMeas(gate?.groundClearance || "");
  const binds = rise !== null && clear !== null && rise > 0 && clear <= rise;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 340 }}>
      {/* grade — drawn sloping when a rise was recorded */}
      <line x1={0} y1={gradeY} x2={W} y2={rise !== null && rise > 0 ? gradeY - 14 : gradeY}
        stroke={p.line} strokeWidth={2} />
      <text x={4} y={gradeY + 14} fontSize={8} fill={p.dim}>
        {mt(lang, "gateGrade").toUpperCase()}
      </text>

      {/* posts */}
      <rect x={leftX - 9} y={topY} width={9} height={gradeY - topY} fill={p.ghost} stroke={p.line} strokeWidth={1.6} />
      <rect x={rightX} y={topY} width={9} height={gradeY - topY - 14} fill={p.ghost} stroke={p.line} strokeWidth={1.6} />

      {/* leaf / leaves */}
      {slide ? (
        <g>
          <rect x={leftX} y={topY} width={rightX - leftX} height={clearY - topY} fill="none" stroke={p.post} strokeWidth={2.5} />
          <path d={`M ${leftX} ${topY - 10} L ${leftX - 40} ${topY - 10}`} stroke={p.ghost} strokeWidth={1.4} strokeDasharray="5 3" />
          <text x={leftX - 42} y={topY - 14} fontSize={8} textAnchor="end" fill={p.dim}>
            {mt(lang, "gateSlideBack")}
          </text>
        </g>
      ) : (
        <g>
          <rect x={leftX} y={topY} width={(rightX - leftX) / (dbl ? 2 : 1)} height={clearY - topY}
            fill="none" stroke={p.post} strokeWidth={2.5} />
          {dbl && (
            <rect x={leftX + (rightX - leftX) / 2} y={topY} width={(rightX - leftX) / 2} height={clearY - topY}
              fill="none" stroke={p.post} strokeWidth={2.5} />
          )}
        </g>
      )}

      {/* infill */}
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={leftX + 8 + i * ((rightX - leftX - 16) / 8)} y1={topY + 4}
          x2={leftX + 8 + i * ((rightX - leftX - 16) / 8)} y2={clearY - 4} stroke={p.ghost} strokeWidth={1.2} />
      ))}

      {/* clearance under the leaf — the number the swing check turns on */}
      <line x1={leftX} y1={clearY} x2={rightX} y2={clearY} stroke={binds ? "#dc2626" : p.dim} strokeWidth={1.4} strokeDasharray="4 3" />
      <text x={rightX + 16} y={clearY + 4} fontSize={8} fill={binds ? "#dc2626" : d("groundClearance").fill}>
        {d("groundClearance").text}
      </text>

      {/* widths, top and bottom */}
      <line x1={leftX} y1={topY - 14} x2={rightX} y2={topY - 14} stroke={p.dim} strokeWidth={1} />
      <text x={(leftX + rightX) / 2} y={topY - 18} fontSize={9} textAnchor="middle" fill={d("widthTop").fill}>
        {d("widthTop").text}
      </text>
      <text x={(leftX + rightX) / 2} y={gradeY + 26} fontSize={9} textAnchor="middle" fill={d("widthBottom").fill}>
        {d("widthBottom").text}
      </text>

      {/* height */}
      <line x1={26} y1={topY} x2={26} y2={gradeY} stroke={p.dim} strokeWidth={1} />
      <text x={30} y={(topY + gradeY) / 2} fontSize={9} fill={d("heightHinge").fill}>
        {d("heightHinge").text}
      </text>

      {/* the verdict */}
      {rise !== null && rise > 0 && (
        <text x={4} y={H - 6} fontSize={9} fontWeight={700} fill={binds ? "#dc2626" : "#16a34a"}>
          {binds ? "✗" : "✓"} {mt(lang, "gateRiseLabel")} {d("gradeRise").text} · {mt(lang, "gateClearLabel")} {d("groundClearance").text}
        </text>
      )}
    </svg>
  );
}

// ---- Fence run -------------------------------------------------------------

// The run laid out flat: each segment as a bay of panels, turns marked, grade
// change noted under the segment that carries it.
function FenceSketch({ fence, p, lang }: { fence: FenceData | null; p: Palette; lang: string }) {
  const segs = fence?.segments || [];
  const W = 340;
  const H = 210;
  const baseY = 150;
  const topY = 74;
  const gutter = 32; // room for the height dimension, left of the first post
  const usable = W - gutter - 14;
  const per = segs.length ? usable / segs.length : usable;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 280 }}>
      <line x1={12} y1={baseY} x2={W - 12} y2={baseY} stroke={p.line} strokeWidth={2} />
      <text x={12} y={baseY + 14} fontSize={8} fill={p.dim}>
        {mt(lang, "gateGrade").toUpperCase()}
      </text>

      {segs.map((sg, i) => {
        const x0 = gutter + i * per;
        const x1 = x0 + per - 6;
        const turn = parseMeas(sg.turnDeg || "");
        return (
          <g key={sg.id}>
            {/* posts at each end of the bay */}
            <line x1={x0} y1={topY} x2={x0} y2={baseY} stroke={p.post} strokeWidth={3} />
            <line x1={x1} y1={topY} x2={x1} y2={baseY} stroke={p.post} strokeWidth={3} />
            {/* rails */}
            <line x1={x0} y1={topY + 6} x2={x1} y2={topY + 6} stroke={p.line} strokeWidth={2} />
            <line x1={x0} y1={baseY - 12} x2={x1} y2={baseY - 12} stroke={p.line} strokeWidth={2} />
            {/* pickets */}
            {Array.from({ length: 6 }, (_, k) => (
              <line key={k} x1={x0 + 5 + k * ((x1 - x0 - 10) / 5)} y1={topY + 4}
                x2={x0 + 5 + k * ((x1 - x0 - 10) / 5)} y2={baseY - 8} stroke={p.ghost} strokeWidth={1.2} />
            ))}
            {/* segment length */}
            <text x={(x0 + x1) / 2} y={baseY + 26} fontSize={8.5} textAnchor="middle" fill={v(sg.length, p).fill}>
              {v(sg.length, p).text}
            </text>
            <text x={(x0 + x1) / 2} y={topY - 6} fontSize={8} textAnchor="middle" fill={p.dim}>
              {sg.label || i + 1}
            </text>
            {/* a turn at the end of this bay */}
            {turn !== null && turn !== 0 && (
              <text x={x1 + 3} y={topY - 6} fontSize={8.5} fill={p.post}>
                ⟲{sg.turnDeg}
              </text>
            )}
            {/* grade change */}
            {sg.gradeChange && sg.gradeChange.trim() !== "" && (
              <text x={(x0 + x1) / 2} y={baseY + 38} fontSize={7.5} textAnchor="middle" fill={p.dim}>
                {sg.followsGrade === "stepped" ? mt(lang, "fenceStepped") : mt(lang, "fenceRacked")} {sg.gradeChange}
              </text>
            )}
          </g>
        );
      })}

      {/* height + total run */}
      <line x1={16} y1={topY} x2={16} y2={baseY} stroke={p.dim} strokeWidth={1} />
      <text x={4} y={(topY + baseY) / 2 - 6} fontSize={8.5} fill={v(fence?.height, p).fill}>
        {v(fence?.height, p).text}
      </text>
      <text x={W / 2} y={24} fontSize={9} textAnchor="middle" fill={v(fence?.totalRun, p).fill}>
        {mt(lang, "fenceTotalRun")}: {v(fence?.totalRun, p).text}
      </text>
      <text x={W / 2} y={40} fontSize={8} textAnchor="middle" fill={p.dim}>
        {v(fence?.startTerm, p).text} → {v(fence?.endTerm, p).text}
      </text>
    </svg>
  );
}

// ---- Balcony / juliet ------------------------------------------------------

// Section through the slab edge: where the anchor lands, how deep it goes and
// how close to the edge — the two numbers that decide if the rail holds.
function BalconySectionSketch({ bal, p, lang }: { bal: BalconyData | null; p: Palette; lang: string }) {
  const W = 340;
  const H = 250;
  const slabTop = 132;
  const slabBot = 176;
  const edgeX = 250;
  const railTop = 40;

  const d = (k: keyof BalconyData) => v(typeof bal?.[k] === "string" ? (bal[k] as string) : "", p);
  const emb = parseMeas(bal?.anchorEmbedment || "");
  const th = parseMeas(bal?.slabThickness || "");
  const cover = parseMeas(bal?.minCover || "") ?? 0;
  const breaks = emb !== null && th !== null && emb + cover > th;
  const fascia = bal?.mount === "fascia";
  const postX = fascia ? edgeX + 6 : edgeX - 34;
  const embPx = emb !== null && th !== null && th > 0 ? Math.min(44, (emb / th) * (slabBot - slabTop)) : 20;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 330 }}>
      <defs>
        <pattern id="balHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={p.ghost} strokeWidth="2.5" />
        </pattern>
      </defs>

      {/* slab */}
      <rect x={0} y={slabTop} width={edgeX} height={slabBot - slabTop} fill="url(#balHatch)" stroke={p.line} strokeWidth={2} />
      <text x={8} y={slabTop - 8} fontSize={8.5} fontWeight={700} fill={p.dim}>
        {mt(lang, "balSlab").toUpperCase()}
      </text>
      {/* thickness */}
      <line x1={edgeX + 30} y1={slabTop} x2={edgeX + 30} y2={slabBot} stroke={p.dim} strokeWidth={1} />
      <text x={edgeX + 34} y={(slabTop + slabBot) / 2 + 3} fontSize={8.5} fill={d("slabThickness").fill}>
        {d("slabThickness").text}
      </text>

      {/* post */}
      <line x1={postX} y1={slabTop} x2={postX} y2={railTop} stroke={p.post} strokeWidth={4} />
      <line x1={postX - 22} y1={railTop} x2={postX + 22} y2={railTop} stroke={p.post} strokeWidth={3} />
      {[0.3, 0.6].map((f) => (
        <line key={f} x1={postX - 16 + f * 20} y1={slabTop} x2={postX - 16 + f * 20} y2={railTop} stroke={p.ghost} strokeWidth={1.2} />
      ))}
      <text x={postX - 26} y={railTop - 8} fontSize={8.5} fill={d("guardHeight").fill}>
        {d("guardHeight").text}
      </text>

      {/* the anchor going into the slab */}
      <line x1={postX} y1={slabTop} x2={postX} y2={slabTop + embPx}
        stroke={breaks ? "#dc2626" : "#16a34a"} strokeWidth={3.5} />
      <text x={postX + 6} y={slabTop + embPx + 10} fontSize={8} fill={breaks ? "#dc2626" : d("anchorEmbedment").fill}>
        {d("anchorEmbedment").text}
      </text>

      {/* edge distance */}
      <line x1={postX} y1={slabTop - 10} x2={edgeX} y2={slabTop - 10} stroke={p.dim} strokeWidth={1} />
      <text x={(postX + edgeX) / 2} y={slabTop - 14} fontSize={8} textAnchor="middle" fill={d("edgeDistance").fill}>
        {d("edgeDistance").text}
      </text>

      {breaks && (
        <text x={4} y={H - 6} fontSize={9} fontWeight={700} fill="#dc2626">
          ✗ {mt(lang, "balBreaksThrough")}
        </text>
      )}
    </svg>
  );
}

// Elevation along the edge — length, returns and the opening a juliet fronts.
function BalconyElevationSketch({ bal, p, lang }: { bal: BalconyData | null; p: Palette; lang: string }) {
  const W = 340;
  const H = 200;
  const left = 40;
  const right = 300;
  const floorY = 150;
  const railTop = 56;
  const d = (k: keyof BalconyData) => v(typeof bal?.[k] === "string" ? (bal[k] as string) : "", p);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 280 }}>
      <line x1={12} y1={floorY} x2={W - 12} y2={floorY} stroke={p.line} strokeWidth={2.5} />
      <text x={12} y={floorY + 15} fontSize={8} fill={p.dim}>
        {mt(lang, "balFinishedFloorShort").toUpperCase()}
      </text>

      {/* rail */}
      <line x1={left} y1={railTop} x2={right} y2={railTop} stroke={p.post} strokeWidth={3} />
      <line x1={left} y1={railTop} x2={left} y2={floorY} stroke={p.post} strokeWidth={3.5} />
      <line x1={right} y1={railTop} x2={right} y2={floorY} stroke={p.post} strokeWidth={3.5} />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={left + 10 + i * ((right - left - 20) / 11)} y1={railTop}
          x2={left + 10 + i * ((right - left - 20) / 11)} y2={floorY} stroke={p.ghost} strokeWidth={1.2} />
      ))}

      {/* the door a juliet fronts */}
      {bal?.kind === "juliet" && (
        <g>
          <rect x={(left + right) / 2 - 34} y={railTop - 30} width={68} height={30}
            fill="none" stroke={p.ghost} strokeWidth={1.4} strokeDasharray="4 3" />
          <text x={(left + right) / 2} y={railTop - 34} fontSize={8} textAnchor="middle" fill={p.dim}>
            {d("doorOpening").text}
          </text>
        </g>
      )}

      <line x1={left} y1={floorY + 22} x2={right} y2={floorY + 22} stroke={p.dim} strokeWidth={1} />
      <text x={(left + right) / 2} y={floorY + 36} fontSize={9} textAnchor="middle" fill={d("edgeLength").fill}>
        {d("edgeLength").text}
      </text>
      <line x1={24} y1={railTop} x2={24} y2={floorY} stroke={p.dim} strokeWidth={1} />
      <text x={27} y={(railTop + floorY) / 2} fontSize={8.5} fill={d("guardHeight").fill}>
        {d("guardHeight").text}
      </text>
    </svg>
  );
}
