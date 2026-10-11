"use client";

// Small building blocks shared by the wall-cap and shop-piece sheets: panels,
// segmented controls, chips, steppers, switches, verdict tiles and a check
// list. Same look as the structural sheet (one system, Apple-style).

import { useContext, useLayoutEffect, useRef, useState } from "react";
import { formatMeas } from "@/lib/shop/measure-parse";
import { MeasUnits } from "../MeasUnits";
import type { CheckLevel, CheckResult } from "@/lib/shop/measure-checks";
import { mt } from "@/lib/shop/measure-i18n";
import { fmtLen } from "./StructuralSketch";

export { fmtLen };

/**
 * Width of a box in CSS pixels, so a drawing can be laid out 1 unit = 1 px and
 * keep its labels readable on a phone. Falls back to `fallback` until measured
 * (server render, print snapshot, tests).
 */
export function useBoxWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const read = () => { const x = Math.round(el.getBoundingClientRect().width); if (x > 0) setW(Math.max(300, x)); };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export type Fmt = (n: number | null | undefined) => string;

/**
 * Shop notation in the sheet's units (MeasUnits): 36 1/8" on an inch sheet,
 * 3' 1/8" on a feet+inches sheet. Every number these sheets draw or print goes
 * through it.
 */
export function useMeasFmt(): Fmt {
  const units = useContext(MeasUnits);
  return (n) => (n === null || n === undefined || !Number.isFinite(n) ? "—" : `${n < 0 ? "−" : ""}${formatMeas(Math.abs(n), units)}`);
}

/** Inches only, to the 1/16 — for heights and edge distances the crew reads in inches (42", not 3' 6"). */
export function fmtIn(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const neg = n < 0;
  const s16 = Math.round(Math.abs(n) * 16);
  const whole = Math.floor(s16 / 16);
  let num = s16 % 16, den = 16;
  while (num && num % 2 === 0) { num /= 2; den /= 2; }
  const txt = num ? (whole ? `${whole} ${num}/${den}` : `${num}/${den}`) : `${whole}`;
  return `${neg ? "−" : ""}${txt}"`;
}

export const DOT: Record<CheckLevel, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  na: "bg-slate-300",
};
export const PILL: Record<CheckLevel, string> = {
  green: "bg-green-600/20 border-green-500 text-green-300",
  yellow: "bg-amber-500/15 border-amber-500 text-amber-300",
  red: "bg-red-600/20 border-red-500 text-red-300",
  na: "bg-neutral-800 border-neutral-700 text-neutral-500",
};

export function worst(levels: CheckLevel[]): CheckLevel {
  if (levels.includes("red")) return "red";
  if (levels.includes("yellow")) return "yellow";
  if (levels.includes("green")) return "green";
  return "na";
}

export function Panel({ title, aside, children, id }: { title?: string; aside?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      {title && (
        <h3 className="mb-3 flex items-center gap-2 text-[17px] font-semibold tracking-tight text-slate-900">
          {title}
          {aside && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{aside}</span>}
        </h3>
      )}
      {children}
    </section>
  );
}

export function Group({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">{title}</div>
        {badge}
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: CheckLevel }) {
  const color = tone === "red" ? "text-red-700" : tone === "yellow" ? "text-amber-800" : "text-slate-900";
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5">
      <dt className="truncate text-[13px] font-medium text-slate-500">{label}</dt>
      <dd className={`mt-0.5 truncate text-[17px] font-semibold leading-tight tabular-nums sm:text-lg ${color}`}>{value}</dd>
      {sub ? <dd className="text-[13px] font-medium leading-snug text-slate-500">{sub}</dd> : null}
    </div>
  );
}

export function Seg({ label, value, options, onChange, required = false, small = false, cols }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void; required?: boolean; small?: boolean; cols?: 2 | 3 }) {
  const grid = cols === 3 ? "grid grid-cols-3" : cols === 2 || options.length > 3 ? "grid grid-cols-2 sm:flex" : "flex sm:max-w-md";
  return (
    <div role="group" aria-label={label} className="min-w-0">
      <div className={`mb-1 text-[13px] ${required ? "text-red-300" : "text-neutral-400"}`}>{label}</div>
      <div className={`${grid} gap-1 rounded-xl bg-slate-100 p-1 ${required ? "ring-1 ring-red-400" : ""}`}>
        {options.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(value === v ? "" : v)}
            className={`${small ? "min-h-9 text-[13px]" : "min-h-11 text-sm"} min-w-0 flex-1 rounded-lg px-2 font-semibold leading-tight transition ${
              value === v ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200" : "text-slate-600"
            }`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Tappable presets under a field; hidden once the field has a value of its own. */
export function Chips({ value, options, onPick }: { value: string; options: [string, string][]; onPick: (v: string) => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onPick(v)}
          className={`min-h-9 rounded-full border px-3 text-[13px] font-semibold ${value === v ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ label, value, onChange, min = 1 }: { label: string; value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div role="group" aria-label={label}>
      <div className="mb-1 text-[13px] text-neutral-400">{label}</div>
      <div className="flex h-[46px] items-center rounded-lg border border-slate-200 bg-white">
        <button type="button" aria-label="−" onClick={() => onChange(Math.max(min, value - 1))} className="h-full w-10 text-lg font-semibold text-slate-600">−</button>
        <span className="w-7 text-center text-base font-semibold tabular-nums">{value}</span>
        <button type="button" aria-label="+" onClick={() => onChange(Math.min(99, value + 1))} className="h-full w-10 text-lg font-semibold text-slate-600">+</button>
      </div>
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={(e) => { e.preventDefault(); onChange(!on); }}
      className={`relative h-8 w-[52px] shrink-0 rounded-full transition ${on ? "bg-indigo-600" : "bg-slate-300"}`}>
      <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[24px]" : "left-1"}`} />
    </button>
  );
}

export function SwitchRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-3">
      <span className="text-[15px] font-semibold text-slate-900">{label}</span>
      <Switch on={on} onChange={onChange} label={label} />
    </label>
  );
}

