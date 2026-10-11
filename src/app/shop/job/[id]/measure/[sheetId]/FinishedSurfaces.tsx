"use client";

// "Is the finished floor down yet?" — asked once per surface a height is taken
// from. When the answer is "not yet", the finish and its thickness turn every
// height measured off that surface into the height it will really be, and the
// shop sheet says so in words.

import type { CheckLevel } from "@/lib/shop/measure-checks";
import type { MeasureData, MeasureShape } from "@/lib/shop/measure";
import { formatIn } from "@/lib/shop/measure-parse";
import { mt } from "@/lib/shop/measure-i18n";
import {
  FINISH_DEFAULT_IN,
  blankFinishFor,
  finishAdd,
  finishChecks,
  finishedRisers,
  finishTypesFor,
  heightNotes,
  setSurface,
  surfacesFor,
  type FutureFinish,
  type HeightNote,
  type SurfaceKey,
} from "@/lib/shop/measure-substrate";
import { MInput } from "./fields";

const DOT: Record<CheckLevel, string> = { green: "bg-emerald-500", yellow: "bg-amber-500", red: "bg-red-500", na: "bg-slate-300" };

/** "Treads: measured on rough tread + 3/4" hardwood to come" */
export function finishNote(lang: string, k: SurfaceKey, f: FutureFinish): string {
  const t = (x: string) => mt(lang, x);
  const add = finishAdd(f);
  if (!add) return "";
  const type = f.type ? ` ${t(`fin_type_${f.type}`).toLowerCase()}` : "";
  return `${t(`fin_surf_${k}`)}: ${t("fin_measuredOn")} ${t(`fin_rough_${k}`)} + ${formatIn(add)}${type} ${t("fin_toCome")}`;
}

export function heightLabel(lang: string, h: HeightNote): string {
  if (h.key.startsWith("fin_h_column|")) return `${h.key.split("|")[1]} · ${mt(lang, "fin_h_column")}`;
  return mt(lang, h.key);
}

export default function FinishedSurfaces({
  lang,
  data,
  shape,
  set,
}: {
  lang: string;
  data: MeasureData;
  shape: MeasureShape;
  set: (fn: (d: MeasureData) => void) => void;
}) {
  const t = (k: string) => mt(lang, k);
  const keys = surfacesFor(data, shape);
  if (!keys.length) return null;
  const sf = data.surfaces || {};
  const heights = heightNotes(data, shape);
  const checks = finishChecks(data, shape).filter((c) => c.level !== "na");
  const risers = finishedRisers(data);
  const riserLine = (detail?: string): string => {
    const r = risers[detail ? Number(detail.slice(1)) - 1 : 0];
    const f = r?.finished.filter((x): x is number => x !== null) || [];
    if (f.length < 2) return "";
    return `${t("fin_first")} ${formatIn(f[0])} · ${t("fin_typical")} ${formatIn(f[Math.floor(f.length / 2)])} · ${t("fin_last")} ${formatIn(f[f.length - 1])}`;
  };
  const put = (k: SurfaceKey, patch: Partial<FutureFinish>) =>
    set((d) => setSurface(d, k, { ...blankFinishFor(), ...(d.surfaces?.[k] || {}), ...patch }));

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {keys.map((k) => {
          const f = { ...blankFinishFor(), ...(sf[k] || {}) };
          const note = finishNote(lang, k, f);
          return (
            <li key={k} className="px-3 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="min-w-0 flex-1 text-[15px] font-semibold text-slate-900">{t(`fin_surf_${k}`)}</span>
                <div role="group" aria-label={`${t(`fin_surf_${k}`)} · ${t("fin_installed")}`} className="flex gap-1 rounded-xl bg-slate-100 p-1">
                  {(["yes", "no"] as const).map((v) => (
                    <button key={v} type="button" aria-pressed={f.installed === v}
                      onClick={() => put(k, { installed: f.installed === v ? "" : v })}
                      className={`min-h-10 rounded-lg px-3.5 text-sm font-semibold ${
                        f.installed === v ? `bg-white shadow-sm ring-1 ring-slate-200 ${v === "no" ? "text-amber-800" : "text-emerald-700"}` : "text-slate-600"
                      }`}>
                      {t(v === "yes" ? "fin_yes" : "fin_no")}
                    </button>
                  ))}
                </div>
              </div>
              {f.installed === "no" && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {finishTypesFor(k).map((ty) => (
                      <button key={ty} type="button" aria-pressed={f.type === ty}
                        onClick={() => put(k, { type: f.type === ty ? "" : ty })}
                        className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${
                          f.type === ty ? "border-indigo-500 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-500" : "border-slate-200 bg-white text-slate-700"
                        }`}>
                        {t(`fin_type_${ty}`)}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <MInput label={t("fin_thickness")} value={f.thickness}
                      placeholder={f.type ? formatIn(FINISH_DEFAULT_IN[f.type]) : undefined}
                      onChange={(v) => put(k, { thickness: v })} />
                  </div>
                  {note && <p className="text-sm text-slate-600">{note}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {(heights.length > 0 || checks.length > 0) && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("fin_heights")}</div>
          <ul className="divide-y divide-slate-100">
            {heights.map((h, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2.5">
                <span className="min-w-0 flex-1 text-sm text-slate-800">{heightLabel(lang, h)}</span>
                <span className="shrink-0 text-sm tabular-nums text-slate-500 line-through decoration-slate-300">{formatIn(h.measured)}</span>
                <span aria-hidden className="text-slate-400">→</span>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums text-slate-900">{formatIn(h.finished)}</span>
              </li>
            ))}
            {checks.map((c, i) => (
              <li key={`c${i}`} className="flex items-center gap-2.5 px-3 py-2.5">
                <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${DOT[c.level]}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-slate-800">{t(`check_${c.key}`)}{c.detail ? <span className="text-slate-500"> · {c.detail}</span> : null}</span>
                  {riserLine(c.detail) && <span className="block text-xs tabular-nums text-slate-500">{riserLine(c.detail)}</span>}
                </span>
                {c.actual !== null && <span className="shrink-0 text-xs tabular-nums text-slate-500">Δ {formatIn(c.actual)} / {formatIn(c.expected ?? 0.375)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
