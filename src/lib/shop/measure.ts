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
  | "window_well"
  | "fire_escape"
  | "gate"
  | "fence"
  | "balcony"
  | "builder"
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
  "window_well",
  "fire_escape",
  "gate",
  "fence",
  "balcony",
  "builder",
  "custom",
];

export type MeasurePreset =
  | "winder_l"
  | "winder_u"
  | "curved_helical"
  | "three_flight"
  | "bifurcated"
  | "irregular_stoop";

export const MEASURE_PRESETS: MeasurePreset[] = [
  "winder_l",
  "winder_u",
  "curved_helical",
  "three_flight",
  "bifurcated",
  "irregular_stoop",
];

// Shapes made of two flights (a landing sits between them).
export const TWO_FLIGHT_SHAPES: MeasureShape[] = ["l_shape", "u_shape"];

export interface StepMeasure {
  rise: string; // riser height
  run: string; // tread depth at the walkline, nose to riser
  nosing: string; // nosing overhang ("Back 5" on field sheets)
  levelGap?: string; // gap under a straight level spanning the flight; 0 = touches
  // Winder treads (triangular/kite steps that turn the stair):
  winder?: boolean;
  runIn?: string; // tread depth at the inside (narrow) edge
  runOut?: string; // tread depth at the outside (wide) edge
  turnDeg?: string; // how much this tread turns the direction of travel
}

export interface PostMeasure {
  id: string;
  pointType: "railing_post" | "existing_post" | "concrete_wall" | "clip";
  side: "" | "left" | "right"; // always viewed from bottom step looking up
  segIdx: number; // which segment the post sits on
  stepIdx: number | null; // tread index within a flight (0 = bottom step); null = on the platform/landing
  pos: string; // platform posts: distance along the platform from its start
  distanceFromFirst: string; // first-step edge to the edge of the destination tread
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
  existingW: string; // existing structural/wood/concrete post face width
  existingD: string;
  skirtProjection: string; // molding/skirt projection beyond the structural post face
  skirtHeight: string;
  // Gap measured from the infill (end picket or rail end) to the face of that
  // skirt — the surface that sticks out furthest. Above the skirt the column
  // steps back, so the real gap up there is this plus the skirt projection,
  // which is what an inspector's sphere finds. See sphereClearance().
  infillGap: string;
  columnToWall: string; // clear distance from existing column/post face to wall
  columnToPlatformEdge: string; // clear distance from column/post face to platform edge
  clipDetail: string;
}

