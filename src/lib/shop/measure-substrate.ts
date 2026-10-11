// KIW Field Measure — mounting substrate and future finishes.
//
// The two reasons a crew goes back to a job a second time:
//   1. the anchor was wrong for what the post actually went into — a wedge
//      anchor in a mortar joint, a lag into deck boards, a core 1 1/2" from the
//      edge of a precast step, a drill through a post-tensioned slab;
//   2. the heights were measured before the final floor, tread or siding went
//      on, so the rail comes in 3/4" short and the first riser no longer
//      matches the others.
//
// This module gives every work type ONE substrate model (what a fastener goes
// into) and ONE future-finish model (what still goes on top of the surface a
// height was measured from). It is pure: the anchor suggestion, the checks,
// the height compensation and the location list the UI and print read.
//
// Older sheets kept substrate facts in free text on each object (post.anchor,
// termination.material, balcony.slabMaterial, opening.substrate, a structural
// bearing's substrate…). Those fields stay and stay in sync: the shared model
// is filled from them on load and writes back to them on edit, so nothing that
// reads the old fields breaks and no old sheet loses a value.

import { formatIn, parseMeas } from "./measure-parse";
import { mt } from "./measure-i18n";
import type { CheckLevel, CheckResult } from "./measure-checks";
import type {
  FinishSpec,
  FlightSegment,
  MeasureData,
  MeasureShape,
  PostMeasure,
  Termination,
} from "./measure";
import type { OpeningData } from "./measure-opening";
import type { StructBearing, StructuralData } from "./measure-structural";
import type { WallCapData, WallCapPost, WcMaterial } from "./measure-wall-cap";
import type { ShopPieceData } from "./measure-shop-piece";

// ---- Substrate model ----------------------------------------------------------

export const SUB_MATERIALS = [
  "poured_concrete",
  "precast",
  "brick",
  "stone",
  "block_hollow",
  "block_filled",
  "wood_framing",
  "wood_deck",
  "composite",
  "stucco",
  "siding",
  "steel",
  "tile_slab",
  "existing_iron",
] as const;
export type SubMaterial = (typeof SUB_MATERIALS)[number];

export const SUB_CONDITIONS = ["sound", "cracked", "spalled", "rotted", "unknown"] as const;
export type SubCondition = (typeof SUB_CONDITIONS)[number];

export const SUB_MOUNTS = ["core_drill", "surface_flange", "side_mount", "through_bolt", "embed", "weld"] as const;
export type SubMount = (typeof SUB_MOUNTS)[number];

export const SUB_HIDDEN = ["none", "radiant", "conduit", "pt_slab", "unknown"] as const;
export type SubHidden = (typeof SUB_HIDDEN)[number];

export interface Substrate {
  material: "" | SubMaterial;
  condition: "" | SubCondition;
  /** Anchor centre (or core edge) to the nearest free edge of the substrate. */
  edgeDist: string;
  /** Thickness / depth of material available to anchor into. */
  depth: string;
  mount: "" | SubMount;
  /** What may be buried where the hole goes. */
  hidden: "" | SubHidden;
  /** GPR / scan done and the hole locations are clear. */
  scanned: boolean;
  /** Cladding (stucco, siding): standoff block + flashing is detailed. */
  standoff: boolean;
  /** Wood decking: the post reaches the rim joist or solid blocking. */
  blocking: boolean;
  /** Anchor actually specified; "" = use the suggestion. */
  anchor: string;
  note: string;
}

export function blankSubstrate(): Substrate {
  return {
    material: "", condition: "", edgeDist: "", depth: "", mount: "", hidden: "",
    scanned: false, standoff: false, blocking: false, anchor: "", note: "",
  };
}

/** Fill anything a stored substrate predates. Never drops a value. */
export function normSub(s: Partial<Substrate> | null | undefined): Substrate | undefined {
  if (!s) return undefined;
  return { ...blankSubstrate(), ...s };
}

export function subFilled(s: Substrate | null | undefined): s is Substrate {
  return !!s && !!s.material;
}

/** The fields copied by "Same as previous" / "Apply to all". Edge distance is
 *  per location, so a target that already has one keeps it. */
export function copySub(from: Substrate, onto?: Substrate): Substrate {
  const out = { ...blankSubstrate(), ...from };
  if (onto?.edgeDist.trim()) out.edgeDist = onto.edgeDist;
  return out;
}

// ---- Anchor suggestion --------------------------------------------------------

export const ANCHOR_KEYS = [
  "core_grout",
  "wedge_adhesive",
  "adhesive",
  "adhesive_screen",
  "sleeve_brick",
  "lag_blocking",
  "through_bolt",
  "standoff_flash",
  "weld",
  "bolt_steel",
  "core_tile",
  "embed_grout",
  "scan_first",
] as const;
export type AnchorKey = (typeof ANCHOR_KEYS)[number];

export interface AnchorSuggestion {
  anchor: AnchorKey;
  /** Minimum anchor-centre (or core-edge) to free-edge distance, inches. */
  minEdge: number | null;
  /** Minimum material depth for this mount, inches. */
  minDepth: number | null;
}

/** The mount a material is normally fastened with, when none is picked yet. */
export const DEFAULT_MOUNT: Record<SubMaterial, SubMount> = {
  poured_concrete: "core_drill",
  precast: "core_drill",
  brick: "surface_flange",
  stone: "core_drill",
  block_hollow: "surface_flange",
  block_filled: "surface_flange",
  wood_framing: "through_bolt",
  wood_deck: "through_bolt",
  composite: "through_bolt",
  stucco: "side_mount",
  siding: "side_mount",
  steel: "weld",
  tile_slab: "core_drill",
  existing_iron: "weld",
};

const s = (anchor: AnchorKey, minEdge: number | null, minDepth: number | null = null): AnchorSuggestion => ({ anchor, minEdge, minDepth });

/**
 * What to anchor with, given what it goes into and how it mounts. Shop rules
 * of thumb, not an engineered connection:
 *  - concrete core → hydraulic cement / non-shrink epoxy grout, 3–4" to edge;
 *  - brick → sleeve or screened adhesive anchor INTO THE BRICK, never the
 *    mortar joint, 3" minimum to edge;
 *  - wood → through-bolt or structural lag into framing, with blocking;
 *  - stucco / siding → standoff block and flashing, fastened to framing behind;
 *  - post-tensioned slab → nothing is drilled until it is scanned.
 */
export function suggestAnchor(
  material: Substrate["material"],
  mountIn: Substrate["mount"] = "",
  hidden: Substrate["hidden"] = "",
  scanned = false,
): AnchorSuggestion | null {
  if (!material) return null;
  const mount = mountIn || DEFAULT_MOUNT[material];
  const base = baseSuggestion(material, mount);
  if (hidden === "pt_slab" && !scanned && mount !== "weld") return { ...base, anchor: "scan_first" };
  return base;
}

