import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionWorker, randomSeed } from "@/lib/shop/session";
import { t } from "@/lib/shop/i18n";
import { mt } from "@/lib/shop/measure-i18n";
import ShopTopBar from "./ShopTopBar";
import MotivationBanner from "./MotivationBanner";

export const dynamic = "force-dynamic";

// Shop home: a clean launcher. Four big tiles route to the actual work —
// details (and money, for admins only) live on the pages behind them.
export default async function ShopHome() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const lang = worker.lang || "en";
  const isAdmin = !!worker.is_admin;

  const tiles: { href: string; icon: string; title: string; hint: string }[] = [
    {
      href: "/shop/jobs",
      icon: "🏗",
      title: mt(lang, "tileProjects"),
      hint: mt(lang, "tileProjectsHint"),
    },
    {
      href: "/shop/new-measure",
      icon: "📐",
      title: mt(lang, "newFieldMeasure"),
      hint: mt(lang, "tileNewMeasureHint"),
    },
    {
      href: "/shop/inventory",
      icon: "📦",
      title: mt(lang, "tileInventory"),
      hint: mt(lang, "tileInventoryHint"),
    },
    {
      href: "/shop/leads",
      icon: "🧲",
      title: mt(lang, "tileLeads"),
      hint: mt(lang, "tileLeadsHint"),
    },
  ];
  if (isAdmin) {
    tiles.push({
      href: "/shop/admin",
      icon: "⚙️",
      title: mt(lang, "tileAdmin"),
      hint: mt(lang, "tileAdminHint"),
    });
  }

  return (
    <div>
      <ShopTopBar
        workerName={worker.name}
        title={t(lang, "shopFloor")}
        lang={lang}
        adminLink={false}
      />
      <div className="p-4 max-w-2xl mx-auto">
        <div className="mb-5">
          <MotivationBanner lang={lang} seed={randomSeed()} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col items-center text-center gap-3 hover:border-amber-600/60 active:scale-[0.98] transition min-h-40 justify-center"
            >
              <span className="text-5xl" aria-hidden>
                {tile.icon}
              </span>
              <span className="font-display font-bold text-lg leading-tight">
                {tile.title}
              </span>
              <span className="text-xs text-neutral-500 leading-snug">{tile.hint}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
