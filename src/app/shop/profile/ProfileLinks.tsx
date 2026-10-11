// Rows at the top of My profile: the guided profile (address, emergency,
// payment), the W-9, and the sign-in PIN, each with where it stands.
import Link from "next/link";
import { ChevronRight, FileText, KeyRound, UserRound } from "lucide-react";
import { maskedTin } from "@/lib/shop/tin";
import { REQUIRED_STEPS, stepDone, type ProfileView } from "@/lib/shop/w9";
import { w9t } from "@/lib/shop/w9-i18n";
import { pint } from "@/lib/shop/pin-i18n";

export default function ProfileLinks({ profile, lang, pinReset = false }: { profile: ProfileView; lang: string; pinReset?: boolean }) {
  const t = (k: string, v?: Record<string, string | number>) => w9t(lang, k, v);
  const steps = REQUIRED_STEPS.filter(s => s !== "w9");
  const done = steps.filter(s => stepDone(profile, s)).length;
  const w9 = profile.w9;
  const w9Ok = w9.status === "signed" && !w9.needsSignature;
  const rows: { href: string; icon: typeof UserRound; title: string; detail: string; tone: string }[] = [
    {
      href: "/shop/profile/setup",
      icon: UserRound,
      title: t("profileRow"),
      detail: done === steps.length ? t("profileRowDone") : t("profileRowTodo", { n: done, total: steps.length }),
      tone: done === steps.length ? "text-emerald-400" : "text-amber-300",
    },
    {
      href: "/shop/profile/w9",
      icon: FileText,
      title: t("step_w9"),
      detail: w9Ok && w9.tinType && w9.tinLast4 ? `${t("st_signed")} · ${maskedTin(w9.tinType, w9.tinLast4)}` : t(`st_${w9.status === "signed" ? "prepared" : w9.status}`),
      tone: w9Ok ? "text-emerald-400" : "text-amber-300",
    },
    {
      href: "/shop/profile/pin",
      icon: KeyRound,
      title: pint(lang, "title"),
      detail: pinReset ? pint(lang, "rowTemp") : pint(lang, "rowDetail"),
      tone: pinReset ? "text-amber-300" : "text-neutral-400",
    },
  ];
  return (
    <nav className="overflow-hidden rounded-[24px] border border-white/10 bg-neutral-900/60">
      {rows.map(({ href, icon: Icon, title, detail, tone }) => (
        <Link key={href} href={href} className="flex min-h-16 items-center gap-4 border-b border-white/10 px-5 py-3 last:border-0 hover:bg-white/5">
          <Icon aria-hidden className="h-5 w-5 shrink-0 text-amber-300" strokeWidth={1.8} />
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium">{title}</span>
            <span className={`block text-sm ${tone}`}>{detail}</span>
          </span>
          <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-neutral-600" />
        </Link>
      ))}
    </nav>
  );
}