function baseSuggestion(m: SubMaterial, mount: SubMount): AnchorSuggestion {
  switch (m) {
    case "poured_concrete":
      if (mount === "core_drill") return s("core_grout", 3.5, 4);
      if (mount === "embed") return s("embed_grout", 3, 4);
      if (mount === "through_bolt") return s("through_bolt", 3);
      if (mount === "side_mount") return s("adhesive", 3, 4);
      if (mount === "weld") return s("wedge_adhesive", 4, 4);
      return s("wedge_adhesive", 4, 4);
    case "precast":
      if (mount === "core_drill" || mount === "embed") return s("core_grout", 3, 3);
      if (mount === "through_bolt") return s("through_bolt", 3);
      return s("adhesive", 3, 3);
    case "brick":
      if (mount === "core_drill" || mount === "embed") return s("core_grout", 3, 3);
      if (mount === "through_bolt") return s("through_bolt", 3);
      return s("sleeve_brick", 3, 3);
    case "stone":
      if (mount === "core_drill" || mount === "embed") return s("core_grout", 3, 3);
      if (mount === "through_bolt") return s("through_bolt", 3);
      return s("adhesive", 3, 3);
    case "block_hollow":
      if (mount === "core_drill" || mount === "embed") return s("core_grout", 4);
      if (mount === "through_bolt") return s("through_bolt", 4);
      return s("adhesive_screen", 4);
    case "block_filled":
      if (mount === "core_drill" || mount === "embed") return s("core_grout", 4);
      if (mount === "through_bolt") return s("through_bolt", 4);
      return s("wedge_adhesive", 4);
    case "wood_framing":
    case "wood_deck":
    case "composite":
      if (mount === "through_bolt" || mount === "side_mount") return s("through_bolt", 1.5);
      return s("lag_blocking", 1.5);
    case "stucco":
    case "siding":
      return s("standoff_flash", 1.5);
    case "steel":
    case "existing_iron":
      if (mount === "weld") return s("weld", null);
      return s("bolt_steel", 1);
    case "tile_slab":
      if (mount === "core_drill" || mount === "embed") return s("core_tile", 3.5, 4);
      return s("adhesive", 4, 4);
  }
}

/** The anchor that goes on the sheet: what the crew specified, else the suggestion. */
export function anchorFor(sub: Substrate | null | undefined): { key: string; suggested: boolean } | null {
  if (!sub || !sub.material) return null;
  if (sub.anchor.trim()) return { key: sub.anchor.trim(), suggested: false };
  const sg = suggestAnchor(sub.material, sub.mount, sub.hidden, sub.scanned);
  return sg ? { key: sg.anchor, suggested: true } : null;
}

// ---- Checks -------------------------------------------------------------------

const DRILLED: SubMount[] = ["core_drill", "surface_flange", "side_mount", "through_bolt", "embed"];
const CLADDING: SubMaterial[] = ["stucco", "siding"];
const DECKING: SubMaterial[] = ["wood_deck", "composite"];
const METAL: SubMaterial[] = ["steel", "existing_iron"];

function res(key: string, level: CheckLevel, detail: string, expected: number | null = null, actual: number | null = null): CheckResult {
  return { key, level, expected, actual, delta: expected !== null && actual !== null ? actual - expected : null, unit: "in", detail };
}

/** Green / yellow / red for one fastening location. Nothing until a material is picked. */
export function substrateChecks(sub: Substrate | null | undefined, detail: string): CheckResult[] {
  if (!subFilled(sub)) return [];
  const out: CheckResult[] = [];
  const mat = sub.material as SubMaterial;
  const mount = sub.mount || DEFAULT_MOUNT[mat];
  const sg = suggestAnchor(sub.material, sub.mount, sub.hidden, sub.scanned);

  // Edge distance: the one number that decides whether masonry blows out.
  const edge = parseMeas(sub.edgeDist);
  if (sg?.minEdge != null && edge !== null) {
    const lvl: CheckLevel = edge >= sg.minEdge - 1e-6 ? "green" : edge >= sg.minEdge * 0.75 ? "yellow" : "red";
    out.push(res("sub_edge", lvl, detail, sg.minEdge, edge));
  }

  // Depth available for a core or an embed.
  const depth = parseMeas(sub.depth);
  if (sg?.minDepth != null && depth !== null && (mount === "core_drill" || mount === "embed")) {
    const lvl: CheckLevel = depth >= sg.minDepth - 1e-6 ? "green" : depth >= sg.minDepth - 1 ? "yellow" : "red";
    out.push(res("sub_depth", lvl, detail, sg.minDepth, depth));
  }

  if (sub.condition) {
    const lvl: CheckLevel =
      sub.condition === "rotted" || sub.condition === "spalled" ? "red"
        : sub.condition === "cracked" || sub.condition === "unknown" ? "yellow" : "green";
    out.push({ ...res("sub_condition", lvl, detail), value: sub.condition });
  }

  if (sub.hidden && sub.hidden !== "none" && DRILLED.includes(mount)) {
    const lvl: CheckLevel = sub.scanned ? "green" : sub.hidden === "pt_slab" ? "red" : "yellow";
    out.push(res(sub.hidden === "pt_slab" ? "sub_pt_slab" : "sub_hidden", lvl, detail));
  }

  if (CLADDING.includes(mat)) out.push(res("sub_cladding", sub.standoff ? "green" : "red", detail));
  if (DECKING.includes(mat)) out.push(res("sub_decking", sub.blocking ? "green" : "red", detail));
  if (mount === "weld" && sub.mount === "weld" && !METAL.includes(mat)) out.push(res("sub_weld", "red", detail));
  return out;
}

// ---- Material from free text (migration) -------------------------------------

/** Best guess at a material from what a crew typed into an older free-text field. */
export function guessMaterial(text: string | null | undefined): "" | SubMaterial {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return "";
  if (/\bpt\b|post.?tension/.test(t)) return "poured_concrete";
  if (/precast|pr[eé].?moldad|prefabricad/.test(t)) return "precast";
  if (/tile|azulejo|cer[aâ]mic|porcelan|piso.*laje|baldosa/.test(t)) return "tile_slab";
  if (/granit|bluestone|stone|marble|limestone|pedra|piedra|m[aá]rmol|m[aá]rmore|cantera/.test(t)) return "stone";
  if (/brick|tijolo|ladrillo/.test(t)) return "brick";
  if (/filled|grouted|preenchid|rellen/.test(t) && /block|cmu|bloco|bloque/.test(t)) return "block_filled";
  if (/block|cmu|bloco|bloque/.test(t)) return "block_hollow";
  if (/stucco|eifs|reboco|estuco/.test(t)) return "stucco";
  if (/siding|vinyl|vinil|clapboard|revestimento|revestimiento/.test(t)) return "siding";
  if (/composite|trex|azek|pvc|comp[oó]sit/.test(t)) return "composite";
  if (/deck ?board|decking|t[aá]bua|tabla/.test(t)) return "wood_deck";
  if (/wood|timber|framing|joist|\brim\b|lvl|syp|madeira|madera/.test(t)) return "wood_framing";
  if (/existing (iron|rail)|wrought|ferro existente|hierro existente/.test(t)) return "existing_iron";
  if (/steel|iron|a[cç]o|acero|metal|ferro|hierro/.test(t)) return "steel";
  if (/concrete|slab|cement|concreto|hormig|laje|losa|cimento|corrugated/.test(t)) return "poured_concrete";
  return "";
}

