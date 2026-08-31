import type { MeasurePreset, MeasureShape } from "@/lib/shop/measure";

// Small line icons for the shape picker (stroke = currentColor).
export default function ShapeIcon({
  shape,
  preset,
  size = 44,
}: {
  shape: MeasureShape;
  preset?: MeasurePreset;
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

  if (preset === "three_flight") {
    return (
      <svg {...common}>
        <path d="M8 43V33h12V15h20v28" />
        <path d="M5 39h6M5 35h6M17 29h6M17 24h6M17 19h6M37 19h6M37 27h6M37 35h6M37 39h6" strokeWidth={1.8} />
        <rect x="5" y="28" width="12" height="5" />
        <rect x="23" y="10" width="20" height="5" />
      </svg>
    );
  }

  if (preset === "winder_l" || preset === "winder_u") {
    return (
      <svg {...common}>
        {preset === "winder_l" ? <path d="M9 43V22h22" /> : <path d="M11 43V17M37 17v26" />}
        {preset === "winder_l" ? (
          <>
            <path d="M5 38h8M5 32h8M5 26h8M20 18v8M26 18v8M32 18v8" />
            <path d="M9 22l9-9M9 22h13M9 22l9 9" strokeWidth={1.5} />
          </>
        ) : (
          <>
            <path d="M7 37h8M7 30h8M33 30h8M33 37h8" />
            <path d="M11 17l9-9 8 9 9-9M11 17h26" strokeWidth={1.5} />
          </>
        )}
      </svg>
    );
  }

  if (preset === "curved_helical") {
    return (
      <svg {...common}>
        <path d="M6 40C8 15 21 7 42 10" />
        <path d="M8 34l7 2M11 26l7 3M17 18l6 4M25 12l4 6M34 9l2 7" strokeWidth={1.6} />
      </svg>
    );
  }

  if (preset === "bifurcated") {
    return (
      <svg {...common}>
        <path d="M24 44V27M24 27L8 10M24 27l16-17" />
        <path d="M20 39h8M20 34h8M20 29h8M6 14l6 2M11 9l6 3M36 16l6-2M31 12l6-3" strokeWidth={1.7} />
        <rect x="19" y="22" width="10" height="7" />
      </svg>
    );
  }

  if (preset === "irregular_stoop") {
    return (
      <svg {...common}>
        <path d="M4 42h9v-6h7v-10h12v-5h12" />
        <path d="M8 44l3-4M17 38l3-4M27 28l3-4M39 23l3-4" strokeWidth={1.5} />
      </svg>
    );
  }

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
    case "fire_escape":
      // building wall left, stacked balconies, zig-zag stair, ladder to grade
      return (
        <svg {...common}>
          <path d="M7 3v42" strokeWidth={2.5} />
          <path d="M7 16h24M7 30h24" strokeWidth={2} />
          <path d="M31 16v-7M31 30v-7" strokeWidth={1.5} />
          <path d="M31 16L13 30M31 30l-10 8" strokeWidth={1.5} />
          <path d="M36 34v10M42 34v10M36 37h6M36 41h6" strokeWidth={1.5} />
          <path d="M4 45h40" strokeDasharray="3 3" strokeWidth={1.5} />
        </svg>
      );
    case "window_well":
      // house wall on the left, the well box against it, guard over the top
      return (
        <svg {...common}>
          <path d="M8 4v40" strokeWidth={2.5} />
          <path d="M8 20h28v20H8" />
          <path d="M8 24h5v12H8" strokeWidth={1.5} />
          <path d="M14 14h28" strokeWidth={2} />
          <path d="M20 14v6M28 14v6M36 14v6" strokeWidth={1.5} />
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
