"use client";

// Print block for a canopy sheet: side + front elevation, one dimension table
// the fabricator works from, support / posts, door, roof & water, the wall it
// lands on, what is on that wall, the snow-load note and every check.

import { mt } from "@/lib/shop/measure-i18n";
import { parseMeas } from "@/lib/shop/measure-parse";
import { canopyChecks, canopyGeometry, fmtSlope, hasDoor, isSkylight, sheds, type CanopyData } from "@/lib/shop/measure-canopy";
import { canopyCheckLine } from "./CanopySections";
import { fmtLen } from "./StructuralSketch";

const GOLD = "#b8860b";
const cell: React.CSSProperties = { border: "1px solid #cbd5e1", padding: "4px 6px", textAlign: "left", verticalAlign: "top" };
const head: React.CSSProperties = { ...cell, background: "#f1f5f9", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.3, width: "28%" };
const LEVEL_COLOR = { green: "#166534", yellow: "#92400e", red: "#b91c1c", na: "#64748b" } as const;

function Title({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 11, letterSpacing: 0.5, borderBottom: `2px solid ${GOLD}`, margin: "10px 0 4px" }}>{children}</div>;
}

/** A length as the shop reads it (7' 8"), or what was typed when it is not a plain length. */
const len = (s: string | undefined | null) => {
  if (!s || !s.trim()) return "—";
  const n = parseMeas(s);
  return n === null ? s : fmtLen(n);
};

export default function CanopyPrint({ c, lang }: { c: CanopyData; lang: string }) {
  const t = (k: string) => mt(lang, k);
  const g = canopyGeometry(c);
  const checks = canopyChecks(c);
  const sky = isSkylight(c);
  const opt = (prefix: string, val: string) => (val ? t(`${prefix}${val}`) : "—");
  const rows: [string, React.ReactNode][] = [
    [t("cn_width"), len(c.width)],
    [t(sky ? "cn_length" : "cn_projection"), len(c.projection)],
    ...(sky ? [[t("cn_curb"), len(c.curb)] as [string, React.ReactNode]] : [
      [t("cn_depth"), len(c.depth)] as [string, React.ReactNode],
      [t("cn_datum"), opt("cn_datum_", c.datum)] as [string, React.ReactNode],
      [t("cn_soffitL"), len(c.soffitL)] as [string, React.ReactNode],
      [t("cn_soffitR"), len(c.soffitR)] as [string, React.ReactNode],
      [t("cn_mount"), len(c.mount)] as [string, React.ReactNode],
      [t("cn_headroom"), <b key="h">{fmtLen(g.lowest)}</b>] as [string, React.ReactNode],
      [t("cn_underTrim"), fmtLen(g.trimClear)] as [string, React.ReactNode],
    ]),
    ...(sheds(c) ? [
      [t("cn_fall"), len(c.fall)] as [string, React.ReactNode],
      [t("cn_drain"), opt("cn_drain_", c.drain)] as [string, React.ReactNode],
      [t("cn_slope"), <b key="s">{fmtSlope(g.slopePerFt, t("cn_perFt"))}</b>] as [string, React.ReactNode],
    ] : []),
  ];
  const half = Math.ceil(rows.length / 2);

  return (
    <div className="mt-2" style={{ breakInside: "auto" }}>
      <Title>{t(`cn_kind_${c.kind || "entry"}`)} · {t("cn_printDims")}</Title>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[rows.slice(0, half), rows.slice(half)].map((part, i) => (
          <table key={i} style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <tbody>
              {part.map(([k, val]) => (
                <tr key={k}><th style={head}>{k}</th><td style={cell}>{val}</td></tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <Title>{t(sky ? "cn_roofDeck" : "cn_wallTitle")}</Title>
          <div>{t("cn_substrate")}: <b>{opt("cn_sub_", c.substrate)}</b>{!sky && <> · {t("cn_backing")}: <b>{opt("cn_back_", c.backing)}</b></>}</div>
          {!sky && <div>{t("cn_flashing")}: <b>{opt("cn_fl_", c.flashing)}</b>{c.ledgerNote ? <> · {c.ledgerNote}</> : null}</div>}
          {!sky && c.obstructions.length > 0 && (
            <div>{t("cn_obsTitle")}: <b>{c.obstructions.map((o) => t(`cn_obs_${o}`)).join(", ")}</b>{c.obstructionNote ? <> · {c.obstructionNote}</> : null}</div>
          )}
        </div>
        <div>
          <Title>{t("cn_roofTitle")}</Title>
          <div>{t("cn_roof")}: <b>{opt("cn_roof_", c.roof)}</b>{sheds(c) && !sky && <> · {t("cn_gutter")}: <b>{opt("cn_gutter_", c.gutter)}</b>{c.gutter && c.gutter !== "none" && c.downspout ? <> · {t("cn_downspout")}: <b>{t(`cn_${c.downspout}`)}</b></> : null}</>}</div>
          <div>{t("cn_finishTitle")}: <b>{opt("cn_fin_", c.finish)}</b></div>
          {c.snow && sheds(c) && (
            <div style={{ marginTop: 3, padding: "3px 6px", border: "1px solid #f59e0b", background: "#fffbeb", fontWeight: 600 }}>
              {t("cn_printSnow")} {t("cn_engineer")}: {c.engineer ? t(c.engineer === "yes" ? "cn_yes" : "cn_no") : "—"}
            </div>
          )}
        </div>
      </div>

      {!sky && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <Title>{t("cn_supportTitle")}</Title>
            <div><b>{opt("cn_sup_", c.support)}</b>{c.support === "tie_rods" && <> · {t("cn_rodRise")}: <b>{len(c.rodRise)}</b></>}</div>
            {c.support === "posts" && c.posts.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 3 }}>
                <tbody>
                  {c.posts.map((p, i) => (
                    <tr key={p.id}><th style={head}>{p.label || `P${i + 1}`}</th><td style={cell}>{t("cn_postHeight")}: <b>{len(p.height)}</b></td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {hasDoor(c) && (
            <div>
              <Title>{t("cn_doorTitle")}</Title>
              <div>{t("cn_swing")}: <b>{opt("cn_swing_", c.door.swing)}</b></div>
              {c.door.swing && c.door.swing !== "none" && <div>{t("cn_doorHead")}: <b>{len(c.door.head)}</b>{c.door.swing === "out" && <> · {t("cn_doorWidth")}: <b>{len(c.door.width)}</b></>}</div>}
            </div>
          )}
        </div>
      )}

      {checks.length > 0 && (
        <>
          <Title>{t("cn_checksTitle")}</Title>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <tbody>
              {checks.map((k, i) => (
                <tr key={i}>
                  <td style={{ ...cell, width: 60, fontWeight: 700, color: LEVEL_COLOR[k.level] }}>{t(k.level === "green" ? "cn_ok" : k.level === "yellow" ? "cn_review" : "cn_fix")}</td>
                  <td style={cell}>{t(`check_${k.key}`)}</td>
                  <td style={{ ...cell, whiteSpace: "nowrap" }}>{canopyCheckLine(lang, k)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {c.notes && <div style={{ marginTop: 6 }}>{t("cn_notes")}: {c.notes}</div>}
      <div style={{ marginTop: 4, fontSize: 10, color: "#64748b" }}>{t("cn_printNote")}</div>
    </div>
  );
}

