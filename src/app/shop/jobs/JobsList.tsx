"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Job } from "@/lib/shop/shared";
import { contractValue, depositValue } from "@/lib/shop/shared";
import { stageLabel, t } from "@/lib/shop/i18n";
import { STAGES } from "@/lib/shop/shared";

type Progress = Record<string, { done: number; total: number }>;
function money(n: number) { return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }); }
function days(d: string | null) { return d ? Math.ceil((new Date(`${d}T00:00:00`).getTime() - Date.now()) / 86400000) : 9999; }
function color(stage: string) { const i = STAGES.indexOf(stage as (typeof STAGES)[number]); if (stage === "Done") return "bg-green-600"; if (i >= STAGES.indexOf("QC")) return "bg-amber-500 text-black"; if (i >= STAGES.indexOf("Cut")) return "bg-blue-600"; return "bg-neutral-600"; }

export default function JobsList({ jobs, lang, canSeeMoney, workingCount, progress }: { jobs: Job[]; lang: string; canSeeMoney: boolean; workingCount: Record<string, number>; progress: Progress }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("due");
  const filtered = useMemo(() => jobs.filter((j) => {
    const q = query.trim().toLowerCase();
    const matches = !q || [j.customer_name, j.job_number, j.address, j.project_type].some((v) => v?.toLowerCase().includes(q));
    return matches && (filter === "all" || (filter === "working" ? (workingCount[j.id] || 0) > 0 : j.current_stage === filter));
  }).sort((a, b) => sort === "name" ? a.customer_name.localeCompare(b.customer_name) : sort === "value" ? contractValue(b) - contractValue(a) : days(a.due_date) - days(b.due_date)), [jobs, query, filter, sort, workingCount]);
  return <>
    <div className="mb-4 grid min-w-0 max-w-full gap-2 overflow-hidden sm:grid-cols-[minmax(0,1fr)_auto_auto]">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t(lang, "projectSearch")} className="min-h-12 min-w-0 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 text-[16px] outline-none focus:border-amber-500" />
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="min-h-12 min-w-0 max-w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm"><option value="all">{t(lang, "allProjects")}</option><option value="working">{t(lang, "currentlyWorking")}</option>{STAGES.map((s) => <option key={s} value={s}>{stageLabel(lang, s)}</option>)}</select>
      <select value={sort} onChange={(e) => setSort(e.target.value)} className="min-h-12 min-w-0 max-w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm"><option value="due">{t(lang, "sortDue")}</option><option value="name">{t(lang, "sortName")}</option>{canSeeMoney && <option value="value">{t(lang, "sortValue")}</option>}</select>
    </div>
    {filtered.length === 0 ? <p className="py-16 text-center text-neutral-500">{t(lang, "noMatchingProjects")}</p> : <div className="grid min-w-0 gap-3 sm:grid-cols-2">{filtered.map((j) => { const p = progress[j.id] || { done: 0, total: 0 }; const pct = p.total ? Math.round((p.done / p.total) * 100) : 0; const d = days(j.due_date); return <Link key={j.id} href={`/shop/job/${j.id}`} className="block min-w-0 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition hover:border-amber-600/60 active:scale-[0.99]"><div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0 flex-1">{j.project_type && <div className="truncate text-[11px] font-bold uppercase tracking-wide text-amber-500">{j.project_type}</div>}<div className="truncate text-lg font-semibold">{j.customer_name}</div><div className="truncate text-xs text-neutral-500">{j.address || "—"}</div></div><span className={`max-w-[42%] shrink rounded-full px-2 py-1 text-center text-[11px] font-semibold leading-tight text-white ${color(j.current_stage)}`}>{stageLabel(lang, j.current_stage)}</span></div>{workingCount[j.id] > 0 && <div className="mt-2 text-xs font-semibold text-green-400">● {workingCount[j.id]} {t(lang, "working")}</div>}{canSeeMoney && (contractValue(j) > 0 || depositValue(j) > 0) && <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-md border border-amber-700 bg-amber-950/60 px-2 py-0.5 text-amber-300">{t(lang, "contractPrice")} {money(contractValue(j))}</span>{depositValue(j) > 0 && <span className="rounded-md border border-emerald-700 bg-emerald-950/60 px-2 py-0.5 text-emerald-300">{t(lang, "depositPaid")} {money(depositValue(j))}</span>}</div>}<div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs"><span className={`min-w-0 truncate ${d < 0 ? "text-red-400" : d <= 7 ? "text-amber-400" : "text-neutral-400"}`}>{t(lang, "due")} {j.due_date || t(lang, "noDue")}</span><span className="shrink-0 text-neutral-400">{t(lang, "cutProgress")} {p.done}/{p.total}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-800"><div className="h-full bg-amber-500" style={{ width: `${pct}%` }} /></div></Link>; })}</div>}
  </>;
}
