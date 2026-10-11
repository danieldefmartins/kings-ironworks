"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Square } from "lucide-react";
import { jt } from "@/lib/shop/job-timer-i18n";
import { JOB_TIMER_EVENT, announceJobTimer, type JobTimerEventDetail } from "./JobGate";

type Running = JobTimerEventDetail["running"];

function elapsed(startedAt: string, now: number): string {
  const mins = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

// The running job, on every screen, like a now-playing bar: what is being
// timed, for how long, and one tap to stop. It sits above the tab bar.
//
// Also hosts the "clock in for pay too?" sheet that follows a job start while
// the pay clock is off — offered, never done automatically.
export default function JobTimerBar({
  initial, lang, clockedIn, payrollEnrolled, onClockIn, hidden,
}: {
  initial: Running;
  lang: string;
  clockedIn: boolean;
  payrollEnrolled: boolean;
  onClockIn: () => void;
  /** Focus screens (the sheet editor) draw their own chrome. */
  hidden?: boolean;
}) {
  const router = useRouter();
  const [, transition] = useTransition();
  const [running, setRunning] = useState<Running>(initial);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [payPrompt, setPayPrompt] = useState(false);

  // A server render (router.refresh after any action) is the source of truth.
  const initialKey = initial ? `${initial.entryId}:${initial.jobId}` : "";
  const [seenKey, setSeenKey] = useState(initialKey);
  if (seenKey !== initialKey) { setSeenKey(initialKey); setRunning(initial); }

  const sync = useCallback(async () => {
    try {
      const res = await fetch("/shop/api/job-timer", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRunning(data.running ?? null);
    } catch { /* keep the last known state */ }
  }, []);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<JobTimerEventDetail>).detail;
      setRunning(detail.running);
      if (detail.payrollOpen === false && payrollEnrolled && !clockedIn) setPayPrompt(true);
    };
    const onVisible = () => { if (document.visibilityState === "visible") void sync(); };
    window.addEventListener(JOB_TIMER_EVENT, onEvent);
    document.addEventListener("visibilitychange", onVisible);
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") void sync(); }, 60000);
    return () => {
      window.removeEventListener(JOB_TIMER_EVENT, onEvent);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(poll);
    };
  }, [sync, payrollEnrolled, clockedIn]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, [running]);

  // Clocking out ends job time on the server; reflect it without waiting.
  // Only on the transition from clocked in to out, not on every mount.
  const wasClockedIn = useRef(clockedIn);
  useEffect(() => {
    if (wasClockedIn.current && !clockedIn) void sync();
    wasClockedIn.current = clockedIn;
  }, [clockedIn, sync]);

  async function stop() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/shop/api/job-timer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "stop", jobId: running?.jobId }),
      });
      if (!res.ok) throw new Error();
      announceJobTimer({ running: null });
      transition(() => router.refresh());
    } catch {
      setError(jt(lang, "stopFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {running && !hidden && <div aria-hidden className="h-[72px]" />}
      {running && !hidden && (
        <div
          data-job-timer-bar
          className="fixed inset-x-3 z-30 mx-auto max-w-2xl bottom-[calc(86px+env(safe-area-inset-bottom))]"
        >
          {/* Inline colours: the bar is dark in both themes, and the light
              theme's utility remapping must not wash out its text. */}
          <div style={{ background: "rgba(15,31,23,0.96)", borderColor: "rgba(16,185,129,0.35)" }} className="flex items-center gap-3 rounded-2xl border py-2 pl-4 pr-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <span aria-hidden className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
            </span>
            <Link href={`/shop/job/${running.jobId}`} className="min-w-0 flex-1 py-1">
              <div style={{ color: "#fff" }} className="truncate text-[16px] font-semibold leading-snug">{running.label}</div>
              <div style={{ color: "#6ee7b7" }} className="text-[14px] tabular-nums" suppressHydrationWarning>
                {jt(lang, "barLabel")} · {elapsed(running.startedAt, now)}
              </div>
            </Link>
            <button
              type="button"
              onClick={stop}
              disabled={busy}
              aria-label={jt(lang, "stopJobTime")}
              style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }}
              className="flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-4 text-[16px] font-semibold active:scale-[0.98] disabled:opacity-50"
            >
              <Square aria-hidden className="h-4 w-4" fill="currentColor" />
              {jt(lang, "stop")}
            </button>
          </div>
          {error && <p role="alert" className="mt-2 rounded-xl bg-red-950/90 p-2.5 text-center text-sm text-red-200">{error}</p>}
        </div>
      )}
      {payPrompt && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center" onClick={() => setPayPrompt(false)}>
          <section
            role="dialog"
            aria-labelledby="pay-prompt-title"
            className="w-full rounded-t-[28px] border border-white/10 bg-neutral-900 p-6 pb-[max(24px,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-[28px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="pay-prompt-title" className="text-[22px] font-semibold">{jt(lang, "payTitle")}</h2>
            <p className="mt-2 text-[16px] leading-relaxed text-neutral-400">{jt(lang, "payBody")}</p>
            <button
              type="button"
              onClick={() => { setPayPrompt(false); onClockIn(); }}
              className="mt-6 min-h-16 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-black"
            >
              {jt(lang, "payClockIn")}
            </button>
            <button type="button" onClick={() => setPayPrompt(false)} className="mt-2 min-h-14 w-full rounded-2xl bg-neutral-800 text-base font-semibold text-neutral-200">
              {jt(lang, "payNotNow")}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
