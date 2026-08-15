"use client";

// Auto-generated measurement sketch. Draws the chosen railing shape with a
// value box on every step/field — entered numbers show in gold, missing ones
// as "—" — and lets the crew tap a tread to place a post.

import type {
  FlightSegment,
  MeasureData,
  MeasureShape,
  PlatformSegment,
  RampSegment,
  SpiralData,
} from "@/lib/shop/measure";
import { mt, optLabel } from "@/lib/shop/measure-i18n";
import { parseMeas } from "@/lib/shop/measure-checks";

const RUN = 46;
const RISE = 26;
const PLAT = 130;

interface Palette {
  line: string;
  dim: string;
  val: string;
  miss: string;
  post: string;
  ghost: string;
}

const DARK: Palette = {
  line: "#d4d4d4",
  dim: "#8a8a8a",
  val: "#fbbf24",
  miss: "#666666",
  post: "#f59e0b",
  ghost: "#3a3a3a",
};
const LIGHT: Palette = {
  line: "#1f1f1f",
  dim: "#666666",
  val: "#b45309",
  miss: "#b91c1c",
  post: "#92400e",
  ghost: "#d9d9d9",
};

function v(s: string | undefined, p: Palette) {
  const has = s && s.trim() !== "";
  return { text: has ? s!.trim() : "—", fill: has ? p.val : p.miss };
}

export type SketchView = "plan" | "front" | "side";

// Ordered views a shape offers (first = default), with their i18n label keys.
// Crews read plan (top) views best — the full path of the rail — so stairs
// lead with the top view.
export function sketchViews(shape: MeasureShape): [SketchView, string][] {
  if (shape === "spiral")
    return [
      ["front", "planView"],
      ["side", "sideView"],
    ];
  if (shape === "level_run")
    return [
      ["front", "frontView"],
      ["side", "sectionView"],
    ];
  if (shape === "custom") return [["plan", "planView"]];
  if (shape === "ramp")
    return [
      ["side", "sideView"],
      ["front", "frontView"],
    ];
  return [
    ["plan", "planView"],
    ["front", "frontView"],
    ["side", "sideView"],
  ];
}

export default function Sketch({
  shape,
  data,
  lang,
  light = false,
  view = "side",
  onTapStep,
  onTapPlatform,
}: {
  shape: MeasureShape;
  data: MeasureData;
  lang: string;
  light?: boolean;
  view?: SketchView;
  onTapStep?: (segIdx: number, stepIdx: number) => void;
  onTapPlatform?: (segIdx: number) => void;
}) {
  const p = light ? LIGHT : DARK;

  if (shape === "custom") return <CustomPlanSketch data={data} p={p} lang={lang} />;
  if (shape === "spiral")
    return view === "front" ? (
      <SpiralSketch spiral={data.spiral} p={p} lang={lang} />
    ) : (
      <SpiralSideSketch spiral={data.spiral} p={p} lang={lang} />
    );
  if (shape === "level_run")
    return view === "front" ? (
      <LevelSketch data={data} p={p} lang={lang} onTapPlatform={onTapPlatform} />
    ) : (
      <LevelSectionSketch data={data} p={p} lang={lang} />
    );
  if (view === "plan")
    return (
      <PlanSketch
        shape={shape}
        data={data}
        p={p}
        lang={lang}
        onTapStep={onTapStep}
        onTapPlatform={onTapPlatform}
      />
    );
  if (view === "front") return <FrontSketch data={data} p={p} lang={lang} />;
  if (shape === "ramp")
    return <RampSketch data={data} p={p} lang={lang} onTapPlatform={onTapPlatform} />;
  return (
    <StairSketch
      shape={shape}
      data={data}
      p={p}
      lang={lang}
      onTapStep={onTapStep}
      onTapPlatform={onTapPlatform}
    />
  );
}

// Platform/landing posts sort by their measured position along the run, not
// by the order they were tapped in.
export function sortPlatPosts<T extends { pos: string }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    const pa = parseMeas(a.pos);
    const pb = parseMeas(b.pos);
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1;
    if (pb === null) return -1;
    return pa - pb;
  });
}

function OrientBanner({
  data,
  lang,
  p,
  x = 20,
  y = 14,
  w = 340,
}: {
  data: MeasureData;
  lang: string;
  p: Palette;
  x?: number;
  y?: number;
  w?: number; // canvas width — font shrinks so the banner never clips
}) {
  const o = data.datums?.orientation;
  const fs = Math.max(4.5, Math.min(8.5, w / 42));
  return (
    <text x={x} y={y} fontSize={fs} fontWeight={700} fill={o ? p.val : p.miss} letterSpacing="0.5">
      {mt(lang, "orientBanner")}
      {o ? ` · ${mt(lang, `orient_${o}`)}` : " · ?"}
    </text>
  );
}

// ---- Plan (top) view — the full path of the rail from above ----------------

const PLAN_TREAD = 17; // px per tread along the run
const PLAN_W = 54; // stair strip width in px
const PLAN_LAND = 66; // landing square

