"use client";

// Canopy sheet: entry canopies, door hoods, pergolas, carports and skylight
// frames. One screen, measured top to bottom:
//
//   kind → drawing + headline numbers → wall → size → heights → support →
//   door → roof & water → on the wall → finish → checks → notes
//
// An empty sheet asks one question (what are we covering); everything after
// that is shown only when it applies to that kind.

import { useMemo, useRef, useState } from "react";
import { revealElement, useMeasureLocate } from "@/lib/shop/measure-locate";
import type { MeasureData } from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import {
  applyKind,
  blankCanopy,
  CANOPY_BACKINGS,
  CANOPY_DATUMS,
  CANOPY_DRAINS,
  CANOPY_FINISHES,
  CANOPY_FLASHINGS,
  CANOPY_GUTTERS,
  CANOPY_KINDS,
  CANOPY_OBSTRUCTIONS,
  CANOPY_ROOFS,
  CANOPY_SUBSTRATES,
  CANOPY_SUPPORTS,
  CANOPY_SWINGS,
  canopyChecks,
  canopyGeometry,
  CANOPY_RULES,
  fmtSlope,
  hasDoor,
  isSkylight,
  newCanopyPost,
  setSupport,
  sheds,
  type CanopyData,
  type CanopyKind,
} from "@/lib/shop/measure-canopy";
import type { CheckLevel, CheckResult } from "@/lib/shop/measure-checks";
import { MInput } from "../fields";
import CanopySketch from "./CanopySketch";
import { fmtLen } from "./StructuralSketch";

type SetFn = (fn: (d: MeasureData) => void) => void;

const DOT: Record<CheckLevel, string> = { green: "bg-emerald-500", yellow: "bg-amber-500", red: "bg-red-500", na: "bg-slate-300" };
const PILL: Record<CheckLevel, string> = {
  green: "bg-green-600/20 border-green-500 text-green-300",
  yellow: "bg-amber-500/15 border-amber-500 text-amber-300",
  red: "bg-red-600/20 border-red-500 text-red-300",
  na: "bg-neutral-800 border-neutral-700 text-neutral-500",
};

