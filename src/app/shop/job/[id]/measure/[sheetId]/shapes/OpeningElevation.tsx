"use client";

// Front elevation of one opening: the hole in the wall with its three widths,
// three heights and both diagonals dimensioned where they were taken. The
// measurement that governs fabrication is the filled pill, the diagonals are
// coloured by how far out of square the hole is, and tapping any number jumps
// to its field.

import { parseMeas } from "@/lib/shop/measure-parse";
import { mt } from "@/lib/shop/measure-i18n";
import {
  OPENING_DOOR_PRODUCTS,
  openingFabSize,
  openingSquareness,
  type OpeningData,
  type OpeningProduct,
  type OpeningUnit,
} from "@/lib/shop/measure-opening";
import type { CheckLevel } from "@/lib/shop/measure-checks";
import { useShopAppearance } from "../../../../../ShopAppearance";

export type OpeningField = "wTop" | "wMid" | "wBot" | "hLeft" | "hCenter" | "hRight" | "diagA" | "diagB";

const LIGHT = {
  wall: "#eef1f5", brick: "#dde2ea", hole: "#ffffff", glass: "#f5f7ff", line: "#334155",
  dim: "#94a3b8", pill: "#ffffff", pillLine: "#cbd5e1", text: "#0f172a", miss: "#94a3b8",
  gov: "#4f46e5", govText: "#ffffff", ghost: "#c7cdd8", sill: "#cfd5df",
};
const DARK = {
  wall: "#232933", brick: "#2e3542", hole: "#161a20", glass: "#1a1f29", line: "#cbd5e1",
  dim: "#6b7688", pill: "#1c2027", pillLine: "#3d4656", text: "#f4f6fa", miss: "#7c8799",
  gov: "#6366f1", govText: "#ffffff", ghost: "#3d4656", sill: "#3a4251",
};
const LEVEL: Record<CheckLevel, string> = { green: "#16a34a", yellow: "#d97706", red: "#dc2626", na: "" };

