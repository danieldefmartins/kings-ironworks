"use client";

// Printed photo log: every shot on the list, when it was taken and where.
// Kept apart from PrintSheet so the sheet only gains one line.

import type { MeasureData, MeasureShape } from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import { formatGps, shotList, shotProgress } from "@/lib/shop/measure-shots";

const cell: React.CSSProperties = { border: "1px solid #ccc", padding: "2px 5px", textAlign: "left" };

function fill(s: string, vars: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export default function PhotoLogPrint({ data, shape, lang }: { data: MeasureData; shape: MeasureShape; lang: string }) {
  const shots = shotList(shape, data);
  const prog = shotProgress(data, shape);
  if (!prog.done && !prog.requiredTotal) return null;
  const loc = lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en-US";
  return (
    <div className="mt-3" style={{ breakInside: "avoid" }} data-testid="photo-log-print">
      <div
        style={{
          fontWeight: 800,
          textTransform: "uppercase",
          fontSize: 11,
          letterSpacing: 0.5,
          borderBottom: "2px solid var(--brand-accent, #b8860b)",
          marginBottom: 4,
          paddingBottom: 2,
        }}
      >
        {mt(lang, "shotLogTitle")} · {fill(mt(lang, "shotsOf"), { n: prog.done, t: prog.total })}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
        <tbody>
          {shots.map((s) => {
            const ph = data.photos.find((p) => p.slot === s.slot);
            if (!ph && s.tier !== "required") return null;
            return (
              <tr key={s.slot}>
                <td style={cell}>{mt(lang, `slot_${s.slot}`)}</td>
                <td suppressHydrationWarning style={{ ...cell, whiteSpace: "nowrap", color: ph ? "#217338" : "#8a5100", fontWeight: ph ? 400 : 700 }}>
                  {ph ? `✓ ${new Date(ph.takenAt).toLocaleString(loc, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : mt(lang, "shotMissing")}
                </td>
                <td style={{ ...cell, whiteSpace: "nowrap", color: "#555" }}>
                  {ph && ph.lat !== undefined && ph.lng !== undefined
                    ? `${formatGps(ph.lat, ph.lng)}${ph.acc !== undefined ? ` ±${ph.acc} m` : ""}`
                    : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
