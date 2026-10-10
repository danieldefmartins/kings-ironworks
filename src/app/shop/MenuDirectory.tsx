"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, Calculator, ChevronRight, ClipboardClock, House, PackageSearch, Ruler, Search, UserRound, X } from "lucide-react";
import { t } from "@/lib/shop/i18n";
import { mt } from "@/lib/shop/measure-i18n";
import { ADMIN_DESTS } from "./adminNav";

const CREW_DESTS = [
  { group: "daily", href: "/shop", key: "navToday", hintKey: "menuTodayHint", icon: House },
  { group: "daily", href: "/shop/jobs", key: "jobs", hintKey: "menuJobsHint", icon: BriefcaseBusiness },
  { group: "field", href: "/shop/new-measure", key: "newFieldMeasure", hintKey: "menuMeasureHint", icon: Ruler },
  { group: "field", href: "/shop/leads", key: "tileLeads", hintKey: "tileLeadsHint", icon: BriefcaseBusiness },
  { group: "field", href: "/shop/inventory", key: "tileInventory", hintKey: "tileInventoryHint", icon: PackageSearch },
  { group: "field", href: "/shop/calc", key: "calcTile", hintKey: "calcTileHint", icon: Calculator },
  { group: "account", href: "/shop/time", key: "myTimesheet", hintKey: "myTimesheetHint", icon: ClipboardClock },
  { group: "account", href: "/shop/profile", key: "myProfile", hintKey: "myProfileHint", icon: UserRound },
];
const GROUPS = {
  crew: [["daily", "menuDaily"], ["field", "menuField"], ["account", "menuAccount"]],
  admin: [["payroll", "menuPayroll"], ["money", "menuMoney"], ["business", "menuBusiness"]],
};
const measureKeys = new Set(["newFieldMeasure", "tileLeads", "tileLeadsHint"]);
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Both menus and their full-page directories use these same destinations.
// The admin directory is mounted only behind the server's owner check.
export default function MenuDirectory({ scope, lang, onNavigate, compact = false, simple = false }: {
  scope: "crew" | "admin" | "all"; lang: string; onNavigate?: () => void; compact?: boolean; simple?: boolean;
}) {
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const label = (key: string) => measureKeys.has(key) ? mt(lang, key) : t(lang, key);
  const destinations = scope === "all" ? [...CREW_DESTS, { group: "business", href: "/shop/admin", key: "admHubTitle", hintKey: "admHubHint", icon: House }, ...ADMIN_DESTS.filter(d => !CREW_DESTS.some(c => c.href === d.href))] : scope === "admin" ? ADMIN_DESTS : CREW_DESTS;
  const groupList = scope === "all" ? [...GROUPS.crew.slice(0, 2), ...GROUPS.admin, GROUPS.crew[2]] : GROUPS[scope];
  const groups = groupList.map(([id, key]) => ({
    id, title: t(lang, key),
    items: destinations.filter(d => !(scope === "all" && d.href === "/shop/time") && d.group === id && normalize(`${label(d.key)} ${label(d.hintKey)} ${t(lang, key)}`).includes(normalize(query.trim()))),
  })).filter(g => g.items.length);

  return <div className="space-y-5">
    <div className="flex min-h-12 items-center gap-2 rounded-xl border border-white/15 bg-neutral-950 px-3 focus-within:border-amber-500">
      <Search aria-hidden className="h-5 w-5 shrink-0 text-neutral-400" />
      <input type="search" aria-label={t(lang, "menuSearch")} placeholder={t(lang, "menuSearch")} value={query} onChange={e => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent py-3 text-base text-neutral-100 outline-none" />
      {query && <button type="button" aria-label={t(lang, "menuClear")} onClick={() => setQuery("")} className="grid h-11 w-11 place-items-center"><X aria-hidden className="h-4 w-4" /></button>}
    </div>
    {groups.length === 0 && <p role="status" className="py-6 text-center text-neutral-400">{t(lang, "menuEmpty")}</p>}
    <nav aria-label={t(lang, scope === "admin" ? "admHubTitle" : "menuCrew")} className={simple && !compact ? "grid items-start gap-6 md:grid-cols-2" : "space-y-5"}>
      {groups.map(group => { const Group = simple && compact ? "details" : "section"; return <Group key={`${group.id}-${query ? "search" : "browse"}`} open={simple && compact ? !!query || group.id === "daily" : undefined} aria-label={group.title} className={simple && compact ? "shop-menu-group" : undefined}>
        {simple && compact ? <summary className="flex min-h-12 cursor-pointer items-center justify-between text-sm font-semibold">{group.title}<ChevronRight aria-hidden className="h-4 w-4" /></summary> : <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">{group.title}</h2>}
        <div className={simple ? "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]" : compact ? "space-y-2" : "grid gap-3 sm:grid-cols-2"}>
          {group.items.map(d => <Link key={d.href} href={d.href} onClick={onNavigate}
            aria-current={pathname === d.href ? "page" : undefined}
            className={simple ? "flex min-h-[64px] items-center gap-3 border-b border-white/[0.06] px-4 py-3 text-neutral-100 transition last:border-0 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-amber-400 aria-[current=page]:bg-amber-400/5" : "flex min-h-[72px] items-center gap-3 rounded-2xl border border-white/10 bg-neutral-800/40 p-3 text-neutral-100 transition hover:border-amber-500/50 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-amber-400 aria-[current=page]:border-amber-500/60"}>
            <span className={simple ? "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5" : "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-800"}><d.icon aria-hidden className={`h-5 w-5 ${"tone" in d ? d.tone : "text-amber-400"}`} /></span>
            <span className="min-w-0 flex-1"><span className="block font-semibold leading-snug">{label(d.key)}</span><span className="mt-1 block text-xs leading-relaxed text-neutral-400">{label(d.hintKey)}</span></span>
            <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-neutral-500" />
          </Link>)}
        </div>
      </Group>; })}
    </nav>
  </div>;
}