function guessCondition(text: string | null | undefined): "" | SubCondition {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return "";
  if (/rot|podre|podrid/.test(t)) return "rotted";
  if (/spall|lasca|desplaz|crumbl|esfarel/.test(t)) return "spalled";
  if (/crack|trinc|fissur|grieta|rachad/.test(t)) return "cracked";
  if (/good|sound|solid|bom|boa|sólid|bueno|firme/.test(t)) return "sound";
  return "";
}

/** English label written back into the older free-text fields (the shop's
 *  existing option lists are English values translated at display time). */
export const LEGACY_MATERIAL: Record<SubMaterial, string> = {
  poured_concrete: "Concrete",
  precast: "Precast concrete",
  brick: "Brick",
  stone: "Granite",
  block_hollow: "Concrete block",
  block_filled: "Concrete block (filled)",
  wood_framing: "Wood",
  wood_deck: "Wood decking",
  composite: "Composite decking",
  stucco: "Stucco",
  siding: "Siding",
  steel: "Steel",
  tile_slab: "Tile over slab",
  existing_iron: "Existing iron",
};

/** Keep a legacy free-text material unless it already says the same thing. */
function legacyMaterialText(current: string, m: Substrate["material"]): string {
  if (!m) return current;
  return guessMaterial(current) === m ? current : LEGACY_MATERIAL[m];
}

const POST_MOUNT_TO_SUB: Record<string, SubMount> = { "Core-drill": "core_drill", "Base plate": "surface_flange", "Side mount": "side_mount" };
const SUB_TO_POST_MOUNT: Partial<Record<SubMount, string>> = { core_drill: "Core-drill", surface_flange: "Base plate", side_mount: "Side mount" };

const TERM_METHOD_TO_SUB: Record<string, SubMount> = {
  core_drill: "core_drill", base_plate: "surface_flange", embedded: "embed", weld: "weld",
  bolt_through: "through_bolt", anchor: "side_mount", wall_plate: "side_mount", clip: "side_mount", plate: "side_mount",
};

// ---- Legacy → shared (on load) -----------------------------------------------

export function subFromPost(p: Partial<PostMeasure>): Substrate | undefined {
  const material = guessMaterial(p.anchor) || guessMaterial(p.substrate);
  const mount = POST_MOUNT_TO_SUB[p.mount || ""] || "";
  const edge = (p.edgeDist || "").trim();
  if (!material && !mount && !edge) return undefined;
  const depth = parseMeas(p.substrate) !== null ? (p.substrate || "") : "";
  return { ...blankSubstrate(), material, mount, edgeDist: edge, depth, condition: guessCondition(p.substrate) };
}

export function subFromTermination(t: Partial<Termination>): Substrate | undefined {
  const material = guessMaterial(t.material) || guessMaterial(t.backing);
  const mount = TERM_METHOD_TO_SUB[t.method || ""] || "";
  const edge = (t.hardware?.edgeDist || "").trim();
  if (!material && !edge) return undefined;
  return { ...blankSubstrate(), material, mount, edgeDist: edge };
}

const OPENING_TO_SUB: Record<string, SubMaterial> = {
  brick: "brick", stone: "stone", concrete: "poured_concrete", block: "block_hollow",
  wood: "wood_framing", stucco: "stucco", siding: "siding", steel: "steel",
};
const SUB_TO_OPENING: Record<SubMaterial, OpeningData["substrate"]> = {
  poured_concrete: "concrete", precast: "concrete", tile_slab: "concrete", brick: "brick", stone: "stone",
  block_hollow: "block", block_filled: "block", wood_framing: "wood", wood_deck: "wood", composite: "wood",
  stucco: "stucco", siding: "siding", steel: "steel", existing_iron: "steel",
};
const OPENING_MOUNT_TO_SUB: Record<string, SubMount> = { reveal: "side_mount", face_out: "surface_flange", face_in: "surface_flange" };

export function subFromOpening(o: Partial<OpeningData>): Substrate | undefined {
  const material = OPENING_TO_SUB[o.substrate || ""] || "";
  if (!material) return undefined;
  return { ...blankSubstrate(), material, condition: guessCondition(o.substrateCondition), mount: OPENING_MOUNT_TO_SUB[o.mount || ""] || "" };
}

const STRUCT_TO_SUB: Record<string, SubMaterial> = {
  brick: "brick", block: "block_hollow", concrete: "poured_concrete", stone: "stone", wood: "wood_framing", steel: "steel",
};
const SUB_TO_STRUCT: Partial<Record<SubMaterial, StructBearing["substrate"]>> = {
  poured_concrete: "concrete", precast: "concrete", tile_slab: "concrete", brick: "brick", stone: "stone",
  block_hollow: "block", block_filled: "block", wood_framing: "wood", wood_deck: "wood", composite: "wood",
  steel: "steel", existing_iron: "steel",
};
const STRUCT_COND_TO_SUB: Record<string, SubCondition> = { good: "sound", fair: "cracked", poor: "spalled" };
const SUB_COND_TO_STRUCT: Record<SubCondition, StructBearing["condition"]> = {
  sound: "good", cracked: "fair", unknown: "fair", spalled: "poor", rotted: "poor",
};

export function subFromBearing(b: Partial<StructBearing>, base = false): Substrate | undefined {
  const material = STRUCT_TO_SUB[b.substrate || ""] || "";
  if (!material) return undefined;
  return {
    ...blankSubstrate(), material, condition: STRUCT_COND_TO_SUB[b.condition || ""] || "",
    depth: b.wall || "", mount: base ? "surface_flange" : "",
  };
}

const WELL_TO_SUB: Record<string, SubMaterial> = {
  poured_concrete: "poured_concrete", block: "block_hollow", stone: "stone", timber: "wood_framing", corrugated: "steel",
};
const DECK_MOUNT_TO_SUB: Record<string, SubMount> = {
  surface: "surface_flange", fascia: "side_mount", through_bolt: "through_bolt", core_drill: "core_drill", embedded: "embed",
};
const SUB_TO_DECK_MOUNT: Partial<Record<SubMount, string>> = {
  surface_flange: "surface", side_mount: "fascia", through_bolt: "through_bolt", core_drill: "core_drill", embed: "embedded",
};
const BAL_MOUNT_TO_SUB: Record<string, SubMount> = { top: "surface_flange", fascia: "side_mount", core_drill: "core_drill", embedded: "embed" };
const SUB_TO_BAL_MOUNT: Partial<Record<SubMount, string>> = { surface_flange: "top", side_mount: "fascia", core_drill: "core_drill", embed: "embedded" };

// ---- Wall caps and shop pieces --------------------------------------------------

