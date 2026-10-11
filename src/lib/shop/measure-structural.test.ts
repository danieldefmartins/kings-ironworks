import { describe, expect, it } from "vitest";
import {
  applyTemplate,
  blankStructural,
  memberCut,
  memberWeight,
  newMember,
  normalizeStructural,
  plateThickness,
  profileInfo,
  structuralChecks,
  structuralGaps,
  structuralSteelSources,
  structuralSummary,
  weightVerdict,
  type StructuralData,
} from "./measure-structural";
import { STRUCTURAL_STR } from "./measure-structural-i18n";
import { newMeasureData, normalizeMeasureData, requiredPhotoSlots } from "./measure";
import { requiredGaps, runChecks } from "./measure-checks";
import { mt } from "./measure-i18n";
import { steelSources } from "./measure-steel";

function lintel(): StructuralData {
  const s = blankStructural();
  const m = newMember("lintel", "L1", "L4x4x3/8");
  m.spanA = "72";
  m.spanB = "72 1/8";
  m.bearingL = { substrate: "brick", condition: "good", length: "6", wall: "8" };
  m.bearingR = { substrate: "brick", condition: "fair", length: "6", wall: "8" };
  m.carries = "wall";
  s.members.push(m);
  return s;
}

/** The Lincoln MA job: W8x15 beam on two W6x20 columns, 12x12x3/8 base plates. */
function lincolnFrame(): StructuralData {
  const s = blankStructural();
  applyTemplate(s, "frame");
  const [b, c1, c2] = s.members;
  b.profile = "W8x15";
  for (const c of [c1, c2]) {
    c.profile = "W6x20";
    c.basePlate = "12x12x3/8";
    c.capPlate = "none";
  }
  c1.heights[0].value = "95 3/4";
  c1.heights[1].value = "95 7/8";
  c2.heights[0].value = "95";
  c2.heights[1].value = "95 1/8";
  s.frame.cc = "107";
  s.frame.opening = "115";
  s.frame.diagA = "143 1/2";
  s.frame.diagB = "143 5/8";
  return s;
}

describe("profiles", () => {
  it("reads rolled shapes, weight from the name and real depth", () => {
    const w = profileInfo("w8x15")!;
    expect(w.label).toBe("W8x15");
    expect(w.lbPerFt).toBe(15);
    expect(w.depth).toBeCloseTo(8.11);
    expect(profileInfo("W6 x 20")!.depth).toBeCloseTo(6.2);
    expect(profileInfo("C8x11.5")!.lbPerFt).toBe(11.5);
  });
  it("looks up HSS, computes angles and plate", () => {
    expect(profileInfo("HSS4x4x1/4")!.lbPerFt).toBeCloseTo(12.21);
    // Not in the table: falls back to a formula within a few percent.
    const odd = profileInfo("HSS7x7x1/4")!;
    expect(odd.approx).toBe(true);
    expect(odd.lbPerFt).toBeGreaterThan(21);
    expect(odd.lbPerFt).toBeLessThan(23.5);
    expect(profileInfo("L4x4x3/8")!.lbPerFt).toBeCloseTo(9.72, 1);
    expect(profileInfo("PL3/8x12")!.lbPerFt).toBeCloseTo(15.3, 1);
  });
  it("knows lally columns and pipe, and gives up on TBD", () => {
    const l = profileInfo('3-1/2" lally')!;
    expect(l.family).toBe("LALLY");
    expect(l.approx).toBe(true);
    expect(profileInfo("Pipe 3 STD")!.lbPerFt).toBeCloseTo(7.58);
    expect(profileInfo("TBD by engineer")).toBeNull();
    expect(profileInfo("mystery")).toBeNull();
  });
  it("reads plate thickness", () => {
    expect(plateThickness("12x12x3/8")).toBe(0.375);
    expect(plateThickness("1/2")).toBe(0.5);
    expect(plateThickness("none")).toBe(0);
    expect(plateThickness("")).toBeNull();
  });
});

