"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { Job } from "@/lib/shop/shared";
import { contractValue, depositValue, STAGES } from "@/lib/shop/shared";
import { stageLabel, t } from "@/lib/shop/i18n";
import { Filter, GripVertical, ListOrdered, X } from "lucide-react";

type Progress = Record<string, { done: number; total: number }>;
type Crew = { id: string; name: string }[];

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}
function days(d: string | null) {
  return d ? Math.ceil((new Date(`${d}T00:00:00`).getTime() - Date.now()) / 86400000) : 9999;
}
function color(stage: string) {
  const i = STAGES.indexOf(stage as (typeof STAGES)[number]);
  if (stage === "Done") return "bg-green-600";
  if (i >= STAGES.indexOf("QC")) return "bg-amber-500 text-black";
  if (i >= STAGES.indexOf("Cut")) return "bg-blue-600";
  return "bg-neutral-600";
}

// The queue is the order things actually get built. A job that has never been
// placed sorts after the placed ones, by due date, so a new job lands at the
// bottom of the list rather than silently jumping the queue.
function queueSort(a: Job, b: Job) {
  const ao = a.fabrication_order, bo = b.fabrication_order;
  if (ao != null && bo != null) return Number(ao) - Number(bo);
  if (ao != null) return -1;
  if (bo != null) return 1;
  return days(a.due_date) - days(b.due_date);
}

const SEED_STEP = 1000;

