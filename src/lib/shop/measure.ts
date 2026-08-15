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
  | "spiral"
  | "custom";

export const MEASURE_SHAPES: MeasureShape[] = [
  "straight",
  "stair_platform",
  "l_shape",
  "u_shape",
  "level_run",
  "ramp",
  "wall_rail",
  "spiral",
  "custom",
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
  // Detail (optional in the field, wanted by the shop):
  plate: string; // baseplate size + orientation
  anchors: string; // anchor pattern (qty, size)
  substrate: string; // substrate thickness / condition
  edgeDist: string; // distance to nearest concrete/masonry edge
  obstruction: string; // anything below/behind the mount
}

export interface FlightSegment {
  kind: "flight";
  steps: StepMeasure[];
  width: string; // stair width
  angleDeg: string; // measured stair pitch
  angleBreak: string; // "" = consistent pitch; otherwise where/how much it changes
  // Per-flight control measurements — required on multi-flight (L/U) stairs,
  // where a single overall rake cannot verify flights that turn:
  rake: string; // this flight's nose-to-nose diagonal
  ctrlRise: string; // this flight's measured total rise
  ctrlRun: string; // this flight's measured total run
}

export interface PlatformSegment {
  kind: "platform";
  length: string; // along the rail run
  depth: string;
  diag: string; // corner-to-corner diagonal — verifies squareness
  slope: string; // e.g. 1.2° or 3/8"/ft — rail gets pitched to match
  slopeDir: string; // which way it falls
  turn: "none" | "left" | "right" | "u"; // direction change after this landing
}

export interface RampSegment {
  kind: "ramp";
  length: string; // sloped length, along the ramp surface
  runH: string; // horizontal run
  rise: string; // vertical rise
  angleDeg: string; // measured angle
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
  // Control dimensions — measured independently, cross-checked by software:
  floorToFloor: string; // finished floor to finished floor
  widthBottom: string;
  widthMid: string;
  widthTop: string;
  notes: string;
}

// Where measurements originate from. Without these, "3 in from edge" is ambiguous.
export interface DatumsSpec {
  orientation: "" | "left_wall" | "right_wall" | "both_open" | "both_wall"; // looking UP the stairs
  bottomDatum: string; // what the bottom finished-floor datum is
  topDatum: string;
  nosingRef: string; // nosing reference line note
  postRef: "" | "centerline" | "face"; // post dims to centerline or face of post
  surfaceState: "" | "finished" | "unfinished" | "mixed";
}

// What surface existed when measured — the classic "right number, wrong day" trap.
export interface FinishSpec {
  bottomSurface: string;
  topSurface: string;
  futureTopping: string; // future tile/stone/wood + thickness
  treadCovering: string;
  wallFinish: string;
  demoPending: string;
  verifyAfterFinishes: boolean;
  notes: string;
}

// Fabrication-critical details, conditionally shown per shape.
export interface FabDetails {
  corners: string; // inside/outside corner treatment (multi-segment shapes)
  flightConnection: string; // connection between flights and landings
  bottomClearance: string;
  infill: string; // picket/infill orientation notes
  splices: string; // welded vs field-bolted splits
  maxPiece: string; // max piece size for transport
  access: string; // access path / elevator / installation clearances
  gate: string; // gate swing + latch (level runs)
  touchup: string; // finish + touch-up requirements
}

// A structured photo captured for this sheet (original file, unannotated).
export interface MeasurePhoto {
  slot: string; // which checklist slot (or post id) it documents
  path: string; // storage object path in the photos bucket
  takenAt: string;
}

export interface AnnotationStroke {
  tool: string; // draw | line | arrow | text
  color: string;
  points: { x: number; y: number }[];
  text?: string;
}

// ---- Rail spans: the fabrication question is "how long is this piece and
// exactly how does each end attach?" Every span has TWO terminations (start
// and end — never optional), a clear span at the top, and a clear span at
// molding/infill level. When existing columns carry bottom moldings, the two
// spans differ by the SUM of both molding projections — verified by software.

