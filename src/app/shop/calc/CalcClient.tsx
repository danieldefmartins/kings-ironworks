"use client";

import { useMemo, useState } from "react";
import {
  MAX_RISER,
  MIN_TREAD,
  parseInches,
  stairOptions,
  toFraction,
} from "@/lib/shop/stair-calc";
import { t } from "@/lib/shop/i18n";

// The division a stair builder does on the back of a board.
//
// 120 5/8 over 7 3/4 is 15.565 risers, and nobody builds 0.565 of a riser.
// The useful answer is the whole numbers either side of it, the exact riser
// each gives, and which of them is legal — so this shows the options rather
// than a single number that has to be re-rounded by hand.
export default function CalcClient({ lang = "en" }: { lang?: string }) {
  const [rise, setRise] = useState("");
  const [target, setTarget] = useState('7 3/4');
  const [tread, setTread] = useState("10");

  const riseIn = parseInches(rise);
  const targetIn = parseInches(target) ?? MAX_RISER;
  const treadIn = parseInches(tread);

  const result = useMemo(
    () => (riseIn && riseIn > 0 ? stairOptions(riseIn, targetIn, treadIn) : null),
    [riseIn, targetIn, treadIn]
  );

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    hint?: string
  ) => (
    <label className="block">
      <span className="block text-xs text-neutral-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode="text"
        className="mt-1 min-h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-[16px] tabular-nums"
      />
      {hint && <span className="mt-1 block text-[11px] text-neutral-500">{hint}</span>}
    </label>
  );

  return (
    <div className="space-y-4">
      <section className="rounded-[22px] border border-white/10 bg-neutral-900/60 p-4">
        <h2 className="mb-1 text-lg font-semibold">{t(lang, "calcStairTitle")}</h2>
        <p className="mb-3 text-xs leading-snug text-neutral-500">{t(lang, "calcStairHint")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {field(t(lang, "calcTotalRise"), rise, setRise, '120 5/8', t(lang, "calcAcceptsHint"))}
          {field(t(lang, "calcTargetRiser"), target, setTarget, '7 3/4')}
          {field(t(lang, "calcTreadDepth"), tread, setTread, "10")}
        </div>
        {rise.trim() !== "" && riseIn === null && (
          <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-300">
            {t(lang, "calcUnreadable")}
          </p>
        )}
      </section>

      {result && (
        <section className="overflow-hidden rounded-[22px] border border-white/10 bg-neutral-900/60">
          <div className="border-b border-white/10 px-4 py-3 text-sm">
            <span className="text-neutral-400">{toFraction(riseIn!)} ÷ {toFraction(targetIn)} = </span>
            <b className="tabular-nums">{result.raw.toFixed(3)}</b>
            <span className="text-neutral-400"> {t(lang, "calcRisers")}</span>
            <div className="mt-0.5 text-xs text-neutral-500">{t(lang, "calcNotWhole")}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-500">
                  <th className="px-3 py-2">{t(lang, "calcRisers")}</th>
                  <th className="px-3 py-2">{t(lang, "calcEach")}</th>
                  <th className="px-3 py-2">{t(lang, "calcTreads")}</th>
                  <th className="px-3 py-2">{t(lang, "calcTotalRun")}</th>
                  <th className="px-3 py-2">{t(lang, "calcAngle")}</th>
                  <th className="px-3 py-2">{t(lang, "calcCode")}</th>
                </tr>
              </thead>
              <tbody>
                {result.options.map((o) => (
                  <tr
                    key={o.risers}
                    className={`border-t border-white/5 ${o.riserOk ? "" : "opacity-55"}`}
                  >
                    <td className="px-3 py-2.5 font-semibold tabular-nums">{o.risers}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      <b>{toFraction(o.riserHeight)}</b>
                      <span className="ml-1 text-[11px] text-neutral-500">{o.riserExact.toFixed(3)}</span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{o.treads}</td>
                    <td className="px-3 py-2.5 tabular-nums">{o.totalRun ? toFraction(o.totalRun) : "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums">{o.angleDeg ? `${o.angleDeg.toFixed(1)}°` : "—"}</td>
                    <td className="px-3 py-2.5">
                      {o.riserOk ? (
                        <span className="font-semibold text-green-400">
                          {t(lang, "calcOk")}
                          {o.ruleOk && <span className="ml-1 text-[11px] text-neutral-500">2R+T ✓</span>}
                        </span>
                      ) : (
                        <span className="font-semibold text-red-400">{t(lang, "calcOverMax")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-white/10 px-4 py-2.5 text-[11px] leading-snug text-neutral-500">
            {t(lang, "calcCodeNote", {
              maxRiser: toFraction(MAX_RISER),
              minTread: toFraction(MIN_TREAD),
            })}
          </p>
        </section>
      )}
    </div>
  );
}