async function post(body: Record<string, unknown>) {
  const res = await fetch("/shop/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
}

export default function JobsList({
  jobs, lang, canSeeMoney, canManageQueue, crew, workingCount, progress,
}: {
  jobs: Job[];
  lang: string;
  canSeeMoney: boolean;
  canManageQueue: boolean;
  crew: Crew;
  workingCount: Record<string, number>;
  progress: Progress;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("due");
  const [controlsOpen, setControlsOpen] = useState(false);
  const [queueMode, setQueueMode] = useState(false);

  const filtered = useMemo(
    () =>
      jobs
        .filter((j) => {
          const q = query.trim().toLowerCase();
          const matches =
            !q || [j.customer_name, j.job_number, j.address, j.project_type].some((v) => v?.toLowerCase().includes(q));
          return (
            matches &&
            (filter === "all" || (filter === "working" ? (workingCount[j.id] || 0) > 0 : j.current_stage === filter))
          );
        })
        .sort((a, b) =>
          sort === "name"
            ? a.customer_name.localeCompare(b.customer_name)
            : sort === "value"
              ? contractValue(b) - contractValue(a)
              : days(a.due_date) - days(b.due_date),
        ),
    [jobs, query, filter, sort, workingCount],
  );

  return (
    <>
      <div className="relative mb-4 flex min-w-0 gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(lang, "projectSearch")}
          className="min-h-12 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-900 px-4 text-[16px] outline-none focus:border-amber-500"
        />
        {canManageQueue && (
          <button
            type="button"
            onClick={() => setQueueMode((v) => !v)}
            aria-pressed={queueMode}
            aria-label={t(lang, "queueTitle")}
            className={`grid min-h-12 w-12 shrink-0 place-items-center rounded-xl border ${
              queueMode ? "border-amber-500 bg-amber-500/15 text-amber-300" : "border-neutral-700 bg-neutral-900 text-neutral-200"
            }`}
          >
            <ListOrdered className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setControlsOpen((v) => !v)}
          aria-expanded={controlsOpen}
          aria-label={`${t(lang, "filter")} and ${t(lang, "sort")}`}
          className={`grid min-h-12 w-12 shrink-0 place-items-center rounded-xl border ${
            controlsOpen ? "border-amber-500 bg-amber-500/15 text-amber-300" : "border-neutral-700 bg-neutral-900 text-neutral-200"
          }`}
        >
          <Filter className="h-5 w-5" />
        </button>
        {controlsOpen && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-[min(320px,calc(100vw-32px))] rounded-3xl border border-neutral-700 bg-neutral-950/95 p-4 shadow-2xl backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-base font-semibold">
                {t(lang, "filter")} &amp; {t(lang, "sort")}
              </span>
              <button
                type="button"
                onClick={() => setControlsOpen(false)}
                aria-label={t(lang, "close")}
                className="grid h-8 w-8 place-items-center rounded-full bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">{t(lang, "filter")}</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm"
              >
                <option value="all">{t(lang, "allProjects")}</option>
                <option value="working">{t(lang, "currentlyWorking")}</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{stageLabel(lang, s)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">{t(lang, "sort")}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm"
              >
                <option value="due">{t(lang, "sortDue")}</option>
                <option value="name">{t(lang, "sortName")}</option>
                {canSeeMoney && <option value="value">{t(lang, "sortValue")}</option>}
              </select>
            </label>
          </div>
        )}
      </div>

      {queueMode && canManageQueue ? (
        <FabricationQueue jobs={jobs} crew={crew} lang={lang} refresh={() => router.refresh()} />
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-neutral-500">{t(lang, "noMatchingProjects")}</p>
      ) : (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {filtered.map((j) => {
            const p = progress[j.id] || { done: 0, total: 0 };
            const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
            const d = days(j.due_date);
            const crewName = crew.find((w) => w.id === j.assigned_worker_id)?.name;
            return (
              <Link
                key={j.id}
                href={`/shop/job/${j.id}`}
                className="block min-w-0 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition hover:border-amber-600/60 active:scale-[0.99]"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {j.project_type && (
                      <div className="truncate text-[11px] font-bold uppercase tracking-wide text-amber-500">{j.project_type}</div>
                    )}
                    <div className="truncate text-lg font-semibold">{j.customer_name}</div>
                    <div className="truncate text-xs text-neutral-500">{j.address || "—"}</div>
                  </div>
                  <span className={`max-w-[42%] shrink rounded-full px-2 py-1 text-center text-[11px] font-semibold leading-tight text-white ${color(j.current_stage)}`}>
                    {stageLabel(lang, j.current_stage)}
                  </span>
                </div>
                {workingCount[j.id] > 0 && (
                  <div className="mt-2 text-xs font-semibold text-green-400">
                    ● {workingCount[j.id]} {t(lang, "working")}
                  </div>
                )}
                {crewName && <div className="mt-2 truncate text-xs text-neutral-400">{t(lang, "queueAssign")}: {crewName}</div>}
                {canSeeMoney && (contractValue(j) > 0 || depositValue(j) > 0) && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-md border border-amber-700 bg-amber-950/60 px-2 py-0.5 text-amber-300">
                      {t(lang, "contractPrice")} {money(contractValue(j))}
                    </span>
                    {depositValue(j) > 0 && (
                      <span className="rounded-md border border-emerald-700 bg-emerald-950/60 px-2 py-0.5 text-emerald-300">
                        {t(lang, "depositPaid")} {money(depositValue(j))}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                  <span className={`min-w-0 truncate ${d < 0 ? "text-red-400" : d <= 7 ? "text-amber-400" : "text-neutral-400"}`}>
                    {t(lang, "due")} {j.due_date || t(lang, "noDue")}
                  </span>
                  <span className="shrink-0 text-neutral-400">{t(lang, "cutProgress")} {p.done}/{p.total}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-800">
                  <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Fabrication queue editor — owners only.
//
// Reorder writes ONE row: the dropped card gets the midpoint of the two values
// it landed between. Renumbering the whole list on every move would be N writes
// that can interleave with another owner's drag and leave two jobs claiming the
// same slot. The column is numeric, so midpoints never run out of precision.
//
// Dragging is pointer-based rather than HTML5 drag-and-drop, which does not
// fire on a touch tablet. Up/down buttons do the same job for anyone who would
// rather tap, and they are the accessible path.
// ---------------------------------------------------------------------------
function FabricationQueue({
  jobs, crew, lang, refresh,
}: {
  jobs: Job[];
  crew: Crew;
  lang: string;
  refresh: () => void;
}) {
  // Leads and finished work are not in the build queue.
  const initial = useMemo(() => jobs.filter((j) => j.current_stage !== "Done").sort(queueSort), [jobs]);
  const [rows, setRows] = useState<Job[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  async function save(body: Record<string, unknown>, next: Job[]) {
    setRows(next);
    setSaving(true);
    setError("");
    try {
      await post(body);
      refresh();
    } catch {
      setError(t(lang, "queueSaveFailed"));
      setRows(rows); // put the list back the way the server still has it
    } finally {
      setSaving(false);
    }
  }

  // A list that has never been ordered has no numbers to take midpoints of, so
  // the first move stamps the current visible order onto every card at once.
  // After that every move is a single write.
  async function seedIfNeeded(list: Job[]): Promise<Job[]> {
    if (list.every((j) => j.fabrication_order != null)) return list;
    const stamped = list.map((j, i) => ({ ...j, fabrication_order: (i + 1) * SEED_STEP }));
    await post({ type: "job_queue_seed", jobIds: stamped.map((j) => j.id) });
    return stamped;
  }

  async function move(from: number, to: number) {
    if (to < 0 || to >= rows.length || from === to) return;
    setSaving(true);
    setError("");
    try {
      const seeded = await seedIfNeeded(rows);
      const next = [...seeded];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      const before = next[to - 1] ? Number(next[to - 1].fabrication_order) : null;
      const after = next[to + 1] ? Number(next[to + 1].fabrication_order) : null;
      const value =
        before == null && after == null ? SEED_STEP
        : before == null ? after! - SEED_STEP
        : after == null ? before + SEED_STEP
        : (before + after) / 2;
      next[to] = { ...moved, fabrication_order: value };
      setRows(next);
      await post({ type: "job_fabrication_set", jobId: moved.id, fabricationOrder: value });
      refresh();
    } catch {
      setError(t(lang, "queueSaveFailed"));
      setRows(rows);
    } finally {
      setSaving(false);
    }
  }

  function indexAt(clientY: number): number {
    const cards = Array.from(listRef.current?.querySelectorAll("[data-queue-row]") ?? []);
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return cards.length - 1;
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{t(lang, "queueTitle")}</h2>
        <span className="text-xs text-neutral-500">{saving ? t(lang, "queueSaving") : `${rows.length}`}</span>
      </div>
      <p className="mb-3 text-sm text-neutral-500">{t(lang, "queueHint")}</p>
      {error && <p className="mb-3 rounded-xl bg-red-950/60 p-3 text-sm text-red-300">{error}</p>}

      <div ref={listRef} className="space-y-2">
        {rows.map((j, i) => (
          <div
            key={j.id}
            data-queue-row
            className={`rounded-2xl border bg-neutral-900 p-3 ${
              dragId === j.id ? "border-amber-500 opacity-60" : overIndex === i && dragId ? "border-amber-500/60" : "border-neutral-800"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                aria-label={t(lang, "queueMove")}
                className="grid h-11 w-9 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-neutral-500 active:cursor-grabbing"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragId(j.id);
                  setOverIndex(i);
                }}
                onPointerMove={(e) => {
                  if (dragId !== j.id) return;
                  setOverIndex(indexAt(e.clientY));
                }}
                onPointerUp={() => {
                  const to = overIndex;
                  setDragId(null);
                  setOverIndex(null);
                  if (to != null && to !== i) void move(i, to);
                }}
                onPointerCancel={() => { setDragId(null); setOverIndex(null); }}
              >
                <GripVertical className="h-5 w-5" />
              </button>
              <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-500">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/shop/job/${j.id}`} className="block truncate font-semibold">{j.customer_name}</Link>
                <div className="truncate text-xs text-neutral-500">{j.job_number}{j.due_date ? ` · ${t(lang, "due")} ${j.due_date}` : ""}</div>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button" aria-label={t(lang, "queueMoveUp")} disabled={i === 0}
                  onClick={() => void move(i, i - 1)}
                  className="grid h-7 w-8 place-items-center rounded-md bg-neutral-800 text-xs disabled:opacity-30"
                >▲</button>
                <button
                  type="button" aria-label={t(lang, "queueMoveDown")} disabled={i === rows.length - 1}
                  onClick={() => void move(i, i + 1)}
                  className="grid h-7 w-8 place-items-center rounded-md bg-neutral-800 text-xs disabled:opacity-30"
                >▼</button>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-600">{t(lang, "queueStage")}</span>
                <select
                  value={j.current_stage}
                  onChange={(e) => {
                    const stage = e.target.value;
                    void save(
                      { type: "stage_set", jobId: j.id, stage },
                      rows.map((r) => (r.id === j.id ? { ...r, current_stage: stage } : r)),
                    );
                  }}
                  className="min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2 text-sm"
                >
                  {STAGES.map((s) => <option key={s} value={s}>{stageLabel(lang, s)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-600">{t(lang, "queueAssign")}</span>
                <select
                  value={j.assigned_worker_id || ""}
                  onChange={(e) => {
                    const id = e.target.value || null;
                    void save(
                      { type: "job_fabrication_set", jobId: j.id, assignedWorkerId: id },
                      rows.map((r) => (r.id === j.id ? { ...r, assigned_worker_id: id } : r)),
                    );
                  }}
                  className="min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2 text-sm"
                >
                  <option value="">{t(lang, "queueUnassigned")}</option>
                  {crew.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
