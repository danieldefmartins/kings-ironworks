import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { ORG_ID, sbSelect } from "@/lib/shop/db";
import type { WorkerApplication } from "@/lib/shop/worker-application";
import ShopTopBar from "../../ShopTopBar";
import ApplicationsClient from "./ApplicationsClient";
export const dynamic = "force-dynamic";
export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!canViewOwnerFinancials(worker)) redirect("/shop");
  const query = await searchParams;
  const status = ["approved", "declined"].includes(query.status || "") ? query.status! : "pending";
  const page = Math.max(1, Math.min(10000, Number.parseInt(query.page || "1", 10) || 1));
  let applications: WorkerApplication[] = [], failed = false;
  try { applications = await sbSelect<WorkerApplication[]>("kiw_shop_worker_applications", `select=id,full_name,email,phone,status,data,created_at,reviewed_at,review_note,worker_id&org_id=eq.${ORG_ID}&status=eq.${status}&order=created_at.desc,id.desc&limit=51&offset=${(page - 1) * 50}`); }
  catch { failed = true; }
  return <div><ShopTopBar workerName={worker.name} title="Worker applications" back="/shop/more" lang={worker.lang || "en"} /><main className="mx-auto max-w-4xl space-y-6 px-4 pb-28 pt-6"><header><h1 className="text-3xl font-semibold tracking-tight">Build your team</h1><p className="mt-2 text-sm text-neutral-400">Review each application. Approving creates a worker profile with their information and employee-only access.</p><Link href="/join-our-team" target="_blank" className="mt-3 inline-block text-sm font-semibold text-amber-300 underline">Open application form ↗</Link><p className="mt-1 text-xs text-neutral-500">Share: kingsironworks.com/join-our-team</p></header><nav aria-label="Application status" className="flex gap-2">{["pending", "approved", "declined"].map(value => <Link key={value} href={`?status=${value}`} aria-current={status === value ? "page" : undefined} className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize ${status === value ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-neutral-700 text-neutral-400"}`}>{value}</Link>)}</nav>{failed ? <p role="alert" className="rounded-2xl border border-amber-500/30 p-5 text-amber-300">Applications could not be loaded. Refresh to try again.</p> : <ApplicationsClient applications={applications.slice(0, 50)} />}<div className="flex justify-between text-sm">{page > 1 ? <Link href={`?status=${status}&page=${page - 1}`} className="underline">← Previous</Link> : <span />}{applications.length > 50 && <Link href={`?status=${status}&page=${page + 1}`} className="underline">Next →</Link>}</div></main></div>;
}
