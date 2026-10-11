"use client";
// Wall-rail brackets: the post-suggestion card (PostSuggest.tsx PostPlanCard)
// on the one run a wall rail's brackets share. The engine
// (measure-post-suggest-wall-rail.ts) fixes a bracket near each end and spreads
// the rest evenly, none further apart than 48"; − N + re-spaces them. Until it
// is approved the 3D draws the suggestion as provisional brackets. Approving
// writes "5 @ 46-1/2"" into rail.brackets — the field the sheet always had; a
// plan typed there by hand is never overwritten without a tap.

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { MeasureData } from "@/lib/shop/measure";
import { formatMeas } from "@/lib/shop/measure-parse";
import { wallRailFrame } from "@/lib/shop/scene-shapes/scene-wall-rail";
import { bracketText, DEFAULT_BRACKET_SPACING, sheetBracketCount, suggestBrackets } from "@/lib/shop/measure-post-suggest-wall-rail";
import { PostPlanCard } from "./PostSuggest";

const W: Record<string, [string, string, string]> = {
  title: ["Brackets", "Suportes", "Soportes"],
  run: ["Wall rail", "Corrimão de parede", "Pasamanos de pared"],
  n: ["{n} brackets", "{n} suportes", "{n} soportes"],
  use: ["Use these brackets", "Usar estes suportes", "Usar estos soportes"],
  approved: ["Approved", "Aprovado", "Aprobado"],
  sheet: ["On the sheet: {v}", "Na folha: {v}", "En la hoja: {v}"],
};
const w = (lang: string, k: string, vars: Record<string, string | number> = {}) =>
  (W[k][lang === "pt" ? 1 : lang === "es" ? 2 : 0]).replace(/\{(\w+)\}/g, (_, v: string) => String(vars[v] ?? ""));
const ft = (n: number) => formatMeas(n, "ftin").replace(/ /g, " ");

export default function WallRailBrackets({ lang, data, set }: { lang: string; data: MeasureData; set: (fn: (d: MeasureData) => void) => void }) {
  const fr = useMemo(() => wallRailFrame(data), [data]);
  const sheetCount = sheetBracketCount(data);
  const [count, setCount] = useState<number | null>(null);
  if (!fr || fr.runLen <= 0) return null;
  const layout = suggestBrackets(fr.runLen, count ?? sheetCount);
  const text = bracketText(layout), stored = (data.rail.brackets || "").trim();
  const approved = stored === text;
  // Once the engine's plan is on the sheet, the stepper re-spaces it live.
  const engineOwned = approved || (sheetCount !== null && /^\d+ @ [\d -/]+"$/.test(stored));
  const step = (_: string, delta: number) => {
    const next = Math.min(layout.maxCount, Math.max(layout.minCount, layout.count + delta));
    setCount(next);
    if (engineOwned) set((d) => { d.rail.brackets = bracketText(suggestBrackets(fr.runLen, next)); });
  };
  const path = layout.run.path, half = 3;
  const outline = [{ ...path[0], y: -half }, { ...path[1], y: -half }, { ...path[1], y: half }, { ...path[0], y: half }];
  return (
    <div data-wall-brackets className="mt-3">
      <PostPlanCard lang={lang} title={w(lang, "title")} summary={w(lang, "n", { n: layout.count })}
        rows={[{ layout, label: w(lang, "run") }]} maxSpacing={DEFAULT_BRACKET_SPACING}
        outlines={[outline]} walls={[[{ ...path[0], y: half }, { ...path[1], y: half }]]} ghost={!approved} onStep={step}
        actions={approved ? (
          <span role="status" className="flex h-11 items-center gap-1.5 rounded-full bg-emerald-50 px-4 text-[15px] font-semibold text-emerald-700">
            <Check aria-hidden className="h-4 w-4" strokeWidth={3} />{w(lang, "approved")} · {ft(layout.spanEach ?? layout.longest)}
          </span>
        ) : (
          <button type="button" data-wall-brackets-use onClick={() => set((d) => { d.rail.brackets = text; })}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-[17px] font-semibold text-white shadow-[0_6px_14px_-8px_rgba(79,70,229,.9)] transition-transform active:scale-[.98]">
            <Check aria-hidden className="h-5 w-5" strokeWidth={3} />{w(lang, "use")}
          </button>
        )}>
        {stored && !approved && !engineOwned && <p className="mt-2 text-[13px] text-slate-500">{w(lang, "sheet", { v: stored })}</p>}
      </PostPlanCard>
    </div>
  );
}
