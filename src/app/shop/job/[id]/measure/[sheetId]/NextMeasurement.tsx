"use client";

// The first thing on the sheet: the next number the job is waiting on, with
// its box ready to type into. One field at a time, in walking order, so a
// measurer on a porch never has to find the right card among thirty.

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Crosshair } from "lucide-react";
import type { MeasureData, MeasureShape } from "@/lib/shop/measure";
import type { Gap } from "@/lib/shop/measure-checks";
import { mt } from "@/lib/shop/measure-i18n";
import { formatIn, parseMeas } from "@/lib/shop/measure-parse";
import { currentItem, measurementQueue, nextOpenItem, type NextItem, type NextSlot } from "@/lib/shop/measure-next";

const tr = (lang: string, en: string, pt: string, es: string) => (lang === "pt" ? pt : lang === "es" ? es : en);

export function slotLabel(slot: NextSlot, lang: string): string {
  const label = mt(lang, slot.labelKey);
  return label === slot.labelKey ? mt(lang, `gap_${slot.gap}`) : label;
}

export function slotContext(slot: NextSlot, data: MeasureData, lang: string): string {
  const parts: string[] = [];
  const flights = data.segments.filter((s) => s.kind === "flight").length;
  if (slot.flight !== undefined && flights > 1) parts.push(`${mt(lang, "flight")} ${slot.flight + 1}`);
  if (slot.stepNumber !== undefined) parts.push(`${mt(lang, "step")} ${slot.stepNumber}`);
  else if (slot.segIdx !== undefined && data.segments[slot.segIdx]?.kind === "platform") parts.push(`${mt(lang, "landing")}${slot.tag ? ` ${slot.tag}` : ""}`);
  else if (slot.tag) parts.push(slot.tag);
  return parts.join(" · ");
}

function readback(slot: NextSlot, value: string): { ok: boolean; text: string } {
  const v = value.trim();
  if (!v) return { ok: true, text: "" };
  const n = parseMeas(v);
  if (n === null || !Number.isFinite(n)) return { ok: false, text: "?" };
  if (slot.unit === "deg") return { ok: true, text: `${Math.round(n * 100) / 100}°` };
  if (slot.unit === "count") return { ok: Number.isInteger(n), text: `${n}` };
  const inches = formatIn(n);
  const feet = n >= 12 ? `${Math.floor(n / 12)}' ${formatIn(n - 12 * Math.floor(n / 12))}` : "";
  return { ok: true, text: feet ? `${inches} · ${feet}` : inches };
}