const WC_TO_SUB: Record<WcMaterial, SubMaterial> = { concrete: "poured_concrete", precast: "precast", stone: "stone", brick: "brick", block: "block_filled", wood: "wood_framing" };
const SUB_TO_WC: Partial<Record<SubMaterial, WcMaterial>> = { poured_concrete: "concrete", precast: "precast", stone: "stone", brick: "brick", block_hollow: "block", block_filled: "block", wood_framing: "wood", wood_deck: "wood" };
const WC_MOUNT_TO_SUB: Record<string, SubMount | undefined> = { core: "core_drill", plate: "surface_flange", side_high: "side_mount", side_low: "side_mount" };
const SUB_TO_WC_MOUNT: Partial<Record<SubMount, WallCapData["mount"]>> = { core_drill: "core", surface_flange: "plate" };
const SP_TO_SUB: Record<string, SubMaterial | undefined> = { studs: "wood_framing", masonry: "brick", concrete: "poured_concrete", wood: "wood_framing", steel: "steel", stone: "stone" };
const SUB_TO_SP: Partial<Record<SubMaterial, ShopPieceData["substrate"]>> = {
  wood_framing: "studs", brick: "masonry", block_hollow: "masonry", block_filled: "masonry", stucco: "masonry", poured_concrete: "concrete", precast: "concrete",
  wood_deck: "wood", composite: "wood", siding: "studs", steel: "steel", existing_iron: "steel", stone: "stone", tile_slab: "concrete",
};

function wallCapPost(w: WallCapData | null | undefined, id: string): WallCapPost | undefined {
  for (const r of w?.runs || []) for (const p of r.posts) if (p.id === id) return p;
  return undefined;
}

/** What a wall-cap post sits in, read from the wall's own answers until edited. */
function subFromWallCap(w: WallCapData, p: WallCapPost): Substrate | undefined {
  const mat = p.material || w.material;
  if (!mat) return undefined;
  return {
    ...blankSubstrate(),
    material: WC_TO_SUB[mat],
    condition: w.cracked === "yes" ? "cracked" : w.cracked === "no" && w.loose === "no" ? "sound" : "",
  };
}

// ---- Locations: every place something is fastened ----------------------------

export type SubGroup =
  | "post" | "term" | "bracket" | "gate" | "fence" | "balcony" | "deck" | "fire" | "well" | "site" | "opening" | "struct" | "wallcap" | "shoppiece";

export interface MountLocation {
  key: string;
  group: SubGroup;
  /** Short code: P3, #2 ↑, Hinge, C1 base. */
  label: string;
  sub: Substrate | undefined;
}

type T = (k: string) => string;
const ID: T = (k) => k;

/**
 * Every fastening location on the sheet, in the order the shop reads them.
 * `posts` is the sheet's numbered post order (orderedPosts) when the caller
 * has it, so P-numbers match the sketch.
 */
export function mountLocations(data: MeasureData, shape: MeasureShape, t: T = ID, posts?: PostMeasure[]): MountLocation[] {
  const out: MountLocation[] = [];
  const add = (key: string, group: SubGroup, label: string) => out.push({ key, group, label, sub: getSub(data, key) });

  (posts || data.posts).forEach((p, i) => add(`post:${p.id}`, "post", `P${i + 1}`));
  data.spans.forEach((sp, i) => {
    (["start", "end"] as const).forEach((end) => {
      const term = sp[end];
      if (term.attachTo === "wall" || term.attachTo === "existing_post" || term.attachTo === "floor") {
        add(`term:${sp.id}:${end}`, "term", `#${i + 1} ${t(end === "start" ? "sub_loc_start" : "sub_loc_end")} · ${t(`attach_${term.attachTo}`)}`);
      }
    });
  });
  if (shape === "wall_rail" || (data.rail.brackets || "").trim() || data.rail.bracketSub) add("bracket", "bracket", t("sub_loc_brackets"));
  if (shape === "gate" && data.gate) {
    add("gate:hinge", "gate", t("sub_loc_hinge"));
    add("gate:latch", "gate", t("sub_loc_latch"));
  }
  if (shape === "fence" && data.fence) add("fence:posts", "fence", t("sub_loc_fence_posts"));
  if (shape === "balcony" && data.balcony) add("balcony", "balcony", t("sub_loc_anchorage"));
  if (shape === "deck" && data.deck) add("deck:posts", "deck", t("sub_loc_deck_posts"));
  if (shape === "fire_escape" && data.fire) {
    data.fire.levels.forEach((l, i) => add(`fire:${l.id}`, "fire", `${t("sub_loc_level")} ${l.label || i + 1}`));
  }
  if (shape === "window_well" && data.well) add("well", "well", t("sub_loc_well"));
  (data.site?.objects || []).forEach((o) => {
    if (o.kind === "wall" || o.kind === "column" || o.kind === "post" || o.kind === "slab") add(`site:${o.id}`, "site", o.label);
  });
  if (shape === "opening" && data.opening) add("opening", "opening", t("sub_loc_jamb"));
  // Wall-cap railings: the cap under every post. Shop pieces: what a wall- or counter-mounted piece fastens to.
  if (shape === "wall_cap" && data.wallCap) {
    let n = 0;
    data.wallCap.runs.forEach((r) => r.posts.forEach((p) => add(`wallcap:${p.id}`, "wallcap", `P${++n}`)));
  }
  if (shape === "shop_piece" && data.shopPiece && (data.shopPiece.mount === "wall" || data.shopPiece.mount === "counter")) add("shoppiece", "shoppiece", t("sp_sub_loc"));
  if (shape === "structural" && data.structural) {
    data.structural.members.forEach((m) => {
      if (m.role === "beam" || m.role === "lintel") {
        add(`struct:${m.id}:L`, "struct", `${m.mark} ${t("sub_loc_endL")}`);
        add(`struct:${m.id}:R`, "struct", `${m.mark} ${t("sub_loc_endR")}`);
      } else if (m.role === "column" || m.role === "post") {
        add(`struct:${m.id}:base`, "struct", `${m.mark} ${t("sub_loc_base")}`);
      }
    });
  }
  return out;
}

function bearingAt(s: StructuralData | null | undefined, id: string, end: string): StructBearing | undefined {
  const m = s?.members.find((x) => x.id === id);
  if (!m) return undefined;
  return end === "L" ? m.bearingL : end === "R" ? m.bearingR : end === "base" ? m.base : undefined;
}

/**
 * The substrate stored at a location. Where an older UI still edits the old
 * field directly (structural, opening), the old enum wins if it disagrees, so
 * the two can never quietly drift apart.
 */
