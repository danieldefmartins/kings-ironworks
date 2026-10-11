"use client";

// Drawings for a wall-cap railing sheet, made from the measurements:
//
//   WallCapElevation  the wall unrolled run after run: cap top as measured
//                     (steps and slopes), corners with their turn, posts on the
//                     cap and the rail (raked follows the cap, stepped stays
//                     level post to post), each run's length and each post's
//                     top of cap. Deep drops are drawn broken.
//   CapSection        a cut through the cap at one post: cap width, the core
//                     and its edge distance to each face (red under 3"), the
//                     walking side and the drop side, rail height and the
//                     guard height a person on the high side gets.
//
// Missing values draw at a typical size and read "—".

import { parseMeas } from "@/lib/shop/measure-parse";
import { mt } from "@/lib/shop/measure-i18n";
import {
  guardHeight,
  plateWidth,
  postStations,
  postsOf,
  cornerTop,
  runRise,
  runTag,
  signedMeas,
  WC_TOL,
  type WallCapData,
  type WallCapPost,
} from "@/lib/shop/measure-wall-cap";
import { useBoxWidth, useMeasFmt, type Fmt } from "./MeasureFormKit";

const INK = { steel: "#4f46e5", steelFill: "#e0e7ff", dim: "#475569", text: "#0f172a", muted: "#64748b", red: "#dc2626", amber: "#b45309", cap: "#475569", wall: "#94a3b8", ground: "#334155" };
const TYP = { run: 96, rail: 36, drop: 36, cap: 8 };

