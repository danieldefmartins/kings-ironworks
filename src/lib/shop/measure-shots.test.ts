import { describe, expect, it } from "vitest";
import { MEASURE_SHAPES, newMeasureData, requiredPhotoSlots, type MeasureShape } from "./measure";
import { requiredGaps, sheetReadiness } from "./measure-checks";
import {
  addedRequiredShots,
  dimGeometry,
  formatGps,
  nextShotAfter,
  shotGaps,
  shotList,
  shotProgress,
  stampPhoto,
} from "./measure-shots";
import { SHOTS_KEYS, SHOTS_STR } from "./measure-shots-i18n";
import { mt } from "./measure-i18n";

const photo = (slot: string) => ({ slot, path: `job/${slot}.jpg`, takenAt: "2026-10-11T12:00:00.000Z" });

describe("shot list", () => {
  it("every shape has a shot list that keeps all of its existing required slots required", () => {
    for (const shape of MEASURE_SHAPES) {
      const list = shotList(shape);
      expect(list.length).toBeGreaterThan(3);
      const req = list.filter((s) => s.tier === "required").map((s) => s.slot);
      for (const slot of requiredPhotoSlots(shape)) expect(req).toContain(slot);
      expect(new Set(list.map((s) => s.slot)).size).toBe(list.length);
    }
  });

  it("covers the pro shots per kind of work", () => {
    const stair = shotList("straight").map((s) => s.slot);
    expect(stair).toEqual(expect.arrayContaining(["overall_bottom", "overall_top", "left_side", "right_side", "mount_surface", "existing_rail"]));
    expect(shotList("opening").map((s) => s.slot)).toEqual(expect.arrayContaining(["op_straight", "op_jamb_left", "op_jamb_right", "op_sill"]));
    expect(shotList("structural").map((s) => s.slot)).toEqual(expect.arrayContaining(["st_bearing", "st_bearing_far", "st_beam_under", "st_base"]));
    expect(shotList("gate").map((s) => s.slot)).toEqual(expect.arrayContaining(["gate_opening", "gate_inside", "gate_posts", "gate_ground"]));
  });

  it("close-ups of mounting surfaces ask for a tape in frame", () => {
    const m = shotList("straight").find((s) => s.slot === "mount_surface")!;
    expect(m.tape).toBe(true);
    expect(m.ghost).toBe("closeup");
  });

  it("a landing is required only when the sheet has a platform", () => {
    expect(shotList("stair_platform").find((s) => s.slot === "landing")!.tier).toBe("recommended");
    const d = newMeasureData("stair_platform", 3);
    const withPlat = { segments: [{ kind: "platform" } as never] };
    expect(shotList("stair_platform", withPlat).find((s) => s.slot === "landing")!.tier).toBe("required");
    // already gapped by requiredGaps, so never added twice
    expect(addedRequiredShots("stair_platform", withPlat)).not.toContain("landing");
    expect(d).toBeTruthy();
  });

  it("every slot and ghost hint has EN/PT/ES text", () => {
    for (const shape of MEASURE_SHAPES) {
      for (const s of shotList(shape)) {
        for (const l of ["en", "pt", "es"]) {
          expect(mt(l, `slot_${s.slot}`)).not.toBe(`slot_${s.slot}`);
          expect(mt(l, `shotHint_${s.ghost}`)).not.toBe(`shotHint_${s.ghost}`);
        }
      }
    }
    for (const k of SHOTS_KEYS) {
      expect(SHOTS_STR.pt[k]).toBeTruthy();
      expect(SHOTS_STR.es[k]).toBeTruthy();
    }
  });
});

