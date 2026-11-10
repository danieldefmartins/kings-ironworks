import { describe, expect, it } from "vitest";
import { porchSiteFixture } from "./measure-site.fixture";
import { newMeasureData, newSpan, normalizeMeasureData } from "./measure";
import { measureScene } from "./measure-scene";
import { requiredGaps } from "./measure-checks";
import { gapChoices, setRailEndTarget } from "./measure-next-choices";
import { SHOP_DEFAULTS, linkColumn, syncLinkedColumns } from "./measure-shop-defaults";
import { SiteObjectSchema, newColumnParts, newSiteObject, siteMesh, siteTrim, type SiteObject } from "./measure-site";
import { steelSources } from "./measure-steel";
import { supportOpenItems } from "./measure-support-attachment";

const span = (xs: number[]) => Math.max(...xs) - Math.min(...xs);

describe("a post is drawn as a post", () => {
  it("adds a base plate under a base-plate post and keeps the post ids the drawing drags by", () => {
    const data = porchSiteFixture();
    data.posts[0].mount = "Base plate";
    const scene = measureScene(data), plated = scene.meshes.find((m) => m.id === `post:${data.posts[0].id}`)!, plain = scene.meshes.find((m) => m.id === `post:${data.posts[1].id}`)!;
    expect(plated.kind).toBe("post");
    expect(plated.entity.postId).toBe(data.posts[0].id);
    expect(span(plain.vertices.map((v) => v.x))).toBeCloseTo(2);
    expect(span(plated.vertices.map((v) => v.x))).toBeCloseTo(SHOP_DEFAULTS.draw.basePlate.size);
    data.posts[0].plate = "6 x 6 x 1/2";
    expect(span(measureScene(data).meshes.find((m) => m.id === plated.id)!.vertices.map((v) => v.x))).toBeCloseTo(6);
  });
  it("draws an existing post with its skirt as a wider foot", () => {
    const data = porchSiteFixture(), post = data.posts[1];
    Object.assign(post, { pointType: "existing_post", existingW: "6", existingD: "6", skirtProjection: "1", skirtHeight: "5" });
    const mesh = measureScene(data).meshes.find((m) => m.entity.postId === post.id)!;
    expect(span(mesh.vertices.map((v) => v.x))).toBeCloseTo(8);
  });
});

