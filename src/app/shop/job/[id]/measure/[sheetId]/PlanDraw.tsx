"use client";

// Tap-to-draw plan sketcher. The crew taps points on a grid; lines snap to 45°
// so the shape stays clean, and every drawn line becomes a numbered segment
// that gets dimensioned in the list below. Structured lines — not loose ink —
// so checks and printing still work.
//
// Two things a real measurement needs and a single closed outline cannot give:
//
//  - SEPARATE RUNS. A rail goes from the wall to the steps — an L that does not
//    come back on itself — and then another run carries on past the steps. Each
//    is drawn as its own run on the same sheet. Open is the normal case;
//    closing is only for an outline that genuinely returns to its start.
//  - MOVING A CORNER. Points are placed by finger on a small canvas, so any
//    corner can be dragged afterwards instead of undoing back to it.

import { useRef, useState } from "react";
import {
  newPlanPath,
  planPaths,
  type PlanDrawing,
  type PlanPath,
  type PlanSegment,
} from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";

const VW = 340;
const VH = 250;
const GRID = 10;
// Finger-sized hit target for grabbing a corner, independent of the dot's size.
const GRAB_R = 11;

const RUN_COLORS = ["#d4d4d4", "#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#a78bfa"];

export default function PlanDraw({
  plan,
  lang,
  onChange,
  onPlacePoint,
}: {
  plan: PlanDrawing;
  lang: string;
  onChange: (next: PlanDrawing) => void;
  // Given a run, a line in it, and how far along that line the finger landed
  // (0..1), drop a point there. Absent on shapes that carry no points.
  onPlacePoint?: (pathId: string, segIdx: number, alongFraction: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [snap, setSnap] = useState(true);
  const [placing, setPlacing] = useState(false);

  const paths = planPaths(plan);
  const [activeId, setActiveId] = useState<string | null>(null);

  // The run being drawn into: the explicit selection, else the last open run,
  // else the last run. Derived every render so it survives adds and deletes.
  const activeIdx = (() => {
    if (activeId) {
      const i = paths.findIndex((p) => p.id === activeId);
      if (i >= 0) return i;
    }
    for (let i = paths.length - 1; i >= 0; i--) if (!paths[i].closed) return i;
    return paths.length - 1;
  })();
  const active: PlanPath | undefined = paths[activeIdx];

  // Drag state lives in refs, never in the render closure: this component
  // re-renders while a finger is down (autosave banner, cross-checks), and a
  // stale closure would drop the drag. Same lesson as the press-to-add fix.
  const dragRef = useRef<{ pathIdx: number; ptIdx: number } | null>(null);
  const movedRef = useRef(false);
  const suppressTapRef = useRef(false);
  const [preview, setPreview] = useState<{ pathIdx: number; ptIdx: number; x: number; y: number } | null>(null);

  function toLocal(e: React.PointerEvent): { x: number; y: number } {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * VW,
      y: ((e.clientY - r.top) / r.height) * VH,
    };
  }

  function clamp(pt: { x: number; y: number }) {
    return {
      x: Math.min(VW - GRID, Math.max(GRID, Math.round(pt.x / GRID) * GRID)),
      y: Math.min(VH - GRID, Math.max(GRID, Math.round(pt.y / GRID) * GRID)),
    };
  }

  function snapPoint(pt: { x: number; y: number }, from?: { x: number; y: number }) {
    let x = Math.round(pt.x / GRID) * GRID;
    let y = Math.round(pt.y / GRID) * GRID;
    if (snap && from) {
      // snap the new line to the nearest 45° from the previous point
      const dx = x - from.x;
      const dy = y - from.y;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        const step = Math.PI / 4;
        const a = Math.round(Math.atan2(dy, dx) / step) * step;
        const snappedLen = Math.max(GRID, Math.round(len / GRID) * GRID);
        x = Math.round((from.x + Math.cos(a) * snappedLen) / GRID) * GRID;
        y = Math.round((from.y + Math.sin(a) * snappedLen) / GRID) * GRID;
      }
    }
    return clamp({ x, y });
  }

  function segCountOf(points: { x: number; y: number }[], closed: boolean): number {
    if (points.length < 2) return 0;
    return closed && points.length > 2 ? points.length : points.length - 1;
  }

  function commit(next: PlanPath[]) {
    // Legacy single-run fields are no longer written; planPaths() reads `paths`.
    onChange({ points: [], closed: false, segs: [], paths: next });
  }

  function writePath(idx: number, points: { x: number; y: number }[], closed: boolean) {
    const base = paths[idx];
    if (!base) return;
    const n = segCountOf(points, closed);
    const segs = Array.from({ length: n }, (_, i) => base.segs[i] || blankPlanSegment());
    const next = paths.map((p, i) => (i === idx ? { ...p, points, closed, segs } : p));
    commit(next);
  }

  function addPoint(e: React.PointerEvent) {
    // A pointerdown that started on a corner is a drag, not a new point.
    if (suppressTapRef.current) {
      suppressTapRef.current = false;
      return;
    }
    // In placing mode the canvas draws nothing; only the lines respond.
    if (placing) return;
    e.preventDefault();

    // No runs yet, or the active one is finished: start a new run.
    if (!active || active.closed) {
      const fresh = newPlanPath(String(paths.length + 1));
      fresh.points = [clamp(toLocal(e))];
      const next = [...paths, fresh];
      setActiveId(fresh.id);
      commit(next);
      return;
    }

    const last = active.points[active.points.length - 1];
    const pt = last ? snapPoint(toLocal(e), last) : clamp(toLocal(e));
    if (last && last.x === pt.x && last.y === pt.y) return;
    writePath(activeIdx, [...active.points, pt], false);
  }

  function startDrag(pathIdx: number, ptIdx: number) {
    return (e: React.PointerEvent) => {
      e.stopPropagation();
      // Do NOT setPointerCapture — touch pointers are implicitly captured and
      // the explicit call costs the quick tap.
      dragRef.current = { pathIdx, ptIdx };
      movedRef.current = false;
      suppressTapRef.current = true;
      setActiveId(paths[pathIdx]?.id ?? null);
    };
  }

  function onMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    e.preventDefault();
    movedRef.current = true;
    const p = clamp(toLocal(e));
    setPreview({ ...d, ...p });
  }

  function endDrag() {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    const pv = preview;
    setPreview(null);
    // A press that never moved is not a drag; leave the point where it was.
    if (!movedRef.current || !pv) return;
    const path = paths[d.pathIdx];
    if (!path) return;
    const points = path.points.map((q, i) => (i === d.ptIdx ? { x: pv.x, y: pv.y } : q));
    writePath(d.pathIdx, points, path.closed);
  }

  function finishRun() {
    // Leave the current run as it is (open) and begin a fresh one.
    const fresh = newPlanPath(String(paths.length + 1));
    setActiveId(fresh.id);
    commit([...paths, fresh]);
  }

  function deleteRun(idx: number) {
    const next = paths.filter((_, i) => i !== idx);
    setActiveId(null);
    commit(next);
  }

  function renameRun(idx: number, label: string) {
    commit(paths.map((p, i) => (i === idx ? { ...p, label } : p)));
  }

  const canClose = !!active && !active.closed && active.points.length >= 3;
  const drawnPoints = (pathIdx: number, ptIdx: number, q: { x: number; y: number }) =>
    preview && preview.pathIdx === pathIdx && preview.ptIdx === ptIdx ? { x: preview.x, y: preview.y } : q;

  return (
    <div>
      <div className="text-xs text-neutral-500 mb-2">{mt(lang, "drawHint")}</div>
      <div className="mb-2 rounded-lg border border-amber-900/60 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">
        {placing
          ? `⊙ ${mt(lang, "placePointHint")}`
          : !active || active.points.length === 0
          ? `1. ${mt(lang, "tapCanvasStart")}`
          : active.points.length < 2
            ? `2. ${mt(lang, "tapNextCorner")}`
            : active.closed
              ? `✓ ${mt(lang, "shapeClosedReady")}`
              : `3. ${mt(lang, "continueOrFinish")}`}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full min-h-[260px] cursor-crosshair rounded-lg border-2 border-amber-700/70 bg-neutral-950 touch-none"
        onPointerDown={addPoint}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        {/* grid dots */}
        {Array.from({ length: Math.floor(VW / (GRID * 2)) }, (_, gx) =>
          Array.from({ length: Math.floor(VH / (GRID * 2)) }, (_, gy) => (
            <circle key={`${gx}-${gy}`} cx={gx * GRID * 2 + GRID} cy={gy * GRID * 2 + GRID} r={0.7} fill="#333" />
          ))
        )}

        {paths.length === 0 && (
          <g pointerEvents="none">
            <circle cx={VW / 2} cy={VH / 2 - 12} r={18} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" />
            <text x={VW / 2} y={VH / 2 - 7} textAnchor="middle" fontSize={20} fontWeight={700} fill="#f59e0b">＋</text>
            <text x={VW / 2} y={VH / 2 + 24} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fbbf24">
              {mt(lang, "tapCanvasStart")}
            </text>
          </g>
        )}

        {/* every run, the inactive ones dimmed so the live one reads clearly */}
        {paths.map((path, pi) => {
          const colour = RUN_COLORS[pi % RUN_COLORS.length];
          const isActive = pi === activeIdx;
          const segCount = segCountOf(path.points, path.closed);
          return (
            <g key={path.id} opacity={isActive ? 1 : 0.45}>
              {path.points.map((q, i) => {
                if (i === 0) return null;
                const a = drawnPoints(pi, i - 1, path.points[i - 1]);
                const b = drawnPoints(pi, i, q);
                return (
                  <g key={`l${i}`}>
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colour} strokeWidth={2.4} strokeLinecap="round" />
                    {placing && onPlacePoint && (
                      // Finger-width grab strip over the line. Only live while
                      // placing, so it can never eat a drawing tap.
                      <line
                        x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                        stroke="transparent" strokeWidth={18} strokeLinecap="round"
                        style={{ touchAction: "none", cursor: "copy" }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          suppressTapRef.current = true;
                          const p0 = toLocal(e);
                          const dx = b.x - a.x;
                          const dy = b.y - a.y;
                          const L2 = dx * dx + dy * dy || 1;
                          // project the touch onto the line to get how far
                          // along it the finger landed
                          const t = Math.max(0, Math.min(1, ((p0.x - a.x) * dx + (p0.y - a.y) * dy) / L2));
                          onPlacePoint(path.id, i - 1, t);
                        }}
                      />
                    )}
                  </g>
                );
              })}
              {path.closed && path.points.length > 2 && (
                <line
                  x1={drawnPoints(pi, path.points.length - 1, path.points[path.points.length - 1]).x}
                  y1={drawnPoints(pi, path.points.length - 1, path.points[path.points.length - 1]).y}
                  x2={drawnPoints(pi, 0, path.points[0]).x}
                  y2={drawnPoints(pi, 0, path.points[0]).y}
                  stroke={colour}
                  strokeWidth={2.4}
                />
              )}
              {/* segment numbers */}
              {path.points.map((q, i) => {
                if (i === 0 && !path.closed) return null;
                const a = i === 0 ? path.points[path.points.length - 1] : path.points[i - 1];
                const idx = i === 0 ? path.points.length - 1 : i - 1;
                if (idx >= segCount) return null;
                const pa = drawnPoints(pi, i === 0 ? path.points.length - 1 : i - 1, a);
                const pb = drawnPoints(pi, i, q);
                return (
                  <text key={`n${i}`} x={(pa.x + pb.x) / 2 + 6} y={(pa.y + pb.y) / 2 - 5} fontSize={9} fontWeight={700} fill={colour}>
                    {idx + 1}
                  </text>
                );
              })}
              {/* corners — draggable */}
              {path.points.map((q, i) => {
                const p = drawnPoints(pi, i, q);
                const isEnd = i === path.points.length - 1 && !path.closed;
                const isDragging = preview?.pathIdx === pi && preview?.ptIdx === i;
                return (
                  <g key={`v${i}`}>
                    {/* invisible finger-sized grab target, above the line */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={GRAB_R}
                      fill="transparent"
                      style={{ touchAction: "none" }}
                      onPointerDown={startDrag(pi, i)}
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isDragging ? 7 : isEnd ? 5 : 3.6}
                      fill={colour}
                      stroke={isDragging ? "#fff" : "none"}
                      strokeWidth={isDragging ? 1.5 : 0}
                      pointerEvents="none"
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap gap-2 mt-2">
        <button
          onClick={() => active && writePath(activeIdx, active.points.slice(0, -1), false)}
          disabled={!active || active.points.length === 0}
          className="px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs font-bold text-neutral-200 disabled:opacity-40"
        >
          ↩ {mt(lang, "undoPoint")}
        </button>
        <button
          onClick={finishRun}
          disabled={!active || active.points.length < 2}
          className="px-3 py-2 rounded-lg border border-emerald-800 bg-emerald-950/40 text-xs font-bold text-emerald-300 disabled:opacity-40"
        >
          ✔ {mt(lang, "finishRun")}
        </button>
        <button
          onClick={() => active && writePath(activeIdx, active.points, true)}
          disabled={!canClose}
          className="px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs font-bold text-neutral-200 disabled:opacity-40"
        >
          ▣ {mt(lang, "closeShape")}
        </button>
        {active?.closed && (
          <button
            onClick={() => writePath(activeIdx, active.points, false)}
            className="px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs font-bold text-neutral-200"
          >
            ✎ {mt(lang, "reopenDraw")}
          </button>
        )}
        {onPlacePoint && (
          <button
            onClick={() => setPlacing((v) => !v)}
            className={`px-3 py-2 rounded-lg border text-xs font-bold ${
              placing ? "border-sky-500 bg-sky-500/15 text-sky-300" : "border-neutral-700 bg-neutral-800 text-neutral-400"
            }`}
          >
            ⊙ {mt(lang, "placePointMode")}
          </button>
        )}
        <button
          onClick={() => setSnap((s) => !s)}
          className={`px-3 py-2 rounded-lg border text-xs font-bold ${
            snap ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-neutral-700 bg-neutral-800 text-neutral-400"
          }`}
        >
          ⊿ {mt(lang, "snapLbl")}
        </button>
        <button
          onClick={() => commit([])}
          disabled={paths.length === 0}
          className="ml-auto px-3 py-2 rounded-lg border border-red-900 bg-red-950/40 text-xs font-bold text-red-300 disabled:opacity-40"
        >
          🗑 {mt(lang, "clearDraw")}
        </button>
      </div>

      {paths.length > 0 && (
        <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-2">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
            {mt(lang, "runsTitle")}
          </div>
          <div className="flex flex-col gap-1.5">
            {paths.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                  i === activeIdx ? "border-amber-600 bg-amber-500/10" : "border-neutral-800 bg-neutral-900"
                }`}
              >
                <button
                  onClick={() => setActiveId(p.id)}
                  className="shrink-0 rounded px-1.5 py-0.5 text-xs font-bold"
                  style={{ color: RUN_COLORS[i % RUN_COLORS.length] }}
                >
                  ●
                </button>
                <input
                  value={p.label}
                  onChange={(e) => renameRun(i, e.target.value)}
                  placeholder={`${mt(lang, "runLbl")} ${i + 1}`}
                  className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-xs text-neutral-200 outline-none focus:bg-neutral-800"
                />
                <span className="shrink-0 text-[10px] text-neutral-500">
                  {segCountOf(p.points, p.closed)} {mt(lang, "segsShort")}
                  {p.closed ? ` · ${mt(lang, "closedShort")}` : ""}
                </span>
                <button
                  onClick={() => deleteRun(i)}
                  className="shrink-0 rounded px-1.5 py-0.5 text-xs font-bold text-red-400"
                  aria-label={mt(lang, "deleteRun")}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-neutral-500">{mt(lang, "runsHint")}</div>
        </div>
      )}

      {paths.some((p) => p.segs.some((sg) => sg.kind)) && <CustomSidePreview plan={plan} lang={lang} />}
    </div>
  );
}

function blankPlanSegment(): PlanSegment {
  return { len: "", note: "", kind: "", steps: "", rise: "", run: "", width: "", stepMeasures: [] };
}

// Side elevation generated from whatever typed segments the runs carry, in
// draw order across every run, so a stair drawn in run 2 still shows up.
function CustomSidePreview({ plan, lang }: { plan: PlanDrawing; lang: string }) {
  const W = 340;
  const H = 190;
  const usable = 300;
  const typed = planPaths(plan).flatMap((p) => p.segs).filter((sg) => sg.kind);
  const unit = typed.length ? usable / typed.length : usable;
  let x = 20;
  let y = 160;
  const els: React.ReactNode[] = [];
  typed.forEach((sg, i) => {
    const x2 = x + unit;
    if (sg.kind === "flight") {
      const count = Math.max(1, Math.min(20, Number.parseInt(sg.steps, 10) || 1));
      const totalUp = Math.min(105, Math.max(28, count * 7));
      const dx = unit / count;
      const dy = totalUp / count;
      let path = `M ${x} ${y}`;
      for (let s = 0; s < count; s += 1) path += ` h ${dx} v ${-dy}`;
      els.push(<path key={i} d={path} fill="none" stroke="#f59e0b" strokeWidth={2.2} />);
      y -= totalUp;
    } else if (sg.kind === "ramp" || sg.kind === "curve") {
      const up = sg.rise.trim() ? 42 : 0;
      els.push(<path key={i} d={`M ${x} ${y} ${sg.kind === "curve" ? `Q ${(x + x2) / 2} ${y - up - 12}` : "L"} ${x2} ${y - up}`} fill="none" stroke="#f59e0b" strokeWidth={2.2} />);
      y -= up;
    } else {
      els.push(<line key={i} x1={x} y1={y} x2={x2} y2={y} stroke="#d4d4d4" strokeWidth={3} />);
    }
    els.push(<text key={`t${i}`} x={(x + x2) / 2} y={y - 8} textAnchor="middle" fontSize={8} fill="#fbbf24">{i + 1}</text>);
    x = x2;
  });
  return (
    <div className="mt-4 rounded-xl border border-neutral-700 bg-neutral-950 p-3">
      <div className="mb-2 text-sm font-bold">↗ {mt(lang, "generatedSideView")}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 240 }}>
        <line x1={10} y1={160} x2={330} y2={160} stroke="#3f3f46" strokeDasharray="4 4" />
        {els}
      </svg>
      <p className="text-xs text-neutral-500">{mt(lang, "generatedSideHint")}</p>
    </div>
  );
}
