"use client";

// Elevation of a structural sheet, drawn from the measurements themselves.
//
//   beam / lintel   the opening in its wall, the steel bearing into each side,
//                   the clear span, both bearings and the cut length
//   frame           columns on the slab (sloped when the heights differ), the
//                   beam on top, centre-to-centre and each column's height
//   columns only    each column under the existing beam with its own height
//
// Missing values draw at a typical proportion and are labelled "—", so the
// sketch reads correctly from the first tap. Anything a check has flagged red
// draws red.

import { parseMeas } from "@/lib/shop/measure-parse";
import {
  frameColumn,
  heightReadings,
  isBearingRole,
  isVertical,
  memberCut,
  plateThickness,
  profileInfo,
  requiredBearing,
  spanReadings,
  type StructBearing,
  type StructMember,
  type StructuralData,
} from "@/lib/shop/measure-structural";
import { mt } from "@/lib/shop/measure-i18n";

export function fmtLen(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const neg = n < 0;
  const a = Math.abs(n);
  const s16 = Math.round(a * 16);
  let inches = s16 / 16;
  if (a >= 24) {
    const ft = Math.floor(inches / 12 + 1e-9);
    inches = inches - ft * 12;
    const r = fracIn(inches);
    return `${neg ? "−" : ""}${ft}' ${r}"`;
  }
  return `${neg ? "−" : ""}${fracIn(inches)}"`;
}

function fracIn(n: number): string {
  const s16 = Math.round(n * 16);
  const whole = Math.floor(s16 / 16);
  let num = s16 % 16;
  if (num === 0) return `${whole}`;
  let den = 16;
  while (num % 2 === 0) { num /= 2; den /= 2; }
  return whole ? `${whole} ${num}/${den}` : `${num}/${den}`;
}

const INK = { steel: "#4f46e5", steelFill: "#e0e7ff", dim: "#475569", text: "#0f172a", muted: "#64748b", red: "#dc2626", wall: "#94a3b8", wallFill: "#f1f5f9", ground: "#334155" };

function Defs() {
  return (
    <defs>
      <pattern id="st-brick" width="16" height="8" patternUnits="userSpaceOnUse">
        <rect width="16" height="8" fill="#fbe9e2" />
        <path d="M0 0.5H16M0 4.5H16M4 0.5V4.5M12 4.5V8.5" stroke="#d6a594" strokeWidth="0.8" fill="none" />
      </pattern>
      <pattern id="st-block" width="20" height="10" patternUnits="userSpaceOnUse">
        <rect width="20" height="10" fill="#eef1f5" />
        <path d="M0 0.5H20M0 5.5H20M10 0.5V5.5M0 5.5V10M20 5.5V10" stroke="#a7b1c0" strokeWidth="0.8" fill="none" />
      </pattern>
      <pattern id="st-concrete" width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="12" fill="#eceef1" />
        <circle cx="3" cy="4" r="0.8" fill="#a3acb9" />
        <circle cx="9" cy="9" r="0.6" fill="#a3acb9" />
        <path d="M7 2l1.5 1.2" stroke="#a3acb9" strokeWidth="0.6" />
      </pattern>
      <pattern id="st-stone" width="22" height="14" patternUnits="userSpaceOnUse">
        <rect width="22" height="14" fill="#efece6" />
        <path d="M0 6c5-1 8 1 12 0s7-2 10 0M8 6v8M16 0v6" stroke="#b5ab9b" strokeWidth="0.8" fill="none" />
      </pattern>
      <pattern id="st-wood" width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#f6ecd9" />
        <path d="M0 3c3 1 7-1 10 0M0 8c3 1 7-1 10 0" stroke="#cfb48a" strokeWidth="0.7" fill="none" />
      </pattern>
      <pattern id="st-ground" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <path d="M0 0V8" stroke="#94a3b8" strokeWidth="1" />
      </pattern>
      <marker id="st-tick" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M2 8L8 2" stroke={INK.dim} strokeWidth="1.4" />
      </marker>
    </defs>
  );
}

function wallFill(b: StructBearing): string {
  switch (b.substrate) {
    case "brick": return "url(#st-brick)";
    case "block": return "url(#st-block)";
    case "concrete": return "url(#st-concrete)";
    case "stone": return "url(#st-stone)";
    case "wood": return "url(#st-wood)";
    case "steel": return "#e2e8f0";
    default: return INK.wallFill;
  }
}