function PlanSketch({
  shape,
  data,
  p,
  lang,
  onTapStep,
  onTapPlatform,
}: {
  shape: MeasureShape;
  data: MeasureData;
  p: Palette;
  lang: string;
  onTapStep?: (segIdx: number, stepIdx: number) => void;
  onTapPlatform?: (segIdx: number) => void;
}) {
  const wallRail = shape === "wall_rail";
  const o = data.datums?.orientation;
  // which edge(s) carry rail/posts, in local coords (travel = +x, left = -y)
  const openLeft = o === "right_wall" || o === "both_open" || o === "";
  const openRight = o === "left_wall" || o === "both_open" || o === "" || o === undefined;

  interface Placed {
    node: React.ReactNode;
    corners: { x: number; y: number }[];
  }
  const groups: Placed[] = [];
  let cx = 0;
  let cy = 0;
  let ang = 0; // degrees; 0 = travelling right
  let postNo = 0;

  const rot = (x: number, y: number, deg: number) => {
    const r = (deg * Math.PI) / 180;
    return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) };
  };
  const world = (lx: number, ly: number) => {
    const r = rot(lx, ly, ang);
    return { x: cx + r.x, y: cy + r.y };
  };

  data.segments.forEach((seg, segIdx) => {
    if (seg.kind === "flight") {
      const fl = seg as FlightSegment;
      const len = fl.steps.length * PLAN_TREAD;
      const wv = v(fl.width, p);
      const els: React.ReactNode[] = [];
      // strip edges
      els.push(
        <line key="e1" x1={0} y1={-PLAN_W / 2} x2={len} y2={-PLAN_W / 2} stroke={p.line} strokeWidth={2} />,
        <line key="e2" x1={0} y1={PLAN_W / 2} x2={len} y2={PLAN_W / 2} stroke={p.line} strokeWidth={2} />
      );
      // tread lines + taps + posts
      fl.steps.forEach((_, i) => {
        els.push(
          <line key={`t${i}`} x1={i * PLAN_TREAD} y1={-PLAN_W / 2} x2={i * PLAN_TREAD} y2={PLAN_W / 2} stroke={p.ghost} strokeWidth={1.2} />
        );
        const stepPosts = data.posts.filter((po) => po.segIdx === segIdx && po.stepIdx === i);
        if (!wallRail) {
          stepPosts.forEach((po, pi) => {
            postNo += 1;
            const py = openRight && !openLeft ? PLAN_W / 2 : openLeft && !openRight ? -PLAN_W / 2 : pi % 2 === 0 ? PLAN_W / 2 : -PLAN_W / 2;
            els.push(
              <g key={`p${po.id}`}>
                <circle cx={i * PLAN_TREAD + PLAN_TREAD / 2} cy={py} r={4} fill={p.post} />
                <text x={i * PLAN_TREAD + PLAN_TREAD / 2 + 5} y={py + (py > 0 ? 12 : -6)} fontSize={8} fontWeight={700} fill={p.post}>
                  P{postNo}
                </text>
              </g>
            );
          });
          if (onTapStep) {
            els.push(
              <rect key={`tap${i}`} x={i * PLAN_TREAD} y={-PLAN_W / 2} width={PLAN_TREAD} height={PLAN_W}
                fill="transparent" style={{ cursor: "pointer" }} onClick={() => onTapStep(segIdx, i)} />
            );
          }
        }
      });
      // width label across the strip start
      els.push(
        <text key="w" x={-8} y={4} fontSize={8.5} textAnchor="end" fill={wv.fill}>
          {wv.text}
        </text>
      );
      // step count label
      els.push(
        <text key="n" x={len / 2} y={PLAN_W / 2 + 14} fontSize={8} textAnchor="middle" fill={p.dim}>
          {fl.steps.length} × {mt(lang, "step").toLowerCase()}
        </text>
      );
      groups.push({
        node: (
          <g key={`fl${segIdx}`} transform={`translate(${cx} ${cy}) rotate(${ang})`}>
            {els}
          </g>
        ),
        corners: [world(0, -PLAN_W / 2 - 20), world(len, -PLAN_W / 2 - 20), world(0, PLAN_W / 2 + 20), world(len, PLAN_W / 2 + 20)],
      });
      const end = world(len, 0);
      cx = end.x;
      cy = end.y;
    } else if (seg.kind === "platform") {
      const pl = seg as PlatformSegment;
      const L = PLAN_LAND;
      const lv = v(pl.length, p);
      const dv = v(pl.depth, p);
      const els: React.ReactNode[] = [
        <rect key="r" x={0} y={-L / 2} width={L} height={L} fill="none" stroke={p.line} strokeWidth={2} />,
        <text key="l" x={L / 2} y={-L / 2 - 6} fontSize={8.5} textAnchor="middle" fill={lv.fill}>
          {lv.text}
        </text>,
        <text key="d" x={L + 6} y={3} fontSize={8.5} fill={dv.fill}>
          {dv.text}
        </text>,
      ];
      const platPosts = sortPlatPosts(data.posts.filter((po) => po.segIdx === segIdx));
      platPosts.forEach((po, idx) => {
        postNo += 1;
        const frac = (idx + 1) / (platPosts.length + 1);
        els.push(
          <g key={`pp${po.id}`}>
            <circle cx={frac * L} cy={openRight ? L / 2 : -L / 2} r={4} fill={p.post} />
            <text x={frac * L + 5} y={(openRight ? L / 2 : -L / 2) + (openRight ? 12 : -6)} fontSize={8} fontWeight={700} fill={p.post}>
              P{postNo}
            </text>
          </g>
        );
      });
      if (onTapPlatform && !wallRail) {
        els.push(
          <rect key="tap" x={0} y={-L / 2} width={L} height={L} fill="transparent"
            style={{ cursor: "pointer" }} onClick={() => onTapPlatform(segIdx)} />
        );
      }
      groups.push({
        node: (
          <g key={`pl${segIdx}`} transform={`translate(${cx} ${cy}) rotate(${ang})`}>
            {els}
          </g>
        ),
        corners: [world(0, -L / 2 - 20), world(L, -L / 2 - 20), world(0, L / 2 + 20), world(L, L / 2 + 20)],
      });
      // advance through the landing, then turn
      const end = world(L, 0);
      cx = end.x;
      cy = end.y;
      if (pl.turn === "left") ang -= 90;
      else if (pl.turn === "right") ang += 90;
      else if (pl.turn === "u") {
        // switchback: reverse and shift one strip over
        const shift = rot(0, PLAN_W + 16, ang);
        cx += shift.x;
        cy += shift.y;
        ang += 180;
      }
    }
  });

  // bounding box over all corners
  const xs = groups.flatMap((g) => g.corners.map((c) => c.x));
  const ys = groups.flatMap((g) => g.corners.map((c) => c.y));
  const minX = Math.min(0, ...xs) - 34;
  const minY = Math.min(0, ...ys) - 34;
  const maxX = Math.max(60, ...xs) + 34;
  const maxY = Math.max(40, ...ys) + 34;
  const w = maxX - minX;
  const h = maxY - minY;

  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="w-full" style={{ maxHeight: 420 }}>
      <OrientBanner data={data} lang={lang} p={p} x={minX + 8} y={minY + 12} w={w} />
      {/* UP arrow at the start of travel */}
      <g>
        <line x1={-24} y1={0} x2={-8} y2={0} stroke={p.dim} strokeWidth={1.6} />
        <path d={`M -8 0 l -5 -3.5 v 7 z`} fill={p.dim} />
        <text x={-24} y={-6} fontSize={8} fill={p.dim}>
          UP ↑
        </text>
      </g>
      {groups.map((g) => g.node)}
    </svg>
  );
}

