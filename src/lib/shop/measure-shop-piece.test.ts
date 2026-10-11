import { describe, expect, it } from "vitest";
import {
  blankShopPiece,
  bottleLoad,
  newShopPiece,
  newSpMaterial,
  normalizeShopPiece,
  shopPieceChecks,
  shopPieceGaps,
  spFabSize,
  type ShopPiece,
  type ShopPieceData,
} from "./measure-shop-piece";
import { ShopPieceSchema } from "./measure-shop-piece-schema";
import { SHOP_PIECE_STR } from "./measure-shop-piece-i18n";
import { newMeasureData, normalizeMeasureData } from "./measure";
import { requiredGaps, runChecks } from "./measure-checks";
import { mt } from "./measure-i18n";
import { shopPieceScene } from "./scene-shapes/scene-shop-piece";
import { SCENE_SHAPES } from "./scene-shapes";
import { sceneProjectOrder, sceneProjectShape } from "./measure-scene-setup";

const niche: Partial<ShopPiece> = {
  type: "wine_rack",
  wBack: "36 1/8", wFront: "36 1/4", wTop: "36", wBottom: "36 1/4",
  hLeft: "84", hRight: "84 1/8", hBack: "84",
  dTop: "15", dBottom: "15 1/4",
  diagA: "91 3/8", diagB: "91 1/2",
};

function sheet(patch: Partial<ShopPieceData> = {}, piece: Partial<ShopPiece> = niche): ShopPieceData {
  const d = blankShopPiece();
  Object.assign(d, { mount: "freestanding", niche: true, finish: "powder", load: "bottles", bottles: "120" }, patch);
  d.pieces = [newShopPiece(piece)];
  d.materials = [newSpMaterial({ profile: '1" sq tube 14ga', use: "frame" })];
  return d;
}

const keys = (d: ShopPieceData) => shopPieceChecks(d).map((c) => `${c.key}:${c.level}`);

describe("shop piece size", () => {
  it("in a niche, builds to the tightest reading minus clearance", () => {
    const d = sheet();
    const f = spFabSize(d, d.pieces[0]);
    expect(f.width).toBe(36 - 0.5);
    expect(f.from.w).toBe("wTop");
    expect(f.height).toBe(84 - 0.25);
    expect(f.depth).toBe(15 - 0.25);
    expect(f.open).toEqual({ w: 36, h: 84, d: 15 });
  });
  it("outside a niche, builds to the design size", () => {
    const d = sheet({ niche: false }, { type: "bar_frame", wFront: "96", hLeft: "42", dTop: "24" });
    const f = spFabSize(d, d.pieces[0]);
    expect([f.width, f.height, f.depth]).toEqual([96, 42, 24]);
    expect(f.clearance).toBe(0);
  });
  it("bottle load", () => {
    expect(bottleLoad({ load: "bottles", bottles: "100" })).toBeCloseTo(330);
    expect(bottleLoad({ load: "people", bottles: "100" })).toBeNull();
  });
});

describe("shop piece checks", () => {
  it("a square niche is green", () => {
    expect(shopPieceChecks(sheet()).every((c) => c.level === "green")).toBe(true);
  });
  it("an out-of-square niche is red until a decision, then yellow", () => {
    const d = sheet({}, { ...niche, diagB: "92 1/4" });
    expect(keys(d)).toContain("sp_square:red");
    d.pieces[0].squareFix = "template";
    expect(keys(d)).toContain("sp_square:yellow");
  });
  it("widths that spread are graded", () => {
    expect(keys(sheet({}, { ...niche, wBack: "36 3/4" }))).toContain("sp_width_spread:red");
    expect(keys(sheet({}, { ...niche, wBack: "36 1/2" }))).toContain("sp_width_spread:yellow");
  });
  it("clearance that leaves nothing is red", () => {
    expect(keys(sheet({ clearance: "20" }))).toContain("sp_fab_none:red");
  });
  it("people, and heavy loads on studs, are flagged", () => {
    expect(keys(sheet({ load: "people" }))).toContain("sp_people_load:yellow");
    expect(keys(sheet({ mount: "wall", substrate: "studs" }))).toContain("sp_stud_load:yellow");
    expect(keys(sheet({ mount: "wall", substrate: "masonry" }))).not.toContain("sp_stud_load:yellow");
  });
  it("several pieces from one measurement is a warning", () => {
    expect(keys(sheet({}, { ...niche, qty: "3" }))).toContain("sp_typical:yellow");
  });
});

