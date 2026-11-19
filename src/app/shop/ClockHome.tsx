"use client";

// The employee home: one huge state button.
//
//   Você está trabalhando desde 7:31
//   ┌──────────────────────────────┐
//   │        Marcar saída          │   red while working, green when not
//   │      Trabalhando há 3h12     │
//   └──────────────────────────────┘
//   [ Começar intervalo ]
//   Hoje 6h40 · Esta semana 31h05
//   [ Minha semana ]  [ Pedir correção ]
//
// Owner 11/19: the crew are on phones in the shop with dirty gloves, so every
// daily action is one big tap (64 pt+), no menus. The punch goes through the
// SAME path as the clock sheet (ShopShell: durable outbox, location rule,
// forgotten clock-out question) — this is only a bigger face on it.
//
// The 4:55 PM reminder text links to /shop?saida=1: the page scrolls to this
// button, focuses it and rings it, so "Marcar saída" is one more tap.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Coffee, PencilLine, ChevronRight } from "lucide-react";
import { fmtTime, fromShopInput, shopDateKey } from "@/lib/shop/shared";
import { hm, pf } from "@/lib/shop/ponto";
import { useClock } from "./ClockContext";

export default function ClockHome({ lang, workEnd = "17:00", children }: { lang: string; workEnd?: string; children?: React.ReactNode }) {
  const clock = useClock();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [ring, setRing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // ?saida=1 (the reminder link): land on the button.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("saida")) return;
    const id = window.setTimeout(() => {
      buttonRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      buttonRef.current?.focus({ preventScroll: true });
      setRing(true);
      window.setTimeout(() => setRing(false), 6000);
    }, 150);
    return () => window.clearTimeout(id);
  }, []);

  if (!clock) return null;
  const { shift, onBreak, hours, todayHours, weekHours, pendingType, unconfirmed, error, ready, busy, needsLogin } = clock;
  const working = !!shift;
  const lastBreak = onBreak ? clock.breaks.find((b) => !b.ended_at) : null;
  const status = !working ? pf(lang, "notWorking")
    : onBreak && lastBreak ? pf(lang, "onBreakSince", { time: fmtTime(lastBreak.started_at, lang) })
    : pf(lang, "workingSince", { time: fmtTime(shift.started_at, lang) });

  // "Já são quase 17:00" — from 4:55 PM while the shift started before the end.
  const endToday = new Date(fromShopInput(`${shopDateKey(now)}T${workEnd}`));
  const nearEnd = working && now >= endToday.getTime() - 5 * 60_000 && Date.parse(shift.started_at) < endToday.getTime();

  const sending = pendingType !== null;
  const mainLabel = sending ? pf(lang, "sending") : working ? pf(lang, "clockOut") : pf(lang, "clockIn");
  const mainColor = working ? "#dc2626" : "#16a34a";
  const sub = working ? (onBreak ? pf(lang, "onBreakFor", { hm: hm(hours) }) : pf(lang, "workingFor", { hm: hm(hours) })) : null;

  return (
    <section aria-label={pf(lang, "ponto")} className="space-y-4" data-testid="clock-home">
      <p className="flex items-center gap-2.5 text-[20px] font-semibold leading-snug" data-testid="clock-status">
        <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${!working ? "bg-neutral-500" : onBreak ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
        {status}
      </p>

      {nearEnd && !sending && (
        <p role="status" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[17px] font-semibold text-amber-200">
          {pf(lang, "reminderBanner", { time: fmtTime(endToday.getTime(), lang) })}
        </p>
      )}

      {onBreak ? (
        <button
          type="button"
          disabled={busy || !ready || needsLogin}
          onClick={clock.breakEnd}
          style={{ background: "#f59e0b", color: "#111" }}
          className="flex min-h-[148px] w-full flex-col items-center justify-center rounded-[32px] px-6 text-center shadow-xl shadow-black/30 transition active:scale-[0.98] disabled:opacity-60"
        >
          <Coffee aria-hidden className="mb-2 h-9 w-9" strokeWidth={2.4} />
          <span className="text-[30px] font-bold leading-tight">{pf(lang, "breakEnd")}</span>
          {sub && <span className="mt-1 text-[18px] font-semibold opacity-80 tabular-nums">{sub}</span>}
        </button>
      ) : null}

      <button
        ref={buttonRef}
        id="marcar-saida"
        type="button"
        data-testid="clock-main"
        data-state={working ? "working" : "stopped"}
        onClick={working ? clock.clockOut : clock.clockIn}
        style={{ background: mainColor, color: "#fff" }}
        className={`flex w-full flex-col items-center justify-center rounded-[32px] px-6 text-center shadow-xl shadow-black/30 outline-none transition active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-white/70 ${onBreak ? "min-h-[88px]" : "min-h-[188px]"} ${ring ? "ring-[6px] ring-amber-300 ring-offset-4 ring-offset-[#09090b]" : ""}`}
      >
        {sending && <span aria-hidden className="mb-3 h-7 w-7 animate-spin rounded-full border-[3px] border-current border-t-transparent" />}
        <span className={`${onBreak ? "text-[24px]" : "text-[36px]"} font-bold leading-tight tracking-tight`}>{mainLabel}</span>
        {sub && !onBreak && !sending && <span className="mt-2 text-[20px] font-semibold tabular-nums opacity-90" data-testid="clock-running">{sub}</span>}
      </button>

      {unconfirmed && sending && <p role="status" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-center text-base font-semibold text-amber-200">{pf(lang, "sending")}</p>}
      {error && <p role="alert" className="rounded-2xl bg-red-950/60 p-3 text-[15px] text-red-300">{error}</p>}

      {working && !onBreak && (
        <button
          type="button"
          disabled={busy || !ready || needsLogin}
          onClick={clock.breakStart}
          className="flex min-h-16 w-full items-center justify-center gap-2.5 rounded-[22px] border border-white/15 bg-neutral-800 text-[19px] font-semibold text-neutral-100 active:bg-neutral-700 disabled:opacity-50"
        >
          <Coffee aria-hidden className="h-6 w-6 text-amber-300" />{pf(lang, "breakStart")}
        </button>
      )}

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-[22px] border border-white/10 bg-neutral-900/60 px-4 py-3.5">
          <dt className="text-[15px] text-neutral-400">{pf(lang, "today")}</dt>
          <dd className="mt-0.5 text-[30px] font-semibold tabular-nums leading-tight" data-testid="clock-today">{hm(todayHours)}</dd>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-neutral-900/60 px-4 py-3.5">
          <dt className="text-[15px] text-neutral-400">{pf(lang, "thisWeek")}</dt>
          <dd className="mt-0.5 text-[30px] font-semibold tabular-nums leading-tight" data-testid="clock-week">{hm(weekHours)}</dd>
        </div>
      </dl>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/shop/time" className="flex min-h-16 items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-neutral-900/60 px-3 text-[17px] font-semibold active:bg-neutral-800">
          <CalendarDays aria-hidden className="h-6 w-6 text-sky-300" />{pf(lang, "myWeek")}
        </Link>
        {children ?? (
          <Link href="/shop/time?fix=1" className="flex min-h-16 items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-neutral-900/60 px-3 text-[17px] font-semibold active:bg-neutral-800">
            <PencilLine aria-hidden className="h-6 w-6 text-amber-300" />{pf(lang, "askFix")}
          </Link>
        )}
      </div>

      <button type="button" onClick={clock.openDetails} className="flex min-h-12 w-full items-center justify-center gap-1 text-[15px] font-medium text-neutral-400">
        {pf(lang, "details")}<ChevronRight aria-hidden className="h-4 w-4" />
      </button>
    </section>
  );
}
