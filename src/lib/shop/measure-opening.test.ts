import { describe, expect, it } from "vitest";
import {
  blankOpening,
  julietGuardAboveSill,
  newOpeningUnit,
  normalizeOpening,
  openingChecks,
  openingFabSize,
  openingGaps,
  openingPieceCount,
  openingSquareness,
  type OpeningData,
  type OpeningUnit,
} from "./measure-opening";
import { OpeningSchema } from "./measure-opening-schema";
import { newMeasureData, normalizeMeasureData, requiredPhotoSlots } from "./measure";
import { requiredGaps, runChecks, sheetReadiness } from "./measure-checks";

function unit(p: Partial<OpeningUnit>): OpeningUnit {
  return { ...newOpeningUnit("1"), ...p };
}
function sheet(p: Partial<OpeningData> = {}): OpeningData {
  return { ...blankOpening(1), ...p };
}
const square = unit({ wTop: "36", wMid: "36", wBot: "36", hLeft: "48", hCenter: "48", hRight: "48", diagA: "60", diagB: "60" });

describe("opening fabrication size", () => {
  it("takes the SMALLEST width and height inside the reveal, less clearance each side", () => {
    const u = unit({ wTop: "36 1/4", wMid: "35 7/8", wBot: "36", hLeft: "48", hCenter: "47 3/4", hRight: "48 1/8" });
    const f = openingFabSize({ mount: "reveal", clearance: '1/4"', overlap: "" }, u)!;
    expect(f.widthFrom).toBe("wMid");
    expect(f.heightFrom).toBe("hCenter");
    expect(f.width).toBeCloseTo(35.875 - 0.5);
    expect(f.height).toBeCloseTo(47.75 - 0.5);
    expect(f.face).toBe(false);
  });

  it("takes the LARGEST width and height when face-mounted, plus overlap each side", () => {
    const u = unit({ wTop: "36 1/4", wMid: "35 7/8", wBot: "36", hLeft: "48", hCenter: "47 3/4", hRight: "48 1/8" });
    const f = openingFabSize({ mount: "face_out", clearance: '1/4"', overlap: '1 1/2"' }, u)!;
    expect(f.widthFrom).toBe("wTop");
    expect(f.heightFrom).toBe("hRight");
    expect(f.width).toBeCloseTo(36.25 + 3);
    expect(f.height).toBeCloseTo(48.125 + 3);
  });

  it("honours an edited clearance, including zero", () => {
    const f = openingFabSize({ mount: "reveal", clearance: "0", overlap: "" }, square)!;
    expect(f.width).toBe(36);
    expect(f.height).toBe(48);
    const g = openingFabSize({ mount: "reveal", clearance: "3/8", overlap: "" }, square)!;
    expect(g.width).toBeCloseTo(35.25);
  });

  it("works from partial measurements but waits for at least one of each", () => {
    expect(openingFabSize({ mount: "reveal", clearance: "1/4", overlap: "" }, unit({ wMid: "30" }))).toBeNull();
    const f = openingFabSize({ mount: "reveal", clearance: "1/4", overlap: "" }, unit({ wMid: "30", hLeft: "40" }))!;
    expect(f.width).toBe(29.5);
    expect(f.height).toBe(39.5);
  });

  it("returns null when the clearance would leave nothing, and flags it red", () => {
    const tiny = unit({ wTop: "1/4", wMid: "1/4", wBot: "1/4", hLeft: "10", hCenter: "10", hRight: "10" });
    const o = sheet({ mount: "reveal", clearance: "1/4", units: [tiny] });
    expect(openingFabSize(o, tiny)).toBeNull();
    expect(openingChecks(o).find((c) => c.key === "op_fab_none")?.level).toBe("red");
  });

  it("an unreadable clearance gives no size rather than a wrong one", () => {
    expect(openingFabSize({ mount: "reveal", clearance: "abc", overlap: "" }, square)).toBeNull();
  });
});

