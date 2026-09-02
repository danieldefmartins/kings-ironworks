import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowRight, BriefcaseBusiness, MapPin, Ruler } from "lucide-react";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials, isInFabrication } from "@/lib/shop/shared";
import { getRunningEntry, listJobs } from "@/lib/shop/db";
import ShopTopBar from "./ShopTopBar";
import { t } from "@/lib/shop/i18n";

export const dynamic = "force-dynamic";

function dayDistance(date: string | null) {
  if (!date) return 9999;
  return Math.ceil((new Date(`${date}T00:00:00`).getTime() - Date.now()) / 86400000);
}

export default async function ShopToday() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const [jobs, mine] = await Promise.all([listJobs(), getRunningEntry(worker.id)]);
  const active = jobs.filter((j) => j.current_stage !== "Lead" && j.current_stage !== "Done");
  const leads = jobs.filter((j) => j.current_stage === "Lead");
  const current = mine ? jobs.find((j) => j.id === mine.job_id) : null;
  const urgent = active.filter((j) => dayDistance(j.due_date) <= 7).slice(0, 4);
  const inFab = active.filter(isInFabrication);
  const lang = worker.lang || "en";

  return (
    <div>
      <ShopTopBar workerName={worker.name} title={t(lang, "navToday")} lang={lang} adminLink={canViewOwnerFinancials(worker)} />
      <main className="mx-auto max-w-2xl space-y-6 px-4 pb-28 pt-5">
        <header><p className="text-sm text-neutral-500">{t(lang, "welcomeBack", { name: worker.name.split(" ")[0] })}</p><h1 className="mt-0.5 text-3xl font-semibold tracking-tight">{t(lang, "attention")}</h1></header>
        {current ? (
          <Link href={`/shop/job/${current.id}`} className="block rounded-[24px] border border-emerald-500/30 bg-gradient-to-br from-emerald-950/70 to-neutral-900 p-5 shadow-xl">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> {t(lang, "workingNowShort")}</div>
            <div className="text-2xl font-semibold">{current.customer_name}</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-neutral-400"><MapPin className="h-4 w-4" />{current.address || current.job_number}</div>
            <div className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white font-semibold text-black">{t(lang, "continueWork")} <ArrowRight className="h-4 w-4" /></div>
          </Link>
        ) : <div className="rounded-[24px] border border-white/10 bg-neutral-900/70 p-5"><div className="text-lg font-semibold">{t(lang, "readyStart")}</div><p className="mt-1 text-sm text-neutral-500">{t(lang, "readyHint")}</p></div>}
        <section>
          <div className="mb-3 flex items-end justify-between"><h2 className="text-xl font-semibold">{t(lang, "dueSoon")}</h2><Link href="/shop/jobs" className="text-sm text-amber-400">{t(lang, "seeAll")}</Link></div>
          <div className="overflow-hidden rounded-[22px] border border-white/10 bg-neutral-900/60">
            {urgent.length ? urgent.map((job) => { const days = dayDistance(job.due_date); return <Link key={job.id} href={`/shop/job/${job.id}`} className="flex min-h-[72px] items-center gap-3 border-b border-white/5 px-4 last:border-0 active:bg-white/5"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${days < 0 ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}><AlertCircle className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="truncate font-semibold">{job.customer_name}</div><div className="truncate text-sm text-neutral-500">{job.project_type || job.job_number}</div></div><div className={`text-sm font-medium ${days < 0 ? "text-red-400" : "text-amber-400"}`}>{days < 0 ? t(lang, "daysLate", { n: Math.abs(days) }) : days === 0 ? t(lang, "today") : `${days}d`}</div></Link>; }) : <p className="p-6 text-center text-sm text-neutral-500">{t(lang, "nothingDue")}</p>}
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
