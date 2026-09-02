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
// So: every card is a PRODUCT, not a size. Angle is one card, not 48 cards of
// the same drawing; eleven wedge anchors are one card. Tapping it opens the
// product page, where every size lives — grouped by section, with its length,
// its weight per foot and what is on the shelf.
//
// Ordering is one tap from either place. Counting stock and taking a photo
// still exist, in the sheet you reach by tapping a size, because they are not
// why anyone opens this page.

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { CatalogItem, InventoryRow, SupplierPrice } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";
import { compareSizes, productOf } from "@/lib/shop/families";

type Joined = InventoryRow & {
  item: CatalogItem;
  buy: SupplierPrice | null;
  imageUrl: string | null;
};

// One product, with every size of it that the shop carries.
interface Product {
  key: string;
  name: string;
  items: Joined[];
  imageUrl: string | null;
}

// A run of sizes that share a section — "2 × 2" under Angle, "W10" under Beam.
interface SizeGroup {
  series: string;
  items: Joined[];
}

const STEEL_IMAGE_BY_CATEGORY: Record<string, string> = {
  angle: "/images/shop/materials/angle.webp",
  channel: "/images/shop/materials/channel.webp",
  beam: "/images/shop/materials/beam.webp",
  flat_bar: "/images/shop/materials/flat-bar.webp",
  solid_round: "/images/shop/materials/solid-round.webp",
  solid_square: "/images/shop/materials/solid-square.webp",
  tube_square: "/images/shop/materials/tube.webp",
  tube_rect: "/images/shop/materials/tube.webp",
  pipe_round: "/images/shop/materials/pipe.webp",
  tube_round: "/images/shop/materials/pipe.webp",
  plate: "/images/shop/materials/plate.webp",
  grating: "/images/shop/materials/grating.webp",
};

// Steel reads better as a section sketch than as a photo of a rusty stick, so
// the drawing wins for anything we have a drawing for. Everything else — paint,
// fasteners, consumables, truck stock — falls through to its real catalog
// photo. Order matters twice over: the category map is exact and goes first,
// and inside the name fallback "solid" is tested before "round"/"square" so a
// solid bar never picks up a hollow section.
function steelCatalogImage(row: Joined): string | null {
  const direct = STEEL_IMAGE_BY_CATEGORY[row.item.category];
  if (direct) return direct;
  if (row.item.category !== "steel_stock") return row.imageUrl;
  const name = row.item.display.toLowerCase();
  const solid = name.includes("solid") || name.includes("bar stock");
  if (name.includes("diamond") || name.includes("tread")) return "/images/shop/materials/diamond-plate.webp";
  if (name.includes("rebar")) return "/images/shop/materials/rebar.webp";
  if (name.includes("molding") || name.includes("molded cap") || name.includes("scroll") || name.includes("collar")) return "/images/shop/materials/molding.webp";
  if (name.includes("grating")) return "/images/shop/materials/grating.webp";
  if (name.includes("plate")) return "/images/shop/materials/plate.webp";
  if (name.includes("angle") || name.includes("l iron")) return "/images/shop/materials/angle.webp";
  if (name.includes("channel")) return "/images/shop/materials/channel.webp";
  if (name.includes("beam") || /\bw(?:6|8|10|12|14)\b/.test(name)) return "/images/shop/materials/beam.webp";
  if (name.includes("flat")) return "/images/shop/materials/flat-bar.webp";
  if (solid && name.includes("round")) return "/images/shop/materials/solid-round.webp";
  if (solid && name.includes("square")) return "/images/shop/materials/solid-square.webp";
  if (name.includes("tube") || name.includes("hss") || name.includes("square")) return "/images/shop/materials/tube.webp";
  if (name.includes("pipe") || name.includes("round")) return "/images/shop/materials/pipe.webp";
  return row.imageUrl;
}

/** Which product a row belongs to. Paint is the one family the catalog cannot
 * describe with columns: colour, can size and spray-vs-liquid all live in the
 * name, so they are stripped here and reappear as sizes inside the product. */
