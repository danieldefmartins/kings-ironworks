"use client";

// Print block for a structural steel sheet: the elevation, then one cut table
// the fabricator works from — mark, profile, quantity, the field dimensions,
// the cut length with its terms, and weight — then bearings, columns, frame,
// finish, access and every check.

import { mt } from "@/lib/shop/measure-i18n";
import { checkDetail } from "@/lib/shop/measure-checks";
import {
  isBearingRole,
  isSpanning,
  isVertical,
  memberCut,
  memberQty,
  memberWeight,
  requiredBearing,
  structuralChecks,
  structuralSummary,
  weightVerdict,
  type StructuralData,
} from "@/lib/shop/measure-structural";
import { fmtLen } from "./StructuralSketch";
import { checkLine } from "./StructuralSections";

// Org accent (white-label), set on the print root; KIW gold otherwise.
const GOLD = "var(--brand-accent, #b8860b)";
const cell: React.CSSProperties = { border: "1px solid #cbd5e1", padding: "4px 6px", textAlign: "left", verticalAlign: "top" };
const head: React.CSSProperties = { ...cell, background: "#f1f5f9", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.3 };
const LEVEL_COLOR = { green: "#166534", yellow: "#92400e", red: "#b91c1c", na: "#64748b" } as const;

function Title({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 11, letterSpacing: 0.5, borderBottom: `2px solid ${GOLD}`, margin: "10px 0 4px" }}>
      {children}
    </div>
  );
}

const v = (s: string | undefined | null) => (s && s.trim() ? s : "—");

