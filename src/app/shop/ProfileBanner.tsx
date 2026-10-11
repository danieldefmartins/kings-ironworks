// Today-screen card that stays until the worker's profile + W-9 are done.
import Link from "next/link";
import { ArrowRight, FileSignature } from "lucide-react";
import { profileView, showProfileBanner, type TeamRecord } from "@/lib/shop/w9-service";
import { REQUIRED_STEPS, stepDone } from "@/lib/shop/w9";
import { w9t } from "@/lib/shop/w9-i18n";

export default function ProfileBanner({ record, lang }: { record: TeamRecord | null; lang: string }) {
  if (!record || !showProfileBanner(record)) return null;
  const p = profileView(record);
  const onlyW9 = REQUIRED_STEPS.filter(s => s !== "w9").every(s => stepDone(p, s));
  const done = REQUIRED_STEPS.filter(s => stepDone(p, s)).length;
  return (
    <Link href="/shop/profile/setup" data-testid="profile-banner" className="flex items-center gap-4 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-5 hover:bg-amber-400/10">
      <FileSignature aria-hidden className="h-8 w-8 shrink-0 text-amber-300" strokeWidth={1.6} />
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold">{w9t(lang, onlyW9 ? "bannerW9Title" : "bannerTitle")}</h2>
        <p className="mt-0.5 text-sm text-neutral-400">{w9t(lang, onlyW9 ? "bannerW9Body" : "bannerBody")}</p>
        <div className="mt-3 flex gap-1" aria-hidden>
          {REQUIRED_STEPS.map((s, i) => <span key={s} className={`h-1 flex-1 rounded-full ${i < done ? "bg-amber-400" : "bg-white/10"}`} />)}
        </div>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-amber-300">{w9t(lang, "bannerCta")}<ArrowRight aria-hidden className="h-4 w-4" /></span>
    </Link>
  );
}
