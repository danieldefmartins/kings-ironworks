import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, MapPin, PackageSearch, Ruler } from "lucide-react";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials, isInFabrication } from "@/lib/shop/shared";
import {
  getRunningEntry,
  listBreaksForShifts,
  listJobs,
  listOpenShifts,
  listRunningEntries,
  listWorkers,
} from "@/lib/shop/db";
import ShopTopBar from "./ShopTopBar";
import OnTheClock, { type OnClockRow } from "./OnTheClock";
import ProjectMoney from "./jobs/ProjectMoney";
import { loadProjectMoney } from "@/lib/shop/project-money-db";
import type { Job } from "@/lib/shop/shared";
import { stageLabel, t } from "@/lib/shop/i18n";

export const dynamic = "force-dynamic";

function dayDistance(date: string | null) {
  if (!date) return 9999;
  return Math.ceil((new Date(`${date}T00:00:00`).getTime() - Date.now()) / 86400000);
}

// One row per open payroll shift. The job name comes from the OTHER clock and
// is context only — a shift with no job clock running is normal, not an error.
async function buildOnClockRows(jobs: Awaited<ReturnType<typeof listJobs>>): Promise<OnClockRow[]> {
  const [shifts, workers, entries] = await Promise.all([
    listOpenShifts(),
    listWorkers(),
    listRunningEntries(),
  ]);
  if (shifts.length === 0) return [];
  const breaks = await listBreaksForShifts(shifts.map((s) => s.id));
  const names = new Map(workers.map((w) => [w.id, w.name]));
  const jobLabel = new Map(jobs.map((j) => [j.id, j.customer_name || j.job_number]));
  return shifts.map((s) => {
    const mine = breaks.filter((b) => b.shift_id === s.id);
    const entry = entries.find((e) => e.worker_id === s.worker_id);
    return {
      workerId: s.worker_id,
      shiftId: s.id,
      // A shift can outlive a deactivated worker row; say so rather than
      // dropping the row and under-reporting who is on the clock.
      name: names.get(s.worker_id) || "Unknown",
      startedAt: s.started_at,
      breaks: mine,
      onBreak: mine.some((b) => !b.ended_at),
      locationStatus: s.start_location_status || "unknown",
      lat: s.start_lat,
      lng: s.start_lng,
      job: entry ? jobLabel.get(entry.job_id) || null : null,
    };
  });
}

