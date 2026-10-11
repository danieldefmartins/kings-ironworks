"use client";
// Read-only results for one post and the span that leaves it: height to the
// rail line, where it stands, and run / rail length / rake / clear / pickets
// to the next post on the same side. Everything here is calculated from the
// treads and the two setbacks — nothing is typed.

import type { LayoutPost, LayoutSpan, PostLayout } from "@/lib/shop/measure-post-layout";
import { formatMeas } from "@/lib/shop/measure-parse";
import { mt } from "@/lib/shop/measure-i18n";

const deg = (n: number) => `${Math.abs(n).toFixed(1)}°`;

const TONES = {
  // Shop cards (theme-mapped neutral / sky classes).
  shop: {
    box: "border-sky-500/30 bg-sky-950/30",
    head: "text-sky-300",
    badge: "border-sky-500/60",
    key: "text-neutral-400",
    val: "text-sky-200",
    rule: "border-sky-500/30",
  },
  // The light selection panel beside the 3D view.
  light: {
    box: "border-sky-200 bg-sky-50",
    head: "text-sky-800",
    badge: "border-sky-300",
    key: "text-slate-500",
    val: "text-sky-900",
    rule: "border-sky-200",
  },
} as const;

export default function CalcStrip({ lang, lp, layout, span, units, tone = "shop" }: {
  lang: string;
  lp: LayoutPost;
  layout: PostLayout;
  span: LayoutSpan | null;
  units: "in" | "ftin";
  tone?: keyof typeof TONES;
}) {
  const c = TONES[tone];
  const approx = lp.provisional || !!span?.provisional;
  const f = (n: number) => `${approx ? "≈ " : ""}${formatMeas(n, units)}`;
  const item = (k: string, v: string) => (
    <div key={k} className="min-w-0">
      <div className={`text-xs ${c.key}`}>{k}</div>
      <div className={`text-[15px] font-semibold tabular-nums ${c.val}`}>{v}</div>
    </div>
  );
  const angle = !span ? "" : span.kind === "level" ? mt(lang, "pl_level")
    : span.kind === "transition" ? span.pieces.map((p) => (p.kind === "level" ? mt(lang, "pl_level") : deg(p.angle))).join(" → ")
    : deg(span.angle);
  return (
    <div data-post-calc className={`mt-3 rounded-xl border px-3 py-2.5 ${c.box}`}>
      <div className={`mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${c.head}`}>
        <span aria-hidden className={`grid h-4 w-4 place-items-center rounded-full border text-[10px] leading-none ${c.badge}`}>=</span>
        {mt(lang, "pl_calc")}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {item(mt(lang, "pl_height"), f(lp.height))}
        {item(mt(lang, "pl_base"), f(lp.base.z - layout.floorZ))}
      </div>
      {span && (
        <div data-post-span className={`mt-2.5 border-t pt-2 ${c.rule}`}>
          <div className={`mb-1.5 flex items-center gap-2 text-xs font-bold ${c.head}`}>
            <span>{span.from.label} → {span.to.label}</span>
            {span.kind === "transition" && <span className={`font-semibold ${c.key}`}>{mt(lang, "pl_viaLanding")}</span>}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {item(mt(lang, "pl_run"), f(span.run))}
            {item(mt(lang, "pl_rail"), f(span.length))}
            {item(mt(lang, "pl_angle"), angle)}
            {item(mt(lang, "pl_clear"), f(span.clearRun))}
            {span.pickets && item(mt(lang, "pl_pickets"), `${span.pickets.count} @ ${formatMeas(span.pickets.oc, units)}`)}
            {span.pickets && item(mt(lang, "pl_gap"), formatMeas(span.pickets.gap, units))}
          </div>
        </div>
      )}
    </div>
  );
}