describe("a rail end on a wall", () => {
  const sheet = () => {
    const data = porchSiteFixture();
    data.spans = [newSpan()];
    return data;
  };
  it("one tap records a complete, shop-usable clip", () => {
    const data = sheet();
    const ask = gapChoices({ key: "term_target", detail: "#1 end" }, "en", data)!;
    expect(ask.question).toBe("Top end attaches to");
    expect(gapChoices({ key: "term_target", detail: "#1 start" }, "pt", data)!.question).toBe("Ponta de baixo fixa em");
    expect(ask.options.map((o) => o.label)).toEqual(["Wall clip", "Wall plate", "Post", "Existing column", "Open"]);
    ask.put(data, "wall_clip");
    const t = data.spans[0].end;
    expect(t).toMatchObject({ attachTo: "wall", method: "clip" });
    expect(t.hardware).toMatchObject({ profile: SHOP_DEFAULTS.wallClip.profile, qty: "2", shopField: "shop_weld" });
    // Only what the wall is made of is still asked, and that is one tap too.
    const open = requiredGaps(data, "stair_platform").filter((g) => g.detail === "#1 end" && g.tier !== "doc").map((g) => g.key);
    expect(open).toEqual(["term_material"]);
    const made = gapChoices({ key: "term_material", detail: "#1 end" }, "en", data)!;
    expect(made.question).toBe("Top end: what is the wall made of?");
    made.put(data, "Brick");
    expect(requiredGaps(data, "stair_platform").some((g) => g.detail === "#1 end" && g.tier !== "doc")).toBe(false);
    expect(data.spans[0].end.sub?.material).toBeTruthy();
  });
  it("keeps what was typed when the usual clip is applied, and names the rail when there are several", () => {
    const data = sheet();
    data.spans.push(newSpan());
    data.spans[1].start.hardware.qty = "3";
    setRailEndTarget(data, 1, "start", "wall_clip");
    expect(data.spans[1].start.hardware.qty).toBe("3");
    expect(gapChoices({ key: "term_target", detail: "#2 end" }, "es", data)!.question).toBe("Baranda 2 · Extremo de arriba se fija a");
    const level = normalizeMeasureData(newMeasureData("balcony", 0));
    expect(gapChoices({ key: "term_target", detail: "#1 start" }, "en", level)!.question).toBe("Start end attaches to");
  });
  it("ties Post to the first / last railing post and Open to an open end", () => {
    const data = sheet();
    setRailEndTarget(data, 0, "start", "post");
    setRailEndTarget(data, 0, "end", "open");
    expect(data.spans[0].start).toMatchObject({ attachTo: "free_post", postId: data.posts.filter((p) => p.side === "left")[0].id });
    expect(data.spans[0].end.attachTo).toBe("open");
    expect(requiredGaps(data, "stair_platform").some((g) => g.key.startsWith("term_"))).toBe(false);
  });
  it("draws the clip on the measured wall the rail runs into, with the rail carried to it", () => {
    const data = sheet();
    setRailEndTarget(data, 0, "end", "wall_clip");
    const scene = measureScene(data), id = `clip:${data.spans[0].id}:end`;
    const clip = scene.meshes.find((m) => m.id === id)!, rail = scene.lines.find((l) => l.id === `rail-end:${data.spans[0].id}:end`)!;
    expect(clip.provisional).toBe(false);
    // The house wall's near face is at x = 116.
    expect(Math.max(...clip.vertices.map((v) => v.x))).toBeCloseTo(116);
    expect(rail.points[1].x).toBeCloseTo(116);
    expect(span(clip.vertices.map((v) => v.z))).toBe(SHOP_DEFAULTS.draw.clip.length);
  });
  it("with no wall measured there, draws it amber on a piece of wall at the end of the stair", () => {
    const data = sheet();
    data.site!.objects = data.site!.objects.filter((o) => o.kind !== "wall");
    setRailEndTarget(data, 0, "end", "wall_plate");
    const part = measureScene(data).meshes.find((m) => m.id === `clip:${data.spans[0].id}:end`)!;
    expect(part.provisional).toBe(true);
    expect(span(part.vertices.map((v) => v.z))).toBe(16);
    // Nothing is drawn for an end that stands on a post.
    setRailEndTarget(data, 0, "end", "post");
    expect(measureScene(data).meshes.some((m) => m.id.startsWith("clip:"))).toBe(false);
  });
  it("still draws a rail-end clip on a sheet with no posts yet", () => {
    const data = sheet();
    data.posts = [];
    setRailEndTarget(data, 0, "end", "wall_clip");
    expect(measureScene(data).meshes.some((m) => m.id === `clip:${data.spans[0].id}:end`)).toBe(true);
  });
});

describe("a point turned into a clip", () => {
  it("is drawn as a clip where it sits, never as a bare line and never missing", () => {
    const data = porchSiteFixture(), post = data.posts[1];
    post.pointType = "clip";
    const scene = measureScene(data), mesh = scene.meshes.find((m) => m.entity.postId === post.id)!;
    expect(mesh.kind).toBe("post");
    expect(scene.lines.some((l) => l.kind === "post" && l.entity.postId === post.id)).toBe(false);
    expect(requiredGaps(data, "stair_platform").some((g) => g.key === "clip_detail")).toBe(false);
  });
  it("lands on the chosen wall or column while its connection is still open, and says what is open", () => {
    const data = porchSiteFixture(), post = data.posts[1];
    post.pointType = "clip";
    post.supportAttachment = { objectId: "column-1", face: "left", along: 0.5, angle: 0, elevation: "", connection: "", gap: "0" };
    const mesh = measureScene(data).meshes.find((m) => m.entity.postId === post.id)!;
    expect(mesh.provisional).toBe(true);
    // column-1 spans x 44..52, y -24..-16: the clip sits on its outline.
    const cx = mesh.vertices.reduce((s, v) => s + v.x, 0) / mesh.vertices.length;
    expect(cx).toBeGreaterThan(42);
    expect(cx).toBeLessThan(54);
    expect(supportOpenItems(data, data.site, post)).toEqual(["datum"]);
    post.supportAttachment.elevation = "0";
    expect(supportOpenItems(data, data.site, post)).toContain("square");
    post.supportAttachment.objectId = "";
    expect(supportOpenItems(data, data.site, post)).toEqual(["support"]);
  });
});

