"use client";

// The opening sheet: what goes in the hole, then each hole measured at three
// widths, three heights and both diagonals against a live elevation, with the
// size the shop builds to worked out on the spot.

import { useRef, useState } from "react";
import type { MeasureData } from "@/lib/shop/measure";
import { formatIn, type CheckLevel } from "@/lib/shop/measure-checks";
import { mt } from "@/lib/shop/measure-i18n";
import {
  OPENING_ANCHORS,
  OPENING_DOOR_PRODUCTS,
  OPENING_EGRESS_PRODUCTS,
  OPENING_MOUNTS,
  OPENING_PHOTO_SLOTS,
  OPENING_PRODUCTS,
  OPENING_SILL_PRODUCTS,
  OPENING_SUBSTRATES,
  isFaceMount,
  julietGuardAboveSill,
  newOpeningUnit,
  openingChecks,
  openingFabSize,
  openingGaps,
  openingPieceCount,
  openingSquareness,
  unitTag,
  worstLevel,
  type OpeningData,
  type OpeningProduct,
  type OpeningUnit,
} from "@/lib/shop/measure-opening";
import { MInput, RequiredChip, SlotRow, useRequiredNow } from "../fields";
import { specValue } from "@/lib/shop/i18n";
import OpeningElevation, { type OpeningField } from "./OpeningElevation";
import { revealElement, useMeasureLocate } from "@/lib/shop/measure-locate";

const ELEVATION_FIELDS = ["wTop", "wMid", "wBot", "hLeft", "hCenter", "hRight", "diagA", "diagB"] as const;

const CARD = "mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
const H2 = "mb-3 text-base font-semibold tracking-tight";
const DOT: Record<CheckLevel | "open", string> = {
  green: "bg-green-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  na: "bg-slate-300",
  open: "bg-slate-300",
};
const BADGE: Record<CheckLevel, string> = {
  green: "border-green-500 bg-green-600/10 text-green-300",
  yellow: "border-amber-500 bg-amber-500/10 text-amber-300",
  red: "border-red-500 bg-red-600/20 text-red-300",
  na: "border-slate-200 bg-slate-50 text-slate-500",
};