export default function CanopySections({ lang, data, set }: { lang: string; data: MeasureData; set: SetFn }) {
  const c = data.canopy ?? null;
  const t = (k: string) => mt(lang, k);
  const [view, setView] = useState<"side" | "front">("side");
  const checks = useMemo(() => canopyChecks(c), [c]);
  const g = useMemo(() => (c ? canopyGeometry(c) : null), [c]);
  const rootRef = useRef<HTMLDivElement>(null);
  // The Next card points at a number or a choice: bring it into view and focus it.
  useMeasureLocate((d) => {
    if (!d.scroll) return;
    requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      const el =
        (d.part && root.querySelector(`[data-cn-field="${d.part}"]`)) ||
        (d.gap === "photo" && document.querySelector("[data-cn-photos]")) ||
        (d.gap && root.querySelector(`[data-gap="${d.gap}"]`)) ||
        null;
      revealElement(el);
      (el as HTMLElement | null)?.querySelector?.("input")?.focus({ preventScroll: true });
    });
  });

  const up = (fn: (x: CanopyData) => void) =>
    set((d) => {
      if (!d.canopy) d.canopy = blankCanopy();
      fn(d.canopy);
    });

  // Nothing chosen yet: one decision on screen.
  if (!c || !c.kind) {
    return (
      <Panel>
        <h2 className="text-xl font-semibold text-slate-900">{t("cn_kindQ")}</h2>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {CANOPY_KINDS.map((k) => (
            <button key={k} type="button" onClick={() => up((x) => applyKind(x, k))}
              className="flex min-h-28 flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-left transition active:scale-[0.98]">
              <KindIcon k={k} />
              <span>
                <span className="block text-[15px] font-semibold text-slate-900">{t(`cn_kind_${k}`)}</span>
                <span className="block text-[13px] text-slate-500">{t(`cn_kindHint_${k}`)}</span>
              </span>
            </button>
          ))}
        </div>
      </Panel>
    );
  }

  const sky = isSkylight(c);
  const reds = checks.filter((k) => k.level === "red").length;
  const yellows = checks.filter((k) => k.level === "yellow").length;
  const of = (keys: string[]) => checks.filter((k) => keys.includes(k.key));

  return (
    <div ref={rootRef} className="space-y-4">
      {/* ---- Kind, drawing, headline numbers ---- */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50"><KindIcon k={c.kind} small /></span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-slate-900">{t(`cn_kind_${c.kind}`)}</h2>
              <label className="relative inline-flex min-h-8 items-center text-[13px] font-semibold text-indigo-700">
                {t("cn_change")} ›
                <select aria-label={t("cn_kindQ")} value={c.kind} onChange={(e) => up((x) => applyKind(x, e.target.value as CanopyKind))} className="absolute inset-0 cursor-pointer opacity-0">
                  {CANOPY_KINDS.map((k) => <option key={k} value={k}>{t(`cn_kind_${k}`)}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {reds > 0 && <span className={`rounded-full border px-2.5 py-1 ${PILL.red}`}>{reds} {t("cn_toFix")}</span>}
            {yellows > 0 && <span className={`rounded-full border px-2.5 py-1 ${PILL.yellow}`}>{yellows} {t("cn_toReview")}</span>}
            {reds === 0 && yellows === 0 && checks.length > 0 && <span className={`rounded-full border px-2.5 py-1 ${PILL.green}`}>✓ {t("cn_allGood")}</span>}
          </div>
        </div>
        {!sky && (
          <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1 sm:max-w-xs">
            {(["side", "front"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
                className={`min-h-9 flex-1 rounded-lg text-sm font-semibold ${view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                {t(v === "side" ? "cn_side" : "cn_front")}
              </button>
            ))}
          </div>
        )}
        <div className="mx-auto mt-3 max-w-[560px] overflow-hidden rounded-xl border border-slate-200">
          <CanopySketch c={c} lang={lang} view={view} />
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          {!sky && <Stat label={t("cn_headroom")} value={fmtLen(g?.lowest)} level={levelOf(checks, "canopy_headroom")} />}
          {sheds(c) && <Stat label={t("cn_slope")} value={fmtSlope(g?.slopePerFt ?? null, t("cn_perFt"))} level={levelOf(checks, "canopy_slope_wall") === "red" ? "red" : levelOf(checks, "canopy_slope")} />}
          {!sky && <Stat label={t("cn_underTrim")} value={fmtLen(g?.trimClear)} level={levelOf(checks, c.support === "tie_rods" ? "canopy_trim_rods" : "canopy_trim")} />}
          {sky && <Stat label={t("cn_length")} value={fmtLen(g?.projection)} />}
          {sky && <Stat label={t("cn_width")} value={fmtLen(g?.width)} />}
        </dl>
      </Panel>

      {/* ---- Wall (or roof) it mounts to ---- */}
      <Panel title={t(sky ? "cn_roofDeck" : "cn_wallTitle")}>
        <Chips label={t("cn_substrate")} value={c.substrate} gap="canopy_substrate" required={!c.substrate}
          options={CANOPY_SUBSTRATES.map((s) => [s, t(`cn_sub_${s}`)] as [string, string])}
          onChange={(v) => up((x) => void (x.substrate = v as CanopyData["substrate"]))} />
        {!sky && (
          <>
            <div className="mt-3">
              <Chips label={t("cn_backing")} value={c.backing}
                options={CANOPY_BACKINGS.map((s) => [s, t(`cn_back_${s}`)] as [string, string])}
                onChange={(v) => up((x) => void (x.backing = v as CanopyData["backing"]))} />
            </div>
            <div className="mt-3">
              <Seg label={t("cn_flashing")} value={c.flashing} gap="canopy_flashing" required={!c.flashing}
                options={CANOPY_FLASHINGS.map((s) => [s, t(`cn_fl_${s}`)] as [string, string])}
                onChange={(v) => up((x) => void (x.flashing = v as CanopyData["flashing"]))} />
            </div>
            <div className="mt-3">
              <MInput label={t("cn_ledgerNote")} placeholder={t("cn_ledgerPh")} value={c.ledgerNote} onChange={(v) => up((x) => void (x.ledgerNote = v))} />
            </div>
          </>
        )}
      </Panel>

      {/* ---- Size + heights: side by side on a tablet ---- */}
      {/* Size + heights side by side on a tablet (the stacked workspace is full width). */}
      <div className="grid items-start gap-4 md:grid-cols-2">
        <Panel title={t("cn_sizeTitle")}>
          <div className="grid grid-cols-2 gap-3">
            <div data-cn-field="width" data-gap="canopy_width"><MInput label={t("cn_width")} value={c.width} gap="canopy_width" onChange={(v) => up((x) => void (x.width = v))} /></div>
            <div data-cn-field="projection" data-gap="canopy_projection"><MInput label={t(sky ? "cn_length" : "cn_projection")} value={c.projection} gap="canopy_projection" onChange={(v) => up((x) => void (x.projection = v))} /></div>
            {sky ? (
              <div data-cn-field="curb" data-gap="canopy_curb"><MInput label={t("cn_curb")} value={c.curb} gap="canopy_curb" onChange={(v) => up((x) => void (x.curb = v))} /></div>
            ) : (
              <MInput label={t("cn_depth")} placeholder={'6"'} value={c.depth} onChange={(v) => up((x) => void (x.depth = v))} />
            )}
            {sheds(c) && <div data-cn-field="fall" data-gap="canopy_fall"><MInput label={t("cn_fall")} value={c.fall} gap="canopy_fall" onChange={(v) => up((x) => void (x.fall = v))} /></div>}
          </div>
          {sheds(c) && (
            <div className="mt-3">
              <Seg label={t("cn_drain")} value={c.drain} gap="canopy_drain" required={!c.drain}
                options={CANOPY_DRAINS.map((s) => [s, t(`cn_drain_${s}`)] as [string, string])}
                onChange={(v) => up((x) => void (x.drain = v as CanopyData["drain"]))} />
            </div>
          )}
          <CheckList lang={lang} checks={of(["canopy_slope_wall", "canopy_slope"])} issuesOnly />
        </Panel>

        {!sky && (
          <Panel title={t("cn_heightTitle")}>
            <Seg label={t("cn_datum")} value={c.datum}
              options={CANOPY_DATUMS.map((s) => [s, t(`cn_datum_${s}`)] as [string, string])}
              onChange={(v) => up((x) => void (x.datum = v as CanopyData["datum"]))} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div data-cn-field="soffitL" data-gap="canopy_soffit_l"><MInput label={t("cn_soffitL")} value={c.soffitL} gap="canopy_soffit_l" onChange={(v) => up((x) => void (x.soffitL = v))} /></div>
              <div data-cn-field="soffitR" data-gap="canopy_soffit_r"><MInput label={t("cn_soffitR")} value={c.soffitR} gap="canopy_soffit_r" onChange={(v) => up((x) => void (x.soffitR = v))} /></div>
              <div className="col-span-2">
                <div data-cn-field="mount" data-gap="canopy_mount"><MInput label={t("cn_mount")} value={c.mount} gap="canopy_mount" onChange={(v) => up((x) => void (x.mount = v))} /></div>
              </div>
            </div>
            <CheckList lang={lang} checks={of(["canopy_headroom", "canopy_trim", "canopy_trim_rods", "canopy_trim_level"])} issuesOnly />
          </Panel>
        )}
      </div>

      {/* ---- Support ---- */}
      {!sky && (
        <Panel title={t("cn_supportTitle")}>
          <Seg bare label={t("cn_supportTitle")} value={c.support} gap="canopy_support" required={!c.support}
            options={CANOPY_SUPPORTS.map((s) => [s, t(`cn_sup_${s}`)] as [string, string])}
            onChange={(v) => up((x) => setSupport(x, v as CanopyData["support"]))} />
          {c.support === "tie_rods" && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div data-cn-field="rodRise" data-gap="canopy_rod_rise"><MInput label={t("cn_rodRise")} value={c.rodRise} gap="canopy_rod_rise" onChange={(v) => up((x) => void (x.rodRise = v))} /></div>
            </div>
          )}
          {c.support === "posts" && (
            <div className="mt-3">
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {c.posts.map((p, i) => (
                  <li key={p.id} className="flex items-end gap-2.5 px-3 py-2.5">
                    <span className="mb-1.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700">{p.label || `P${i + 1}`}</span>
                    <div className="min-w-0 flex-1">
                      <MInput label={t("cn_postHeight")} value={p.height} gap="canopy_post_height"
                        onChange={(v) => up((x) => { const q = x.posts.find((o) => o.id === p.id); if (q) q.height = v; })} />
                    </div>
                    <button type="button" aria-label={`${t("cn_remove")} ${p.label || `P${i + 1}`}`}
                      onClick={() => up((x) => void (x.posts = x.posts.filter((o) => o.id !== p.id)))}
                      className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl text-xl text-slate-400">×</button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => up((x) => void x.posts.push(newCanopyPost(`P${x.posts.length + 1}`)))}
                className="mt-2 min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-indigo-700">
                + {t("cn_addPost")}
              </button>
            </div>
          )}
          <CheckList lang={lang} checks={of(["canopy_proj_tie_rods", "canopy_proj_brackets", "canopy_post_heights"])} issuesOnly />
        </Panel>
      )}

      {/* ---- Door under it ---- */}
      {hasDoor(c) && (
        <Panel title={t("cn_doorTitle")}>
          <Seg label={t("cn_swing")} value={c.door.swing} gap="canopy_door_swing" required={!c.door.swing}
            options={CANOPY_SWINGS.map((s) => [s, t(`cn_swing_${s}`)] as [string, string])}
            onChange={(v) => up((x) => void (x.door.swing = v as CanopyData["door"]["swing"]))} />
          {c.door.swing && c.door.swing !== "none" && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div data-cn-field="doorHead" data-gap="canopy_door_head"><MInput label={t("cn_doorHead")} value={c.door.head} gap="canopy_door_head" onChange={(v) => up((x) => void (x.door.head = v))} /></div>
              {c.door.swing === "out" && <div data-cn-field="doorWidth" data-gap="canopy_door_width"><MInput label={t("cn_doorWidth")} value={c.door.width} gap="canopy_door_width" onChange={(v) => up((x) => void (x.door.width = v))} /></div>}
            </div>
          )}
          <CheckList lang={lang} checks={of(["canopy_door_head", "canopy_door_swing"])} issuesOnly />
        </Panel>
      )}

      {/* ---- Roof & water ---- */}
      <Panel title={t("cn_roofTitle")}>
        <Seg label={t("cn_roof")} value={c.roof} gap="canopy_roof" required={!c.roof}
          options={CANOPY_ROOFS.filter((r) => r !== "open" || c.kind === "pergola" || c.roof === "open").map((s) => [s, t(`cn_roof_${s}`)] as [string, string])}
          onChange={(v) => up((x) => void (x.roof = v as CanopyData["roof"]))} />
        {sheds(c) && !sky && (
          <div className="mt-3 space-y-3">
            <Seg label={t("cn_gutter")} value={c.gutter} gap="canopy_gutter"
              options={CANOPY_GUTTERS.map((s) => [s, t(`cn_gutter_${s}`)] as [string, string])}
              onChange={(v) => up((x) => void (x.gutter = v as CanopyData["gutter"]))} />
            {c.gutter && c.gutter !== "none" && (
              <div className="grid grid-cols-2 gap-3">
                <Seg label={t("cn_downspout")} value={c.downspout} small
                  options={[["left", t("cn_left")], ["right", t("cn_right")]]}
                  onChange={(v) => up((x) => void (x.downspout = v as CanopyData["downspout"]))} />
                {c.gutter === "front" && <MInput label={t("cn_gutterDrop")} value={c.gutterDrop} onChange={(v) => up((x) => void (x.gutterDrop = v))} />}
              </div>
            )}
          </div>
        )}
        {sheds(c) && (
          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{t("cn_snow")}</span>
                <span className="block text-[13px] text-slate-500">{t("cn_snowNote")}</span>
              </span>
              <Switch on={c.snow} onChange={(v) => up((x) => void (x.snow = v))} label={t("cn_snow")} />
            </label>
            {c.snow && (
              <div className="mt-2">
                <Seg label={t("cn_engineer")} value={c.engineer} small options={[["yes", t("cn_yes")], ["no", t("cn_no")]]}
                  onChange={(v) => up((x) => void (x.engineer = v as CanopyData["engineer"]))} />
              </div>
            )}
          </div>
        )}
        <CheckList lang={lang} checks={of(["canopy_snow"])} issuesOnly />
      </Panel>

      {/* ---- On the wall: lights, cameras … ---- */}
      {!sky && (
        <Panel title={t("cn_obsTitle")}>
          <div className="flex flex-wrap gap-2">
            {CANOPY_OBSTRUCTIONS.map((o) => {
              const on = c.obstructions.includes(o);
              return (
                <button key={o} type="button" aria-pressed={on}
                  onClick={() => up((x) => void (x.obstructions = on ? x.obstructions.filter((y) => y !== o) : [...x.obstructions, o]))}
                  className={`min-h-11 rounded-full border px-3.5 text-sm font-semibold transition ${on ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600"}`}>
                  {t(`cn_obs_${o}`)}
                </button>
              );
            })}
          </div>
          {c.obstructions.length > 0 && (
            <div className="mt-3">
              <MInput label={t("cn_obsNote")} placeholder="—" value={c.obstructionNote} onChange={(v) => up((x) => void (x.obstructionNote = v))} />
            </div>
          )}
        </Panel>
      )}

      {/* ---- Finish ---- */}
      <Panel title={t("cn_finishTitle")}>
        <Seg bare label={t("cn_finishTitle")} value={c.finish} gap="canopy_finish"
          options={CANOPY_FINISHES.map((s) => [s, t(`cn_fin_${s}`)] as [string, string])}
          onChange={(v) => up((x) => void (x.finish = v as CanopyData["finish"]))} />
      </Panel>

      {/* ---- Every check, one place ---- */}
      {checks.length > 0 && (
        <Panel title={t("cn_checksTitle")} aside={reds + yellows ? `${reds + yellows}` : "✓"}>
          <CheckList lang={lang} checks={checks} collapsePassed />
        </Panel>
      )}

      <Panel>
        <label className="block">
          <span className="mb-1 block text-[13px] text-neutral-400">{t("cn_notes")}</span>
          <textarea value={c.notes} onChange={(e) => up((x) => void (x.notes = e.target.value))} rows={3}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-2.5 text-base" />
        </label>
      </Panel>
    </div>
  );
}

function levelOf(checks: CheckResult[], key: string): CheckLevel {
  return checks.find((c) => c.key === key)?.level ?? "na";
}

// ---- Check lines ---------------------------------------------------------------

const CHECK_LABELS: Record<string, [string, string]> = {
  canopy_headroom: ["cn_lbl_min", "cn_lbl_have"],
  canopy_trim: ["cn_lbl_trim", "cn_lbl_top"],
  canopy_trim_rods: ["cn_lbl_trim", "cn_lbl_top"],
  canopy_trim_level: ["cn_lbl_left", "cn_lbl_right"],
  canopy_proj_tie_rods: ["cn_lbl_max", "cn_lbl_have"],
  canopy_proj_brackets: ["cn_lbl_max", "cn_lbl_have"],
  canopy_post_heights: ["cn_lbl_low", "cn_lbl_high"],
  canopy_door_head: ["cn_lbl_door", "cn_lbl_under"],
  canopy_door_swing: ["cn_lbl_door", "cn_lbl_under"],
  canopy_snow: ["cn_lbl_max", "cn_lbl_have"],
};

export function canopyCheckLine(lang: string, c: CheckResult): string {
  if (c.key === "canopy_slope" || c.key === "canopy_slope_wall") return c.actual === null ? "" : `${mt(lang, "cn_lbl_min")} ${fmtSlope(CANOPY_RULES.minSlopePerFt, mt(lang, "cn_perFt"))} · ${mt(lang, "cn_lbl_have")} ${fmtSlope(c.actual, mt(lang, "cn_perFt"))}`;
  if (c.expected === null || c.actual === null) return "";
  const l = CHECK_LABELS[c.key];
  if (l) return `${mt(lang, l[0])} ${fmtLen(c.expected)} · ${mt(lang, l[1])} ${fmtLen(c.actual)}`;
  return `${fmtLen(c.expected)} / ${fmtLen(c.actual)}`;
}

function CheckList({ lang, checks, issuesOnly = false, collapsePassed = false }: { lang: string; checks: CheckResult[]; issuesOnly?: boolean; collapsePassed?: boolean }) {
  const [showPassed, setShowPassed] = useState(false);
  const order: Record<CheckLevel, number> = { red: 0, yellow: 1, green: 2, na: 3 };
  const sorted = [...checks].sort((a, b) => order[a.level] - order[b.level]);
  const issues = sorted.filter((c) => c.level === "red" || c.level === "yellow");
  const passed = sorted.filter((c) => c.level === "green");
  const shown = issuesOnly || (collapsePassed && !showPassed) ? issues : sorted;
  if (!shown.length && !(collapsePassed && passed.length)) return null;
  return (
    <div className="mt-3">
      {shown.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {shown.map((c, i) => (
            <li key={i} className="flex items-start gap-2.5 px-3 py-2.5">
              <span aria-hidden="true" className={`mt-1.5 size-2.5 shrink-0 rounded-full ${DOT[c.level]}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-slate-800">{mt(lang, `check_${c.key}`)}{c.detail ? <span className="text-slate-500"> · {c.detail}</span> : null}</span>
                {canopyCheckLine(lang, c) && <span className="block text-[13px] tabular-nums text-slate-500">{canopyCheckLine(lang, c)}</span>}
              </span>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold uppercase ${PILL[c.level]}`}>
                {mt(lang, c.level === "green" ? "cn_ok" : c.level === "yellow" ? "cn_review" : "cn_fix")}
              </span>
            </li>
          ))}
        </ul>
      )}
      {collapsePassed && passed.length > 0 && (
        <button type="button" onClick={() => setShowPassed(!showPassed)} className="mt-2 flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-700">
          <span aria-hidden="true" className={`size-2.5 rounded-full ${DOT.green}`} />
          {showPassed ? mt(lang, "cn_hidePassed") : `${passed.length} ${mt(lang, "cn_passed")}`}
        </button>
      )}
    </div>
  );
}

// ---- Small parts ---------------------------------------------------------------

/** One card per group, like the other own-form sheets in the stacked workspace. */
function Panel({ title, aside, children }: { title?: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      {title && (
        <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
          {title}
          {aside && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{aside}</span>}
        </h3>
      )}
      {children}
    </section>
  );
}

function Stat({ label, value, level = "na" }: { label: string; value: string; level?: CheckLevel }) {
  const tone = level === "red" ? "text-red-600" : level === "yellow" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[13px] font-medium leading-tight text-slate-500">
        {level !== "na" && <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${DOT[level]}`} />}
        {label}
      </dt>
      <dd className={`mt-0.5 whitespace-nowrap text-[15px] font-semibold leading-tight tabular-nums sm:text-lg ${tone}`}>{value}</dd>
    </div>
  );
}

function Seg({ label, value, options, onChange, required = false, small = false, bare = false, gap }: { gap?: string; label: string; value: string; options: [string, string][]; onChange: (v: string) => void; required?: boolean; small?: boolean; bare?: boolean }) {
  return (
    <div role="group" aria-label={label} className="min-w-0" data-gap={gap}>
      {!bare && <div className={`mb-1 text-[13px] ${required ? "text-red-300" : "text-neutral-400"}`}>{label}</div>}
      <div className={`${options.length > 3 ? "grid grid-cols-2 sm:flex" : "flex sm:max-w-md"} gap-1 rounded-xl bg-slate-100 p-1 ${required ? "ring-1 ring-red-400" : ""}`}>
        {options.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(value === v ? "" : v)}
            className={`${small ? "min-h-9 text-[13px]" : "min-h-11 text-sm"} min-w-0 flex-1 rounded-lg px-2 font-semibold transition ${
              value === v ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200" : "text-slate-600"
            }`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Many short options: wrapping pills instead of a cramped segmented track. */
function Chips({ label, value, options, onChange, required = false, gap }: { gap?: string; label: string; value: string; options: [string, string][]; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div role="group" aria-label={label} className="min-w-0" data-gap={gap}>
      <div className={`mb-1.5 text-[13px] ${required ? "text-red-300" : "text-neutral-400"}`}>{label}</div>
      <div className={`flex flex-wrap gap-2 ${required ? "rounded-xl p-1 ring-1 ring-red-400" : ""}`}>
        {options.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(value === v ? "" : v)}
            className={`min-h-11 rounded-full border px-3.5 text-sm font-semibold transition ${value === v ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600"}`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={(e) => { e.preventDefault(); onChange(!on); }}
      className={`relative h-8 w-[52px] shrink-0 rounded-full transition ${on ? "bg-indigo-600" : "bg-slate-300"}`}>
      <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[24px]" : "left-1"}`} />
    </button>
  );
}

export function KindIcon({ k, small = false }: { k: CanopyKind; small?: boolean }) {
  const s = small ? 28 : 40;
  const c = { width: s, height: s * 0.7, viewBox: "0 0 40 28", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: "text-indigo-600" };
  switch (k) {
    case "entry":
      return <svg {...c}><path d="M4 2v24M4 9l28 3M4 3l27 8M10 26V15h9v11" /></svg>;
    case "door_hood":
      return <svg {...c}><path d="M8 2v24M8 9l20 2M8 16l8-6M13 26V14h8v12" /></svg>;
    case "pergola":
      return <svg {...c}><path d="M3 7h34M8 4v3M14 4v3M20 4v3M26 4v3M32 4v3M7 7v19M33 7v19M2 26h36" /></svg>;
    case "carport":
      return <svg {...c}><path d="M3 6l34 3M5 6v20M35 9v17M10 22h18l-2-5H12zM2 26h36" /></svg>;
    case "skylight":
      return <svg {...c}><path d="M2 24L38 10M12 20l-2-6 16-6 2 6M10 14l16-6" /></svg>;
  }
}
