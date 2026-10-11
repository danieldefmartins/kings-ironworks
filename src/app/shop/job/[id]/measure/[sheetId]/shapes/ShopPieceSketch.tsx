"use client";

// Front and side view of a shop piece, drawn from its sizes.
//
// In a niche: the niche outline with every reading where it was taken (top,
// front, bottom, back; left, right, back; top and bottom depth), the tightest
// one highlighted, and the piece inside it at the fabricate-to size. Anything
// else: the piece at its design size. The infill follows the item type (rack
// lattice, grille bars, shelves, legs) so the sheet reads at a glance.

import { parseMeas } from "@/lib/shop/measure-parse";
import { mt } from "@/lib/shop/measure-i18n";
import { spFabSize, type ShopPiece, type ShopPieceData } from "@/lib/shop/measure-shop-piece";
import { useBoxWidth, useMeasFmt, type Fmt } from "./MeasureFormKit";

const INK = { steel: "#4f46e5", steelFill: "#eef0ff", dim: "#475569", text: "#0f172a", muted: "#64748b", red: "#dc2626", niche: "#94a3b8", nicheFill: "#f1f5f9", gov: "#b45309" };
const TYP = { w: 36, h: 30, d: 14 };

function Label({ x, y, text, color = INK.text, bold = false, size = 13, anchor = "middle", rotate }: { x: number; y: number; text: string; color?: string; bold?: boolean; size?: number; anchor?: "start" | "middle" | "end"; rotate?: boolean }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={bold ? 700 : 500} fill={color} stroke="#fff" strokeWidth={3} paintOrder="stroke"
      transform={rotate ? `rotate(-90 ${x} ${y})` : undefined} style={{ fontVariantNumeric: "tabular-nums" }}>
      {text}
    </text>
  );
}

function Tick({ id }: { id: string }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M2 8L8 2" stroke={INK.dim} strokeWidth="1.4" />
    </marker>
  );
}

const v = (fm: Fmt, s: string) => { const n = parseMeas(s); return n === null ? "—" : fm(n); };

/** Type-specific infill inside a W×H frame drawn at (x, y). */
function Infill({ type, x, y, w, h }: { type: string; x: number; y: number; w: number; h: number }) {
  const s = { stroke: INK.steel, strokeWidth: 1.6, fill: "none" };
  switch (type) {
    case "wine_rack": {
      const n = Math.max(2, Math.round(w / 26));
      const d = w / n;
      const lines = [];
      for (let i = -n; i <= n * 2; i++) {
        lines.push(<line key={`a${i}`} x1={x + i * d} y1={y + h} x2={x + i * d + h} y2={y} {...s} strokeWidth={1.1} />);
        lines.push(<line key={`b${i}`} x1={x + i * d} y1={y} x2={x + i * d + h} y2={y + h} {...s} strokeWidth={1.1} />);
      }
      return <svg x={x} y={y} width={Math.max(w, 1)} height={Math.max(h, 1)} viewBox={`${x} ${y} ${Math.max(w, 1)} ${Math.max(h, 1)}`} overflow="hidden">{lines}</svg>;
    }
    case "grille": {
      const n = Math.max(3, Math.round(w / 14));
      return <g>{Array.from({ length: n - 1 }, (_, i) => <line key={i} x1={x + ((i + 1) * w) / n} x2={x + ((i + 1) * w) / n} y1={y} y2={y + h} {...s} />)}<line x1={x} x2={x + w} y1={y + h / 2} y2={y + h / 2} {...s} /></g>;
    }
    case "shelf_frame": {
      const n = Math.max(2, Math.round(h / 40));
      return <g>{Array.from({ length: n - 1 }, (_, i) => <line key={i} x1={x} x2={x + w} y1={y + ((i + 1) * h) / n} y2={y + ((i + 1) * h) / n} {...s} strokeWidth={2.4} />)}</g>;
    }
    case "bar_frame":
    case "counter_frame":
    case "furniture_base":
      return <g><line x1={x} x2={x + w} y1={y + h * 0.82} y2={y + h * 0.82} {...s} />{w > 120 && <line x1={x + w / 2} x2={x + w / 2} y1={y} y2={y + h} {...s} />}</g>;
    case "bracket":
    case "sign_bracket":
      return <line x1={x} y1={y + h} x2={x + w} y2={y} {...s} strokeWidth={2.2} />;
    default:
      return null;
  }
}

