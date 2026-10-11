"use client";

// The first thing on the sheet: the next number the job is waiting on, with
// its box ready to type into. One field at a time, in walking order, so a
// measurer on a porch never has to find the right card among thirty. Every
// work type feeds it — a stair, a gate, an opening in a wall, a steel frame.

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, Crosshair, MoreHorizontal, X } from "lucide-react";
import type { MeasureData, MeasureShape } from "@/lib/shop/measure";
import type { Gap } from "@/lib/shop/measure-checks";
import { LASER_INPUT_EVENT, type LaserInputDetail } from '@/lib/shop/laser/field-input';
import { mt } from "@/lib/shop/measure-i18n";
import { nxText } from "@/lib/shop/measure-next-i18n";
import { locateMeasure } from "@/lib/shop/measure-locate";
import { formatIn, parseMeas } from "@/lib/shop/measure-parse";
import { copyStepValue, currentItem, measurementQueue, nextOpenItem, stepCopyTargets, stepPart, type NextItem, type NextSlot } from "@/lib/shop/measure-next";
import type { SceneFocus } from "@/lib/shop/measure-scene";
import { dimForSlot, sceneDims, type SceneDim } from "@/lib/shop/measure-dims";
import { approveFlightAngle, approveJointAngle, flightAngleCalc, jointAngleCalc, type AngleSource } from "@/lib/shop/measure-angle";
import { dimText } from "@/lib/shop/measure-dims";
import { dimWord } from "@/lib/shop/measure-dims-i18n";
import { calcCheck, calcState, DEG_TOL, type CalcSlot } from "@/lib/shop/measure-calc";
import { slotCalc } from "@/lib/shop/measure-calc-registry";
import { applyCopy, slotCopy } from "@/lib/shop/measure-copy";

const CHECK_TONE = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  yellow: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
} as const;

/**
 * An angle the other numbers already give (a flight's pitch, the change across
 * a joint): offered to approve instead of typed from scratch.
 */
export function slotAngle(slot: Pick<NextSlot, "id">, data: MeasureData): { calc: number | null; source?: AngleSource; approve: (d: MeasureData) => void; read: (d: MeasureData, v: string) => void } | null {
  let m = slot.id.match(/^s(\d+)\.angle$/);
  if (m) {
    const i = Number(m[1]), seg = data.segments[i];
    if (seg?.kind !== "flight") return null;
    return {
      calc: flightAngleCalc(seg), source: seg.angleSource,
      approve: (d) => void approveFlightAngle(d, i),
      read: (d, v) => { const g = d.segments[i]; if (g?.kind === "flight") { g.angleDeg = v; g.angleSource = v.trim() ? "measured" : ""; } },
    };
  }
  m = slot.id.match(/^j(\d+)\.angle$/);
  if (m) {
    const n = Number(m[1]), j = (data.joints || [])[n];
    if (!j) return null;
    return {
      calc: jointAngleCalc(data, j), source: j.angleChangeSource,
      approve: (d) => void approveJointAngle(d, n),
      read: (d, v) => { const jt = (d.joints || [])[n]; if (jt) { jt.angleChange = v; jt.angleChangeSource = v.trim() ? "measured" : ""; } },
    };
  }
  return null;
}

const nx = (lang: string, key: string, vars?: Record<string, string | number>) => nxText(lang, key, vars) ?? key;

/** The face of the stair a slot is about, for lighting it on the 3D. */
export function slotFocus(item: NextItem | null, data: MeasureData, dims: readonly SceneDim[] = []): SceneFocus | null {
  if (item?.type !== "slot") return null;
  const step = stepPart(item.slot);
  if (step) return { segmentIndex: step.segIdx, stepIndex: step.stepIdx, part: step.key };
  // A number with its own dimension line on the sketch: light that line.
  if (dimForSlot(dims, item.slot.id)) return { segmentIndex: item.slot.segIdx ?? -1, stepIndex: null, part: "dim", dim: item.slot.id };
  const at = item.slot.segIdx;
  if (at !== undefined && item.slot.stepIdx === undefined && data.segments[at]?.kind === "platform") return { segmentIndex: at, stepIndex: null, part: "surface" };
  return null;
}