export default function OpeningElevation({
  opening,
  unit,
  lang,
  light = false,
  onPick,
  active,
}: {
  opening: OpeningData;
  unit: OpeningUnit;
  lang: string;
  light?: boolean;
  onPick?: (field: OpeningField) => void;
  active?: OpeningField | null;
}) {
  const appearance = useShopAppearance();
  const c = light || appearance !== "dark" ? LIGHT : DARK;
  const W = 360;
  const H = 316;

  // Proportioned from the numbers when there are numbers, never to scale.
  const w = parseMeas(unit.wMid) ?? parseMeas(unit.wTop) ?? parseMeas(unit.wBot);
  const h = parseMeas(unit.hCenter) ?? parseMeas(unit.hLeft) ?? parseMeas(unit.hRight);
  const isDoor = !!opening.product && OPENING_DOOR_PRODUCTS.includes(opening.product as OpeningProduct);
  let r = w && h ? w / h : isDoor ? 0.48 : 0.8;
  r = Math.min(2.4, Math.max(0.38, r));
  const maxW = 214;
  const maxH = 196;
  let bw = maxW;
  let bh = maxW / r;
  if (bh > maxH) { bh = maxH; bw = maxH * r; }
  const cx = W / 2;
  const cy = 158;
  const L = cx - bw / 2;
  const R = cx + bw / 2;
  const T = cy - bh / 2;
  const B = cy + bh / 2;

  const fab = openingFabSize(opening, unit);
  const sq = openingSquareness(unit);
  const governs = (k: OpeningField) => !!fab && (fab.widthFrom === k || fab.heightFrom === k);

  const pill = (k: OpeningField, x: number, y: number, caption?: string) => {
    const raw = unit[k].trim();
    const has = raw !== "";
    const text = has ? (/["'°]$/.test(raw) ? raw : `${raw}"`) : "—";
    const gov = governs(k);
    const diag = k === "diagA" || k === "diagB";
    const lvl = diag ? sq.diagLevel : "na";
    const tw = Math.max(30, text.length * 6.6 + (caption ? 16 : 0) + 14);
    const on = active === k;
    return (
      <g
        key={k}
        role={onPick ? "button" : undefined}
        aria-label={`${caption ?? ""} ${text}`}
        onClick={onPick ? () => onPick(k) : undefined}
        style={{ cursor: onPick ? "pointer" : undefined }}
      >
        {/* generous invisible hit area for a thumb */}
        {onPick && <rect x={x - tw / 2 - 6} y={y - 16} width={tw + 12} height={32} fill="transparent" />}
        {/* the number being measured right now glows */}
        {on && <rect x={x - tw / 2 - 5} y={y - 15} width={tw + 10} height={30} rx={15} fill={c.gov} opacity={0.18} />}
        <rect
          x={x - tw / 2}
          y={y - 10}
          width={tw}
          height={20}
          rx={10}
          fill={gov ? c.gov : c.pill}
          stroke={on ? c.gov : gov ? c.gov : lvl !== "na" ? LEVEL[lvl] : c.pillLine}
          strokeWidth={on ? 2.2 : 1.2}
          strokeDasharray={has || on ? undefined : "3 2"}
        />
        {caption && (
          <text x={x - tw / 2 + 9} y={y + 4} fontSize={9} fontWeight={700} fill={gov ? c.govText : c.dim}>
            {caption}
          </text>
        )}
        <text
          x={x + (caption ? 8 : 0)}
          y={y + 4}
          fontSize={11.5}
          fontWeight={700}
          textAnchor="middle"
          fill={gov ? c.govText : has ? c.text : c.miss}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {text}
        </text>
      </g>
    );
  };

  const hDim = (y: number, x1: number, x2: number) => (
    <g stroke={c.dim} strokeWidth={1}>
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <path d={`M ${x1} ${y - 4} L ${x1} ${y + 4} M ${x2} ${y - 4} L ${x2} ${y + 4}`} />
      <path d={`M ${x1 + 6} ${y - 3} L ${x1} ${y} L ${x1 + 6} ${y + 3} M ${x2 - 6} ${y - 3} L ${x2} ${y} L ${x2 - 6} ${y + 3}`} fill="none" />
    </g>
  );
  const vDim = (x: number, y1: number, y2: number) => (
    <g stroke={c.dim} strokeWidth={1}>
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <path d={`M ${x - 4} ${y1} L ${x + 4} ${y1} M ${x - 4} ${y2} L ${x + 4} ${y2}`} />
      <path d={`M ${x - 3} ${y1 + 6} L ${x} ${y1} L ${x + 3} ${y1 + 6} M ${x - 3} ${y2 - 6} L ${x} ${y2} L ${x + 3} ${y2 - 6}`} fill="none" />
    </g>
  );

  // Brick courses around the hole — the wall reads as a wall at a glance.
  const wallPad = 30;
  const wx1 = L - wallPad - 26;
  const wx2 = R + wallPad + 26;
  const wy1 = T - wallPad - 4;
  const wy2 = B + 18;
  const courses: React.ReactNode[] = [];
  for (let y = wy1 + 9, row = 0; y < wy2; y += 9, row++) {
    courses.push(<line key={`c${y}`} x1={wx1} y1={y} x2={wx2} y2={y} />);
    for (let x = wx1 + (row % 2 ? 9 : 0); x < wx2; x += 18) {
      courses.push(<line key={`j${x}-${y}`} x1={x} y1={y - 9} x2={x} y2={y} />);
    }
  }

  const diagColor = sq.diagLevel === "na" ? c.dim : LEVEL[sq.diagLevel];
  const product = opening.product;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={{ maxHeight: 420 }} role="img"
      aria-label={mt(lang, "elevationOpening")}>
      <defs>
        <clipPath id={`wall-${unit.id}`}>
          <rect x={wx1} y={wy1} width={wx2 - wx1} height={wy2 - wy1} rx={6} />
        </clipPath>
      </defs>
      <g clipPath={`url(#wall-${unit.id})`}>
        <rect x={wx1} y={wy1} width={wx2 - wx1} height={wy2 - wy1} fill={c.wall} />
        <g stroke={c.brick} strokeWidth={1}>{courses}</g>
      </g>

      {/* the opening */}
      <rect x={L} y={T} width={bw} height={bh} fill={c.glass} stroke={c.line} strokeWidth={2.2} />

      {/* what goes in it, faint so the numbers lead */}
      <g stroke={c.ghost} strokeWidth={1.4} fill="none">
        {isDoor ? (
          <>
            <rect x={L + 7} y={T + 7} width={bw - 14} height={bh - 7} />
            <circle cx={opening.lockSide === "left" || (opening.lockSide === "" && opening.doorHinge === "right") ? L + 18 : R - 18} cy={cy + 6} r={3} />
          </>
        ) : product === "juliet" ? (
          <>
            <line x1={L + 4} y1={B - bh * 0.42} x2={R - 4} y2={B - bh * 0.42} strokeWidth={2.4} />
            {Array.from({ length: 9 }, (_, i) => (
              <line key={i} x1={L + 8 + (i * (bw - 16)) / 8} y1={B - bh * 0.42} x2={L + 8 + (i * (bw - 16)) / 8} y2={B - 4} />
            ))}
          </>
        ) : product ? (
          Array.from({ length: 7 }, (_, i) => (
            <line key={i} x1={L + ((i + 1) * bw) / 8} y1={T + 4} x2={L + ((i + 1) * bw) / 8} y2={B - 4} />
          ))
        ) : null}
      </g>

      {/* sill / threshold */}
      <rect x={L - 10} y={B} width={bw + 20} height={6} rx={1.5} fill={c.sill} />

      {/* diagonals */}
      <g stroke={diagColor} strokeWidth={1.3} strokeDasharray="5 4" opacity={0.9}>
        <line x1={L} y1={T} x2={R} y2={B} />
        <line x1={R} y1={T} x2={L} y2={B} />
      </g>

      {/* widths: top above, middle across, bottom below the sill */}
      {hDim(T - 16, L, R)}
      {hDim(cy, L, R)}
      {hDim(B + 26, L, R)}
      {/* heights: left and right outside, centre down the middle */}
      {vDim(L - 18, T, B)}
      {vDim(cx, T, B)}
      {vDim(R + 18, T, B)}

      {/* staggered so the two never collide, however narrow the opening */}
      {pill("diagA", L + bw * 0.2, T + bh * 0.2, "A")}
      {pill("diagB", R - bw * 0.36, T + bh * 0.36, "B")}
      {pill("wTop", cx, T - 16)}
      {pill("wMid", bw < 160 ? cx : L + bw * 0.27, cy)}
      {pill("wBot", cx, B + 26)}
      {pill("hLeft", L - 18, cy)}
      {pill("hCenter", cx, T + bh * 0.76)}
      {pill("hRight", R + 18, cy)}
    </svg>
  );
}