describe("opening squareness", () => {
  it("grades the diagonal difference green / yellow / red", () => {
    expect(openingSquareness(unit({ diagA: "60", diagB: "60 1/4" })).diagLevel).toBe("green");
    expect(openingSquareness(unit({ diagA: "60", diagB: "60 3/8" })).diagLevel).toBe("yellow");
    expect(openingSquareness(unit({ diagA: "60", diagB: "60 5/8" })).diagLevel).toBe("red");
    expect(openingSquareness(unit({ diagA: "60" })).diagLevel).toBe("na");
  });

  it("grades the width and height spread and reports the worst", () => {
    const s = openingSquareness(unit({ wTop: "36", wMid: "36 1/8", wBot: "36 3/4", hLeft: "48", hCenter: "48", hRight: "48 1/8" }));
    expect(s.widthSpread).toBeCloseTo(0.75);
    expect(s.widthLevel).toBe("red");
    expect(s.heightLevel).toBe("green");
    expect(s.level).toBe("red");
  });

  it("a red squareness blocks until a build decision is made, then warns", () => {
    const bad = unit({ ...square, diagB: "61" });
    const o = sheet({ product: "panel", mount: "reveal", units: [bad] });
    expect(openingChecks(o).find((c) => c.key === "op_square")?.level).toBe("red");
    o.units[0].squareFix = "template";
    expect(openingChecks(o).find((c) => c.key === "op_square")?.level).toBe("yellow");
  });

  it("catches a misread diagonal against width and height", () => {
    // 36 x 48 → 60. Both diagonals 62 agree with each other but not the box.
    const o = sheet({ units: [unit({ ...square, diagA: "62", diagB: "62" })] });
    expect(openingChecks(o).find((c) => c.key === "op_diag_vs_wh")?.level).toBe("red");
    expect(openingChecks(sheet({ units: [square] })).find((c) => c.key === "op_diag_vs_wh")?.level).toBe("green");
  });
});

describe("opening requirements", () => {
  it("a sleeping-room guard must say whether it has a quick release", () => {
    const o = sheet({ product: "guard", mount: "reveal", units: [unit({ ...square, reveal: "4", egress: "yes" })] });
    expect(openingGaps(o, []).map((g) => g.key)).toContain("op_quick_release");
    o.units[0].quickRelease = "no";
    expect(openingGaps(o, []).map((g) => g.key)).not.toContain("op_quick_release");
    expect(openingChecks(o).find((c) => c.key === "op_egress_release")?.level).toBe("red");
    o.units[0].quickRelease = "yes";
    expect(openingChecks(o).find((c) => c.key === "op_egress_release")).toBeUndefined();
  });

  it("asks each opening for its own widths, heights and diagonals", () => {
    const o = sheet({ product: "guard", mount: "face_out", units: [square, unit({ label: "W2", wTop: "30" })] });
    const keys = openingGaps(o, []).filter((g) => g.detail === "W2").map((g) => g.key);
    expect(keys).toEqual(expect.arrayContaining(["op_widths", "op_heights", "op_diagonals", "op_egress"]));
  });

  it("door and Juliet questions only apply to those products", () => {
    const door = openingGaps(sheet({ product: "security_door", mount: "reveal" }), []).map((g) => g.key);
    expect(door).toEqual(expect.arrayContaining(["op_door_hinge", "op_door_swing", "op_door_threshold", "op_door_jamb", "op_door_lock"]));
    const jul = openingGaps(sheet({ product: "juliet", mount: "face_out", julietDoorSwing: "out" }), []).map((g) => g.key);
    expect(jul).toEqual(expect.arrayContaining(["op_juliet_sill", "op_juliet_guard", "op_juliet_projection", "op_juliet_clears"]));
    expect(jul).not.toContain("op_door_hinge");
  });

  it("an out-swinging door that hits the Juliet is red", () => {
    const o = sheet({ product: "juliet", julietDoorSwing: "out", julietDoorClears: "no" });
    expect(openingChecks(o).find((c) => c.key === "op_juliet_door")?.level).toBe("red");
  });

  it("works out how far a Juliet must rise above the sill", () => {
    expect(julietGuardAboveSill({ julietSill: "18", julietGuard: "42" })).toBe(24);
    expect(julietGuardAboveSill({ julietSill: "44", julietGuard: "36" })).toBe(0);
    expect(julietGuardAboveSill({ julietSill: "", julietGuard: "36" })).toBeNull();
  });

  it("counts identical openings and warns when measured once for many", () => {
    const o = sheet({ units: [unit({ qty: "6" }), unit({ qty: "1" })] });
    expect(openingPieceCount(o)).toBe(7);
    expect(openingChecks(o).some((c) => c.key === "op_typical" && c.level === "yellow")).toBe(true);
  });
});