describe("shot gaps", () => {
  it("added required shots are documentation gaps, never blocking", () => {
    const shape: MeasureShape = "structural";
    const d = newMeasureData(shape, 3);
    const g = shotGaps(d, shape);
    expect(g.map((x) => x.detail)).toEqual(["st_bearing_far", "st_beam_under"]);
    expect(g.every((x) => x.tier === "doc")).toBe(true);
    const all = requiredGaps(d, shape).filter((x) => x.key === "photo");
    expect(all.map((x) => x.detail)).toEqual(expect.arrayContaining(["st_bearing_far", "st_beam_under"]));
    // st_bearing keeps its existing fabrication tier
    expect(all.find((x) => x.detail === "st_bearing")!.tier).toBe("fab");
  });

  it("taking the shot clears its gap", () => {
    const d = newMeasureData("gate", 3);
    expect(shotGaps(d, "gate").map((x) => x.detail)).toEqual(["gate_inside"]);
    d.photos.push(photo("gate_inside"));
    expect(shotGaps(d, "gate")).toEqual([]);
  });

  it("does not change readiness: added shots only ever add doc gaps", () => {
    const d = newMeasureData("gate", 3);
    const r = sheetReadiness(d, "gate");
    expect(r.fabGaps.some((g) => g.key === "photo" && g.detail === "gate_inside")).toBe(false);
    expect(r.docGaps.some((g) => g.key === "photo" && g.detail === "gate_inside")).toBe(true);
  });
});

describe("progress", () => {
  it("counts shots and points at the next required one", () => {
    const d = newMeasureData("opening", 3);
    let p = shotProgress(d, "opening");
    expect(p.done).toBe(0);
    expect(p.total).toBe(shotList("opening").length);
    expect(p.next!.slot).toBe("op_straight");
    d.photos.push(photo("op_straight"), photo("op_inside"));
    p = shotProgress(d, "opening");
    expect(p.done).toBe(2);
    expect(p.requiredDone).toBe(1);
    expect(p.next!.slot).toBe("op_jamb_left");
  });

  it("next shot after one skips taken shots and prefers required", () => {
    const d = newMeasureData("opening", 3);
    d.photos.push(photo("op_jamb_left"));
    expect(nextShotAfter(d, "opening", "op_straight")!.slot).toBe("op_jamb_right");
    d.photos.push(photo("op_straight"), photo("op_jamb_right"), photo("op_sill"));
    expect(nextShotAfter(d, "opening", "op_sill")!.tier).toBe("recommended");
  });
});

describe("capture metadata", () => {
  it("stamps time and a rounded GPS fix", () => {
    const p = stampPhoto("op_sill", "j/x.jpg", { lat: 42.40841234, lng: -71.05371299, acc: 7.6 }, new Date("2026-10-11T15:00:00Z"), true);
    expect(p).toEqual({ slot: "op_sill", path: "j/x.jpg", takenAt: "2026-10-11T15:00:00.000Z", lat: 42.408412, lng: -71.053713, acc: 8, marked: true });
  });

  it("drops an impossible fix and omits GPS when there is none", () => {
    expect(stampPhoto("a", "p", { lat: 120, lng: 0 })).not.toHaveProperty("lat");
    expect(stampPhoto("a", "p", null)).not.toHaveProperty("lat");
  });

  it("formats GPS with hemispheres", () => {
    expect(formatGps(42.4084, -71.0537)).toBe("42.40840° N, 71.05370° W");
    expect(formatGps(-23.5, 46.6)).toBe("23.50000° S, 46.60000° E");
  });
});

describe("dimension line geometry", () => {
  it("puts perpendicular ticks at both ends and the label at the middle", () => {
    const g = dimGeometry({ x: 0, y: 0 }, { x: 100, y: 0 }, 2);
    expect(g.ticks[0].map((v) => v + 0)).toEqual([0, 8, 0, -8]);
    expect(g.ticks[1][0]).toBe(100);
    expect(g.label).toEqual({ x: 50, y: 0, angle: 0 });
    expect(g.heads).toHaveLength(2);
  });

  it("keeps the label upright on a line drawn right-to-left", () => {
    const g = dimGeometry({ x: 100, y: 0 }, { x: 0, y: 0 }, 2);
    expect(Math.abs(g.label.angle)).toBe(0);
    const v = dimGeometry({ x: 0, y: 100 }, { x: 0, y: 0 }, 2);
    expect(v.label.angle).toBe(-90);
  });
});