export type AttachTarget =
  | ""
  | "free_post" // free-standing new post (its mount lives in the Posts section)
  | "wall"
  | "existing_post"
  | "floor"
  | "continue" // continues into another rail/span
  | "splice" // field splice between pieces
  | "open"; // open / free end

export type AttachMethod =
  | ""
  | "clip"
  | "wall_plate"
  | "anchor" // embedded / engineered wall anchor
  | "plate" // plate bolted to existing column
  | "bolt_through"
  | "weld" // only into steel
  | "base_plate" // surface-mounted base plate
  | "core_drill"
  | "embedded"
  | "field_bolt";

export const ATTACH_TARGETS: AttachTarget[] = [
  "free_post",
  "wall",
  "existing_post",
  "floor",
  "continue",
  "splice",
  "open",
];

// Physically valid methods per attachment target — the UI only offers these
// and the submission gate rejects anything else.
export const METHODS_BY_ATTACH: Record<string, AttachMethod[]> = {
  wall: ["clip", "wall_plate", "anchor"],
  existing_post: ["clip", "plate", "bolt_through", "weld"],
  floor: ["base_plate", "core_drill", "embedded"],
  splice: ["field_bolt", "weld"],
  free_post: [],
  continue: [],
  open: [],
};

// Methods that need hardware detail + a close-up photo before fabrication.
export const HARDWARE_METHODS: AttachMethod[] = [
  "clip",
  "wall_plate",
  "anchor",
  "plate",
  "bolt_through",
  "base_plate",
  "core_drill",
  "embedded",
  "weld",
  "field_bolt",
];

export interface TermHardware {
  fastener: string; // fastener/anchor spec
  qty: string; // quantity
  elevation: string; // connection centerline height from finished floor
  shopField: "" | "shop_weld" | "field_bolt"; // how it joins the railing
  profile: string; // clip/plate/member profile + dimensions
  thickness: string;
  holeDia: string;
  holeSpacing: string;
  edgeDist: string;
  embedment: string; // anchor/core-drill embedment depth
  orientation: string;
  weldSize: string;
}

// Which hardware fields the SHOP needs to fabricate each connection type,
// beyond the base set. A record saying "clip, two lags, 34 in" cannot be
// manufactured — the clip itself needs dimensions.
export const HW_REQUIRED: Record<string, (keyof TermHardware)[]> = {
  clip: ["profile", "thickness", "holeDia", "holeSpacing", "orientation"],
  wall_plate: ["profile", "thickness", "holeDia", "holeSpacing", "orientation"],
  plate: ["profile", "thickness", "holeDia", "holeSpacing", "orientation"],
  base_plate: ["profile", "thickness", "holeDia", "holeSpacing", "orientation"],
  bolt_through: ["holeDia", "holeSpacing", "edgeDist"],
  anchor: ["embedment", "edgeDist"],
  weld: ["profile", "weldSize", "orientation"],
  field_bolt: ["profile", "holeDia", "holeSpacing", "orientation"],
  core_drill: ["holeDia", "embedment"],
  embedded: ["embedment"],
};

// Methods where a fastener spec + quantity make sense (everything but pure welds).
export const FASTENER_METHODS: AttachMethod[] = [
  "clip",
  "wall_plate",
  "anchor",
  "plate",
  "bolt_through",
  "base_plate",
  "core_drill",
  "embedded",
  "field_bolt",
];

export interface Termination {
  attachTo: AttachTarget;
  method: AttachMethod;
  postId: string; // free_post: which measured post carries this end
  spanRef: string; // continue: id of the adjoining span
  material: string; // wall/column/floor material
  backing: string; // wall: structural backing behind finish; wood floor: blocking/through-bolt detail
  columnW: string; // existing column width facing the rail (at attachment elevation)
  columnD: string; // existing column depth
  molding: string; // molding projection at this end; "" = none
  moldingHeight: string; // how high the molding runs
  plumb: string; // square/plumb condition
  hardware: TermHardware;
  note: string;
}

export interface RailSpan {
  id: string;
  label: string; // "main rail, right side", "return at top"…
  topSpan: string; // clear span measured at the top (fabrication length)
  lowerSpan: string; // clear span at molding/infill level
  start: Termination;
  end: Termination;
  note: string;
}

