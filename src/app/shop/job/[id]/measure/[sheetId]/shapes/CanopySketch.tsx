"use client";

// Side and front elevations of a canopy, drawn from the measurements.
//
//   side   wall on the left, the existing trim above, the frame pitched to the
//          front, its support (tie rod / bracket / post), the door and the
//          envelope an out-swinging door sweeps, and every height from the datum
//   front  the width, the trim line (sloped when the two ends disagree), the
//          fascia, each post with its own height, the gutter and downspout
//
// Missing values draw at a typical proportion and are labelled "—". Anything a
// check flags red draws red. Skylights get a simple section on the roof.

import { parseMeas } from "@/lib/shop/measure-parse";
import { mt } from "@/lib/shop/measure-i18n";
import {
  canopyChecks,
  canopyGeometry,
  fmtSlope,
  hasDoor,
  isSkylight,
  sheds,
  type CanopyData,
} from "@/lib/shop/measure-canopy";
import { fmtLen } from "./StructuralSketch";

const INK = {
  steel: "#4f46e5",
  steelFill: "#e0e7ff",
  dim: "#475569",
  text: "#0f172a",
  muted: "#64748b",
  red: "#dc2626",
  wall: "#94a3b8",
  wallFill: "#f1f5f9",
  ground: "#334155",
  water: "#0284c7",
  door: "#cbd5e1",
  roof: "#bae6fd",
};

const num = (s: string | undefined) => (s && s.trim() ? parseMeas(s) : null);

/** Number or "—" — a missing value is drawn at a typical size but never labelled as measured. */
const lbl = (v: number | null) => (v === null ? "—" : fmtLen(v));

type View = "side" | "front";

export default function CanopySketch({ c, lang, view = "side" }: { c: CanopyData | null; lang: string; view?: View }) {
  if (!c || !c.kind) return null;
  if (isSkylight(c)) return <SkylightSection c={c} lang={lang} />;
  return view === "front" ? <FrontElevation c={c} lang={lang} /> : <SideElevation c={c} lang={lang} />;
}

function reds(c: CanopyData) {
  const set = new Set(canopyChecks(c).filter((k) => k.level === "red").map((k) => k.key));
  return {
    headroom: set.has("canopy_headroom"),
    slope: set.has("canopy_slope_wall"),
    trim: set.has("canopy_trim") || set.has("canopy_trim_rods"),
    door: set.has("canopy_door_head") || set.has("canopy_door_swing"),
    proj: set.has("canopy_proj_tie_rods") || set.has("canopy_proj_brackets"),
  };
}

/** Drawing values: measured where possible, typical proportions otherwise. */
function model(c: CanopyData) {
  const g = canopyGeometry(c);
  const P = g.projection && g.projection > 0 ? g.projection : 48;
  const W = g.width && g.width > 0 ? g.width : 72;
  const D = g.depth && g.depth > 0 ? g.depth : 6;
  const H = g.mount ?? 90;
  const fall = g.fall ?? (sheds(c) ? (P / 12) * 0.5 : 0);
  const sL = num(c.soffitL);
  const sR = num(c.soffitR);
  const rise = c.support === "tie_rods" ? num(c.rodRise) ?? 16 : 0;
  const trim = g.soffitMin ?? H + D + rise + 8;
  const head = num(c.door.head);
  const dw = num(c.door.width);
  return { g, P, W, D, H, fall, sL, sR, rise, trim, head, dw };
}