export default async function ShopToday() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const [jobs, mine] = await Promise.all([listJobs(), getRunningEntry(worker.id)]);
  const active = jobs.filter((j) => !j.is_subcontractor && j.current_stage !== "Lead" && j.current_stage !== "Done");
  const current = mine ? jobs.find((j) => j.id === mine.job_id) : null;
  const inFab = active.filter(isInFabrication);
  const overdue = active.filter(j => j.due_date && dayDistance(j.due_date) < 0);
  const dueSoon = active.filter(j => j.due_date && dayDistance(j.due_date) >= 0 && dayDistance(j.due_date) <= 7);
  const assigned = active.filter(j => j.assigned_worker_id === worker.id && j.id !== current?.id);
  const floor = [...inFab].sort((a, b) => dayDistance(a.due_date) - dayDistance(b.due_date));
  const upcoming = active.filter(j => j.due_date).sort((a, b) => dayDistance(a.due_date) - dayDistance(b.due_date));
  const lang = worker.lang || "en";
  const label = (en: string, pt: string, es: string) => lang === "pt" ? pt : lang === "es" ? es : en;
  const isOwner = canViewOwnerFinancials(worker);
  const onClock = isOwner ? await buildOnClockRows(jobs) : [];
  let financialJobs: Awaited<ReturnType<typeof loadProjectMoney>> | null = null;
  if (isOwner) {
    try { financialJobs = await loadProjectMoney(); } catch { /* ProjectMoney shows an explicit load error. */ }
  }

  function jobSection(title: string, rows: Job[], empty: string) {
    return <section className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title} <span className="ml-1 text-sm font-normal text-neutral-500">{rows.length}</span></h2>
        <Link href="/shop/jobs" className="shrink-0 py-2 text-sm text-amber-300">{t(lang, "seeAll")}</Link>
      </div>
      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
        {rows.length ? rows.slice(0, 6).map(job => {
          const days = job.due_date ? dayDistance(job.due_date) : null;
          const date = job.due_date ? new Date(`${job.due_date}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US", { month: "short", day: "numeric" }) : null;
          return <Link key={job.id} href={`/shop/job/${job.id}`} className="flex min-h-24 items-center gap-3 border-b border-neutral-800 px-4 py-4 last:border-0 hover:bg-neutral-800/60">
            <div className="min-w-0 flex-1"><div className="font-semibold leading-snug">{job.customer_name}</div><div className="mt-1 text-xs leading-relaxed text-neutral-400">{job.project_type || job.job_number}</div><div className="mt-1 text-xs text-neutral-500">{stageLabel(lang, job.current_stage)}</div></div>
            <div className="max-w-[38%] text-right text-xs"><div className={days != null && days < 0 ? "font-semibold text-rose-300" : "text-neutral-300"}>{days != null && days < 0 ? t(lang, "daysLate", { n: Math.abs(days) }) : days === 0 ? t(lang, "today") : date || t(lang, "noDue")}</div><ArrowRight aria-hidden className="ml-auto mt-2 h-4 w-4 text-neutral-600" /></div>
          </Link>;
        }) : <p className="px-4 py-8 text-sm text-neutral-400">{empty}</p>}
      </div>
    </section>;
  }

  return (
    <div>
      <ShopTopBar workerName={worker.name} title={t(lang, "navToday")} lang={lang} adminLink={isOwner} />
      <main className="mx-auto max-w-5xl space-y-7 px-4 pb-28 pt-5 sm:px-6">
        {isOwner && <ProjectMoney jobs={financialJobs} lang={lang} />}
        <header>
          <p className="text-sm text-neutral-400">{t(lang, "welcomeBack", { name: worker.name.split(" ")[0] })}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{label(isOwner ? "Your shop at a glance" : "Your work today", isOwner ? "Sua oficina em resumo" : "Seu trabalho hoje", isOwner ? "Tu taller de un vistazo" : "Tu trabajo de hoy")}</h1>
          <p className="mt-2 text-sm text-neutral-400">{label("In-house work, deadlines, and what needs your attention.", "Trabalho da equipe KIW, prazos e o que precisa de atenção.", "Trabajo del equipo KIW, plazos y lo que necesita atención.")}</p>
        </header>
        <dl className="grid grid-cols-3 divide-x divide-neutral-800 rounded-2xl border border-neutral-800 bg-neutral-900/40 py-4">
          {[[label("In fabrication", "Em fabricação", "En fabricación"), inFab.length], [label("Due in 7 days", "Prazo em 7 dias", "Vence en 7 días"), dueSoon.length], [label("Overdue", "Em atraso", "Atrasados"), overdue.length]].map(([title, count], index) => <div key={title} className="px-3 sm:px-5"><dd className={`text-2xl font-semibold tabular-nums ${index === 2 && overdue.length ? "text-rose-300" : "text-neutral-100"}`}>{count}</dd><dt className="mt-1 text-xs leading-relaxed text-neutral-400">{title}</dt></div>)}
        </dl>
        {current ? <Link href={`/shop/job/${current.id}`} className="flex items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
          <div className="min-w-0 flex-1"><div className="mb-2 text-xs font-semibold text-emerald-300">● {t(lang, "workingNowShort")}</div><div className="text-xl font-semibold">{current.customer_name}</div><div className="mt-1 flex items-start gap-1.5 text-sm text-neutral-400"><MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />{current.address || current.job_number}</div><div className="mt-3 text-sm font-medium text-emerald-300">{t(lang, "continueWork")}</div></div><ArrowRight aria-hidden className="h-5 w-5 shrink-0 text-emerald-300" />
        </Link> : !isOwner && <Link href="/shop/jobs" className="flex items-center justify-between gap-4 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-5"><div><h2 className="font-semibold">{label("Choose a job to start", "Escolha uma obra para começar", "Elige un proyecto para comenzar")}</h2><p className="mt-1 text-sm text-neutral-400">{label("Open your job for drawings, instructions, and progress.", "Abra a obra para ver desenhos, instruções e progresso.", "Abre tu proyecto para ver planos, instrucciones y avance.")}</p></div><ArrowRight aria-hidden className="h-5 w-5 shrink-0 text-amber-300" /></Link>}
        {!isOwner && assigned.length > 0 && jobSection(label("Assigned to you", "Atribuídas a você", "Asignados a ti"), assigned, "")}
        {isOwner && <OnTheClock rows={onClock} lang={lang} />}
        <div className="grid gap-7 lg:grid-cols-2">
          {jobSection(t(lang, "onTheFloor"), floor, t(lang, "nothingInFab"))}
          {jobSection(label("Deadlines", "Prazos", "Plazos"), upcoming, label("No scheduled deadlines yet.", "Nenhum prazo agendado ainda.", "Todavía no hay plazos programados."))}
        </div>
        <nav aria-label={label("Shop shortcuts", "Atalhos da oficina", "Accesos del taller")} className="grid gap-2 border-t border-neutral-800 pt-5 sm:grid-cols-3">
          {[["/shop/jobs", t(lang, "activeJobs"), BriefcaseBusiness], ["/shop/leads", t(lang, "measuresLeads"), Ruler], ["/shop/inventory", t(lang, "tileInventory"), PackageSearch]].map(([href, title, Icon]) => { const ShortcutIcon = Icon as typeof Ruler; return <Link key={href as string} href={href as string} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm text-neutral-300 hover:bg-neutral-900"><ShortcutIcon aria-hidden className="h-4 w-4 text-neutral-500" />{title as string}<ArrowRight aria-hidden className="ml-auto h-4 w-4 text-neutral-600" /></Link>; })}
        </nav>
      </main>
    </div>
  );
}
