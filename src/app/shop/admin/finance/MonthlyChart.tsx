"use client";
import { useState } from "react";
import { L, monthLabel, usd } from "./ui";

type Month = { month: string; revenue: number; expenses: number; draws: number };

// Validated categorical slots 1–3 (dark surface #171717, all checks pass).
const SERIES = [
  { key: "revenue", color: "#3987e5", label: ["Revenue", "Receita", "Ingresos"] },
  { key: "expenses", color: "#d95926", label: ["Business spending", "Gastos da empresa", "Gastos de la empresa"] },
  { key: "draws", color: "#199e70", label: ["Owner draws", "Retiradas dos sócios", "Retiros de socios"] },
] as const;

function niceMax(v: number) {
  if (v <= 0) return 1000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
const k = (n: number) => (Math.abs(n) >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`);

export default function MonthlyChart({ months, lang }: { months: Month[]; lang: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const data = months.slice(-12);
  const lbl = (s: (typeof SERIES)[number]) => L(lang, s.label[0], s.label[1], s.label[2]);

  if (!data.length) return <p className="py-10 text-center text-neutral-500">{L(lang, "No transactions in this period.", "Sem transações neste período.", "Sin movimientos en este periodo.")}</p>;

  const W = 720, H = 260, padL = 48, padB = 28, padT = 12;
  const max = niceMax(Math.max(...data.flatMap((m) => [m.revenue, m.expenses, Math.max(m.draws, 0)])));
  const plotW = W - padL - 8, plotH = H - padT - padB;
  const slot = plotW / data.length;
  const barW = Math.max(3, Math.min(18, (slot - 10) / 3 - 2));
  const y = (v: number) => padT + plotH - (Math.max(v, 0) / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4 text-sm text-neutral-300">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-2"><span aria-hidden className="h-3 w-3 rounded-sm" style={{ background: s.color }} />{lbl(s)}</li>
          ))}
        </ul>
        <button onClick={() => setTable(!table)} className="min-h-10 rounded-lg border border-white/15 px-3 text-sm text-neutral-300">
          {table ? L(lang, "Show chart", "Ver gráfico", "Ver gráfico") : L(lang, "Show table", "Ver tabela", "Ver tabla")}
        </button>
      </div>

      {table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-400"><th className="py-2 pr-3">{L(lang, "Month", "Mês", "Mes")}</th>{SERIES.map((s) => <th key={s.key} className="py-2 pr-3 text-right">{lbl(s)}</th>)}<th className="py-2 text-right">{L(lang, "Profit", "Lucro", "Ganancia")}</th></tr></thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.month} className="border-t border-white/10">
                  <td className="py-2 pr-3">{monthLabel(m.month)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{usd(m.revenue)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{usd(m.expenses)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{usd(m.draws)}</td>
                  <td className={`py-2 text-right font-semibold tabular-nums ${m.revenue - m.expenses < 0 ? "text-red-300" : "text-neutral-100"}`}>{usd(m.revenue - m.expenses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={L(lang, "Monthly revenue, business spending and owner draws", "Receita, gastos e retiradas por mês", "Ingresos, gastos y retiros por mes")} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={W - 8} y1={y(t)} y2={y(t)} stroke="#ffffff" strokeOpacity={t === 0 ? 0.25 : 0.07} />
                <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#a3a3a3">{k(t)}</text>
              </g>
            ))}
            {data.map((m, i) => {
              const x0 = padL + i * slot + (slot - (barW * 3 + 4)) / 2;
              return (
                <g key={m.month}>
                  {hover === i && <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill="#ffffff" fillOpacity={0.05} />}
                  {SERIES.map((s, si) => {
                    const v = Math.max(m[s.key], 0);
                    const top = y(v), h = padT + plotH - top;
                    const x = x0 + si * (barW + 2);
                    const r = Math.min(4, barW / 2, h);
                    return h > 0 ? (
                      <path key={s.key} fill={s.color} d={`M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + h} Z`} />
                    ) : null;
                  })}
                  {(data.length <= 12 || i % 2 === 0) && <text x={padL + i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#a3a3a3">{monthLabel(m.month)}</text>}
                  <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
                </g>
              );
            })}
          </svg>
          {hover !== null && (
            <div className="pointer-events-none absolute top-2 rounded-xl border border-white/15 bg-neutral-950/95 p-3 text-sm shadow-xl" style={{ left: `${Math.min(Math.max(((padL + hover * slot + slot / 2) / W) * 100, 12), 70)}%` }}>
              <p className="mb-1 font-semibold text-neutral-100">{monthLabel(data[hover].month)}</p>
              {SERIES.map((s) => (
                <p key={s.key} className="flex items-center gap-2 text-neutral-300"><span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{lbl(s)}: <span className="font-semibold tabular-nums text-neutral-100">{usd(data[hover][s.key])}</span></p>
              ))}
              <p className="mt-1 border-t border-white/10 pt-1 text-neutral-300">{L(lang, "Profit", "Lucro", "Ganancia")}: <span className="font-semibold tabular-nums text-neutral-100">{usd(data[hover].revenue - data[hover].expenses)}</span></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