export function newTermination(): Termination {
  return {
    attachTo: "",
    method: "",
    postId: "",
    spanRef: "",
    material: "",
    backing: "",
    columnW: "",
    columnD: "",
    molding: "",
    moldingHeight: "",
    plumb: "",
    hardware: {
      fastener: "",
      qty: "",
      elevation: "",
      shopField: "",
      profile: "",
      thickness: "",
      holeDia: "",
      holeSpacing: "",
      edgeDist: "",
      embedment: "",
      orientation: "",
      weldSize: "",
    },
    note: "",
  };
}

export function newSpan(): RailSpan {
  return {
    id: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    label: "",
    topSpan: "",
    lowerSpan: "",
    start: newTermination(),
    end: newTermination(),
    note: "",
  };
}

// Custom shape: the crew draws the railing's plan (top view) as connected
// line segments, then dimensions each drawn segment. The drawing stays
// structured — every line is a numbered segment with its own measurement —
// so completeness checks and the shop printout still work.
export interface PlanDrawing {
  points: { x: number; y: number }[]; // canvas coords, snapped
  closed: boolean; // last point connects back to the first
  segs: { len: string; note: string }[]; // one per drawn line, in draw order
}

export type Units = "in" | "ftin";
export type SheetStatus = "in_progress" | "submitted" | "approved";

export interface MeasureData {
  segments: Segment[];
  posts: PostMeasure[];
  spiral: SpiralData | null;
  rail: RailSpec;
  materials: MaterialsSpec;
  overall: OverallSpec;
  datums: DatumsSpec;
  finish: FinishSpec;
  fab: FabDetails;
  photos: MeasurePhoto[];
  annotations: Record<string, AnnotationStroke[]>; // storage path -> strokes
  plan?: PlanDrawing | null; // custom shape: the drawn top view
  spans: RailSpan[]; // every rail piece with BOTH end terminations
  units?: Units; // measurement entry unit — inches (default) or feet+inches
}

export interface MeasureSheet {
  id: string;
  job_id: string;
  name: string | null;
  shape: MeasureShape;
  status: string; // in_progress | submitted | approved
  data: MeasureData;
  review_comment: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  current_rev: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeasureRevision {
  id: string;
  sheet_id: string;
  rev_no: number;
  name: string | null;
  shape: string;
  data: MeasureData;
  approved_by: string | null;
  approved_at: string;
  superseded: boolean;
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
  post: [
    '1-1/2" sq tube',
    '2" sq tube',
    '1-1/2" Sch40 pipe',
    '1-1/4" Sch40 pipe',
    '1-1/2" flat bar',
    '2" flat bar',
    '2-1/2" flat bar',
  ],
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
    rake: "",
    ctrlRise: "",
    ctrlRun: "",
  };
}

function blankPlatform(turn: PlatformSegment["turn"] = "none"): PlatformSegment {
  return { kind: "platform", length: "", depth: "", diag: "", slope: "", slopeDir: "", turn };
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
      segments = [{ kind: "ramp", length: "", runH: "", rise: "", angleDeg: "", width: "" }];
      break;
    case "wall_rail":
      segments = [blankFlight(steps1)];
      break;
    case "custom":
      segments = [];
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
    units: "in",
    segments,
    posts: [],
    spiral,
    plan: shape === "custom" ? { points: [], closed: false, segs: [] } : null,
    spans: [newSpan()],
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
    overall: blankOverall(),
    datums: blankDatums(),
    finish: blankFinish(),
    fab: blankFab(),
    photos: [],
    annotations: {},
  };
}

export function blankOverall(): OverallSpec {
  return {
    totalRise: "",
    totalRun: "",
    rakeLength: "",
    floorToFloor: "",
    widthBottom: "",
    widthMid: "",
    widthTop: "",
    notes: "",
  };
}
export function blankDatums(): DatumsSpec {
  return {
    orientation: "",
    bottomDatum: "",
    topDatum: "",
    nosingRef: "",
    postRef: "",
    surfaceState: "",
  };
}
export function blankFinish(): FinishSpec {
  return {
    bottomSurface: "",
    topSurface: "",
    futureTopping: "",
    treadCovering: "",
    wallFinish: "",
    demoPending: "",
    verifyAfterFinishes: false,
    notes: "",
  };
}
export function blankFab(): FabDetails {
  return {
    corners: "",
    flightConnection: "",
    bottomClearance: "",
    infill: "",
    splices: "",
    maxPiece: "",
    access: "",
    gate: "",
    touchup: "",
  };
}

