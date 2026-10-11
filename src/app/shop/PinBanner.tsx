// Today-screen card shown after the owner reset this worker's PIN, until the
// worker chooses their own.
import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { pinResetOf } from "@/lib/shop/pin-service";
import { pint } from "@/lib/shop/pin-i18n";
import type { TeamRecord } from "@/lib/shop/w9-service";

export default function PinBanner({ record, lang }: { record: TeamRecord | null; lang: string }) {
  if (!pinResetOf(record)) return null;
  return (
    <Link href="/shop/profile/pin" data-testid="pin-banner" className="flex items-center gap-4 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-5 hover:bg-amber-400/10">
      <KeyRound aria-hidden className="h-8 w-8 shrink-0 text-amber-300" strokeWidth={1.6} />
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold">{pint(lang, "bannerTitle")}</h2>
        <p className="mt-0.5 text-sm text-neutral-400">{pint(lang, "bannerBody")}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-amber-300">{pint(lang, "bannerCta")}<ArrowRight aria-hidden className="h-4 w-4" /></span>
    </Link>
  );
}
