"use client";

// The ghost drawn over the viewfinder: a line silhouette of what the shot
// should look like, so the framing is obvious without reading anything.

import type { ShotGhost as Ghost } from "@/lib/shop/measure-shots";

const W = 300;
const H = 400;

function tapeTicks(x1: number, y1: number, x2: number, y2: number, n = 10) {
  const out: React.ReactNode[] = [];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    const k = i % 5 === 0 ? 14 : 7;
    out.push(<line key={i} x1={x} y1={y} x2={x + nx * k} y2={y + ny * k} />);
  }
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={5} stroke="#facc15" strokeOpacity={0.75} />
      <g stroke="#facc15">{out}</g>
    </g>
  );
}

function body(g: Ghost): React.ReactNode {
  switch (g) {
    case "stair_up":
    case "stair_down": {
      const steps = Array.from({ length: 7 }, (_, i) => {
        const y = 350 - i * 42;
        const w = 120 - i * 11;
        return <line key={i} x1={150 - w} y1={y} x2={150 + w} y2={y} />;
      });
      return (
        <>
          {steps}
          <line x1={30} y1={350} x2={84} y2={98} />
          <line x1={270} y1={350} x2={216} y2={98} />
          <line x1={22} y1={290} x2={80} y2={50} />
          <line x1={278} y1={290} x2={220} y2={50} />
          {g === "stair_up" ? (
            <path d="M135 205 L150 185 L165 205" strokeWidth={4} />
          ) : (
            <path d="M135 185 L150 205 L165 185" strokeWidth={4} />
          )}
        </>
      );
    }
    case "side":
      return (
        <>
          <path d="M40 350 h35 v-35 h35 v-35 h35 v-35 h35 v-35 h35 v-35 h35 v-35" />
          <line x1={40} y1={350} x2={260} y2={140} />
          <line x1={55} y1={230} x2={260} y2={40} strokeWidth={4} />
          <line x1={75} y1={315} x2={75} y2={212} />
          <line x1={215} y1={175} x2={215} y2={82} />
        </>
      );
    case "closeup":
      return (
        <>
          <path d="M60 110 v-40 h40 M200 70 h40 v40 M240 290 v40 h-40 M100 330 h-40 v-40" strokeWidth={4} />
          <rect x={95} y={150} width={110} height={110} rx={6} />
          {tapeTicks(60, 300, 240, 300, 12)}
        </>
      );
    case "rail":
      return (
        <>
          <line x1={20} y1={150} x2={280} y2={150} strokeWidth={4} />
          <line x1={20} y1={300} x2={280} y2={300} />
          {Array.from({ length: 11 }, (_, i) => (
            <line key={i} x1={45 + i * 21} y1={150} x2={45 + i * 21} y2={300} strokeOpacity={0.6} />
          ))}
          <line x1={28} y1={140} x2={28} y2={340} strokeWidth={5} />
          <line x1={272} y1={140} x2={272} y2={340} strokeWidth={5} />
          <line x1={0} y1={340} x2={300} y2={340} strokeDasharray="6 6" />
        </>
      );
    case "opening":
      return (
        <>
          <rect x={60} y={60} width={180} height={280} />
          <rect x={78} y={78} width={144} height={244} strokeOpacity={0.6} />
          <line x1={150} y1={78} x2={150} y2={322} strokeOpacity={0.35} />
        </>
      );
    case "jamb":
      return (
        <>
          <rect x={120} y={30} width={50} height={340} />
          <line x1={170} y1={30} x2={260} y2={30} strokeOpacity={0.5} />
          {tapeTicks(195, 50, 195, 350, 12)}
        </>
      );
    case "sill":
      return (
        <>
          <rect x={20} y={190} width={260} height={30} />
          <line x1={20} y1={220} x2={20} y2={330} strokeOpacity={0.5} />
          <line x1={280} y1={220} x2={280} y2={330} strokeOpacity={0.5} />
          {tapeTicks(30, 170, 270, 170, 12)}
        </>
      );
    case "beam":
      return (
        <>
          <path d="M70 120 h160 M70 140 h160 M140 140 v120 M160 140 v120 M70 260 h160 M70 280 h160 M70 120 v20 M230 120 v20 M70 260 v20 M230 260 v20" />
          <line x1={0} y1={40} x2={70} y2={120} strokeOpacity={0.5} />
          <line x1={300} y1={40} x2={230} y2={120} strokeOpacity={0.5} />
          <line x1={0} y1={360} x2={70} y2={280} strokeOpacity={0.5} />
          <line x1={300} y1={360} x2={230} y2={280} strokeOpacity={0.5} />
        </>
      );
    case "bearing":
      return (
        <>
          <rect x={20} y={120} width={110} height={260} />
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1={20} y1={150 + i * 30} x2={130} y2={120 + i * 30} strokeOpacity={0.35} />
          ))}
          <rect x={80} y={150} width={200} height={40} strokeWidth={4} />
          {tapeTicks(80, 215, 130, 215, 5)}
        </>
      );
    case "slab":
      return (
        <>
          <path d="M10 180 L290 180 L290 230 L10 230 Z" strokeWidth={4} />
          <line x1={10} y1={180} x2={80} y2={120} strokeOpacity={0.5} />
          <line x1={290} y1={180} x2={230} y2={120} strokeOpacity={0.5} />
          {tapeTicks(250, 172, 250, 238, 4)}
        </>
      );
    case "gate":
      return (
        <>
          <rect x={40} y={110} width={22} height={240} />
          <rect x={238} y={110} width={22} height={240} />
          <rect x={68} y={140} width={164} height={180} strokeOpacity={0.8} />
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1={86 + i * 19} y1={140} x2={86 + i * 19} y2={320} strokeOpacity={0.5} />
          ))}
          <line x1={0} y1={350} x2={300} y2={350} strokeDasharray="6 6" />
        </>
      );
    case "post":
      return (
        <>
          <rect x={130} y={40} width={40} height={270} />
          <rect x={100} y={310} width={100} height={60} strokeOpacity={0.7} />
          <line x1={0} y1={310} x2={300} y2={310} strokeDasharray="6 6" />
        </>
      );
    case "grade":
      return (
        <>
          <path d="M0 330 C80 320 140 260 300 220" strokeWidth={4} />
          <line x1={0} y1={330} x2={300} y2={330} strokeDasharray="8 8" />
          <path d="M210 330 A90 90 0 0 0 205 300" />
        </>
      );
    case "overhead":
      return (
        <>
          <rect x={40} y={80} width={220} height={240} rx={14} />
          <rect x={75} y={115} width={150} height={170} rx={8} strokeOpacity={0.6} />
          <circle cx={150} cy={200} r={10} strokeOpacity={0.6} />
        </>
      );
    case "ladder":
      return (
        <>
          <rect x={30} y={20} width={150} height={360} strokeOpacity={0.5} />
          <path d="M180 110 h80 M180 240 h80 M260 110 v30 M260 240 v30" strokeWidth={4} />
          <path d="M215 250 v130 M245 250 v130" />
          {Array.from({ length: 6 }, (_, i) => (
            <line key={i} x1={215} y1={270 + i * 20} x2={245} y2={270 + i * 20} />
          ))}
          <path d="M185 120 L250 230" strokeOpacity={0.7} />
        </>
      );
    case "wide":
    default:
      return (
        <>
          <path d="M50 330 V190 L150 110 L250 190 V330" />
          <rect x={125} y={250} width={50} height={80} strokeOpacity={0.6} />
          <line x1={0} y1={330} x2={300} y2={330} strokeDasharray="6 6" />
        </>
      );
  }
}

export default function ShotGhost({ ghost, className = "" }: { ghost: Ghost; className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      className={className}
      fill="none"
      stroke="#fff"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-ghost={ghost}
    >
      {/* rule-of-thirds guide */}
      <g strokeWidth={1} strokeOpacity={0.18}>
        <line x1={100} y1={0} x2={100} y2={H} />
        <line x1={200} y1={0} x2={200} y2={H} />
        <line x1={0} y1={133} x2={W} y2={133} />
        <line x1={0} y1={267} x2={W} y2={267} />
      </g>
      <g strokeOpacity={0.85} style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.6))" }}>
        {body(ghost)}
      </g>
    </svg>
  );
}
