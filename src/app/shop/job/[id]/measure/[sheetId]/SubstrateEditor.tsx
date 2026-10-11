"use client";

// One mounting editor for every work type: what a post, bracket, hinge, jamb or
// bearing fastens into, how, how close to the edge, and what the shop should
// anchor it with. Collapses to a one-line summary once answered so a run of
// twenty posts reads as twenty lines, and "Same as previous" / "Apply to all"
// make the common case — every post into the same granite — one tap.

import { createContext, useContext, useState } from "react";
import type { MeasureData, MeasureShape, PostMeasure } from "@/lib/shop/measure";
import type { CheckLevel } from "@/lib/shop/measure-checks";
import { formatIn } from "@/lib/shop/measure-parse";
import { mt } from "@/lib/shop/measure-i18n";
import {
  DEFAULT_MOUNT,
  SUB_CONDITIONS,
  SUB_HIDDEN,
  SUB_MATERIALS,
  SUB_MOUNTS,
  anchorFor,
  applySubToAll,
  blankSubstrate,
  copySub,
  getSub,
  mountLocations,
  previousSub,
  setSub,
  siblingKeys,
  substrateChecks,
  subFilled,
  suggestAnchor,
  type SubMaterial,
  type SubMount,
  type Substrate,
} from "@/lib/shop/measure-substrate";
import { MInput } from "./fields";

export interface SubstrateCtxValue {
  data: MeasureData;
  set: (fn: (d: MeasureData) => void) => void;
  shape: MeasureShape;
  lang: string;
  posts?: PostMeasure[];
  onPhoto?: (slot: string, label: string) => void;
}

/** Provided once by the editor so any section can drop a SubstrateEditor in. */
export const SubstrateCtx = createContext<SubstrateCtxValue | null>(null);

const DOT: Record<CheckLevel, string> = { green: "bg-emerald-500", yellow: "bg-amber-500", red: "bg-red-500", na: "bg-slate-300" };
const ORDER: Record<CheckLevel, number> = { red: 0, yellow: 1, green: 2, na: 3 };

/** Materials whose hidden contents (radiant heat, conduit, PT tendons) matter. */
const SLABBY: SubMaterial[] = ["poured_concrete", "precast", "tile_slab", "block_hollow", "block_filled", "brick", "stone"];

/** Material lists per context — a structural bearing is never on composite decking. */
export const MATERIALS_MASONRY_STEEL: SubMaterial[] = ["poured_concrete", "brick", "stone", "block_hollow", "block_filled", "wood_framing", "steel"];
export const MATERIALS_WALL: SubMaterial[] = ["brick", "stone", "poured_concrete", "block_hollow", "block_filled", "wood_framing", "stucco", "siding", "steel"];
export const MATERIALS_GROUND: SubMaterial[] = ["poured_concrete", "precast", "brick", "stone", "block_filled", "wood_framing", "steel", "existing_iron"];

export function slotFor(key: string): string {
  return `sub:${key}`.slice(0, 60);
}

function worst(levels: CheckLevel[]): CheckLevel {
  return levels.sort((a, b) => ORDER[a] - ORDER[b])[0] || "na";
}

export function subSummary(lang: string, sub: Substrate): string {
  const t = (k: string) => mt(lang, k);
  return [
    sub.material && t(`sub_mat_${sub.material}`),
    sub.condition && t(`sub_cond_${sub.condition}`),
    sub.mount && t(`sub_mount_${sub.mount}`),
    sub.edgeDist.trim() && `${sub.edgeDist.trim()} ${t("sub_edge").toLowerCase()}`,
  ].filter(Boolean).join(" · ");
}

export function anchorText(lang: string, sub: Substrate): string {
  const a = anchorFor(sub);
  if (!a) return "";
  return a.suggested ? mt(lang, `sub_anchor_${a.key}`) : a.key;
}

