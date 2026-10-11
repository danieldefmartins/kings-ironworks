"use client";

// The code check on the review step. Quiet by default: one line saying which
// book and occupancy, the failures and "verify" items as tappable rows, and
// everything that passes folded away. Details (limit, citation, why) sit
// behind a tap on each row. Advisory only — it never blocks submitting.

import { useState } from "react";
import type { MeasureData, MeasureShape } from "@/lib/shop/measure";
import {
  CODE_BASES,
  CODE_OVERRIDE_KEYS,
  CODE_PROFILES,
  codeCheck,
  effectiveCodeSettings,
  type CodeResult,
  type CodeSettings,
} from "@/lib/shop/measure-code";
import { codeActualText, codeLimitText, codeRuleLabel, ct } from "@/lib/shop/measure-code-i18n";

const TONE: Record<CodeResult["level"], { dot: string; text: string; bg: string }> = {
  red: { dot: "bg-red-500", text: "text-red-300", bg: "bg-red-950/40" },
  yellow: { dot: "bg-amber-500", text: "text-amber-300", bg: "bg-amber-500/10" },
  green: { dot: "bg-emerald-500", text: "text-emerald-300", bg: "bg-emerald-500/10" },
};

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-sm text-neutral-500">{label}</div>
      <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-xl bg-neutral-800 p-1" style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 2)}, minmax(0,1fr))` }}>
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`min-h-11 rounded-lg px-2 text-sm font-semibold transition-colors ${value === v ? "bg-neutral-900 text-neutral-100 shadow-sm" : "text-neutral-500"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Row({ r, lang }: { r: CodeResult; lang: string }) {
  const [open, setOpen] = useState(false);
  const t = TONE[r.level];
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left active:bg-neutral-800"
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.dot}`} aria-hidden />
        <span className="flex-1 text-[15px] font-medium text-neutral-200">{codeRuleLabel(lang, r)}</span>
        <span className="text-right">
          <span className={`block text-lg font-semibold tabular-nums ${r.level === "green" ? "text-neutral-200" : t.text}`}>{codeActualText(lang, r)}</span>
          {r.op !== "check" && <span className="block text-xs tabular-nums text-neutral-500">{codeLimitText(r)}</span>}
        </span>
      </button>
      {open && (
        <div className={`mx-3 mb-2 rounded-xl px-3 py-3 text-sm ${t.bg}`}>
          {r.note && <div className="mb-2 text-neutral-200">{ct(lang, `code_note_${r.note}`)}</div>}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-neutral-500">{ct(lang, "measured")}</div>
              <div className="whitespace-nowrap font-semibold tabular-nums text-neutral-200">{codeActualText(lang, r)}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">{ct(lang, "limit")}</div>
              <div className="whitespace-nowrap font-semibold tabular-nums text-neutral-200">{codeLimitText(r)}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">{ct(lang, "cite")}</div>
              <div className="font-semibold text-neutral-200">{r.cite}</div>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export default function CodeCheckCard({
  lang,
  data,
  shape,
  orgDefault,
  set,
  readOnly = false,
}: {
  lang: string;
  data: MeasureData;
  shape: MeasureShape;
  orgDefault?: string | null;
  set?: (fn: (d: MeasureData) => void) => void;
  readOnly?: boolean;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const rep = codeCheck(data, shape, orgDefault);
  const s = rep.settings;
  const flags = rep.results.filter((r) => r.level !== "green").sort((a, b) => (a.level === b.level ? 0 : a.level === "red" ? -1 : 1));
  const passes = rep.results.filter((r) => r.level === "green");
  const canEdit = !!set && !readOnly;

  const update = (patch: Partial<CodeSettings>) =>
    set?.((d) => {
      const cur = effectiveCodeSettings(d, orgDefault);
      d.code = { ...cur, ...patch };
      if (d.code.profile !== "custom") {
        delete d.code.base;
        delete d.code.overrides;
      }
    });

  return (
    <div data-testid="code-check" className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center gap-3">
        <h3 className="flex-1 text-lg font-semibold text-neutral-100">{ct(lang, "codeTitle")}</h3>
        <div className="flex items-center gap-1.5" aria-label={lang === 'pt' ? "Resumo" : lang === 'es' ? "Resumen" : "summary"}>
          {(["red", "yellow", "green"] as const).map((lv) =>
            rep.counts[lv] ? (
              <span key={lv} className={`inline-flex min-w-8 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${TONE[lv].bg} ${TONE[lv].text}`}>
                {rep.counts[lv]} {ct(lang, lv === "red" ? "codeFail" : lv === "yellow" ? "codeVerify" : "codePass")}
              </span>
            ) : null
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={!canEdit}
        aria-expanded={settingsOpen}
        onClick={() => setSettingsOpen((o) => !o)}
        className="mt-1 flex min-h-11 w-full items-center gap-1 text-left text-sm text-neutral-500"
      >
        <span className="truncate">
          {ct(lang, `prof_${s.profile}`)} · {ct(lang, `occ_${rep.occupancy}`)}
        </span>
        {canEdit && <span className={`ml-1 transition-transform ${settingsOpen ? "rotate-90" : ""}`} aria-hidden>›</span>}
      </button>

      {settingsOpen && canEdit && (
        <div className="mb-3 space-y-3 rounded-2xl bg-neutral-800/50 p-3">
          <Segmented
            label={ct(lang, "codeProfile")}
            value={s.profile}
            options={CODE_PROFILES.map((p) => [p, ct(lang, `profs_${p}`)])}
            onChange={(profile) => update({ profile, ...(profile === "custom" ? { base: s.base || "ma780", overrides: s.overrides || {} } : {}) })}
          />
          {s.profile === "custom" && (
            <>
              <Segmented
                label={ct(lang, "customBase")}
                value={s.base || "ma780"}
                options={CODE_BASES.map((b) => [b, ct(lang, `profs_${b}`)])}
                onChange={(base) => update({ base })}
              />
              <div className="grid grid-cols-2 gap-2">
                {CODE_OVERRIDE_KEYS.map((k) => (
                  <label key={k} className="block">
                    <span className="mb-1 block text-xs text-neutral-500">{ct(lang, `ov_${k}`)}</span>
                    <input
                      data-m="1"
                      inputMode="decimal"
                      value={s.overrides?.[k] || ""}
                      placeholder={String(+rep.limits[k].toFixed(3))}
                      onChange={(e) => update({ overrides: { ...(s.overrides || {}), [k]: e.target.value } })}
                      className="min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-base tabular-nums"
                    />
                  </label>
                ))}
              </div>
            </>
          )}
          <Segmented
            label={ct(lang, "occupancy")}
            value={rep.occupancy}
            options={[["residential", ct(lang, "occ_residential")], ["commercial", ct(lang, "occ_commercial")]]}
            onChange={(occupancy) => update({ occupancy })}
          />
          <p className="text-xs text-neutral-500">{ct(lang, "codeAdvisory")}</p>
        </div>
      )}

      {rep.results.length === 0 ? (
        <p className="py-2 text-sm text-neutral-500">{ct(lang, "codeNothing")}</p>
      ) : (
        <>
          {flags.length > 0 ? (
            <ul className="-mx-3">{flags.map((r, i) => <Row key={`${r.rule}${r.detail || ""}${i}`} r={r} lang={lang} />)}</ul>
          ) : (
            <div className="flex min-h-12 items-center gap-2 text-[15px] font-medium text-emerald-300">
              <span aria-hidden>✓</span> {ct(lang, "codeAllPass")}
            </div>
          )}
          {passes.length > 0 && (
            <>
              <button
                type="button"
                aria-expanded={allOpen}
                onClick={() => setAllOpen((o) => !o)}
                className="flex min-h-11 w-full items-center gap-1 text-sm font-semibold text-neutral-500"
              >
                <span className={`transition-transform ${allOpen ? "rotate-90" : ""}`} aria-hidden>›</span>
                {ct(lang, "codeShowAll")} ({passes.length})
              </button>
              {allOpen && <ul className="-mx-3">{passes.map((r, i) => <Row key={`${r.rule}${r.detail || ""}${i}`} r={r} lang={lang} />)}</ul>}
            </>
          )}
        </>
      )}
    </div>
  );
}