describe("cut length", () => {
  it("beam/lintel = longest span reading + both bearings", () => {
    const s = lintel();
    const cut = memberCut(s.members[0], s);
    expect(cut.length).toBeCloseTo(72.125 + 12);
    expect(cut.parts.map((p) => p.key)).toEqual(["span", "bearingL", "bearingR"]);
  });
  it("waits for both bearings", () => {
    const s = lintel();
    s.members[0].bearingR.length = "";
    expect(memberCut(s.members[0], s)).toMatchObject({ length: null, missing: "bearing" });
  });
  it("column = shortest height − base plate − cap plate − shim", () => {
    const m = newMember("column", "C1", "HSS4x4x1/4");
    m.heights[0].value = "96";
    m.heights[1].value = "95 1/2";
    m.basePlate = "8x8x1/2";
    m.capPlate = "8x8x3/8";
    m.shim = "1/4";
    const cut = memberCut(m);
    expect(cut.length).toBeCloseTo(95.5 - 0.5 - 0.375 - 0.25);
    expect(cut.parts.filter((p) => p.sign < 0).map((p) => p.key)).toEqual(["basePlate", "capPlate", "shim"]);
  });
  it("a frame beam with no span runs outside to outside of the columns", () => {
    const s = lincolnFrame();
    expect(memberCut(s.members[0], s).length).toBeCloseTo(107 + 6.2);
    expect(memberCut(s.members[1], s).length).toBeCloseTo(95.75 - 0.375);
    expect(memberCut(s.members[2], s).length).toBeCloseTo(95 - 0.375);
  });
});

describe("weight", () => {
  it("per member and total", () => {
    const s = lincolnFrame();
    const w = memberWeight(s.members[0], s);
    expect(w.each).toBeCloseTo(((107 + 6.2) / 12) * 15);
    const sum = structuralSummary(s);
    expect(sum.pieces).toBe(3);
    const expected = ((107 + 6.2) / 12) * 15 + ((95.375 + 94.625) / 12) * 20;
    expect(sum.totalWeight).toBeCloseTo(expected);
    expect(sum.longest?.mark).toBe("B1");
    expect(sum.weightComplete).toBe(true);
  });
  it("multiplies by quantity", () => {
    const s = lintel();
    s.members[0].qty = "3";
    const w = memberWeight(s.members[0], s);
    expect(w.total).toBeCloseTo(w.each! * 3);
    expect(structuralSummary(s).pieces).toBe(3);
  });
  it("flags a piece too heavy to carry unless there is a lift", () => {
    const s = lincolnFrame();
    s.access.maxWeight = "100";
    s.access.lift = "hand";
    expect(weightVerdict(s).level).toBe("yellow");
    s.access.lift = "crane";
    expect(weightVerdict(s).level).toBe("green");
  });
});

describe("checks", () => {
  const level = (s: StructuralData, key: string) => structuralChecks(s).filter((c) => c.key === key).map((c) => c.level);

  it("two span readings: green close, red far apart", () => {
    const s = lintel();
    expect(level(s, "struct_span_pair")).toEqual(["green"]);
    s.members[0].spanB = "73";
    expect(level(s, "struct_span_pair")).toEqual(["red"]);
  });
  it("bearing follows code: lintel min 4\" (R703.8.3.1), beam min 3\" (R606.14)", () => {
    const s = lintel();
    expect(level(s, "struct_bearing")).toEqual(["green", "green"]);
    s.members[0].bearingL.length = "3 1/2";
    expect(level(s, "struct_bearing")[0]).toBe("red"); // lintel under 4"
    s.members[0].role = "beam";
    expect(level(s, "struct_bearing")[0]).toBe("green"); // beam needs 3"
    s.members[0].bearingL.length = "2 1/2";
    expect(level(s, "struct_bearing")[0]).toBe("red");
    s.members[0].minBearing = "8"; // the stamped drawing asks for 8"
    s.members[0].bearingL.length = "6";
    expect(level(s, "struct_bearing")).toEqual(["red", "red"]);
  });
  it("bearing longer than the wall warns", () => {
    const s = lintel();
    s.members[0].bearingL.length = "10";
    expect(level(s, "struct_bearing_wall")).toEqual(["yellow"]);
  });
  it("column heights across a sloped slab warn, never block", () => {
    const s = lincolnFrame();
    expect(level(s, "struct_frame_heights")).toEqual(["yellow"]);
    s.members[2].heights[0].value = "93";
    expect(level(s, "struct_frame_heights")).toEqual(["yellow"]);
  });
  it("readings at one column that disagree are red", () => {
    const s = lincolnFrame();
    s.members[1].heights[1].value = "97";
    expect(level(s, "struct_column_heights")[0]).toBe("red");
  });
  it("field vs stamped drawing", () => {
    const s = lincolnFrame();
    s.eng.stamped = "yes";
    s.frame.dwgCc = "107 1/4";
    expect(level(s, "struct_dwg_cc")).toEqual(["green"]);
    s.frame.dwgCc = "108";
    expect(level(s, "struct_dwg_cc")).toEqual(["red"]);
    s.eng.stamped = "no";
    expect(level(s, "struct_dwg_cc")).toEqual([]);
  });
  it("frame square and fit in its opening", () => {
    const s = lincolnFrame();
    expect(level(s, "struct_frame_square")).toEqual(["green"]);
    expect(level(s, "struct_frame_fit")).toEqual(["green"]);
    s.frame.opening = "113";
    expect(level(s, "struct_frame_fit")).toEqual(["red"]);
  });
  it("longest piece vs the way in, splice softens it", () => {
    const s = lincolnFrame();
    s.access.maxLength = "96";
    expect(level(s, "struct_piece_length")).toEqual(["red"]);
    s.access.splice = "over C1";
    expect(level(s, "struct_piece_length")).toEqual(["yellow"]);
    s.access.maxLength = "20'";
    expect(level(s, "struct_piece_length")).toEqual(["green"]);
  });
});

