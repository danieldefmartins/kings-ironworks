// Print: one compact table of every fastening location, and the finishes still
// to come with the heights they change. Read by the shop before ordering
// anchors and before cutting anything to a height.

import type { MeasureData, MeasureShape, PostMeasure } from "@/lib/shop/measure";
import { checkDetail, type CheckResult } from "@/lib/shop/measure-checks";
import { formatIn, parseMeas } from "@/lib/shop/measure-parse";
import { mt } from "@/lib/shop/measure-i18n";
import { finishAdd, heightNotes, mountLocations, substrateChecks, subFilled, suggestAnchor, surfacesFor, type SurfaceKey } from "@/lib/shop/measure-substrate";
import { anchorText } from "./SubstrateEditor";
import { finishNote, heightLabel } from "./FinishedSurfaces";

/**
 * Mounting and finish warnings read as what was found, not as a passed test:
 * "P3 · Substrate: cracked", "P1 · Too close to the edge 2" (min 3")".
 * Returns null for any other check, which keeps its usual wording.
 */
export function warningText(lang: string, c: CheckResult): string | null {
  const t = (k: string) => mt(lang, k);
  const d = checkDetail(c, lang);
  const at = d ? `${d} · ` : "";
  if (c.key === "sub_condition") return `${at}${t("mount_col_sub")}: ${c.value ? t(`sub_cond_${c.value}`).toLowerCase() : "?"}`;
  const nums = c.expected !== null && c.actual !== null ? ` ${formatIn(c.actual)} (${c.key === "finish_riser_mix" ? "max" : t("sub_min")} ${formatIn(c.expected)})` : "";
  if (c.key.startsWith("sub_") || c.key === "finish_riser_mix") return `${at}${t(`sub_issue_${c.key}`)}${nums}`;
  return null;
}

const th = "border border-neutral-400 px-1 py-0.5 text-left font-semibold";
const td = "border border-neutral-400 px-1 py-0.5 align-top";

function Title({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #999", marginBottom: 3 }}>{children}</div>;
}

export default function MountingPrint({ data, shape, lang, posts }: { data: MeasureData; shape: MeasureShape; lang: string; posts?: PostMeasure[] }) {
  const t = (k: string) => mt(lang, k);
  const rows = mountLocations(data, shape, t, posts).filter((l) => subFilled(l.sub));
  const keys = surfacesFor(data, shape);
  const sf = data.surfaces || {};
  const pending = keys.filter((k: SurfaceKey) => finishAdd(sf[k]) > 0);
  const heights = heightNotes(data, shape);
  if (!rows.length && !pending.length) return null;
  return (
    <div className="mt-3" style={{ breakInside: "avoid" }}>
      {rows.length > 0 && (
        <>
          <Title>{t("mount_print_title")}</Title>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr>
                {["mount_col_loc", "mount_col_sub", "mount_col_cond", "mount_col_anchor", "mount_col_edge"].map((k) => (
                  <th key={k} className={th}>{t(k)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const s = l.sub!;
                const sg = suggestAnchor(s.material, s.mount, s.hidden, s.scanned);
                const edge = parseMeas(s.edgeDist);
                const bad = substrateChecks(s, "").some((c) => c.level === "red");
                return (
                  <tr key={l.key} style={bad ? { color: "#b91c1c" } : undefined}>
                    <td className={`${td} font-semibold`}>{l.label}</td>
                    <td className={td}>
                      {t(`sub_mat_${s.material}`)}
                      {s.mount ? ` · ${t(`sub_mount_${s.mount}`)}` : ""}
                      {s.hidden && s.hidden !== "none" ? ` · ${t(`sub_hidden_${s.hidden}`)}${s.scanned ? " ✓" : ` (${t("mount_scan")})`}` : ""}
                      {s.note ? <div>{s.note}</div> : null}
                    </td>
                    <td className={td}>{s.condition ? t(`sub_cond_${s.condition}`) : "—"}</td>
                    <td className={td}>{anchorText(lang, s)}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      {edge !== null ? formatIn(edge) : "—"}
                      {sg?.minEdge != null ? ` (${t("sub_min")} ${formatIn(sg.minEdge)})` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
      {pending.length > 0 && (
        <div className="mt-2">
          <Title>{t("fin_print_title")}</Title>
          {pending.map((k) => (
            <div key={k} style={{ fontWeight: 700 }}>⚠ {finishNote(lang, k, sf[k]!)}</div>
          ))}
          {heights.map((h, i) => (
            <div key={i}>
              {heightLabel(lang, h)}: {formatIn(h.measured)} → <b>{formatIn(h.finished)}</b> {t("fin_after").toLowerCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
