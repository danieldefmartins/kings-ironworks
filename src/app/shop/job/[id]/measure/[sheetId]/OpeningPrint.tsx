"use client";

// Printed opening sheet: one elevation and one table per opening, with the
// size to fabricate printed as the headline number of each.

import type { MeasureData } from "@/lib/shop/measure";
import { formatIn, type CheckLevel } from "@/lib/shop/measure-checks";
import { mt } from "@/lib/shop/measure-i18n";
import {
  OPENING_DOOR_PRODUCTS,
  isFaceMount,
  julietGuardAboveSill,
  openingFabFinal,
  openingPieceCount,
  openingSquareness,
  unitTag,
  type OpeningData,
  type OpeningProduct,
} from "@/lib/shop/measure-opening";
import OpeningElevation from "./shapes/OpeningElevation";
import { useShowMeas } from "./MeasUnits";

const LEVEL_TEXT: Record<CheckLevel, string> = { green: "#15803d", yellow: "#b45309", red: "#b91c1c", na: "#555" };

/** Every opening's elevation — the sheet's sketch. */
export function OpeningSketch({ opening, lang, light }: { opening: OpeningData | null | undefined; lang: string; light?: boolean }) {
  if (!opening) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: opening.units.length > 1 ? "1fr 1fr" : "1fr", gap: 8 }}>
      {opening.units.map((u, i) => (
        <div key={u.id} style={{ breakInside: "avoid" }}>
          {opening.units.length > 1 && <div style={{ fontSize: 10, fontWeight: 700 }}>{unitTag(u, i)}</div>}
          <OpeningElevation opening={opening} unit={u} lang={lang} light={light} />
        </div>
      ))}
    </div>
  );
}

function V({ v }: { v: string }) {
  return v && v.trim() ? <b>{v}</b> : <span style={{ display: "inline-block", minWidth: "2.5rem", borderBottom: "1px solid #999" }}>&nbsp;</span>;
}
/** A typed length, printed in shop notation. */
function L({ v }: { v: string }) {
  const show = useShowMeas();
  return <V v={show(v)} />;
}

