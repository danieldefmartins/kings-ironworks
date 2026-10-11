import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { getTeamRecord } from "@/lib/shop/team-db";
import { profileView } from "@/lib/shop/w9-service";
import { PROFILE_STEPS, firstOpenStep, profileComplete, type ProfileStep } from "@/lib/shop/w9";
import { w9t } from "@/lib/shop/w9-i18n";
import ShopTopBar from "../../ShopTopBar";
import ProfileWizard from "../ProfileWizard";

export const dynamic = "force-dynamic";

export default async function ProfileSetupPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const rec = await getTeamRecord(worker.id);
  if (!rec) redirect("/shop/login");
  const profile = profileView(rec);
  const lang = worker.lang || "en";
  const asked = (await searchParams).step;
  const step: ProfileStep | "done" = PROFILE_STEPS.includes(asked as ProfileStep)
    ? (asked as ProfileStep)
    : profileComplete(profile) ? "done" : firstOpenStep(profile);
  return (
    <div>
      <ShopTopBar workerName={worker.name} title={w9t(lang, "wizardTitle")} back="/shop/profile" lang={lang} />
      <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
        <ProfileWizard profile={profile} lang={lang} initialStep={step} />
      </main>
    </div>
  );
}
