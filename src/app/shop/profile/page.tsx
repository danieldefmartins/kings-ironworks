import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { getWorkerProfile } from "@/lib/shop/db";
import ShopTopBar from "../ShopTopBar";
import ProfileForm from "./ProfileForm";
import { t } from "@/lib/shop/i18n";

export const dynamic = "force-dynamic";
export default async function ProfilePage() {
  const worker = await getSessionWorker(); if (!worker) redirect("/shop/login");
  const profile = await getWorkerProfile(worker.id); if (!profile) redirect("/shop/login");
  return <div><ShopTopBar workerName={worker.name} title={t(worker.lang, "myProfile")} back="/shop/more" lang={worker.lang || "en"} /><main className="mx-auto max-w-2xl px-4 py-5"><ProfileForm profile={profile} lang={worker.lang || "en"} /></main></div>;
}