function Defs({ p }: { p: string }) {
  return (
    <defs>
      <pattern id={`${p}-concrete`} width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="12" fill="#eceef1" />
        <circle cx="3" cy="4" r="0.8" fill="#a3acb9" />
        <circle cx="9" cy="9" r="0.6" fill="#a3acb9" />
      </pattern>
      <pattern id={`${p}-brick`} width="16" height="8" patternUnits="userSpaceOnUse">
        <rect width="16" height="8" fill="#fbe9e2" />
        <path d="M0 0.5H16M0 4.5H16M4 0.5V4.5M12 4.5V8.5" stroke="#d6a594" strokeWidth="0.8" fill="none" />
      </pattern>
      <pattern id={`${p}-stone`} width="22" height="14" patternUnits="userSpaceOnUse">
        <rect width="22" height="14" fill="#efece6" />
        <path d="M0 6c5-1 8 1 12 0s7-2 10 0M8 6v8M16 0v6" stroke="#b5ab9b" strokeWidth="0.8" fill="none" />
      </pattern>
      <pattern id={`${p}-block`} width="20" height="10" patternUnits="userSpaceOnUse">
        <rect width="20" height="10" fill="#eef1f5" />
        <path d="M0 0.5H20M0 5.5H20M10 0.5V5.5" stroke="#a7b1c0" strokeWidth="0.8" fill="none" />
      </pattern>
      <pattern id={`${p}-wood`} width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#f6ecd9" />
        <path d="M0 3c3 1 7-1 10 0M0 8c3 1 7-1 10 0" stroke="#cfb48a" strokeWidth="0.7" fill="none" />
      </pattern>
      <pattern id={`${p}-ground`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <path d="M0 0V8" stroke="#94a3b8" strokeWidth="1" />
      </pattern>
      <marker id={`${p}-tick`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M2 8L8 2" stroke={INK.dim} strokeWidth="1.4" />
      </marker>
    </defs>
  );
}

function fill(p: string, m: string): string {
  if (m === "brick") return `url(#${p}-brick)`;
  if (m === "stone") return `url(#${p}-stone)`;
  if (m === "block") return `url(#${p}-block)`;
  if (m === "wood") return `url(#${p}-wood)`;
  return `url(#${p}-concrete)`;
}

function Label({ x, y, text, color = INK.text, bold = false, size = 13, anchor = "middle", rotate = false }: { x: number; y: number; text: string; color?: string; bold?: boolean; size?: number; anchor?: "start" | "middle" | "end"; rotate?: boolean }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={bold ? 700 : 500} fill={color} stroke="#fff" strokeWidth={3} paintOrder="stroke"
      transform={rotate ? `rotate(-90 ${x} ${y})` : undefined} style={{ fontVariantNumeric: "tabular-nums" }}>
      {text}
    </text>
  );
}

const len = (fm: Fmt, s: string) => (parseMeas(s) === null ? "—" : fm(parseMeas(s)));
/** Rough width of a label in px (system UI font, tabular figures). */
const textW = (s: string, size = 13) => s.length * size * 0.56;
const tocText = (fm: Fmt, top: string) => { const n = signedMeas(top); return n === null ? "—" : `${n < 0 ? "−" : "+"}${fm(Math.abs(n))}`; };

type Pt = { x: number; z: number | null; mark: string; run: number; post: WallCapPost };
/** Runs laid end to end along x (inches), each post at its station. */
function unrollRuns(w: WallCapData, marks: string[]) {
  const out: { x0: number; x1: number; pts: Pt[]; r: WallCapData["runs"][number]; ri: number; measured: boolean }[] = [];
  let k = 0, x0 = 0;
  w.runs.forEach((r, ri) => {
    const L = parseMeas(r.length) ?? TYP.run;
    const st = postStations(r, ri > 0);
    const pts: Pt[] = r.posts.map((p, pi) => ({ x: x0 + Math.min(Math.max(st[pi], 0), L), z: signedMeas(p.top), mark: marks[k++], run: ri, post: p }));
    out.push({ x0, x1: x0 + L, pts, r, ri, measured: parseMeas(r.length) !== null });
    x0 += L;
  });
  return out;
}

/**
 * Elevation of the whole wall, unrolled. Drawn in screen pixels (the SVG takes
 * the width of its box) so labels stay readable on a phone. `red` = post marks
 * a check flagged red.
 */
export function WallCapElevation({ w, lang, red = [], focus, onPost }: { w: WallCapData | null; lang: string; red?: string[]; focus?: string | null; onPost?: (mark: string) => void }) {
  const fm = useMeasFmt();
  const t = (k: string) => mt(lang, k);
  const [box, W] = useBoxWidth(680);
  if (!w || !w.runs.length) return null;
  const P = "wce";
  const railRaw = parseMeas(w.railHeight);
  const railH = railRaw ?? TYP.rail;
  const dropRaw = parseMeas(w.drop);

  // Unroll: x along the wall, z elevation.
  const marks = postsOf(w);
  const runs = unrollRuns(w, marks.map((m) => m.mark));
  const x0 = runs.length ? runs[runs.length - 1].x1 : 0;
  const all = runs.flatMap((r) => r.pts);
  const knownZ = all.map((p) => p.z).filter((z): z is number => z !== null);
  const base = knownZ.length ? knownZ[0] : 0;
  // Unknown tops take the nearest known neighbour so the drawing never jumps.
  let last = base;
  for (const p of all) { if (p.z === null) p.z = last; else last = p.z; }
  const zAt = (rr: (typeof runs)[number], x: number): number => {
    const ps = rr.pts;
    const prev = rr.ri > 0 ? runs.slice(0, rr.ri).flatMap((q) => q.pts).at(-1) : undefined;
    const chain = prev ? [{ ...prev, x: rr.x0 }, ...ps] : ps;
    if (!chain.length) return last;
    if (x <= chain[0].x) return chain[0].z!;
    for (let i = 1; i < chain.length; i++) if (x <= chain[i].x) { const a = chain[i - 1], b = chain[i]; return b.x === a.x ? b.z! : a.z! + ((b.z! - a.z!) * (x - a.x)) / (b.x - a.x); }
    return chain[chain.length - 1].z!;
  };
  const zMin = Math.min(...all.map((p) => p.z!), base), zMax = Math.max(...all.map((p) => p.z!), base);
  const shownDrop = Math.min(dropRaw ?? TYP.drop, Math.max(railH * 1.1, 30));
  const broken = (dropRaw ?? 0) > shownDrop + 0.5;
  const total = x0;

  const ML = 40, MR = 40, MT = 52, MB = 66;
  const sx = (W - ML - MR) / total;
  const zRange = zMax + railH - (zMin - shownDrop);
  const sy = Math.min(sx * 4, Math.min(260, Math.max(170, W * 0.36)) / zRange);
  const H = MT + zRange * sy + MB;
  const X = (x: number) => ML + x * sx;
  const Z = (z: number) => MT + (zMax + railH - z) * sy;
  const groundZ = zMin - shownDrop;
  // Posts closer than a label is wide get their top-of-cap figure on its side.
  const gaps = all.map((p, i) => Math.min(i > 0 ? X(p.x) - X(all[i - 1].x) : 999, i < all.length - 1 ? X(all[i + 1].x) - X(p.x) : 999));
  const tight = gaps.some((g, i) => g < textW(tocText(fm, all[i].post.top), 12) + 6);

  // Wall outline: cap tops along every run, then the ground.
  const capPts: [number, number][] = [];
  for (const rr of runs) {
    capPts.push([rr.x0, zAt(rr, rr.x0)]);
    for (const p of rr.pts) capPts.push([p.x, p.z!]);
    capPts.push([rr.x1, zAt(rr, rr.x1)]);
  }
  const wallPath = `M${X(0)} ${Z(groundZ)} ${capPts.map(([x, z]) => `L${X(x)} ${Z(z)}`).join(" ")} L${X(total)} ${Z(groundZ)} Z`;
  const capPath = capPts.map(([x, z], i) => `${i ? "L" : "M"}${X(x)} ${Z(z)}`).join(" ");
  const endZ = capPts[capPts.length - 1][1];

  return (
    <div ref={box}>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={t("wc_elevation")} style={{ display: "block", background: "#fff" }}>
      <Defs p={P} />
      {/* ground on the drop side */}
      <rect x={X(0) - 10} y={Z(groundZ)} width={X(total) - X(0) + 20} height={10} fill={`url(#${P}-ground)`} />
      <line x1={X(0) - 10} x2={X(total) + 10} y1={Z(groundZ)} y2={Z(groundZ)} stroke={INK.ground} strokeWidth={1.4} />
      <path d={wallPath} fill={fill(P, w.material)} stroke={INK.wall} strokeWidth={1} />
      {broken && <path d={`M${X(0) - 8} ${Z(groundZ) - 20} l7 -6 l6 12 l7 -6`} stroke={INK.muted} strokeWidth={1.4} fill="none" />}
      <path d={capPath} fill="none" stroke={INK.cap} strokeWidth={3.2} strokeLinejoin="round" />

      {/* corners */}
      {runs.slice(1).map((rr) => (
        <g key={`c${rr.ri}`}>
          <line x1={X(rr.x0)} x2={X(rr.x0)} y1={Z(zMax + railH) - 22} y2={Z(groundZ)} stroke={INK.muted} strokeDasharray="4 4" strokeWidth={1} />
          <Label x={X(rr.x0)} y={Z(zMax + railH) - 28} size={12} color={INK.muted}
            text={`${rr.r.turn.trim() ? `${parseMeas(rr.r.turn) ?? rr.r.turn}°` : "—°"}${rr.r.turnDir ? ` ${t(rr.r.turnDir === "left" ? "wc_leftShort" : "wc_rightShort")}` : ""}`} />
        </g>
      ))}

      {/* rail, carried round each corner from the last post before it */}
      {runs.map((rr) => {
        const prev = rr.ri > 0 ? runs.slice(0, rr.ri).flatMap((x) => x.pts).at(-1) : undefined;
        const chain = prev ? [prev, ...rr.pts] : rr.pts;
        if (chain.length < 2) return null;
        const sloped = (runRise(rr.r, cornerTop(w, rr.ri))?.rise ?? 0) > WC_TOL.slope;
        const pts: [number, number][] = [];
        chain.forEach((p, j) => {
          const z = p.z! + railH;
          if (rr.r.rail === "stepped" && j > 0) pts.push([p.x, pts[pts.length - 1][1]]);
          pts.push([p.x, z]);
        });
        const undecided = sloped && !rr.r.rail;
        return (
          <path key={`r${rr.ri}`} d={pts.map(([x, z], i) => `${i ? "L" : "M"}${X(x)} ${Z(z)}`).join(" ")} fill="none"
            stroke={undecided ? INK.red : INK.steel} strokeWidth={3} strokeDasharray={undecided || railRaw === null ? "7 5" : undefined} strokeLinejoin="round" />
        );
      })}

      {/* posts */}
      {all.map((p) => {
        const bad = red.includes(p.mark);
        const on = focus === p.mark;
        const c = bad ? INK.red : INK.steel;
        const top = Z(p.z! + railH), cap = Z(p.z!);
        return (
          <g key={p.mark} onClick={onPost ? () => onPost(p.mark) : undefined} style={onPost ? { cursor: "pointer" } : undefined}>
            {on && <rect x={X(p.x) - 14} y={top - 26} width={28} height={cap - top + 34} rx={9} fill={INK.steelFill} />}
            <rect x={X(p.x) - 2.5} y={top} width={5} height={cap - top} fill={c} rx={1} />
            <Label x={X(p.x)} y={top - 9} text={p.mark} bold color={c} size={13} />
            {tight ? (
              <Label x={X(p.x) + 4} y={cap + 8} anchor="end" rotate size={12} color={signedMeas(p.post.top) === null ? INK.muted : INK.text} text={tocText(fm, p.post.top)} />
            ) : (
              <Label x={X(p.x)} y={cap + 18} size={12} color={signedMeas(p.post.top) === null ? INK.muted : INK.text} text={tocText(fm, p.post.top)} />
            )}
            {onPost && <rect x={X(p.x) - 20} y={top - 28} width={40} height={cap - top + 40} fill="transparent" />}
          </g>
        );
      })}

      {/* rail height, left of the first post */}
      {all[0] && (
        <g>
          <line x1={X(all[0].x) - 16} x2={X(all[0].x) - 16} y1={Z(all[0].z! + railH)} y2={Z(all[0].z!)} stroke={INK.dim} strokeWidth={1.2} markerStart={`url(#${P}-tick)`} markerEnd={`url(#${P}-tick)`} />
          <Label x={X(all[0].x) - 22} y={Z(all[0].z! + railH / 2)} rotate size={12} bold color={railRaw === null ? INK.muted : INK.text} text={railRaw === null ? "—" : fm(railRaw)} />
        </g>
      )}

      {/* drop, right of the wall */}
      <g>
        <line x1={X(total) + 16} x2={X(total) + 16} y1={Z(endZ)} y2={Z(groundZ)} stroke={INK.dim} strokeWidth={1.2} markerStart={`url(#${P}-tick)`} markerEnd={`url(#${P}-tick)`} />
        <Label x={X(total) + 30} y={Z((endZ + groundZ) / 2)} rotate size={12} bold color={dropRaw === null ? INK.muted : INK.text} text={`${t("wc_dropShort")} ${dropRaw === null ? "—" : fm(dropRaw)}`} />
      </g>

      {/* run lengths: one line when it fits, two when the run is short */}
      {runs.map((rr) => {
        const width = X(rr.x1) - X(rr.x0);
        const head = `${runTag(rr.ri)} · ${len(fm, rr.r.length)}`;
        const style = rr.r.rail ? t(`wc_rail_${rr.r.rail}`) : "";
        const full = `${head}${style ? ` · ${style}` : ""}`;
        const lines = textW(full) < width - 6 ? [full] : textW(head) < width - 4 ? [head, style] : [runTag(rr.ri), len(fm, rr.r.length), style];
        const y = Z(groundZ) + 30;
        return (
          <g key={`d${rr.ri}`}>
            <line x1={X(rr.x0)} x2={X(rr.x1)} y1={y} y2={y} stroke={INK.dim} strokeWidth={1.2} markerStart={`url(#${P}-tick)`} markerEnd={`url(#${P}-tick)`} />
            {lines.filter(Boolean).map((line, i) => (
              <Label key={i} x={(X(rr.x0) + X(rr.x1)) / 2} y={y + 18 + i * 16} size={i ? 12 : 13} bold={!i && rr.measured} color={!i && rr.measured ? INK.text : INK.muted} text={line} />
            ))}
          </g>
        );
      })}
    </svg>
    </div>
  );
}

/** Section through the cap at one post. The cap is drawn to scale; the rail and the drop are broken. */
export function CapSection({ w, post, mark, lang }: { w: WallCapData; post: WallCapPost | null; mark?: string; lang: string }) {
  const fm = useMeasFmt();
  const t = (k: string) => mt(lang, k);
  const P = "wcs";
  const capRaw = parseMeas(post?.capWidth);
  const cap = capRaw ?? TYP.cap;
  const rail = parseMeas(w.railHeight);
  const walk = parseMeas(w.capAboveWalk) ?? 0;
  const drop = parseMeas(w.drop);
  const eh = parseMeas(post?.edgeHigh), el = parseMeas(post?.edgeLow);
  const dia = parseMeas(w.coreDia) ?? 2;
  const coreD = parseMeas(w.coreDepth) ?? 5;
  const lowRight = w.dropSide !== "left";
  const guard = guardHeight(w);
  const pw = w.mount === "plate" ? plateWidth(w.plateSize) : null;
  const core = w.mount === "core";
  const side = w.mount === "side_high" || w.mount === "side_low";

  // Scale so the cap reads about 130 px wide whatever its size.
  const s = Math.min(14, Math.max(6, 130 / cap));
  const W = 360, H = 330, cx = W / 2, capTop = 120;
  const half = (cap * s) / 2;
  const highX = lowRight ? cx - half : cx + half;
  const lowX = lowRight ? cx + half : cx - half;
  const toLow = lowRight ? 1 : -1;
  const walkY = capTop + Math.min(walk * s, 60);
  const wallBottom = H - 34;
  const postX = side ? (w.mount === "side_high" ? highX - toLow * 10 : lowX + toLow * 10) : eh !== null ? highX + toLow * eh * s : el !== null ? lowX - toLow * el * s : cx;
  const postW = Math.max(6, 1.5 * s);
  const postTop = 28;
  const postBottom = core ? capTop + coreD * s * 0.85 : side ? capTop + 46 : capTop - (w.mount === "plate" ? 5 : 0);
  const red = (e: number | null) => core && e !== null && e < WC_TOL.edgeMin;
  const edgeY = capTop - 18;
  const capDimY = capTop + (core ? coreD * s : 0) + 18;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={t("wc_section")} style={{ display: "block", background: "#fff" }}>
      <Defs p={P} />
      {/* walk side */}
      <line x1={highX - toLow * 150} x2={highX} y1={walkY} y2={walkY} stroke={INK.ground} strokeWidth={1.6} />
      <rect x={Math.min(highX - toLow * 150, highX)} y={walkY} width={150} height={9} fill={`url(#${P}-ground)`} />
      <Label x={highX - toLow * 10} y={walkY + 26} anchor={lowRight ? "end" : "start"} size={12} color={INK.muted} text={t("wc_walkSide")} />
      {/* drop side, broken */}
      <line x1={lowX} x2={lowX + toLow * 150} y1={wallBottom} y2={wallBottom} stroke={INK.ground} strokeWidth={1.6} />
      <rect x={Math.min(lowX, lowX + toLow * 150)} y={wallBottom} width={150} height={9} fill={`url(#${P}-ground)`} />
      <line x1={lowX + toLow * 40} x2={lowX + toLow * 40} y1={capTop} y2={wallBottom} stroke={INK.dim} strokeWidth={1.2} markerStart={`url(#${P}-tick)`} markerEnd={`url(#${P}-tick)`} />
      <Label x={lowX + toLow * 48} y={(capTop + wallBottom) / 2} anchor={lowRight ? "start" : "end"} size={12} bold color={drop === null ? INK.muted : INK.text} text={drop === null ? "—" : fm(drop)} />
      <Label x={lowX + toLow * 48} y={(capTop + wallBottom) / 2 + 17} anchor={lowRight ? "start" : "end"} size={12} color={INK.muted} text={t("wc_dropSide")} />
      {/* wall */}
      <path d={`M${cx - half} ${capTop} H${cx + half} V${wallBottom - 30} l${-half * 0.5} 9 l${-half * 0.9} -12 l${-half * 0.6} 9 Z`} fill={fill(P, post?.material || w.material)} stroke={INK.wall} />
      <line x1={cx - half} x2={cx + half} y1={capTop} y2={capTop} stroke={INK.cap} strokeWidth={3.2} />
      {/* core / plate / bracket */}
      {core && <rect x={postX - (dia * s) / 2} y={capTop} width={dia * s} height={coreD * s} fill="#fff" stroke={INK.muted} strokeDasharray="3 2" />}
      {w.mount === "plate" && <rect x={postX - ((pw ?? 4) * s) / 2} y={capTop - 5} width={(pw ?? 4) * s} height={5} fill={pw !== null && pw > cap ? INK.red : INK.steel} />}
      {side && <path d={`M${postX} ${capTop + 22}H${w.mount === "side_high" ? highX : lowX}`} stroke={INK.steel} strokeWidth={5} />}
      {/* post, broken above the cap */}
      <rect x={postX - postW / 2} y={postTop} width={postW} height={postBottom - postTop} fill={INK.steel} rx={1} />
      <path d={`M${postX - postW} ${postTop + 40} l${postW * 2} -7 M${postX - postW} ${postTop + 47} l${postW * 2} -7`} stroke="#fff" strokeWidth={3} />
      <Label x={postX} y={postTop - 8} bold color={INK.steel} text={mark || ""} />
      {/* guard from the walk side, rail above cap */}
      <line x1={highX - toLow * 30} x2={highX - toLow * 30} y1={postTop} y2={walkY} stroke={INK.dim} strokeWidth={1.2} markerStart={`url(#${P}-tick)`} markerEnd={`url(#${P}-tick)`} />
      <Label x={highX - toLow * 38} y={postTop + 30} anchor={lowRight ? "end" : "start"} size={13} bold color={guard === null ? INK.muted : INK.text} text={`${t("wc_guardShort")} ${fm(guard)}`} />
      <Label x={highX - toLow * 38} y={postTop + 48} anchor={lowRight ? "end" : "start"} size={12} color={INK.muted} text={`${t("wc_railShort")} ${fm(rail)}`} />
      {/* edge distances, each outside its own face */}
      {core && (
        <g>
          <line x1={highX} x2={postX} y1={edgeY} y2={edgeY} stroke={red(eh) ? INK.red : INK.dim} strokeWidth={1.4} markerStart={`url(#${P}-tick)`} markerEnd={`url(#${P}-tick)`} />
          <line x1={postX} x2={lowX} y1={edgeY} y2={edgeY} stroke={red(el) ? INK.red : INK.dim} strokeWidth={1.4} markerStart={`url(#${P}-tick)`} markerEnd={`url(#${P}-tick)`} />
          <Label x={highX - toLow * 8} y={edgeY + 5} anchor={lowRight ? "end" : "start"} bold size={13} color={eh === null ? INK.muted : red(eh) ? INK.red : INK.text} text={`▲ ${fm(eh)}`} />
          <Label x={lowX + toLow * 8} y={edgeY + 5} anchor={lowRight ? "start" : "end"} bold size={13} color={el === null ? INK.muted : red(el) ? INK.red : INK.text} text={`▼ ${fm(el)}`} />
        </g>
      )}
      {/* cap width, under the core */}
      <line x1={cx - half} x2={cx + half} y1={capDimY} y2={capDimY} stroke={capRaw === null ? INK.muted : INK.dim} strokeWidth={1.2} markerStart={`url(#${P}-tick)`} markerEnd={`url(#${P}-tick)`} />
      <Label x={cx} y={capDimY + 18} bold size={13} color={capRaw === null ? INK.muted : INK.text} text={`${t("wc_cap")} ${fm(capRaw)}`} />
    </svg>
  );
}
