import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, ClipboardClock, Languages, Settings, ShieldCheck, UserRound } from "lucide-react";
import { getSessionWorker } from "@/lib/shop/session";
import ShopTopBar from "../ShopTopBar";
import { t } from "@/lib/shop/i18n";
import { canViewOwnerFinancials } from "@/lib/shop/shared";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const lang = worker.lang || "en";
  // The whole /shop/admin tree is owner-level — rates, deposits, job costs. Show
  // the links to exactly the people the pages will let in, so nobody taps a row
  // that bounces them back to the home screen with no explanation.
  const owner = canViewOwnerFinancials(worker);
  const links = [
    { href: "/shop/profile", label: t(lang, "myProfile"), detail: t(lang, "myProfileHint"), icon: UserRound },
    { href: "/shop/time", label: t(lang, "myTimesheet"), detail: t(lang, "myTimesheetHint"), icon: ClipboardClock },
    ...(owner ? [
      { href: "/shop/admin/time", label: t(lang, "teamTimesheets"), detail: t(lang, "teamTimesheetsHint"), icon: ShieldCheck },
      { href: "/shop/admin", label: t(lang, "admHubTitle"), detail: t(lang, "admHubHint"), icon: Settings },
    ] : []),
  ];
  return <div><ShopTopBar workerName={worker.name} title={t(lang, "navMore")} lang={lang} />
    <main className="mx-auto max-w-2xl px-4 py-5"><div className="mb-5 rounded-[22px] border border-white/10 bg-neutral-900/60 p-5"><div className="text-xl font-semibold">{worker.name}</div><div className="text-sm text-neutral-500">{worker.role}</div></div>
      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-neutral-900/60">{links.map(({ href, label, detail, icon: Icon }) => <Link key={href} href={href} className="flex min-h-[76px] items-center gap-3 border-b border-white/5 px-4 last:border-0"><div className="grid h-10 w-10 place-items-center rounded-full bg-neutral-800"><Icon className="h-5 w-5 text-amber-400" /></div><div className="flex-1"><div className="font-semibold">{label}</div><div className="text-sm text-neutral-500">{detail}</div></div><ChevronRight className="h-5 w-5 text-neutral-600" /></Link>)}</div>
      <div className="mt-4 flex items-center gap-2 px-2 text-sm text-neutral-600"><Languages className="h-4 w-4" /> {t(lang, "profileLanguageHint")}</div>
    </main></div>;
}
