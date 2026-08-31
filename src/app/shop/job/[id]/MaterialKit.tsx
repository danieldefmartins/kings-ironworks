"use client";

// Add a material by naming what it IS on this job, not by recalling the
// catalog. A spiral offers a centre column and treads; it never offers a
// gate latch. Pick the role, confirm what it is made of (the usual answer is
// already chosen), set a quantity, add.

import { useState } from "react";
import { materialKitFor, type MaterialRole } from "@/lib/shop/material-kits";
import { t } from "@/lib/shop/i18n";

export default function MaterialKit({
  projectType,
  lang,
  busy,
  onAdd,
}: {
  projectType: string | null;
  lang: string;
  busy: boolean;
  onAdd: (profile: string, size: string, qty: string) => void;
}) {
  const roles = materialKitFor(projectType);
  const [role, setRole] = useState<MaterialRole | null>(null);
  const [option, setOption] = useState("");
  const [qty, setQty] = useState("");
  const [custom, setCustom] = useState(false);

  function choose(r: MaterialRole) {
    setRole(r);
    setOption(r.typical || r.options[0] || "");
    setQty("");
    setCustom(false);
  }

  function add() {
    const desc = option.trim();
    if (!desc || !role) return;
    // Lands in the same cut list the old adder writes to: the role is the
    // profile the shop reasons about, the option is its size.
    onAdd(role.label, desc, qty.trim() || "1");
    setRole(null);
    setOption("");
    setQty("");
  }

  if (!role) {
    return (
      <div>
        <p className="mb-2 text-[13px] text-neutral-500">
          {t(lang, "kitHint")}
        </p>
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <button
              key={r.key}
              onClick={() => choose(r)}
              className="min-h-[48px] rounded-xl border border-neutral-700 bg-neutral-800 px-4 text-[15px] font-semibold text-neutral-100 active:scale-95"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-700/50 bg-neutral-950 p-3">
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setRole(null)}
          className="h-9 rounded-lg border border-neutral-700 px-3 text-sm text-neutral-300"
        >
          ‹
        </button>
        <span className="flex-1 text-[17px] font-bold text-amber-400">{role.label}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {role.options.map((o) => (
          <button
            key={o}
            onClick={() => { setOption(o); setCustom(false); }}
            className={`min-h-[44px] rounded-xl border px-3 text-[15px] ${
              option === o && !custom
                ? "border-amber-500 bg-amber-500 font-bold text-black"
                : "border-neutral-700 bg-neutral-900 text-neutral-200"
            }`}
          >
            {o}
          </button>
        ))}
        <button
          onClick={() => { setCustom(true); setOption(""); }}
          className={`min-h-[44px] rounded-xl border px-3 text-[15px] ${
            custom ? "border-amber-500 bg-amber-500 font-bold text-black" : "border-neutral-700 bg-neutral-900 text-neutral-400"
          }`}
        >
          {t(lang, "kitOther")}
        </button>
      </div>

      {custom && (
        <input
          value={option}
          onChange={(e) => setOption(e.target.value)}
          placeholder={t(lang, "kitOtherPlaceholder")}
          className="mt-2 min-h-[48px] w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-[15px] text-neutral-100 outline-none focus:border-amber-500"
        />
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          inputMode="decimal"
          placeholder={`${t(lang, "qty")}${role.unit ? ` (${role.unit})` : ""}`}
          className="min-h-[52px] w-32 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-[15px] text-neutral-100 outline-none focus:border-amber-500"
        />
        <button
          onClick={add}
          disabled={busy || !option.trim()}
          className="min-h-[52px] flex-1 rounded-xl bg-amber-500 text-[16px] font-bold text-black disabled:opacity-40"
        >
          + {t(lang, "addMaterial")}
        </button>
      </div>
    </div>
  );
}
