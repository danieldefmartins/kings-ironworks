"use client";

// The shelf, not the spreadsheet.
//
// Daniel: "I rather see images than list, an easy to scroll horizontal list
// and an easy order button that will send me a message to order the materials.
// I think this list is too crowded, I need simpler, image view page." Then:
// "image on top and centered, bigger, and information under. name on top."
// Then: "we can gave the same product page with different sizes instead of a
// huge list that has the same product and just different sizes, always keep in
// mind to simplify while keeping the same features and products."
//
// So: every category is a row you swipe sideways; every card is a PRODUCT, not
// a size. Eleven wedge anchors are one card that says "11 sizes" — the sizes
// live inside it, still counted and still ordered individually. Picture on top,
// centred and card-width; name under it; count under that. Nothing else.
//
// Ordering is one tap. Counting stock and taking a photo still exist, in the
// sheet you reach by tapping a size, because they are not why anyone opens
// this page.

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { CatalogItem, InventoryRow, SupplierPrice } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";
import { splitSize } from "@/lib/shop/families";

type Joined = InventoryRow & {
  item: CatalogItem;
  buy: SupplierPrice | null;
  imageUrl: string | null;
};

// One product, with every size of it that the shop carries.
interface Family {
  key: string;
  name: string;
  items: { row: Joined; variant: string }[];
  imageUrl: string | null;
}

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
  { key: "breakroom", cats: ["breakroom"] },
  { key: "janitorial", cats: ["janitorial"] },
  // Steel gets a shelf per form, the way Central Steel Supply sells it and
  // the way a fabricator asks for it. One shelf of 395 would be a wall.
  { key: "steel", cats: ["steel_stock"] },
  { key: "st_angle", cats: ["angle"] },
  { key: "st_channel", cats: ["channel"] },
  { key: "st_beam", cats: ["beam"] },
  { key: "st_flat", cats: ["flat_bar"] },
  { key: "st_bar", cats: ["solid_round", "solid_square"] },
  { key: "st_tube", cats: ["tube_square", "tube_rect"] },
  { key: "st_pipe", cats: ["pipe_round", "tube_round"] },
  { key: "st_plate", cats: ["plate"] },
  { key: "st_grating", cats: ["grating"] },
];

// Departments — the first screen.
//
// Daniel: "materials inventory needs to be separated, cleaning, steel, tools
// etc... are completely different stuff, make it in a way that makes sense,
// probably a sub category before opening all products."
//
// Steel and toilet paper have nothing to do with each other and nobody is ever
// looking for both. So the screen opens on a short list of departments — the
// areas of the shop — and the shelves only appear once you have picked one.
// A worker after a flap disc no longer scrolls past 121 beams to reach it.
const DEPARTMENTS: { key: string; groups: string[] }[] = [
  { key: "d_steel", groups: ["steel", "st_angle", "st_channel", "st_beam", "st_flat", "st_bar", "st_tube", "st_pipe", "st_plate", "st_grating"] },
  { key: "d_fasteners", groups: ["screws", "anchors", "bolts"] },
  { key: "d_abrasives", groups: ["discs", "bits"] },
  { key: "d_welding", groups: ["welding"] },
  { key: "d_tools", groups: ["tools"] },
  { key: "d_paint", groups: ["paint"] },
  { key: "d_safety", groups: ["safety"] },
  { key: "d_shop", groups: ["shop"] },
  { key: "d_break", groups: ["breakroom", "janitorial"] },
];

const isShort = (r: Joined) => r.min_qty != null && Number(r.on_hand) < Number(r.min_qty);
// How many to buy: enough to clear the minimum, or one if we keep no minimum.
const shortfall = (r: Joined) =>
  r.min_qty != null ? Math.max(1, Math.ceil(Number(r.min_qty) - Number(r.on_hand))) : 1;

