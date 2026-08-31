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
// Nothing typed ever becomes a job line. "Not in the list" raises a request
// for the office, so four spellings of one profile never reach inventory.

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
  onRequest,
}: {
  projectType: string | null;
  catalog: CatalogItem[];
  lang: string;
  busy: boolean;
  onAdd: (item: CatalogItem, role: MaterialRole) => void;
  onRequest: (description: string, role: MaterialRole) => void;
}) {
  const roles = materialKitFor(projectType);
  const [role, setRole] = useState<MaterialRole | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [text, setText] = useState("");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  // What the catalog stocks for this role. A role with nothing tagged falls
  // back to the whole catalog rather than showing an empty screen.
  function itemsFor(r: MaterialRole): CatalogItem[] {
    const tagged = catalog.filter((c) => c.role_keys?.includes(r.key));
    return tagged.length ? tagged : catalog;
  }

  function categoriesFor(r: MaterialRole): string[] {
    return [...new Set(itemsFor(r).map((c) => c.category))];
  }

  function reset() {
    setRole(null);
    setCategory(null);
    setAsking(false);
    setText("");
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
          onClick={() => (category && cats.length > 1 ? setCategory(null) : reset())}
          className="h-9 rounded-lg border border-neutral-700 px-3 text-sm text-neutral-300"
        >
          ‹
        </button>
        <span className="flex-1 truncate text-[16px] font-bold text-amber-400">
          {role.label}
          {category ? ` · ${categoryLabel(category)}` : ""}
        </span>
      </div>

      {/* ── step 2: which profile? ── */}
      {!category && !asking && (
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
            onClick={() => setAsking(true)}
            className="flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 px-2 text-neutral-500 active:scale-95"
          >
            <span className="text-2xl leading-none">?</span>
            <span className="text-center text-[13px] leading-tight">{t(lang, "kitOther")}</span>
          </button>
        </div>
      )}

      {/* ── step 3: which size? tapping one adds it ── */}
      {category && !asking && (
        <div className="space-y-2">
          {items.filter((c) => c.category === category).map((c) => (
            <button
              key={c.id}
              onClick={() => commit(c, role)}
              disabled={busy}
              className="flex w-full items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-left active:scale-[0.99] disabled:opacity-50"
            >
              <ProfileIcon category={c.category} className="h-7 w-7 shrink-0 text-amber-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold text-neutral-100">{c.display}</span>
                <span className="block truncate text-[12px] text-neutral-500">
                  {[
                    c.spec,
                    c.grade,
                    c.stock_length_ft ? `${c.stock_length_ft} ft stock` : null,
                    c.weight_per_ft ? `${c.weight_per_ft} lb/ft` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="shrink-0 text-[22px] font-bold text-amber-500">+</span>
            </button>
          ))}
          <button
            onClick={() => setAsking(true)}
            className="min-h-[48px] w-full rounded-xl border border-neutral-800 text-[15px] text-neutral-500"
          >
            {t(lang, "kitOther")}
          </button>
        </div>
      )}

      {/* not in the catalog — a request, never a job line */}
      {asking && (
        <div className="rounded-xl border border-sky-800 bg-sky-950/30 p-3">
          <p className="mb-2 text-[13px] text-sky-300">{t(lang, "kitRequestHint")}</p>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t(lang, "kitOtherPlaceholder")}
            className="min-h-[48px] w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-[15px] text-neutral-100 outline-none focus:border-sky-500"
          />
          <button
            onClick={() => {
              onRequest(text.trim(), role);
              const msg = t(lang, "kitRequestSent");
              reset();
              setJustAdded(msg);
              setTimeout(() => setJustAdded(null), 2600);
            }}
            disabled={busy || !text.trim()}
            className="mt-2 min-h-[48px] w-full rounded-xl border border-sky-600 text-[15px] font-bold text-sky-300 disabled:opacity-40"
          >
            {t(lang, "kitRequestSend")}
          </button>
        </div>
      )}
    </div>
  );
}
