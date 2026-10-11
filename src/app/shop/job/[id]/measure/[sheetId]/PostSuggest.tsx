"use client";
// The post suggestion card.
//
// PostPlanCard is generic: it takes laid-out runs (measure-post-suggest.ts) and
// shows the top-view preview, a count stepper per run with its span, and
// whatever actions the caller passes. Any shape that can describe its railed
// lines as runs can show it. StairPostSuggest is the stair wrapper: railing
// sides, approve, and the live layout once approved.

import { useMemo, useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import type { MeasureData } from "@/lib/shop/measure";
import { formatMeas } from "@/lib/shop/measure-parse";
import { isGap, pointAlong, stepCounts, type RunLayout } from "@/lib/shop/measure-post-suggest";
import type { Point3 } from "@/lib/shop/measure-geometry";
import {
  stairSuggestion, applyStairSuggestion, isUntouchedSuggestion, ownPostsOnSides, adoptOwnPosts,
  wantedSides, segKey, type RailSide, type StairSuggestion,
} from "@/lib/shop/measure-post-suggest-stair";
import { ps } from "@/lib/shop/measure-post-suggest-i18n";

// Non-breaking: a length never wraps in the middle.
const ft = (n: number) => formatMeas(n, "ftin").replace(/ /g, "\u00a0");

/** Top view: outlines, walls, and every post of every run, the stair pointing up. */
export function PostPlanPreview({ outlines, walls, layouts, ghost, label }: {
  outlines: Point3[][]; walls: [Point3, Point3][]; layouts: RunLayout[]; ghost: boolean; label: string;
}) {
  const view = useMemo(() => {
    const first = outlines[0];
    const ang = first ? Math.atan2(first[1].y - first[0].y, first[1].x - first[0].x) : 0;
    const c = Math.cos(-ang), s = Math.sin(-ang);
    // Up the stair = up the screen; walker's right = screen right.
    const tf = (p: Point3) => { const lx = p.x * c - p.y * s, ly = p.x * s + p.y * c; return { x: ly, y: -lx }; };
    const polys = outlines.map((o) => o.map(tf));
    const wallLines = walls.map(([a, b]) => [tf(a), tf(b)]);
    const runs = layouts.map((l) => {
      const pts = l.posts.map((p) => ({ ...tf(pointAlong(l.run.path, p.at)), anchor: p.anchor }));
      // The rail line stops at an opening (a deck's stair or gate).
      const lines: typeof pts[] = [[]];
      l.posts.forEach((p, i) => { if (i > 0 && isGap(l.run, l.posts[i - 1], p)) lines.push([]); lines[lines.length - 1].push(pts[i]); });
      return { id: l.run.id, pts, lines };
    });
    const all = [...polys.flat(), ...runs.flatMap((r) => r.pts)];
    if (!all.length) return null;
    const minX = Math.min(...all.map((p) => p.x)), maxX = Math.max(...all.map((p) => p.x));
    const minY = Math.min(...all.map((p) => p.y)), maxY = Math.max(...all.map((p) => p.y));
    const ext = Math.max(maxX - minX, maxY - minY, 1);
    const pad = ext * 0.08;
    return { polys, wallLines, runs, box: [minX - pad, minY - pad, maxX - minX + 2 * pad, maxY - minY + 2 * pad], r: Math.max(2.5, ext * 0.032) };
  }, [outlines, walls, layouts]);
  if (!view) return null;
  const [bx, by, bw, bh] = view.box;
  return (
    <svg role="img" aria-label={label} data-post-preview viewBox={`${bx} ${by} ${bw} ${bh}`} preserveAspectRatio="xMidYMid meet"
      className="mx-auto block h-44 w-full max-w-[420px] @2xl:h-60">
      {view.polys.map((p, i) => (
        <polygon key={i} points={p.map((q) => `${q.x},${q.y}`).join(" ")} className="fill-slate-100 stroke-slate-300" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      {view.wallLines.map(([a, b], i) => (
        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-slate-500" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
      {view.runs.map((r) => (
        <g key={r.id}>
          {r.lines.map((line, k) => (
            <polyline key={k} points={line.map((q) => `${q.x},${q.y}`).join(" ")} fill="none" className={ghost ? "stroke-amber-500" : "stroke-indigo-500"}
              strokeWidth={2} strokeDasharray={ghost ? "5 4" : undefined} vectorEffect="non-scaling-stroke" />
          ))}
          {r.pts.map((q, i) => (
            <circle key={i} cx={q.x} cy={q.y} r={view.r} className={ghost ? "fill-amber-400 stroke-white" : "fill-indigo-600 stroke-white"} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      ))}
    </svg>
  );
}

export interface PlanRow {
  layout: RunLayout;
  label: string;
  /** A short fact after the span (a fence's grade per bay). */
  note?: string;
}

/** Generic card: preview, one stepper row per run, caller's controls and actions. */
export function PostPlanCard({ lang, title, summary, rows, maxSpacing, outlines, walls, ghost, onStep, controls, actions, children, flat = false }: {
  /** Inside another card: no border of its own. */
  flat?: boolean;
  lang: string;
  title: string;
  summary: string;
  rows: PlanRow[];
  maxSpacing: number;
  outlines: Point3[][];
  walls: [Point3, Point3][];
  ghost: boolean;
  onStep: (runId: string, delta: number) => void;
  controls?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section data-post-suggest aria-label={title}
      className={`@container scroll-mt-24 text-slate-900 ${flat ? "" : "overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]"}`}>
      <div className={flat ? "" : "p-4 @2xl:px-5"}>
        <div className="flex items-baseline gap-2">
          <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
          <span data-post-suggest-total className="text-[15px] font-medium text-slate-500 tabular-nums">· {summary}</span>
        </div>
        {/* Phone: stacked. Wide card: preview left, controls right. */}
        <div className="@2xl:mt-3 @2xl:grid @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] @2xl:items-start @2xl:gap-5">
        <div className="mt-3 rounded-2xl bg-slate-50 px-2 py-3 @2xl:mt-0">
          <PostPlanPreview outlines={outlines} walls={walls} layouts={rows.map((r) => r.layout)} ghost={ghost} label={ps(lang, "preview")} />
        </div>
        <div className="min-w-0">
        {controls && <div className="mt-3 @2xl:mt-0">{controls}</div>}
        {rows.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {rows.map(({ layout: l, label, note }) => {
              const bad = l.overMax || l.underMin;
              const span = l.spans.length === 0 ? "" : l.spanEach !== null ? ps(lang, "spanEach", { v: ft(l.spanEach) })
                : ps(lang, "spans", { a: ft(Math.min(...l.spans)), b: ft(l.longest) });
              return (
                <li key={l.run.id} data-post-run={l.run.id} data-over={bad ? "" : undefined} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">{label}</p>
                    <p className={`text-[13px] tabular-nums ${bad ? "font-semibold text-red-600" : "text-slate-500"}`}>
                      {span}
                      {l.overMax && <> · {ps(lang, "overMax", { v: ft(maxSpacing) })}</>}
                      {!l.overMax && l.underMin && <> · {ps(lang, "tooClose")}</>}
                      {note && <> · {note}</>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center rounded-full bg-slate-100 p-1">
                    <button type="button" data-post-step="-1" aria-label={`${ps(lang, "fewer")} · ${label}`} disabled={l.count <= l.minCount}
                      onClick={() => onStep(l.run.id, -1)}
                      className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm transition-transform active:scale-90 disabled:opacity-30 disabled:shadow-none">
                      <Minus aria-hidden className="h-4 w-4" />
                    </button>
                    <span data-post-count className={`w-9 text-center text-[17px] font-semibold tabular-nums ${bad ? "text-red-600" : ""}`} aria-live="polite">{l.count}</span>
                    <button type="button" data-post-step="1" aria-label={`${ps(lang, "more")} · ${label}`} disabled={l.count >= l.maxCount}
                      onClick={() => onStep(l.run.id, 1)}
                      className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm transition-transform active:scale-90 disabled:opacity-30 disabled:shadow-none">
                      <Plus aria-hidden className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {children}
        {actions && <div className="mt-3 flex gap-2">{actions}</div>}
        </div>
        </div>
      </div>
    </section>
  );
}

type Set = (fn: (d: MeasureData) => void) => void;

/** Segmented Left · Right · Both. A walled side reads "Wall" and cannot be picked on its own. */
function SidesControl({ lang, value, walled, onChange, name }: {
  lang: string; value: "left" | "right" | "both"; walled: Record<RailSide, boolean>; onChange: (v: "left" | "right" | "both") => void; name?: string;
}) {
  const opts: ["left" | "right" | "both", string][] = [["left", ps(lang, "left")], ["right", ps(lang, "right")], ["both", ps(lang, "both")]];
  return (
    <div role="radiogroup" aria-label={name ?? ps(lang, "sides")} data-rail-sides className="flex gap-1 rounded-xl bg-slate-100 p-1">
      {opts.map(([v, label]) => {
        const on = value === v;
        const wall = v !== "both" && walled[v];
        return (
          <button key={v} type="button" role="radio" aria-checked={on} data-side={v} onClick={() => onChange(v)}
            className={`flex min-h-10 flex-1 flex-col items-center justify-center rounded-lg px-2 text-[15px] font-semibold leading-tight transition-colors ${on ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            {label}
            {wall && <span className="text-[11px] font-medium text-slate-400">{ps(lang, "wall")}</span>}
          </button>
        );
      })}
    </div>
  );
}

const sideValue = (s: string): "left" | "right" | "both" => (/^left$/i.test(s) ? "left" : /^right$/i.test(s) ? "right" : "both");

/**
 * Stairs. Before approval: the suggestion as ghosts, count steppers, railing
 * sides, "Use these posts". After: the same controls re-space the untouched
 * suggested posts live (mode "placed").
 */
export function StairPostSuggest({ lang, data, set, orgMaxSpacing, onUndo, mode }: {
  lang: string; data: MeasureData; set: Set; orgMaxSpacing?: string | null; onUndo?: () => void; mode: "suggest" | "placed";
}) {
  const sugg = useMemo(() => stairSuggestion(data, orgMaxSpacing), [data, orgMaxSpacing]);
  const [editing, setEditing] = useState(false);
  const [removed, setRemoved] = useState<RailSide | null>(null);
  if (!sugg) return null;
  const placed = mode === "placed";
  const rows: PlanRow[] = sugg.layouts.map((l) => ({ layout: l, label: ps(lang, l.run.id === "left" ? "leftSide" : "rightSide") }));
  const total = rows.reduce((s, r) => s + r.layout.count, 0);
  const counts = rows.map((r) => r.layout.count);
  const summary = total === 0 ? ps(lang, "noRailing")
    : counts.length === 2 && counts[0] === counts[1] ? `${ps(lang, "posts", { n: total })} (${ps(lang, "perSide", { n: counts[0] })})`
      : ps(lang, "posts", { n: total });
  const linked = data.rail.postPlan?.linked !== false;

  const step = (runId: string, delta: number) => {
    const next = stepCounts(sugg.layouts, runId, delta, linked);
    const sides = Object.keys(next) as RailSide[];
    let adopt: string[] = [];
    if (placed) {
      const own = ownPostsOnSides(data, sides);
      if (own.length && typeof window !== "undefined" && window.confirm(ps(lang, "confirmOwn", { n: own.length }))) adopt = own.map((p) => p.id);
    }
    set((d) => {
      if (adopt.length) adoptOwnPosts(d, adopt);
      d.rail.postPlan = { ...(d.rail.postPlan || {}), ...next };
    });
  };

  const setSides = (v: "left" | "right" | "both") => {
    const before = sideValue(data.rail.side);
    set((d) => { d.rail.side = v === "both" ? "Both" : v === "left" ? "Left" : "Right"; });
    const lost: RailSide | null = before === "both" && v !== "both" ? (v === "left" ? "right" : "left") : before !== "both" && v !== before && v !== "both" ? before : null;
    setRemoved(lost);
  };

  const approve = () => {
    const own = data.posts.filter((p) => !p.pathId && p.pointType === "railing_post" && !p.supportAttachment && !isUntouchedSuggestion(p));
    if (own.length && !window.confirm(ps(lang, "confirmReplace", { n: own.length }))) return;
    set((d) => void applyStairSuggestion(d, orgMaxSpacing, own.length > 0));
  };

  const pieces = data.segments.map((g, i) => ({ g, i })).filter(({ g }) => g.kind === "flight" || g.kind === "platform");
  let fl = 0, la = 0;
  const pieceName = pieces.map(({ g }) => (g.kind === "flight" ? ps(lang, "flight", { n: ++fl }) : ps(lang, "landing", { n: ++la })));

  return (
    <PostPlanCard flat={placed} lang={lang} title={ps(lang, placed ? "layout" : "title")} summary={summary} rows={rows} maxSpacing={sugg.maxSpacing}
      outlines={sugg.outlines} walls={sugg.walls} ghost={!placed} onStep={step}
      controls={<>
        <p className="mb-1.5 text-[13px] font-semibold text-slate-500">{ps(lang, "sides")}</p>
        <SidesControl lang={lang} value={sideValue(data.rail.side)} walled={sugg.walled} onChange={setSides} />
        {removed && onUndo && (
          <div role="status" data-side-removed className="mt-2 flex items-center gap-2 rounded-xl px-3 py-1.5 text-[15px]" style={{ background: "#0f172a", color: "#fff" }}>
            <span className="flex-1">{ps(lang, "removed", { side: lang === "en" ? ps(lang, removed) : ps(lang, removed).toLowerCase() })}</span>
            <button type="button" className="min-h-10 rounded-lg px-2 font-semibold" style={{ color: "#fcd34d" }} onClick={() => { onUndo(); setRemoved(null); }}>{ps(lang, "undo")}</button>
          </div>
        )}
      </>}
      actions={placed ? (
        <button type="button" data-post-edit aria-expanded={editing} onClick={() => setEditing(!editing)}
          className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-[15px] font-semibold text-slate-800 active:scale-[.98]">
          {ps(lang, editing ? "done" : "edit")}
        </button>
      ) : (<>
        <button type="button" data-post-edit aria-expanded={editing} onClick={() => setEditing(!editing)}
          className="min-h-14 rounded-2xl border border-slate-200 bg-white px-5 text-[15px] font-semibold text-slate-800 active:scale-[.98]">
          {ps(lang, editing ? "done" : "edit")}
        </button>
        <button type="button" data-post-approve disabled={total === 0} onClick={approve}
          className="min-h-14 flex-1 rounded-2xl bg-indigo-600 px-4 text-[16px] font-semibold text-white transition-transform active:scale-[.98] disabled:opacity-40">
          {ps(lang, data.posts.some((p) => !p.pathId && p.pointType === "railing_post" && !isUntouchedSuggestion(p)) ? "replace" : "use")}
        </button>
      </>)}>
      {editing && (
        <div data-post-plan-edit className="mt-3 space-y-3 rounded-2xl border border-slate-200 p-3">
          <label className="block">
            <span className="text-[13px] font-semibold text-slate-500">{ps(lang, "maxSpacing")}</span>
            <input inputMode="decimal" defaultValue={data.rail.maxPostSpacing ?? ""} placeholder={ft(sugg.maxSpacing)}
              onBlur={(e) => { const v = e.target.value.trim(); set((d) => { if (v) d.rail.maxPostSpacing = v; else delete d.rail.maxPostSpacing; }); }}
              className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[17px] tabular-nums" />
          </label>
          {rows.length === 2 && (
            <label className="flex min-h-11 items-center justify-between gap-3">
              <span className="text-[15px] font-medium">{ps(lang, "linked")}</span>
              <input type="checkbox" role="switch" checked={linked} className="h-6 w-6 accent-indigo-600"
                onChange={(e) => { const on = e.target.checked; set((d) => { d.rail.postPlan = { ...(d.rail.postPlan || {}), linked: on }; }); }} />
            </label>
          )}
          {pieces.length > 1 && (
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-slate-500">{ps(lang, "perPiece")}</p>
              <div className="space-y-2">
                {pieces.map(({ g, i }, n) => {
                  const w = wantedSides(data, i);
                  const v = w.left && w.right ? "both" : w.left ? "left" : "right";
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 text-[14px] font-medium">{pieceName[n]}</span>
                      <div className="min-w-0 flex-1">
                        <SidesControl lang={lang} name={pieceName[n]} value={v} walled={{ left: false, right: false }}
                          onChange={(nv) => set((d) => { d.rail.segSides = { ...(d.rail.segSides || {}), [segKey(g, i)]: nv }; })} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </PostPlanCard>
  );
}

/** Sheets whose stair the stair adapter lays posts out for. */
export const POST_SUGGEST_SHAPES: string[] = ["straight", "stair_platform", "l_shape", "u_shape", "builder", "level_run"];

/** Whether the lead card should offer a suggestion: the stair is measured and no stair post is placed yet. */
export function wantsStairSuggestion(data: MeasureData, sugg: StairSuggestion | null): boolean {
  return !!sugg && !data.posts.some((p) => !p.pathId);
}