export default function ShopPieceSketch({ d, piece, lang }: { d: ShopPieceData | null; piece: ShopPiece | null; lang: string }) {
  const fm = useMeasFmt();
  const t = (k: string) => mt(lang, k);
  const [box, boxW] = useBoxWidth(680);
  if (!d || !piece) return null;
  const f = spFabSize(d, piece);
  const niche = f.niche;
  const bracketLike = piece.type === "bracket" || piece.type === "sign_bracket";
  // Niche envelope: the largest readings, so every reading fits on the drawing.
  const nums = (ks: string[]) => ks.map((k) => parseMeas((piece as unknown as Record<string, string>)[k])).filter((n): n is number => n !== null && n > 0);
  const nW = niche ? Math.max(...nums(["wBack", "wFront", "wTop", "wBottom"]), 0) || TYP.w + 1 : null;
  const nH = niche ? Math.max(...nums(["hLeft", "hRight", "hBack"]), 0) || TYP.h + 1 : null;
  const nD = niche ? Math.max(...nums(["dTop", "dBottom"]), 0) || TYP.d + 1 : null;
  const pw = f.width ?? (nW !== null ? nW - 0.5 : TYP.w);
  const ph = f.height ?? (nH !== null ? nH - 0.25 : TYP.h);
  const pd = f.depth ?? (nD !== null ? nD - 0.25 : TYP.d);
  const W0 = nW ?? pw, H0 = nH ?? ph, D0 = nD ?? pd;

  // Front view left, side view right, one scale.
  const VW = boxW, narrow = VW < 480, MX = narrow ? 34 : 60, MT = 46, GAP = narrow ? 66 : 92, MB = 58;
  const s = Math.min((VW - 2 * MX - GAP - 30) / (W0 + D0), Math.min(300, VW * 0.75) / H0, 8);
  const VH = MT + H0 * s + MB;
  const fx = MX, sxv = MX + W0 * s + GAP, base = MT + H0 * s;
  const c = f.clearance * s;
  const gov = (k?: string) => (k ? INK.gov : INK.dim);
  const sized = f.width !== null && f.height !== null && f.depth !== null;

  return (
    <div ref={box}>
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" role="img" aria-label={t("sp_drawing")} style={{ display: "block", background: "#fff" }}>
      <defs><Tick id="spt" /></defs>
      {/* ---- front ---- */}
      <Label x={fx + (W0 * s) / 2} y={20} text={t("sp_front")} size={13} bold color={INK.muted} />
      {niche && <rect x={fx} y={base - H0 * s} width={W0 * s} height={H0 * s} fill={INK.nicheFill} stroke={INK.niche} strokeWidth={2} />}
      <g>
        {bracketLike ? (
          <path d={`M${fx + (niche ? c : 0)} ${base - ph * s} h${pw * s} M${fx + (niche ? c : 0)} ${base - ph * s} v${ph * s}`} stroke={INK.steel} strokeWidth={6} fill="none" strokeLinecap="square" />
        ) : (
          <rect x={fx + (niche ? c : 0)} y={base - ph * s} width={pw * s} height={ph * s} fill={INK.steelFill} stroke={INK.steel} strokeWidth={5} strokeDasharray={sized ? undefined : "8 5"} />
        )}
        <Infill type={piece.type} x={fx + (niche ? c : 0) + 2.5} y={base - ph * s + 2.5} w={pw * s - 5} h={ph * s - 5} />
      </g>
      {/* niche readings where they were taken */}
      {niche && (
        <g>
          <Label x={fx + (W0 * s) / 2} y={base - H0 * s - 8} size={12} color={f.from.w === "wTop" ? INK.gov : INK.muted} text={`${t("sp_r_wTop")} ${v(fm, piece.wTop)}`} />
          <Label x={fx + (W0 * s) / 2} y={base + 16} size={12} color={f.from.w === "wBottom" ? INK.gov : INK.muted} text={`${t("sp_r_wBottom")} ${v(fm, piece.wBottom)}`} />
          <Label x={fx - 10} y={base - (H0 * s) / 2} size={12} rotate color={f.from.h === "hLeft" ? INK.gov : INK.muted} text={`${t("sp_r_hLeft")} ${v(fm, piece.hLeft)}`} />
          <Label x={fx + W0 * s + 18} y={base - (H0 * s) / 2} size={12} rotate color={f.from.h === "hRight" ? INK.gov : INK.muted} text={`${t("sp_r_hRight")} ${v(fm, piece.hRight)}`} />
        </g>
      )}
      {/* build size */}
      <line x1={fx + (niche ? c : 0)} x2={fx + (niche ? c : 0) + pw * s} y1={base + 32} y2={base + 32} stroke={gov(f.from.w)} strokeWidth={1.3} markerStart="url(#spt)" markerEnd="url(#spt)" />
      <Label x={fx + (niche ? c : 0) + (pw * s) / 2} y={base + 50} bold color={f.width === null ? INK.muted : INK.steel} text={`W ${fm(f.width)}`} />

      {/* ---- side ---- */}
      <Label x={sxv + (D0 * s) / 2} y={20} text={t("sp_side")} size={13} bold color={INK.muted} />
      {niche && <rect x={sxv} y={base - H0 * s} width={D0 * s} height={H0 * s} fill={INK.nicheFill} stroke={INK.niche} strokeWidth={2} />}
      {niche && <line x1={sxv + D0 * s} x2={sxv + D0 * s} y1={base - H0 * s} y2={base} stroke={INK.niche} strokeWidth={5} />}
      <rect x={sxv} y={base - ph * s} width={pd * s} height={ph * s} fill={INK.steelFill} stroke={INK.steel} strokeWidth={5} strokeDasharray={sized ? undefined : "8 5"} />
      {niche && (
        <g>
          <Label x={sxv + (D0 * s) / 2} y={base - H0 * s - 8} size={12} color={f.from.d === "dTop" ? INK.gov : INK.muted} text={`${t("sp_r_dTop")} ${v(fm, piece.dTop)}`} />
          <Label x={sxv + (D0 * s) / 2} y={base + 16} size={12} color={f.from.d === "dBottom" ? INK.gov : INK.muted} text={`${t("sp_r_dBottom")} ${v(fm, piece.dBottom)}`} />
          <Label x={sxv + (D0 * s) / 2 + 5} y={base - (H0 * s) / 2} size={12} rotate color={f.from.h === "hBack" ? INK.gov : INK.muted} text={`${t("sp_r_hBack")} ${v(fm, piece.hBack)}`} />
        </g>
      )}
      <line x1={sxv} x2={sxv + pd * s} y1={base + 32} y2={base + 32} stroke={gov(f.from.d)} strokeWidth={1.3} markerStart="url(#spt)" markerEnd="url(#spt)" />
      <Label x={sxv + (pd * s) / 2} y={base + 50} bold color={f.depth === null ? INK.muted : INK.steel} text={`D ${fm(f.depth)}`} />
      {/* height between the views */}
      <line x1={sxv + D0 * s + 16} x2={sxv + D0 * s + 16} y1={base - ph * s} y2={base} stroke={gov(f.from.h)} strokeWidth={1.3} markerStart="url(#spt)" markerEnd="url(#spt)" />
      <Label x={sxv + D0 * s + 34} y={base - (ph * s) / 2} rotate bold color={f.height === null ? INK.muted : INK.steel} text={`H ${fm(f.height)}`} />
      {/* floor */}
      <line x1={fx - 20} x2={sxv + D0 * s + 30} y1={base} y2={base} stroke="#334155" strokeWidth={1.4} />
    </svg>
    </div>
  );
}
