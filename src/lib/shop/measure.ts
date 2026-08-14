// KIW Field Measure — pre-fabrication measurement sheets.
// A sheet belongs to a job, has a shape (stair layout), and stores every field
// in a JSONB payload so shapes can evolve without migrations. All measurements
// are free-text strings ("23 3/4") because crews work in inches + fractions.

export type MeasureShape =
  | "straight"
  | "stair_platform"
  | "l_shape"
  | "u_shape"
  | "level_run"
  | "ramp"
  | "wall_rail"
  | "spiral";

export const MEASURE_SHAPES: MeasureShape[] = [
  "straight",
  "stair_platform",
  "l_shape",
  "u_shape",
  "level_run",
  "ramp",
  "wall_rail",
  "spiral",
];

// Shapes made of two flights (a landing sits between them).
export const TWO_FLIGHT_SHAPES: MeasureShape[] = ["l_shape", "u_shape"];

export interface StepMeasure {
  rise: string; // riser height
  run: string; // tread depth, nose to riser
  nosing: string; // nosing overhang ("Back 5" on field sheets)
}

export interface PostMeasure {
  id: string;
  segIdx: number; // which segment the post sits on
  stepIdx: number | null; // tread index within a flight (0 = bottom step); null = on the platform/landing
  pos: string; // platform posts: distance along the platform from its start
  fromNosing: string; // setback from the tread nosing (or platform edge)
  fromEdge: string; // setback from the open side edge
  mount: string; // Core-drill | Base plate | Side mount
  anchor: string; // what it anchors into (granite, concrete, brick…)
}

export interface FlightSegment {
  kind: "flight";
  steps: StepMeasure[];
  width: string; // stair width
  angleDeg: string; // measured stair pitch
  angleBreak: string; // "" = consistent pitch; otherwise where/how much it changes
}

export interface PlatformSegment {
  kind: "platform";
  length: string; // along the rail run
  depth: string;
  slope: string; // e.g. 1.2° or 3/8"/ft — rail gets pitched to match
  slopeDir: string; // which way it falls
  turn: "none" | "left" | "right" | "u"; // direction change after this landing
}

export interface RampSegment {
  kind: "ramp";
  length: string;
  rise: string;
  angleDeg: string;
  width: string;
}

export type Segment = FlightSegment | PlatformSegment | RampSegment;

export interface SpiralData {
  floorToFloor: string;
  treads: string;
  rotationDeg: string; // total rotation bottom to top
  direction: "cw" | "ccw";
  diameter: string;
  columnSize: string;
  clearWidth: string;
  landingNote: string;
}

export interface RailSpec {
  kind: string; // Guardrail | Handrail | Both
  height: string;
  side: string; // Left | Right | Both (looking up the stairs)
  extensions: string; // code extensions at top/bottom
  returns: string; // wall returns / loop ends
  brackets: string; // wall-rail bracket count + spacing
}

export interface MaterialsSpec {
  post: string;
  topRail: string;
  picket: string;
  picketSpacing: string;
  bottomRail: string;
  finish: string;
  color: string;
  notes: string;
}

export interface OverallSpec {
  totalRise: string;
  totalRun: string;
  rakeLength: string; // nose-to-nose along the pitch — the rail line
  notes: string;
}

export interface MeasureData {
  segments: Segment[];
  posts: PostMeasure[];
  spiral: SpiralData | null;
  rail: RailSpec;
  materials: MaterialsSpec;
  overall: OverallSpec;
}