/** Horizontal dimension line with end ticks and a centred label. */
function HDim({ x1, x2, y, label, color = INK.dim, above = true, bold = false }: { x1: number; x2: number; y: number; label: string; color?: string; above?: boolean; bold?: boolean }) {
  if (Math.abs(x2 - x1) < 1) return null;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={1.4} markerStart="url(#st-tick)" markerEnd="url(#st-tick)" />
      <Label x={(x1 + x2) / 2} y={above ? y - 8 : y + 22} text={label} color={color} bold={bold} />
    </g>
  );
}

function VDim({ x, y1, y2, label, color = INK.dim, left = true }: { x: number; y1: number; y2: number; label: string; color?: string; left?: boolean }) {
  if (Math.abs(y2 - y1) < 1) return null;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={1.4} markerStart="url(#st-tick)" markerEnd="url(#st-tick)" />
      <Label x={left ? x - 8 : x + 8} y={my + 6} text={label} color={color} anchor={left ? "end" : "start"} />
    </g>
  );
}

function Label({ x, y, text, color = INK.text, anchor = "middle", bold = false, size = 19 }: { x: number; y: number; text: string; color?: string; anchor?: "start" | "middle" | "end"; bold?: boolean; size?: number }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={bold ? 700 : 600} fill={color}
      stroke="#fff" strokeWidth={5} paintOrder="stroke" style={{ fontFeatureSettings: '"tnum"' }}>
      {text}
    </text>
  );
}

const VW = 640;
const VH = 320;

export default function StructuralSketch({ s, lang, focusId, height }: { s: StructuralData | null; lang: string; focusId?: string | null; height?: number }) {
  const members = s?.members || [];
  const focus = members.find((m) => m.id === focusId);
  const beams = members.filter((m) => isBearingRole(m.role));
  const cols = members.filter((m) => isVertical(m.role));
  let body: React.ReactNode;
  const wantsFrame = !!s && (s.frame.on || (beams.length > 0 && cols.length > 0 && (!focus || !isBearingRole(focus.role) || spanReadings(focus).length === 0)));
  if (!s || members.length === 0) body = <Empty lang={lang} />;
  else if (wantsFrame && cols.length) body = <Frame s={s} lang={lang} />;
  else if (focus && isBearingRole(focus.role)) body = <Opening m={focus} lang={lang} />;
  else if (beams.length && (!focus || !isVertical(focus.role))) body = <Opening m={beams[0]} lang={lang} />;
  else if (cols.length) body = <Columns cols={focus && isVertical(focus.role) ? [focus, ...cols.filter((c) => c !== focus)] : cols} lang={lang} />;
  else body = <Empty lang={lang} />;
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height={height} role="img" aria-label={mt(lang, "st_sketchTitle")}
      data-site-sketch="" style={{ display: "block", background: "#fff", borderRadius: 12 }}>
      <Defs />
      {body}
    </svg>
  );
}

function Empty({ lang }: { lang: string }) {
  return (
    <g opacity={0.5}>
      <rect x={80} y={60} width={110} height={200} fill="url(#st-brick)" stroke={INK.wall} />
      <rect x={450} y={60} width={110} height={200} fill="url(#st-brick)" stroke={INK.wall} />
      <rect x={150} y={100} width={340} height={20} fill={INK.steelFill} stroke={INK.steel} strokeWidth={1.5} />
      <line x1={40} y1={260} x2={600} y2={260} stroke={INK.ground} strokeWidth={2} />
      <Label x={320} y={190} text={mt(lang, "st_sketchEmpty")} color={INK.muted} />
    </g>
  );
}

// ---- Beam or lintel in a wall opening --------------------------------------------