export function getSub(data: MeasureData, key: string): Substrate | undefined {
  const [kind, a, b] = key.split(":");
  switch (kind) {
    case "post": {
      // The post's own mount / edge fields are still edited directly (they
      // drive the post's requirements), so they win over the shared copy.
      const p = data.posts.find((x) => x.id === a);
      const sub = normSub(p?.sub);
      if (!p || !sub) return sub;
      const m = POST_MOUNT_TO_SUB[p.mount || ""];
      return { ...sub, ...(m ? { mount: m } : {}), ...(p.edgeDist.trim() ? { edgeDist: p.edgeDist } : {}) };
    }
    case "term": {
      const sp = data.spans.find((x) => x.id === a);
      if (!sp || (b !== "start" && b !== "end")) return undefined;
      const term = sp[b];
      const sub = normSub(term.sub);
      if (!sub) return sub;
      const m = TERM_METHOD_TO_SUB[term.method || ""];
      return { ...sub, ...(m ? { mount: m } : {}), ...(term.hardware.edgeDist.trim() ? { edgeDist: term.hardware.edgeDist } : {}) };
    }
    case "bracket": return normSub(data.rail.bracketSub);
    case "gate": return normSub(a === "hinge" ? data.gate?.hingeSub : data.gate?.latchSub);
    case "fence": return normSub(data.fence?.postSub);
    case "balcony": return normSub(data.balcony?.sub);
    case "deck": return normSub(data.deck?.postSub);
    case "fire": return normSub(data.fire?.levels.find((l) => l.id === a)?.sub);
    case "well": return normSub(data.well?.sub);
    case "site": {
      const o = data.site?.objects.find((x) => x.id === a);
      const sub = normSub(o?.substrate as Partial<Substrate> | undefined);
      // The free-text material is still editable; when it names something else, it wins.
      const typed = guessMaterial(o?.material);
      return sub && typed && typed !== sub.material && guessMaterial(LEGACY_MATERIAL[sub.material as SubMaterial] || "") !== typed ? { ...sub, material: typed } : sub;
    }
    case "opening": {
      const o = data.opening;
      if (!o) return undefined;
      const sub = normSub(o.sub) ?? subFromOpening(o);
      if (sub && o.substrate && SUB_TO_OPENING[sub.material as SubMaterial] !== o.substrate) {
        return { ...sub, material: OPENING_TO_SUB[o.substrate] || sub.material };
      }
      return sub;
    }
    case "wallcap": {
      const w = data.wallCap, p = wallCapPost(w, a);
      if (!w || !p) return undefined;
      const sub = normSub(p.sub) ?? subFromWallCap(w, p);
      if (!sub) return sub;
      // The sheet's own fields win: the mount is set for the whole wall, and the
      // nearest of the two edge distances measured at this post is its edge distance.
      const m = WC_MOUNT_TO_SUB[w.mount];
      const edges = [parseMeas(p.edgeHigh), parseMeas(p.edgeLow)].filter((n): n is number => n !== null);
      return { ...sub, ...(m ? { mount: m } : {}), ...(w.mount === "core" && edges.length ? { edgeDist: formatIn(Math.min(...edges)) } : {}) };
    }
    case "shoppiece": {
      const s = data.shopPiece;
      if (!s) return undefined;
      const legacy = SP_TO_SUB[s.substrate];
      const sub = normSub(s.sub) ?? (legacy ? { ...blankSubstrate(), material: legacy } : undefined);
      if (sub && legacy && SUB_TO_SP[sub.material as SubMaterial] !== s.substrate) return { ...sub, material: legacy };
      return sub;
    }
    case "struct": {
      const br = bearingAt(data.structural, a, b);
      if (!br) return undefined;
      const sub = normSub(br.sub) ?? subFromBearing(br, b === "base");
      if (sub && br.substrate && SUB_TO_STRUCT[sub.material as SubMaterial] !== br.substrate) {
        return { ...sub, material: STRUCT_TO_SUB[br.substrate] || sub.material };
      }
      return sub;
    }
  }
  return undefined;
}

/** Store a substrate at a location (mutates the draft) and keep the older
 *  free-text / enum fields on that object in step with it. */
export function setSub(data: MeasureData, key: string, sub: Substrate): void {
  const v = { ...blankSubstrate(), ...sub };
  const [kind, a, b] = key.split(":");
  switch (kind) {
    case "post": {
      const p = data.posts.find((x) => x.id === a);
      if (!p) return;
      p.sub = v;
      if (v.material) p.anchor = legacyMaterialText(p.anchor, v.material);
      const pm = v.mount ? SUB_TO_POST_MOUNT[v.mount] : undefined;
      if (pm && p.pointType === "railing_post") p.mount = pm;
      p.edgeDist = v.edgeDist;
      return;
    }
    case "term": {
      const sp = data.spans.find((x) => x.id === a);
      if (!sp || (b !== "start" && b !== "end")) return;
      const term = sp[b];
      term.sub = v;
      if (v.material) term.material = legacyMaterialText(term.material, v.material);
      term.hardware.edgeDist = v.edgeDist;
      return;
    }
    case "bracket":
      data.rail.bracketSub = v;
      return;
    case "gate":
      if (!data.gate) return;
      if (a === "hinge") data.gate.hingeSub = v; else data.gate.latchSub = v;
      if (a === "hinge" && v.material) data.gate.postMaterial = legacyMaterialText(data.gate.postMaterial, v.material);
      return;
    case "fence":
      if (data.fence) data.fence.postSub = v;
      return;
    case "balcony": {
      const bal = data.balcony;
      if (!bal) return;
      bal.sub = v;
      if (v.material) bal.slabMaterial = legacyMaterialText(bal.slabMaterial, v.material);
      bal.edgeDistance = v.edgeDist;
      if (v.depth.trim()) bal.slabThickness = v.depth;
      const m = v.mount ? SUB_TO_BAL_MOUNT[v.mount] : undefined;
      if (m) bal.mount = m as typeof bal.mount;
      return;
    }
    case "deck": {
      const dk = data.deck;
      if (!dk) return;
      dk.postSub = v;
      const m = v.mount ? SUB_TO_DECK_MOUNT[v.mount] : undefined;
      if (m) dk.mount = m as typeof dk.mount;
      if (v.material === "wood_framing" && !dk.rimMaterial.trim()) dk.rimMaterial = "Wood";
      return;
    }
    case "fire": {
      const l = data.fire?.levels.find((x) => x.id === a);
      if (!l || !data.fire) return;
      l.sub = v;
      if (v.material && !data.fire.wallMaterial.trim()) data.fire.wallMaterial = LEGACY_MATERIAL[v.material];
      return;
    }
    case "well": {
      const w = data.well;
      if (!w) return;
      w.sub = v;
      return;
    }
    case "site": {
      const o = data.site?.objects.find((x) => x.id === a);
      if (!o) return;
      o.substrate = v;
      if (v.material) o.material = legacyMaterialText(o.material || "", v.material);
      return;
    }
    case "opening": {
      const o = data.opening;
      if (!o) return;
      o.sub = v;
      if (v.material) o.substrate = SUB_TO_OPENING[v.material];
      if (v.condition) o.substrateCondition = v.condition === "sound" ? "" : v.condition;
      return;
    }
    case "wallcap": {
      const w = data.wallCap, p = wallCapPost(w, a);
      if (!w || !p) return;
      p.sub = v;
      const mat = v.material ? SUB_TO_WC[v.material] : undefined;
      // A cap that differs from the wall's is noted on this post; the first answer sets the wall's.
      if (mat) { if (!w.material) w.material = mat; p.material = mat === w.material ? "" : mat; }
      if (v.condition === "cracked" || v.condition === "spalled") w.cracked = "yes";
      if (v.mount && !w.mount) { const wm = SUB_TO_WC_MOUNT[v.mount]; if (wm) w.mount = wm; }
      return;
    }
    case "shoppiece": {
      const s = data.shopPiece;
      if (!s) return;
      s.sub = v;
      const sp = v.material ? SUB_TO_SP[v.material] : undefined;
      if (sp) s.substrate = sp;
      return;
    }
    case "struct": {
      const br = bearingAt(data.structural, a, b);
      if (!br) return;
      br.sub = v;
      const st = v.material ? SUB_TO_STRUCT[v.material] : undefined;
      if (st) br.substrate = st;
      if (v.condition) br.condition = SUB_COND_TO_STRUCT[v.condition];
      if (b !== "base" && v.depth.trim()) br.wall = v.depth;
      return;
    }
  }
}