export function newPost(segIdx: number, stepIdx: number | null): PostMeasure {
  return {
    id: newPostId(),
    segIdx,
    stepIdx,
    pos: "",
    fromNosing: "",
    fromEdge: "",
    mount: "",
    anchor: "",
    plate: "",
    anchors: "",
    substrate: "",
    edgeDist: "",
    obstruction: "",
  };
}

// Sheets saved before a field existed get the blank version filled in, so the
// editor and checks never see undefined. Never drops or rewrites entered data.
export function normalizeMeasureData(raw: Partial<MeasureData> | null | undefined): MeasureData {
  const d = (raw || {}) as Partial<MeasureData>;
  return {
    units: d.units === "ftin" ? "ftin" : "in",
    segments: (d.segments || []).map((seg) => {
      if (seg.kind === "flight") {
        return {
          ...seg,
          rake: seg.rake ?? "",
          ctrlRise: seg.ctrlRise ?? "",
          ctrlRun: seg.ctrlRun ?? "",
        };
      }
      if (seg.kind === "platform") return { ...seg, diag: seg.diag ?? "" };
      if (seg.kind === "ramp") return { ...seg, runH: seg.runH ?? "" };
      return seg;
    }),
    posts: (d.posts || []).map((p) => ({
      ...p,
      plate: p.plate ?? "",
      anchors: p.anchors ?? "",
      substrate: p.substrate ?? "",
      edgeDist: p.edgeDist ?? "",
      obstruction: p.obstruction ?? "",
    })),
    spiral: d.spiral ?? null,
    rail: { kind: "Guardrail", height: "", side: "", extensions: "", returns: "", brackets: "", ...(d.rail || {}) },
    materials: {
      post: "",
      topRail: "",
      picket: "",
      picketSpacing: "",
      bottomRail: "",
      finish: "",
      color: "",
      notes: "",
      ...(d.materials || {}),
    },
    overall: { ...blankOverall(), ...(d.overall || {}) },
    datums: { ...blankDatums(), ...(d.datums || {}) },
    finish: { ...blankFinish(), ...(d.finish || {}) },
    fab: { ...blankFab(), ...(d.fab || {}) },
    photos: d.photos || [],
    annotations: d.annotations || {},
    plan: d.plan ?? null,
    spans: (d.spans || []).map((sp) => ({
      ...newSpan(),
      ...sp,
      start: { ...newTermination(), ...(sp.start || {}), hardware: { ...newTermination().hardware, ...(sp.start?.hardware || {}) } },
      end: { ...newTermination(), ...(sp.end || {}), hardware: { ...newTermination().hardware, ...(sp.end?.hardware || {}) } },
    })),
  };
}

// ---- Structured photo checklist -------------------------------------------

// Required checklist slots per shape; labels come from measure-i18n (slot_<key>).
export function requiredPhotoSlots(shape: MeasureShape): string[] {
  switch (shape) {
    case "spiral":
      return ["overall_bottom", "overall_top"];
    case "level_run":
    case "wall_rail":
    case "custom":
      return ["overall_bottom", "overall_top", "bottom_term", "top_term"];
    default:
      return [
        "overall_bottom",
        "overall_top",
        "bottom_term",
        "top_term",
        "left_side",
        "right_side",
      ];
  }
}
export const OPTIONAL_PHOTO_SLOTS = ["landing", "obstruction", "tape_critical"] as const;

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
  if (data.plan) for (const seg of data.plan.segs) vals.push(seg.len);
  vals.push(data.rail.height, data.materials.post, data.materials.topRail);
  const total = vals.length;
  const filled = vals.filter((v) => v && v.trim() !== "").length;
  return { filled, total };
}