export function slotLabel(slot: NextSlot, lang: string): string {
  const own = nxText(lang, slot.labelKey);
  if (own) return own;
  const label = mt(lang, slot.labelKey);
  return label === slot.labelKey ? mt(lang, `gap_${slot.gap}`) : label;
}

export function slotContext(slot: NextSlot, data: MeasureData, lang: string): string {
  const parts: string[] = [];
  const g = slot.group;
  if (g?.kind === "opening") {
    const many = (data.opening?.units.length ?? 0) > 1;
    if (g.label) parts.push(g.label);
    else if (many) parts.push(`${nx(lang, "nx_opening")} ${g.index + 1}`);
    return parts.join(" · ");
  }
  if (g?.kind === "member") {
    parts.push(g.label);
    if (slot.part?.startsWith("height:")) parts.push(slot.tag || nx(lang, "nx_reading", { n: slot.reading ?? 1 }));
    return parts.join(" · ");
  }
  if (g?.kind === "frame") return nx(lang, "nx_frame");
  const flights = data.segments.filter((s) => s.kind === "flight").length;
  if (slot.flight !== undefined && flights > 1) parts.push(`${mt(lang, "flight")} ${slot.flight + 1}`);
  if (slot.stepNumber !== undefined) parts.push(`${mt(lang, "step")} ${slot.stepNumber}`);
  else if (slot.segIdx !== undefined && data.segments[slot.segIdx]?.kind === "platform") parts.push(`${mt(lang, "landing")}${slot.tag ? ` ${slot.tag}` : ""}`);
  else if (slot.tag) parts.push(slot.tag);
  return parts.join(" · ");
}

/** What the box will be saved as, read back the way the shop writes it. */
export function readback(slot: Pick<NextSlot, "unit">, value: string): { ok: boolean; text: string } {
  const v = value.trim();
  if (!v) return { ok: true, text: "" };
  const n = parseMeas(v);
  if (n === null || !Number.isFinite(n) || n < 0) return { ok: false, text: "?" };
  if (slot.unit === "deg") return { ok: true, text: `${Math.round(n * 100) / 100}°` };
  if (slot.unit === "count") return { ok: Number.isInteger(n), text: `${n}` };
  const inches = formatIn(n);
  const ft = Math.floor(Math.round(n * 16) / 16 / 12);
  const feet = ft >= 1 ? `${ft}' ${formatIn(n - 12 * ft)}` : "";
  return { ok: true, text: feet ? `${inches} · ${feet}` : inches };
}

