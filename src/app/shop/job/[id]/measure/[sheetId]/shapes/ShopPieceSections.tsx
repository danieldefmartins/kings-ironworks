"use client";

// Shop pieces: bar / counter frames, wine racks, brackets, shelf frames, sign
// brackets, furniture bases, grilles to a drawing. One screen:
//
//   drawing (front + side · 3D) → how it is mounted → pieces & sizes →
//   materials → finish → load → reference → checks
//
// Each piece ends in the size the shop builds to, with the terms that made it.

import { useMemo, useState } from "react";
import type { MeasureData } from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import {
  blankShopPiece,
  bottleLoad,
  D_KEYS,
  DESIGN_KEYS,
  H_KEYS,
  newShopPiece,
  newSpMaterial,
  pieceQty,
  pieceTag,
  shopPieceChecks,
  shopPieceGaps,
  SP_FINISHES,
  SP_LOADS,
  SP_MOUNTS,
  SP_SUBSTRATES,
  SP_TOL,
  SP_TYPES,
  spFabSize,
  spreadOf,
  W_KEYS,
  type ShopPiece,
  type ShopPieceData,
} from "@/lib/shop/measure-shop-piece";
import type { CheckResult } from "@/lib/shop/measure-checks";
import { MInput } from "../fields";
import SceneViewport from "../SceneViewport";
import ShopPieceSketch from "./ShopPieceSketch";
import { CheckList, Chips, DeltaBadge, DOT, fmtIn, Group, More, Notes, Panel, Seg, Stat, StatusPills, Stepper, SwitchRow, ViewToggle, worst, type CheckLabels } from "./MeasureFormKit";

type SetFn = (fn: (d: MeasureData) => void) => void;

export const SP_CHECK_LABELS: CheckLabels = {
  sp_square: ["sp_lbl_short", "sp_lbl_long"],
  sp_width_spread: ["sp_lbl_min", "sp_lbl_max"],
  sp_height_spread: ["sp_lbl_min", "sp_lbl_max"],
  sp_depth_spread: ["sp_lbl_min", "sp_lbl_max"],
};

const MATERIAL_PRESETS = ['1 1/2" sq tube 11ga', '1" sq tube 14ga', '2x1 tube 11ga', '1 1/2" angle 3/16', '1/4" plate', '3/4" sq bar', '1/2" round bar'];