function Opening({ m, lang }: { m: StructMember; lang: string }) {
  const spans = spanReadings(m);
  const span = spans.length ? Math.max(...spans) : 96;
  const bl = parseMeas(m.bearingL.length);
  const br = parseMeas(m.bearingR.length);
  const wl = parseMeas(m.bearingL.wall);
  const wr = parseMeas(m.bearingR.wall);
  const info = profileInfo(m.profile);
  const depthIn = info?.depth ?? (m.role === "lintel" ? 4 : 8);
  // Pier width drawn: the larger of the bearing and a typical pier, so a short
  // bearing still reads as short against the wall it sits in.
  const pierL = Math.max(bl ?? 8, 12, Math.min(span * 0.22, 30));
  const pierR = Math.max(br ?? 8, 12, Math.min(span * 0.22, 30));
  const total = pierL + span + pierR;
  const sc = 560 / total;
  const x0 = 40;
  const xo1 = x0 + pierL * sc; // opening left face
  const xo2 = xo1 + span * sc; // opening right face
  const xEnd = xo2 + pierR * sc;
  const beamY = 92;
  const beamH = Math.max(12, Math.min(depthIn * sc, 40));
  const groundY = 262;
  const bLx = xo1 - (bl ?? 6) * sc;
  const bRx = xo2 + (br ?? 6) * sc;
  const needL = requiredBearing(m, m.bearingL), needR = requiredBearing(m, m.bearingR);
  const shortL = bl !== null && needL !== null && bl < needL;
  const shortR = br !== null && needR !== null && br < needR;
  const cut = memberCut(m).length;
  const carries = m.carries;
  const joists = Math.max(3, Math.min(12, Math.floor(span / 16)));
  return (
    <g>
      {/* Piers / walls */}
      <rect x={x0} y={34} width={xo1 - x0} height={groundY - 34} fill={wallFill(m.bearingL)} stroke={INK.wall} />
      <rect x={xo2} y={34} width={xEnd - xo2} height={groundY - 34} fill={wallFill(m.bearingR)} stroke={INK.wall} />
      {/* What the steel carries, above it */}
      {carries === "wall" && <rect x={xo1} y={34} width={xo2 - xo1} height={beamY - 34} fill={wallFill(m.bearingL.substrate ? m.bearingL : m.bearingR)} stroke={INK.wall} opacity={0.9} />}
      {carries === "joists" && Array.from({ length: joists }, (_, i) => {
        const x = xo1 + ((i + 0.5) / joists) * (xo2 - xo1);
        return <rect key={i} x={x - 4} y={beamY - 30} width={8} height={30} fill="url(#st-wood)" stroke="#b08d57" strokeWidth={0.8} />;
      })}
      {carries === "roof" && <path d={`M${xo1 - 20} ${beamY - 4}L${(xo1 + xo2) / 2} ${40}L${xo2 + 20} ${beamY - 4}`} fill="none" stroke="#b08d57" strokeWidth={3} />}
      {carries === "point" && <path d={`M${(xo1 + xo2) / 2} 40V${beamY - 6}m-7-9l7 9 7-9`} fill="none" stroke={INK.red} strokeWidth={2.2} />}
      {/* The steel */}
      <rect x={bLx} y={beamY} width={bRx - bLx} height={beamH} fill={INK.steelFill} stroke={INK.steel} strokeWidth={1.8} rx={1.5} />
      {info?.family === "W" || info?.family === "S" || info?.family === "C" || info?.family === "MC" ? (
        <path d={`M${bLx} ${beamY + 3}H${bRx}M${bLx} ${beamY + beamH - 3}H${bRx}`} stroke={INK.steel} strokeWidth={0.9} />
      ) : null}
      <Label x={(xo1 + xo2) / 2} y={beamY + beamH / 2 + 4} text={`${m.mark}${m.profile ? ` · ${m.profile}` : ""}`} color={INK.steel} bold />
      {/* Bearings */}
      <HDim x1={bLx} x2={xo1} y={beamY - 12} label={bl === null ? "—" : fmtLen(bl)} color={shortL ? INK.red : INK.dim} />
      <HDim x1={xo2} x2={bRx} y={beamY - 12} label={br === null ? "—" : fmtLen(br)} color={shortR ? INK.red : INK.dim} />
      {/* Clear span inside the opening */}
      <HDim x1={xo1} x2={xo2} y={beamY + beamH + 34}
        label={`${mt(lang, "st_clearSpan")} ${spans.length ? spans.map((v) => fmtLen(v)).join(" / ") : "—"}`} />
      {/* Floor */}
      <line x1={20} y1={groundY} x2={620} y2={groundY} stroke={INK.ground} strokeWidth={2} />
      <rect x={20} y={groundY} width={600} height={8} fill="url(#st-ground)" />
      {/* Cut length under everything */}
      <HDim x1={bLx} x2={bRx} y={groundY + 34} above label={`${mt(lang, "st_cut")} ${fmtLen(cut)}`} color={INK.steel} bold />
      {/* Wall labels */}
      {m.bearingL.substrate && <Label x={(x0 + xo1) / 2} y={groundY - 12} text={mt(lang, `st_sub_${m.bearingL.substrate}`)} color={INK.muted} size={15} />}
      {m.bearingR.substrate && <Label x={(xo2 + xEnd) / 2} y={groundY - 12} text={mt(lang, `st_sub_${m.bearingR.substrate}`)} color={INK.muted} size={15} />}
      {wl !== null && <Label x={(x0 + xo1) / 2} y={groundY - 36} text={`${mt(lang, "st_wallShort")} ${fmtLen(wl)}`} color={INK.muted} size={15} />}
      {wr !== null && <Label x={(xo2 + xEnd) / 2} y={groundY - 36} text={`${mt(lang, "st_wallShort")} ${fmtLen(wr)}`} color={INK.muted} size={15} />}
    </g>
  );
}