/** A system-style segmented control. Tapping the chosen segment clears it. */
function Segmented({
  label,
  value,
  options,
  onChange,
  gap,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
  gap?: string;
}) {
  const needed = useRequiredNow(value, undefined, gap);
  return (
    <div className="min-w-0" data-gap={gap}>
      <div className={`mb-1.5 flex items-center gap-1 text-[11px] ${needed ? "text-red-300" : "text-neutral-400"}`}>
        <span className="min-w-0">{label}</span>
        {needed && <RequiredChip />}
      </div>
      <div role="radiogroup" aria-label={label}
        className={`grid gap-1 rounded-xl bg-slate-100 p-1 ${needed ? "ring-1 ring-red-500" : ""}`}
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v}
            onClick={() => onChange(value === v ? "" : v)}
            className={`min-h-11 rounded-lg px-2 text-sm font-semibold leading-tight transition-colors ${
              value === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A quiet system picker; required-and-empty shows as a red outline only. */
function OSelect({
  label,
  value,
  options,
  labels,
  onChange,
  gap,
}: {
  label: string;
  value: string;
  options: readonly string[];
  labels?: Record<string, string>;
  onChange: (v: string) => void;
  gap?: string;
}) {
  const needed = useRequiredNow(value, undefined, gap);
  return (
    <label className="block min-w-0" data-gap={gap}>
      <span className={`mb-1 flex items-center gap-1 text-[11px] ${needed ? "text-red-300" : "text-neutral-400"}`}>
        <span className="min-w-0">{label}</span>
        {needed && <RequiredChip />}
      </span>
      <span className="relative block">
        <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
          className={`min-h-12 w-full appearance-none rounded-lg border bg-neutral-800 py-2.5 pl-2.5 pr-9 text-base ${
            needed ? "border-red-500" : "border-neutral-700"
          }`}>
          <option value="">—</option>
          {options.map((o) => <option key={o} value={o}>{labels?.[o] ?? o}</option>)}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">⌄</span>
      </span>
    </label>
  );
}

/** Advanced fields, one tap away. */
function More({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-indigo-700 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">›</span>
        {label}
      </summary>
      <div className="mt-2 space-y-3">{children}</div>
    </details>
  );
}

function ProductGlyph({ p }: { p: OpeningProduct }) {
  const common = { width: 28, height: 28, viewBox: "0 0 28 28", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const };
  switch (p) {
    case "guard":
      return <svg {...common}><rect x="5" y="4" width="18" height="20" /><path d="M10 4v20M14 4v20M18 4v20" /></svg>;
    case "juliet":
      return <svg {...common}><rect x="6" y="3" width="16" height="22" strokeWidth={1.1} /><path d="M3 14h22M6 14v11M10 14v11M14 14v11M18 14v11M22 14v11" /></svg>;
    case "security_door":
      return <svg {...common}><rect x="7" y="3" width="14" height="22" /><path d="M10 7v14M14 7v14M18 7v14" strokeWidth={1.1} /><circle cx="18.5" cy="14" r="1.2" fill="currentColor" /></svg>;
    case "storm_door":
      return <svg {...common}><rect x="7" y="3" width="14" height="22" /><rect x="9.5" y="6" width="9" height="9" strokeWidth={1.1} /><circle cx="18.5" cy="17" r="1.2" fill="currentColor" /></svg>;
    case "gate":
      return <svg {...common}><path d="M4 25V3M24 25V3" strokeWidth={2.2} /><rect x="6" y="7" width="16" height="15" /><path d="M10 7v15M14 7v15M18 7v15" strokeWidth={1.1} /></svg>;
    case "panel":
      return <svg {...common}><path d="M4 11h20V4H4zM4 11v14M24 11v14" /><path d="M8 11c0-3 3-5 6-5s6 2 6 5" strokeWidth={1.1} /></svg>;
    case "skylight_guard":
      return <svg {...common}><path d="M3 18l11-8 11 8" /><path d="M7 15l7 5 7-5M9 13.5v4M14 10v10M19 13.5v4" strokeWidth={1.1} /></svg>;
  }
}

export default function OpeningSections({
  lang,
  data,
  set,
  finishOptions,
  colorOptions,
  setPhotoSlot,
  directSlotPhoto,
  slotBusy,
  slotErr,
}: {
  lang: string;
  data: MeasureData;
  set: (fn: (d: MeasureData) => void) => void;
  finishOptions: string[];
  colorOptions: string[];
  setPhotoSlot: (s: { slot: string; label: string } | null) => void;
  directSlotPhoto: (slot: string, label: string, file: File) => void;
  slotBusy: string | null;
  slotErr: string | null;
}) {
  const o = data.opening as OpeningData;
  const [activeId, setActiveId] = useState<string>(o.units[0]?.id ?? "");
  const [focusField, setFocusField] = useState<OpeningField | null>(null);
  const [choosing, setChoosing] = useState(false);
  const fieldsRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const elevRef = useRef<HTMLDivElement>(null);
  // The Next-measurement card walks the openings: follow it to the right
  // opening and light the number on the elevation; scroll there when asked.
  useMeasureLocate((d) => {
    if (d.groupKind === "opening" && d.groupId && o.units.some((u) => u.id === d.groupId)) setActiveId(d.groupId);
    const onElevation = !!d.part && (ELEVATION_FIELDS as readonly string[]).includes(d.part);
    if (d.groupKind === "opening" || d.part) setFocusField(onElevation ? (d.part as OpeningField) : null);
    if (!d.scroll) return;
    requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      if (onElevation) return revealElement(elevRef.current);
      const target =
        (d.part && root.querySelector(`[data-op-field="${d.part}"], [data-op-part~="${d.part}"]`)) ||
        (d.gap === "photo" && root.querySelector("[data-op-photos]")) ||
        (d.gap && root.querySelector(`[data-gap="${d.gap}"]`)) ||
        root.firstElementChild;
      revealElement(target);
    });
  });
  const unitIdx = Math.max(0, o.units.findIndex((u) => u.id === activeId));
  const unit = o.units[unitIdx];

  const setO = (fn: (x: OpeningData) => void) => set((d) => { if (d.opening) fn(d.opening); });
  const setU = (id: string, fn: (u: OpeningUnit) => void) =>
    setO((x) => { const u = x.units.find((y) => y.id === id); if (u) fn(u); });

  const product = o.product as OpeningProduct | "";
  const isDoor = !!product && OPENING_DOOR_PRODUCTS.includes(product);
  const asksEgress = !!product && OPENING_EGRESS_PRODUCTS.includes(product);
  const asksSill = !product || OPENING_SILL_PRODUCTS.includes(product);
  const face = isFaceMount(o.mount);

  const checks = openingChecks(o);
  const gaps = openingGaps(o, data.photos);
  const unitState = (u: OpeningUnit, i: number): CheckLevel | "open" => {
    const tag = unitTag(u, i);
    const lv = worstLevel(checks.filter((c) => c.detail === tag || c.detail?.startsWith(`${tag} ×`)).map((c) => c.level));
    if (lv === "red") return "red";
    if (gaps.some((g) => g.detail === tag)) return "open";
    return lv === "na" ? "open" : lv;
  };

  function pick(field: OpeningField) {
    setFocusField(field);
    const el = fieldsRef.current?.querySelector<HTMLInputElement>(`[data-op-field="${field}"] input`);
    if (el) {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function addUnit(copyFrom?: OpeningUnit) {
    const u = newOpeningUnit("", copyFrom ?? o.units[o.units.length - 1]);
    if (copyFrom) Object.assign(u, { ...copyFrom, id: u.id, label: "" });
    setO((x) => { x.units.push(u); });
    setActiveId(u.id);
  }
  function removeUnit(id: string) {
    if (o.units.length <= 1) return;
    if (!window.confirm(mt(lang, "opConfirmRemove"))) return;
    const next = o.units.find((u) => u.id !== id);
    setO((x) => { x.units = x.units.filter((u) => u.id !== id); });
    if (next) setActiveId(next.id);
  }

  const fab = unit ? openingFabSize(o, unit) : null;
  const sq = unit ? openingSquareness(unit) : null;
  const allowanceText = (face ? o.overlap : o.clearance).trim() || "0";
  const allowanceShown = /["']$/.test(allowanceText) ? allowanceText : `${allowanceText}"`;
  const qty = Math.max(1, parseInt(unit?.qty || "1", 10) || 1);
  const juliet = julietGuardAboveSill(o);
  const finishList = Array.from(new Set([...(data.materials.finish ? [data.materials.finish] : []), ...finishOptions]));
  const colorList = Array.from(new Set([...(data.materials.color ? [data.materials.color] : []), ...colorOptions]));
  const pieces = openingPieceCount(o);
  const yesNo: [string, string][] = [["yes", mt(lang, "opYes")], ["no", mt(lang, "opNo")]];
  const sides: [string, string][] = [["left", mt(lang, "opLeft")], ["right", mt(lang, "opRight")]];

  const field = (k: OpeningField | "reveal" | "sillSlope" | "sillProjection" | "sillAff" | "dropOutside", label: string, gap?: string, hint?: string) =>
    unit && (
      <div data-op-field={k} onFocus={() => setFocusField(k === "reveal" || k === "sillSlope" || k === "sillProjection" || k === "sillAff" || k === "dropOutside" ? null : k)}>
        <MInput label={label} hint={hint} gap={gap} value={unit[k]} onChange={(v) => setU(unit.id, (u) => void (u[k] = v))} />
      </div>
    );

  const sqBadge = (label: string, v: number | null, lv: CheckLevel) => (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${BADGE[lv]}`}>
      {label} {v === null ? "—" : lv === "green" && v < 1 / 32 ? "✓" : `Δ ${formatIn(v)}`}
    </span>
  );

  return (
    <div ref={rootRef} className="mx-auto max-w-5xl">
      {/* ---- What goes in the opening -------------------------------------- */}
      <section className={CARD}>
        <h2 className={H2}>{mt(lang, "opProductTitle")}</h2>
        {product && !choosing ? (
          <button type="button" onClick={() => setChoosing(true)}
            className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-amber-500 bg-amber-500/10 px-3 text-left text-amber-300">
            <span aria-hidden="true"><ProductGlyph p={product} /></span>
            <span className="flex-1 text-base font-semibold">{mt(lang, `opP_${product}`)}</span>
            <span className="text-sm font-semibold text-indigo-700">{mt(lang, "opChange")}</span>
          </button>
        ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {OPENING_PRODUCTS.map((p) => (
            <button key={p} type="button" aria-pressed={product === p}
              onClick={() => { setO((x) => void (x.product = p)); setChoosing(false); }}
              className={`flex min-h-14 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
                product === p ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-neutral-700 bg-neutral-800 text-neutral-300"
              }`}>
              <span aria-hidden="true" className="shrink-0"><ProductGlyph p={p} /></span>
              <span className="min-w-0 leading-tight">{mt(lang, `opP_${p}`)}</span>
            </button>
          ))}
        </div>
        )}
        <div className="mt-4">
          <Segmented label={mt(lang, "opMount")} gap="op_mount" value={o.mount}
            options={OPENING_MOUNTS.map((m) => [m, mt(lang, `opM_${m}`)] as [string, string])}
            onChange={(v) => setO((x) => void (x.mount = v as OpeningData["mount"]))} />
        </div>
        <div className="mt-1">
        <More label={`${mt(lang, face ? "opOverlap" : "opClearance")} · ${allowanceShown}`}>
          {face ? (
            <MInput label={mt(lang, "opOverlap")} hint={mt(lang, "opOverlapHint")} gap="op_overlap" value={o.overlap}
              onChange={(v) => setO((x) => void (x.overlap = v))} />
          ) : (
            <MInput label={mt(lang, "opClearance")} hint={mt(lang, "opClearanceHint")} gap="op_clearance" value={o.clearance}
              onChange={(v) => setO((x) => void (x.clearance = v))} />
          )}
        </More>
        </div>
      </section>

      {/* ---- The openings -------------------------------------------------- */}
      <section className={CARD}>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">{mt(lang, "opOpenings")}</h2>
          <span className="text-xs text-slate-500">
            {pieces} {mt(lang, pieces === 1 ? "opPiece" : "opPieces")}
          </span>
        </div>
        <div role="tablist" className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {o.units.map((u, i) => {
            const st = unitState(u, i);
            const on = u.id === unit?.id;
            const f = openingFabSize(o, u);
            return (
              <button key={u.id} role="tab" type="button" aria-selected={on} onClick={() => setActiveId(u.id)}
                className={`min-h-12 shrink-0 rounded-xl border px-3 py-1.5 text-left ${
                  on ? "border-indigo-600 bg-indigo-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700"
                }`}>
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <span aria-hidden="true" className={`size-2 rounded-full ${DOT[st]}`} />
                  {u.label.trim() || `${mt(lang, "opOpening")} ${i + 1}`}
                  {(parseInt(u.qty, 10) || 1) > 1 && <span className="text-xs opacity-80">×{u.qty}</span>}
                </span>
                <span className={`block text-[11px] tabular-nums ${on ? "text-indigo-100" : "text-slate-500"}`}>
                  {f ? `${formatIn(f.width)} × ${formatIn(f.height)}` : "—"}
                </span>
              </button>
            );
          })}
          <button type="button" onClick={() => addUnit()}
            className="min-h-12 shrink-0 rounded-xl border border-dashed border-slate-300 px-4 text-sm font-semibold text-indigo-700">
            + {mt(lang, "opAdd")}
          </button>
        </div>

        {unit && (
          <div ref={fieldsRef} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <div ref={elevRef} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <OpeningElevation opening={o} unit={unit} lang={lang} onPick={pick} active={focusField} />
              </div>

              {/* The answer the shop builds to */}
              <div className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">{mt(lang, "opFabSize")}</div>
                {fab ? (
                  <>
                    <div className="mt-1 text-[28px] font-bold leading-tight tracking-tight text-indigo-950 tabular-nums">
                      {formatIn(fab.width)} <span className="text-indigo-700">×</span> {formatIn(fab.height)}
                      {qty > 1 && <span className="ml-2 text-base font-semibold text-indigo-700">×{qty}</span>}
                    </div>
                    <div className="mt-1 text-xs text-indigo-800">
                      {mt(lang, fab.face ? "opFabFromFace" : "opFabFromReveal").replace("{a}", /["']$/.test(allowanceText) ? allowanceText : `${allowanceText}"`)}
                      {" · "}
                      {mt(lang, `opW_${fab.widthFrom}`)} {formatIn(fab.openW)} / {mt(lang, `opH_${fab.heightFrom}`)} {formatIn(fab.openH)} {mt(lang, "opGoverns")}
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-sm text-indigo-800">{mt(lang, "opFabWaiting")}</div>
                )}
                {sq && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {sqBadge(mt(lang, "opSquareDiag"), sq.diagDiff, sq.diagLevel)}
                    {sqBadge(mt(lang, "opSquareW"), sq.widthSpread, sq.widthLevel)}
                    {sqBadge(mt(lang, "opSquareH"), sq.heightSpread, sq.heightLevel)}
                  </div>
                )}
              </div>
              {sq?.level === "red" || (sq?.level === "yellow" && unit.squareFix) ? (
                <div className={`mt-3 rounded-2xl border p-3 ${unit.squareFix ? "border-amber-500 bg-amber-500/10" : "border-red-500 bg-red-600/20"}`}>
                  <Segmented label={mt(lang, "opOutOfSquare")} value={unit.squareFix}
                    options={[["rect", mt(lang, "opFix_rect")], ["template", mt(lang, "opFix_template")]]}
                    onChange={(v) => setU(unit.id, (u) => void (u.squareFix = v as OpeningUnit["squareFix"]))} />
                </div>
              ) : null}
            </div>

            <div className="min-w-0 space-y-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                <label className="block min-w-0">
                  <span className="mb-1 block text-[11px] text-neutral-400">{mt(lang, "opLabel")}</span>
                  <input value={unit.label} placeholder={mt(lang, "opLabelPh")} aria-label={mt(lang, "opLabel")}
                    onChange={(e) => setU(unit.id, (u) => void (u.label = e.target.value))}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-2.5 text-base" />
                </label>
                <div>
                  <span className="mb-1 block text-[11px] text-neutral-400">{mt(lang, "opQty")}</span>
                  <div className="flex items-center rounded-lg border border-neutral-700 bg-neutral-800">
                    <button type="button" aria-label="−" disabled={qty <= 1}
                      onClick={() => setU(unit.id, (u) => void (u.qty = String(Math.max(1, qty - 1))))}
                      className="min-h-11 min-w-11 text-lg font-semibold disabled:opacity-30">−</button>
                    <span className="min-w-8 text-center text-base font-semibold tabular-nums">{qty}</span>
                    <button type="button" aria-label="+"
                      onClick={() => setU(unit.id, (u) => void (u.qty = String(Math.min(99, qty + 1))))}
                      className="min-h-11 min-w-11 text-lg font-semibold">+</button>
                  </div>
                </div>
              </div>

              <fieldset>
                <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{mt(lang, "opWidths")}</legend>
                <div className="grid grid-cols-3 gap-2">
                  {field("wTop", mt(lang, "opW_wTop"), "op_widths")}
                  {field("wMid", mt(lang, "opW_wMid"), "op_widths")}
                  {field("wBot", mt(lang, "opW_wBot"), "op_widths")}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{mt(lang, "opHeights")}</legend>
                <div className="grid grid-cols-3 gap-2">
                  {field("hLeft", mt(lang, "opH_hLeft"), "op_heights")}
                  {field("hCenter", mt(lang, "opH_hCenter"), "op_heights")}
                  {field("hRight", mt(lang, "opH_hRight"), "op_heights")}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{mt(lang, "opDiagonals")}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {field("diagA", mt(lang, "opDiagA"), "op_diagonals", mt(lang, "opDiagHint"))}
                  {field("diagB", mt(lang, "opDiagB"), "op_diagonals")}
                </div>
              </fieldset>
              {o.mount === "reveal" && field("reveal", mt(lang, "opReveal"), "op_reveal", mt(lang, "opRevealHint"))}

              {asksEgress && (
                <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
                  <Segmented label={mt(lang, "opEgress")} gap="op_egress" value={unit.egress} options={yesNo}
                    onChange={(v) => setU(unit.id, (u) => { u.egress = v as OpeningUnit["egress"]; if (v !== "yes") u.quickRelease = ""; })} />
                  {unit.egress === "yes" && (
                    <Segmented label={mt(lang, "opQuickRelease")} gap="op_quick_release" value={unit.quickRelease} options={yesNo}
                      onChange={(v) => setU(unit.id, (u) => void (u.quickRelease = v as OpeningUnit["quickRelease"]))} />
                  )}
                </div>
              )}

              {asksSill && (
                <div className={`grid gap-2 ${product === "juliet" ? "grid-cols-1" : "grid-cols-2"}`}>
                  {product !== "juliet" && field("sillAff", mt(lang, "opSillAff"))}
                  {field("dropOutside", mt(lang, "opDropOutside"))}
                </div>
              )}

              <More label={mt(lang, "opMoreDetails")}>
                <div className={`grid gap-2 ${asksSill ? "grid-cols-2" : "grid-cols-1"}`}>
                  {o.mount !== "reveal" && field("reveal", mt(lang, "opReveal"), undefined, mt(lang, "opRevealHint"))}
                  {asksSill && field("sillSlope", mt(lang, "opSillSlope"), undefined, mt(lang, "opSillSlopeHint"))}
                  {asksSill && field("sillProjection", mt(lang, "opSillProjection"), undefined, mt(lang, "opSillProjectionHint"))}
                </div>
                <MInput label={mt(lang, "opNotes")} placeholder="—" value={unit.note}
                  onChange={(v) => setU(unit.id, (u) => void (u.note = v))} />
              <div className="flex gap-2">
                <button type="button" onClick={() => addUnit(unit)}
                  className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold">
                  {mt(lang, "opDuplicate")}
                </button>
                {o.units.length > 1 && (
                  <button type="button" onClick={() => removeUnit(unit.id)}
                    className="min-h-11 rounded-xl px-3 text-sm font-semibold text-red-700">
                    {mt(lang, "opRemove")}
                  </button>
                )}
              </div>
              </More>
            </div>
          </div>
        )}
      </section>

      {/* ---- Juliet --------------------------------------------------------- */}
      {product === "juliet" && (
        <section className={CARD} data-op-part="julietSill julietProjection">
          <h2 className={H2}>{mt(lang, "opJulietTitle")}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MInput label={mt(lang, "opJulietSill")} hint={mt(lang, "opJulietSillHint")} gap="op_juliet_sill" value={o.julietSill}
              onChange={(v) => setO((x) => void (x.julietSill = v))} />
            <Segmented label={mt(lang, "opJulietGuard")} gap="op_juliet_guard" value={o.julietGuard}
              options={[["36", '36"'], ["42", '42"']]}
              onChange={(v) => setO((x) => void (x.julietGuard = v as OpeningData["julietGuard"]))} />
            <MInput label={mt(lang, "opJulietProjection")} gap="op_juliet_projection" value={o.julietProjection}
              onChange={(v) => setO((x) => void (x.julietProjection = v))} />
            <Segmented label={mt(lang, "opJulietSwing")} gap="op_juliet_swing" value={o.julietDoorSwing}
              options={[["in", mt(lang, "opSwingIn")], ["out", mt(lang, "opSwingOut")]]}
              onChange={(v) => setO((x) => { x.julietDoorSwing = v as OpeningData["julietDoorSwing"]; if (v !== "out") x.julietDoorClears = ""; })} />
            {o.julietDoorSwing === "out" && (
              <Segmented label={mt(lang, "opJulietClears")} gap="op_juliet_clears" value={o.julietDoorClears} options={yesNo}
                onChange={(v) => setO((x) => void (x.julietDoorClears = v as OpeningData["julietDoorClears"]))} />
            )}
          </div>
          {juliet !== null && (
            <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-900">
              {juliet > 0 ? mt(lang, "opJulietAboveSill").replace("{h}", formatIn(juliet)) : mt(lang, "opJulietSillOk")}
            </div>
          )}
        </section>
      )}

      {/* ---- Doors and gates in an opening --------------------------------- */}
      {isDoor && (
        <section className={CARD} data-op-part="threshold">
          <h2 className={H2}>{mt(lang, "opDoorTitle")}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Segmented label={mt(lang, "opDoorHinge")} gap="op_door_hinge" value={o.doorHinge} options={sides}
              onChange={(v) => setO((x) => {
                x.doorHinge = v as OpeningData["doorHinge"];
                // The lock is nearly always opposite the hinges.
                if (v && !x.lockSide) x.lockSide = v === "left" ? "right" : "left";
              })} />
            <Segmented label={mt(lang, "opDoorSwing")} gap="op_door_swing" value={o.doorSwing}
              options={[["in", mt(lang, "opSwingIn")], ["out", mt(lang, "opSwingOut")]]}
              onChange={(v) => setO((x) => void (x.doorSwing = v as OpeningData["doorSwing"]))} />
            <Segmented label={mt(lang, "opDoorLock")} gap="op_door_lock" value={o.lockSide} options={sides}
              onChange={(v) => setO((x) => void (x.lockSide = v as OpeningData["lockSide"]))} />
            <MInput label={mt(lang, "opDoorThreshold")} gap="op_door_threshold" value={o.threshold}
              onChange={(v) => setO((x) => void (x.threshold = v))} />
            <MInput label={mt(lang, "opDoorJamb")} gap="op_door_jamb" placeholder="—" value={o.jambMaterial}
              onChange={(v) => setO((x) => void (x.jambMaterial = v))} />
          </div>
        </section>
      )}

      {/* ---- What it anchors into ------------------------------------------ */}
      <section className={CARD}>
        <h2 className={H2}>{mt(lang, "opSubstrateTitle")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OSelect label={mt(lang, "opSubstrate")} gap="op_substrate" value={o.substrate} options={[...OPENING_SUBSTRATES]}
            labels={Object.fromEntries(OPENING_SUBSTRATES.map((a) => [a, mt(lang, `opS_${a}`)]))}
            onChange={(v) => setO((x) => void (x.substrate = v as OpeningData["substrate"]))} />
          <OSelect label={mt(lang, "opAnchor")} gap="op_anchor" value={o.anchor} options={[...OPENING_ANCHORS]}
            labels={Object.fromEntries(OPENING_ANCHORS.map((a) => [a, mt(lang, `opA_${a}`)]))}
            onChange={(v) => setO((x) => void (x.anchor = v as OpeningData["anchor"]))} />
        </div>
        <div className="mt-1">
        <More label={mt(lang, "opMoreDetails")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MInput label={mt(lang, "opSubstrateCondition")} placeholder={mt(lang, "opSubstrateConditionPh")} value={o.substrateCondition}
            onChange={(v) => setO((x) => void (x.substrateCondition = v))} />
          <MInput label={mt(lang, "opAnchorNote")} placeholder="—" value={o.anchorNote}
            onChange={(v) => setO((x) => void (x.anchorNote = v))} />
          <MInput label={mt(lang, "opDesign")} placeholder={mt(lang, "opDesignPh")} value={o.design}
            onChange={(v) => setO((x) => void (x.design = v))} />
        </div>
        </More>
        </div>
      </section>

      {/* ---- Finish ---------------------------------------------------------- */}
      <section className={CARD}>
        <h2 className={H2}>{mt(lang, "opFinishTitle")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OSelect label={mt(lang, "opFinish")} gap="mat_finish" value={data.materials.finish}
            options={finishList} labels={Object.fromEntries(finishList.map((f) => [f, specValue(lang, f)]))}
            onChange={(v) => set((d) => void (d.materials.finish = v))} />
          <OSelect label={mt(lang, "opColor")} value={data.materials.color}
            options={colorList} labels={Object.fromEntries(colorList.map((f) => [f, specValue(lang, f)]))}
            onChange={(v) => set((d) => void (d.materials.color = v))} />
        </div>
      </section>

      {/* ---- Photos ---------------------------------------------------------- */}
      <section className={CARD} data-op-photos="">
        <h2 className={H2}>{mt(lang, "opPhotosTitle")}</h2>
        {slotErr && <p className="mb-2 text-sm text-red-400">{slotErr}</p>}
        <div className="space-y-2">
          {OPENING_PHOTO_SLOTS.map((slot) => (
            <SlotRow key={slot} slot={slot} label={mt(lang, `slot_${slot}`)} required
              data={data} lang={lang} busy={slotBusy === slot}
              onFile={(f) => directSlotPhoto(slot, mt(lang, `slot_${slot}`), f)}
              onTake={() => setPhotoSlot({ slot, label: mt(lang, `slot_${slot}`) })} />
          ))}
        </div>
      </section>

      <section className={CARD}>
        <h2 className={H2}>{mt(lang, "opNotes")}</h2>
        <textarea value={o.notes} rows={3} aria-label={mt(lang, "opNotes")}
          onChange={(e) => setO((x) => void (x.notes = e.target.value))}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-2.5 text-base" />
      </section>
    </div>
  );
}