// ---- Custom drawn plan — every drawn line is a dimensioned segment ---------

export function CustomPlanSketch({
  data,
  p,
  lang,
}: {
  data: MeasureData;
  p: Palette;
  lang: string;
}) {
  const plan = data.plan;
  if (!plan || plan.points.length === 0) {
    return (
      <svg viewBox="0 0 340 120" className="w-full" style={{ maxHeight: 200 }}>
        <text x={170} y={60} fontSize={11} textAnchor="middle" fill={p.miss}>
          {mt(lang, "gap_plan_drawing")}
        </text>
      </svg>
    );
  }
  const pts = plan.points;
  const segCount = plan.closed && pts.length > 2 ? pts.length : pts.length - 1;
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  const minX = Math.min(...xs) - 44;
  const minY = Math.min(...ys) - 34;
  const w = Math.max(...xs) - Math.min(...xs) + 88;
  const h = Math.max(...ys) - Math.min(...ys) + 68;

  const els: React.ReactNode[] = [];
  for (let i = 0; i < segCount; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const lv = v(plan.segs[i]?.len, p);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    // label offset perpendicular to the line
    const ox = (-dy / L) * 11;
    const oy = (dx / L) * 11;
    els.push(
      <g key={i}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={p.line} strokeWidth={2.4} strokeLinecap="round" />
        <circle cx={mx + ox * 1.9} cy={my + oy * 1.9} r={7} fill="none" stroke={p.ghost} />
        <text x={mx + ox * 1.9} y={my + oy * 1.9 + 3} fontSize={8} textAnchor="middle" fill={p.dim}>
          {i + 1}
        </text>
        <text x={mx + ox * 0.4} y={my + oy * 0.4 + 3} fontSize={9} fontWeight={700} textAnchor="middle" fill={lv.fill}>
          {lv.text}
        </text>
      </g>
    );
  }
  pts.forEach((q, i) => {
    els.push(<circle key={`v${i}`} cx={q.x} cy={q.y} r={3} fill={p.post} />);
  });

  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="w-full" style={{ maxHeight: 420 }}>
      <OrientBanner data={data} lang={lang} p={p} x={minX + 8} y={minY + 12} w={w} />
      {els}
    </svg>
  );
}

// ---- Stairs (straight / platform / L / U / wall rail) ----------------------