function Arrow({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 6;
  const p1 = `${x2 - h * Math.cos(a - 0.45)},${y2 - h * Math.sin(a - 0.45)}`;
  const p2 = `${x2 - h * Math.cos(a + 0.45)},${y2 - h * Math.sin(a + 0.45)}`;
  return (
    <g stroke={color} fill={color} strokeWidth={1.6} strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polygon points={`${x2},${y2} ${p1} ${p2}`} stroke="none" />
    </g>
  );
}

/** Vertical dimension with ticks and a label beside it. */
function VDim({ x, y1, y2, text, color = INK.dim, side = "right" }: { x: number; y1: number; y2: number; text: string; color?: string; side?: "left" | "right" | "top" }) {
  const mid = (y1 + y2) / 2;
  if (side === "top")
    return (
      <g stroke={color} strokeWidth={1}>
        <line x1={x} y1={y1} x2={x} y2={y2} />
        <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} />
        <line x1={x - 4} y1={y2} x2={x + 4} y2={y2} />
        <text x={x} y={Math.min(y1, y2) - 6} fontSize={12} fontWeight={600} fill={color} stroke="none" textAnchor="middle" style={{ fontVariantNumeric: "tabular-nums" }}>{text}</text>
      </g>
    );
  return (
    <g stroke={color} strokeWidth={1}>
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} />
      <line x1={x - 4} y1={y2} x2={x + 4} y2={y2} />
      <text x={side === "right" ? x + 6 : x - 6} y={mid + 4} fontSize={12} fontWeight={600} fill={color} stroke="none" textAnchor={side === "right" ? "start" : "end"} style={{ fontVariantNumeric: "tabular-nums" }}>
        {text}
      </text>
    </g>
  );
}

function HDim({ y, x1, x2, text, color = INK.dim }: { y: number; x1: number; x2: number; text: string; color?: string }) {
  return (
    <g stroke={color} strokeWidth={1}>
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} />
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} />
      <rect x={(x1 + x2) / 2 - text.length * 3.6 - 6} y={y - 8} width={text.length * 7.2 + 12} height={15} fill="#fff" stroke="none" />
      <text x={(x1 + x2) / 2} y={y + 4} fontSize={12} fontWeight={600} fill={color} stroke="none" textAnchor="middle" style={{ fontVariantNumeric: "tabular-nums" }}>
        {text}
      </text>
    </g>
  );
}

function Caption({ x, y, children, anchor = "start", color = INK.muted }: { x: number; y: number; children: React.ReactNode; anchor?: "start" | "middle" | "end"; color?: string }) {
  return (
    <text x={x} y={y} fontSize={10} fontWeight={700} letterSpacing={0.6} fill={color} textAnchor={anchor}>
      {children}
    </text>
  );
}

// ---- Side elevation -------------------------------------------------------------