describe("opening sheet wiring", () => {
  it("seeds, normalizes, validates and reaches readiness", () => {
    const d = newMeasureData("opening", 5);
    expect(d.opening?.units).toHaveLength(1);
    expect(d.opening?.clearance).toBe('1/4"');
    expect(requiredPhotoSlots("opening")).toContain("op_straight");
    expect(OpeningSchema.safeParse(d.opening).success).toBe(true);
    // zod must keep every field — anything missing would vanish on save
    const parsed = OpeningSchema.parse(d.opening)!;
    expect(Object.keys(parsed).sort()).toEqual(Object.keys(d.opening!).sort());
    expect(Object.keys(parsed.units[0]).sort()).toEqual(Object.keys(d.opening!.units[0]).sort());

    const n = normalizeMeasureData({ ...d, opening: { units: [{ wTop: "30" }] } as never });
    expect(n.opening?.units[0].hLeft).toBe("");
    expect(normalizeOpening({}).units).toHaveLength(1);

    expect(sheetReadiness(d, "opening").ready).toBe(false);
    d.opening = sheet({
      product: "panel", mount: "reveal", substrate: "brick", anchor: "sleeve",
      units: [unit({ ...square, reveal: "4" })],
    });
    const gaps = requiredGaps(d, "opening");
    expect(gaps.filter((g) => g.tier !== "doc")).toEqual([]);
    expect(runChecks(d, "opening").some((c) => c.level === "red")).toBe(false);
    expect(sheetReadiness(d, "opening").ready).toBe(true);
  });
});

describe("opening code checks (IRC R310 / R312.2)", () => {
  const guard = (w: string, h: string, extra: Record<string, string> = {}) => {
    const o = sheet({ product: "guard", mount: "reveal" });
    Object.assign(o.units[0], { wTop: w, wMid: w, wBot: w, hLeft: h, hCenter: h, hRight: h, egress: "yes", quickRelease: "yes", ...extra });
    return o;
  };
  const lv = (o: OpeningData, key: string) => openingChecks(o).filter((c) => c.key === key).map((c) => c.level);

  it("egress hole too small is red, under 5.7 sq ft yellow, else green", () => {
    expect(lv(guard("19", "48"), "op_egress_size")).toEqual(["red"]); // under 20" wide
    expect(lv(guard("30", "24"), "op_egress_size")).toEqual(["yellow"]); // 5.0 sq ft
    expect(lv(guard("36", "36"), "op_egress_size")).toEqual(["green"]); // 9 sq ft
  });
  it("egress sill above 44\" is red", () => {
    expect(lv(guard("36", "36", { sillAff: "46" }), "op_egress_sill")).toEqual(["red"]);
    expect(lv(guard("36", "36", { sillAff: "40" }), "op_egress_sill")).toEqual(["green"]);
  });
  it("low sill over a high drop needs fall protection", () => {
    expect(lv(guard("36", "36", { sillAff: "18", dropOutside: "120" }), "op_fall_protection")).toEqual(["green"]);
    const panel = sheet({ product: "panel", mount: "reveal" });
    Object.assign(panel.units[0], { sillAff: "18", dropOutside: "120" });
    expect(lv(panel, "op_fall_protection")).toEqual(["yellow"]);
    expect(lv(guard("36", "36", { sillAff: "30", dropOutside: "120" }), "op_fall_protection")).toEqual([]);
  });
});
