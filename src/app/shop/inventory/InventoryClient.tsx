"use client";

// What is on the truck and in the shop, and what has fallen below the level
// Daniel set for it.
//
// The Friday truck check was a spreadsheet with a "CHECK" column somebody
// ticked with a pen. The useful part of it was never the tick — it was the
// MINIMUM QUANTITY next to each line, because that is what turns a count into
// a shopping list. So counting is two taps (− and +), and anything under its
// minimum floats to the top with what is missing already worked out.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CatalogItem, InventoryRow } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";
import ProfileIcon from "../job/[id]/ProfileIcon";

type Joined = InventoryRow & { item: CatalogItem };

const GROUPS: { key: string; cats: string[] }[] = [
  { key: "abrasive", cats: ["abrasive"] },
  { key: "welding", cats: ["welding"] },
  { key: "fastener", cats: ["fastener"] },
  { key: "finish", cats: ["finish"] },
  { key: "bit", cats: ["bit"] },
  { key: "ppe", cats: ["ppe"] },
  { key: "supply", cats: ["supply"] },
  { key: "tool", cats: ["tool", "equipment"] },
  { key: "truck_stock", cats: ["truck_stock"] },
];

export default function InventoryClient({
  rows,
  lang,
  canEdit,
}: {
  rows: Joined[];
  lang: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [group, setGroup] = useState<string>("low");
  const [q, setQ] = useState("");

  const low = useMemo(
    () => rows.filter((r) => r.min_qty != null && Number(r.on_hand) < Number(r.min_qty)),
    [rows],
  );

  async function setQty(row: Joined, next: number) {
    if (next < 0) return;
    setBusy(row.id);
    try {
      const res = await fetch("/shop/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "inv_set", id: row.id, onHand: next }),
      });
      if (res.ok) startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = group === "low" ? low : rows.filter((r) => {
      const g = GROUPS.find((x) => x.key === group);
      return g ? g.cats.includes(r.item.category) : true;
    });
    if (needle) list = list.filter((r) => r.item.display.toLowerCase().includes(needle));
    return list;
  }, [rows, low, group, q]);

  // The whole point: what to buy this week, worked out rather than eyeballed.
  const shopping = low
    .map((r) => `${Math.ceil(Number(r.min_qty) - Number(r.on_hand))} × ${r.item.display}`)
    .join("\n");

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28">
      <div className="flex items-center gap-3 pt-4">
        <h1 className="flex-1 text-[26px] font-display font-bold">{t(lang, "tileInventory")}</h1>
        {low.length > 0 && (
          <span className="rounded-full bg-red-500/15 px-3 py-1.5 text-[15px] font-bold text-red-400">
            {low.length} {t(lang, "invLow")}
          </span>
        )}
      </div>

      {low.length > 0 && group === "low" && (
        <button
          onClick={() => navigator.clipboard?.writeText(shopping)}
          className="mt-3 min-h-[52px] w-full rounded-xl border border-neutral-700 bg-neutral-900 text-[15px] font-semibold text-neutral-200"
        >
          {t(lang, "invCopyList")}
        </button>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t(lang, "invSearch")}
        className="mt-3 min-h-[52px] w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-[16px] text-neutral-100 outline-none focus:border-amber-500"
      />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {[{ key: "low" }, ...GROUPS].map((g) => (
          <button
            key={g.key}
            onClick={() => setGroup(g.key)}
            className={`min-h-[44px] shrink-0 rounded-xl border px-3.5 text-[14px] font-semibold ${
              group === g.key
                ? "border-amber-500 bg-amber-500 text-black"
                : "border-neutral-700 bg-neutral-900 text-neutral-300"
            }`}
          >
            {t(lang, `invg_${g.key}`)}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-800">
        {visible.length === 0 && (
          <p className="px-4 py-8 text-center text-[15px] text-neutral-500">
            {group === "low" ? t(lang, "invAllStocked") : t(lang, "invNone")}
          </p>
        )}
        {visible.map((r) => {
          const short = r.min_qty != null && Number(r.on_hand) < Number(r.min_qty);
          return (
            <div
              key={r.id}
              className={`flex items-center gap-3 border-b border-neutral-800 px-3 py-2.5 last:border-b-0 ${
                short ? "bg-red-950/20" : ""
              }`}
            >
              <ProfileIcon category={r.item.category} className="h-6 w-6 shrink-0 text-neutral-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] text-neutral-100">{r.item.display}</p>
                <p className="truncate text-[12px] text-neutral-500">
                  {r.location} · {t(lang, "invMin")} {r.min_qty ?? "—"} {r.item.unit}
                  {short && (
                    <span className="ml-1 font-semibold text-red-400">
                      · {t(lang, "invBuy")} {Math.ceil(Number(r.min_qty) - Number(r.on_hand))}
                    </span>
                  )}
                </p>
              </div>
              {canEdit ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setQty(r, Number(r.on_hand) - 1)}
                    disabled={busy === r.id}
                    className="h-11 w-11 rounded-lg border border-neutral-700 text-[19px] text-neutral-300 disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-[17px] font-bold tabular-nums">
                    {Number(r.on_hand)}
                  </span>
                  <button
                    onClick={() => setQty(r, Number(r.on_hand) + 1)}
                    disabled={busy === r.id}
                    className="h-11 w-11 rounded-lg border border-neutral-700 text-[19px] text-neutral-300 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              ) : (
                <span className="w-10 text-center text-[17px] font-bold tabular-nums">
                  {Number(r.on_hand)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