function SideElevation({ c, lang }: { c: CanopyData; lang: string }) {
  const t = (k: string) => mt(lang, k);
  const m = model(c);
  const r = reds(c);
  const { g, P, D, H, fall, rise, trim, head, dw } = m;

  // World (inches) → picture. The wall face is x = 0, the datum z = 0.
  const top = Math.max(trim, H + D + rise) + 18;
  const right = P + 6;
  const left = -14;
  const VW = 380;
  // Left: two height dimensions. Right: headroom + the slope / fall labels.
  const sc = Math.min((VW - 100 - 70) / (right - left), 300 / (top + 6));
  const ox = 100 - left * sc;
  const oy = 16 + top * sc;
  const X = (x: number) => ox + x * sc;
  const Y = (z: number) => oy - z * sc;
  const VH = oy + 26;
  const under = (y: number) => H - fall * (y / P);

  const frame = [
    [0, under(0)],
    [P, under(P)],
    [P, under(P) + D],
    [0, under(0) + D],
  ]
    .map(([x, z]) => `${X(x)},${Y(z)}`)
    .join(" ");

  const gDrop = c.gutter === "front" ? num(c.gutterDrop) ?? 0 : 0;
  // Lowest point at the wall (front pitched up): the mount dimension already says it.
  const lowAtWall = under(0) <= under(P) - gDrop;
  const lowZ = Math.min(under(0), under(P) - gDrop);
  const waterToWall = r.slope;
  const midY = P / 2;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" role="img" aria-label={t("cn_side")} style={{ display: "block", background: "#fff" }}>
      {/* Wall + datum */}
      <rect x={X(left)} y={Y(top)} width={X(0) - X(left)} height={Y(0) - Y(top)} fill={INK.wallFill} stroke={INK.wall} />
      <line x1={X(left) - 8} y1={Y(0)} x2={X(right)} y2={Y(0)} stroke={INK.ground} strokeWidth={1.6} />
      <Caption x={X(right)} y={Y(0) + 14} anchor="end">{c.datum ? t(`cn_datum_${c.datum}`).toUpperCase() : "±0"}</Caption>
      <Caption x={X(left) + 3} y={Y(top) + 12}>{t("cn_dwg_wall")}</Caption>

      {/* Existing trim / soffit */}
      <rect x={X(0)} y={Y(trim) - 9} width={Math.max(10, 4 * sc)} height={9} fill={r.trim ? "#fee2e2" : "#e2e8f0"} stroke={r.trim ? INK.red : INK.wall} />
      <line x1={X(0)} y1={Y(trim)} x2={X(0) + 40} y2={Y(trim)} stroke={r.trim ? INK.red : INK.wall} strokeDasharray="3 3" />
      <Caption x={X(0) + 18} y={Y(trim) - 11} color={r.trim ? INK.red : INK.muted}>{t("cn_dwg_trim")}</Caption>

      {/* Door, and the envelope an out-swinging door sweeps */}
      {hasDoor(c) && c.door.swing && c.door.swing !== "none" && (
        <g>
          <line x1={X(0) - 2} y1={Y(0)} x2={X(0) - 2} y2={Y(head ?? 80)} stroke={INK.ground} strokeWidth={3} />
          {c.door.swing === "out" && (
            <rect x={X(0)} y={Y(head ?? 80)} width={(dw ?? 36) * sc} height={(head ?? 80) * sc} fill={r.door ? "#fee2e2" : "#f8fafc"} stroke={r.door ? INK.red : INK.door} strokeDasharray="4 3" />
          )}
          <Caption x={X(0) + 4} y={Y(0) - 6}>{t("cn_dwg_door")}</Caption>
        </g>
      )}

      {/* Support */}
      {c.support === "tie_rods" && <line x1={X(0)} y1={Y(H + D + rise)} x2={X(P - 1)} y2={Y(under(P) + D)} stroke={INK.steel} strokeWidth={2} />}
      {c.support === "brackets" && (() => {
        const reach = Math.min(P * 0.75, 36);
        return <polyline points={`${X(0)},${Y(H - reach)} ${X(reach)},${Y(under(reach))}`} fill="none" stroke={r.proj ? INK.red : INK.steel} strokeWidth={2.4} />;
      })()}
      {c.support === "posts" && <rect x={X(P - 4)} y={Y(under(P))} width={4 * sc} height={under(P) * sc} fill={INK.steelFill} stroke={INK.steel} />}

      {/* Frame + roof */}
      <polygon points={frame} fill={r.proj ? "#fee2e2" : INK.steelFill} stroke={r.proj ? INK.red : INK.steel} strokeWidth={1.6} />
      {sheds(c) && <line x1={X(0)} y1={Y(under(0) + D) - 2} x2={X(P)} y2={Y(under(P) + D) - 2} stroke={INK.roof} strokeWidth={3} />}
      {c.gutter === "front" && (
        <rect x={X(P)} y={Y(under(P) + D * 0.6)} width={4 * sc} height={((num(c.gutterDrop) ?? 3) + D * 0.6) * sc} fill="#fff" stroke={INK.steel} />
      )}

      {/* Water direction */}
      {sheds(c) && (
        waterToWall ? (
          <Arrow x1={X(midY + 10)} y1={Y(under(midY + 10) + D) - 7} x2={X(midY - 10)} y2={Y(under(midY - 10) + D) - 7} color={INK.red} />
        ) : (
          <Arrow x1={X(midY - 10)} y1={Y(under(midY - 10) + D) - 7} x2={X(midY + 10)} y2={Y(under(midY + 10) + D) - 7} color={INK.water} />
        )
      )}
      {sheds(c) && (
        <text x={X(P) + 14} y={Y(under(P) + D) - 18} fontSize={12} fontWeight={700} fill={waterToWall ? INK.red : INK.water}>
          {g.slopePerFt === null ? t("cn_dwg_water") : fmtSlope(g.slopePerFt, t("cn_perFt"))}
        </text>
      )}

      {/* Dimensions */}
      <HDim y={Y(top) + 2} x1={X(0)} x2={X(P)} text={lbl(g.projection)} />
      <VDim x={X(left) - 12} y1={Y(0)} y2={Y(H)} text={lbl(g.mount)} side="left" color={lowAtWall && r.headroom ? INK.red : INK.dim} />
      <VDim x={X(left) - 54} y1={Y(0)} y2={Y(trim)} text={lbl(g.soffitMin)} side="top" color={r.trim ? INK.red : INK.dim} />
      {!lowAtWall && <VDim x={X(P) + 16} y1={Y(0)} y2={Y(lowZ)} text={lbl(g.lowest)} color={r.headroom ? INK.red : INK.dim} />}
      {g.fall !== null && Math.abs(fall) > 0 && (
        <text x={X(P) + 14} y={Y(under(P) + D) - 4} fontSize={11} fontWeight={600} fill={INK.muted}>{fall > 0 ? "↓" : "↑"} {fmtLen(Math.abs(fall))}</text>
      )}
    </svg>
  );
}