function StairSketch({
  shape,
  data,
  p,
  lang,
  onTapStep,
  onTapPlatform,
}: {
  shape: MeasureShape;
  data: MeasureData;
  p: Palette;
  lang: string;
  onTapStep?: (segIdx: number, stepIdx: number) => void;
  onTapPlatform?: (segIdx: number) => void;
}) {
  const wallRail = shape === "wall_rail";

  // Pre-compute canvas size.
  let w = 90;
  let hRise = 0;
  for (const seg of data.segments) {
    if (seg.kind === "flight") {
      w += seg.steps.length * RUN;
      hRise += seg.steps.length * RISE;
    } else if (seg.kind === "platform") {
      w += PLAT;
    }
  }
  const H = hRise + 130;
  const baseY = H - 45;

  const els: React.ReactNode[] = [];
  const taps: React.ReactNode[] = [];
  let x = 40;
  let y = baseY;
  let outline = `M ${x} ${y}`;
  let firstNose: [number, number] | null = null;
  let lastNose: [number, number] | null = null;
  let postNo = 0;
  let globalStep = 0;

  data.segments.forEach((seg, segIdx) => {
    if (seg.kind === "flight") {
      const fl = seg as FlightSegment;
      fl.steps.forEach((st, i) => {
        const yTop = y - RISE;
        outline += ` L ${x} ${yTop} L ${x + RUN} ${yTop}`;
        if (!firstNose) firstNose = [x, yTop];
        lastNose = [x, yTop];
        globalStep += 1;

        // rise value (left of the riser)
        const rv = v(st.rise, p);
        els.push(
          <text key={`r${segIdx}-${i}`} x={x - 5} y={yTop + RISE / 2 + 3} fontSize={9} textAnchor="end" fill={rv.fill}>
            {rv.text}
          </text>
        );
        // run value (above the tread)
        const uv = v(st.run, p);
        els.push(
          <text key={`u${segIdx}-${i}`} x={x + RUN * 0.62} y={yTop - 5} fontSize={9} textAnchor="middle" fill={uv.fill}>
            {uv.text}
          </text>
        );
        // step number under the tread
        els.push(
          <g key={`n${segIdx}-${i}`}>
            <circle cx={x + RUN - 12} cy={y - RISE / 2 + 14} r={7} fill="none" stroke={p.ghost} />
            <text x={x + RUN - 12} y={y - RISE / 2 + 17} fontSize={8} textAnchor="middle" fill={p.dim}>
              {globalStep}
            </text>
          </g>
        );

        // posts on this step (a tread can carry more than one)
        const stepPosts = data.posts.filter(
          (po) => po.segIdx === segIdx && po.stepIdx === i
        );
        if (!wallRail) {
          stepPosts.forEach((po, pi) => {
            postNo += 1;
            const px = x + RUN * 0.26 + pi * 12;
            els.push(<PostGlyph key={`p${po.id}`} x={px} y={yTop} n={postNo} p={p} />);
          });
        }

        // tap target
        if (onTapStep && !wallRail) {
          const cx = x;
          taps.push(
            <rect
              key={`t${segIdx}-${i}`}
              x={cx}
              y={yTop - 66}
              width={RUN}
              height={66 + RISE}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onClick={() => onTapStep(segIdx, i)}
            />
          );
        }

        x += RUN;
        y = yTop;
      });
    } else if (seg.kind === "platform") {
      const pl = seg as PlatformSegment;
      const x0 = x;
      outline += ` L ${x + PLAT} ${y}`;

      const lv = v(pl.length, p);
      els.push(
        <g key={`plat${segIdx}`}>
          <text x={x0 + PLAT / 2} y={y - 26} fontSize={9} textAnchor="middle" fill={lv.fill}>
            ⟵ {lv.text} ⟶
          </text>
          <text x={x0 + PLAT / 2} y={y + 16} fontSize={8} textAnchor="middle" fill={p.dim}>
            {mt(lang, pl.turn === "none" ? "platform" : "landing")}
            {pl.slope && pl.slope.trim() !== "" ? ` · ${mt(lang, "slope")} ${pl.slope}${pl.slopeDir ? ` → ${pl.slopeDir}` : ""}` : ""}
          </text>
          {pl.turn !== "none" && (
            <text x={x0 + PLAT / 2} y={y + 28} fontSize={8} textAnchor="middle" fill={p.dim}>
              {mt(lang, "turn")}: {pl.turn === "u" ? "180°" : pl.turn === "left" ? mt(lang, "turnLeft") : mt(lang, "turnRight")}
            </text>
          )}
        </g>
      );

      // platform posts, ordered by measured position along the platform
      const platPosts = sortPlatPosts(data.posts.filter((po) => po.segIdx === segIdx));
      const platLen = parseMeas(pl.length);
      platPosts.forEach((po, idx) => {
        postNo += 1;
        const posIn = parseMeas(po.pos);
        const frac =
          posIn !== null && platLen && platLen > 0
            ? Math.min(0.95, Math.max(0.05, posIn / platLen))
            : (idx + 1) / (platPosts.length + 1);
        els.push(
          <PostGlyph key={`pp${segIdx}-${po.id}`} x={x0 + frac * PLAT} y={y} n={postNo} p={p} />
        );
      });

      if (onTapPlatform && !wallRail) {
        taps.push(
          <rect
            key={`tp${segIdx}`}
            x={x0}
            y={y - 66}
            width={PLAT}
            height={66}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onClick={() => onTapPlatform(segIdx)}
          />
        );
      }
      x += PLAT;
    }
  });

  // rake line nose-to-nose + angle
  if (firstNose && lastNose && (firstNose as number[])[0] !== (lastNose as number[])[0]) {
    const [x1, y1] = firstNose as [number, number];
    const [x2, y2] = lastNose as [number, number];
    const ext = 24;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const rl = v(data.overall.rakeLength, p);
    const av = v(firstFlightAngle(data), p);
    els.push(
      <g key="rake">
        <line
          x1={x1 - ux * ext}
          y1={y1 - uy * ext}
          x2={x2 + ux * ext}
          y2={y2 + uy * ext}
          stroke={p.dim}
          strokeDasharray="5 4"
          strokeWidth={1}
        />
        <text
          x={(x1 + x2) / 2 - 14}
          y={(y1 + y2) / 2 - 12}
          fontSize={10}
          fontWeight={700}
          textAnchor="middle"
          fill={rl.fill}
          transform={`rotate(${(Math.atan2(dy, dx) * 180) / Math.PI} ${(x1 + x2) / 2 - 14} ${(y1 + y2) / 2 - 12})`}
        >
          {rl.text}
        </text>
        <text x={x1 + 30} y={y1 + 24} fontSize={10} fontWeight={700} fill={av.fill}>
          ∠ {av.text}
        </text>
      </g>
    );
  }

  // wall-rail brackets
  if (wallRail && firstNose && lastNose) {
    const [x1, y1] = firstNose as [number, number];
    const [x2, y2] = lastNose as [number, number];
    for (let i = 1; i <= 3; i++) {
      const fx = x1 + ((x2 - x1) * i) / 4;
      const fy = y1 + ((y2 - y1) * i) / 4;
      els.push(
        <g key={`br${i}`}>
          <line x1={fx} y1={fy - 34} x2={fx} y2={fy - 22} stroke={p.post} strokeWidth={2.5} />
          <circle cx={fx} cy={fy - 36} r={2.5} fill={p.post} />
        </g>
      );
    }
    els.push(
      <line
        key="wallrail"
        x1={x1 - 10}
        y1={y1 - 38}
        x2={x2 + 20}
        y2={y2 - 38 + ((y2 - y1) / Math.max(1, x2 - x1)) * 30}
        stroke={p.post}
        strokeWidth={2.5}
      />
    );
  }

  return (
    <svg viewBox={`0 0 ${w} ${H}`} className="w-full" style={{ maxHeight: 440 }}>
      {/* ground */}
      <line x1={12} y1={baseY} x2={w - 12} y2={baseY} stroke={p.ghost} strokeWidth={1.5} strokeDasharray="7 5" />
      <OrientBanner data={data} lang={lang} p={p} w={w} />
      <path d={outline} fill="none" stroke={p.line} strokeWidth={2.2} strokeLinejoin="round" />
      {els}
      {taps}
    </svg>
  );
}

