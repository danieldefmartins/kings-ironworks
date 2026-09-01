"use client";

// Add steel in three taps, and the third tap IS the save.
//
//   Posts  →  Square tube  →  1-1/2" sq tube (11ga)   ← added, done
//
// Daniel: "click on post, click on the type of post, click on size, after you
// click on all phases it already added it to the project, you don't even need
// to click save. If you go all the way it's saved, you can always delete and
// edit."
//
// Two things follow. There is no Add button and no quantity field in the flow
// — a line defaults to 1 and quantity is edited in the list afterwards, where
// you can see what you already have. And every step draws the cross-section,
// because a fabricator recognises a shape faster than a designation.
//
// Nothing is ever typed. With 400+ real SKUs in the catalog, "not in the list"
// almost always means "listed under a different part", so the escape hatch is
// a SEARCH ACROSS EVERYTHING rather than a request queue — a queue would just
// be work for somebody to clear, and the point is to need fewer people, not
// more. Large families (121 beams) gain a size step so nothing is a long list.

import { useState } from "react";
import { materialKitFor, type MaterialRole } from "@/lib/shop/material-kits";
import type { CatalogItem } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";
import ProfileIcon, { categoryLabel } from "./ProfileIcon";

export default function MaterialKit({
  projectType,
  catalog,
  lang,
  busy,
  onAdd,
}: {
  projectType: string | null;
  catalog: CatalogItem[];
  lang: string;
  busy: boolean;
  onAdd: (item: CatalogItem, role: MaterialRole) => void;
}) {
  const roles = materialKitFor(projectType);
  const [role, setRole] = useState<MaterialRole | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  // A family of 121 beams cannot be a list you scroll. When one is large and
  // its members differ by a nominal size, insert a size step: W12, then the
  // weights within it. Small families skip straight to the item.
  const SIZE_STEP_OVER = 12;

  // What the catalog stocks for this role. A role with nothing tagged falls
  // back to the whole catalog rather than showing an empty screen.
  function itemsFor(r: MaterialRole): CatalogItem[] {
    const tagged = catalog.filter((c) => c.role_keys?.includes(r.key));
    // Steel sorts by SIZE, not alphabetically: W12x14 comes before W12x106,
    // and 1/2" before 1". A string sort puts 106 in front of 14.
    return (tagged.length ? tagged : catalog).slice().sort((a, b) =>
      (a.dim_a ?? 0) - (b.dim_a ?? 0) ||
      (a.wall ?? 0) - (b.wall ?? 0) ||
      (a.weight_per_ft ?? 0) - (b.weight_per_ft ?? 0) ||
      a.display.localeCompare(b.display)
    );
  }

  function categoriesFor(r: MaterialRole): string[] {
    return [...new Set(itemsFor(r).map((c) => c.category))];
  }

  function reset() {
    setRole(null);
    setCategory(null);
    setSize(null);
    setSearching(false);
    setQuery("");
  }

  // STEP 3 — the tap that commits.
  function commit(item: CatalogItem, r: MaterialRole) {
    onAdd(item, r);
    setJustAdded(item.display);
    reset();
    setTimeout(() => setJustAdded(null), 2600);
  }

  // ── step 1: what part of the job is it? ──────────────────────────────────
  if (!role) {
    return (
      <div>
        {justAdded && (
          <p className="mb-2 rounded-xl bg-emerald-950/50 px-3 py-2 text-[14px] font-semibold text-emerald-400">
            ✓ {justAdded}
          </p>
        )}
        <p className="mb-2 text-[13px] text-neutral-500">{t(lang, "kitHint")}</p>
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <button
              key={r.key}
              onClick={() => {
                const cats = categoriesFor(r);
                setRole(r);
                // Only one profile makes this part? Skip the middle step.
                setCategory(cats.length === 1 ? cats[0] : null);
              }}
              className="min-h-[48px] rounded-xl border border-neutral-700 bg-neutral-800 px-4 text-[15px] font-semibold text-neutral-100 active:scale-95"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const items = itemsFor(role);
  const cats = categoriesFor(role);

  return (
    <div className="rounded-2xl border border-amber-700/50 bg-neutral-950 p-3">
      {/* breadcrumb: where you are, and the way back */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => {
            if (searching) { setSearching(false); setQuery(""); }
            else if (size != null) setSize(null);
            else if (category && cats.length > 1) setCategory(null);
            else reset();
          }}
          className="h-9 rounded-lg border border-neutral-700 px-3 text-sm text-neutral-300"
        >
          ‹
        </button>
        <span className="flex-1 truncate text-[16px] font-bold text-amber-400">
          {searching ? t(lang, "kitSearchAll") : role.label}
          {!searching && category ? ` · ${categoryLabel(category)}` : ""}
          {!searching && size != null ? ` · ${sizeLabel(category!, size)}` : ""}
        </span>
      </div>

      {/* search across the WHOLE catalog — the usual reason something looks
          missing is that it lives under another part */}
      {searching && (
        <div>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(lang, "kitSearchPlaceholder")}
            className="mb-2 min-h-[52px] w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-[16px] text-neutral-100 outline-none focus:border-amber-500"
          />
          <div className="space-y-2">
            {(query.trim().length < 2
              ? []
              : catalog
                  .filter((c) => {
                    const q = query.toLowerCase().replace(/["\s]/g, "");
                    return (
                      c.display.toLowerCase().replace(/["\s]/g, "").includes(q) ||
                      c.spec.toLowerCase().replace(/["\s]/g, "").includes(q) ||
                      c.sku.toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 25)
            ).map((c) => (
              <ItemRow key={c.id} c={c} busy={busy} onPick={() => commit(c, role)} />
            ))}
            {query.trim().length >= 2 && (
              <p className="px-1 pt-1 text-[13px] text-neutral-600">{t(lang, "kitSearchNote")}</p>
            )}
          </div>
        </div>
      )}

      {/* ── step 2: which profile? ── */}
      {!category && !searching && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-2 text-neutral-200 active:scale-95"
            >
              <ProfileIcon category={c} className="h-8 w-8 text-amber-400" />
              <span className="text-center text-[13px] font-semibold leading-tight">{categoryLabel(c)}</span>
            </button>
          ))}
          <button
            onClick={() => setSearching(true)}
            className="flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 px-2 text-neutral-400 active:scale-95"
          >
            <span className="text-xl leading-none">⌕</span>
            <span className="text-center text-[13px] leading-tight">{t(lang, "kitSearchAll")}</span>
          </button>
        </div>
      )}

      {/* ── step 3: a size step, but only when the family is big enough to
             need one — W12 first, then the weights inside it ── */}
      {category && !searching && (() => {
        const family = items.filter((c) => c.category === category);
        const sizes = [...new Set(family.map((c) => c.dim_a).filter((v): v is number => v != null))]
          .sort((a, b) => a - b);
        const needsSizeStep = family.length > SIZE_STEP_OVER && sizes.length > 1;

        if (needsSizeStep && size == null) {
          return (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {sizes.map((sz) => (
                <button
                  key={sz}
                  onClick={() => setSize(sz)}
                  className="min-h-[56px] rounded-xl border border-neutral-700 bg-neutral-900 text-[16px] font-bold text-neutral-100 active:scale-95"
                >
                  {sizeLabel(category, sz)}
                </button>
              ))}
            </div>
          );
        }

        const shown = needsSizeStep ? family.filter((c) => c.dim_a === size) : family;
        return (
          <div className="space-y-2">
            {shown.map((c) => (
              <ItemRow key={c.id} c={c} busy={busy} onPick={() => commit(c, role)} />
            ))}
          </div>
        );
      })()}

    </div>
  );
}

// One catalog item, with the spec behind the friendly name so the shop can
// order it and the office can price it. Tapping it is the save.
function ItemRow({ c, busy, onPick }: { c: CatalogItem; busy: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      disabled={busy}
      className="flex w-full items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-left active:scale-[0.99] disabled:opacity-50"
    >
      <ProfileIcon category={c.category} className="h-7 w-7 shrink-0 text-amber-400" />
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold text-neutral-100">{c.display}</span>
        <span className="block truncate text-[12px] text-neutral-500">
          {[c.spec, c.grade,
            c.stock_length_ft ? `${c.stock_length_ft} ft stock` : null,
            c.weight_per_ft ? `${c.weight_per_ft} lb/ft` : null,
          ].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className="shrink-0 text-[22px] font-bold text-amber-500">+</span>
    </button>
  );
}

// How a nominal size reads for its family: W12, C8, 2" tube, L3.
function sizeLabel(category: string, size: number): string {
  const n = Number.isInteger(size) ? String(size) : String(size);
  if (category === "beam") return `W${n}`;
  if (category === "channel") return `C${n}`;
  if (category === "angle") return `L${n}`;
  return `${n}"`;
}
