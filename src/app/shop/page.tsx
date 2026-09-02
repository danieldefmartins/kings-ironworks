import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowRight, BriefcaseBusiness, MapPin, Ruler } from "lucide-react";
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
  const active = jobs.filter((j) => j.current_stage !== "Lead" && j.current_stage !== "Done");
  const leads = jobs.filter((j) => j.current_stage === "Lead");
  const current = mine ? jobs.find((j) => j.id === mine.job_id) : null;
  const inFab = active.filter(isInFabrication);
  // Daniel: "all the fabrication should be on due soon."
  //
  // This list was filtered on due date alone, and almost nothing here carries
  // one — dayDistance(null) is 9999, so it never matched and the home screen
  // said "nothing due" while eleven jobs were on the floor. What the shop
  // actually needs first thing is what is being built, so that is the list:
  // everything in fabrication, plus anything dated that is due inside a week
  // even if it has not started. Late first, then soonest, then the rest.
  const urgent = [
    ...inFab,
    ...active.filter((j) => !isInFabrication(j) && j.due_date && dayDistance(j.due_date) <= 7),
  ]
    .sort((a, b) => dayDistance(a.due_date) - dayDistance(b.due_date))
    .slice(0, 6);
  const lang = worker.lang || "en";

  // Who is on the payroll clock right now — owners only, and only queried for
  // them, so the crew's home screen costs exactly what it did before.
  const isOwner = canViewOwnerFinancials(worker);
  const onClock = isOwner ? await buildOnClockRows(jobs) : [];

  return (
    <div>
      <ShopTopBar workerName={worker.name} title={t(lang, "navToday")} lang={lang} adminLink={isOwner} />
      <main className="mx-auto max-w-2xl space-y-6 px-4 pb-28 pt-5">
        <header><p className="text-sm text-neutral-500">{t(lang, "welcomeBack", { name: worker.name.split(" ")[0] })}</p><h1 className="mt-0.5 text-3xl font-semibold tracking-tight">{t(lang, "attention")}</h1></header>
        {isOwner && <OnTheClock rows={onClock} lang={lang} />}
        {current ? (
          <Link href={`/shop/job/${current.id}`} className="block rounded-[24px] border border-emerald-500/30 bg-gradient-to-br from-emerald-950/70 to-neutral-900 p-5 shadow-xl">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> {t(lang, "workingNowShort")}</div>
            <div className="text-2xl font-semibold">{current.customer_name}</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-neutral-400"><MapPin className="h-4 w-4" />{current.address || current.job_number}</div>
            <div className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white font-semibold text-black">{t(lang, "continueWork")} <ArrowRight className="h-4 w-4" /></div>
          </Link>
        ) : <div className="rounded-[24px] border border-white/10 bg-neutral-900/70 p-5"><div className="text-lg font-semibold">{t(lang, "readyStart")}</div><p className="mt-1 text-sm text-neutral-500">{t(lang, "readyHint")}</p></div>}
        <section>
          <div className="mb-3 flex items-end justify-between"><h2 className="text-xl font-semibold">{t(lang, "onTheFloor")}</h2><Link href="/shop/jobs" className="text-sm text-amber-400">{t(lang, "seeAll")}</Link></div>
          <div className="overflow-hidden rounded-[22px] border border-white/10 bg-neutral-900/60">
            {urgent.length ? urgent.map((job) => { const days = job.due_date ? dayDistance(job.due_date) : null; return <Link key={job.id} href={`/shop/job/${job.id}`} className="flex min-h-[72px] items-center gap-3 border-b border-white/5 px-4 last:border-0 active:bg-white/5"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${days != null && days < 0 ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}><AlertCircle className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="truncate font-semibold">{job.customer_name}</div><div className="truncate text-sm text-neutral-500">{job.project_type || job.job_number}</div></div><div className={`shrink-0 text-sm font-medium ${days != null && days < 0 ? "text-red-400" : "text-amber-400"}`}>{days == null ? stageLabel(lang, job.current_stage) : days < 0 ? t(lang, "daysLate", { n: Math.abs(days) }) : days === 0 ? t(lang, "today") : `${days}d`}</div></Link>; }) : <p className="p-6 text-center text-sm text-neutral-500">{t(lang, "nothingInFab")}</p>}
          </div>
        </section>
        <section className="grid grid-cols-2 gap-3">
          <Link href="/shop/jobs" className="rounded-[22px] border border-white/10 bg-neutral-900/60 p-4"><BriefcaseBusiness className="mb-6 h-6 w-6 text-blue-400" /><div className="text-2xl font-semibold">{active.length}</div><div className="text-sm text-neutral-500">{t(lang, "activeProjectsTile")}</div><div className="mt-0.5 text-xs text-amber-500/90">{t(lang, "inFabricationN", { n: inFab.length })}</div></Link>
          <Link href="/shop/leads" className="rounded-[22px] border border-white/10 bg-neutral-900/60 p-4"><Ruler className="mb-6 h-6 w-6 text-amber-400" /><div className="text-2xl font-semibold">{leads.length}</div><div className="text-sm text-neutral-500">{t(lang, "measuresLeads")}</div></Link>
        </section>
      </main>
    </div>
  );
}
