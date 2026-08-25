import type { MeasureShape } from "@/lib/shop/measure";

// Small line icons for the shape picker (stroke = currentColor).
export default function ShapeIcon({
  shape,
  size = 44,
}: {
  shape: MeasureShape;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (shape) {
    case "straight":
      return (
        <svg {...common}>
          <path d="M4 42h8v-8h8v-8h8v-8h8v-8h8" />
        </svg>
      );
    case "stair_platform":
      return (
        <svg {...common}>
          <path d="M3 43h6v-6h6v-6h6v-6h6v-7h18" />
          <path d="M27 18h18v5H27" strokeWidth={3.2} />
        </svg>
      );
    case "l_shape":
      return (
        <svg {...common}>
          {/* plan view: run up, landing, turn right */}
          <path d="M10 44V22h22" />
          <path d="M6 40h8M6 34h8M6 28h8" />
          <path d="M26 18v8M32 18v8M20 18v8" />
          <rect x="6" y="14" width="12" height="12" />
        </svg>
      );
    case "u_shape":
      return (
        <svg {...common}>
          <path d="M12 44V18M36 18v26" />
          <path d="M8 38h8M8 31h8M8 24h8M32 24h8M32 31h8M32 38h8" />
          <rect x="8" y="6" width="32" height="12" />
        </svg>
      );
    case "level_run":
      return (
        <svg {...common}>
          <path d="M4 18h40" />
          <path d="M10 18v20M24 18v20M38 18v20" />
        </svg>
      );
    case "ramp":
      return (
        <svg {...common}>
          <path d="M4 42L44 14" />
          <path d="M4 42h40" />
          <path d="M14 35v7M29 24v18" />
        </svg>
      );
    case "wall_rail":
      return (
        <svg {...common}>
          <path d="M6 40L42 12" />
          <path d="M12 42v-6M24 33v-6M36 24v-6" strokeWidth={2} />
          <path d="M4 46h40" strokeDasharray="3 3" strokeWidth={1.5} />
        </svg>
      );
    case "spiral":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="17" />
          <circle cx="24" cy="24" r="3" fill="currentColor" stroke="none" />
          <path d="M24 24V7M24 24l12 12M24 24L7 24M24 24l12-12M24 24l-12 12" strokeWidth={1.6} />
        </svg>
      );
    case "builder":
      return (
        <svg {...common}>
          <path d="M4 42h6v-6h6v-6h6" />
          <path d="M22 30h8" />
          <path d="M30 30c6 0 10-4 10-10" />
          <path d="M40 20v-8h4" />
          <circle cx="22" cy="30" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="30" cy="30" r="1.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "custom":
      return (
        <svg {...common}>
          <path d="M6 38L6 16L20 16L20 28L42 28L42 38" strokeDasharray="none" />
          <circle cx="6" cy="16" r="2.4" fill="currentColor" stroke="none" />
          <circle cx="20" cy="16" r="2.4" fill="currentColor" stroke="none" />
          <circle cx="20" cy="28" r="2.4" fill="currentColor" stroke="none" />
          <circle cx="42" cy="28" r="2.4" fill="currentColor" stroke="none" />
          <path d="M34 6l6 6-10 10-6-6z" strokeWidth={1.8} />
        </svg>
      );
  }
}