export function subGroupOf(key: string): SubGroup {
  return key.split(":")[0] as SubGroup;
}

/** Locations sharing a group with `key`, in order — for "Same as previous" and "Apply to all". */
export function siblingKeys(data: MeasureData, shape: MeasureShape, key: string): string[] {
  const g = subGroupOf(key);
  // Gate hinge and latch posts, and every post on the sheet, are one family.
  return mountLocations(data, shape).filter((l) => l.group === g).map((l) => l.key);
}

/** The nearest earlier sibling that has a material. */
export function previousSub(data: MeasureData, shape: MeasureShape, key: string): Substrate | undefined {
  const keys = siblingKeys(data, shape, key);
  const i = keys.indexOf(key);
  for (let j = i - 1; j >= 0; j--) {
    const s2 = getSub(data, keys[j]);
    if (subFilled(s2)) return s2;
  }
  return undefined;
}

/** Copy one location's substrate onto every sibling. Returns how many changed. */
export function applySubToAll(data: MeasureData, shape: MeasureShape, key: string): number {
  const from = getSub(data, key);
  if (!subFilled(from)) return 0;
  let n = 0;
  for (const k of siblingKeys(data, shape, key)) {
    if (k === key) continue;
    setSub(data, k, copySub(from, getSub(data, k)));
    n++;
  }
  return n;
}

/** Gap key for a blank substrate at a location: sub_post, sub_gate … */
export const subGapKey = (key: string) => `sub_${subGroupOf(key)}`;

/**
 * Fastening locations nobody has said anything about yet — "Open" items for
 * the Next card (not numbers, never blocking). Site objects are optional
 * context and stay out of the queue. `detail` is the location key.
 */
export function blankMountGaps(data: MeasureData, shape: MeasureShape): { key: string; detail: string; tier: "doc" }[] {
  return mountLocations(data, shape)
    .filter((l) => l.group !== "site" && !subFilled(l.sub))
    .map((l) => ({ key: subGapKey(l.key), detail: l.key, tier: "doc" as const }));
}

export function mountingChecks(data: MeasureData, shape: MeasureShape, posts?: PostMeasure[]): CheckResult[] {
  const by = (lang: "en" | "pt" | "es") => new Map(mountLocations(data, shape, (k) => mt(lang, k), posts).map((l) => [l.key, l.label]));
  const [en, pt, es] = [by("en"), by("pt"), by("es")];
  return mountLocations(data, shape, ID, posts).flatMap((l) =>
    substrateChecks(l.sub, en.get(l.key) || l.label).map((c) => ({ ...c, detailI18n: { en: en.get(l.key), pt: pt.get(l.key), es: es.get(l.key) } })));
}

// ---- Migration on load ---------------------------------------------------------

/** Fill the shared substrate from older fields wherever none is stored yet.
 *  Mutates a freshly-normalized MeasureData; never overwrites a stored value. */
export function migrateSubstrates(d: MeasureData): void {
  d.posts.forEach((p) => { p.sub = normSub(p.sub) ?? subFromPost(p); if (!p.sub) delete p.sub; });
  d.spans.forEach((sp) => (["start", "end"] as const).forEach((e) => {
    sp[e].sub = normSub(sp[e].sub) ?? subFromTermination(sp[e]);
    if (!sp[e].sub) delete sp[e].sub;
  }));
  if (d.rail.bracketSub) d.rail.bracketSub = normSub(d.rail.bracketSub);
  if (d.gate) {
    const legacy = guessMaterial(d.gate.postMaterial);
    const fromGate = legacy ? { ...blankSubstrate(), material: legacy } : undefined;
    d.gate.hingeSub = normSub(d.gate.hingeSub) ?? fromGate;
    d.gate.latchSub = normSub(d.gate.latchSub) ?? fromGate;
    if (!d.gate.hingeSub) delete d.gate.hingeSub;
    if (!d.gate.latchSub) delete d.gate.latchSub;
  }
  if (d.fence?.postSub) d.fence.postSub = normSub(d.fence.postSub);
  if (d.balcony) {
    const b = d.balcony;
    const material = guessMaterial(b.slabMaterial);
    b.sub = normSub(b.sub) ?? (material || b.edgeDistance.trim()
      ? { ...blankSubstrate(), material, edgeDist: b.edgeDistance, depth: b.slabThickness, mount: BAL_MOUNT_TO_SUB[b.mount] || "", condition: guessCondition(b.edgeCondition) }
      : undefined);
    if (!b.sub) delete b.sub;
  }
  if (d.deck) {
    const dk = d.deck;
    const mount = DECK_MOUNT_TO_SUB[dk.mount] || "";
    const surf: Record<string, SubMaterial> = { wood: "wood_deck", composite: "composite", pvc: "composite", concrete: "poured_concrete", paver: "stone", roof_deck: "wood_deck" };
    let material: "" | SubMaterial = surf[dk.surface] || "";
    if ((mount === "side_mount" || mount === "through_bolt") && (material === "wood_deck" || material === "composite")) material = "wood_framing";
    dk.postSub = normSub(dk.postSub) ?? (material || mount ? { ...blankSubstrate(), material, mount, condition: guessCondition(dk.framingCondition) } : undefined);
    if (!dk.postSub) delete dk.postSub;
  }
  if (d.fire) {
    const material = guessMaterial(d.fire.wallMaterial);
    d.fire.levels.forEach((l) => {
      l.sub = normSub(l.sub) ?? (material ? { ...blankSubstrate(), material, mount: "through_bolt" } : undefined);
      if (!l.sub) delete l.sub;
    });
  }
  if (d.well) {
    const material = WELL_TO_SUB[d.well.construction] || "";
    d.well.sub = normSub(d.well.sub) ?? (material ? { ...blankSubstrate(), material, depth: d.well.wallThickness } : undefined);
    if (!d.well.sub) delete d.well.sub;
  }
  if (d.site?.objects?.length) {
    d.site = {
      ...d.site,
      objects: d.site.objects.map((o) => {
        const have = normSub(o.substrate as Partial<Substrate> | undefined);
        if (have) return { ...o, substrate: have };
        const material = guessMaterial(o.material);
        return material ? { ...o, substrate: { ...blankSubstrate(), material } } : o;
      }),
    };
  }
  if (d.opening) {
    d.opening.sub = normSub(d.opening.sub) ?? subFromOpening(d.opening);
    if (!d.opening.sub) delete d.opening.sub;
  }
  if (d.structural) {
    d.structural.members.forEach((m) => {
      (["bearingL", "bearingR", "base"] as const).forEach((k) => {
        const br = m[k];
        br.sub = normSub(br.sub) ?? subFromBearing(br, k === "base");
        if (!br.sub) delete br.sub;
      });
    });
  }
}

