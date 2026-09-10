import ActionsView from "./ActionsView";
import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { loadBusinessActions } from "@/lib/shop/actions-db";

export const dynamic = "force-dynamic";

export default async function ActionDashboard() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!canViewOwnerFinancials(worker)) redirect("/shop");
  const lang = worker.lang || "en";
  let data: Awaited<ReturnType<typeof loadBusinessActions>> | null = null;
  try { data = await loadBusinessActions(); } catch { /* Never report zero alerts when a source failed. */ }
  return <ActionsView data={data} workerName={worker.name} lang={lang} />;
}