function firstFlightAngle(data: MeasureData): string {
  for (const s of data.segments) if (s.kind === "flight") return s.angleDeg;
  return "";
}

function PostGlyph({ x, y, n, p }: { x: number; y: number; n: number; p: Palette }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y - 54} stroke={p.post} strokeWidth={3} />
      <circle cx={x} cy={y - 57} r={3.4} fill={p.post} />
      <text x={x + 6} y={y - 58} fontSize={9} fontWeight={700} fill={p.post}>
        P{n}
      </text>
    </g>
  );
}

// ---- Level run / guardrail -------------------------------------------------

function LevelSketch({
  data,
  p,
  lang,
  onTapPlatform,
}: {
  data: MeasureData;
  p: Palette;
  lang: string;
  onTapPlatform?: (segIdx: number) => void;
}) {
  const seg = data.segments[0] as PlatformSegment | undefined;
  const W = 340;
  const railY = 60;
  const baseY = 150;
  const posts = sortPlatPosts(data.posts.filter((po) => po.segIdx === 0));
  const runLen = parseMeas(seg?.length || "");
  const lv = v(seg?.length || "", p);

  return (
    <svg viewBox={`0 0 ${W} 190`} className="w-full" style={{ maxHeight: 300 }}>
      <OrientBanner data={data} lang={lang} p={p} />
      <line x1={20} y1={baseY} x2={W - 20} y2={baseY} stroke={p.ghost} strokeWidth={1.5} strokeDasharray="7 5" />
      <line x1={30} y1={railY} x2={W - 30} y2={railY} stroke={p.line} strokeWidth={2.5} />
      {posts.map((po, i) => {
        const posIn = parseMeas(po.pos);
        const frac =
          posIn !== null && runLen && runLen > 0
            ? Math.min(0.97, Math.max(0.03, posIn / runLen))
            : (i + 1) / (posts.length + 1);
        const px = 30 + frac * (W - 60);
        return (
          <g key={po.id}>
            <line x1={px} y1={railY} x2={px} y2={baseY} stroke={p.post} strokeWidth={3} />
            <text x={px + 5} y={railY + 14} fontSize={9} fontWeight={700} fill={p.post}>
              P{i + 1}
            </text>
          </g>
        );
      })}
      {/* length dimension */}
      <line x1={30} y1={baseY + 18} x2={W - 30} y2={baseY + 18} stroke={p.dim} strokeWidth={1} />
      <text x={W / 2} y={baseY + 32} fontSize={10} fontWeight={700} textAnchor="middle" fill={lv.fill}>
        ⟵ {lv.text} ⟶
      </text>
      {seg?.slope && seg.slope.trim() !== "" && (
        <text x={W / 2} y={railY - 12} fontSize={8} textAnchor="middle" fill={p.dim}>
          {mt(lang, "slope")} {seg.slope}
          {seg.slopeDir ? ` → ${seg.slopeDir}` : ""}
        </text>
      )}
      {onTapPlatform && (
        <rect
          x={30}
          y={railY - 20}
          width={W - 60}
          height={baseY - railY + 20}
          fill="transparent"
          style={{ cursor: "pointer" }}
          onClick={() => onTapPlatform(0)}
        />
      )}
    </svg>
  );
}

