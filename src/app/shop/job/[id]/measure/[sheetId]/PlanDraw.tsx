"use client";

// Tap-to-draw plan sketcher for the "Custom — draw it" shape. The crew taps
// points on a grid; lines snap to 45° so the shape stays clean, and every
// drawn line becomes a numbered segment that gets dimensioned in the list
// below. Structured lines — not loose ink — so checks and printing still work.

import { useRef, useState } from "react";
import type { PlanDrawing } from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";

const VW = 340;
const VH = 250;
const GRID = 10;

export default function PlanDraw({
  plan,
  lang,
  onChange,
}: {
  plan: PlanDrawing;
  lang: string;
  onChange: (next: PlanDrawing) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [snap, setSnap] = useState(true);

  function toLocal(e: React.PointerEvent): { x: number; y: number } {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * VW,
      y: ((e.clientY - r.top) / r.height) * VH,
    };
  }

  function snapPoint(pt: { x: number; y: number }): { x: number; y: number } {
    let x = Math.round(pt.x / GRID) * GRID;
    let y = Math.round(pt.y / GRID) * GRID;
    const last = plan.points[plan.points.length - 1];
    if (snap && last) {
      // snap the new line to the nearest 45° from the previous point
      const dx = x - last.x;
      const dy = y - last.y;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        const step = Math.PI / 4;
        const a = Math.round(Math.atan2(dy, dx) / step) * step;
        const snappedLen = Math.max(GRID, Math.round(len / GRID) * GRID);
        x = Math.round((last.x + Math.cos(a) * snappedLen) / GRID) * GRID;
        y = Math.round((last.y + Math.sin(a) * snappedLen) / GRID) * GRID;
      }
    }
    return {
      x: Math.min(VW - GRID, Math.max(GRID, x)),
      y: Math.min(VH - GRID, Math.max(GRID, y)),
    };
  }

  function segCountOf(points: { x: number; y: number }[], closed: boolean): number {
    if (points.length < 2) return 0;
    return closed && points.length > 2 ? points.length : points.length - 1;
  }

  function apply(points: { x: number; y: number }[], closed: boolean) {
    const n = segCountOf(points, closed);
    const segs = Array.from({ length: n }, (_, i) => plan.segs[i] || { len: "", note: "" });
    onChange({ points, closed, segs });
  }

  function addPoint(e: React.PointerEvent) {
    if (plan.closed) return;
    e.preventDefault();
    const pt = snapPoint(toLocal(e));
    const last = plan.points[plan.points.length - 1];
    if (last && last.x === pt.x && last.y === pt.y) return;
    apply([...plan.points, pt], false);
  }

  const canClose = !plan.closed && plan.points.length >= 3;
  const segCount = segCountOf(plan.points, plan.closed);

  return (
    <div>
      <div className="text-xs text-neutral-500 mb-2">{mt(lang, "drawHint")}</div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-950 touch-none"
        onPointerDown={addPoint}
      >
        {/* grid dots */}
        {Array.from({ length: Math.floor(VW / (GRID * 2)) }, (_, gx) =>
          Array.from({ length: Math.floor(VH / (GRID * 2)) }, (_, gy) => (
            <circle
              key={`${gx}-${gy}`}
              cx={gx * GRID * 2 + GRID}
              cy={gy * GRID * 2 + GRID}
              r={0.7}
              fill="#333"
            />
          ))
        )}
        {/* drawn lines */}
        {plan.points.map((q, i) => {
          if (i === 0) return null;
          const a = plan.points[i - 1];
          return (
            <line key={i} x1={a.x} y1={a.y} x2={q.x} y2={q.y} stroke="#d4d4d4" strokeWidth={2.4} strokeLinecap="round" />
          );
        })}
        {plan.closed && plan.points.length > 2 && (
          <line
            x1={plan.points[plan.points.length - 1].x}
            y1={plan.points[plan.points.length - 1].y}
            x2={plan.points[0].x}
            y2={plan.points[0].y}
            stroke="#d4d4d4"
            strokeWidth={2.4}
          />
        )}
        {/* segment numbers */}
        {plan.points.map((q, i) => {
          if (i === 0 && !plan.closed) return null;
          const a = i === 0 ? plan.points[plan.points.length - 1] : plan.points[i - 1];
          const idx = i === 0 ? plan.points.length - 1 : i - 1;
          if (idx >= segCount) return null;
          return (
            <text
              key={`n${i}`}
              x={(a.x + q.x) / 2 + 6}
              y={(a.y + q.y) / 2 - 5}
              fontSize={9}
              fontWeight={700}
              fill="#f59e0b"
            >
              {idx + 1}
            </text>
          );
        })}
        {/* vertices */}
        {plan.points.map((q, i) => (
          <circle key={`v${i}`} cx={q.x} cy={q.y} r={i === plan.points.length - 1 && !plan.closed ? 5 : 3.2} fill="#f59e0b" />
        ))}
      </svg>

      <div className="flex flex-wrap gap-2 mt-2">
        <button
          onClick={() => apply(plan.points.slice(0, -1), false)}
          disabled={plan.points.length === 0}
          className="px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs font-bold text-neutral-200 disabled:opacity-40"
        >
          ↩ {mt(lang, "undoPoint")}
        </button>
        <button
          onClick={() => apply(plan.points, true)}
          disabled={!canClose}
          className="px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs font-bold text-neutral-200 disabled:opacity-40"
        >
          ▣ {mt(lang, "closeShape")}
        </button>
        {plan.closed && (
          <button
            onClick={() => apply(plan.points, false)}
            className="px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs font-bold text-neutral-200"
          >
            ✎ {mt(lang, "reopenDraw")}
          </button>
        )}
        <button
          onClick={() => setSnap((s) => !s)}
          className={`px-3 py-2 rounded-lg border text-xs font-bold ${
            snap
              ? "border-amber-500 bg-amber-500/10 text-amber-300"
              : "border-neutral-700 bg-neutral-800 text-neutral-400"
          }`}
        >
          ⊿ {mt(lang, "snapLbl")}
        </button>
        <button
          onClick={() => onChange({ points: [], closed: false, segs: [] })}
          disabled={plan.points.length === 0}
          className="ml-auto px-3 py-2 rounded-lg border border-red-900 bg-red-950/40 text-xs font-bold text-red-300 disabled:opacity-40"
        >
          🗑 {mt(lang, "clearDraw")}
        </button>
      </div>
    </div>
  );
}