describe("gaps", () => {
  it("an empty sheet asks for engineering and members", () => {
    const keys = structuralGaps(blankStructural()).map((g) => g.key);
    expect(keys).toContain("struct_eng_stamped");
    expect(keys).toContain("struct_members");
    expect(keys).toContain("struct_max_length");
  });
  it("a lintel needs its second span reading and wall thickness", () => {
    const s = lintel();
    s.members[0].spanB = "";
    s.members[0].bearingL.wall = "";
    const keys = structuralGaps(s).map((g) => `${g.key}:${g.detail ?? ""}`);
    expect(keys).toContain("struct_span_second:L1");
    expect(keys).toContain("struct_wall:L1 L");
  });
  it("TBD profile blocks fabrication", () => {
    const s = lintel();
    s.members[0].profile = "TBD by engineer";
    const g = structuralGaps(s).find((x) => x.key === "struct_profile_tbd");
    expect(g && (g.tier || "fab")).toBe("fab");
  });
  it("columns need two height readings", () => {
    const s = lincolnFrame();
    s.members[1].heights[1].value = "";
    expect(structuralGaps(s).some((g) => g.key === "struct_heights_second" && g.detail === "C1")).toBe(true);
  });
});

describe("wiring", () => {
  it("new sheet seeds structural data, normalisation keeps it", () => {
    const d = newMeasureData("structural", 1);
    expect(d.structural?.finish).toBe("dtm");
    applyTemplate(d.structural!, "lintel");
    const back = normalizeMeasureData(JSON.parse(JSON.stringify(d)));
    expect(back.structural?.members[0].role).toBe("lintel");
    expect(newMeasureData("deck", 4).structural).toBeUndefined();
  });
  it("normalise fills fields a stored member predates", () => {
    const n = normalizeStructural({ members: [{ id: "x", role: "column" } as never] } as never)!;
    expect(n.members[0].bearingL.substrate).toBe("");
    expect(n.access.maxLength).toBe("");
  });
  it("requiredGaps and runChecks route to the structural rules", () => {
    const d = newMeasureData("structural", 1);
    d.structural = lincolnFrame();
    const gaps = requiredGaps(d, "structural").map((g) => g.key);
    expect(gaps).not.toContain("rail_height");
    expect(gaps).not.toContain("mat_post");
    expect(gaps).toContain("photo");
    expect(requiredPhotoSlots("structural")).toContain("st_bearing");
    expect(runChecks(d, "structural").some((c) => c.key === "struct_frame_square")).toBe(true);
  });
  it("cut members reach the materials workspace, one source per piece", () => {
    const d = newMeasureData("structural", 1);
    d.structural = lincolnFrame();
    const src = structuralSteelSources(d.structural);
    expect(src.map((x) => x.label)).toEqual(["B1", "C1", "C2"]);
    expect(steelSources(d).filter((x) => x.key.startsWith("structural-")).length).toBe(3);
  });
  it("every string exists in all three languages", () => {
    for (const k of Object.keys(STRUCTURAL_STR.en)) {
      expect(STRUCTURAL_STR.pt[k], k).toBeTruthy();
      expect(STRUCTURAL_STR.es[k], k).toBeTruthy();
    }
    expect(mt("pt", "shape_structural")).toBe("Aço estrutural");
    for (const c of structuralChecks(lincolnFrame())) expect(STRUCTURAL_STR.en[`check_${c.key}`], c.key).toBeTruthy();
    for (const g of structuralGaps(blankStructural())) expect(STRUCTURAL_STR.en[`gap_${g.key}`], g.key).toBeTruthy();
  });
});
