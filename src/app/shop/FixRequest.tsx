"use client";

// "Pedir correção" in three steps, big targets, no typing:
//   1. Qual dia?          the last 7 days as chips (with that day's times)
//   2. O que aconteceu?   Esqueci a entrada · Esqueci a saída · Horário errado
//   3. Que horas?         a time picker (two for "Horário errado") → Enviar
// The chip the worker tapped is the reason saved with the request, so the
// office reads "Esqueci a saída" instead of a typed note. The old free-form
// request (both times + a note) is still on each record in "Todos os meus
// pontos" (Minha semana › Mais).

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, LogIn, LogOut, PencilLine, X } from "lucide-react";
import { fmtTime, shopDateKey } from "@/lib/shop/shared";
import { dayChip, defaultTimes, kindReason, lastDays, pf, requestError, requestTimes, type DayShift, type FixKind } from "@/lib/shop/ponto";
import { type FixCard } from "@/lib/shop/time-fix";
import { SentSheet } from "./time/MyFixes";

export function FixRequestSheet({ shifts, lang, approver, work, onClose }: {
  shifts: DayShift[]; lang: string; approver: string; work: { start: string; end: string }; onClose: () => void;
}) {
  const router = useRouter();
  const [, transition] = useTransition();
  const [now] = useState(() => Date.now());
  const days = useMemo(() => lastDays(now, 7), [now]);
  const byDay = useMemo(() => {
    const m = new Map<string, DayShift[]>();
    for (const s of shifts) { const d = shopDateKey(s.startedAt); m.set(d, [...(m.get(d) || []), s]); }
    return m;
  }, [shifts]);
  const [day, setDay] = useState<string | null>(null);
  const [kind, setKind] = useState<FixKind | null>(null);
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<FixCard | null>(null);

  // The record to fix that day: one still open first, else the latest. (A day
  // with two records keeps its full list in "Todos os meus pontos".)
  const dayShifts = (day && byDay.get(day)) || [];
  const shift = dayShifts.find((s) => !s.endedAt) ?? dayShifts.at(-1) ?? null;
  const step = !day ? 1 : !kind ? 2 : 3;
  const twoTimes = kind === "wrong" || (kind === "in" && !shift);

  function pickDay(d: string) { setDay(d); setKind(null); setError(""); }
  function pickKind(k: FixKind) {
    const t = defaultTimes(k, shift, work);
    setKind(k); setTime(t.time); setEndTime(t.endTime); setError("");
  }
  function back() { setError(""); if (kind) setKind(null); else setDay(null); }

  async function send() {
    if (!day || !kind) return;
    const times = requestTimes(twoTimes ? "wrong" : kind, day, time, twoTimes ? endTime : undefined);
    // eslint-disable-next-line react-hooks/purity -- runs in the Enviar tap handler, not during render
    const bad = requestError(kind, times, shift, Date.now());
    if (bad) { setError(pf(lang, bad === "future" ? "errFuture" : bad === "order" ? "errOrder" : "errNoShift")); return; }
    const reason = kindReason(kind, lang);
    const payload = shift
      ? { type: "time_correction_request", shiftId: shift.id, startedAt: times.startedAt, endedAt: times.endedAt, reason }
      : { type: "time_fix_new_day", startedAt: times.startedAt, endedAt: times.endedAt, reason };
    setBusy(true); setError("");
    try {
      const r = await fetch("/shop/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error || pf(lang, "errFailed")); return; }
      setSent({
        id: String(j.correctionId || ""), shiftId: shift?.id || String(j.shiftId || ""), workerId: "", workerName: "",
        createdAt: new Date().toISOString(), shiftStart: shift?.startedAt || times.startedAt!, shiftEnd: shift?.endedAt ?? null,
        askStart: times.startedAt, askEnd: times.endedAt, reason, status: "pending",
      });
      transition(() => router.refresh());
    } catch { setError(pf(lang, "errFailed")); }
    finally { setBusy(false); }
  }

  if (sent) return <SentSheet fix={sent} approver={approver} lang={lang} onClose={onClose} />;

  const kinds: { k: FixKind; icon: typeof LogIn; disabled?: boolean }[] = [
    { k: "in", icon: LogIn },
    { k: "out", icon: LogOut, disabled: !shift },
    { k: "wrong", icon: PencilLine, disabled: !shift },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/70 sm:items-center sm:justify-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={pf(lang, "fixTitle")}>
      <section className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border border-white/10 bg-neutral-900 px-5 pt-4 pb-[max(24px,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <header className="mb-4 flex items-center gap-2">
          {step > 1
            ? <button type="button" onClick={back} aria-label={pf(lang, "back")} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-neutral-800"><ChevronLeft aria-hidden className="h-6 w-6" /></button>
            : <span className="w-12 shrink-0" />}
          <div className="min-w-0 flex-1 text-center">
            <div className="text-[13px] font-medium text-neutral-500">{pf(lang, "step", { n: step })}</div>
            <h2 className="text-[22px] font-semibold leading-tight tracking-tight">{pf(lang, step === 1 ? "pickDay" : step === 2 ? "pickKind" : "pickTime")}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={pf(lang, "close")} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-neutral-800"><X aria-hidden className="h-6 w-6" /></button>
        </header>

        {step === 1 && (
          <div className="grid grid-cols-2 gap-2.5">
            {days.map((d) => {
              const chip = dayChip(d, now, lang);
              const list = byDay.get(d) || [];
              const s = list.find((x) => !x.endedAt) ?? list.at(-1);
              const line = !s ? pf(lang, "noShiftDay")
                : s.endedAt ? pf(lang, "hadShift", { start: fmtTime(s.startedAt, lang), end: fmtTime(s.endedAt, lang) })
                : pf(lang, "openShift", { start: fmtTime(s.startedAt, lang) });
              return (
                <button key={d} type="button" data-testid="fix-day" onClick={() => pickDay(d)} className="flex min-h-[84px] flex-col items-start justify-center rounded-[20px] border border-white/10 bg-neutral-800 px-4 py-3 text-left active:bg-neutral-700">
                  <span className="text-[19px] font-semibold leading-tight">{chip.top} <span className="font-normal text-neutral-400">{chip.bottom}</span></span>
                  <span className={`mt-1 text-[14px] tabular-nums ${s ? "text-neutral-300" : "text-neutral-500"}`}>{line}</span>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && day && (
          <div className="space-y-2.5">
            <p className="mb-1 text-center text-[15px] text-neutral-400">
              {dayChip(day, now, lang).top} {dayChip(day, now, lang).bottom} · {shift ? (shift.endedAt ? pf(lang, "hadShift", { start: fmtTime(shift.startedAt, lang), end: fmtTime(shift.endedAt, lang) }) : pf(lang, "openShift", { start: fmtTime(shift.startedAt, lang) })) : pf(lang, "noShiftDay")}
            </p>
            {kinds.map(({ k, icon: Icon, disabled }) => (
              <button key={k} type="button" disabled={disabled} onClick={() => pickKind(k)} className="flex min-h-[72px] w-full items-center gap-4 rounded-[20px] border border-white/10 bg-neutral-800 px-5 text-left text-[20px] font-semibold active:bg-neutral-700 disabled:opacity-35">
                <Icon aria-hidden className="h-7 w-7 shrink-0 text-amber-300" />{kindReason(k, lang)}
              </button>
            ))}
            {!shift && <p className="pt-1 text-center text-[14px] text-neutral-500">{pf(lang, "newDayHint")}</p>}
          </div>
        )}

        {step === 3 && kind && (
          <div className="space-y-4">
            <p className="text-center text-[15px] text-neutral-400">{dayChip(day!, now, lang).top} {dayChip(day!, now, lang).bottom} · {kindReason(kind, lang)}</p>
            <div className={twoTimes ? "grid grid-cols-2 gap-3" : ""}>
              {(twoTimes || kind === "in") && (
                <label className="block">
                  <span className="text-[15px] text-neutral-400">{pf(lang, "timeIn")}</span>
                  <input aria-label={pf(lang, "timeIn")} type="time" value={time} onChange={(e) => { setTime(e.target.value); setError(""); }} className="mt-1 min-h-[72px] w-full rounded-[20px] bg-neutral-800 px-4 text-center text-[30px] font-semibold tabular-nums text-neutral-100" />
                </label>
              )}
              {(twoTimes || kind === "out") && (
                <label className="block">
                  <span className="text-[15px] text-neutral-400">{pf(lang, "timeOut")}</span>
                  <input aria-label={pf(lang, "timeOut")} type="time" value={twoTimes ? endTime : time} onChange={(e) => { (twoTimes ? setEndTime : setTime)(e.target.value); setError(""); }} className="mt-1 min-h-[72px] w-full rounded-[20px] bg-neutral-800 px-4 text-center text-[30px] font-semibold tabular-nums text-neutral-100" />
                </label>
              )}
            </div>
            {error && <p role="alert" className="rounded-2xl bg-red-950/60 p-3 text-[15px] text-red-300">{error}</p>}
            <button type="button" disabled={busy || !time || (twoTimes && !endTime)} onClick={send} className="min-h-16 w-full rounded-[22px] bg-amber-500 text-[20px] font-bold text-black disabled:opacity-40">
              {busy ? "…" : pf(lang, "send")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/** The home / Minha semana button that opens the sheet. */
export default function FixRequestButton({ shifts, lang, approver, work, startOpen = false, className }: {
  shifts: DayShift[]; lang: string; approver: string; work: { start: string; end: string }; startOpen?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(startOpen);
  return <>
    <button type="button" onClick={() => setOpen(true)} className={className ?? "flex min-h-16 items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-neutral-900/60 px-3 text-[17px] font-semibold active:bg-neutral-800"}>
      <PencilLine aria-hidden className="h-6 w-6 text-amber-300" />{pf(lang, "askFix")}
    </button>
    {open && <FixRequestSheet shifts={shifts} lang={lang} approver={approver} work={work} onClose={() => setOpen(false)} />}
  </>;
}
