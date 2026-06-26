import { listWorkers } from "@/lib/shop/db";
import { getSessionWorker } from "@/lib/shop/session";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function ShopLoginPage() {
  const existing = await getSessionWorker();
  if (existing) redirect("/shop");

  let workers: { id: string; name: string; role: string }[] = [];
  let error: string | null = null;
  try {
    workers = await listWorkers();
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load workers";
  }

  return <LoginClient workers={workers} loadError={error} />;
}
