"use client";

/**
 * Approve or modify a calculated value — the generic row any work type can use
 * when a number the sheet asks for is already implied by the others (a stair's
 * angle from its rise and run, the change of angle across a joint, a diagonal
 * from its sides).
 *
 *   Calculated 33.4°   [Approve]  [Modify]
 *
 * Approve stores the calculated value with source 'calculated-approved'.
 * Modify opens a box for the reading (digital angle finder, tape) and holds it
 * against the calculation: green within `tol[0]`, yellow within `tol[1]`, red
 * beyond (the same bands as the joint check). Nothing is ever forced to be
 * typed from scratch while a calculation exists.
 *
 * Props: `calc` (null = nothing to approve yet: plain box), `value` + `source`
 * (what is stored), `onApprove()`, `onChange(value)` (a reading; the caller
 * marks it 'measured'), `unit` ('deg' | 'len'), `variant` ('card' on the Next
 * card, 'form' inside the detail forms).
 */
import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import type { AngleSource } from "@/lib/shop/measure-angle";
import { calcCheck, calcState, DEG_TOL, LEN_TOL } from "@/lib/shop/measure-calc";
import { dimText } from "@/lib/shop/measure-dims";
import { dimWord } from "@/lib/shop/measure-dims-i18n";
import { parseMeas } from "@/lib/shop/measure-parse";

export type ApproveProps = {
  lang: string;
  calc: number | null;
  value: string;
  source?: AngleSource;
  unit?: "deg" | "len";
  onApprove: () => void;
  onChange: (value: string) => void;
  variant?: "card" | "form";
  /** Accessible name of the reading box. */
  label?: string;
  placeholder?: string;
  /** Opens straight into the reading box (the card hands focus to it). */
  inputId?: string;
  /** The reading box lives outside (a form field with its own help): show only the calculation, Approve and the cross-check. */
  external?: boolean;
  /** Cross-check bands [green, yellow]; null = a choice, no colour. Default by unit. */
  tol?: [number, number] | null;
};

const TONE = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  yellow: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
} as const;

export default function ApproveCalculated({ lang, calc, value, source, unit = "deg", onApprove, onChange, variant = "card", label, placeholder, inputId, external = false, tol }: ApproveProps) {
  const fmt = (n: number) => dimText(n, unit);
  const stored = value.trim();
  const approved = calcState(value, source, calc, unit) === "approved";
  const [editing, setEditing] = useState(false);
  const reading = stored && !approved ? parseMeas(stored) : null;
  const check = calcCheck(calc, reading, tol === undefined ? (unit === "deg" ? DEG_TOL : LEN_TOL) : tol, unit);
  const showBox = !external && (calc === null || editing || (!!stored && !approved));
  const showCheck = (external || showBox) && !!check;
  const card = variant === "card";
  const box = card
    ? "h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[28px] font-semibold tabular-nums tracking-tight outline-none focus:border-indigo-500 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
    : "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[17px] font-semibold tabular-nums outline-none focus:border-indigo-500 placeholder:font-normal placeholder:text-slate-400";
  const pill = card ? "h-14 px-5 text-[17px]" : "h-11 px-4 text-[15px]";
  return (
    <div data-approve-calc data-approve-state={approved ? "approved" : stored ? "measured" : calc === null ? "waiting" : "pending"} className="w-full">
      {calc !== null && (
        <div className={`flex flex-wrap items-center gap-2 ${card ? "" : "mt-2"}`}>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-slate-500">{dimWord(lang, "calculated")}</p>
            <p data-approve-calc-value className={`font-semibold tabular-nums tracking-tight ${card ? "text-[26px] leading-tight" : "text-[20px]"} ${approved ? "text-emerald-700" : "text-slate-900"}`}>
              {fmt(calc)}
            </p>
          </div>
          {approved ? (
            <>
              <span role="status" aria-label={dimWord(lang, "approvedA11y")} className={`flex items-center gap-1.5 rounded-full bg-emerald-50 font-semibold text-emerald-700 ${card ? "h-11 px-4 text-[15px]" : "h-9 px-3 text-[14px]"}`}>
                <Check aria-hidden className="h-4 w-4" strokeWidth={3} />{dimWord(lang, "approved")}
              </span>
              {!external && <button type="button" data-approve-modify onClick={() => setEditing(true)} className={`flex items-center gap-1.5 rounded-full font-semibold text-indigo-600 active:bg-indigo-50 ${card ? "h-11 px-3 text-[15px]" : "h-9 px-2.5 text-[14px]"}`}>
                <Pencil aria-hidden className="h-4 w-4" />{dimWord(lang, "modify")}
              </button>}
            </>
          ) : !stored && !editing ? (
            <div className="flex shrink-0 gap-2">
              {!external && <button type="button" data-approve-modify onClick={() => setEditing(true)} className={`rounded-2xl border border-slate-200 bg-white font-semibold text-slate-700 transition-transform active:scale-[.97] ${pill}`}>
                {dimWord(lang, "modify")}
              </button>}
              <button type="button" data-approve-ok onClick={onApprove} className={`flex items-center gap-1.5 rounded-2xl bg-indigo-600 font-semibold text-white shadow-[0_6px_14px_-8px_rgba(79,70,229,.9)] transition-transform active:scale-[.97] ${pill}`}>
                <Check aria-hidden className="h-[18px] w-[18px]" strokeWidth={3} />{dimWord(lang, "approve")}
              </button>
            </div>
          ) : null}
        </div>
      )}
      {showBox && (
        <div className={calc !== null ? "mt-2.5" : ""}>
          <input
            id={inputId}
            aria-label={label}
            data-m="1"
            data-laser-unit={unit}
            autoFocus={editing && calc !== null}
            value={approved ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? (unit === "deg" ? "0°" : "")}
            inputMode="decimal"
            autoComplete="off"
            className={box}
          />
        </div>
      )}
      {showCheck && check && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span data-approve-check={check.level} className={`inline-flex h-8 items-center rounded-full px-3 text-[14px] font-semibold tabular-nums ring-1 ${TONE[check.level]}`}>
                {dimWord(lang, "measured")} {fmt(reading!)} · {check.delta >= 0 ? "+" : "−"}{fmt(Math.abs(check.delta))} {dimWord(lang, "vsCalc")}
              </span>
              <button type="button" onClick={() => { setEditing(false); onApprove(); }} className="h-8 rounded-full px-2.5 text-[14px] font-semibold text-indigo-600 active:bg-indigo-50">
                {dimWord(lang, "useCalc")}
              </button>
            </div>
      )}
      {calc === null && !card && <p className="mt-1.5 text-[13px] text-slate-500">{dimWord(lang, "waiting")}</p>}
    </div>
  );
}