// Sizes of one product collapse into one card. Grouping happens per shelf, so
// a product can never straddle two categories.
function buildFamilies(rows: Joined[]): Family[] {
  const byKey = new Map<string, Family>();
  for (const row of rows) {
    const s = splitSize(row.item.display);
    let f = byKey.get(s.key);
    if (!f) {
      f = { key: s.key, name: s.name, items: [], imageUrl: null };
      byKey.set(s.key, f);
    }
    f.items.push({ row, variant: s.variant });
    if (!f.imageUrl) f.imageUrl = row.imageUrl;
  }
  return [...byKey.values()];
}

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
  const refresh = () => startTransition(() => router.refresh());

  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string | null>(null); // null = the department list
  const [openItem, setOpenItem] = useState<Joined | null>(null);
  const [openFamily, setOpenFamily] = useState<Family | null>(null);
  const [order, setOrder] = useState<Record<string, number>>({});
  const [reviewing, setReviewing] = useState(false);

  const low = useMemo(() => rows.filter(isShort), [rows]);

  const searching = q.trim().length > 0;
  const found = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return buildFamilies(
      rows.filter(
        (r) =>
          r.item.display.toLowerCase().includes(needle) ||
          r.item.sku.toLowerCase().includes(needle),
      ),
    );
  }, [rows, q]);

  const shelves = useMemo(
    () =>
      GROUPS.map((g) => ({
        key: g.key,
        families: buildFamilies(rows.filter((r) => g.cats.includes(r.item.category))),
      })).filter((s) => s.families.length > 0),
    [rows],
  );

  // A department is worth showing only if something is actually in it. Its
  // picture is borrowed from the first product inside, so the tile looks like
  // the part of the shop it stands for instead of an invented icon.
  const departments = useMemo(() => {
    const byGroup = new Map(shelves.map((s) => [s.key, s]));
    return DEPARTMENTS.map((d) => {
      const mine = d.groups.map((g) => byGroup.get(g)).filter(Boolean) as typeof shelves;
      const products = mine.reduce((n, s) => n + s.families.length, 0);
      const cover = mine.flatMap((s) => s.families).find((f) => f.imageUrl)?.imageUrl ?? null;
      // Count PRODUCTS running low, not rows. Counting rows reads as nonsense
      // next to the product count — "14 products · 41 low" — because one
      // product holds many sizes.
      const short = mine
        .flatMap((s) => s.families)
        .filter((f) => f.items.some((i) => isShort(i.row))).length;
      return { key: d.key, shelves: mine, products, cover, short };
    }).filter((d) => d.products > 0);
  }, [shelves]);

  const lowFamilies = useMemo(() => buildFamilies(low), [low]);

  const orderCount = Object.keys(order).length;
  const addRow = (r: Joined, qty = shortfall(r)) =>
    setOrder((o) => ({ ...o, [r.catalog_id]: qty }));
  const dropRow = (catalogId: string) =>
    setOrder((o) => {
      const next = { ...o };
      delete next[catalogId];
      return next;
    });

  // A card with one size adds straight to the order. A card with several has
  // to ask which — guessing a size on someone's behalf is how the wrong anchor
  // ends up on the truck.
  const onCardAdd = (f: Family) => {
    if (f.items.length === 1) addRow(f.items[0].row);
    else setOpenFamily(f);
  };
  const onCardOpen = (f: Family) => {
    if (f.items.length === 1) setOpenItem(f.items[0].row);
    else setOpenFamily(f);
  };
  const familyInOrder = (f: Family) =>
    f.items.filter((i) => order[i.row.catalog_id] != null).length;

  return (
    <div className="pb-32">
      <div className="mx-auto max-w-3xl px-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t(lang, "invSearch")}
          className="mt-4 min-h-[52px] w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 text-[16px] text-neutral-100 outline-none focus:border-amber-500"
        />
      </div>

      {searching ? (
        <div className="mx-auto max-w-3xl px-4">
          {found.length === 0 ? (
            <p className="px-4 py-10 text-center text-[15px] text-neutral-500">
              {t(lang, "invNone")}
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {found.map((f) => (
                <Card
                  key={f.key}
                  f={f}
                  lang={lang}
                  inOrder={familyInOrder(f)}
                  onOpen={() => onCardOpen(f)}
                  onAdd={() => onCardAdd(f)}
                  grid
                />
              ))}
            </div>
          )}
        </div>
      ) : dept === null ? (
        /* ── the department list: where in the shop are you standing? ── */
        <div className="mx-auto max-w-3xl px-4">
          {lowFamilies.length > 0 && (
            <button
              onClick={() => setDept("low")}
              className="mt-4 flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-red-900/60 bg-red-950/30 px-4 text-left active:bg-red-950/50"
            >
              <span className="flex-1 text-[17px] font-bold text-red-300">
                {t(lang, "invg_low")}
              </span>
              <span className="text-[20px] font-bold text-red-400">{low.length}</span>
              <span className="text-[20px] text-red-500">›</span>
            </button>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3">
            {departments.map((d) => (
              <button
                key={d.key}
                onClick={() => setDept(d.key)}
                className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 text-left active:bg-neutral-800"
              >
                <div className="grid aspect-[4/3] w-full place-items-center overflow-hidden bg-white">
                  {d.cover ? (
                    <Image src={d.cover} alt="" width={400} height={300}
                      className="h-full w-full object-contain p-3" unoptimized />
                  ) : null}
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[16px] font-semibold leading-snug text-neutral-100">
                    {t(lang, d.key)}
                  </p>
                  <p className="mt-0.5 text-[13px] text-neutral-500">
                    {t(lang, "invNProducts", { n: d.products })}
                    {d.short > 0 && (
                      <span className="ml-1 font-semibold text-red-400">
                        · {d.short} {t(lang, "invLow")}
                      </span>
                    )}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : dept === "low" ? (
        <>
          <DeptHeader lang={lang} title={t(lang, "invg_low")} onBack={() => setDept(null)} />
          <Shelf
            title={t(lang, "invg_low")}
            tone="low"
            lang={lang}
            families={lowFamilies}
            inOrderOf={familyInOrder}
            onOpen={onCardOpen}
            onAdd={onCardAdd}
            action={{
              label: t(lang, "invOrderAllLow"),
              onClick: () =>
                setOrder((o) => {
                  const next = { ...o };
                  for (const r of low) next[r.catalog_id] = shortfall(r);
                  return next;
                }),
            }}
          />
        </>
      ) : (
        <>
          <DeptHeader lang={lang} title={t(lang, dept)} onBack={() => setDept(null)} />
          {(departments.find((d) => d.key === dept)?.shelves ?? []).map((s) => (
            <Shelf
              key={s.key}
              title={t(lang, `invg_${s.key}`)}
              lang={lang}
              families={s.families}
              inOrderOf={familyInOrder}
              onOpen={onCardOpen}
              onAdd={onCardAdd}
            />
          ))}
        </>
      )}

      {/* ── the order bar: always the same place, always says how many ── */}
      {orderCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-800 bg-neutral-950/95 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <button
            onClick={() => setReviewing(true)}
            className="mx-auto flex min-h-[60px] w-full max-w-3xl items-center justify-center gap-2 rounded-2xl bg-amber-500 text-[19px] font-bold text-black active:bg-amber-400"
          >
            {orderCount === 1
              ? t(lang, "invOrderOne")
              : t(lang, "invOrderMany", { n: orderCount })}
          </button>
        </div>
      )}

      {openFamily && (
        <FamilySheet
          f={openFamily}
          lang={lang}
          order={order}
          onAdd={addRow}
          onRemove={dropRow}
          onCount={(r) => { setOpenFamily(null); setOpenItem(r); }}
          onClose={() => setOpenFamily(null)}
        />
      )}

      {openItem && (
        <ItemSheet
          r={openItem}
          lang={lang}
          canEdit={canEdit}
          inOrder={order[openItem.catalog_id] ?? null}
          onAdd={(qty) => { addRow(openItem, qty); setOpenItem(null); }}
          onRemove={() => { dropRow(openItem.catalog_id); setOpenItem(null); }}
          onClose={() => setOpenItem(null)}
          refresh={refresh}
        />
      )}

      {reviewing && (
        <OrderSheet
          lang={lang}
          rows={rows}
          order={order}
          setOrder={setOrder}
          onRemove={dropRow}
          onClose={() => setReviewing(false)}
          onSent={() => { setOrder({}); setReviewing(false); }}
        />
      )}
    </div>
  );
}

/* ── where you are, and the way back out ── */

function DeptHeader({
  title, onBack, lang,
}: {
  title: string;
  onBack: () => void;
  lang: string;
}) {
  return (
    <div className="mx-auto mt-4 flex max-w-3xl items-center gap-3 px-4">
      <button
        onClick={onBack}
        className="flex min-h-[44px] items-center gap-1 rounded-xl border border-neutral-700 px-3 text-[15px] text-neutral-300 active:bg-neutral-800"
      >
        ‹ {t(lang, "invAllDepts")}
      </button>
      <h1 className="flex-1 truncate text-[22px] font-display font-bold">{title}</h1>
    </div>
  );
}

/* ───────────────────────── the swipeable row ───────────────────────── */

function Shelf({
  title, families, lang, inOrderOf, onOpen, onAdd, tone, action,
}: {
  title: string;
  families: Family[];
  lang: string;
  inOrderOf: (f: Family) => number;
  onOpen: (f: Family) => void;
  onAdd: (f: Family) => void;
  tone?: "low";
  action?: { label: string; onClick: () => void };
}) {
  return (
    <section className="mt-7">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4">
        <h2
          className={`flex-1 text-[19px] font-display font-bold ${
            tone === "low" ? "text-red-400" : "text-neutral-100"
          }`}
        >
          {title}
          <span className="ml-2 text-[15px] font-normal text-neutral-500">{families.length}</span>
        </h2>
        {action && (
          <button
            onClick={action.onClick}
            className="rounded-full border border-amber-500/50 px-3 py-1.5 text-[14px] font-semibold text-amber-400 active:bg-amber-500/10"
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Horizontal and snapping. scroll-pl-4 matters: a mandatory snap
          container aligns the first card to its own start edge, which
          swallows the left padding and clips the card against the screen —
          scroll-padding is what makes the snap respect it. */}
      <div className="mx-auto mt-3 flex max-w-3xl snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {families.map((f) => (
          <Card
            key={f.key}
            f={f}
            lang={lang}
            inOrder={inOrderOf(f)}
            onOpen={() => onOpen(f)}
            onAdd={() => onAdd(f)}
          />
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── the card ─────────────────────────
   Picture on top, centred and as big as the card. Name under it, then the
   count. Nothing else — a card that tries to say six things says none of
   them at a glance. */

function Card({
  f, lang, inOrder, onOpen, onAdd, grid,
}: {
  f: Family;
  lang: string;
  inOrder: number;
  onOpen: () => void;
  onAdd: () => void;
  grid?: boolean;
}) {
  const many = f.items.length > 1;
  const shortCount = f.items.filter((i) => isShort(i.row)).length;
  const single = f.items[0].row;

  return (
    <div className={`relative ${grid ? "w-full" : "w-[168px] shrink-0 snap-start"}`}>
      <button onClick={onOpen} className="w-full text-left">
        {/* White tile: these are product photos shot on white, so a white
            ground and object-contain shows the whole item instead of cropping
            into it the way a cover crop would. */}
        <div
          className={`grid aspect-square w-full place-items-center overflow-hidden rounded-2xl border bg-white ${
            shortCount > 0 ? "border-red-500/60" : "border-neutral-800"
          }`}
        >
          {f.imageUrl ? (
            <Image
              src={f.imageUrl}
              alt={f.name}
              width={336}
              height={336}
              className="h-full w-full object-contain p-2"
              unoptimized
            />
          ) : (
            <span className="px-2 text-center text-[13px] leading-tight text-neutral-400">
              {t(lang, "invAddPhoto")}
            </span>
          )}
        </div>

        <p className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-neutral-100">
          {f.name}
        </p>
        <p
          className={`mt-0.5 text-[13px] ${
            shortCount > 0 && !many ? "font-semibold text-red-400" : "text-neutral-500"
          }`}
        >
          {many
            ? t(lang, "invNSizes", { n: f.items.length })
            : isShort(single)
              ? t(lang, "invBuyN", { n: shortfall(single) })
              : t(lang, "invHaveN", { n: Number(single.on_hand) })}
        </p>
      </button>

      {/* One tap to order. Sits on the picture so the thumb never has to find
          a different control on a different card. */}
      <button
        onClick={onAdd}
        aria-label={t(lang, "invAddToOrder")}
        className={`absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-[20px] font-bold shadow-lg transition ${
          inOrder > 0 ? "bg-green-500 text-black" : "bg-black/70 text-white active:bg-black"
        }`}
      >
        {inOrder > 0 ? (many ? inOrder : "✓") : "+"}
      </button>
    </div>
  );
}

/* ───────────── one product, its sizes ───────────── */

function FamilySheet({
  f, lang, order, onAdd, onRemove, onCount, onClose,
}: {
  f: Family;
  lang: string;
  order: Record<string, number>;
  onAdd: (r: Joined, qty?: number) => void;
  onRemove: (catalogId: string) => void;
  onCount: (r: Joined) => void;
  onClose: () => void;
}) {
  return (
    <Sheet onClose={onClose}>
      <div className="mx-auto grid aspect-square w-full max-w-[220px] place-items-center overflow-hidden rounded-2xl border border-neutral-800 bg-white">
        {f.imageUrl ? (
          <Image src={f.imageUrl} alt={f.name} width={440} height={440}
            className="h-full w-full object-contain p-3" unoptimized />
        ) : (
          <span className="text-[15px] text-neutral-400">{t(lang, "invAddPhoto")}</span>
        )}
      </div>

      <h3 className="mt-4 text-center text-[21px] font-display font-bold leading-tight">
        {f.name}
      </h3>
      <p className="mt-1 text-center text-[14px] text-neutral-500">
        {t(lang, "invPickSize")}
      </p>

      <div className="mt-4 divide-y divide-neutral-800">
        {f.items.map(({ row, variant }) => {
          const inOrder = order[row.catalog_id] != null;
          const short = isShort(row);
          return (
            <div key={row.id} className="flex items-center gap-3 py-1">
              <button onClick={() => onCount(row)} className="min-w-0 flex-1 py-2 text-left">
                <p className="text-[16px] font-semibold text-neutral-100">{variant}</p>
                <p className={`text-[13px] ${short ? "text-red-400" : "text-neutral-500"}`}>
                  {short
                    ? t(lang, "invBuyN", { n: shortfall(row) })
                    : t(lang, "invHaveN", { n: Number(row.on_hand) })}
                </p>
              </button>
              <button
                onClick={() => (inOrder ? onRemove(row.catalog_id) : onAdd(row))}
                aria-label={t(lang, "invAddToOrder")}
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-[20px] font-bold ${
                  inOrder ? "bg-green-500 text-black" : "border border-neutral-700 text-neutral-200"
                }`}
              >
                {inOrder ? "✓" : "+"}
              </button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

/* ───────────────────── one size, opened ───────────────────── */

function ItemSheet({
  r, lang, canEdit, inOrder, onAdd, onRemove, onClose, refresh,
}: {
  r: Joined;
  lang: string;
  canEdit: boolean;
  inOrder: number | null;
  onAdd: (qty: number) => void;
  onRemove: () => void;
  onClose: () => void;
  refresh: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState(inOrder ?? shortfall(r));
  const [onHand, setOnHand] = useState(Number(r.on_hand));

  async function setStock(next: number) {
    if (next < 0) return;
    setOnHand(next);
    setBusy(true);
    try {
      await fetch("/shop/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "inv_set", id: r.id, onHand: next }),
      });
      refresh();
    } finally {
      setBusy(false);
    }
  }

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
      if (res.ok) { refresh(); onClose(); }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="mx-auto grid aspect-square w-full max-w-[260px] place-items-center overflow-hidden rounded-2xl border border-neutral-800 bg-white">
        {r.imageUrl ? (
          <Image src={r.imageUrl} alt={r.item.display} width={520} height={520}
            className="h-full w-full object-contain p-3" unoptimized />
        ) : (
          <span className="text-[15px] text-neutral-400">{t(lang, "invAddPhoto")}</span>
        )}
      </div>

      <h3 className="mt-4 text-center text-[21px] font-display font-bold leading-tight">
        {r.item.display}
      </h3>
      <p className="mt-1 text-center text-[14px] text-neutral-500">
        {t(lang, "invHaveN", { n: onHand })}
        {r.min_qty != null && ` · ${t(lang, "invMin")} ${r.min_qty}`}
        {r.buy?.pack_qty ? ` · ${r.buy.pack_qty}/pack` : ""}
      </p>

      {/* how many to order */}
      <div className="mt-5 flex items-center justify-center gap-4">
        <button onClick={() => setQty((n) => Math.max(1, n - 1))}
          className="h-14 w-14 rounded-2xl border border-neutral-700 text-[24px] text-neutral-200">−</button>
        <span className="w-16 text-center text-[30px] font-bold tabular-nums">{qty}</span>
        <button onClick={() => setQty((n) => Math.min(9999, n + 1))}
          className="h-14 w-14 rounded-2xl border border-neutral-700 text-[24px] text-neutral-200">+</button>
      </div>

      <button
        onClick={() => onAdd(qty)}
        className="mt-4 min-h-[60px] w-full rounded-2xl bg-amber-500 text-[18px] font-bold text-black active:bg-amber-400"
      >
        {inOrder != null ? t(lang, "invUpdateOrder") : t(lang, "invAddToOrder")}
      </button>
      {inOrder != null && (
        <button onClick={onRemove}
          className="mt-2 min-h-[48px] w-full rounded-2xl text-[15px] font-semibold text-neutral-400">
          {t(lang, "invRemove")}
        </button>
      )}

      {/* everything that is not ordering, kept out of the way */}
      <div className="mt-6 space-y-2 border-t border-neutral-800 pt-4">
        {canEdit && (
          <div className="flex items-center gap-3">
            <span className="flex-1 text-[15px] text-neutral-400">{t(lang, "invCount")}</span>
            <button onClick={() => setStock(onHand - 1)} disabled={busy}
              className="h-11 w-11 rounded-lg border border-neutral-700 text-[19px] text-neutral-300 disabled:opacity-40">−</button>
            <span className="w-10 text-center text-[17px] font-bold tabular-nums">{onHand}</span>
            <button onClick={() => setStock(onHand + 1)} disabled={busy}
              className="h-11 w-11 rounded-lg border border-neutral-700 text-[19px] text-neutral-300 disabled:opacity-40">+</button>
          </div>
        )}
        <label className="flex min-h-[48px] cursor-pointer items-center text-[15px] text-neutral-400">
          <span className="flex-1">{uploading ? "…" : t(lang, "invTakePhoto")}</span>
          <span className="text-[19px]">📷</span>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={onFile} disabled={uploading} className="hidden" />
        </label>
        {r.buy?.url && (
          <a href={r.buy.url} target="_blank" rel="noopener noreferrer"
            className="flex min-h-[48px] items-center text-[15px] text-neutral-400">
            <span className="flex-1">{r.buy.supplier}</span>
            <span className="text-amber-400">↗</span>
          </a>
        )}
      </div>
    </Sheet>
  );
}

/* ───────────────────── the order, before it is sent ───────────────────── */

function OrderSheet({
  lang, rows, order, setOrder, onRemove, onClose, onSent,
}: {
  lang: string;
  rows: Joined[];
  order: Record<string, number>;
  setOrder: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onRemove: (catalogId: string) => void;
  onClose: () => void;
  onSent: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const byCatalog = useMemo(() => new Map(rows.map((r) => [r.catalog_id, r])), [rows]);
  const lines = Object.entries(order)
    .map(([catalogId, qty]) => ({ r: byCatalog.get(catalogId), qty, catalogId }))
    .filter((l) => l.r);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/shop/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({ catalogId: l.catalogId, qty: l.qty })),
        }),
      });
      if (!res.ok) {
        setError(t(lang, "invOrderFailed"));
        return;
      }
      setDone(true);
      setTimeout(onSent, 1400);
    } catch {
      setError(t(lang, "invOrderFailed"));
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <Sheet onClose={onSent}>
        <div className="py-10 text-center">
          <p className="text-[46px]">✅</p>
          <p className="mt-3 text-[20px] font-display font-bold">{t(lang, "invOrderSent")}</p>
          <p className="mt-1 text-[15px] text-neutral-500">{t(lang, "invOrderSentHint")}</p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose}>
      <h3 className="text-[21px] font-display font-bold">{t(lang, "invOrderTitle")}</h3>
      <p className="mt-1 text-[14px] text-neutral-500">{t(lang, "invOrderHint")}</p>

      <div className="mt-4 divide-y divide-neutral-800">
        {lines.map(({ r, qty, catalogId }) => (
          <div key={catalogId} className="flex items-center gap-3 py-2.5">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-neutral-800 bg-white">
              {r!.imageUrl ? (
                <Image src={r!.imageUrl} alt="" width={112} height={112}
                  className="h-full w-full object-contain p-1" unoptimized />
              ) : null}
            </div>
            <p className="min-w-0 flex-1 text-[15px] leading-snug">{r!.item.display}</p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() =>
                  setOrder((o) => ({ ...o, [catalogId]: Math.max(1, (o[catalogId] ?? 1) - 1) }))
                }
                className="h-11 w-10 rounded-lg border border-neutral-700 text-[19px] text-neutral-300">−</button>
              <span className="w-8 text-center text-[17px] font-bold tabular-nums">{qty}</span>
              <button
                onClick={() =>
                  setOrder((o) => ({ ...o, [catalogId]: Math.min(9999, (o[catalogId] ?? 1) + 1) }))
                }
                className="h-11 w-10 rounded-lg border border-neutral-700 text-[19px] text-neutral-300">+</button>
            </div>
            <button onClick={() => onRemove(catalogId)}
              className="h-11 w-9 shrink-0 text-[17px] text-neutral-600">✕</button>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-950/40 px-3 py-2 text-center text-[15px] text-red-300">
          {error}
        </p>
      )}

      <button
        onClick={send}
        disabled={sending || lines.length === 0}
        className="mt-5 min-h-[60px] w-full rounded-2xl bg-amber-500 text-[19px] font-bold text-black disabled:opacity-50 active:bg-amber-400"
      >
        {sending ? "…" : t(lang, "invSendOrder")}
      </button>
    </Sheet>
  );
}

/* ───────────────────── bottom sheet shell ───────────────────── */

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button aria-label="close" onClick={onClose} className="absolute inset-0 bg-black/70" />
      <div className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-neutral-800 bg-neutral-950 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 sm:rounded-3xl sm:border">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-700 sm:hidden" />
        {children}
      </div>
    </div>
  );
}
