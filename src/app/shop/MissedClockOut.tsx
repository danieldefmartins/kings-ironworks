"use client";

// "Você não marcou a saída de quinta, 5/11. Que horas você saiu?"
//
// Shown when a worker opens the app or taps the clock while a shift from an
// earlier day is still open (or was closed the next morning by a tap). It
// never closes the old shift at "now": the worker picks the real time, on
// that day, after the clock-in. "Salvar e marcar entrada agora" then clocks
// in for today through the normal punch path (location rule included).

import { useState } from "react";
import { Clock3 } from "lucide-react";
import { fmtTime } from "@/lib/shop/shared";
import { atDay, hhmm, longDay, missedOutError, tf, type MissedOut } from "@/lib/shop/time-fix";

export default function MissedClockOut({ question, lang, canClockIn, onSaved }: {
  question: MissedOut;
  lang: string;
  /** Offer "save and clock in now" (an open shift, not already clocked in today). */
  canClockIn: boolean;
  onSaved: (endedAt: string, clockIn: boolean) => void;
}) {
  const [time, setTime] = useState(() => hhmm(question.defaultEnd));
  const [busy, setBusy] = useState<null | "in" | "save">(null);
  const [error, setError] = useState("");
  const day = longDay(question.startedAt, lang);
  const iso = time ? atDay(question.day, time) : "";
  const problem = iso ? missedOutError(question, iso) : "bad";
  const hint = problem === "before" ? tf(lang, "missedBefore", { time: fmtTime(question.startedAt, lang) })
    : problem === "after" ? tf(lang, "missedAfter", { day, time: fmtTime(question.maxEnd, lang) }) : "";

  async function save(clockIn: boolean) {
    if (problem) return;
    setBusy(clockIn ? "in" : "save"); setError("");
    try {
      const r = await fetch("/shop/api/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "shift_missed_out_fix", shiftId: question.shiftId, endedAt: iso }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || tf(lang, "missedFailed"));
      onSaved(typeof j.at === "string" ? j.at : iso, clockIn);
    } catch (e) { setError(e instanceof Error ? e.message : tf(lang, "missedFailed")); }
    finally { setBusy(null); }
  }

  return (
    <div className="fixed inset-0 z-[66] flex items-end bg-black/70 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="mo-title">
      <section className="w-full rounded-t-[28px] border border-white/10 bg-neutral-900 px-5 pt-6 pb-[max(24px,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-[28px]">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-amber-400/15 text-amber-300">
          <Clock3 aria-hidden className="h-7 w-7" strokeWidth={2.4} />
        </div>
        <h2 id="mo-title" className="text-center text-[22px] font-semibold leading-tight tracking-tight">{tf(lang, "missedTitle", { day })}</h2>
        <p className="mt-2 text-center text-base text-neutral-400">{tf(lang, "missedSub", { time: fmtTime(question.startedAt, lang) })}</p>
        <label className="mt-5 block">
          <span className="sr-only">{tf(lang, "missedTime")}</span>
          <input
            type="time" aria-label={tf(lang, "missedTime")} value={time} onChange={(e) => setTime(e.target.value)}
            min={hhmm(question.minEnd)} max={hhmm(question.maxEnd)} step={60}
            className="block min-h-16 w-full rounded-2xl bg-neutral-800 px-4 text-center text-3xl font-semibold tabular-nums text-neutral-100"
          />
        </label>
        {hint && <p role="status" className="mt-2 text-center text-sm text-amber-300">{hint}</p>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-950/60 p-3 text-center text-sm text-red-300">{error}</p>}
        <div className="mt-5 space-y-3">
          {canClockIn && (
            <button type="button" disabled={!!busy || !!problem} onClick={() => save(true)} className="min-h-16 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-black disabled:opacity-50">
              {busy === "in" ? tf(lang, "missedSaving") : tf(lang, "missedSaveIn")}
            </button>
          )}
          <button type="button" disabled={!!busy || !!problem} onClick={() => save(false)} className={`min-h-14 w-full rounded-2xl text-base font-semibold disabled:opacity-50 ${canClockIn ? "bg-neutral-800 text-neutral-100" : "bg-emerald-500 text-lg font-bold text-black"}`}>
            {busy === "save" ? tf(lang, "missedSaving") : tf(lang, "missedSave")}
          </button>
        </div>
      </section>
    </div>
  );
}