export interface FlightSegment {
  kind: "flight";
  // Bifurcated stairs have one common lower flight and two alternative upper
  // branches. Branches are measured independently and are never added to one
  // another for the floor-to-floor check.
  branch?: "left" | "right";
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

// Curved / radius rail section. Redundant geometry: for a circular arc,
// chord = 2R·sin(θ/2) and arc = R·θ — so radius, chord and arc are
// cross-checked against each other.
export interface CurveSegment {
  kind: "curve";
  radius: string; // to the rail centerline
  chord: string; // straight line end-to-end
  arc: string; // length along the curve
  sweepDeg: string; // total turn (optional — derivable from radius+chord)
  rise: string; // total rise across the curve ("" = level radius rail)
  direction: "left" | "right";
  width: string;
}

export type Segment = FlightSegment | PlatformSegment | RampSegment | CurveSegment;

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

// ---- Fire escapes ----------------------------------------------------------
// KIW does three different jobs on a fire escape and they need different
// numbers: a 5-year inspection records condition, a repair records condition
// plus what is being replaced, and a new installation needs full geometry.
// The purpose is asked first and drives what the sheet requires.

export type FireEscapePurpose = "" | "inspect" | "repair" | "new";
export const FIRE_PURPOSES: Exclude<FireEscapePurpose, "">[] = ["inspect", "repair", "new"];

export type ConditionRating = "" | "pass" | "monitor" | "fail";
export const CONDITION_RATINGS: Exclude<ConditionRating, "">[] = ["pass", "monitor", "fail"];

// What an inspector writes down at one level, or for the structure overall.
export interface FireCondition {
  rating: ConditionRating;
  rust: string; // where, and how deep
  sectionLoss: string; // measured loss at the worst spot
  cracks: string;
  deck: string; // grating / treads
  guards: string; // loose or missing pickets, rail movement
  anchors: string; // the connection to the building
  notes: string;
}

export function blankCondition(): FireCondition {
  return { rating: "", rust: "", sectionLoss: "", cracks: "", deck: "", guards: "", anchors: "", notes: "" };
}

// One floor of the structure: the balcony that serves an opening, and the
// stair running down from it to the level below.
export interface FireLevel {
  id: string;
  label: string; // "2nd floor"
  floorToFloor: string; // down to the level below ("" on the lowest level)
  heightAboveGrade: string; // platform deck above grade
  // Balcony
  platLength: string; // along the building wall
  platWidth: string; // projection out from the wall
  deck: string; // bar grating / checker plate / open bar
  // The window or door it serves
  openingType: "" | "window" | "door";
  openingW: string;
  openingH: string;
  sillToPlatform: string; // step-over height from the deck to the sill
  // Stair down to the level below — blank on the lowest level, which drops a ladder
  stairRisers: string;
  stairRise: string;
  stairRun: string;
  stairWidth: string;
  stairAngle: string;
  // Guard
  guardHeight: string;
  picketSpacing: string;
  // How this level holds to the building
  anchorType: string;
  anchorCount: string;
  anchorSpacing: string;
  condition: FireCondition;
}

export function newFireLevel(label = ""): FireLevel {
  return {
    id: newPostId(),
    label,
    floorToFloor: "",
    heightAboveGrade: "",
    platLength: "",
    platWidth: "",
    deck: "",
    openingType: "",
    openingW: "",
    openingH: "",
    sillToPlatform: "",
    stairRisers: "",
    stairRise: "",
    stairRun: "",
    stairWidth: "",
    stairAngle: "",
    guardHeight: "",
    picketSpacing: "",
    anchorType: "",
    anchorCount: "",
    anchorSpacing: "",
    condition: blankCondition(),
  };
}

// The last leg to the ground. Almost every violation KIW gets called about
// lives here: the ladder is seized, or it no longer reaches.
export interface DropLadder {
  present: boolean;
  type: "" | "drop" | "swing" | "counterbalance" | "fixed";
  length: string;
  width: string;
  rungSpacing: string;
  stowedAboveGrade: string; // bottom rung above grade, stowed
  deployedAboveGrade: string; // bottom rung above grade, deployed
  landingSurface: string; // sidewalk / grass / alley / roof
  obstructions: string; // AC units, fences, parked cars, planting
  operates: "" | "yes" | "stiff" | "seized";
}

export function blankLadder(): DropLadder {
  return {
    present: true,
    type: "",
    length: "",
    width: "",
    rungSpacing: "",
    stowedAboveGrade: "",
    deployedAboveGrade: "",
    landingSurface: "",
    obstructions: "",
    operates: "",
  };
}

export interface FireEscapeData {
  purpose: FireEscapePurpose;
  levels: FireLevel[];
  ladder: DropLadder;
  // The building it hangs on
  stories: string;
  wallMaterial: string; // brick / block / concrete / wood frame / stone
  totalHeight: string; // top platform deck to grade
  access: string; // how the crew reaches it — staging, lift, alley width
  // Inspection outcome
  overall: FireCondition;
  loadTest: string;
  paintSystem: string;
  violations: string; // what was cited, if this came from a notice
  notes: string;
}

export function blankFireEscape(levels: number): FireEscapeData {
  const n = Math.min(12, Math.max(1, levels || 2));
  return {
    purpose: "",
    // Numbered from the top down, the way they are walked and drawn.
    levels: Array.from({ length: n }, (_, i) => newFireLevel(String(n - i + 1))),
    ladder: blankLadder(),
    stories: String(n),
    wallMaterial: "",
    totalHeight: "",
    access: "",
    overall: blankCondition(),
    loadTest: "",
    paintSystem: "",
    violations: "",
    notes: "",
  };
}

// ---- Gates -----------------------------------------------------------------
// The callback on a gate is almost never the gate — it is the ground. A leaf
// that swings over rising grade binds before it is fully open, so the bottom
// clearance and the grade rise across the swing are measured together and
// checked against each other.

export interface GateData {
  use: "" | "driveway" | "walk" | "service" | "pool";
  operation: "" | "single_swing" | "double_swing" | "slide" | "bifold";
  // The opening, measured at both ends because posts are rarely plumb
  widthTop: string;
  widthBottom: string;
  heightHinge: string;
  heightLatch: string;
  diagA: string;
  diagB: string;
  // Ground
  groundClearance: string; // bottom of leaf to grade, closed
  gradeRise: string; // grade rise across the swing path (+ rises, - falls)
  swingDir: "" | "in" | "out" | "both";
  hingeSide: "" | "left" | "right";
  surface: string; // asphalt / concrete / gravel / grass
  // Posts
  postsExisting: boolean;
  postSize: string;
  postMaterial: string;
  footingDepth: string;
  // Leaf + hardware
  leafCount: string;
  infill: string;
  picketSpacing: string;
  hinges: string;
  latch: string;
  dropRod: string;
  // Automation
  automated: boolean;
  opener: string;
  powerAtGate: "" | "yes" | "no" | "unknown";
  safetyDevices: string;
  notes: string;
}

export function blankGate(): GateData {
  return {
    use: "", operation: "", widthTop: "", widthBottom: "", heightHinge: "", heightLatch: "",
    diagA: "", diagB: "", groundClearance: "", gradeRise: "", swingDir: "", hingeSide: "",
    surface: "", postsExisting: false, postSize: "", postMaterial: "", footingDepth: "",
    leafCount: "", infill: "", picketSpacing: "", hinges: "", latch: "", dropRod: "",
    automated: false, opener: "", powerAtGate: "", safetyDevices: "", notes: "",
  };
}

// ---- Fence runs ------------------------------------------------------------
// A run is a chain of straight segments. Each is measured on its own AND the
// whole run is measured end to end, so the two can be checked against each
// other before anything is cut.

export interface FenceSegment {
  id: string;
  label: string;
  length: string;
  panels: string; // how many panels this segment takes
  height: string;
  turnDeg: string; // direction change at the END of this segment
  gradeChange: string; // rise or fall along this segment
  followsGrade: "" | "racked" | "stepped"; // how the panel meets the slope
  obstruction: string;
}

export function newFenceSegment(label = ""): FenceSegment {
  return { id: newPostId(), label, length: "", panels: "", height: "", turnDeg: "", gradeChange: "", followsGrade: "", obstruction: "" };
}

export interface FenceData {
  segments: FenceSegment[];
  totalRun: string; // measured end to end, independent of the segments
  panelWidth: string; // nominal panel / bay width
  postSpacing: string;
  postSize: string;
  footingDepth: string;
  height: string; // nominal height for the run
  picketSpacing: string;
  gates: string; // how many gates and roughly where
  startTerm: string; // what the run starts against
  endTerm: string;
  utilities: string; // what is buried on the line
  notes: string;
}

export function blankFence(segs: number): FenceData {
  const n = Math.min(24, Math.max(1, segs || 1));
  return {
    segments: Array.from({ length: n }, (_, i) => newFenceSegment(String(i + 1))),
    totalRun: "", panelWidth: "", postSpacing: "", postSize: "", footingDepth: "",
    height: "", picketSpacing: "", gates: "", startTerm: "", endTerm: "", utilities: "", notes: "",
  };
}

// ---- Balcony / juliet railings ---------------------------------------------
// These anchor into the edge of a slab, which is the one place concrete has
// the least to give. Embedment against slab thickness, and how close the
// anchor sits to the edge, are what decide whether the rail holds.

export interface BalconyData {
  kind: "" | "balcony" | "juliet" | "deck_edge" | "roof_edge";
  mount: "" | "top" | "fascia" | "core_drill" | "embedded";
  // The edge being railed
  edgeLength: string;
  projection: string; // how far the balcony comes off the building
  slabThickness: string;
  slabMaterial: string; // concrete / steel deck / wood framing
  edgeCondition: string; // spalling, drip edge, overhang
  // Rail
  guardHeight: string; // from finished floor
  picketSpacing: string;
  returns: string; // returns into the building at each end
  corners: string;
  // Anchorage — what the check turns on
  anchorType: string;
  anchorEmbedment: string;
  edgeDistance: string; // anchor centre to the slab edge
  minCover: string; // cover required below the anchor
  platePlan: string;
  // Site
  doorOpening: string; // the opening a juliet fronts
  finishedFloor: string; // what the floor will be when the rail goes on
  drainage: string; // scuppers, drains, slope the rail must clear
  notes: string;
}

export function blankBalcony(): BalconyData {
  return {
    kind: "", mount: "", edgeLength: "", projection: "", slabThickness: "", slabMaterial: "",
    edgeCondition: "", guardHeight: "", picketSpacing: "", returns: "", corners: "",
    anchorType: "", anchorEmbedment: "", edgeDistance: "", minCover: "", platePlan: "",
    doorOpening: "", finishedFloor: "", drainage: "", notes: "",
  };
}

// ---- Window / egress wells -------------------------------------------------
// A well is a concrete (or block / corrugated) box against the house holding a
// basement egress window. KIW supplies three things over it, in any
// combination: a grate, a guard with a gate, and a ladder down to the window.

export type WellDeliverable = "grate" | "guard" | "gate" | "ladder";

export const WELL_DELIVERABLES: WellDeliverable[] = ["grate", "guard", "gate", "ladder"];

// One horizontal band of the house wall the guard runs past. The guard's end
// post is dimensioned off the MOST PROUD surface (usually a water table trim),
// so every other band is recorded by how far it sits BACK from that face —
// the deepest one governs how close the post has to be. See wellClearance().
export interface WallBand {
  id: string;
  label: string; // "Water table trim", "Lap siding", "Foundation"
  setback: string; // how far back from the proud face (0 = it IS the proud face)
  fromTop: string; // band's top edge, measured down from the top of the well wall
  toTop: string; // band's bottom edge, same datum
}

export interface WellData {
  construction: "" | "poured_concrete" | "block" | "corrugated" | "stone" | "timber";
  // Footprint, taken at the TOP of the well wall
  lengthAtHouse: string; // outside to outside, along the house
  projection: string; // outside face of the far wall, out from the house
  insideLength: string; // clear inside, along the house
  insideProjection: string; // clear inside, out from the house
  wallThickness: string; // bearing width on top of the wall
  diagA: string; // inside corner to opposite corner — squareness
  diagB: string;
  depth: string; // top of the well wall down to the well floor
  topToGrade: string; // + wall stands above grade, - it sits below
  // The window in the foundation
  windowW: string;
  windowH: string;
  sillToFloor: string; // window sill above the well floor
  windowSwing: "" | "in" | "out" | "slider" | "fixed";
  // What KIW is supplying
  deliverables: WellDeliverable[];
  // Guard + gate
  guardHeight: string;
  gateWidth: string;
  gateSwing: "" | "in" | "out";
  gateHinge: "" | "left" | "right";
  gateLatch: string;
  // Ladder
  ladderWidth: string;
  ladderRungs: string;
  ladderSpacing: string; // rung to rung, on centre
  ladderStandoff: string; // rung face to the wall behind it
  ladderTopExt: string; // how far the rails run above the well wall
  // Grate
  grateBearing: "" | "surface" | "recessed" | "angle_frame";
  grateHinged: boolean;
  grateLoad: string;
  grateInfill: string;
  // House wall profile — drives the 4" sphere solver
  wallRef: string; // what the proud face is
  bands: WallBand[];
  postToWall: string; // measured clear gap, post face to the PROUD face
  maxSphere: string; // code sphere for this jurisdiction (default 4)
  notes: string;
}

export function newWallBand(label = ""): WallBand {
  return { id: newPostId(), label, setback: "", fromTop: "", toTop: "" };
}

export function blankWell(): WellData {
  return {
    construction: "",
    lengthAtHouse: "",
    projection: "",
    insideLength: "",
    insideProjection: "",
    wallThickness: "",
    diagA: "",
    diagB: "",
    depth: "",
    topToGrade: "",
    windowW: "",
    windowH: "",
    sillToFloor: "",
    windowSwing: "",
    deliverables: [],
    guardHeight: "",
    gateWidth: "",
    gateSwing: "",
    gateHinge: "",
    gateLatch: "",
    ladderWidth: "",
    ladderRungs: "",
    ladderSpacing: "",
    ladderStandoff: "",
    ladderTopExt: "",
    grateBearing: "",
    grateHinged: false,
    grateLoad: "",
    grateInfill: "",
    wallRef: "",
    bands: [],
    postToWall: "",
    maxSphere: "4",
    notes: "",
  };
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
  walkline: string; // winder walkline offset from the NARROW edge ("" = mid-width)
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
  floorChange: "" | "none" | "bottom" | "top" | "both";
  bottomAdjustment: string; // signed change from today's surface: + higher, - lower
  topAdjustment: string;
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
export type PlanSegmentKind = "" | "flight" | "landing" | "level" | "ramp" | "curve";

export interface PlanSegment {
  len: string;
  note: string;
  kind: PlanSegmentKind;
  steps: string;
  rise: string;
  run: string;
  width: string;
  stepMeasures: StepMeasure[]; // optional per-step corrections for irregular custom flights
}

export interface PlanDrawing {
  points: { x: number; y: number }[]; // canvas coords, snapped
  closed: boolean; // last point connects back to the first
  segs: PlanSegment[]; // one typed segment per drawn line, in draw order
}

export type Units = "in" | "ftin";
export type SheetStatus = "in_progress" | "submitted" | "approved";

export interface MeasureData {
  segments: Segment[];
  posts: PostMeasure[];
  spiral: SpiralData | null;
  well: WellData | null;
  fire: FireEscapeData | null;
  gate: GateData | null;
  fence: FenceData | null;
  balcony: BalconyData | null;
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

export function newFlightSegment(steps = 3): FlightSegment {
  return blankFlight(steps);
}
export function newPlatformSegment(turn: PlatformSegment["turn"] = "left"): PlatformSegment {
  return blankPlatform(turn);
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

export function blankCurve(): CurveSegment {
  return {
    kind: "curve",
    radius: "",
    chord: "",
    arc: "",
    sweepDeg: "",
    rise: "",
    direction: "left",
    width: "",
  };
}

export function blankRamp(): RampSegment {
  return { kind: "ramp", length: "", runH: "", rise: "", angleDeg: "", width: "" };
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
  let well: WellData | null = null;
  let fire: FireEscapeData | null = null;
  let gate: GateData | null = null;
  let fence: FenceData | null = null;
  let balcony: BalconyData | null = null;

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
    case "builder":
      segments = [blankFlight(steps1)];
      break;
    case "custom":
      segments = [];
      break;
    case "window_well":
      well = blankWell();
      break;
    case "fire_escape":
      // steps1 carries the number of levels for this shape.
      fire = blankFireEscape(steps1);
      break;
    case "gate":
      gate = blankGate();
      break;
    case "fence":
      // steps1 carries the number of straight segments in the run.
      fence = blankFence(steps1);
      break;
    case "balcony":
      balcony = blankBalcony();
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
    well,
    fire,
    gate,
    fence,
    balcony,
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

export function newPresetMeasureData(
  preset: MeasurePreset,
  steps1: number,
  steps2 = 0,
  steps3 = 0
): { shape: MeasureShape; data: MeasureData } {
  const upper = steps2 || steps1;
  if (preset === "winder_l" || preset === "winder_u") {
    const shape: MeasureShape = preset === "winder_l" ? "l_shape" : "u_shape";
    const data = newMeasureData(shape, steps1, upper);
    data.segments = [blankFlight(steps1), blankFlight(upper)];
    const a = data.segments[0] as FlightSegment;
    const b = data.segments[1] as FlightSegment;
    // Two 45° winders create an L turn. A U turn uses four 45° winders
    // across the flight transition. Never assign 90° to every tread: that
    // incorrectly accumulates to a full circle in the plan sketch.
    a.steps.slice(-2).forEach((s) => Object.assign(s, { winder: true, runIn: "", runOut: "", turnDeg: "45" }));
    if (preset === "winder_u") {
      b.steps.slice(0, 2).forEach((s) => Object.assign(s, { winder: true, runIn: "", runOut: "", turnDeg: "45" }));
    }
    return { shape, data };
  }
  if (preset === "curved_helical") {
    const data = newMeasureData("builder", steps1, upper);
    data.segments = [blankCurve()];
    data.overall.notes = "Curved / helical stair railing — verify each tread and elevation with site photos.";
    return { shape: "builder", data };
  }
  if (preset === "three_flight") {
    const data = newMeasureData("builder", steps1, upper);
    data.segments = [
      blankFlight(steps1),
      blankPlatform("left"),
      blankFlight(upper),
      blankPlatform("left"),
      blankFlight(steps3 || upper),
    ];
    return { shape: "builder", data };
  }
  if (preset === "bifurcated") {
    const data = newMeasureData("builder", steps1, upper);
    const left = blankFlight(upper);
    const right = blankFlight(steps3 || upper);
    left.branch = "left";
    right.branch = "right";
    data.segments = [blankFlight(steps1), blankPlatform("none"), left, right];
    data.overall.notes = "Bifurcated stair: Flight 1 is common; Flights 2 and 3 are independent upper branches.";
    return { shape: "builder", data };
  }
  const data = newMeasureData("builder", steps1, upper);
  data.overall.notes = "Irregular exterior stoop — measure every rise and run; do not use typical-step assumptions unless verified.";
  return { shape: "builder", data };
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
    walkline: "",
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
    floorChange: "",
    bottomAdjustment: "",
    topAdjustment: "",
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
    pointType: "railing_post",
    side: "",
    segIdx,
    stepIdx,
    pos: "",
    distanceFromFirst: "",
    fromNosing: "",
    fromEdge: "",
    mount: "",
    anchor: "",
    plate: "",
    anchors: "",
    substrate: "",
    edgeDist: "",
    obstruction: "",
    existingW: "",
    existingD: "",
    skirtProjection: "",
    skirtHeight: "",
    infillGap: "",
    columnToWall: "",
    columnToPlatformEdge: "",
    clipDetail: "",
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
          steps: seg.steps.map((step) => ({ ...step, levelGap: step.levelGap ?? "" })),
          rake: seg.rake ?? "",
          ctrlRise: seg.ctrlRise ?? "",
          ctrlRun: seg.ctrlRun ?? "",
        };
      }
      if (seg.kind === "platform") return { ...seg, diag: seg.diag ?? "" };
      if (seg.kind === "ramp") return { ...seg, runH: seg.runH ?? "" };
      if (seg.kind === "curve") return { ...blankCurve(), ...seg };
      return seg;
    }),
    posts: (d.posts || []).map((p) => ({
      ...p,
      pointType: p.pointType ?? "railing_post",
      side: p.side === "left" || p.side === "right" ? p.side : "",
      distanceFromFirst: p.distanceFromFirst ?? "",
      plate: p.plate ?? "",
      anchors: p.anchors ?? "",
      substrate: p.substrate ?? "",
      edgeDist: p.edgeDist ?? "",
      obstruction: p.obstruction ?? "",
      existingW: p.existingW ?? "",
      existingD: p.existingD ?? "",
      skirtProjection: p.skirtProjection ?? "",
      skirtHeight: p.skirtHeight ?? "",
      infillGap: p.infillGap ?? "",
      columnToWall: p.columnToWall ?? "",
      columnToPlatformEdge: p.columnToPlatformEdge ?? "",
      clipDetail: p.clipDetail ?? "",
    })),
    spiral: d.spiral ?? null,
    well: d.well ? { ...blankWell(), ...d.well, deliverables: d.well.deliverables ?? [], bands: (d.well.bands || []).map((b) => ({ ...newWallBand(), ...b })) } : null,
    fire: d.fire
      ? {
          ...blankFireEscape(1),
          ...d.fire,
          levels: (d.fire.levels || []).map((l) => ({
            ...newFireLevel(),
            ...l,
            condition: { ...blankCondition(), ...(l.condition || {}) },
          })),
          ladder: { ...blankLadder(), ...(d.fire.ladder || {}) },
          overall: { ...blankCondition(), ...(d.fire.overall || {}) },
        }
      : null,
    gate: d.gate ? { ...blankGate(), ...d.gate } : null,
    fence: d.fence
      ? {
          ...blankFence(1),
          ...d.fence,
          segments: (d.fence.segments || []).map((g) => ({ ...newFenceSegment(), ...g })),
        }
      : null,
    balcony: d.balcony ? { ...blankBalcony(), ...d.balcony } : null,
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
    plan: d.plan ? {
      ...d.plan,
      segs: d.plan.segs.map((sg) => ({
        ...sg,
        // Drawings saved before typed custom segments existed represented
        // ordinary level railing lines; keep them valid and editable.
        kind: sg.kind ?? "level",
        steps: sg.steps ?? "",
        rise: sg.rise ?? "",
        run: sg.run ?? "",
        width: sg.width ?? "",
        stepMeasures: (sg.stepMeasures || []).map((st) => ({ ...st, levelGap: st.levelGap ?? "" })),
      })),
    } : null,
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
    case "window_well":
      // The wall profile photo is the one that settles the 4" argument.
      return ["well_overall", "well_wall_profile", "well_window", "well_inside"];
    case "fire_escape":
      // The anchors and the drop ladder are what inspections turn on.
      return ["fe_elevation", "fe_anchors", "fe_ladder", "fe_deck"];
    case "gate":
      return ["gate_opening", "gate_posts", "gate_ground"];
    case "fence":
      return ["fence_run", "fence_start", "fence_end", "fence_grade"];
    case "balcony":
      // The slab edge is the photo the shop argues about.
      return ["bal_overall", "bal_slab_edge", "bal_mount"];
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
    } else if (seg.kind === "ramp") {
      vals.push(seg.length, seg.rise, seg.angleDeg, seg.width);
    } else if (seg.kind === "curve") {
      vals.push(seg.radius, seg.chord, seg.arc, seg.width);
    }
  }
  for (const p of data.posts) vals.push(p.distanceFromFirst, p.fromNosing, p.fromEdge, p.pointType === "railing_post" ? p.mount : p.pointType);
  if (data.gate) {
    const g = data.gate;
    vals.push(g.use, g.operation, g.widthTop, g.widthBottom, g.heightHinge, g.groundClearance, g.gradeRise);
    if (g.automated) vals.push(g.opener, g.powerAtGate);
  }
  if (data.fence) {
    const fc = data.fence;
    vals.push(fc.totalRun, fc.height, fc.postSpacing, fc.startTerm, fc.endTerm);
    for (const sg of fc.segments) vals.push(sg.length, sg.height);
  }
  if (data.balcony) {
    const b = data.balcony;
    vals.push(b.kind, b.mount, b.edgeLength, b.guardHeight, b.slabThickness, b.anchorEmbedment, b.edgeDistance);
  }
  if (data.fire) {
    const f = data.fire;
    vals.push(f.purpose, f.stories, f.wallMaterial, f.totalHeight);
    for (const l of f.levels) {
      vals.push(l.platLength, l.platWidth, l.heightAboveGrade, l.guardHeight);
      if (f.purpose === "new") vals.push(l.stairRisers, l.stairRise, l.stairRun, l.stairWidth);
      if (f.purpose !== "new") vals.push(l.condition.rating);
    }
    if (f.ladder.present) vals.push(f.ladder.type, f.ladder.length, f.ladder.stowedAboveGrade);
    if (f.purpose !== "new") vals.push(f.overall.rating);
  }
  if (data.well) {
    const w = data.well;
    vals.push(w.construction, w.lengthAtHouse, w.projection, w.depth, w.wallThickness);
    if (w.deliverables.includes("guard")) vals.push(w.guardHeight, w.postToWall, w.wallRef);
    if (w.deliverables.includes("gate")) vals.push(w.gateWidth, w.gateSwing, w.gateHinge);
    if (w.deliverables.includes("ladder")) vals.push(w.ladderWidth, w.ladderRungs, w.ladderSpacing, w.ladderStandoff);
    if (w.deliverables.includes("grate")) vals.push(w.grateBearing, w.grateInfill, w.grateLoad);
    for (const b of w.bands) vals.push(b.label, b.setback);
  }
  if (data.spiral) {
    vals.push(
      data.spiral.floorToFloor,
      data.spiral.treads,
      data.spiral.rotationDeg,
      data.spiral.diameter,
      data.spiral.columnSize
    );
  }
  if (data.plan) for (const seg of data.plan.segs) {
    vals.push(seg.len, seg.kind, seg.steps, seg.rise, seg.run, seg.width);
    for (const st of seg.stepMeasures || []) vals.push(st.rise, st.run, st.nosing);
  }
  vals.push(data.rail.height, data.materials.post, data.materials.topRail);
  const total = vals.length;
  const filled = vals.filter((v) => v && v.trim() !== "").length;
  return { filled, total };
}
