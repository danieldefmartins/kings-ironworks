import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { getWorkerProfile } from "@/lib/shop/db";
import { getTeamRecord } from "@/lib/shop/team-db";
import { profileView } from "@/lib/shop/w9-service";
import ShopTopBar from "../ShopTopBar";
import ProfileForm from "./ProfileForm";
import ProfileLinks from "./ProfileLinks";
import { t } from "@/lib/shop/i18n";

export const dynamic = "force-dynamic";
export default async function ProfilePage() {
  const worker = await getSessionWorker(); if (!worker) redirect("/shop/login");
  const profile = await getWorkerProfile(worker.id); if (!profile) redirect("/shop/login");
  const rec = await getTeamRecord(worker.id).catch(() => null);
  const lang = worker.lang || "en";
  return <div><ShopTopBar workerName={worker.name} title={t(worker.lang, "myProfile")} back="/shop/more" lang={lang} /><main className="mx-auto max-w-2xl space-y-6 px-4 py-5">{rec && <ProfileLinks profile={profileView(rec)} lang={lang} />}<ProfileForm profile={profile} lang={lang} /></main></div>;
}