// =============================================================================
// ---- Future finishes ----------------------------------------------------------
// =============================================================================

export const FINISH_TYPES = ["hardwood", "tile", "carpet", "stone", "composite", "siding", "stucco"] as const;
export type FinishType = (typeof FINISH_TYPES)[number];

/** Typical build-up, finish plus bed / pad / underlayment, inches. */
export const FINISH_DEFAULT_IN: Record<FinishType, number> = {
  hardwood: 0.75,
  tile: 0.5,
  carpet: 0.5,
  stone: 1.25,
  composite: 1,
  siding: 0.75,
  stucco: 0.875,
};

export interface FutureFinish {
  installed: "" | "yes" | "no";
  type: "" | FinishType;
  /** Thickness still to be added on top of today's surface. */
  thickness: string;
}

export const SURFACE_KEYS = ["bottom", "treads", "landing", "top", "floor", "deck", "ground", "wall", "slab"] as const;
export type SurfaceKey = (typeof SURFACE_KEYS)[number];
export type Surfaces = Partial<Record<SurfaceKey, FutureFinish>>;

export function blankFinishFor(): FutureFinish {
  return { installed: "", type: "", thickness: "" };
}

/** Which finish types make sense on a surface. */
export function finishTypesFor(k: SurfaceKey): FinishType[] {
  if (k === "wall") return ["siding", "stucco", "tile", "stone"];
  if (k === "ground") return ["stone", "composite", "tile"];
  if (k === "deck") return ["composite", "hardwood", "tile", "stone"];
  if (k === "slab") return ["tile", "hardwood", "carpet", "stone"];
  return ["hardwood", "tile", "carpet", "stone", "composite"];
}

/** Inches still to go on top of the surface; 0 when finished or unknown. */
export function finishAdd(f: FutureFinish | null | undefined): number {
  if (!f || f.installed !== "no") return 0;
  const t = parseMeas(f.thickness);
  if (t !== null) return Math.max(0, t);
  return f.type ? FINISH_DEFAULT_IN[f.type] : 0;
}

function hasFlights(data: MeasureData): boolean {
  return data.segments.some((s) => s.kind === "flight") || !!data.spiral ||
    (data.plan?.paths || []).some((p) => p.segs.some((sg) => sg.kind === "flight"));
}

/** The surfaces a height on this sheet can be measured from. */
export function surfacesFor(data: MeasureData, shape: MeasureShape): SurfaceKey[] {
  switch (shape) {
    case "deck": return ["deck"];
    case "balcony": return ["floor"];
    case "gate":
    case "fence": return ["ground"];
    case "structural": return ["slab"];
    // Pavers or a deck still to come on the walk side raise the floor the guard is measured from.
    case "wall_cap": return ["ground"];
    case "shop_piece": return [];
    case "fire_escape":
    case "window_well": return [];
    case "opening": {
      const p = data.opening?.product || "";
      return p === "juliet" || p === "security_door" || p === "storm_door" || p === "gate" ? ["floor"] : [];
    }
  }
  const wall = shape === "wall_rail" || (data.datums.orientation || "").includes("wall") || !!data.finish.wallFinish.trim();
  if (hasFlights(data)) {
    const landing = data.segments.some((s) => s.kind === "platform");
    return ["bottom", "treads", ...(landing ? (["landing"] as const) : []), "top", ...(wall ? (["wall"] as const) : [])];
  }
  return ["floor", ...(wall ? (["wall"] as const) : [])];
}

/** The surfaces stored on the sheet, filled in from the older finish fields on load. */
export function migrateSurfaces(d: MeasureData): void {
  const out: Surfaces = { ...(d.surfaces || {}) };
  for (const k of Object.keys(out) as SurfaceKey[]) out[k] = { ...blankFinishFor(), ...out[k] };
  const fc = d.finish.floorChange;
  const guessType = (): "" | FinishType => {
    const t = (d.finish.futureTopping || "").toLowerCase();
    if (/wood|hardwood|madeira|madera/.test(t)) return "hardwood";
    if (/tile|porcelain|cer[aâ]m|azulejo|baldosa/.test(t)) return "tile";
    if (/carpet|carpete|alfombra/.test(t)) return "carpet";
    if (/stone|marble|granit|pav|pedra|piedra/.test(t)) return "stone";
    if (/composite|comp[oó]sit/.test(t)) return "composite";
    return "";
  };
  const fromAdj = (adj: string): FutureFinish | undefined => {
    const n = parseMeas((adj || "").replace(/^\+/, "").trim());
    if (n === null || n <= 0 || /^\s*-/.test(adj)) return undefined;
    return { installed: "no", type: guessType(), thickness: adj.replace(/^\+/, "").trim() };
  };
  if (!out.bottom && (fc === "bottom" || fc === "both")) { const f = fromAdj(d.finish.bottomAdjustment); if (f) out.bottom = f; }
  if (!out.top && (fc === "top" || fc === "both")) { const f = fromAdj(d.finish.topAdjustment); if (f) out.top = f; }
  if (!out.slab && d.structural) {
    const ff = d.structural.members.map((m) => m.finishFloor).find((v) => parseMeas(v) !== null && (parseMeas(v) || 0) > 0);
    if (ff) out.slab = { installed: "no", type: "", thickness: ff };
  }
  if (Object.keys(out).length) d.surfaces = out; else delete d.surfaces;
}

/** Store one surface (mutates) and keep the older floor-change fields in step. */
export function setSurface(d: MeasureData, k: SurfaceKey, f: FutureFinish): void {
  d.surfaces = { ...(d.surfaces || {}), [k]: { ...blankFinishFor(), ...f } };
  if (k === "bottom" || k === "top") syncFloorChange(d.finish, d.surfaces);
}

function syncFloorChange(fin: FinishSpec, sf: Surfaces): void {
  const b = finishAdd(sf.bottom) > 0;
  const t = finishAdd(sf.top) > 0;
  // A negative (lowered) floor typed in the old fields is not a future finish; leave it.
  const neg = (v: string) => /^\s*-/.test(v || "");
  if (!neg(fin.bottomAdjustment)) fin.bottomAdjustment = b ? `+${formatIn(finishAdd(sf.bottom))}` : sf.bottom?.installed ? "" : fin.bottomAdjustment;
  if (!neg(fin.topAdjustment)) fin.topAdjustment = t ? `+${formatIn(finishAdd(sf.top))}` : sf.top?.installed ? "" : fin.topAdjustment;
  const answered = !!(sf.bottom?.installed || sf.top?.installed);
  if (answered && !neg(fin.bottomAdjustment) && !neg(fin.topAdjustment)) {
    fin.floorChange = b && t ? "both" : b ? "bottom" : t ? "top" : "none";
  }
  if (b || t) fin.verifyAfterFinishes = fin.verifyAfterFinishes || false;
}

// ---- Compensation --------------------------------------------------------------

const sub1 = (v: string, add: number): string => {
  if (!add) return v;
  const n = parseMeas(v);
  return n === null ? v : formatIn(Math.max(0, n - add));
};

