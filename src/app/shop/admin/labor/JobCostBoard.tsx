"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { hoursToHm } from "@/lib/shop/shared";
import { jt } from "@/lib/shop/job-timer-i18n";
import type { LaborBoard, LaborBoardJob } from "@/lib/shop/labor-board-db";

function money(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Budget: low is good. Utilization ("goodHigh"): high is good.
function BudgetBar({ pct, goodHigh = false }: { pct: number; goodHigh?: boolean }) {
  const tone = goodHigh
    ? (pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-500")
    : (pct > 100 ? "bg-rose-500" : pct >= 85 ? "bg-amber-400" : "bg-emerald-500");
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800" aria-hidden>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

/** One job's labor: the headline numbers, and on open, who and the budget. */
export function JobLaborRow({ job, lang, budgetsReady, startOpen = false, showLink = true }: { job: LaborBoardJob; lang: string; budgetsReady: boolean; startOpen?: boolean; showLink?: boolean }) {
  const router = useRouter();
  const [, transition] = useTransition();
  const [open, setOpen] = useState(startOpen);
  const [budget, setBudget] = useState(job.budgetHours == null ? "" : String(job.budgetHours));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function saveBudget() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/shop/api/job-timer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "budget_set", jobId: job.jobId, hours: budget.trim() === "" ? null : Number(budget) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      transition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/70">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-semibold">{job.label}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[14px] text-neutral-400">
            <span className="tabular-nums">{hoursToHm(job.hours)}</span>
            {job.workingNow > 0 && <span className="text-emerald-300">● {jt(lang, "jcRunning", { n: job.workingNow })}</span>}
            {job.unratedHours > 0 && <span className="text-amber-300">{jt(lang, "jcUnrated", { hours: hoursToHm(job.unratedHours) })}</span>}
          </div>
          {job.usedPct != null && (
            <div className="mt-2.5 space-y-1">
              <BudgetBar pct={job.usedPct} />
              <div className={`text-[13px] tabular-nums ${job.usedPct > 100 ? "text-rose-300" : "text-neutral-400"}`}>
                {job.usedPct > 100 ? `${jt(lang, "jcOver")} · ` : ""}{jt(lang, "jcUsed", { pct: job.usedPct })} · {hoursToHm(job.hours)} / {hoursToHm(job.budgetHours ?? 0)}
              </div>
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[20px] font-semibold tabular-nums text-amber-300">{money(job.cost)}{job.unratedHours > 0 ? "+" : ""}</div>
          <div className="text-[12px] text-neutral-500">{jt(lang, "jcLabor")}</div>
        </div>
        <ChevronDown aria-hidden className={`h-5 w-5 shrink-0 text-neutral-500 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-white/10 p-4">
          {job.byWorker.length === 0 ? <p className="text-[15px] text-neutral-500">{jt(lang, "jcNoTime")}</p> : (
            <ul className="space-y-2">
              {job.byWorker.map((w) => (
                <li key={w.name} className="flex items-center justify-between gap-3 text-[15px]">
                  <span className="min-w-0 truncate text-neutral-200">{w.name}</span>
                  <span className="shrink-0 tabular-nums text-neutral-400">{hoursToHm(w.hours)} · {w.cost == null ? <span className="text-amber-300">—</span> : money(w.cost)}</span>
                </li>
              ))}
            </ul>
          )}
          {budgetsReady ? (
            <div>
              <label htmlFor={`budget-${job.jobId}`} className="text-[13px] font-medium text-neutral-400">{jt(lang, "jcBudgetHours")}</label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id={`budget-${job.jobId}`}
                  inputMode="decimal"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="0"
                  className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-neutral-950 px-3 text-[17px] tabular-nums outline-none focus:border-amber-500"
                />
                <button type="button" onClick={saveBudget} disabled={busy} className="min-h-12 shrink-0 rounded-xl bg-amber-400 px-5 text-[16px] font-semibold text-black disabled:opacity-50">{jt(lang, "jcSave")}</button>
              </div>
              {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
            </div>
          ) : (
            <p className="text-[13px] text-neutral-500">{jt(lang, "jcBudgetUnavailable")}</p>
          )}
          {showLink && <Link href={`/shop/job/${job.jobId}`} className="inline-flex min-h-11 items-center text-[15px] font-medium text-amber-300">{jt(lang, "openJob")}</Link>}
        </div>
      )}
    </div>
  );
}

function Utilization({ weeks, lang }: { weeks: LaborBoard["weeks"]; lang: string }) {
  const [tab, setTab] = useState(0);
  const week = weeks[tab];
  if (!week) return null;
  return (
    <section id="utilization" className="space-y-3">
      <div>
        <h2 className="text-[18px] font-semibold">{jt(lang, "utTitle")}</h2>
        <p className="text-[14px] text-neutral-500">{jt(lang, "utSub")}</p>
      </div>
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.04] p-1">
        {weeks.map((w, i) => (
          <button key={w.key} role="tab" aria-selected={tab === i} type="button" onClick={() => setTab(i)} className={`min-h-11 rounded-lg text-[15px] font-medium ${tab === i ? "bg-neutral-700/60 text-neutral-100" : "text-neutral-400"}`}>{jt(lang, w.label)}</button>
        ))}
      </div>
      {week.rows.length === 0 ? <p className="text-[15px] text-neutral-500">{jt(lang, "utNone")}</p> : (
        <ul className="space-y-2">
          {week.rows.map((r) => (
            <li key={r.name} className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[16px] font-semibold">{r.name}</span>
                <span className={`text-[20px] font-semibold tabular-nums ${r.utilizationPct == null ? "text-neutral-500" : r.utilizationPct >= 80 ? "text-emerald-300" : r.utilizationPct >= 50 ? "text-amber-300" : "text-rose-300"}`}>{r.utilizationPct == null ? "—" : `${r.utilizationPct}%`}</span>
              </div>
              {r.utilizationPct != null && <div className="mt-2"><BudgetBar pct={r.utilizationPct} goodHigh /></div>}
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                {([["utPaid", r.payrollHours], ["utOnJobs", r.jobHours], ["utUnassigned", r.unassignedHours]] as const).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/[0.04] px-2 py-2">
                    <dd className="text-[16px] font-semibold tabular-nums">{hoursToHm(v)}</dd>
                    <dt className="text-[12px] text-neutral-500">{jt(lang, k)}</dt>
                  </div>
                ))}
              </dl>
              {r.offPayrollJobHours >= 0.25 && <p className="mt-2 text-[13px] text-amber-300">{jt(lang, "utOffPay", { hours: hoursToHm(r.offPayrollJobHours) })}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function JobCostBoard({ board, lang }: { board: LaborBoard; lang: string }) {
  const totalCost = board.jobs.reduce((s, j) => s + j.cost, 0);
  return (
    <div className="space-y-8">
      <Utilization weeks={board.weeks} lang={lang} />
      <section id="jobcosts" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-semibold">{jt(lang, "jcTitle")}</h2>
            <p className="text-[14px] text-neutral-500">{jt(lang, "jcSub")}</p>
          </div>
          <div className="text-right text-[18px] font-semibold tabular-nums text-amber-300">{money(totalCost)}</div>
        </div>
        {board.jobs.length === 0 ? <p className="text-[15px] text-neutral-500">{jt(lang, "jcNoTime")}</p> : (
          <div className="space-y-2">
            {board.jobs.map((j) => <JobLaborRow key={j.jobId} job={j} lang={lang} budgetsReady={board.budgetsReady} />)}
          </div>
        )}
      </section>
    </div>
  );
}
