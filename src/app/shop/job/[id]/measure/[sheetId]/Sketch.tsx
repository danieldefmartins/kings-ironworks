"use client";

// Auto-generated measurement sketch. Draws the chosen railing shape with a
// value box on every step/field — entered numbers show in gold, missing ones
// as "—" — and lets the crew tap a tread to place a post.

import type {
  FlightSegment,
  MeasureData,
  MeasureShape,
  PlatformSegment,
  PostMeasure,
  RampSegment,
  SpiralData,
} from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";

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

export default function Sketch({
  shape,
  data,
  lang,
  light = false,
  onTapStep,
  onTapPlatform,
}: {
  shape: MeasureShape;
  data: MeasureData;
  lang: string;
  light?: boolean;
  onTapStep?: (segIdx: number, stepIdx: number) => void;
  onTapPlatform?: (segIdx: number) => void;
}) {
  const p = light ? LIGHT : DARK;

  if (shape === "spiral") return <SpiralSketch spiral={data.spiral} p={p} lang={lang} />;
  if (shape === "level_run")
    return <LevelSketch data={data} p={p} lang={lang} onTapPlatform={onTapPlatform} />;
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

        // posts on this step
        const post = data.posts.find((po) => po.segIdx === segIdx && po.stepIdx === i);
        if (post && !wallRail) {
          postNo += 1;
          const px = x + RUN * 0.32;
          els.push(<PostGlyph key={`p${segIdx}-${i}`} x={px} y={yTop} n={postNo} p={p} />);
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

      // platform posts, spread by order
      const platPosts = data.posts.filter((po) => po.segIdx === segIdx);
      platPosts.forEach((po) => {
        postNo += 1;
        const idx = platPosts.indexOf(po);
        const px = x0 + ((idx + 1) * PLAT) / (platPosts.length + 1);
        els.push(<PostGlyph key={`pp${segIdx}-${po.id}`} x={px} y={y} n={postNo} p={p} />);
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
  const posts = data.posts.filter((po) => po.segIdx === 0);
  const lv = v(seg?.length || "", p);

  return (
    <svg viewBox={`0 0 ${W} 190`} className="w-full" style={{ maxHeight: 300 }}>
      <line x1={20} y1={baseY} x2={W - 20} y2={baseY} stroke={p.ghost} strokeWidth={1.5} strokeDasharray="7 5" />
      <line x1={30} y1={railY} x2={W - 30} y2={railY} stroke={p.line} strokeWidth={2.5} />
      {posts.map((po, i) => {
        const px = 30 + ((i + 1) * (W - 60)) / (posts.length + 1);
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
