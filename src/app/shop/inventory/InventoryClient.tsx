"use client";

// A classic inventory: pick a category, see a list, each line with a picture
// of the actual thing.
//
// A worker hunting a "3/8 x 4 wedge anchor" recognises the box before they
// read the label, so the picture is the point — and until one is taken the row
// says so plainly rather than pretending with a placeholder graphic. Tapping
// the frame opens the camera; the photo is the item's from then on.
//
// Categories are the ones a person uses standing in the shop — Screws,
// Anchors, Bolts, Discs, Drill bits — not the ones a database would pick.

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { CatalogItem, InventoryRow, SupplierPrice } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";

type Joined = InventoryRow & {
  item: CatalogItem;
  buy: SupplierPrice | null;
  imageUrl: string | null;
};

// Worker-facing groups. The fine categories underneath exist so the app can
// tell a flap disc from a cut-off wheel; these are what a person browses.
const GROUPS: { key: string; cats: string[] }[] = [
  { key: "screws", cats: ["screw_tek", "screw_wood", "screw_concrete"] },
  { key: "anchors", cats: ["anchor_wedge", "anchor_sleeve", "anchor_toggle", "anchor_epoxy", "rod_threaded"] },
  { key: "bolts", cats: ["bolt_hex", "bolt_lag", "bolt_carriage", "bolt_hardware"] },
  { key: "discs", cats: ["disc_flap", "disc_cut", "disc_grind", "brush_wire", "sandpaper"] },
  { key: "bits", cats: ["bit_masonry", "bit_drill", "bit_core", "bit_annular", "bit_holesaw", "bit_step", "blade"] },
  { key: "paint", cats: ["paint", "paint_spray", "paint_tool", "solvent", "tape"] },
  { key: "welding", cats: ["weld_rod", "weld_wire", "welding"] },
  { key: "safety", cats: ["ppe", "ppe_glove", "safety"] },
  { key: "tools", cats: ["tool_power", "tool_hand", "cord"] },
  { key: "shop", cats: ["supply", "masonry"] },
  { key: "steel", cats: ["steel_stock"] },
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
  const [group, setGroup] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const refresh = () => startTransition(() => router.refresh());

  const low = useMemo(
    () => rows.filter((r) => r.min_qty != null && Number(r.on_hand) < Number(r.min_qty)),
    [rows],
  );
  const countIn = (g: (typeof GROUPS)[number]) =>
    rows.filter((r) => g.cats.includes(r.item.category)).length;

  async function setQty(row: Joined, next: number) {
    if (next < 0) return;
    setBusy(row.id);
    try {
      const res = await fetch("/shop/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "inv_set", id: row.id, onHand: next }),
      });
      if (res.ok) refresh();
    } finally {
      setBusy(null);
    }
  }

  const searching = q.trim().length > 0;
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle) return rows.filter((r) => r.item.display.toLowerCase().includes(needle));
    if (group === "low") return low;
    const g = GROUPS.find((x) => x.key === group);
    return g ? rows.filter((r) => g.cats.includes(r.item.category)) : [];
  }, [rows, low, group, q]);

  const shopping = low
    .map((r) => {
      const need = Math.ceil(Number(r.min_qty) - Number(r.on_hand));
      return `${need} × ${r.item.display}${r.buy?.url ? `\n   ${r.buy.url}` : ""}`;
    })
    .join("\n");

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28">
      <div className="flex items-center gap-3 pt-4">
        {(group || searching) && (
          <button
            onClick={() => { setGroup(null); setQ(""); }}
            className="h-11 rounded-lg border border-neutral-700 px-3 text-neutral-300"
          >
            ‹
          </button>
        )}
        <h1 className="flex-1 truncate text-[26px] font-display font-bold">
          {searching ? t(lang, "invSearch") : group ? t(lang, `invg_${group}`) : t(lang, "tileInventory")}
        </h1>
        {low.length > 0 && !group && !searching && (
          <button
            onClick={() => setGroup("low")}
            className="rounded-full bg-red-500/15 px-3 py-1.5 text-[15px] font-bold text-red-400"
          >
            {low.length} {t(lang, "invLow")}
          </button>
        )}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t(lang, "invSearch")}
        className="mt-3 min-h-[52px] w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-[16px] text-neutral-100 outline-none focus:border-amber-500"
      />

      {/* ── the shelf: pick where you are looking ── */}
      {!group && !searching && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {low.length > 0 && (
            <button
              onClick={() => setGroup("low")}
              className="col-span-2 flex min-h-[68px] items-center gap-3 rounded-2xl border border-red-900/60 bg-red-950/30 px-4 text-left"
            >
              <span className="flex-1 text-[17px] font-bold text-red-300">{t(lang, "invg_low")}</span>
              <span className="text-[20px] font-bold text-red-400">{low.length}</span>
            </button>
          )}
          {GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => setGroup(g.key)}
              className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 px-4 text-left active:bg-neutral-800"
            >
              <span className="flex-1 text-[16px] font-semibold">{t(lang, `invg_${g.key}`)}</span>
              <span className="text-[15px] text-neutral-500">{countIn(g)}</span>
            </button>
          ))}
        </div>
      )}

      {(group || searching) && (
        <>
          {group === "low" && low.length > 0 && (
            <button
              onClick={() => navigator.clipboard?.writeText(shopping)}
              className="mt-3 min-h-[52px] w-full rounded-xl border border-neutral-700 bg-neutral-900 text-[15px] font-semibold text-neutral-200"
            >
              {t(lang, "invCopyList")}
            </button>
          )}

          <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-800">
            {visible.length === 0 && (
              <p className="px-4 py-8 text-center text-[15px] text-neutral-500">
                {t(lang, "invNone")}
              </p>
            )}
            {visible.map((r) => (
              <ItemRow
                key={r.id}
                r={r}
                lang={lang}
                canEdit={canEdit}
                busy={busy === r.id}
                onQty={setQty}
                refresh={refresh}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ItemRow({
  r, lang, canEdit, busy, onQty, refresh,
}: {
  r: Joined; lang: string; canEdit: boolean; busy: boolean;
  onQty: (row: Joined, n: number) => void; refresh: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const short = r.min_qty != null && Number(r.on_hand) < Number(r.min_qty);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("catalogId", r.item.id);
      fd.append("sku", r.item.sku);
      const res = await fetch("/shop/api/item-photo", { method: "POST", body: fd });
      if (res.ok) refresh();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className={`flex items-center gap-3 border-b border-neutral-800 p-2.5 last:border-b-0 ${short ? "bg-red-950/20" : ""}`}>
      {/* the picture. Until there is one the frame says so — an invented
          graphic would be worse than an honest gap. */}
      <label className="relative grid h-14 w-14 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
        {r.imageUrl ? (
          <Image src={r.imageUrl} alt={r.item.display} width={112} height={112}
            className="h-full w-full object-cover" unoptimized />
        ) : (
          <span className="text-[10px] leading-tight text-neutral-600">
            {uploading ? "…" : t(lang, "invAddPhoto")}
          </span>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          onChange={onFile} disabled={uploading} className="hidden" />
      </label>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug text-neutral-100">{r.item.display}</p>
        <p className="truncate text-[12px] text-neutral-500">
          {t(lang, "invMin")} {r.min_qty ?? "—"} {r.item.unit}
          {short && (
            <span className="ml-1 font-semibold text-red-400">
              · {t(lang, "invBuy")} {Math.ceil(Number(r.min_qty) - Number(r.on_hand))}
            </span>
          )}
          {r.buy?.pack_qty && <span className="ml-1 text-neutral-600">· {r.buy.pack_qty}/pack</span>}
        </p>
      </div>

      {r.buy?.url && (
        <a href={r.buy.url} target="_blank" rel="noopener noreferrer"
          className="grid h-11 w-9 shrink-0 place-items-center rounded-lg text-[15px] font-bold text-amber-400"
          title={r.buy.supplier}>
          ↗
        </a>
      )}

      {canEdit ? (
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => onQty(r, Number(r.on_hand) - 1)} disabled={busy}
            className="h-11 w-10 rounded-lg border border-neutral-700 text-[19px] text-neutral-300 disabled:opacity-40">−</button>
          <span className="w-9 text-center text-[17px] font-bold tabular-nums">{Number(r.on_hand)}</span>
          <button onClick={() => onQty(r, Number(r.on_hand) + 1)} disabled={busy}
            className="h-11 w-10 rounded-lg border border-neutral-700 text-[19px] text-neutral-300 disabled:opacity-40">+</button>
        </div>
      ) : (
        <span className="w-9 text-center text-[17px] font-bold tabular-nums">{Number(r.on_hand)}</span>
      )}
    </div>
  );
}
