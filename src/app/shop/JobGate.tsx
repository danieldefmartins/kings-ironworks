"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MapPin, Play, Timer } from "lucide-react";
import { jt } from "@/lib/shop/job-timer-i18n";

export const JOB_TIMER_EVENT = "shop:job-timer";
export type JobTimerEventDetail = {
  running: { entryId: string; jobId: string; label: string; startedAt: string } | null;
  /** Present after a start: false means the pay clock is off. */
  payrollOpen?: boolean;
};

export function announceJobTimer(detail: JobTimerEventDetail) {
  window.dispatchEvent(new CustomEvent<JobTimerEventDetail>(JOB_TIMER_EVENT, { detail }));
}

function quickLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    const timer = setTimeout(() => resolve(null), 2500);
    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(timer); resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      () => { clearTimeout(timer); resolve(null); },
      { timeout: 2500, maximumAge: 120000 }
    );
  });
}

// A crew member opening a job he is not timing sees this instead of the job.
// The details are not in this page's payload at all — the server renders the
// gate in their place — so there is nothing to peek at.
export default function JobGate({
  job, lang, runningElsewhere,
}: {
  job: { id: string; name: string; subtitle: string | null; address: string | null };
  lang: string;
  runningElsewhere: { jobId: string; label: string } | null;
}) {
  const router = useRouter();
  const [, transition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true); setError("");
    try {
      const where = await quickLocation();
      const res = await fetch("/shop/api/job-timer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "start", jobId: job.id, ...where }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "");
      announceJobTimer({ running: data.running ?? null, payrollOpen: data.payrollOpen });
      transition(() => router.refresh());
    } catch {
      setError(jt(lang, "failed"));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-180px)] max-w-md flex-col justify-end px-4 pb-6 pt-8 sm:justify-center">
      <section aria-labelledby="job-gate-title" className="rounded-[28px] border border-white/10 bg-neutral-900 p-6 shadow-2xl shadow-black/40">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15">
          <Timer aria-hidden className="h-8 w-8 text-emerald-400" strokeWidth={2} />
        </div>
        <h1 id="job-gate-title" className="text-center text-[26px] font-semibold leading-tight tracking-tight">{job.name}</h1>
        {job.subtitle && <p className="mt-1.5 text-center text-base text-neutral-400">{job.subtitle}</p>}
        {job.address && (
          <p className="mt-2 flex items-start justify-center gap-1.5 text-center text-[15px] text-neutral-500">
            <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />{job.address}
          </p>
        )}
        <p className="mt-5 text-center text-[15px] leading-relaxed text-neutral-400">{jt(lang, "gateHint")}</p>
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="mt-6 flex min-h-[68px] w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 text-[20px] font-bold text-black shadow-lg shadow-emerald-950/50 transition active:scale-[0.99] disabled:opacity-60"
        >
          <Play aria-hidden className="h-6 w-6" fill="currentColor" />
          {busy ? jt(lang, "starting") : jt(lang, "start")}
        </button>
        {runningElsewhere && (
          <p className="mt-3 text-center text-[15px] text-neutral-400">{jt(lang, "stops", { job: runningElsewhere.label })}</p>
        )}
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-950/60 p-3 text-center text-[15px] text-red-300">{error}</p>}
      </section>
      <Link href="/shop/jobs" className="mt-4 flex min-h-12 items-center justify-center text-base font-medium text-amber-300">
        {jt(lang, "backToJobs")}
      </Link>
    </main>
  );
}
