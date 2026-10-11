import { describe, expect, it } from "vitest";
import { newMeasureData, normalizeMeasureData, type MeasureData } from "./measure";
import { makeSignoff, measurementHash, signoffState, signoffSummary } from "./measure-signoff";

const SIG = "data:image/png;base64,iVBORw0KGgo=";

function signed(): MeasureData {
  const d = newMeasureData("straight", 3);
  const fl = d.segments[0];
  if (fl.kind === "flight") fl.steps.forEach((s) => { s.rise = "7 1/2"; s.run = "10"; });
  d.rail.height = "36";
  d.signoff = makeSignoff(d, { name: " Ana Lima ", email: "", lang: "pt", signature: SIG, summary: [] }, new Date("2026-10-11T12:00:00Z"));
  return d;
}

describe("customer sign-off staleness", () => {
  it("is none until signed", () => {
    expect(signoffState(newMeasureData("straight", 3))).toBe("none");
  });
  it("is valid right after signing and records who/when", () => {
    const d = signed();
    expect(signoffState(d)).toBe("valid");
    expect(d.signoff!.name).toBe("Ana Lima");
    expect(d.signoff!.signedAt).toBe("2026-10-11T12:00:00.000Z");
  });
  it("goes stale on any dimension or design change", () => {
    const a = signed();
    const fl = a.segments[0];
    if (fl.kind === "flight") fl.steps[1].rise = "7 5/8";
    expect(signoffState(a)).toBe("stale");
    const b = signed();
    b.rail.height = "42";
    expect(signoffState(b)).toBe("stale");
    const c = signed();
    c.materials.finish = "Powder coat";
    expect(signoffState(c)).toBe("stale");
    const e = signed();
    e.overall.notes = "Customer wants a gate";
    expect(signoffState(e)).toBe("stale");
  });
  it("comes back valid if the change is undone", () => {
    const d = signed();
    d.rail.height = "42";
    expect(signoffState(d)).toBe("stale");
    d.rail.height = "36";
    expect(signoffState(d)).toBe("valid");
  });
  it("ignores photos, annotations, code profile and the sign-off itself", () => {
    const d = signed();
    d.photos.push({ slot: "overall_bottom", path: "x/y.jpg", takenAt: "2026-10-11" });
    d.annotations["x/y.jpg"] = [];
    d.code = { profile: "ibc2021", occupancy: "commercial" };
    d.units = "ftin";
    expect(signoffState(d)).toBe("valid");
  });
  it("survives a save/load round trip (normalisation fills blanks)", () => {
    const d = signed();
    const reloaded = normalizeMeasureData(JSON.parse(JSON.stringify(d)));
    expect(signoffState(reloaded)).toBe("valid");
    // Blank defaults appearing / disappearing never change the fingerprint
    const stripped = JSON.parse(JSON.stringify(d));
    delete stripped.fab.picketEndGap;
    delete stripped.segments[0].steps[0].levelGap;
    stripped.rail.extensions = undefined;
    expect(measurementHash(normalizeMeasureData(stripped))).toBe(measurementHash(d));
  });
  it("a missing signature image or hash is not a sign-off", () => {
    const d = signed();
    d.signoff!.signature = "";
    expect(signoffState(d)).toBe("none");
  });
});

describe("sign-off summary", () => {
  it("lists only what was recorded, in the customer's language", () => {
    const d = signed();
    d.materials.finish = "DTM Epoxy";
    d.materials.color = "Black";
    d.overall.floorToFloor = "22 1/2";
    const pt = signoffSummary(d, "straight", "pt", { shapeName: "Escada reta" });
    const labels = pt.map((l) => l.label);
    expect(labels).toContain("Altura do corrimão");
    expect(labels).toContain("Acabamento");
    expect(pt.find((l) => l.label === "Altura total")!.value).toBe('22 1/2"');
    expect(pt.find((l) => l.label === "Escada")!.value).toBe("3 degraus");
    expect(labels).not.toContain("Comprimento total");
    const es = signoffSummary(d, "straight", "es");
    expect(es.find((l) => l.label === "Tipo de baranda")!.value).toBe("Baranda de protección");
  });
  it("shows long dimensions in feet and inches", () => {
    const d = newMeasureData("fence", 1);
    d.fence!.totalRun = "148 1/2";
    const en = signoffSummary(d, "fence", "en");
    expect(en.find((l) => l.label === "Fence length")!.value).toBe(`12' 4 1/2"`);
  });
});