export default function NextMeasurement({
  data,
  shape,
  gaps,
  lang,
  unitPlaceholder,
  set,
  gapLabel,
  onOpenGap,
  onShow,
  onDone,
}: {
  data: MeasureData;
  shape: MeasureShape;
  /** Open fabrication requirements, as sheetReadiness reports them. */
  gaps: readonly Gap[];
  lang: string;
  unitPlaceholder: string;
  set: (fn: (d: MeasureData) => void) => void;
  gapLabel: (g: Gap) => string;
  onOpenGap: (g: Gap) => void;
  onShow?: (slot: NextSlot) => void;
  onDone?: () => void;
}) {
  const queue = useMemo(() => measurementQueue(data, shape, gaps), [data, shape, gaps]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const refocus = useRef(false);
  const item: NextItem | null = currentItem(queue, currentId);
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    input.current?.focus();
  }, [item?.id]);

  function go(direction: 1 | -1) {
    const next = nextOpenItem(queue, item?.id ?? null, direction);
    // Keep the keyboard up while walking from number to number.
    refocus.current = !!next && next.type === "slot" && document.activeElement === input.current;
    setCurrentId(next ? next.id : null);
  }

  const remaining = queue.open.length;
  const pct = queue.total ? Math.round((100 * queue.done) / queue.total) : 0;
  const progress = queue.total > 0 && (
    <span className="tabular-nums text-xs font-semibold text-slate-500">
      {tr(lang, `${queue.done} of ${queue.total}`, `${queue.done} de ${queue.total}`, `${queue.done} de ${queue.total}`)}
    </span>
  );
  const bar = queue.total > 0 && (
    <div role="progressbar" aria-label={tr(lang, "Measurements recorded", "Medidas registradas", "Medidas registradas")} aria-valuemin={0} aria-valuemax={queue.total} aria-valuenow={queue.done} className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-indigo-600 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
    </div>
  );
  const navBtn = "grid h-14 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 active:scale-95 disabled:opacity-30";

  if (!item) {
    return (
      <section aria-label={tr(lang, "Next measurement", "Próxima medida", "Siguiente medida")} data-next-measure className="rounded-[22px] border border-slate-200 bg-white p-4 text-slate-900">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><Check aria-hidden className="h-5 w-5" strokeWidth={3} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{tr(lang, "Everything measured", "Tudo medido", "Todo medido")}</p>
            {queue.total > 0 && <p className="text-xs text-slate-500">{tr(lang, `${queue.total} measurements recorded`, `${queue.total} medidas registradas`, `${queue.total} medidas registradas`)}</p>}
          </div>
          {onDone && <button type="button" onClick={onDone} className="min-h-11 shrink-0 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white">{tr(lang, "Review", "Revisar", "Revisar")}</button>}
        </div>
      </section>
    );
  }

  const heading = (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">{tr(lang, "Next", "Próxima", "Siguiente")}</span>
      {progress}
    </div>
  );

  if (item.type === "gap") {
    return (
      <section aria-label={tr(lang, "Next measurement", "Próxima medida", "Siguiente medida")} data-next-measure className="rounded-[22px] border border-slate-200 bg-white p-4 text-slate-900">
        {heading}{bar}
        <p className="mt-3 text-lg font-semibold leading-snug">{gapLabel(item.gap)}</p>
        <div className="mt-3 flex items-center gap-2">
          <button type="button" aria-label={tr(lang, "Previous", "Anterior", "Anterior")} disabled={remaining < 2} onClick={() => go(-1)} className={navBtn}><ChevronLeft aria-hidden className="h-5 w-5" /></button>
          <button type="button" onClick={() => onOpenGap(item.gap)} className="min-h-12 flex-1 rounded-2xl bg-indigo-600 px-4 font-semibold text-white active:scale-[.98]">{tr(lang, "Open", "Abrir", "Abrir")}</button>
          <button type="button" aria-label={tr(lang, "Skip", "Pular", "Saltar")} disabled={remaining < 2} onClick={() => go(1)} className={navBtn}><ChevronRight aria-hidden className="h-5 w-5" /></button>
        </div>
      </section>
    );
  }

  const slot = item.slot;
  const value = slot.get(data);
  const label = slotLabel(slot, lang);
  const context = slotContext(slot, data, lang);
  const rb = readback(slot, value);
  const filled = value.trim() !== "";
  const placeholder = slot.unit === "deg" ? "0°" : slot.unit === "count" ? "0" : unitPlaceholder;
  return (
    <section aria-label={tr(lang, "Next measurement", "Próxima medida", "Siguiente medida")} data-next-measure className="rounded-[22px] border border-slate-200 bg-white p-4 text-slate-900">
      {heading}{bar}
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {context && <p className="truncate text-xs font-semibold text-slate-500">{context}</p>}
          <p aria-hidden className="truncate text-xl font-semibold leading-tight tracking-tight" onClick={() => input.current?.focus()}>{label}</p>
        </div>
        {onShow && slot.segIdx !== undefined && (
          <button type="button" onClick={() => onShow(slot)} aria-label={tr(lang, "Show on drawing", "Mostrar no desenho", "Mostrar en el dibujo")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-indigo-600 active:bg-indigo-50"><Crosshair aria-hidden className="h-5 w-5" /></button>
        )}
      </div>
      <div className="mt-3 flex items-stretch gap-2">
        <button type="button" aria-label={tr(lang, "Previous", "Anterior", "Anterior")} disabled={remaining < 1 || (remaining === 1 && !filled && queue.open[0]?.id === item.id)} onClick={() => go(-1)} className={navBtn}><ChevronLeft aria-hidden className="h-5 w-5" /></button>
        <div className={`relative min-w-0 flex-1 rounded-2xl border bg-slate-50 transition-colors focus-within:border-indigo-500 focus-within:bg-white ${rb.ok ? "border-slate-200" : "border-amber-500"}`}>
          <input
            ref={input}
            id="next-measure-input"
            aria-label={`${tr(lang, "Next", "Próxima", "Siguiente")}: ${context ? `${context} · ` : ""}${label}`}
            data-m="1"
            value={value}
            onChange={(e) => {
              // Pin the card to this field: once it holds a value it leaves the
              // open list, and the card must not jump mid-number.
              if (currentId !== slot.id) setCurrentId(slot.id);
              set((d) => slot.put(d, e.target.value));
            }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); go(1); } }}
            placeholder={placeholder}
            autoComplete="off"
            inputMode="decimal"
            enterKeyHint="next"
            style={{ outline: "none" }}
            className="h-14 w-full bg-transparent px-3 pr-24 text-[28px] font-semibold tabular-nums tracking-tight outline-none placeholder:font-normal"
          />
          {rb.text && <span aria-live="polite" className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 truncate text-xs font-semibold tabular-nums ${rb.ok ? "text-slate-500" : "text-amber-700"}`}>{rb.text}</span>}
        </div>
        <button type="button" onClick={() => go(1)} className={`flex h-14 shrink-0 items-center gap-1 rounded-2xl px-4 font-semibold active:scale-95 ${filled ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
          {filled ? tr(lang, "Next", "Próxima", "Siguiente") : tr(lang, "Skip", "Pular", "Saltar")}<ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