// ---- Moment frame / beam on columns -----------------------------------------------

function Frame({ s, lang }: { s: StructuralData; lang: string }) {
  const cols = s.members.filter((m) => m.role === "column" || m.role === "post");
  const shown = cols.length ? cols : s.members.filter((m) => isVertical(m.role));
  const beam = s.members.find((m) => m.role === "beam");
  const colInfo = profileInfo(frameColumn(s)?.profile);
  const d = colInfo?.depth ?? 6;
  const cc = parseMeas(s.frame.cc) ?? (beam ? Math.max(...spanReadings(beam), 0) || 108 : 108);
  const n = Math.max(2, shown.length);
  const heights = shown.map((c) => {
    const h = heightReadings(c);
    return h.length ? Math.min(...h) : null;
  });
  const hMax = Math.max(...heights.map((h) => h ?? 96), 60);
  const beamDepth = profileInfo(beam?.profile)?.depth ?? 8;
  const opening = parseMeas(s.frame.opening);
  const widthIn = Math.max(cc + d, opening ?? 0) + 30;
  const sc = Math.min(520 / widthIn, 200 / (hMax + beamDepth));
  const cx = 320;
  const spanPx = cc * sc;
  const topY = 60 + beamDepth * sc; // underside of beam
  const colW = Math.max(8, d * sc);
  const xs = Array.from({ length: n }, (_, i) => cx - spanPx / 2 + (i * spanPx) / (n - 1));
  const baseYs = xs.map((_, i) => topY + (heights[i] ?? 96) * sc);
  const groundL = baseYs[0], groundR = baseYs[n - 1];
  const beamX1 = xs[0] - colW / 2, beamX2 = xs[n - 1] + colW / 2;
  const opX1 = opening !== null ? cx - (opening * sc) / 2 : null;
  const opX2 = opening !== null ? cx + (opening * sc) / 2 : null;
  const fit = opening !== null ? opening - (cc + d) : null;
  return (
    <g>
      {/* Opening jambs */}
      {opX1 !== null && opX2 !== null && (
        <>
          <rect x={opX1 - 28} y={30} width={28} height={Math.max(groundL, groundR) - 30} fill="url(#st-block)" stroke={INK.wall} />
          <rect x={opX2} y={30} width={28} height={Math.max(groundL, groundR) - 30} fill="url(#st-block)" stroke={INK.wall} />
        </>
      )}
      {/* Slab, following the measured heights */}
      <path d={`M20 ${groundL}L${xs[0]} ${groundL}L${xs[n - 1]} ${groundR}L620 ${groundR}`} fill="none" stroke={INK.ground} strokeWidth={2} />
      <path d={`M20 ${groundL}L${xs[0]} ${groundL}L${xs[n - 1]} ${groundR}L620 ${groundR}V${Math.max(groundL, groundR) + 10}H20Z`} fill="url(#st-concrete)" opacity={0.8} />
      {/* Diagonals of the opening */}
      {s.frame.on && (s.frame.diagA || s.frame.diagB) && (
        <g stroke={INK.muted} strokeDasharray="5 5" strokeWidth={1}>
          <line x1={xs[0]} y1={topY} x2={xs[n - 1]} y2={groundR} />
          <line x1={xs[n - 1]} y1={topY} x2={xs[0]} y2={groundL} />
        </g>
      )}
      {/* Columns */}
      {xs.map((x, i) => {
        const c = shown[i];
        const bp = plateThickness(c?.basePlate) ?? 0, cp = plateThickness(c?.capPlate) ?? 0;
        const bpH = Math.max(bp ? 3 : 0, bp * sc), cpH = Math.max(cp ? 3 : 0, cp * sc);
        return (
          <g key={i}>
            <rect x={x - colW / 2} y={topY + cpH} width={colW} height={baseYs[i] - topY - bpH - cpH} fill={INK.steelFill} stroke={INK.steel} strokeWidth={1.6} />
            {bpH > 0 && <rect x={x - colW / 2 - 6} y={baseYs[i] - bpH} width={colW + 12} height={bpH} fill={INK.steel} />}
            {cpH > 0 && <rect x={x - colW / 2 - 4} y={topY} width={colW + 8} height={cpH} fill={INK.steel} />}
            <Label x={x} y={(topY + baseYs[i]) / 2 + 4} text={c?.mark || `C${i + 1}`} color={INK.steel} bold />
            <VDim x={i === 0 ? x - colW / 2 - 16 : x + colW / 2 + 16} y1={topY} y2={baseYs[i]}
              label={heights[i] === null ? "—" : fmtLen(heights[i])} left={i === 0} />
          </g>
        );
      })}
      {/* Beam on top */}
      <rect x={beamX1} y={60} width={beamX2 - beamX1} height={topY - 60} fill={INK.steelFill} stroke={INK.steel} strokeWidth={1.8} />
      <path d={`M${beamX1} 63H${beamX2}M${beamX1} ${topY - 3}H${beamX2}`} stroke={INK.steel} strokeWidth={0.9} />
      <Label x={cx} y={(60 + topY) / 2 + 4} text={`${beam?.mark || "B"}${beam?.profile ? ` · ${beam.profile}` : ""}`} color={INK.steel} bold />
      {/* Centre to centre */}
      <HDim x1={xs[0]} x2={xs[n - 1]} y={40} label={`${mt(lang, "st_cc")} ${s.frame.cc ? fmtLen(parseMeas(s.frame.cc)) : "—"}`} />
      {/* Opening width under the slab */}
      {opX1 !== null && opX2 !== null && (
        <HDim x1={opX1} x2={opX2} y={Math.max(groundL, groundR) + 30} above
          label={`${mt(lang, "st_opening")} ${fmtLen(opening)}`} color={fit !== null && fit < 0 ? INK.red : INK.dim} />
      )}
    </g>
  );
}

