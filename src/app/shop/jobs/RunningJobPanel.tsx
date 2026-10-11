"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeftRight, Square } from "lucide-react";
import { jt } from "@/lib/shop/job-timer-i18n";
import { announceJobTimer } from "../JobGate";

// Crew jobs list while a job's time runs: that job only, and the two ways off
// it. "Switch job" shows the full list again; time keeps running until the
// next job is started from its gate, so nothing falls in the gap.
export default function RunningJobPanel({
  lang, running, switching,
}: {
  lang: string;
  running: { jobId: string; label: string };
  switching: boolean;
}) {
  const router = useRouter();
  const [, transition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function stop() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/shop/api/job-timer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "stop", jobId: running.jobId }),
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

  if (switching) {
    return (
      <section className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-[20px] font-semibold">{jt(lang, "pickNext")}</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-neutral-400">{jt(lang, "pickNextSub", { job: running.label })}</p>
        <Link href="/shop/jobs" className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-neutral-800 text-base font-semibold">{jt(lang, "cancel")}</Link>
      </section>
    );
  }

  return (
    <section className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
      <p className="text-sm font-semibold text-emerald-300">● {jt(lang, "onThisJob")}</p>
      <h2 className="mt-1 text-[22px] font-semibold leading-snug">{running.label}</h2>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href="/shop/jobs?switch=1" className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-neutral-800 text-base font-semibold">
          <ArrowLeftRight aria-hidden className="h-5 w-5" />{jt(lang, "switchJob")}
        </Link>
        <button type="button" onClick={stop} disabled={busy} className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-950/40 text-base font-semibold text-red-200 disabled:opacity-50">
          <Square aria-hidden className="h-4 w-4" fill="currentColor" />{jt(lang, "stopJobTime")}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-950/60 p-3 text-center text-[15px] text-red-300">{error}</p>}
    </section>
  );
}