/** The surface a flight's first riser leaves from and its last riser lands on. */
function flightEnds(data: MeasureData, si: number): { below: SurfaceKey; above: SurfaceKey } {
  const prev = data.segments[si - 1];
  const next = data.segments[si + 1];
  return {
    below: prev && prev.kind === "platform" ? "landing" : "bottom",
    above: next && next.kind === "platform" ? "landing" : "top",
  };
}

/** Risers as measured, and as they will be once every finish is down. */
export function finishedRisers(data: MeasureData): { flight: number; measured: (number | null)[]; finished: (number | null)[] }[] {
  const sf = data.surfaces || {};
  const tread = finishAdd(sf.treads);
  const out: { flight: number; measured: (number | null)[]; finished: (number | null)[] }[] = [];
  let fi = 0;
  data.segments.forEach((sg, si) => {
    if (sg.kind !== "flight") return;
    const fl = sg as FlightSegment;
    const { below, above } = flightEnds(data, si);
    const measured = fl.steps.map((st) => parseMeas(st.rise));
    const n = measured.length;
    const finished = measured.map((r, i) => {
      if (r === null) return null;
      let v = r;
      if (i === 0) v += tread - finishAdd(sf[below]);
      if (i === n - 1) v += finishAdd(sf[above]) - tread;
      return v;
    });
    out.push({ flight: fi++, measured, finished });
  });
  return out;
}

/**
 * The sheet as it will stand once every pending finish is installed: rail and
 * guard heights, bottom clearances, sill heights and first / last risers are
 * all re-expressed from the FINISHED surface. Code checks run on this, so a
 * 36" rail measured on a subfloor with 3/4" hardwood to come reads 35 1/4".
 * Returns the same object when nothing is pending.
 */
export function finishedView(data: MeasureData, shape: MeasureShape): MeasureData {
  const sf = data.surfaces;
  if (!sf || !Object.values(sf).some((f) => finishAdd(f) > 0)) return data;
  const d: MeasureData = structuredClone(data);
  const A = (k: SurfaceKey) => finishAdd(sf[k]);
  const flights = hasFlights(d);

  // Risers: only the first and last of a flight change.
  const fr = finishedRisers(d);
  let fi = 0;
  d.segments.forEach((sg) => {
    if (sg.kind !== "flight") return;
    const row = fr[fi++];
    sg.steps = sg.steps.map((st, i) => (row.finished[i] !== null && row.finished[i] !== row.measured[i] ? { ...st, rise: formatIn(row.finished[i]!) } : st));
  });

  const railFrom = flights ? A("treads") : A("floor");
  d.rail = { ...d.rail, height: sub1(d.rail.height, railFrom) };
  d.fab = { ...d.fab, bottomClearance: sub1(d.fab.bottomClearance, railFrom) };
  if (d.deck && shape === "deck") d.deck = { ...d.deck, guardHeight: sub1(d.deck.guardHeight, A("deck")) };
  if (d.balcony && shape === "balcony") d.balcony = { ...d.balcony, guardHeight: sub1(d.balcony.guardHeight, A("floor")) };
  if (d.gate && shape === "gate") {
    const g = A("ground");
    d.gate = { ...d.gate, groundClearance: sub1(d.gate.groundClearance, g), heightHinge: sub1(d.gate.heightHinge, g), heightLatch: sub1(d.gate.heightLatch, g) };
  }
  if (d.fence && shape === "fence") {
    const g = A("ground");
    d.fence = { ...d.fence, height: sub1(d.fence.height, g), segments: d.fence.segments.map((s2) => ({ ...s2, height: sub1(s2.height, g) })) };
  }
  if (d.opening && shape === "opening") d.opening = { ...d.opening, julietSill: sub1(d.opening.julietSill, A("floor")) };
  return d;
}

export interface HeightNote {
  /** i18n key of the height (railHeight, guardHeight, groundClearance …). */
  key: string;
  surface: SurfaceKey;
  measured: number;
  finished: number;
}

/** Each measured height that a pending finish changes: measured → finished. */
export function heightNotes(data: MeasureData, shape: MeasureShape): HeightNote[] {
  const sf = data.surfaces || {};
  const out: HeightNote[] = [];
  const push = (key: string, surface: SurfaceKey, v: string | undefined) => {
    const add = finishAdd(sf[surface]);
    const n = parseMeas(v);
    if (add > 0 && n !== null) out.push({ key, surface, measured: n, finished: Math.max(0, n - add) });
  };
  const flights = hasFlights(data);
  if (!["deck", "balcony", "gate", "fence", "opening", "structural", "fire_escape", "window_well"].includes(shape)) {
    push("fin_h_rail", flights ? "treads" : "floor", data.rail.height);
    push("fin_h_bottom", flights ? "treads" : "floor", data.fab.bottomClearance);
  }
  if (shape === "deck") push("fin_h_guard", "deck", data.deck?.guardHeight);
  if (shape === "balcony") push("fin_h_guard", "floor", data.balcony?.guardHeight);
  if (shape === "gate") {
    push("fin_h_clear", "ground", data.gate?.groundClearance);
    push("fin_h_gate", "ground", data.gate?.heightLatch || data.gate?.heightHinge);
  }
  if (shape === "fence") push("fin_h_fence", "ground", data.fence?.height);
  if (shape === "opening") push("fin_h_sill", "floor", data.opening?.julietSill);
  if (shape === "structural") {
    for (const m of data.structural?.members || []) {
      if (m.role !== "column" && m.role !== "post") continue;
      const hs = m.heights.map((r) => parseMeas(r.value)).filter((x): x is number => x !== null && x > 0);
      if (hs.length) push(`fin_h_column|${m.mark}`, "slab", String(Math.min(...hs)));
    }
  }
  return out;
}

/** Code riser variation, inches (IRC R311.7.5.1 / 780 CMR). */
export const RISER_VARIATION = 0.375;

/**
 * Mixed finishes: hardwood on the treads but tile on the landing, or a bottom
 * floor that is not going to get what the treads get, leave the first or last
 * riser out of step with the rest once everything is down.
 */
export function finishChecks(data: MeasureData, shape: MeasureShape): CheckResult[] {
  const sf = data.surfaces || {};
  const pending = (["bottom", "treads", "landing", "top"] as SurfaceKey[]).some((k) => finishAdd(sf[k]) > 0);
  if (!pending || ["deck", "balcony", "gate", "fence", "opening", "structural", "fire_escape", "window_well"].includes(shape)) return [];
  const rows = finishedRisers(data);
  const multi = rows.length > 1;
  const out: CheckResult[] = [];
  for (const r of rows) {
    const fin = r.finished.filter((x): x is number => x !== null);
    const mea = r.measured.filter((x): x is number => x !== null);
    if (fin.length < 2) continue;
    const vf = Math.max(...fin) - Math.min(...fin);
    const vm = Math.max(...mea) - Math.min(...mea);
    const level: CheckLevel = vf > RISER_VARIATION + 1e-6 ? "red" : vf > vm + 1 / 16 + 1e-6 ? "yellow" : "green";
    out.push({ key: "finish_riser_mix", level, expected: RISER_VARIATION, actual: vf, delta: vf - RISER_VARIATION, unit: "in", detail: multi ? `#${r.flight + 1}` : undefined });
  }
  return out;
}