function productFor(row: Joined) {
  const raw = row.item.display.trim();
  if (row.item.category === "paint" || row.item.category === "paint_spray") {
    let name = raw
      .replace(/\s*[-–]\s*(black|white|gray|grey|blue|yellow|red|green|galvanized primer)\b/gi, "")
      .replace(/\s*\((?:quart|gallon|pint|spray)\)\s*$/i, "")
      .replace(/\s+\d+(?:\.\d+)?\s*(?:oz|ounce|qt|quart|gal|gallon|l|liter)\b/gi, "")
      .replace(/\s+/g, " ").trim();
    if (/^spray paint/i.test(name)) name = "Spray paint";
    return { key: `paint:${name.toLowerCase()}`, name, series: "" };
  }
  return productOf(row.item);
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
//
// `cover` is the product whose photo fronts the department — chosen, not
// whichever row happened to sort first. Left to itself the Welding tile showed
// a can of anti-spatter and Tools showed a random hand tool. These are real
// photos of things on the shelf, not drawn icons: Daniel's standing rule is
// "don't draw anything". Each one is picked to be readable at tile size and to
// sit on a white ground like the rest — which is why Paint is a brush and not
// a can, since every paint can Home Depot photographs sits on a coloured
// backdrop that renders as a slab of colour.
const DEPARTMENTS: { key: string; groups: string[]; cover: string }[] = [
  { key: "d_steel", cover: "TRK-ANGLE-IRON-2-X-2-X-1-4-X-10", groups: ["steel", "st_angle", "st_channel", "st_beam", "st_flat", "st_bar", "st_tube", "st_pipe", "st_plate", "st_grating"] },
  { key: "d_fasteners", cover: "TRK-WEDGE-ANCHORS-1-2-X-3", groups: ["screws", "anchors", "bolts"] },
  { key: "d_abrasives", cover: "TRK-4-1-2-FLAP-DISCS-40-GRIT", groups: ["discs", "bits"] },
  { key: "d_welding", cover: "TRK-WELDING-HELMET-AUTO-DARK", groups: ["welding"] },
  { key: "d_tools", cover: "TRK-CORDLESS-DRILL-DRIVER", groups: ["tools"] },
  { key: "d_paint", cover: "TRK-PAINT-BRUSHES-3", groups: ["paint"] },
  { key: "d_safety", cover: "TRK-HARD-HAT", groups: ["safety"] },
  { key: "d_shop", cover: "TRK-WD-40", groups: ["shop"] },
  { key: "d_break", cover: "BRK-COFFEE", groups: ["breakroom", "janitorial"] },
];

const isShort = (r: Joined) => r.min_qty != null && Number(r.on_hand) < Number(r.min_qty);
// How many to buy: enough to clear the minimum, or one if we keep no minimum.
const shortfall = (r: Joined) =>
  r.min_qty != null ? Math.max(1, Math.ceil(Number(r.min_qty) - Number(r.on_hand))) : 1;

// Sizes of one product collapse into one card. Grouping is per department, so
// a product can never straddle two of them.
function buildProducts(rows: Joined[]): Product[] {
  const byKey = new Map<string, Product>();
  for (const row of rows) {
    const pr = productFor(row);
    let f = byKey.get(pr.key);
    if (!f) {
      f = { key: pr.key, name: pr.name, items: [], imageUrl: null };
      byKey.set(pr.key, f);
    }
    f.items.push(row);
    if (!f.imageUrl) f.imageUrl = steelCatalogImage(row);
  }
  for (const f of byKey.values()) f.items.sort((a, b) => compareSizes(a.item, b.item));
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Sizes inside a product page, under the section they belong to. Steel gets
// real headings off dim_a/dim_b; everything else is one flat run.
function groupSizes(p: Product): SizeGroup[] {
  const out: SizeGroup[] = [];
  const index = new Map<string, SizeGroup>();
  for (const row of p.items) {
    const series = productFor(row).series;
    let g = index.get(series);
    if (!g) {
      g = { series, items: [] };
      index.set(series, g);
      out.push(g);
    }
    g.items.push(row);
  }
  return out;
}

export default function InventoryClient({
  rows,
  allRows,
  lang,
  canEdit,
}: {
  rows: Joined[];
  allRows?: Joined[];
  lang: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());

  const [q, setQ] = useState("");
  const [view, setView] = useState<"inventory" | "order">("inventory");
  const [dept, setDept] = useState<string | null>(null); // null = the department list
  const [openKey, setOpenKey] = useState<string | null>(null); // the open product
  const [openItem, setOpenItem] = useState<Joined | null>(null);
  const [order, setOrder] = useState<Record<string, number>>({});
  const [reviewing, setReviewing] = useState(false);
  const sourceRows = view === "order" ? (allRows ?? rows) : rows;

  const low = useMemo(() => sourceRows.filter(isShort), [sourceRows]);

  const searching = q.trim().length > 0;
  const found = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return buildProducts(
      sourceRows.filter(
        (r) =>
          r.item.display.toLowerCase().includes(needle) ||
          r.item.sku.toLowerCase().includes(needle),
      ),
    );
  }, [sourceRows, q]);

  // Every department's products, built once. The GROUPS table survives only as
  // the map from a fine catalog category to the part of the shop it lives in —
  // the shelf headings it used to carry are gone, because with one card per
  // product a heading over a single card is furniture, not navigation.
  const departments = useMemo(() => {
    const deptOfCat = new Map<string, string>();
    for (const d of DEPARTMENTS) {
      for (const gk of d.groups) {
        const g = GROUPS.find((x) => x.key === gk);
        for (const c of g?.cats ?? []) deptOfCat.set(c, d.key);
      }
    }
    return DEPARTMENTS.map((d) => {
      const mine = sourceRows.filter((r) => deptOfCat.get(r.item.category) === d.key);
      const products = buildProducts(mine);
      const cover =
        products.flatMap((f) => f.items).find((r) => r.item.sku === d.cover) ??
        null;
      return {
        key: d.key,
        products,
        cover: cover ? steelCatalogImage(cover) : (products.find((f) => f.imageUrl)?.imageUrl ?? null),
        short: products.filter((f) => f.items.some(isShort)).length,
      };
    }).filter((d) => d.products.length > 0);
  }, [sourceRows]);

  const lowProducts = useMemo(() => buildProducts(low), [low]);

  const allProducts = useMemo(
    () => [...departments.flatMap((d) => d.products), ...lowProducts, ...found],
    [departments, lowProducts, found],
  );
  const openProduct = openKey ? allProducts.find((f) => f.key === openKey) ?? null : null;

  const orderCount = Object.keys(order).length;
  const orderUnits = Object.values(order).reduce((sum, n) => sum + n, 0);
  const addRow = (r: Joined, qty = shortfall(r)) =>
    setOrder((o) => ({ ...o, [r.catalog_id]: qty }));
  const dropRow = (catalogId: string) =>
    setOrder((o) => {
      const next = { ...o };
      delete next[catalogId];
      return next;
    });

  // A product with one size adds straight to the order. One with several has to
  // ask which — guessing a size on someone's behalf is how the wrong anchor
  // ends up on the truck.
  const openOrAdd = (f: Product) =>
    f.items.length === 1 ? setOpenItem(f.items[0]) : setOpenKey(f.key);
  const productInOrder = (f: Product) =>
    f.items.filter((r) => order[r.catalog_id] != null).length;

  const grid = (products: Product[]) => (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {products.map((f) => (
        <Card
          key={f.key}
          f={f}
          lang={lang}
          inOrder={productInOrder(f)}
          onOpen={() => openOrAdd(f)}
          onAdd={() => openOrAdd(f)}
        />
      ))}
    </div>
  );

  // The product page owns the screen while it is open: 121 beams is a page,
  // not a bottom sheet you thumb through.
  if (openProduct) {
    return (
      <>
        <ProductPage
          p={openProduct}
          lang={lang}
          view={view}
          order={order}
          onAdd={addRow}
          onRemove={dropRow}
          onCount={setOpenItem}
          onBack={() => setOpenKey(null)}
        />
        <OrderBar
          lang={lang}
          count={orderCount}
          units={orderUnits}
          onReview={() => setReviewing(true)}
        />
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
            rows={sourceRows}
            order={order}
            setOrder={setOrder}
            onRemove={dropRow}
            onClose={() => setReviewing(false)}
            onSent={() => { setOrder({}); setReviewing(false); }}
          />
        )}
      </>
    );
  }

  return (
    <div className="pb-32">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mt-4 grid grid-cols-2 rounded-xl border border-neutral-700 bg-neutral-900 p-1">
          {([['inventory', t(lang, "invInventory")], ['order', t(lang, "invOrderMaterial")]] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => { setView(key); setDept(null); }}
              className={`min-h-[44px] rounded-lg text-sm font-semibold ${view === key ? "bg-amber-500 text-black" : "text-neutral-400"}`}>
              {label}
            </button>
          ))}
        </div>
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
            grid(found)
          )}
        </div>
      ) : dept === null ? (
        /* ── the department list: where in the shop are you standing? ── */
        <div className="mx-auto max-w-3xl px-4">
          {lowProducts.length > 0 && (
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
                    {t(lang, "invNProducts", { n: d.products.length })}
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
        <div className="mx-auto max-w-3xl px-4">
          <DeptHeader lang={lang} title={t(lang, "invg_low")} onBack={() => setDept(null)} />
          <button
            onClick={() =>
              setOrder((o) => {
                const next = { ...o };
                for (const r of low) next[r.catalog_id] = shortfall(r);
                return next;
              })
            }
            className="mt-4 w-full rounded-xl border border-amber-500/50 py-3 text-[15px] font-semibold text-amber-400 active:bg-amber-500/10"
          >
            {t(lang, "invOrderAllLow")}
          </button>
          {grid(lowProducts)}
        </div>
      ) : (
        <div className="mx-auto max-w-3xl px-4">
          <DeptHeader lang={lang} title={t(lang, dept)} onBack={() => setDept(null)} />
          {grid(departments.find((d) => d.key === dept)?.products ?? [])}
        </div>
      )}

      <OrderBar lang={lang} count={orderCount} units={orderUnits} onReview={() => setReviewing(true)} />

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
          rows={sourceRows}
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

/* ── the order bar: always the same place, always says how many ── */

function OrderBar({
  lang, count, units, onReview,
}: {
  lang: string;
  count: number;
  units: number;
  onReview: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-800 bg-neutral-950/95 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <button
        onClick={onReview}
        className="mx-auto flex min-h-[60px] w-full max-w-3xl items-center justify-center gap-2 rounded-2xl bg-amber-500 text-[19px] font-bold text-black active:bg-amber-400"
      >
        {t(lang, "invReviewOrder")} · {units} {t(lang, "invItems")}
      </button>
    </div>
  );
}

/* ── where you are, and the way back out ── */

function DeptHeader({
  title, onBack, lang, back,
}: {
  title: string;
  onBack: () => void;
  lang: string;
  back?: string;
}) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        onClick={onBack}
        className="flex min-h-[44px] items-center gap-1 rounded-xl border border-neutral-700 px-3 text-[15px] text-neutral-300 active:bg-neutral-800"
      >
        ‹ {back ?? t(lang, "invAllDepts")}
      </button>
      <h1 className="min-w-0 flex-1 truncate text-[22px] font-display font-bold">{title}</h1>
    </div>
  );
}

