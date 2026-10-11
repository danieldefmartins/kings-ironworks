// Two rows at the top of My profile: the guided profile (address, emergency,
// payment) and the W-9, each with where it stands.
import Link from "next/link";
import { ChevronRight, FileText, UserRound } from "lucide-react";
import { maskedTin } from "@/lib/shop/tin";
import { REQUIRED_STEPS, stepDone, type ProfileView } from "@/lib/shop/w9";
import { w9t } from "@/lib/shop/w9-i18n";

export default function ProfileLinks({ profile, lang }: { profile: ProfileView; lang: string }) {
  const t = (k: string, v?: Record<string, string | number>) => w9t(lang, k, v);
  const steps = REQUIRED_STEPS.filter(s => s !== "w9");
  const done = steps.filter(s => stepDone(profile, s)).length;
  const w9 = profile.w9;
  const w9Ok = w9.status === "signed" && !w9.needsSignature;
  const rows = [
    {
      href: "/shop/profile/setup",
      icon: UserRound,
      title: t("profileRow"),
      detail: done === steps.length ? t("profileRowDone") : t("profileRowTodo", { n: done, total: steps.length }),
      ok: done === steps.length,
    },
    {
      href: "/shop/profile/w9",
      icon: FileText,
      title: t("step_w9"),
      detail: w9Ok && w9.tinType && w9.tinLast4 ? `${t("st_signed")} · ${maskedTin(w9.tinType, w9.tinLast4)}` : t(`st_${w9.status === "signed" ? "prepared" : w9.status}`),
      ok: w9Ok,
    },
  ];
  return (
    <nav className="overflow-hidden rounded-[24px] border border-white/10 bg-neutral-900/60">
      {rows.map(({ href, icon: Icon, title, detail, ok }) => (
        <Link key={href} href={href} className="flex min-h-16 items-center gap-4 border-b border-white/10 px-5 py-3 last:border-0 hover:bg-white/5">
          <Icon aria-hidden className="h-5 w-5 shrink-0 text-amber-300" strokeWidth={1.8} />
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium">{title}</span>
            <span className={`block text-sm ${ok ? "text-emerald-400" : "text-amber-300"}`}>{detail}</span>
          </span>
          <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-neutral-600" />
        </Link>
      ))}
    </nav>
  );
}