// ---- Front elevation --------------------------------------------------------------

function FrontElevation({ c, lang }: { c: CanopyData; lang: string }) {
  const t = (k: string) => mt(lang, k);
  const m = model(c);
  const r = reds(c);
  const { g, W, D, H, P, fall, sL, sR, rise, trim, head, dw } = m;
  const front = H - fall;
  const top = Math.max(sL ?? trim, sR ?? trim, H + D + rise) + 10;
  const left = -18;
  const right = W + 18;
  const VW = 380;
  const sc = Math.min((VW - 80) / (right - left), 300 / (top + 6));
  const ox = (VW - (right - left) * sc) / 2 - left * sc;
  const oy = 34 + top * sc;
  const X = (x: number) => ox + x * sc;
  const Y = (z: number) => oy - z * sc;
  const VH = oy + 34;
  const posts = c.support === "posts" ? c.posts : [];
  const n = posts.length;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" role="img" aria-label={t("cn_front")} style={{ display: "block", background: "#fff" }}>
      <rect x={X(left)} y={Y(top)} width={(right - left) * sc} height={top * sc} fill={INK.wallFill} stroke={INK.wall} />
      <line x1={X(left) - 6} y1={Y(0)} x2={X(right) + 6} y2={Y(0)} stroke={INK.ground} strokeWidth={1.6} />

      {/* Trim line, end to end — sloped if the ends disagree */}
      <line x1={X(left)} y1={Y(sL ?? trim)} x2={X(right)} y2={Y(sR ?? trim)} stroke={r.trim ? INK.red : INK.wall} strokeWidth={3} />
      <text x={X(left) + 2} y={Y(sL ?? trim) - 5} fontSize={11} fontWeight={600} fill={INK.dim}>{lbl(sL)}</text>
      <text x={X(right) - 2} y={Y(sR ?? trim) - 5} fontSize={11} fontWeight={600} fill={INK.dim} textAnchor="end">{lbl(sR)}</text>

      {/* Door */}
      {hasDoor(c) && c.door.swing && c.door.swing !== "none" && (() => {
        const w = dw ?? 36;
        const h = head ?? 80;
        return (
          <g>
            <rect x={X(W / 2 - w / 2)} y={Y(h)} width={w * sc} height={h * sc} fill="#fff" stroke={r.door ? INK.red : INK.wall} />
            <Caption x={X(W / 2)} y={Y(h / 2)} anchor="middle">{t("cn_dwg_door")}</Caption>
          </g>
        );
      })()}

      {/* Tie rods / brackets seen from the front */}
      {c.support === "tie_rods" && [1, W - 1].map((x) => <line key={x} x1={X(x)} y1={Y(H + D + rise)} x2={X(x)} y2={Y(front + D)} stroke={INK.steel} strokeWidth={2} />)}
      {c.support === "brackets" && [1, W - 1].map((x) => <line key={x} x1={X(x)} y1={Y(H - Math.min(P * 0.75, 36))} x2={X(x)} y2={Y(H)} stroke={INK.steel} strokeWidth={3} />)}

      {/* Fascia (front edge) */}
      <rect x={X(0)} y={Y(front + D)} width={W * sc} height={D * sc} fill={INK.steelFill} stroke={INK.steel} strokeWidth={1.6} />
      {c.gutter === "front" && <rect x={X(0)} y={Y(front)} width={W * sc} height={Math.max(3, (num(c.gutterDrop) ?? 3) * sc)} fill="#fff" stroke={INK.steel} />}
      {c.gutter && c.gutter !== "none" && c.downspout && (
        <line x1={X(c.downspout === "left" ? 2 : W - 2)} y1={Y(front)} x2={X(c.downspout === "left" ? 2 : W - 2)} y2={Y(0)} stroke={INK.water} strokeWidth={3} />
      )}

      {/* Posts, each with its own height from its own grade */}
      {posts.map((p, i) => {
        const x = n === 1 ? W / 2 : 2 + ((W - 4) * i) / (n - 1);
        const h = num(p.height);
        const hh = h ?? front;
        const base = front - hh;
        return (
          <g key={p.id}>
            <rect x={X(x) - 2 * sc} y={Y(front)} width={4 * sc} height={hh * sc} fill={INK.steelFill} stroke={INK.steel} />
            {base !== 0 && <line x1={X(x) - 10} y1={Y(base)} x2={X(x) + 10} y2={Y(base)} stroke={INK.ground} strokeWidth={1.4} />}
            <text x={X(x)} y={Y(Math.min(0, base)) + 14} fontSize={11} fontWeight={700} fill={INK.text} textAnchor="middle">{p.label || `P${i + 1}`}</text>
            <text x={X(x)} y={Y(Math.min(0, base)) + 27} fontSize={11} fontWeight={600} fill={INK.dim} textAnchor="middle" style={{ fontVariantNumeric: "tabular-nums" }}>{lbl(h)}</text>
          </g>
        );
      })}

      <HDim y={Y(top) + 2} x1={X(0)} x2={X(W)} text={lbl(g.width)} />
      {n === 0 && (() => {
        // Underside at the front, less a front gutter: what you walk under.
        const gd = c.gutter === "front" ? num(c.gutterDrop) ?? 0 : 0;
        return <VDim x={X(W) + 10} y1={Y(0)} y2={Y(front - gd)} text={lbl(g.front === null ? null : g.front - gd)} color={r.headroom ? INK.red : INK.dim} />;
      })()}
    </svg>
  );
}