export default function SubstrateEditor({
  locKey,
  title,
  materials = [...SUB_MATERIALS],
  mounts = [...SUB_MOUNTS],
  hide = [],
}: {
  locKey: string;
  /** Heading above the editor; defaults to "Mounting". */
  title?: string;
  materials?: SubMaterial[];
  mounts?: SubMount[];
  hide?: ("depth" | "mount" | "edge" | "photo")[];
}) {
  const ctx = useContext(SubstrateCtx);
  const stored = ctx ? getSub(ctx.data, locKey) : undefined;
  const filled = subFilled(stored);
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [applied, setApplied] = useState(0);
  if (!ctx) return null;
  const { data, set, shape, lang } = ctx;
  const t = (k: string) => mt(lang, k);
  const sub: Substrate = stored ?? blankSubstrate();
  const up = (patch: Partial<Substrate>) => set((d) => setSub(d, locKey, { ...(getSub(d, locKey) ?? blankSubstrate()), ...patch }));

  const prev = previousSub(data, shape, locKey);
  const siblings = siblingKeys(data, shape, locKey);
  const checks = substrateChecks(sub, "");
  const issues = checks.filter((c) => c.level === "red" || c.level === "yellow").sort((a, b) => ORDER[a.level] - ORDER[b.level]);
  const level = filled ? worst(checks.map((c) => c.level)) : "na";
  const sg = suggestAnchor(sub.material, sub.mount, sub.hidden, sub.scanned);
  const slot = slotFor(locKey);
  const hasPhoto = data.photos.some((p) => p.slot === slot);
  const locLabel = mountLocations(data, shape, t, ctx.posts).find((l) => l.key === locKey)?.label || "";
  const heading = title ?? t("sub_title");

  // ---- Answered: one line, tap to change --------------------------------------
  if (filled && !open) {
    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-white">
        <button type="button" onClick={() => setOpen(true)} aria-expanded={false}
          className="flex w-full min-h-12 items-start gap-3 px-3 py-2.5 text-left">
          <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${DOT[level]}`} />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">{heading}</span>
            <span className="block text-sm font-semibold text-slate-900">{subSummary(lang, sub)}</span>
            <span className="block text-xs text-slate-600">{anchorText(lang, sub)}{hasPhoto ? " · 📷" : ""}</span>
            {issues.length > 0 && <span className={`mt-0.5 block text-xs font-semibold ${issues[0].level === "red" ? "text-red-600" : "text-amber-700"}`}>{t(`check_${issues[0].key}`)}</span>}
          </span>
          <span className="shrink-0 self-center text-sm font-semibold text-indigo-700">{t("sub_change")} ›</span>
        </button>
      </div>
    );
  }

  const chip = (on: boolean) =>
    `min-h-11 rounded-xl border px-3 text-left text-sm font-semibold leading-tight transition ${
      on ? "border-indigo-500 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-500" : "border-slate-200 bg-white text-slate-700"
    }`;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3" role="group" aria-label={`${heading}${locLabel ? ` · ${locLabel}` : ""}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{heading}</span>
        {filled && <span aria-hidden className={`size-2 rounded-full ${DOT[level]}`} />}
        {filled && (
          <button type="button" onClick={() => setOpen(false)} className="ml-auto min-h-9 rounded-lg px-2 text-sm font-semibold text-indigo-700">
            ✓ OK
          </button>
        )}
      </div>

      {!filled && prev && (
        <button type="button" onClick={() => set((d) => setSub(d, locKey, copySub(prev, getSub(d, locKey))))}
          className="mb-3 flex w-full min-h-12 items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 text-left text-sm font-semibold text-indigo-700">
          <span aria-hidden>↺</span>
          <span className="min-w-0 flex-1 truncate">{t("sub_same")} · <span className="font-normal text-slate-600">{subSummary(lang, prev)}</span></span>
        </button>
      )}

      <div className="mb-1 text-[11px] text-neutral-400">{t("sub_material")}</div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {materials.map((m) => (
          <button key={m} type="button" aria-pressed={sub.material === m}
            onClick={() => up({ material: sub.material === m ? "" : m })} className={chip(sub.material === m)}>
            {t(`sub_mat_${m}`)}
          </button>
        ))}
      </div>

      {filled && (
        <div className="mt-3 space-y-3">
          {!hide.includes("mount") && (
            <div>
              <div className="mb-1 text-[11px] text-neutral-400">{t("sub_mount")}</div>
              <div className="flex flex-wrap gap-1.5">
                {mounts.map((m) => {
                  const on = (sub.mount || "") === m;
                  const usual = !sub.mount && DEFAULT_MOUNT[sub.material as SubMaterial] === m;
                  return (
                    <button key={m} type="button" aria-pressed={on} onClick={() => up({ mount: on ? "" : m })}
                      className={`${chip(on)} ${usual ? "border-dashed border-indigo-300" : ""}`}>
                      {t(`sub_mount_${m}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(!hide.includes("edge") || !hide.includes("depth")) && (
            <div className="grid grid-cols-2 gap-3">
              {!hide.includes("edge") && (
                <MInput label={`${t("sub_edge")}${sg?.minEdge != null ? ` · ${t("sub_min")} ${formatIn(sg.minEdge)}` : ""}`}
                  value={sub.edgeDist} onChange={(v) => up({ edgeDist: v })} />
              )}
              {!hide.includes("depth") && (
                <MInput label={`${t("sub_depth")}${sg?.minDepth != null && (sub.mount || DEFAULT_MOUNT[sub.material as SubMaterial]) === "core_drill" ? ` · ${t("sub_min")} ${formatIn(sg.minDepth)}` : ""}`}
                  value={sub.depth} onChange={(v) => up({ depth: v })} />
              )}
            </div>
          )}

          <div>
            <div className="mb-1 text-[11px] text-neutral-400">{t("sub_condition")}</div>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {SUB_CONDITIONS.map((c) => (
                <button key={c} type="button" aria-pressed={sub.condition === c} onClick={() => up({ condition: sub.condition === c ? "" : c })}
                  className={`min-h-10 min-w-0 flex-1 rounded-lg px-1 text-xs font-semibold sm:text-sm ${
                    sub.condition === c
                      ? c === "rotted" || c === "spalled" ? "bg-white text-red-700 shadow-sm ring-1 ring-red-200"
                        : c === "sound" ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200" : "bg-white text-amber-800 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-600"
                  }`}>
                  {t(`sub_cond_${c}`)}
                </button>
              ))}
            </div>
          </div>

          {SLABBY.includes(sub.material as SubMaterial) && (
            <div>
              <div className="mb-1 text-[11px] text-neutral-400">{t("sub_hidden")}</div>
              <div className="flex flex-wrap gap-1.5">
                {SUB_HIDDEN.map((h) => (
                  <button key={h} type="button" aria-pressed={sub.hidden === h} onClick={() => up({ hidden: sub.hidden === h ? "" : h })}
                    className={chip(sub.hidden === h)}>
                    {t(`sub_hidden_${h}`)}
                  </button>
                ))}
              </div>
              {sub.hidden && sub.hidden !== "none" && (
                <Toggle on={sub.scanned} label={t("sub_scanned")} onChange={(v) => up({ scanned: v })} />
              )}
            </div>
          )}
          {(sub.material === "stucco" || sub.material === "siding") && (
            <Toggle on={sub.standoff} label={t("sub_standoff")} onChange={(v) => up({ standoff: v })} />
          )}
          {(sub.material === "wood_deck" || sub.material === "composite") && (
            <Toggle on={sub.blocking} label={t("sub_blocking")} onChange={(v) => up({ blocking: v })} />
          )}

          {/* The anchor the shop orders. Suggested from material + mount; the
              crew can name a different one under More. */}
          <div className={`rounded-xl px-3 py-2.5 ${sg?.anchor === "scan_first" ? "bg-red-50 text-red-800" : "bg-indigo-50 text-indigo-900"}`}>
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{sub.anchor.trim() ? t("sub_anchor") : t("sub_suggested")}</div>
            <div className="text-sm font-semibold">{anchorText(lang, sub)}</div>
            {sg && (sg.minEdge != null || sg.minDepth != null) && (
              <div className="text-xs opacity-80">
                {[sg.minEdge != null && `${t("sub_min")} ${formatIn(sg.minEdge)} ${t("sub_edge").toLowerCase()}`, sg.minDepth != null && `${t("sub_min")} ${formatIn(sg.minDepth)} ${t("sub_depth").toLowerCase()}`].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>

          {issues.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {issues.map((c, i) => (
                <li key={i} className="flex items-center gap-2.5 px-3 py-2">
                  <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${DOT[c.level]}`} />
                  <span className="min-w-0 flex-1 text-sm text-slate-800">{t(`check_${c.key}`)}</span>
                  {c.expected !== null && c.actual !== null && (
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">{formatIn(c.actual)} / {t("sub_min")} {formatIn(c.expected)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className="flex min-h-10 items-center gap-1.5 text-sm font-semibold text-indigo-700">
            <span aria-hidden className={`inline-block transition ${more ? "rotate-90" : ""}`}>›</span>
            {t(more ? "sub_less" : "sub_more")}
          </button>
          {more && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="mb-1 block text-[11px] text-neutral-400">{t("sub_anchorUsed")}</span>
                <input value={sub.anchor} maxLength={120} onChange={(e) => up({ anchor: e.target.value })} placeholder={anchorText(lang, { ...sub, anchor: "" })}
                  className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-base" />
              </label>
              <label className="block min-w-0">
                <span className="mb-1 block text-[11px] text-neutral-400">{t("sub_note")}</span>
                <input value={sub.note} maxLength={300} onChange={(e) => up({ note: e.target.value })} placeholder="—"
                  className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-base" />
              </label>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {siblings.length > 1 && (
              <button type="button"
                onClick={() => { let n = 0; set((d) => { n = applySubToAll(d, shape, locKey); }); setApplied(n || siblings.length - 1); }}
                className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800">
                {applied ? `✓ ${t("sub_applied")} · ${applied}` : `${t("sub_applyAll")} (${siblings.length})`}
              </button>
            )}
            {!hide.includes("photo") && ctx.onPhoto && (
              <button type="button" onClick={() => ctx.onPhoto?.(slot, `${heading}${locLabel ? ` · ${locLabel}` : ""}`)}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800">
                📷 {t("sub_photo")}{hasPhoto ? " ✓" : ""}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <label className="mt-2 flex min-h-11 items-center gap-3">
      <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">{label}</span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
        className={`relative h-8 w-[52px] shrink-0 rounded-full transition ${on ? "bg-emerald-500" : "bg-slate-300"}`}>
        <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[24px]" : "left-1"}`} />
      </button>
    </label>
  );
}
