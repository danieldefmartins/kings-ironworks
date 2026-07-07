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

// Grab GPS at the moment of the button press. Never blocks the clock:
// resolves null after 6s or on permission denial.
function getLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), 6000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 5500, maximumAge: 60000 }
    );
  });
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
      const loc = await getLocation();
      const res = await fetch("/shop/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, jobId, lat: loc?.lat, lng: loc?.lng }),
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
      className={`rounded-2xl border-2 p-4 mb-4 ${
        running
          ? "border-green-500 bg-green-950/40"
          : "border-amber-600/50 bg-neutral-900"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-[11px] uppercase tracking-[0.15em] font-bold text-amber-500">
          ⏱ {t(lang, "timeClock")}
        </div>
        <div className="text-xs text-neutral-400">
          {t(lang, "timeLogged")}:{" "}
          <span className="text-neutral-200 font-bold">{totalHours.toFixed(1)} h</span>
        </div>
      </div>

      {running ? (
        <div className="text-center mb-3">
          <div className="text-green-300 text-sm font-semibold mb-1">
            ● {t(lang, "onTheClock")}
          </div>
          <div
            className="font-mono text-5xl font-extrabold text-green-200 tabular-nums leading-none"
            suppressHydrationWarning
          >
            {elapsed}
          </div>
        </div>
      ) : (
        <p className="text-xs text-neutral-400 leading-snug mb-3 text-center">
          {t(lang, "startHint")}
        </p>
      )}

      {running ? (
        <button
          disabled={busy}
          onClick={() => act("time_stop")}
          className="w-full rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-3xl py-8 active:scale-[0.98] transition disabled:opacity-60 shadow-xl shadow-red-950/60 border-b-4 border-red-800"
        >
          {busy ? "…" : `⏹ ${t(lang, "doneWork")}`}
        </button>
      ) : (
        <button
          disabled={busy}
          onClick={() => act("time_start")}
          className="w-full rounded-2xl bg-green-600 hover:bg-green-500 text-white font-extrabold text-3xl py-8 active:scale-[0.98] transition disabled:opacity-60 shadow-xl shadow-green-950/60 border-b-4 border-green-800"
        >
          {busy ? "…" : `▶ ${t(lang, "startWork")}`}
        </button>
      )}

      {activeWorkers.length > 0 && (
        <div className="text-xs text-green-400 mt-2.5 text-center">
          ● {t(lang, "workingNow")}: {activeWorkers.join(", ")}
        </div>
      )}
    </div>
  );
}