export function More({ lang, children }: { lang: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex min-h-11 items-center gap-1.5 text-sm font-semibold text-indigo-700">
        <span aria-hidden="true" className={`inline-block transition ${open ? "rotate-90" : ""}`}>›</span>
        {mt(lang, open ? "st_lessDetails" : "st_moreDetails")}
      </button>
      {open && <div className="mt-2 space-y-3">{children}</div>}
    </div>
  );
}

export function DeltaBadge({ delta, tol }: { delta: number; tol: { green: number; yellow: number } }) {
  const fm = useMeasFmt();
  const level: CheckLevel = delta <= tol.green ? "green" : delta <= tol.yellow ? "yellow" : "red";
  return <span className={`rounded-full border px-2 py-0.5 text-[13px] font-semibold ${PILL[level]}`}>Δ {fm(delta)}</span>;
}

export function Verdict({ level, title, text }: { level: CheckLevel; title: string; text: string }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${PILL[level]}`}>
      <div className="text-[13px] font-semibold">{level === "green" ? "✓ " : level === "red" ? "✕ " : "! "}{title}</div>
      {text && <div className="text-[13px] opacity-90">{text}</div>}
    </div>
  );
}

export function StatusPills({ lang, checks, gaps }: { lang: string; checks: CheckResult[]; gaps: number }) {
  const reds = checks.filter((c) => c.level === "red").length;
  const yellows = checks.filter((c) => c.level === "yellow").length;
  return (
    <div className="flex items-center gap-1.5 text-[13px] font-semibold">
      {reds > 0 && <span className={`rounded-full border px-2.5 py-1 ${PILL.red}`}>{reds} {mt(lang, "st_toFix")}</span>}
      {yellows > 0 && <span className={`rounded-full border px-2.5 py-1 ${PILL.yellow}`}>{yellows} {mt(lang, "st_toReview")}</span>}
      {reds === 0 && yellows === 0 && gaps === 0 && <span className={`rounded-full border px-2.5 py-1 ${PILL.green}`}>✓ {mt(lang, "st_allGood")}</span>}
    </div>
  );
}

/** One line of numbers under a check: "<expected label> 3" · <actual label> 2 1/2"". */
export type CheckLabels = Record<string, [string, string]>;
export function checkNumbers(lang: string, c: CheckResult, labels: CheckLabels, fm: Fmt = fmtIn): string {
  if (c.expected === null || c.actual === null) return "";
  const l = labels[c.key];
  if (l) return `${mt(lang, l[0])} ${fm(c.expected)} · ${mt(lang, l[1])} ${fm(c.actual)}`;
  return `${fm(c.expected)} / ${fm(c.actual)} · Δ ${fm(Math.abs(c.delta ?? 0))}`;
}

export function CheckList({ lang, checks, labels, issuesOnly = false, collapsePassed = false }: { lang: string; checks: CheckResult[]; labels: CheckLabels; issuesOnly?: boolean; collapsePassed?: boolean }) {
  const fm = useMeasFmt();
  const [showPassed, setShowPassed] = useState(false);
  const order: Record<CheckLevel, number> = { red: 0, yellow: 1, green: 2, na: 3 };
  const sorted = [...checks].filter((c) => c.level !== "na").sort((a, b) => order[a.level] - order[b.level]);
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
                <span className="block text-[15px] text-slate-800">{mt(lang, `check_${c.key}`)}{c.detail ? <span className="text-slate-500"> · {c.detail}</span> : null}</span>
                {checkNumbers(lang, c, labels, fm) && <span className="block text-[13px] tabular-nums text-slate-500">{checkNumbers(lang, c, labels, fm)}</span>}
              </span>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-bold uppercase ${PILL[c.level]}`}>
                {mt(lang, c.level === "green" ? "st_ok" : c.level === "yellow" ? "st_review" : "st_fix")}
              </span>
            </li>
          ))}
        </ul>
      )}
      {collapsePassed && passed.length > 0 && (
        <button type="button" onClick={() => setShowPassed(!showPassed)} className="mt-2 flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-700">
          <span aria-hidden="true" className={`size-2.5 rounded-full ${DOT.green}`} />
          {showPassed ? mt(lang, "st_hidePassed") : `${passed.length} ${mt(lang, "st_passed")}`}
        </button>
      )}
    </div>
  );
}

/** Drawing / 3D switch for the top of a sheet. */
export function ViewToggle({ value, options, onChange, label }: { value: string; options: [string, string][]; onChange: (v: string) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-full bg-slate-100 p-0.5">
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={`min-h-9 rounded-full px-3.5 text-[13px] font-semibold transition ${value === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Notes({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] text-neutral-400">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-2.5 text-base" />
    </label>
  );
}