export default function StructuralPrint({ s, lang }: { s: StructuralData; lang: string }) {
  const t = (k: string) => mt(lang, k);
  const sum = structuralSummary(s);
  const checks = structuralChecks(s);
  const wv = weightVerdict(s);
  // A frame beam with no span of its own sits on the columns, not in a wall.
  const spanning = s.members.filter((m) => isBearingRole(m.role) && !(m.role === "beam" && s.frame.on && !m.spanA.trim() && !m.spanB.trim()));
  const vertical = s.members.filter((m) => isVertical(m.role));
  return (
    <div className="mt-2" style={{ breakInside: "auto" }}>
      <Title>{t("st_title")}</Title>
      <div>
        {t("st_stamped")}: <b>{s.eng.stamped ? t(s.eng.stamped === "yes" ? "st_yes" : "st_no") : "—"}</b>
        {s.eng.stamped === "yes" && <> · {t("st_drawingNo")}: <b>{v(s.eng.drawingNo)}</b> · {t("st_revision")}: <b>{v(s.eng.revision)}</b>{s.eng.engineer ? <> · {s.eng.engineer}</> : null}</>}
        {s.eng.stamped !== "yes" && <> · {t("st_engRequired")}: <b>{s.eng.required ? t(s.eng.required === "yes" ? "st_yes" : "st_no") : "—"}</b></>}
        {" "}· {t("st_permit")}: <b>{s.eng.permit ? t(s.eng.permit === "yes" ? "st_yes" : s.eng.permit === "no" ? "st_no" : "st_byOthers") : "—"}</b>
        {s.eng.connection ? <> · {t("st_connection")}: <b>{s.eng.connection}</b></> : null}
      </div>
      {s.datum && <div>{t("st_datum")}: <b>{s.datum}</b></div>}


      <Title>{t("st_cutTable")}</Title>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead style={{ display: "table-header-group" }}>
          <tr>
            <th style={head}>{t("st_mark")}</th>
            <th style={head}>{t("st_roleCol")}</th>
            <th style={head}>{t("st_profile")}</th>
            <th style={head}>{t("st_qty")}</th>
            <th style={head}>{t("st_fieldCol")}</th>
            <th style={head}>{t("st_cutLength")}</th>
            <th style={head}>lb/ft</th>
            <th style={head}>{t("st_weightCol")}</th>
          </tr>
        </thead>
        <tbody>
          {s.members.map((m) => {
            const cut = memberCut(m, s);
            const w = memberWeight(m, s);
            const field = isSpanning(m.role)
              ? [m.spanA, m.spanB].filter((x) => x.trim()).join(" / ")
              : m.heights.filter((r) => r.value.trim()).map((r) => `${r.label ? `${r.label} ` : ""}${r.value}`).join(" / ");
            return (
              <tr key={m.id} style={{ breakInside: "avoid" }}>
                <td style={{ ...cell, fontWeight: 800 }}>{m.mark}</td>
                <td style={cell}>{t(`st_role_${m.role}`)}</td>
                <td style={{ ...cell, fontWeight: 700 }}>{v(m.profile)}</td>
                <td style={cell}>{memberQty(m)}</td>
                <td style={cell}>{v(field)}</td>
                <td style={cell}>
                  <b>{fmtLen(cut.length)}</b>
                  {cut.length !== null && (
                    <div style={{ fontSize: 9, color: "#475569" }}>
                      {cut.parts.map((p, i) => `${i ? (p.sign < 0 ? " − " : " + ") : ""}${t(`st_part_${p.key}`)} ${fmtLen(p.value)}`).join("")}
                    </div>
                  )}
                </td>
                <td style={cell}>{w.lbPerFt === null ? "—" : `${w.approx ? "≈" : ""}${w.lbPerFt.toFixed(1)}`}</td>
                <td style={cell}>{w.total === null ? "—" : `${w.approx ? "≈" : ""}${Math.round(w.total)} lb`}</td>
              </tr>
            );
          })}
          <tr>
            <td style={{ ...cell, fontWeight: 800 }} colSpan={3}>{t("st_totalWeight")}</td>
            <td style={{ ...cell, fontWeight: 800 }}>{sum.pieces}</td>
            <td style={cell} colSpan={3}>{sum.longest ? `${t("st_longest")}: ${sum.longest.mark} ${fmtLen(sum.longest.length)}` : ""}</td>
            <td style={{ ...cell, fontWeight: 800 }}>{sum.totalWeight === null ? "—" : `${sum.approx || !sum.weightComplete ? "≈" : ""}${Math.round(sum.totalWeight)} lb`}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{t("st_printNote")}</div>

      {spanning.length > 0 && (
        <>
          <Title>{t("st_bearingTitle")}</Title>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                <th style={head}>{t("st_mark")}</th>
                <th style={head}>{t("st_endL")}</th>
                <th style={head}>{t("st_endR")}</th>
                <th style={head}>{t("st_carries")}</th>
                <th style={head}>{t("st_existing")}</th>
                <th style={head}>{t("st_elevation")}</th>
              </tr>
            </thead>
            <tbody>
              {spanning.map((m) => (
                <tr key={m.id} style={{ breakInside: "avoid" }}>
                  <td style={{ ...cell, fontWeight: 800 }}>{m.mark}</td>
                  {([m.bearingL, m.bearingR] as const).map((b, i) => {
                    const need = requiredBearing(m, b);
                    return (
                      <td key={i} style={cell}>
                        {b.substrate ? t(`st_sub_${b.substrate}`) : "—"}{b.condition ? ` (${t(`st_cond_${b.condition}`)})` : ""}
                        <br />
                        {t("st_bearingLen")}: <b>{v(b.length)}</b>{need !== null ? ` · ${t("st_min")} ${fmtLen(need)}` : ""} · {t("st_wallShort")} {v(b.wall)}
                      </td>
                    );
                  })}
                  <td style={cell}>{m.carries ? t(`st_carry_${m.carries}`) : "—"}{m.shoring ? <><br />{t("st_shoring")}: {t(`st_shore_${m.shoring}`)}</> : null}</td>
                  <td style={cell}>{v(m.existing)}</td>
                  <td style={cell}>{v(m.elevation)}{m.dwgElevation ? ` (${t("st_perDrawing")} ${m.dwgElevation})` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {vertical.length > 0 && (
        <>
          <Title>{t("st_columnsTitle")}</Title>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                <th style={head}>{t("st_mark")}</th>
                <th style={head}>{t("st_baseOn")}</th>
                <th style={head}>{t("st_footing")}</th>
                <th style={head}>{t("st_basePlate")} / {t("st_capPlate")}</th>
                <th style={head}>{t("st_anchors")}</th>
                <th style={head}>{t("st_plumb")}</th>
                <th style={head}>{t("st_existingCol")}</th>
              </tr>
            </thead>
            <tbody>
              {vertical.map((m) => (
                <tr key={m.id} style={{ breakInside: "avoid" }}>
                  <td style={{ ...cell, fontWeight: 800 }}>{m.mark}</td>
                  <td style={cell}>{m.base.substrate ? t(`st_sub_${m.base.substrate}`) : "—"}{m.base.condition ? ` (${t(`st_cond_${m.base.condition}`)})` : ""}</td>
                  <td style={cell}>{m.footing ? t(`st_foot_${m.footing}`) : "—"}{m.footingSize ? ` · ${m.footingSize}` : ""}</td>
                  <td style={cell}>{v(m.basePlate)} / {v(m.capPlate)}{m.shim ? ` · ${t("st_shim")} ${m.shim}` : ""}</td>
                  <td style={cell}>{v(m.anchors)}</td>
                  <td style={cell}>{v(m.plumb)}</td>
                  <td style={cell}>{v(m.existing)}{m.finishFloor ? <><br />{t("st_finishFloor")}: {m.finishFloor}</> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {s.frame.on && (
        <>
          <Title>{t("st_frameTitle")}</Title>
          <div>
            {t("st_frameOpening")}: <b>{v(s.frame.opening)}</b> · {t("st_frameCc")}: <b>{v(s.frame.cc)}</b> · {t("st_diagA")}: <b>{v(s.frame.diagA)}</b> · {t("st_diagB")}: <b>{v(s.frame.diagB)}</b>
            {s.eng.stamped === "yes" && <> · {t("st_perDrawing")}: {v(s.frame.dwgOpening)} / {v(s.frame.dwgCc)}</>}
          </div>
        </>
      )}

      <Title>{t("st_finishTitle")} · {t("st_accessTitle")}</Title>
      <div>
        {t("st_finish")}: <b>{s.finish ? t(`st_fin_${s.finish}`) : "—"}</b> · {t("st_color")}: <b>{v(s.color)}</b>
        {s.fireRating ? <> · {t("st_fireRating")}: <b>{s.fireRating}</b></> : null}
      </div>
      <div>
        {t("st_accessPath")}: <b>{v(s.access.path)}</b> · {t("st_doorWidth")}: <b>{v(s.access.doorWidth)}</b> · {t("st_stairWidth")}: <b>{v(s.access.stairWidth)}</b>
      </div>
      <div>
        {t("st_maxLength")}: <b>{v(s.access.maxLength)}</b> · {t("st_maxWeight")}: <b>{v(s.access.maxWeight)}</b> · {t("st_lift")}: <b>{s.access.lift ? t(`st_lift_${s.access.lift}`) : "—"}</b>
        {s.access.splice ? <> · {t("st_splice")}: <b>{s.access.splice}</b></> : null}
        {wv.level === "yellow" ? <> · <b style={{ color: LEVEL_COLOR.yellow }}>{t("st_needsLift")}</b></> : null}
      </div>

      {checks.length > 0 && (
        <>
          <Title>{t("st_checksTitle")}</Title>
          {checks.map((c, i) => (
            <div key={i} style={{ color: LEVEL_COLOR[c.level] }}>
              ● {t(`check_${c.key}`)}{checkDetail(c, lang) ? ` · ${checkDetail(c, lang)}` : ""}
              {checkLine(lang, c) ? ` — ${checkLine(lang, c)}` : ""}
            </div>
          ))}
        </>
      )}
      {s.notes && <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{s.notes}</div>}
    </div>
  );
}