export default function OpeningPrint({ data, lang }: { data: MeasureData; lang: string }) {
  const o = data.opening;
  if (!o) return null;
  const th: React.CSSProperties = { border: "1px solid #bbb", padding: "2px 4px", background: "#f3f3f3", fontSize: 10, textAlign: "left" };
  const td: React.CSSProperties = { border: "1px solid #bbb", padding: "2px 4px", fontSize: 11 };
  const isDoor = !!o.product && OPENING_DOOR_PRODUCTS.includes(o.product as OpeningProduct);
  const yn = (v: string) => (v === "yes" ? mt(lang, "opYes") : v === "no" ? mt(lang, "opNo") : "");
  const side = (v: string) => (v === "left" ? mt(lang, "opLeft") : v === "right" ? mt(lang, "opRight") : "");
  const juliet = julietGuardAboveSill(o);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 700, borderBottom: "2px solid var(--brand-accent, #b8860b)", marginBottom: 4 }}>
        {mt(lang, "opPrintTitle")} · {openingPieceCount(o)} {mt(lang, openingPieceCount(o) === 1 ? "opPiece" : "opPieces")}
      </div>
      <div style={{ fontSize: 11 }}>
        {o.product ? mt(lang, `opP_${o.product}`) : <V v="" />} · {mt(lang, "opMount")}: {o.mount ? mt(lang, `opM_${o.mount}`) : <V v="" />} ·{" "}
        {mt(lang, isFaceMount(o.mount) ? "opOverlap" : "opClearance")}: <L v={isFaceMount(o.mount) ? o.overlap : o.clearance} />
      </div>
      <div style={{ fontSize: 11 }}>
        {mt(lang, "opSubstrate")}: {o.substrate ? mt(lang, `opS_${o.substrate}`) : <V v="" />}
        {o.substrateCondition ? <> ({o.substrateCondition})</> : null} · {mt(lang, "opAnchor")}:{" "}
        {o.anchor ? mt(lang, `opA_${o.anchor}`) : <V v="" />}
        {o.anchorNote ? <> — {o.anchorNote}</> : null}
        {o.design ? <> · {mt(lang, "opDesign")}: {o.design}</> : null}
      </div>
      {o.product === "juliet" && (
        <div style={{ fontSize: 11 }}>
          <b>{mt(lang, "opJulietTitle")}: </b>
          {mt(lang, "opJulietSill")}: <L v={o.julietSill} /> · {mt(lang, "opJulietGuard")}: <L v={o.julietGuard} /> ·{" "}
          {mt(lang, "opJulietProjection")}: <L v={o.julietProjection} /> · {mt(lang, "opJulietSwing")}:{" "}
          <V v={o.julietDoorSwing === "in" ? mt(lang, "opSwingIn") : o.julietDoorSwing === "out" ? mt(lang, "opSwingOut") : ""} />
          {o.julietDoorSwing === "out" && <> · {mt(lang, "opJulietClears")} <V v={yn(o.julietDoorClears)} /></>}
          {juliet !== null && <> · <b>{juliet > 0 ? mt(lang, "opJulietAboveSill").replace("{h}", formatIn(juliet)) : mt(lang, "opJulietSillOk")}</b></>}
        </div>
      )}
      {isDoor && (
        <div style={{ fontSize: 11 }}>
          <b>{mt(lang, "opDoorTitle")}: </b>
          {mt(lang, "opDoorHinge")}: <V v={side(o.doorHinge)} /> · {mt(lang, "opDoorSwing")}:{" "}
          <V v={o.doorSwing === "in" ? mt(lang, "opSwingIn") : o.doorSwing === "out" ? mt(lang, "opSwingOut") : ""} /> ·{" "}
          {mt(lang, "opDoorLock")}: <V v={side(o.lockSide)} /> · {mt(lang, "opDoorThreshold")}: <L v={o.threshold} /> ·{" "}
          {mt(lang, "opDoorJamb")}: <V v={o.jambMaterial} />
        </div>
      )}
      {o.units.map((u, i) => {
        const fab = openingFabFinal(o, u);
        const sq = openingSquareness(u);
        return (
          <div key={u.id} style={{ marginTop: 6, breakInside: "avoid" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12 }}>
              <b>{mt(lang, "opPrintOpening")} {unitTag(u, i)}{(parseInt(u.qty, 10) || 1) > 1 ? ` × ${u.qty}` : ""}</b>
              <span>
                {mt(lang, "opPrintFab")}:{" "}
                <b style={{ fontSize: 15 }}>{fab ? `${formatIn(fab.width)} × ${formatIn(fab.height)}` : "______ × ______"}</b>
              </span>
            </div>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={th}></th>
                  <th style={th}>{mt(lang, "opW_wTop")} / {mt(lang, "opH_hLeft")}</th>
                  <th style={th}>{mt(lang, "opW_wMid")} / {mt(lang, "opH_hCenter")}</th>
                  <th style={th}>{mt(lang, "opW_wBot")} / {mt(lang, "opH_hRight")}</th>
                  <th style={th}>Δ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={th}>{mt(lang, "opWidths")}</td>
                  <td style={td}><L v={u.wTop} /></td><td style={td}><L v={u.wMid} /></td><td style={td}><L v={u.wBot} /></td>
                  <td style={{ ...td, color: LEVEL_TEXT[sq.widthLevel] }}>{sq.widthSpread === null ? "—" : formatIn(sq.widthSpread)}</td>
                </tr>
                <tr>
                  <td style={th}>{mt(lang, "opHeights")}</td>
                  <td style={td}><L v={u.hLeft} /></td><td style={td}><L v={u.hCenter} /></td><td style={td}><L v={u.hRight} /></td>
                  <td style={{ ...td, color: LEVEL_TEXT[sq.heightLevel] }}>{sq.heightSpread === null ? "—" : formatIn(sq.heightSpread)}</td>
                </tr>
                <tr>
                  <td style={th}>{mt(lang, "opDiagonals")}</td>
                  <td style={td}>A <L v={u.diagA} /></td><td style={td}>B <L v={u.diagB} /></td><td style={td}></td>
                  <td style={{ ...td, color: LEVEL_TEXT[sq.diagLevel] }}>{sq.diagDiff === null ? "—" : formatIn(sq.diagDiff)}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: 10.5 }}>
              {mt(lang, "opReveal")}: <L v={u.reveal} />
              {u.sillSlope ? <> · {mt(lang, "opSillSlope")}: {u.sillSlope}</> : null}
              {u.sillProjection ? <> · {mt(lang, "opSillProjection")}: <L v={u.sillProjection} /></> : null}
              {u.egress ? <> · {mt(lang, "opEgress")}: <b>{yn(u.egress)}</b></> : null}
              {u.egress === "yes" ? <> · {mt(lang, "opQuickRelease")}: <V v={yn(u.quickRelease)} /></> : null}
              {u.squareFix ? <> · <b>{mt(lang, `opFix_${u.squareFix}`)}</b></> : null}
              {u.note ? <> · {u.note}</> : null}
            </div>
          </div>
        );
      })}
      {o.notes && <div style={{ fontSize: 11, marginTop: 4 }}>{mt(lang, "opNotes")}: {o.notes}</div>}
    </div>
  );
}
