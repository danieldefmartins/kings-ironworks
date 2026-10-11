"use client";

// Print block for shop pieces: mounting, finish and load, then every piece
// with its drawing, the readings it was measured at and the size the shop
// builds to (with the terms), the material list and every check.

import { mt } from "@/lib/shop/measure-i18n";
import { parseMeas } from "@/lib/shop/measure-parse";
import {
  bottleLoad,
  D_KEYS,
  DESIGN_KEYS,
  H_KEYS,
  pieceQty,
  pieceTag,
  shopPieceChecks,
  spFabSize,
  W_KEYS,
  type ShopPieceData,
} from "@/lib/shop/measure-shop-piece";
import ShopPieceSketch from "./ShopPieceSketch";
import { checkNumbers, useMeasFmt, type Fmt } from "./MeasureFormKit";
import { SP_CHECK_LABELS } from "./ShopPieceSections";

const GOLD = "#b8860b";
const cell: React.CSSProperties = { border: "1px solid #cbd5e1", padding: "4px 6px", textAlign: "left", verticalAlign: "top" };
const head: React.CSSProperties = { ...cell, background: "#f1f5f9", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.3 };
const LEVEL_COLOR = { green: "#166534", yellow: "#92400e", red: "#b91c1c", na: "#64748b" } as const;

function Title({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 11, letterSpacing: 0.5, borderBottom: `2px solid ${GOLD}`, margin: "10px 0 4px" }}>{children}</div>;
}
const m = (fm: Fmt, s: string) => (parseMeas(s) === null ? (s.trim() || "—") : fm(parseMeas(s)));

export default function ShopPiecePrint({ d, lang }: { d: ShopPieceData; lang: string }) {
  const fm = useMeasFmt();
  const t = (k: string) => mt(lang, k);
  const checks = shopPieceChecks(d).filter((c) => c.level !== "na");
  const lb = bottleLoad(d);
  return (
    <div className="mt-2" style={{ breakInside: "auto" }}>
      <Title>{t("sp_title")}</Title>
      <div>
        {t("sp_mount")}: <b>{d.mount ? t(`sp_mount_${d.mount}`) : "—"}</b>
        {d.niche && <> · <b>{t("sp_inNiche")}</b> · {t("sp_clearance")}: <b>{m(fm, d.clearance)}</b></>}
        {(d.mount === "wall" || d.mount === "counter") && <> · {t("sp_substrate")}: <b>{d.substrate ? t(`sp_sub_${d.substrate}`) : "—"}</b>{d.fastener ? <> · {d.fastener}</> : null}</>}
      </div>
      <div>
        {t("st_finish")}: <b>{d.finish ? t(`sp_fin_${d.finish}`) : "—"}</b>{d.color ? <> · {d.color}</> : null}
        {" "}· {t("sp_load")}: <b>{d.load ? t(`sp_load_${d.load}`) : "—"}</b>
        {d.load === "bottles" && d.bottles ? <> · {d.bottles} {t("sp_bottlesShort")}{lb !== null ? ` ≈ ${Math.round(lb)} lb` : ""}</> : null}
        {d.loadNote ? <> · {d.loadNote}</> : null}
      </div>
      {d.drawingRef && <div>{t("sp_drawingRef")}: <b>{d.drawingRef}</b></div>}

      {d.pieces.map((p, i) => {
        const f = spFabSize(d, p);
        const keys = d.niche ? [...W_KEYS, ...H_KEYS, ...D_KEYS] : [DESIGN_KEYS.w, DESIGN_KEYS.h, DESIGN_KEYS.d];
        return (
          <div key={p.id} style={{ breakInside: "avoid", marginTop: 8 }}>
            <Title>{`${pieceTag(p, i)} · ${p.type ? t(`sp_type_${p.type}`) : "—"}${pieceQty(p) > 1 ? ` × ${pieceQty(p)}` : ""}`}</Title>
            {/* The first piece's drawing prints in the sketch above. */}
            <div style={{ display: "grid", gridTemplateColumns: i ? "1.5fr 1fr" : "1fr", gap: 8 }}>
              {i > 0 && <div style={{ border: "1px solid #cbd5e1" }}><ShopPieceSketch d={d} piece={p} lang={lang} /></div>}
              <div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <tbody>
                    {keys.map((k) => (
                      <tr key={k}>
                        <td style={head}>{d.niche ? t(`sp_r_${k}`) : t(k === DESIGN_KEYS.w ? "sp_w" : k === DESIGN_KEYS.h ? "sp_h" : "sp_d")}</td>
                        <td style={{ ...cell, fontWeight: f.from.w === k || f.from.h === k || f.from.d === k ? 700 : undefined }}>{m(fm, p[k])}</td>
                      </tr>
                    ))}
                    {d.niche && (
                      <tr><td style={head}>{t("sp_diagTitle")}</td><td style={cell}>{m(fm, p.diagA)} / {m(fm, p.diagB)}</td></tr>
                    )}
                    {p.squareFix && <tr><td style={head}>{t("sp_squareFix")}</td><td style={cell}>{t(`sp_fix_${p.squareFix}`)}</td></tr>}
                  </tbody>
                </table>
                <div style={{ marginTop: 6, padding: 6, background: "#eef2ff", fontWeight: 800, fontSize: 13 }}>
                  {t("sp_buildTo")}: {fm(f.width)} × {fm(f.height)} × {fm(f.depth)}
                </div>
                {f.niche && <div style={{ fontSize: 10, color: "#475569" }}>{t("sp_printRule")} {fm(f.clearance)}</div>}
                {p.notes && <div style={{ fontSize: 11 }}>{p.notes}</div>}
              </div>
            </div>
          </div>
        );
      })}

      {d.materials.length > 0 && (
        <>
          <Title>{t("sp_materialsTitle")}</Title>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead><tr><th style={head}>{t("sp_profile")}</th><th style={head}>{t("sp_use")}</th></tr></thead>
            <tbody>{d.materials.map((x) => <tr key={x.id}><td style={cell}>{x.profile || "—"}</td><td style={cell}>{x.use || "—"}</td></tr>)}</tbody>
          </table>
        </>
      )}

      {checks.length > 0 && (
        <>
          <Title>{t("st_checksTitle")}</Title>
          {/* Issues in full; passed checks as one line so the sheet stays one page. */}
          {checks.some((c) => c.level === "green") && <div style={{ color: LEVEL_COLOR.green }}>✓ {checks.filter((c) => c.level === "green").length} {t("st_passed")}</div>}
          {checks.filter((c) => c.level !== "green").map((c, i) => (
            <div key={i} style={{ color: LEVEL_COLOR[c.level] }}>
              {c.level === "green" ? "✓" : c.level === "red" ? "✕" : "!"} {t(`check_${c.key}`)}{c.detail ? ` · ${c.detail}` : ""}
              {checkNumbers(lang, c, SP_CHECK_LABELS, fm) ? <span style={{ color: "#475569" }}> — {checkNumbers(lang, c, SP_CHECK_LABELS, fm)}</span> : null}
            </div>
          ))}
        </>
      )}
      {d.notes && <div style={{ marginTop: 4 }}>{t("st_notes")}: {d.notes}</div>}
    </div>
  );
}