/* ───────────────────────── the card ─────────────────────────
   Picture on top, centred and as big as the card. Name under it, then the
   count. Nothing else — a card that tries to say six things says none of
   them at a glance. */

function Card({
  f, lang, inOrder, onOpen, onAdd,
}: {
  f: Product;
  lang: string;
  inOrder: number;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const many = f.items.length > 1;
  const shortCount = f.items.filter(isShort).length;
  const single = f.items[0];

  return (
    <div className="relative w-full">
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

/* ───────────── one product, all of its sizes ─────────────
   The page Daniel asked for: "a product page for example Angle and inside this
   product page all the sizes and length." One picture at the top instead of
   forty-eight copies of it down a list, then every size the shop can get,
   under the section it belongs to, carrying the two numbers that decide which
   stick you pull — the length it comes in and what it weighs per foot. */

function ProductPage({
  p, lang, view, order, onAdd, onRemove, onCount, onBack,
}: {
  p: Product;
  lang: string;
  view: "inventory" | "order";
  order: Record<string, number>;
  onAdd: (r: Joined, qty?: number) => void;
  onRemove: (catalogId: string) => void;
  onCount: (r: Joined) => void;
  onBack: () => void;
}) {
  const [q, setQ] = useState("");

  const needle = q.trim().toLowerCase();
  const groups = useMemo(() => {
    const all = groupSizes(p);
    if (!needle) return all;
    return all
      .map((g) => ({ ...g, items: g.items.filter((r) => r.item.display.toLowerCase().includes(needle) || r.item.sku.toLowerCase().includes(needle)) }))
      .filter((g) => g.items.length > 0);
  }, [p, needle]);

  // Facts worth stating once at the top rather than on every row: they are the
  // same for the whole product far more often than not.
  const grades = new Set(p.items.map((r) => r.item.grade).filter(Boolean));
  const lengths = new Set(p.items.map((r) => r.item.stock_length_ft).filter((v) => v != null));
  const meta = [
    t(lang, "invNSizes", { n: p.items.length }),
    grades.size === 1 ? [...grades][0] : null,
    lengths.size === 1 ? t(lang, "invStockLength", { n: String([...lengths][0]) }) : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="pb-32">
      <div className="mx-auto max-w-3xl px-4">
        <DeptHeader lang={lang} title={p.name} onBack={onBack} back={t(lang, "invBack")} />

        <div className="mt-4 flex items-center gap-4">
          <div className="grid aspect-square w-[124px] shrink-0 place-items-center overflow-hidden rounded-2xl border border-neutral-800 bg-white">
            {p.imageUrl ? (
              <Image src={p.imageUrl} alt={p.name} width={248} height={248}
                className="h-full w-full object-contain p-2" unoptimized />
            ) : (
              <span className="px-2 text-center text-[13px] text-neutral-400">{t(lang, "invAddPhoto")}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-[26px] font-display font-bold leading-tight">{p.name}</h1>
            <p className="mt-1 text-[14px] text-neutral-500">{meta}</p>
          </div>
        </div>

        {p.items.length > 12 && (
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t(lang, "invSearchSizes")}
            className="mt-4 min-h-[48px] w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 text-[16px] text-neutral-100 outline-none focus:border-amber-500"
          />
        )}

        {groups.length === 0 ? (
          <p className="py-10 text-center text-[15px] text-neutral-500">{t(lang, "invNone")}</p>
        ) : (
          groups.map((g) => (
            <section key={g.series || "_"} className="mt-5">
              {g.series && (
                <h2 className="sticky top-[64px] z-10 -mx-4 bg-neutral-950/95 px-4 py-2 text-[13px] font-bold uppercase tracking-wider text-amber-500 backdrop-blur">
                  {g.series}
                </h2>
              )}
              <div className="divide-y divide-neutral-800">
                {g.items.map((r) => (
                  <SizeRow
                    key={r.catalog_id}
                    r={r}
                    lang={lang}
                    view={view}
                    inOrder={order[r.catalog_id] ?? null}
                    onAdd={() => onAdd(r)}
                    onRemove={() => onRemove(r.catalog_id)}
                    onCount={() => onCount(r)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

/* One size of one product: what it is, what it comes in, what we have. */

function SizeRow({
  r, lang, view, inOrder, onAdd, onRemove, onCount,
}: {
  r: Joined;
  lang: string;
  view: "inventory" | "order";
  inOrder: number | null;
  onAdd: () => void;
  onRemove: () => void;
  onCount: () => void;
}) {
  const short = isShort(r);
  const facts = [
    r.item.stock_length_ft != null ? t(lang, "invStockLength", { n: String(r.item.stock_length_ft) }) : null,
    r.item.weight_per_ft != null ? `${r.item.weight_per_ft} ${t(lang, "invLbFt")}` : null,
    r.location || null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="flex items-center gap-3 py-1">
      <button onClick={onCount} className="min-w-0 flex-1 py-2.5 text-left">
        <p className="truncate text-[16px] font-semibold text-neutral-100">{r.item.display}</p>
        {facts && <p className="truncate text-[12.5px] text-neutral-600">{facts}</p>}
        <p className={`text-[13px] ${short ? "font-semibold text-red-400" : "text-neutral-500"}`}>
          {/* On the order tab a catalog size we have never counted is not
              "0 on hand" — we simply do not stock it, and saying zero would
              read as an emergency on every row. */}
          {short
            ? t(lang, "invBuyN", { n: shortfall(r) })
            : view === "order" && r.min_qty == null && Number(r.on_hand) === 0
              ? t(lang, "invNotStocked")
              : t(lang, "invHaveN", { n: Number(r.on_hand) })}
        </p>
      </button>
      <button
        onClick={() => (inOrder != null ? onRemove() : onAdd())}
        aria-label={t(lang, "invAddToOrder")}
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-[18px] font-bold ${
          inOrder != null ? "bg-green-500 text-black" : "border border-neutral-700 text-neutral-200"
        }`}
      >
        {inOrder != null ? inOrder : "+"}
      </button>
    </div>
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
        {steelCatalogImage(r) ? (
          <Image src={steelCatalogImage(r)!} alt={r.item.display} width={520} height={520}
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
              {steelCatalogImage(r!) ? (
                <Image src={steelCatalogImage(r!)!} alt="" width={112} height={112}
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
  useEffect(() => {
    const y = window.scrollY;
    const previous = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = previous.overflow;
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      window.scrollTo(0, y);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button aria-label="close" onClick={onClose} className="absolute inset-0 bg-black/70" />
      <div className="relative max-h-[88vh] w-full max-w-lg overscroll-contain overflow-y-auto rounded-t-3xl border-t border-neutral-800 bg-neutral-950 px-5 pb-[max(24px,env(safe-area-inset-bottom))] sm:rounded-3xl sm:border">
        <div className="sticky top-0 z-20 -mx-2 mb-2 flex h-14 items-center justify-center bg-neutral-950/95 backdrop-blur-xl">
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-20 place-items-center sm:hidden">
            <span className="h-1.5 w-11 rounded-full bg-neutral-600" />
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-1 grid h-10 w-10 place-items-center rounded-full bg-neutral-800 text-xl text-neutral-200 active:bg-neutral-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