// ---- Columns under an existing beam -------------------------------------------------

function Columns({ cols, lang }: { cols: StructMember[]; lang: string }) {
  const shown = cols.slice(0, 4);
  const heights = shown.map((c) => {
    const h = heightReadings(c);
    return h.length ? Math.min(...h) : null;
  });
  const hMax = Math.max(...heights.map((h) => h ?? 96), 60);
  const sc = 200 / hMax;
  const topY = 56;
  const n = shown.length;
  const xs = shown.map((_, i) => 320 + (i - (n - 1) / 2) * Math.min(150, 480 / Math.max(1, n)));
  return (
    <g>
      <rect x={30} y={30} width={580} height={topY - 30} fill="url(#st-wood)" stroke="#b08d57" strokeDasharray="6 4" />
      <Label x={320} y={47} text={mt(lang, "st_existingAbove")} color="#8a6a3a" size={15} />
      {xs.map((x, i) => {
        const c = shown[i];
        const info = profileInfo(c.profile);
        const w = Math.max(10, Math.min(28, (info?.width ?? 4) * sc));
        const base = topY + (heights[i] ?? 96) * sc;
        const bp = plateThickness(c.basePlate) ?? 0, cp = plateThickness(c.capPlate) ?? 0;
        return (
          <g key={c.id}>
            {cp > 0 && <rect x={x - w / 2 - 6} y={topY} width={w + 12} height={4} fill={INK.steel} />}
            <rect x={x - w / 2} y={topY + (cp > 0 ? 4 : 0)} width={w} height={base - topY - (cp > 0 ? 4 : 0) - (bp > 0 ? 4 : 0)} fill={INK.steelFill} stroke={INK.steel} strokeWidth={1.6} rx={info?.family === "LALLY" || info?.family === "PIPE" ? w / 2.5 : 1} />
            {bp > 0 && <rect x={x - w / 2 - 8} y={base - 4} width={w + 16} height={4} fill={INK.steel} />}
            <line x1={x - 50} y1={base} x2={x + 50} y2={base} stroke={INK.ground} strokeWidth={2} />
            <rect x={x - 50} y={base} width={100} height={8} fill="url(#st-ground)" />
            <Label x={x} y={base + 26} text={`${c.mark}${c.qty && c.qty !== "1" ? ` ×${c.qty}` : ""}`} color={INK.steel} bold />
            <VDim x={x + w / 2 + 14} y1={topY} y2={base} label={heights[i] === null ? "—" : fmtLen(heights[i])} left={false} />
          </g>
        );
      })}
    </g>
  );
}