export interface MeasureSheet {
  id: string;
  job_id: string;
  name: string | null;
  shape: MeasureShape;
  status: string; // in_progress | ready
  data: MeasureData;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const MOUNT_OPTIONS = ["Core-drill", "Base plate", "Side mount"] as const;
export const ANCHOR_OPTIONS = [
  "Granite",
  "Bluestone",
  "Concrete",
  "Brick",
  "Wood",
  "Steel",
] as const;
export const RAIL_KIND_OPTIONS = ["Guardrail", "Handrail", "Both"] as const;
export const RAIL_SIDE_OPTIONS = ["Left", "Right", "Both"] as const;

// Common KIW profiles offered as quick chips (free text still allowed).
export const MATERIAL_PRESETS = {
  post: ['1-1/2" sq tube', '2" sq tube', '1-1/2" Sch40 pipe', '1-1/4" Sch40 pipe'],
  topRail: ["Molded cap rail", '1-1/2" sq tube', '1-1/2" Sch40 pipe', "Flat bar 2x3/8"],
  picket: ['1/2" sq solid', '5/8" sq solid', '3/4" sq tube', '1" sq tube'],
  bottomRail: ['1" x 1/2" channel', "Flat bar 1-1/2x3/8", "Shoe rail", "None (into treads)"],
} as const;

function blankStep(): StepMeasure {
  return { rise: "", run: "", nosing: "" };
}

function blankFlight(steps: number): FlightSegment {
  return {
    kind: "flight",
    steps: Array.from({ length: Math.max(1, steps) }, blankStep),
    width: "",
    angleDeg: "",
    angleBreak: "",
  };
}

function blankPlatform(turn: PlatformSegment["turn"] = "none"): PlatformSegment {
  return { kind: "platform", length: "", depth: "", slope: "", slopeDir: "", turn };
}

export function newMeasureData(
  shape: MeasureShape,
  steps1: number,
  steps2 = 0
): MeasureData {
  let segments: Segment[] = [];
  let spiral: SpiralData | null = null;

  switch (shape) {
    case "straight":
      segments = [blankFlight(steps1)];
      break;
    case "stair_platform":
      segments = [blankFlight(steps1), blankPlatform()];
      break;
    case "l_shape":
      segments = [blankFlight(steps1), blankPlatform("left"), blankFlight(steps2 || steps1)];
      break;
    case "u_shape":
      segments = [blankFlight(steps1), blankPlatform("u"), blankFlight(steps2 || steps1)];
      break;
    case "level_run":
      segments = [blankPlatform()];
      break;
    case "ramp":
      segments = [{ kind: "ramp", length: "", rise: "", angleDeg: "", width: "" }];
      break;
    case "wall_rail":
      segments = [blankFlight(steps1)];
      break;
    case "spiral":
      spiral = {
        floorToFloor: "",
        treads: String(steps1 || ""),
        rotationDeg: "",
        direction: "ccw",
        diameter: "",
        columnSize: "",
        clearWidth: "",
        landingNote: "",
      };
      break;
  }

  return {
    segments,
    posts: [],
    spiral,
    rail: { kind: "Guardrail", height: "", side: "", extensions: "", returns: "", brackets: "" },
    materials: {
      post: "",
      topRail: "",
      picket: "",
      picketSpacing: "",
      bottomRail: "",
      finish: "DTM Epoxy",
      color: "Black",
      notes: "",
    },
    overall: { totalRise: "", totalRun: "", rakeLength: "", notes: "" },
  };
}

export function newPostId(): string {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// Count of filled vs total measurement fields — drives the completeness badge.
export function sheetProgress(data: MeasureData): { filled: number; total: number } {
  const vals: string[] = [];
  for (const seg of data.segments) {
    if (seg.kind === "flight") {
      for (const s of seg.steps) vals.push(s.rise, s.run);
      vals.push(seg.width, seg.angleDeg);
    } else if (seg.kind === "platform") {
      vals.push(seg.length, seg.depth);
    } else {
      vals.push(seg.length, seg.rise, seg.angleDeg, seg.width);
    }
  }
  for (const p of data.posts) vals.push(p.fromNosing, p.fromEdge, p.mount);
  if (data.spiral) {
    vals.push(
      data.spiral.floorToFloor,
      data.spiral.treads,
      data.spiral.rotationDeg,
      data.spiral.diameter,
      data.spiral.columnSize
    );
  }
  vals.push(data.rail.height, data.materials.post, data.materials.topRail);
  const total = vals.length;
  const filled = vals.filter((v) => v && v.trim() !== "").length;
  return { filled, total };
}
