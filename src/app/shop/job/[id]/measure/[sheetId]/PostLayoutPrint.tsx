// Print: the calculated span table (run, rail length, rake, clear, pickets)
// under the post table. Calculated values print blue italic so the shop can
// tell them from what was measured.
import type { MeasureData } from "@/lib/shop/measure";
import type { PostLayout } from "@/lib/shop/measure-post-layout";
import { formatMeas } from "@/lib/shop/measure-parse";
import { mt } from "@/lib/shop/measure-i18n";

export const CALC_STYLE = { color: "#075985", fontStyle: "italic" as const, fontWeight: 600 };

export function Calc({ children, approx }: { children: React.ReactNode; approx?: boolean }) {
  return <span data-calc style={CALC_STYLE}>{approx ? "≈ " : ""}{children}</span>;
}

const cell = { border: "1px solid #ccc", padding: "3px 6px", whiteSpace: "nowrap" as const };
const head = { ...cell, textAlign: "left" as const, background: "#f4f0e6", fontSize: 11 };

export default function PostLayoutPrint({ data, layout, lang }: { data: MeasureData; layout: PostLayout | null; lang: string }) {
  if (!layout || !layout.spans.length) return null;
  const u = data.units || "in";
  const f = (n: number) => formatMeas(n, u);
  const deg = (n: number) => `${Math.abs(n).toFixed(1)}°`;
  return (
    <div className="mt-2" style={{ breakInside: "avoid" }}>
      <div style={{ fontSize: 11, fontWeight: 700, margin: "6px 0 3px" }}>{mt(lang, "pl_spans")}</div>
      <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr>
            <th style={head}>{mt(lang, "pl_span")}</th>
            <th style={head}>{mt(lang, "pl_run")}</th>
            <th style={head}>{mt(lang, "pl_rail")}</th>
            <th style={head}>{mt(lang, "pl_angle")}</th>
            <th style={head}>{mt(lang, "pl_clear")}</th>
            <th style={head}>{mt(lang, "pl_pickets")}</th>
            <th style={head}>{mt(lang, "pl_gap")}</th>
          </tr>
        </thead>
        <tbody>
          {layout.spans.map((s) => (
            <tr key={`${s.from.post.id}-${s.to.post.id}`}>
              <td style={cell}>{s.from.label} → {s.to.label} · {mt(lang, `pl_side_${s.side}`)}</td>
              <td style={cell}><Calc approx={s.provisional}>{f(s.run)}</Calc></td>
              <td style={cell}><Calc approx={s.provisional}>{f(s.length)}</Calc></td>
              <td style={cell}><Calc>{s.kind === "level" ? mt(lang, "pl_level") : s.pieces.map((p) => (p.kind === "level" ? mt(lang, "pl_level") : deg(p.angle))).join(" → ")}</Calc></td>
              <td style={cell}><Calc approx={s.provisional}>{f(s.clearRun)}</Calc></td>
              <td style={cell}>{s.pickets ? <Calc>{s.pickets.count} @ {f(s.pickets.oc)} {mt(lang, "pl_oc")}</Calc> : "—"}</td>
              <td style={cell}>{s.pickets ? <Calc>{f(s.pickets.gap)}</Calc> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