// ---- Skylight -------------------------------------------------------------------

function SkylightSection({ c, lang }: { c: CanopyData; lang: string }) {
  const t = (k: string) => mt(lang, k);
  const g = canopyGeometry(c);
  const L = g.projection && g.projection > 0 ? g.projection : 48;
  const curb = num(c.curb) ?? 6;
  const VW = 380;
  const sc = Math.min(260 / L, 140 / (curb + 20));
  const ox = (VW - L * sc) / 2;
  const oy = 120;
  const fall = g.fall ?? 0;
  const tilt = Math.atan2(fall * sc, L * sc);
  const r = reds(c);
  return (
    <svg viewBox={`0 0 ${VW} 190`} width="100%" role="img" aria-label={t("cn_kind_skylight")} style={{ display: "block", background: "#fff" }}>
      <g transform={`rotate(${(tilt * 180) / Math.PI} ${ox} ${oy})`}>
        <line x1={ox - 30} y1={oy} x2={ox + L * sc + 30} y2={oy} stroke={INK.ground} strokeWidth={2} />
        <Caption x={ox - 28} y={oy + 14}>{t("cn_dwg_roof")}</Caption>
        <rect x={ox} y={oy - curb * sc} width={L * sc} height={curb * sc} fill={INK.wallFill} stroke={INK.wall} />
        <rect x={ox - 4} y={oy - curb * sc - 6} width={L * sc + 8} height={6} fill={INK.steelFill} stroke={INK.steel} strokeWidth={1.6} />
        {c.roof !== "open" && <line x1={ox} y1={oy - curb * sc - 8} x2={ox + L * sc} y2={oy - curb * sc - 8} stroke={INK.roof} strokeWidth={3} />}
        <VDim x={ox + L * sc + 14} y1={oy} y2={oy - curb * sc} text={lbl(num(c.curb))} />
      </g>
      <HDim y={26} x1={ox} x2={ox + L * sc} text={`${lbl(g.projection)} × ${lbl(g.width)}`} />
      {sheds(c) && <text x={VW / 2} y={180} fontSize={11} fontWeight={700} fill={r.slope ? INK.red : INK.water} textAnchor="middle">{fmtSlope(g.slopePerFt, t("cn_perFt"))}</text>}
    </svg>
  );
}