describe("columns", () => {
  const column = () => Object.assign(newSiteObject("column", "c1", "Porch column"), { x: "0", y: "0", z: "0", length: "6", depth: "6", height: "96" });
  it("draws a wider block at the foot when a base molding is recorded, and a cap when one is", () => {
    const o = column();
    expect(siteTrim(o)).toBeNull();
    Object.assign(o, { baseProjection: "1", baseHeight: "8" });
    const base = siteTrim(o)!;
    expect(span(base.vertices.map((v) => v.x))).toBe(8);
    expect(span(base.vertices.map((v) => v.z))).toBe(8);
    Object.assign(o, { capProjection: "1 1/2", capHeight: "4" });
    const both = siteTrim(o)!;
    expect(Math.max(...both.vertices.map((v) => v.z))).toBe(96);
    expect(span(both.vertices.map((v) => v.x))).toBe(9);
    // The measured shaft other code anchors to is unchanged.
    expect(siteMesh(o)!.vertices).toHaveLength(8);
    const data = porchSiteFixture();
    data.site!.objects.push(o);
    const drawn = measureScene(data).meshes.find((m) => m.id === "site:c1")!;
    expect(drawn.vertices).toHaveLength(24);
    o.section = "round";
    expect(siteTrim(o)!.vertices).toHaveLength(96);
  });
  it("loads sheets saved before these fields and keeps the new ones through the schema", () => {
    const old = column();
    expect(SiteObjectSchema.parse(old)).toEqual(old);
    const made = { ...column(), origin: "new" as const, baseProjection: "1", baseHeight: "8" };
    expect(SiteObjectSchema.parse(made)).toEqual(made);
  });
  it("gives a rail end that attaches to a drawn column that column's numbers, entered once", () => {
    const data = porchSiteFixture();
    data.spans = [newSpan()];
    const only = data.site!.objects.filter((o) => o.kind === "column");
    data.site!.objects = data.site!.objects.filter((o) => o.kind !== "column" || o.id === only[0].id);
    Object.assign(only[0], { baseProjection: "3/4", baseHeight: "7" });
    setRailEndTarget(data, 0, "end", "column");
    const t = data.spans[0].end;
    expect(t).toMatchObject({ attachTo: "existing_post", method: "clip", columnId: only[0].id, columnW: "8", columnD: "8", molding: "3/4", moldingHeight: "7" });
    expect(requiredGaps(data, "stair_platform").some((g) => g.key === "term_column_w" || g.key === "term_column_d" || g.key === "term_molding_h")).toBe(false);
    only[0].length = "10";
    syncLinkedColumns(data);
    expect(t.columnW).toBe("10");
    data.site!.objects = [];
    syncLinkedColumns(data);
    expect(t.columnId).toBeUndefined();
    expect(t.columnW).toBe("10");
    linkColumn(t, { ...only[0], section: "round" });
    expect(t.columnD).toBe("10");
  });
  it("lists a column the shop makes for Materials: shaft, base and cap", () => {
    const data = porchSiteFixture(), o: SiteObject = Object.assign(column(), { origin: "new" as const, baseProjection: "1", baseHeight: "8", capProjection: "1", capHeight: "4" });
    data.site!.objects.push(o);
    expect(newColumnParts(data.site).map((p) => [p.key, p.length, p.width])).toEqual([["column:c1:shaft", 84, 6], ["column:c1:base", 8, 8], ["column:c1:cap", 4, 8]]);
    expect(steelSources(data).filter((s) => s.key.startsWith("column:")).map((s) => s.label)).toEqual(["Porch column · shaft", "Porch column · base", "Porch column · cap"]);
    o.origin = "existing";
    expect(steelSources(data).some((s) => s.key.startsWith("column:"))).toBe(false);
  });
});