// ---- Ramp ------------------------------------------------------------------

function RampSketch({
  data,
  p,
  lang,
  onTapPlatform,
}: {
  data: MeasureData;
  p: Palette;
  lang: string;
  onTapPlatform?: (segIdx: number) => void;
}) {
  const seg = data.segments[0] as RampSegment | undefined;
  const posts = data.posts.filter((po) => po.segIdx === 0);
  const x1 = 30, y1 = 170, x2 = 300, y2 = 70;
  const lv = v(seg?.length || "", p);
  const av = v(seg?.angleDeg || "", p);
  const rv = v(seg?.rise || "", p);

  return (
    <svg viewBox="0 0 340 210" className="w-full" style={{ maxHeight: 300 }}>
      <line x1={12} y1={y1} x2={328} y2={y1} stroke={p.ghost} strokeWidth={1.5} strokeDasharray="7 5" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={p.line} strokeWidth={2.5} />
      <line x1={x2} y1={y2} x2={x2} y2={y1} stroke={p.ghost} strokeWidth={1.2} strokeDasharray="4 4" />
      {posts.map((po, i) => {
        const f = (i + 1) / (posts.length + 1);
        const px = x1 + (x2 - x1) * f;
        const py = y1 + (y2 - y1) * f;
        return (
          <g key={po.id}>
            <line x1={px} y1={py} x2={px} y2={py - 44} stroke={p.post} strokeWidth={3} />
            <circle cx={px} cy={py - 47} r={3} fill={p.post} />
            <text x={px + 5} y={py - 48} fontSize={9} fontWeight={700} fill={p.post}>
              P{i + 1}
            </text>
          </g>
        );
      })}
      <text x={(x1 + x2) / 2 - 10} y={(y1 + y2) / 2 - 14} fontSize={10} fontWeight={700} fill={lv.fill}
        transform={`rotate(${(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI} ${(x1 + x2) / 2 - 10} ${(y1 + y2) / 2 - 14})`}>
        {lv.text}
      </text>
      <text x={x1 + 44} y={y1 - 8} fontSize={10} fontWeight={700} fill={av.fill}>
        ∠ {av.text}
      </text>
      <text x={x2 + 6} y={(y1 + y2) / 2} fontSize={9} fill={rv.fill}>
        {mt(lang, "rise")}: {rv.text}
      </text>
      {onTapPlatform && (
        <rect x={x1} y={40} width={x2 - x1} height={y1 - 40} fill="transparent"
          style={{ cursor: "pointer" }} onClick={() => onTapPlatform(0)} />
      )}
    </svg>
  );
}

// ---- Front elevation (stairs / ramp): width, post insets, rail height ------