export default function ShopPieceSections({ lang, data, set }: { lang: string; data: MeasureData; set: SetFn }) {
  const d = data.shopPiece ?? null;
  const t = (k: string) => mt(lang, k);
  const checks = useMemo(() => shopPieceChecks(d), [d]);
  const gaps = useMemo(() => shopPieceGaps(d, data.photos), [d, data.photos]);
  const [openId, setOpenId] = useState<string | null>(() => d?.pieces[0]?.id ?? null);
  const [view, setView] = useState("draw");

  const up = (fn: (x: ShopPieceData) => void) =>
    set((m) => {
      if (!m.shopPiece) m.shopPiece = blankShopPiece();
      fn(m.shopPiece);
    });

  if (!d) {
    return (
      <Panel>
        <button type="button" onClick={() => up(() => {})} className="min-h-12 w-full rounded-xl bg-indigo-600 px-4 font-semibold text-white">{t("sp_start")}</button>
      </Panel>
    );
  }

  const shown = d.pieces.find((p) => p.id === openId) ?? d.pieces[0] ?? null;
  const shownFab = shown ? spFabSize(d, shown) : null;
  const pieces = d.pieces.reduce((n, p) => n + pieceQty(p), 0);
  const fabGaps = gaps.filter((g) => (g.tier || "fab") === "fab").length;
  const lb = bottleLoad(d);
  const first = d.pieces[0];

  return (
    <div className="space-y-4">
      {/* ---- Drawing + summary ---- */}
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{first?.type && d.pieces.length === 1 ? t(`sp_type_${first.type}`) : t("sp_title")}</h2>
            <p className="mt-0.5 text-[15px] text-slate-500">
              {`${pieces} ${t(pieces === 1 ? "sp_piece" : "sp_pieces")}${d.mount ? ` · ${t(`sp_mount_${d.mount}`)}` : ""}${d.niche ? ` · ${t("sp_inNiche")}` : ""}`}
            </p>
          </div>
          <StatusPills lang={lang} checks={checks} gaps={fabGaps} />
        </div>
        <div className="mt-3 flex justify-center">
          <ViewToggle label={t("wc_views")} value={view} onChange={setView} options={[["draw", t("sp_drawing")], ["3d", "3D"]]} />
        </div>
        <div className="mx-auto mt-3 max-w-[960px] overflow-hidden rounded-xl border border-slate-200">
          {view === "draw" ? <ShopPieceSketch d={d} piece={shown} lang={lang} /> : <SceneViewport data={data} lang={lang} className="!rounded-none !border-0 !shadow-none" />}
        </div>
        {d.pieces.length > 1 && view === "draw" && (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {d.pieces.map((p, i) => (
              <button key={p.id} type="button" aria-pressed={shown?.id === p.id} onClick={() => setOpenId(p.id)}
                className={`min-h-9 rounded-full border px-3 text-[13px] font-semibold ${shown?.id === p.id ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}>
                {pieceTag(p, i)}
              </button>
            ))}
          </div>
        )}
        <dl className="mt-3 grid grid-cols-3 gap-2">
          <Stat label={t("sp_buildW")} value={fmtIn(shownFab?.width)} />
          <Stat label={t("sp_buildH")} value={fmtIn(shownFab?.height)} />
          <Stat label={t("sp_buildD")} value={fmtIn(shownFab?.depth)} />
        </dl>
      </Panel>

      {/* ---- Mounting ---- */}
      <Panel title={t("sp_mountTitle")}>
        <Seg label={t("sp_mount")} value={d.mount} required={!d.mount} cols={3}
          options={SP_MOUNTS.map((k) => [k, t(`sp_mount_${k}`)] as [string, string])}
          onChange={(v) => up((x) => void (x.mount = v as ShopPieceData["mount"]))} />
        <div className="mt-3">
          <SwitchRow label={t("sp_niche")} on={d.niche} onChange={(v) => up((x) => void (x.niche = v))} />
        </div>
        {d.niche && (
          <div className="mt-3">
            <MInput label={t("sp_clearance")} value={d.clearance} gap="sp_clearance" onChange={(v) => up((x) => void (x.clearance = v))} />
            <Chips value={d.clearance} onPick={(v) => up((x) => void (x.clearance = v))} options={[['1/8"', '1/8"'], ['1/4"', '1/4"'], ['3/8"', '3/8"'], ['1/2"', '1/2"']]} />
          </div>
        )}
        {(d.mount === "wall" || d.mount === "counter") && (
          <div className="mt-3">
            <Seg label={t("sp_substrate")} value={d.substrate} required={!d.substrate} cols={3}
              options={SP_SUBSTRATES.map((k) => [k, t(`sp_sub_${k}`)] as [string, string])}
              onChange={(v) => up((x) => void (x.substrate = v as ShopPieceData["substrate"]))} />
            <More lang={lang}>
              <MInput label={t("sp_fastener")} placeholder={t("sp_fastenerPh")} value={d.fastener} onChange={(v) => up((x) => void (x.fastener = v))} />
            </More>
          </div>
        )}
      </Panel>

      {/* ---- Pieces ---- */}
      <Panel title={t("sp_piecesTitle")} aside={`${d.pieces.length}`}>
        <div className="space-y-2.5">
          {d.pieces.map((p, i) => (
            <PieceCard key={p.id} lang={lang} d={d} p={p} i={i} open={openId === p.id || (!openId && i === 0)}
              checks={checks.filter((c) => c.detail === pieceTag(p, i) || (c.detail || "").startsWith(`${pieceTag(p, i)} `))}
              gapCount={gaps.filter((g) => (g.tier || "fab") === "fab" && g.detail === pieceTag(p, i)).length}
              onToggle={() => setOpenId(openId === p.id ? null : p.id)}
              update={(fn) => up((x) => { const pp = x.pieces[i]; if (pp && pp.id === p.id) fn(pp); })}
              onRemove={d.pieces.length > 1 ? () => up((x) => void (x.pieces = x.pieces.filter((o) => o.id !== p.id))) : undefined}
              onDuplicate={() => { const copy = newShopPiece({ ...structuredClone(p), label: "" }); up((x) => void x.pieces.splice(i + 1, 0, structuredClone(copy))); setOpenId(copy.id); }} />
          ))}
        </div>
        <button type="button" onClick={() => { const p = newShopPiece({ type: d.pieces[d.pieces.length - 1]?.type || "" }); up((x) => void x.pieces.push(structuredClone(p))); setOpenId(p.id); }}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-[15px] font-semibold text-indigo-700">
          + {t("sp_addPiece")}
        </button>
      </Panel>

      {/* ---- Materials ---- */}
      <Panel title={t("sp_materialsTitle")}>
        <div className="space-y-2">
          {d.materials.map((m, i) => (
            <div key={m.id} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-end gap-2">
              <MInput label={i === 0 ? t("sp_profile") : undefined} placeholder='1 1/2" sq tube 11ga' value={m.profile} onChange={(v) => up((x) => void (x.materials[i].profile = v))} />
              <MInput label={i === 0 ? t("sp_use") : undefined} placeholder={t("sp_usePh")} value={m.use} onChange={(v) => up((x) => void (x.materials[i].use = v))} />
              <button type="button" aria-label={t("st_remove")} onClick={() => up((x) => void x.materials.splice(i, 1))} className="mb-0.5 size-11 rounded-lg text-lg text-slate-400">×</button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {MATERIAL_PRESETS.filter((p) => !d.materials.some((m) => m.profile === p)).slice(0, d.materials.length ? 4 : 7).map((p) => (
            <button key={p} type="button" onClick={() => up((x) => void x.materials.push(newSpMaterial({ profile: p })))}
              className="min-h-9 rounded-full border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600">+ {p}</button>
          ))}
          <button type="button" onClick={() => up((x) => void x.materials.push(newSpMaterial()))} className="min-h-9 rounded-full px-3 text-[13px] font-semibold text-indigo-700">+ {t("sp_otherMaterial")}</button>
        </div>
      </Panel>

      <div className="grid items-start gap-4 md:grid-cols-2">
        {/* ---- Finish ---- */}
        <Panel title={t("wc_finishTitle")}>
          <Seg label={t("st_finish")} value={d.finish} required={!d.finish} cols={3}
            options={SP_FINISHES.map((f) => [f, t(`sp_fin_${f}`)] as [string, string])}
            onChange={(v) => up((x) => void (x.finish = v as ShopPieceData["finish"]))} />
          <div className="mt-3">
            <MInput label={t("st_color")} placeholder="—" value={d.color} onChange={(v) => up((x) => void (x.color = v))} />
          </div>
        </Panel>

        {/* ---- Load ---- */}
        <Panel title={t("sp_loadTitle")}>
          <Seg label={t("sp_load")} value={d.load} required={!d.load} cols={3}
            options={SP_LOADS.map((k) => [k, t(`sp_load_${k}`)] as [string, string])}
            onChange={(v) => up((x) => void (x.load = v as ShopPieceData["load"]))} />
          {d.load === "bottles" && (
            <div className="mt-3 grid grid-cols-2 items-end gap-3">
              <MInput label={t("sp_bottles")} placeholder="120" value={d.bottles} gap="sp_bottles" onChange={(v) => up((x) => void (x.bottles = v.replace(/[^0-9]/g, "")))} />
              <div className="pb-3 text-[15px] font-semibold tabular-nums text-slate-700">{lb !== null ? `≈ ${Math.round(lb)} lb` : ""}</div>
            </div>
          )}
          {d.load && d.load !== "none" && (
            <div className="mt-3">
              <MInput label={t("sp_loadNote")} placeholder={t("sp_loadNotePh")} value={d.loadNote} onChange={(v) => up((x) => void (x.loadNote = v))} />
            </div>
          )}
          <CheckList lang={lang} labels={SP_CHECK_LABELS} checks={checks.filter((c) => c.key === "sp_people_load" || c.key === "sp_stud_load")} issuesOnly />
        </Panel>
      </div>

      {/* ---- Reference ---- */}
      <Panel title={t("sp_referenceTitle")}>
        <MInput label={t("sp_drawingRef")} placeholder={t("sp_drawingRefPh")} value={d.drawingRef} onChange={(v) => up((x) => void (x.drawingRef = v))} />
      </Panel>

      {checks.some((c) => c.level !== "na") && (
        <Panel title={t("st_checksTitle")}>
          <CheckList lang={lang} labels={SP_CHECK_LABELS} checks={checks} collapsePassed />
        </Panel>
      )}

      <Panel>
        <Notes label={t("st_notes")} value={d.notes} onChange={(v) => up((x) => void (x.notes = v))} />
      </Panel>
    </div>
  );
}

function PieceCard({ lang, d, p, i, open, checks, gapCount, onToggle, update, onRemove, onDuplicate }: {
  lang: string; d: ShopPieceData; p: ShopPiece; i: number; open: boolean; checks: CheckResult[]; gapCount: number;
  onToggle: () => void; update: (fn: (p: ShopPiece) => void) => void; onRemove?: () => void; onDuplicate: () => void;
}) {
  const t = (k: string) => mt(lang, k);
  const f = spFabSize(d, p);
  const level = worst(checks.map((c) => c.level));
  const status = level === "red" ? "red" : gapCount > 0 ? "na" : level;
  const qty = pieceQty(p);
  const sq = checks.find((c) => c.key === "sp_square");
  const needsDecision = d.niche && checks.some((c) => ["sp_square", "sp_width_spread", "sp_height_spread", "sp_depth_spread"].includes(c.key) && (c.level === "red" || (c.level === "yellow" && p.squareFix)));
  const spread = (keys: readonly string[]) => spreadOf<string>(p as unknown as Record<string, string>, keys);
  const badge = (keys: readonly string[]) => { const s = spread(keys); return s && s.count >= 2 ? <DeltaBadge delta={s.spread} tol={SP_TOL.spread} /> : null; };
  const field = (k: keyof ShopPiece, gap?: string, label?: string) => (
    <MInput key={k} label={label ?? t(`sp_r_${k}`)} value={p[k] as string} gap={gap} onChange={(v) => update((x) => void ((x as unknown as Record<string, string>)[k] = v))} />
  );
  return (
    <div className={`overflow-hidden rounded-2xl border bg-white ${open ? "border-indigo-200 shadow-sm" : "border-slate-200"}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-16 w-full items-center gap-3 px-3 py-2.5 text-left">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[15px] font-bold text-indigo-700">{p.label.trim() ? p.label.trim().slice(0, 3) : `#${i + 1}`}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-slate-900">{p.type ? t(`sp_type_${p.type}`) : t("sp_noType")}{qty > 1 ? ` ×${qty}` : ""}</span>
          <span className="block truncate text-[13px] tabular-nums text-slate-500">{`${fmtIn(f.width)} × ${fmtIn(f.height)} × ${fmtIn(f.depth)}`}</span>
        </span>
        <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${DOT[status]}`} />
        <span aria-hidden="true" className={`shrink-0 text-slate-400 transition ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-slate-100 px-3 pb-4 pt-3">
          <div>
            <div className="mb-1 text-[13px] text-neutral-400">{t("sp_type")}</div>
            <div className="flex flex-wrap gap-1.5">
              {SP_TYPES.map((k) => (
                <button key={k} type="button" aria-pressed={p.type === k} onClick={() => update((x) => void (x.type = x.type === k ? "" : k))}
                  className={`min-h-10 rounded-full px-3.5 text-sm font-semibold ${p.type === k ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {t(`sp_type_${k}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <MInput label={t("sp_label")} placeholder={`#${i + 1}`} value={p.label} onChange={(v) => update((x) => void (x.label = v.slice(0, 40)))} />
            <Stepper label={t("st_qty")} value={qty} onChange={(n) => update((x) => void (x.qty = String(n)))} />
          </div>

          {d.niche ? (
            <>
              <Group title={t("sp_widthsTitle")} badge={badge(W_KEYS)}>
                <div className="grid grid-cols-2 gap-2.5">{W_KEYS.map((k) => field(k, "sp_widths"))}</div>
              </Group>
              <Group title={t("sp_heightsTitle")} badge={badge(H_KEYS)}>
                <div className="grid grid-cols-3 gap-2.5">{H_KEYS.map((k) => field(k, "sp_heights"))}</div>
              </Group>
              <Group title={t("sp_depthsTitle")} badge={badge(D_KEYS)}>
                <div className="grid grid-cols-2 gap-2.5">{D_KEYS.map((k) => field(k, "sp_depths"))}</div>
              </Group>
              <Group title={t("sp_diagTitle")} badge={sq && sq.delta !== null ? <DeltaBadge delta={Math.abs(sq.delta)} tol={SP_TOL.square} /> : null}>
                <div className="grid grid-cols-2 gap-2.5">{field("diagA", "sp_diagonals", t("sp_diagA"))}{field("diagB", "sp_diagonals", t("sp_diagB"))}</div>
              </Group>
              {needsDecision && (
                <Seg label={t("sp_squareFix")} value={p.squareFix} required={!p.squareFix}
                  options={[["smallest", t("sp_fix_smallest")], ["template", t("sp_fix_template")]]}
                  onChange={(v) => update((x) => void (x.squareFix = v as ShopPiece["squareFix"]))} />
              )}
            </>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {field(DESIGN_KEYS.w, "sp_width", t("sp_w"))}
              {field(DESIGN_KEYS.h, "sp_height", t("sp_h"))}
              {field(DESIGN_KEYS.d, "sp_depth", t("sp_d"))}
            </div>
          )}

          <CheckList lang={lang} labels={SP_CHECK_LABELS} checks={checks} issuesOnly />

          {/* Result */}
          <div className="rounded-xl bg-indigo-50 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-[13px] font-semibold uppercase tracking-wider text-indigo-700">{t("sp_buildTo")}</span>
              <span className="text-xl font-bold tabular-nums text-indigo-900">{`${fmtIn(f.width)} × ${fmtIn(f.height)} × ${fmtIn(f.depth)}`}</span>
            </div>
            {f.niche && (
              <div className="mt-1 space-y-0.5 text-[13px] tabular-nums text-slate-600">
                {f.open.w !== null && <div>W = {t(`sp_r_${f.from.w}`)} {fmtIn(f.open.w)} − 2 × {fmtIn(f.clearance)}</div>}
                {f.open.h !== null && <div>H = {t(`sp_r_${f.from.h}`)} {fmtIn(f.open.h)} − {fmtIn(f.clearance)}</div>}
                {f.open.d !== null && <div>D = {t(`sp_r_${f.from.d}`)} {fmtIn(f.open.d)} − {fmtIn(f.clearance)}</div>}
              </div>
            )}
            {!f.niche && <div className="mt-1 text-[13px] text-slate-600">{t("sp_designSize")}</div>}
          </div>

          <More lang={lang}>
            <MInput label={t("st_memberNotes")} placeholder="—" value={p.notes} onChange={(v) => update((x) => void (x.notes = v))} />
          </More>
          <div className="flex items-center gap-2">
            <span className="flex-1" />
            <button type="button" onClick={onDuplicate} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-indigo-700">{t("st_duplicate")}</button>
            {onRemove && <button type="button" onClick={() => { if (confirm(t("st_removeConfirm"))) onRemove(); }} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-red-700">{t("st_remove")}</button>}
          </div>
        </div>
      )}
    </div>
  );
}