// Advance animation: the new number slides in from the side it came from.
const MOTION = `
@keyframes nx-in-fwd { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: none; } }
@keyframes nx-in-back { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: none; } }
@keyframes nx-pop { 0% { opacity: 0; transform: scale(.6); } 70% { opacity: 1; transform: scale(1.08); } 100% { transform: scale(1); } }
[data-nx-anim="fwd"] { animation: nx-in-fwd .26s cubic-bezier(.2,.8,.2,1) both; }
[data-nx-anim="back"] { animation: nx-in-back .26s cubic-bezier(.2,.8,.2,1) both; }
[data-nx-pop] { animation: nx-pop .42s cubic-bezier(.2,.8,.2,1) both; }
@keyframes nx-toast { from { opacity: 0; transform: translateY(6px) scale(.97); } to { opacity: 1; transform: none; } }
[data-nx-toast] { animation: nx-toast .24s cubic-bezier(.2,.8,.2,1) both; }
@media (prefers-reduced-motion: reduce) { [data-nx-anim], [data-nx-pop], [data-nx-toast] { animation: none; } }
`;

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
  onFocus,
  onUndo,
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
  /** The step face this card is on, for the 3D to light (null when it is on nothing drawable). */
  onFocus?: (focus: SceneFocus | null) => void;
  /** The sheet's undo, for taking back a copy. */
  onUndo?: () => void;
}) {
  const queue = useMemo(() => measurementQueue(data, shape, gaps), [data, shape, gaps]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  // Once every number is in, the remaining choices and photos are walked only when asked.
  const [details, setDetails] = useState(false);
  const [dir, setDir] = useState<"fwd" | "back" | "">("");
  const input = useRef<HTMLInputElement>(null);
  const refocus = useRef(false);
  const item: NextItem | null = currentItem(queue, currentId);
  const openSlots = queue.open.filter((i) => i.type === "slot").length;
  const finished = queue.total > 0 && openSlots === 0 && (item === null || (item.type === "gap" && !details));
  // Copy a step's rise or tread to the rest of its flight: the choice sheet, then a short "Copied · Undo".
  const [copyMenu, setCopyMenu] = useState(false);
  // The angle slot whose calculated value is being overridden with a reading.
  const [modifying, setModifying] = useState<string | null>(null);
  const [toast, setToast] = useState<{ n: number; restore: () => void; keys?: [string, string] } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => { setCopyMenu(false); }, [item?.id]);

  // Light the step being asked about on the 3D, following Next and Previous.
  const dims = useMemo(() => sceneDims(data, shape), [data, shape]);
  const focusAt = finished ? null : slotFocus(item, data, dims);
  const focus = focusAt && item?.type === "slot" ? { ...focusAt, label: [slotContext(item.slot, data, lang), slotLabel(item.slot, lang)].filter(Boolean).join(" · ") } : null;
  const focusKey = focus ? `${focus.segmentIndex}:${focus.stepIndex}:${focus.part}:${focus.dim ?? ""}:${focus.label}` : "";
  const focusRef = useRef(onFocus);
  focusRef.current = onFocus;
  useEffect(() => {
    focusRef.current?.(focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);
  useEffect(() => () => focusRef.current?.(null), []);

  // Modify: the reading box takes the place of Approve and gets the keyboard.
  useEffect(() => { if (modifying) input.current?.focus(); }, [modifying]);
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    input.current?.focus();
  }, [item?.id]);

  useEffect(() => {
    const node = input.current;
    if (!node || item?.type !== 'slot' || item.slot.unit !== 'len') return;
    const receive = (event: Event) => {
      const value = (event as CustomEvent<LaserInputDetail>).detail?.value;
      if (!value) return;
      event.preventDefault();
      set(d => item.slot.put(d, value));
      setToast(null);
      const next = nextOpenItem({ ...queue, open: queue.open.filter(entry => entry.id !== item.id) }, item.id);
      setCurrentId(next?.id ?? null);
    };
    node.addEventListener(LASER_INPUT_EVENT, receive);
    return () => node.removeEventListener(LASER_INPUT_EVENT, receive);
  }, [item, queue, set]);
  // Forms that draw their own elevation light the number this card is on.
  const followSlot = item?.type === "slot" && item.slot.group ? item.slot : null;
  useEffect(() => {
    if (!followSlot?.group) return;
    // After this render's effects: the form below subscribes after the card on first paint.
    const t = setTimeout(() => locateMeasure({ groupId: followSlot.group!.id, groupKind: followSlot.group!.kind, part: followSlot.part, scroll: false }), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followSlot?.id]);

  function copy(slot: NextSlot, overwrite: boolean) {
    const plan = slotCopy(slot.id, data);
    if (!stepPart(slot) && plan) {
      // Another work type's "Same for all": every opening, every post.
      let done: ReturnType<typeof applyCopy> | null = null;
      const n = plan.targets(overwrite).length;
      if (!n) return;
      set((d) => { done = applyCopy(d, plan, overwrite); });
      setCopyMenu(false);
      const restore = onUndo ?? (() => set((d) => {
        for (const b of (done as ReturnType<typeof applyCopy> | null)?.before ?? []) if (b.w.get(d) === b.value) b.w.set(d, b.old);
      }));
      setToast({ n, restore, keys: [plan.copied1Key, plan.copiedKey] });
      return;
    }
    const step = stepPart(slot);
    if (!step) return;
    const seg = data.segments[step.segIdx];
    if (seg?.kind !== "flight") return;
    const targets = stepCopyTargets(data, step.segIdx, step.stepIdx, step.key, overwrite);
    if (!targets.length) return;
    const before = targets.map((k) => [k, seg.steps[k][step.key]] as const), value = seg.steps[step.stepIdx][step.key];
    set((d) => void copyStepValue(d, step.segIdx, step.stepIdx, step.key, overwrite));
    setCopyMenu(false);
    // Undo through the sheet's history; without one, put back exactly the steps this copy wrote.
    const restore = onUndo ?? (() => set((d) => {
      const fl = d.segments[step.segIdx];
      if (fl?.kind === "flight") for (const [k, old] of before) if (fl.steps[k]?.[step.key] === value) fl.steps[k][step.key] = old;
    }));
    setToast({ n: targets.length, restore });
  }

  function go(direction: 1 | -1) {
    const next = nextOpenItem(queue, item?.id ?? null, direction);
    // Keep the keyboard up while walking from number to number.
    refocus.current = !!next && next.type === "slot" && document.activeElement === input.current;
    setDir(direction === 1 ? "fwd" : "back");
    setCurrentId(next ? next.id : null);
  }
  function backToLast() {
    const last = queue.slots[queue.slots.length - 1];
    setDetails(false);
    setDir("back");
    setCurrentId(last ? last.id : null);
  }

  const remaining = queue.open.length;
  const pct = queue.total ? Math.round((100 * queue.done) / queue.total) : 0;
  const progress = queue.total > 0 && (
    <span className="tabular-nums text-[13px] font-semibold text-slate-500">{nx(lang, "nx_of", { a: queue.done, b: queue.total })}</span>
  );
  const bar = queue.total > 0 && (
    <div role="progressbar" aria-label={nx(lang, "nx_recorded")} aria-valuemin={0} aria-valuemax={queue.total} aria-valuenow={queue.done} className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-[width,background-color] duration-500 motion-reduce:transition-none ${pct === 100 ? "bg-emerald-500" : "bg-indigo-600"}`} style={{ width: `${pct}%` }} />
    </div>
  );
  const navBtn = "grid h-14 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition-transform active:scale-95 disabled:opacity-30";
  const shell = "overflow-hidden rounded-[22px] border border-slate-200 bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,.04)]";
  const label = nx(lang, "nx_card");

  if (finished || !item) {
    const left = queue.open.length;
    return (
      <section aria-label={label} data-next-measure data-next-done className={`@container ${shell}`}>
        <style>{MOTION}</style>
        <div className="p-4 @2xl:flex @2xl:items-center @2xl:gap-6 @2xl:px-5"><div className="min-w-0 @2xl:flex-1">
          <div className="flex items-center gap-3.5">
            <span data-nx-pop className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_6px_16px_-6px_rgba(16,185,129,.7)]">
              <Check aria-hidden className="h-6 w-6" color="#fff" strokeWidth={3} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-semibold leading-tight tracking-tight">{queue.total > 0 ? nx(lang, "nx_allIn") : nx(lang, "nx_everything")}</p>
              <p className="mt-0.5 text-[13px] text-slate-500">
                {queue.total > 0 && nx(lang, "nx_allInSub", { n: queue.total })}
                {left > 0 && <>{queue.total > 0 && " · "}{left === 1 ? nx(lang, "nx_detailLeft") : nx(lang, "nx_detailsLeft", { n: left })}</>}
              </p>
            </div>
          </div>
          {bar}
          </div><div className="mt-3 flex items-stretch gap-2 @2xl:mt-0 @2xl:w-[440px] @2xl:shrink-0">
            {queue.slots.length > 0 && (
              <button type="button" aria-label={nx(lang, "nx_prev")} onClick={backToLast} className={navBtn}><ChevronLeft aria-hidden className="h-5 w-5" /></button>
            )}
            {left > 0 && (
              <button type="button" onClick={() => { setDetails(true); setDir("fwd"); setCurrentId(queue.open[0].id); }}
                className="min-h-14 flex-1 rounded-2xl border border-slate-200 bg-white px-4 font-semibold text-slate-800 transition-transform active:scale-[.98]">
                {nx(lang, "nx_continue")}
              </button>
            )}
            {onDone && (
              <button type="button" onClick={onDone} className="flex min-h-14 flex-1 items-center justify-center gap-1 rounded-2xl bg-indigo-600 px-4 font-semibold text-white transition-transform active:scale-[.98]">
                {nx(lang, "nx_review")}<ChevronRight aria-hidden className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const kicker = (context?: string) => (
    <p className="truncate text-[13px] font-semibold text-slate-500">
      <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-indigo-600">{nx(lang, "nx_next")}</span>
      {context ? ` · ${context}` : ""}
    </p>
  );

  if (item.type === "gap") {
    return (
      <section aria-label={label} data-next-measure className={`@container ${shell}`}>
        <style>{MOTION}</style>
        <div className="p-3.5 @2xl:flex @2xl:items-center @2xl:gap-6 @2xl:px-5"><div className="min-w-0 @2xl:flex-1">
          <div key={item.id} data-nx-anim={dir || undefined} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">{kicker()}<p className="text-lg font-semibold leading-snug">{gapLabel(item.gap)}</p></div>
            {progress}
          </div>
          {bar}
          </div><div className="mt-2.5 flex items-center gap-2 @2xl:mt-0 @2xl:w-[440px] @2xl:shrink-0">
            <button type="button" aria-label={nx(lang, "nx_prev")} disabled={remaining < 2 && !queue.slots.length} onClick={() => (remaining < 2 ? backToLast() : go(-1))} className={navBtn}><ChevronLeft aria-hidden className="h-5 w-5" /></button>
            <button type="button" onClick={() => onOpenGap(item.gap)} className="min-h-14 flex-1 rounded-2xl bg-indigo-600 px-4 font-semibold text-white transition-transform active:scale-[.98]">{nx(lang, "nx_open")}</button>
            <button type="button" aria-label={nx(lang, "nx_skip")} disabled={remaining < 2} onClick={() => go(1)} className={navBtn}><ChevronRight aria-hidden className="h-5 w-5" /></button>
          </div>
        </div>
      </section>
    );
  }

  const slot = item.slot;
  const value = slot.get(data);
  const name = slotLabel(slot, lang);
  const context = slotContext(slot, data, lang);
  const rb = readback(slot, value);
  const filled = value.trim() !== "";
  const valid = filled && rb.ok;
  const placeholder = slot.unit === "deg" ? "0°" : slot.unit === "count" ? "0" : unitPlaceholder;
  const canShow = !!onShow && (slot.segIdx !== undefined || !!slot.group || !!slot.part);
  // A step in a flight of several reserves the copy row, so the card never jumps as the number goes in.
  const step = stepPart(slot);
  const flightSteps = step && data.segments[step.segIdx]?.kind === "flight" ? (data.segments[step.segIdx] as { steps: unknown[] }).steps.length : 0;
  const plan = step ? null : slotCopy(slot.id, data);
  const copyRow = step && flightSteps > 1
    ? { empty: stepCopyTargets(data, step.segIdx, step.stepIdx, step.key).length, all: stepCopyTargets(data, step.segIdx, step.stepIdx, step.key, true).length, label: "nx_copyAll" }
    : plan ? { empty: plan.targets(false).length, all: plan.targets(true).length, label: plan.labelKey } : null;
  const canCopy = (valid || !!plan) && !!copyRow && copyRow.all > 0;
  // Tapping a copy button must not drop the keyboard (or the fraction bar riding on it).
  const keep = (e: React.PointerEvent) => { if (document.activeElement === input.current) e.preventDefault(); };
  const angle = slotAngle(slot, data);
  // A stair angle, or any other work type's calculated number (leaf widths, fabricate-to size, fall …).
  const calcSlot: CalcSlot | null = angle ? { ...angle, unit: "deg", tol: DEG_TOL } : slotCalc(slot.id, data);
  const approve = calcSlot && calcSlot.calc !== null ? calcSlot : null;
  const angleSt = approve ? calcState(value, approve.source, approve.calc, approve.unit) : "empty";
  const angleChk = approve && angleSt === "measured" ? calcCheck(approve.calc, parseMeas(value), approve.tol, approve.unit) : null;
  const modifyingThis = modifying === slot.id;
  const approveAndGo = () => {
    if (!approve) return;
    set((d) => approve.approve(d));
    setDir("fwd");
    const next = nextOpenItem({ ...queue, open: queue.open.filter((e) => e.id !== item.id) }, item.id);
    setCurrentId(next?.id ?? null);
  };
  return (
    <section aria-label={label} data-next-measure data-next-slot={slot.id} className={`@container ${shell}`}>
      <style>{MOTION}</style>
      {/* Phone: stacked. A wide card (tablet, full-width forms): name left, tape box right. */}
      <div className="p-3.5 @2xl:flex @2xl:items-center @2xl:gap-6 @2xl:px-5">
        <div className="min-w-0 @2xl:flex-1">
        <div className="flex items-center gap-2">
          <div key={item.id} data-nx-anim={dir || undefined} className="min-w-0 flex-1">
            {kicker(context)}
            <p aria-hidden className="line-clamp-2 text-xl font-semibold leading-tight tracking-tight" onClick={() => input.current?.focus()}>{name}</p>
          </div>
          {progress}
          {canShow && (
            <button type="button" onClick={() => onShow!(slot)} aria-label={nx(lang, "nx_show")} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-indigo-600 transition-colors active:bg-indigo-50"><Crosshair aria-hidden className="h-5 w-5" /></button>
          )}
        </div>
        {bar}
        </div>
        <div className="@2xl:w-[440px] @2xl:shrink-0">
        {/* Copy sits above the tape box: with the keypad and fraction bar up, below it is hidden. */}
        {(copyRow || toast) && (
          <div className="mt-2.5 flex min-h-10 items-center gap-2">
            {toast ? (
              <div data-nx-toast role="status" className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full pl-3.5 pr-1.5 text-[15px] font-semibold"
                style={{ background: "#1c1c1e", color: "#ffffff", boxShadow: "0 8px 20px -10px rgba(0,0,0,.55)" }}>
                <Check aria-hidden className="h-4 w-4 shrink-0" color="#34d399" strokeWidth={3} />
                <span className="min-w-0 flex-1 truncate">{toast.n === 1 ? nx(lang, toast.keys?.[0] ?? "nx_copied1") : nx(lang, toast.keys?.[1] ?? "nx_copied", { n: toast.n })}</span>
                <button type="button" onPointerDown={keep} onClick={() => { toast.restore(); setToast(null); }}
                  className="h-8 shrink-0 rounded-full px-3 text-[15px] font-semibold" style={{ color: "#a5b4fc", background: "rgba(255,255,255,.08)" }}>
                  {nx(lang, "nx_undo")}
                </button>
              </div>
            ) : copyMenu && copyRow ? (
              <div data-nx-toast role="group" aria-label={nx(lang, copyRow.label)} className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {copyRow.empty > 0 && (
                  <button type="button" onPointerDown={keep} onClick={() => copy(slot, false)} className="flex h-10 items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 text-[15px] font-semibold text-indigo-700 active:scale-[.97]">
                    {nx(lang, "nx_copyEmpty")}<span className="tabular-nums text-indigo-500">{copyRow.empty}</span>
                  </button>
                )}
                <button type="button" onPointerDown={keep} onClick={() => copy(slot, true)} className="flex h-10 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3.5 text-[15px] font-semibold text-amber-800 active:scale-[.97]">
                  {nx(lang, "nx_copyOverwrite")}<span className="tabular-nums text-amber-600">{copyRow.all}</span>
                </button>
                <button type="button" onPointerDown={keep} aria-label={nx(lang, "nx_cancel")} onClick={() => setCopyMenu(false)} className="grid h-10 w-10 place-items-center rounded-full text-slate-500 active:bg-slate-100">
                  <X aria-hidden className="h-[18px] w-[18px]" />
                </button>
              </div>
            ) : copyRow ? (
              <>
                <button type="button" onPointerDown={keep} data-nx-copy disabled={!canCopy} onClick={() => (copyRow.empty > 0 ? copy(slot, false) : setCopyMenu(true))}
                  className="flex h-10 min-w-0 items-center gap-2 rounded-full bg-indigo-50 pl-3 pr-3.5 text-[15px] font-semibold text-indigo-700 transition-[transform,opacity] active:scale-[.97] disabled:bg-slate-100 disabled:text-slate-400">
                  <Copy aria-hidden className="h-4 w-4 shrink-0" />
                  <span className="truncate">{nx(lang, copyRow.label)}</span>
                  {canCopy && copyRow.empty > 0 && <span className="rounded-full bg-white px-1.5 text-[13px] tabular-nums text-indigo-600">{copyRow.empty}</span>}
                </button>
                {canCopy && copyRow.all > copyRow.empty && copyRow.empty > 0 && (
                  <button type="button" onPointerDown={keep} data-nx-more aria-label={nx(lang, "nx_copyMore")} onClick={() => setCopyMenu(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 active:bg-slate-100">
                    <MoreHorizontal aria-hidden className="h-5 w-5" />
                  </button>
                )}
              </>
            ) : null}
          </div>
        )}
        {/* An angle the steps already give: the calculation, approved in one tap or read and checked. */}
        {approve && (
          <div key={item.id} data-approve-calc data-approve-state={angleSt} className="mt-3 flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1.5">
            <p className="mr-auto shrink-0 whitespace-nowrap text-[15px] font-semibold text-slate-500">
              {dimWord(lang, "calculated")} <span data-approve-calc-value className="text-[20px] tabular-nums tracking-tight text-slate-900">{dimText(approve.calc!, approve.unit)}</span>
              {approve.note && <span data-approve-calc-note className="ml-1.5 text-[13px] font-medium tabular-nums text-slate-400">{approve.note}</span>}
            </p>
            {angleSt === "approved" ? (
              <span role="status" aria-label={dimWord(lang, "approvedA11y")} className="flex h-9 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-[15px] font-semibold text-emerald-700">
                <Check aria-hidden className="h-4 w-4" strokeWidth={3} />{dimWord(lang, "approved")}
              </span>
            ) : angleChk ? (
              <>
                <span data-approve-check={angleChk.level} className={`inline-flex h-9 items-center rounded-full px-3 text-[14px] font-semibold tabular-nums ring-1 ${CHECK_TONE[angleChk.level]}`}>
                  {angleChk.delta >= 0 ? "+" : "−"}{dimText(Math.abs(angleChk.delta), approve.unit)} {dimWord(lang, "vsCalc")}
                </span>
                <button type="button" onPointerDown={keep} onClick={() => set((d) => approve.approve(d))} className="h-9 rounded-full px-2.5 text-[15px] font-semibold text-indigo-600 active:bg-indigo-50">{dimWord(lang, "useCalc")}</button>
              </>
            ) : angleSt === "measured" ? (
              <button type="button" onPointerDown={keep} onClick={() => set((d) => approve.approve(d))} className="h-9 rounded-full px-2.5 text-[15px] font-semibold text-indigo-600 active:bg-indigo-50">{dimWord(lang, "useCalc")}</button>
            ) : angleSt === "empty" && !modifyingThis ? (
              <button type="button" data-approve-modify onClick={() => setModifying(slot.id)} className="h-9 rounded-full px-3 text-[15px] font-semibold text-indigo-600 active:bg-indigo-50">{dimWord(lang, "modify")}</button>
            ) : null}
          </div>
        )}
        <div className={`mt-2.5 flex items-stretch gap-2 ${copyRow || toast || approve ? "" : "@2xl:mt-5"}`}>
          <button type="button" data-nx-nav="prev" aria-label={nx(lang, "nx_prev")} disabled={remaining < 1 || (remaining === 1 && !filled && queue.open[0]?.id === item.id)} onClick={() => go(-1)} className={navBtn}><ChevronLeft aria-hidden className="h-5 w-5" /></button>
          {approve && angleSt === "empty" && !modifyingThis ? (
            <button type="button" data-approve-ok onClick={approveAndGo}
              className="flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-[17px] font-semibold text-white shadow-[0_6px_14px_-8px_rgba(79,70,229,.9)] transition-transform active:scale-[.98]">
              <Check aria-hidden className="h-5 w-5" strokeWidth={3} />{dimWord(lang, "approve")}
            </button>
          ) : <div className={`relative min-w-0 flex-1 rounded-2xl border bg-slate-50 transition-colors focus-within:bg-white ${rb.ok ? "border-slate-200 focus-within:border-indigo-500" : "border-amber-500"}`}>
            <input
              ref={input}
              id="next-measure-input"
              aria-label={`${nx(lang, "nx_next")}: ${context ? `${context} · ` : ""}${name}`}
              aria-invalid={!rb.ok || undefined}
              data-m="1"
              data-laser-unit={slot.unit}
              value={value}
              onChange={(e) => {
                // Pin the card to this field: once it holds a value it leaves the
                // open list, and the card must not jump mid-number.
                if (currentId !== slot.id) setCurrentId(slot.id);
                setToast(null);
                const v = e.target.value;
                set((d) => (approve ? approve.read(d, v) : slot.put(d, v)));
              }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); go(1); } }}
              placeholder={placeholder}
              autoComplete="off"
              inputMode="decimal"
              enterKeyHint="next"
              style={{ outline: "none" }}
              className="h-14 w-full bg-transparent px-3 text-[28px] font-semibold tabular-nums tracking-tight outline-none placeholder:font-normal placeholder:text-slate-400"
            />
          </div>}
          <button type="button" data-nx-nav="next" onClick={() => go(1)} aria-label={valid ? nx(lang, "nx_next") : nx(lang, "nx_skip")}
            className={`flex h-14 shrink-0 items-center gap-1 rounded-2xl px-4 font-semibold transition-[transform,background-color,color] duration-200 active:scale-95 ${valid ? "bg-indigo-600 text-white shadow-[0_6px_14px_-8px_rgba(79,70,229,.9)]" : "border border-slate-200 bg-white text-slate-600"}`}>
            {valid ? nx(lang, "nx_next") : nx(lang, "nx_skip")}<ChevronRight aria-hidden className="h-4 w-4" />
          </button>
        </div>
        {/* Read back what will be saved, in the shop's own notation. */}
        {!approve && <p aria-live="polite" className={`mt-1.5 flex min-h-5 items-center gap-1.5 pl-[52px] text-[13px] font-semibold tabular-nums ${rb.ok ? "text-slate-500" : "text-amber-700"}`}>
          {rb.text
            ? rb.ok ? <><Check aria-hidden className="h-3.5 w-3.5 text-emerald-600" strokeWidth={3} />{rb.text}</> : nx(lang, "nx_notNumber")
            : slot.unit === "len" && <span aria-hidden className="whitespace-pre font-medium text-slate-400">{`3' 4-1/2"  ·  40.5  ·  40 1/2`}</span>}
        </p>}
        </div>
      </div>
    </section>
  );
}