function FrontSketch({
  data,
  p,
  lang,
}: {
  data: MeasureData;
  p: Palette;
  lang: string;
}) {
  const flight = data.segments.find((s) => s.kind === "flight") as FlightSegment | undefined;
  const rampSeg = data.segments.find((s) => s.kind === "ramp") as RampSegment | undefined;
  const widthVal = v(flight?.width || rampSeg?.width || "", p);
  const hv = v(data.rail.height, p);
  const firstPost = data.posts[0];
  const ev = v(firstPost?.fromEdge || "", p);

  const side = data.rail.side; // Left | Right | Both | ""
  const showLeft = side === "Left" || side === "Both" || side === "";
  const showRight = side === "Right" || side === "Both" || side === "";
  const dimmed = side === ""; // no side chosen yet — show both faded

  const x0 = 52, x1 = 288, treadY = 150, railTop = 70;
  const inset = 26;
  const railColor = dimmed ? p.ghost : p.post;

  return (
    <svg viewBox="0 0 340 235" className="w-full" style={{ maxHeight: 320 }}>
      {/* ground + tread surface seen from the front */}
      <line x1={16} y1={205} x2={324} y2={205} stroke={p.ghost} strokeWidth={1.5} strokeDasharray="7 5" />
      <line x1={x0} y1={treadY} x2={x1} y2={treadY} stroke={p.line} strokeWidth={2.5} />
      <line x1={x0} y1={treadY} x2={x0} y2={treadY + 16} stroke={p.line} strokeWidth={2} />
      <line x1={x1} y1={treadY} x2={x1} y2={treadY + 16} stroke={p.line} strokeWidth={2} />

      {/* stair width dimension */}
      <line x1={x0} y1={treadY + 28} x2={x1} y2={treadY + 28} stroke={p.dim} strokeWidth={1} />
      <text x={(x0 + x1) / 2} y={treadY + 42} fontSize={10} fontWeight={700} textAnchor="middle" fill={widthVal.fill}>
        ⟵ {mt(lang, "width")}: {widthVal.text} ⟶
      </text>

      {/* posts + rail per side */}
      {showLeft && (
        <g>
          <line x1={x0 + inset} y1={treadY} x2={x0 + inset} y2={railTop} stroke={railColor} strokeWidth={3.5} />
          <circle cx={x0 + inset} cy={railTop - 4} r={4.5} fill="none" stroke={railColor} strokeWidth={2.5} />
          <line x1={x0} y1={treadY - 8} x2={x0 + inset} y2={treadY - 8} stroke={p.dim} strokeWidth={1} />
          <text x={x0 + inset / 2} y={treadY - 13} fontSize={8.5} textAnchor="middle" fill={ev.fill}>
            {ev.text}
          </text>
        </g>
      )}
      {showRight && (
        <g>
          <line x1={x1 - inset} y1={treadY} x2={x1 - inset} y2={railTop} stroke={railColor} strokeWidth={3.5} />
          <circle cx={x1 - inset} cy={railTop - 4} r={4.5} fill="none" stroke={railColor} strokeWidth={2.5} />
          <line x1={x1 - inset} y1={treadY - 8} x2={x1} y2={treadY - 8} stroke={p.dim} strokeWidth={1} />
          <text x={x1 - inset / 2} y={treadY - 13} fontSize={8.5} textAnchor="middle" fill={ev.fill}>
            {ev.text}
          </text>
        </g>
      )}

      {/* rail height dimension */}
      <line x1={x1 + 18} y1={treadY} x2={x1 + 18} y2={railTop - 8} stroke={p.dim} strokeWidth={1} />
      <text x={x1 + 24} y={(treadY + railTop) / 2} fontSize={9} fontWeight={700} fill={hv.fill}
        transform={`rotate(90 ${x1 + 24} ${(treadY + railTop) / 2})`} textAnchor="middle">
        {hv.text}
      </text>
      <text x={x1 + 4} y={railTop - 16} fontSize={8} fill={p.dim} textAnchor="end">
        {mt(lang, "railHeight")}
      </text>

      {/* edge-of-stair markers, looking up (wall/open from datums) */}
      <text x={x0} y={220} fontSize={8.5} textAnchor="middle" fill={p.dim}>
        {optLabel(lang, "Left")}
        {data.datums?.orientation === "left_wall" || data.datums?.orientation === "both_wall"
          ? " ▦"
          : data.datums?.orientation
            ? " ○"
            : ""}
      </text>
      <text x={x1} y={220} fontSize={8.5} textAnchor="middle" fill={p.dim}>
        {optLabel(lang, "Right")}
        {data.datums?.orientation === "right_wall" || data.datums?.orientation === "both_wall"
          ? " ▦"
          : data.datums?.orientation
            ? " ○"
            : ""}
      </text>
      <OrientBanner data={data} lang={lang} p={p} />
      <text x={(x0 + x1) / 2} y={64} fontSize={8.5} textAnchor="middle" fill={p.dim}>
        {mt(lang, "frontView")} — {mt(lang, "fromEdge")}
      </text>
    </svg>
  );
}

// ---- Level run section: post + rail height ---------------------------------

function LevelSectionSketch({
  data,
  p,
  lang,
}: {
  data: MeasureData;
  p: Palette;
  lang: string;
}) {
  const hv = v(data.rail.height, p);
  const firstPost = data.posts[0];
  const mount = firstPost?.mount || "";
  const cx = 170, groundY = 195, railTop = 66;

  return (
    <svg viewBox="0 0 340 235" className="w-full" style={{ maxHeight: 320 }}>
      <line x1={30} y1={groundY} x2={310} y2={groundY} stroke={p.line} strokeWidth={2.2} />
      <line x1={cx} y1={groundY} x2={cx} y2={railTop} stroke={p.post} strokeWidth={4} />
      <circle cx={cx} cy={railTop - 6} r={6} fill="none" stroke={p.post} strokeWidth={2.5} />
      {/* base */}
      <rect x={cx - 14} y={groundY - 4} width={28} height={4} fill={p.post} />
      {/* height dim */}
      <line x1={cx + 44} y1={groundY} x2={cx + 44} y2={railTop - 12} stroke={p.dim} strokeWidth={1} />
      <text x={cx + 52} y={(groundY + railTop) / 2} fontSize={10} fontWeight={700} fill={hv.fill}
        transform={`rotate(90 ${cx + 52} ${(groundY + railTop) / 2})`} textAnchor="middle">
        {hv.text}
      </text>
      <text x={cx + 44} y={railTop - 20} fontSize={8} fill={p.dim} textAnchor="middle">
        {mt(lang, "railHeight")}
      </text>
      <text x={cx} y={groundY + 18} fontSize={8.5} textAnchor="middle" fill={mount ? p.val : p.miss}>
        {mt(lang, "mountType")}: {mount ? optLabel(lang, mount) : "—"}
      </text>
      <text x={cx} y={40} fontSize={8.5} textAnchor="middle" fill={p.dim}>
        {mt(lang, "sectionView")}
      </text>
    </svg>
  );
}