describe("shop piece gaps", () => {
  it("a blank sheet asks for mount, type, sizes, materials, finish, load and the reference", () => {
    const g = shopPieceGaps(blankShopPiece(), []).map((x) => (x.key === "photo" ? `photo:${x.detail}` : x.key));
    for (const k of ["sp_mount", "sp_type", "sp_width", "sp_height", "sp_depth", "sp_materials", "sp_finish", "sp_load", "photo:sp_reference"]) expect(g).toContain(k);
  });
  it("niche readings replace the single size", () => {
    const d = sheet({}, { type: "wine_rack" });
    const g = shopPieceGaps(d, []).map((x) => x.key);
    expect(g).toEqual(expect.arrayContaining(["sp_widths", "sp_heights", "sp_depths", "sp_diagonals"]));
    expect(g).not.toContain("sp_width");
  });
  it("a complete sheet with its drawing has no fabrication gaps", () => {
    expect(shopPieceGaps(sheet(), [{ slot: "sp_reference" }]).filter((g) => (g.tier || "fab") === "fab")).toEqual([]);
    // A written drawing reference stands in for the photo.
    expect(shopPieceGaps(sheet({ drawingRef: "A-3" }), []).filter((g) => (g.tier || "fab") === "fab")).toEqual([]);
  });
  it("wall mounts must say what they fasten to; bottles need a count", () => {
    expect(shopPieceGaps(sheet({ mount: "wall" }), []).map((g) => g.key)).toContain("sub_shoppiece");
    expect(shopPieceGaps(sheet({ bottles: "" }), []).map((g) => g.key)).toContain("sp_bottles");
  });
});

describe("shop piece sheet wiring", () => {
  it("new sheet, schema round trip and normalize", () => {
    const d = newMeasureData("shop_piece", 0);
    expect(d.shopPiece?.pieces).toHaveLength(1);
    const s = sheet();
    const parsed = ShopPieceSchema.parse(JSON.parse(JSON.stringify(s)));
    expect(parsed).toEqual(s);
    expect(normalizeMeasureData({ ...d, shopPiece: parsed! }).shopPiece).toEqual(s);
    expect(normalizeShopPiece({ mount: "wall" } as Partial<ShopPieceData>).pieces).toHaveLength(1);
  });
  it("routes checks and gaps for the shape", () => {
    const d = newMeasureData("shop_piece", 0);
    d.shopPiece = sheet({}, { ...niche, diagB: "93" });
    expect(runChecks(d, "shop_piece").some((c) => c.key === "sp_square" && c.level === "red")).toBe(true);
    expect(requiredGaps(d, "shop_piece").some((g) => g.detail === "sp_reference")).toBe(true);
  });
  it("is a project-setup tile for both environments", () => {
    for (const env of ["interior", "exterior"] as const) {
      expect(sceneProjectOrder(env)).toContain("shop_piece");
      expect(sceneProjectOrder(env)).toContain("wall_cap");
    }
    expect(sceneProjectShape("shop_piece")).toBe("shop_piece");
    expect(sceneProjectShape("wall_cap")).toBe("wall_cap");
  });
  it("every string has EN, PT and ES", () => {
    for (const l of ["en", "pt", "es"] as const) for (const v of Object.values(SHOP_PIECE_STR[l])) expect(v.trim()).not.toBe("");
    const d = sheet({ load: "people", mount: "wall", substrate: "studs", clearance: "20" }, { ...niche, qty: "2", diagB: "95", wBack: "40" });
    for (const c of shopPieceChecks(d)) expect(mt("es", `check_${c.key}`)).not.toBe(`check_${c.key}`);
    for (const g of shopPieceGaps(blankShopPiece(), [])) if (g.key !== "photo") expect(mt("pt", `gap_${g.key}`)).not.toBe(`gap_${g.key}`);
  });
});

describe("shop piece 3D", () => {
  it("draws a 12-member frame per piece and the niche around it", () => {
    const d = newMeasureData("shop_piece", 0);
    d.shopPiece = sheet();
    const s = shopPieceScene(d);
    expect(s.meshes).toHaveLength(1);
    expect(s.meshes[0].vertices.length).toBe(12 * 8);
    expect(s.lines.filter((l) => l.entity.role === "niche")).toHaveLength(6);
    const xs = s.meshes.flatMap((m) => m.vertices.map((v) => v.x));
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(35.5);
    expect(s.pending).toEqual([]);
    expect(SCENE_SHAPES.shop_piece).toBe(shopPieceScene);
  });
  it("lays pieces side by side and marks missing sizes provisional", () => {
    const d = newMeasureData("shop_piece", 0);
    d.shopPiece = blankShopPiece();
    d.shopPiece.pieces.push(newShopPiece());
    const s = shopPieceScene(d);
    expect(s.meshes).toHaveLength(2);
    expect(s.meshes.every((m) => m.provisional)).toBe(true);
    expect(s.pending).toHaveLength(2);
  });
});
