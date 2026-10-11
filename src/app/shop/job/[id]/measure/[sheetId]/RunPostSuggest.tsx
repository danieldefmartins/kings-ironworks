"use client";
// The post plan for railed runs that are not stair sides: deck sides, fence
// segments, wall-cap runs, balcony front and returns, ramp sides, drawn runs.
// Same card as the stair (PostPlanCard): top-view preview, − N + per run with
// its span, "Use these posts". Before approval the posts are amber ghosts in
// the 3D; after it the card folds to one line and opens to re-space.

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Point3 } from "@/lib/shop/measure-geometry";
import type { MeasureData, MeasureShape } from "@/lib/shop/measure";
import { formatMeas } from "@/lib/shop/measure-parse";
import { stepRun } from "@/lib/shop/measure-post-suggest-runs";
import { RUN_SUGGEST } from "@/lib/shop/measure-post-suggest-registry";
import { ps } from "@/lib/shop/measure-post-suggest-i18n";
import { runLabelText, runNoteText, rw } from "@/lib/shop/measure-post-suggest-runs-i18n";
import { PostPlanCard, type PlanRow } from "./PostSuggest";

const ft = (n: number) => formatMeas(n, "ftin").replace(/ /g, " ");
type Set = (fn: (d: MeasureData) => void) => void;

/** The spacing field this work type reads first (what "Max post spacing" edits). */
function spacingField(shape: MeasureShape): { get: (d: MeasureData) => string; put: (d: MeasureData, v: string) => void } {
  if (shape === "deck") return { get: (d) => d.deck?.maxPostSpacing ?? "", put: (d, v) => { if (d.deck) d.deck.maxPostSpacing = v; } };
  if (shape === "fence") return { get: (d) => d.fence?.postSpacing ?? "", put: (d, v) => { if (d.fence) d.fence.postSpacing = v; } };
  return { get: (d) => d.rail.maxPostSpacing ?? "", put: (d, v) => { if (v) d.rail.maxPostSpacing = v; else delete d.rail.maxPostSpacing; } };
}

export function RunPostSuggest({ lang, data, shape, set, orgMaxSpacing }: {
  lang: string; data: MeasureData; shape: MeasureShape; set: Set; orgMaxSpacing?: string | null;
}) {
  const adapter = RUN_SUGGEST[shape];
  const sugg = useMemo(() => adapter?.suggest(data, orgMaxSpacing) ?? null, [adapter, data, orgMaxSpacing]);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  // The preview reads plans the stair's way (walker's right = +Y); these shapes use
  // ordinary plan axes (+Y = left of travel), so they are mirrored into it once here.
  const view = useMemo(() => {
    if (!sugg) return null;
    // A ramp is laid out on the stair geometry already.
    const m = (p: Point3): Point3 => (shape === "ramp" ? p : { ...p, y: -p.y });
    return {
      outlines: sugg.outlines.map((o) => o.map(m)),
      walls: sugg.walls.map(([a, b]) => [m(a), m(b)] as [Point3, Point3]),
      layouts: sugg.layouts.map((l) => ({ ...l, run: { ...l.run, path: l.run.path.map(m) } })),
    };
  }, [sugg, shape]);
  if (!adapter || !sugg || !view || !sugg.layouts.length) return null;
  const placed = sugg.approved;
  const rows: PlanRow[] = view.layouts.map((l) => ({
    layout: l,
    label: runLabelText(lang, sugg.labels[l.run.id], l.run.id),
    note: runNoteText(lang, sugg.notes?.[l.run.id], ft) || undefined,
  }));
  const summary = ps(lang, "posts", { n: sugg.total });
  const linked = shape === "ramp" ? data.rail.postPlan?.linked !== false : true;
  const step = (runId: string, delta: number) => {
    const counts = stepRun(sugg, runId, delta, linked);
    set((d) => adapter.setCounts(d, counts, orgMaxSpacing));
  };
  const spacing = spacingField(shape);

  if (placed && !open) {
    return (
      <button type="button" data-post-suggest data-post-plan-folded onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center gap-2 rounded-[22px] border border-slate-200 bg-white px-4 text-left text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,.04)] active:scale-[.99]">
        <span className="text-[17px] font-semibold tracking-tight">{rw(lang, "layoutCompact")}</span>
        <span data-post-suggest-total className="text-[15px] font-medium tabular-nums text-slate-500">· {summary}</span>
        <ChevronDown aria-hidden className="ml-auto h-5 w-5 text-slate-400" />
      </button>
    );
  }

  return (
    <PostPlanCard lang={lang} title={ps(lang, placed ? "layout" : "title")} summary={summary} rows={rows} maxSpacing={sugg.maxSpacing}
      outlines={view.outlines} walls={view.walls} ghost={!placed} onStep={step}
      actions={<>
        <button type="button" data-post-edit aria-expanded={editing} onClick={() => setEditing(!editing)}
          className={`rounded-2xl border border-slate-200 bg-white px-5 text-[15px] font-semibold text-slate-800 active:scale-[.98] ${placed ? "min-h-12 flex-1" : "min-h-14"}`}>
          {ps(lang, editing ? "done" : "edit")}
        </button>
        {placed ? (
          <button type="button" onClick={() => { setOpen(false); setEditing(false); }}
            className="min-h-12 flex-1 rounded-2xl bg-slate-900 px-4 text-[15px] font-semibold text-white active:scale-[.98]">
            {ps(lang, "done")}
          </button>
        ) : (
          <button type="button" data-post-approve disabled={sugg.total === 0} onClick={() => set((d) => adapter.approve(d, orgMaxSpacing))}
            className="min-h-14 flex-1 rounded-2xl bg-indigo-600 px-4 text-[16px] font-semibold text-white transition-transform active:scale-[.98] disabled:opacity-40">
            {ps(lang, "use")}
          </button>
        )}
      </>}>
      {editing && (
        <div data-post-plan-edit className="mt-3 space-y-3 rounded-2xl border border-slate-200 p-3">
          <label className="block">
            <span className="text-[13px] font-semibold text-slate-500">{ps(lang, "maxSpacing")}</span>
            <input inputMode="decimal" defaultValue={spacing.get(data)} placeholder={ft(sugg.maxSpacing)}
              onBlur={(e) => { const v = e.target.value.trim(); set((d) => spacing.put(d, v)); }}
              className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[17px] tabular-nums" />
          </label>
          {shape === "ramp" && rows.length === 2 && (
            <label className="flex min-h-11 items-center justify-between gap-3">
              <span className="text-[15px] font-medium">{ps(lang, "linked")}</span>
              <input type="checkbox" role="switch" checked={linked} className="h-6 w-6 accent-indigo-600"
                onChange={(e) => { const on = e.target.checked; set((d) => { d.rail.postPlan = { ...(d.rail.postPlan || {}), linked: on }; }); }} />
            </label>
          )}
        </div>
      )}
    </PostPlanCard>
  );
}

/** Work types whose railed runs get this card. */
export const RUN_SUGGEST_SHAPES: string[] = Object.keys(RUN_SUGGEST);