// ---- Spiral side elevation: floor-to-floor + column ------------------------

function SpiralSideSketch({
  spiral,
  p,
  lang,
}: {
  spiral: SpiralData | null;
  p: Palette;
  lang: string;
}) {
  const fv = v(spiral?.floorToFloor || "", p);
  const cv = v(spiral?.columnSize || "", p);
  const topY = 58, botY = 200, cx = 150;
  const treads = Math.min(12, Math.max(4, parseInt(spiral?.treads || "8", 10) || 8));
  const lines = Array.from({ length: treads }, (_, i) => {
    const y = botY - ((i + 1) * (botY - topY - 14)) / (treads + 1);
    const leftSide = i % 2 === 0;
    return (
      <line
        key={i}
        x1={leftSide ? cx - 58 : cx + 6}
        y1={y}
        x2={leftSide ? cx - 6 : cx + 58}
        y2={y}
        stroke={p.ghost}
        strokeWidth={2}
      />
    );
  });

  return (
    <svg viewBox="0 0 340 235" className="w-full" style={{ maxHeight: 320 }}>
      {/* floors */}
      <line x1={30} y1={botY} x2={310} y2={botY} stroke={p.line} strokeWidth={2.2} />
      <line x1={170} y1={topY} x2={318} y2={topY} stroke={p.line} strokeWidth={2.2} />
      {/* center column */}
      <rect x={cx - 5} y={topY} width={10} height={botY - topY} fill="none" stroke={p.post} strokeWidth={2.2} />
      {lines}
      {/* floor-to-floor dim */}
      <line x1={300} y1={botY} x2={300} y2={topY} stroke={p.dim} strokeWidth={1} />
      <text x={310} y={(botY + topY) / 2} fontSize={10} fontWeight={700} fill={fv.fill}
        transform={`rotate(90 ${310} ${(botY + topY) / 2})`} textAnchor="middle">
        {fv.text}
      </text>
      <text x={296} y={topY - 8} fontSize={8} fill={p.dim} textAnchor="end">
        {mt(lang, "floorToFloor")}
      </text>
      <text x={cx} y={botY + 18} fontSize={8.5} textAnchor="middle" fill={cv.fill}>
        {mt(lang, "columnSize")}: {cv.text}
      </text>
      <text x={cx} y={40} fontSize={8.5} textAnchor="middle" fill={p.dim}>
        {mt(lang, "sideView")}
      </text>
    </svg>
  );
}

// ---- Spiral (plan view) ----------------------------------------------------

function SpiralSketch({
  spiral,
  p,
  lang,
}: {
  spiral: SpiralData | null;
  p: Palette;
  lang: string;
}) {
  const treads = Math.min(24, Math.max(4, parseInt(spiral?.treads || "12", 10) || 12));
  const cx = 130, cy = 115, r = 88;
  const dv = v(spiral?.diameter || "", p);
  const cv = v(spiral?.columnSize || "", p);
  const rv = v(spiral?.rotationDeg || "", p);
  const spokes = Array.from({ length: treads }, (_, i) => {
    const a = (i / treads) * Math.PI * 2 - Math.PI / 2;
    return (
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={cx + Math.cos(a) * r}
        y2={cy + Math.sin(a) * r}
        stroke={p.ghost}
        strokeWidth={1.2}
      />
    );
  });
  const arrow = spiral?.direction === "cw" ? "⟳" : "⟲";

  return (
    <svg viewBox="0 0 340 240" className="w-full" style={{ maxHeight: 320 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={p.line} strokeWidth={2.2} />
      {spokes}
      <circle cx={cx} cy={cy} r={9} fill="none" stroke={p.post} strokeWidth={2.5} />
      <text x={cx} y={cy - r - 10} fontSize={11} textAnchor="middle" fill={p.dim}>
        {arrow} {mt(lang, spiral?.direction === "cw" ? "cw" : "ccw")}
      </text>
      <line x1={cx - r} y1={cy + r + 16} x2={cx + r} y2={cy + r + 16} stroke={p.dim} strokeWidth={1} />
      <text x={cx} y={cy + r + 30} fontSize={10} fontWeight={700} textAnchor="middle" fill={dv.fill}>
        Ø {dv.text}
      </text>
      <text x={250} y={70} fontSize={9} fill={cv.fill}>
        {mt(lang, "columnSize")}: {cv.text}
      </text>
      <text x={250} y={88} fontSize={9} fill={rv.fill}>
        {mt(lang, "rotation")}: {rv.text}
      </text>
      <text x={250} y={106} fontSize={9} fill={p.dim}>
        {mt(lang, "treadsCount")}: {treads}
      </text>
    </svg>
  );
}
