import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { canApproveTime, isTimeApprover } from "@/lib/shop/time-fix";
import { listPendingFixes } from "@/lib/shop/time-fix-db";
import { loadPonto } from "@/lib/shop/ponto-db";
import { pf } from "@/lib/shop/ponto";
import { listWindowRecords } from "@/lib/shop/work-hours-db";
import { toCheck } from "@/lib/shop/work-hours";
import { listWorkers } from "@/lib/shop/db";
import ShopTopBar from "../ShopTopBar";
import PontoClient from "./PontoClient";
import WindowChecks from "../admin/time/WindowChecks";

export const dynamic = "force-dynamic";

// The office's one clock screen (Giulia approves; Kayky and Daniel supervise):
// missed clock-outs first, who's working now, today's hours, the requests
// waiting, the week to approve. Everything the old screens did is still one
// tap away under "Mais" at the bottom.
export default async function PontoPage({ searchParams }: { searchParams: Promise<{ week?: string | string[] }> }) {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!canApproveTime(worker)) redirect("/shop");
  const lang = worker.lang || "en";
  const owner = canViewOwnerFinancials(worker);
  const q = await searchParams;
  const [data, pending] = await Promise.all([
    loadPonto(worker, typeof q.week === "string" ? q.week : undefined),
    listPendingFixes(worker.id).catch(() => []),
  ]);
  // Extra-time answers the owner checks (owner-only action), as before.
  let checks: { shiftId: string; edge: "start" | "end"; worker: string; punchedAt: string; edgeAt: string }[] = [];
  if (owner) {
    const [records, workers] = await Promise.all([listWindowRecords({ sinceDays: 45 }).catch(() => []), listWorkers().catch(() => [])]);
    const names = new Map(workers.map((w) => [w.id, w.name]));
    checks = toCheck(records).map((r) => ({ shiftId: r.shiftId, edge: r.edge, worker: names.get(r.workerId) || "Unknown", punchedAt: r.punchedAt, edgeAt: r.edgeAt }));
  }
  return <div>
    <ShopTopBar workerName={worker.name} title={pf(lang, "ponto")} back={owner ? "/shop" : "/shop/more"} lang={lang} adminLink={owner} />
    <main className="mx-auto max-w-2xl space-y-7 px-4 pb-28 pt-5">
      <header>
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">{pf(lang, "ponto")}</h1>
        <p className="mt-1 text-[15px] text-neutral-400">{pf(lang, "pontoHint")}</p>
        {isTimeApprover(worker) && <p className="mt-1 text-sm text-neutral-500">{pf(lang, "ownWeek")}</p>}
      </header>
      <PontoClient data={data} pending={pending} lang={lang} owner={owner} selfId={worker.id}>
        {checks.length > 0 ? <WindowChecks lang={lang} rows={checks} /> : null}
      </PontoClient>
    </main>
  </div>;
}
