"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/shop/i18n";

function fmtElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function TimeClock({
  jobId,
  lang,
  myStartedAt, // ISO string if I'm running on THIS job, else null
  activeWorkers, // names currently clocked in on this job (excluding me)
  totalHours, // total logged hours on this job (all workers, incl. running)
}: {
  jobId: string;
  lang: string;
  myStartedAt: string | null;
  activeWorkers: string[];
  totalHours: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const running = !!myStartedAt;

  // tick the elapsed display every second while running
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  async function act(type: "time_start" | "time_stop") {
    setBusy(true);
    try {
      const res = await fetch("/shop/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, jobId }),
      });
      if (res.ok) startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  const elapsed = running
    ? fmtElapsed(Math.max(0, now - new Date(myStartedAt!).getTime()))
    : null;

  return (
    <div
      className={`rounded-xl border p-4 mb-4 ${
        running
          ? "border-green-600 bg-green-950/30"
          : "border-amber-600/40 bg-neutral-900"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.15em] font-bold mb-0.5 text-amber-500">
            ⏱ {t(lang, "timeClock")}
          </div>
          {running ? (
            <>
              <div className="text-green-300 text-sm font-semibold">
                {t(lang, "onTheClock")}
              </div>
              <div
                className="font-mono text-3xl font-bold text-green-200 tabular-nums"
                suppressHydrationWarning
              >
                {elapsed}
              </div>
            </>
          ) : (
            <div className="text-xs text-neutral-400 leading-snug max-w-md">
              {t(lang, "startHint")}
            </div>
          )}
          <div className="text-xs text-neutral-500 mt-1.5">
            {t(lang, "timeLogged")}:{" "}
            <span className="text-neutral-300 font-semibold">
              {totalHours.toFixed(1)} h
            </span>
            {activeWorkers.length > 0 && (
              <span className="ml-3 text-green-400">
                ● {activeWorkers.join(", ")} {t(lang, "working")}
              </span>
            )}
          </div>
        </div>
        {running ? (
          <button
            disabled={busy}
            onClick={() => act("time_stop")}
            className="shrink-0 rounded-2xl bg-red-600 text-white font-extrabold text-lg px-8 py-6 active:scale-95 transition disabled:opacity-50 shadow-lg shadow-red-950/50"
          >
            ⏹ {t(lang, "doneWork")}
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={() => act("time_start")}
            className="shrink-0 rounded-2xl bg-green-600 text-white font-extrabold text-lg px-8 py-6 active:scale-95 transition disabled:opacity-50 shadow-lg shadow-green-950/50"
          >
            ▶ {t(lang, "startWork")}
          </button>
        )}
      </div>
    </div>
  );
}
