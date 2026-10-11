import { describe, expect, it } from "vitest";
import { newMeasureData } from "./measure";
import { postLayout } from "./measure-post-layout";
import { stepRun } from "./measure-post-suggest-runs";
import { deckAdapter, deckPostStations, deckRunId } from "./measure-post-suggest-deck";
import { fenceAdapter, fenceRunId } from "./measure-post-suggest-fence";
import { wallCapAdapter, wallCapRunId } from "./measure-post-suggest-wall-cap";
import { balconyAdapter } from "./measure-post-suggest-balcony";
import { rampAdapter } from "./measure-post-suggest-ramp";
import { customAdapter, customRunId } from "./measure-post-suggest-custom";
import { reconcileRunSuggestions, withRunGhosts } from "./measure-post-suggest-registry";
import { newWallCapRun } from "./measure-wall-cap";
import { balconyFixture, deckFixture, fenceFixture } from "./scene-shapes/scene-shapes.fixture";
import { customFixture } from "./scene-shapes/scene-shapes-b.fixture";
import { measureScene } from "./measure-scene";

describe("deck posts", () => {
  it("fixes corners and both sides of the stair opening, spaces the rest evenly, house side has none", () => {
    const d = deckFixture(), s = deckAdapter.suggest(d)!;
    expect(s.layouts.map((l) => l.count)).toEqual([4, 4, 4]);
    expect(s.layouts[0].spanEach).toBeCloseTo(64);
    // Side 2: corner, opening, opening, corner — no post inside the 42" opening.
    const side2 = s.layouts[1];
    expect(side2.posts.map((p) => p.role)).toEqual(["corner", "opening", "opening", "corner"]);
    expect(side2.posts[2].at - side2.posts[1].at).toBeCloseTo(42);
    expect(s.total).toBe(10); // two shared corners
    expect(s.walls.length).toBe(1); // the house closing edge
    expect(s.approved).toBe(false);
  });
  it("re-spaces with the stepper and stores counts on approval; the 3D draws them", () => {
    const d = deckFixture(), s = deckAdapter.suggest(d)!;
    const counts = stepRun(s, deckRunId(d.deck!.sides[0].id), 1);
    deckAdapter.setCounts(d, counts);
    const s2 = deckAdapter.suggest(d)!;
    expect(s2.layouts[0].count).toBe(5);
    expect(s2.layouts[0].spanEach).toBeCloseTo(48);
    deckAdapter.approve(d);
    expect(d.rail.runPlan?.approved).toBe(true);
    expect(deckPostStations(d).get(d.deck!.sides[0].id)!.at).toHaveLength(5);
    const posts = measureScene(d).meshes.find((m) => m.id === `deck:posts:${d.deck!.sides[0].id}`)!;
    expect(posts.vertices.length / 8).toBe(5);
    expect(posts.provisional).toBe(false);
  });
  it("shows unapproved posts as amber ghosts", () => {
    const d = deckFixture();
    expect(measureScene(d).meshes.find((m) => m.id.startsWith("deck:posts:"))!.provisional).toBe(true);
  });
});

describe("fence posts", () => {
  it("ends, corners and grade breaks are fixed; equal panels between; grade per bay on slopes", () => {
    const d = fenceFixture(), s = fenceAdapter.suggest(d)!;
    expect(s.layouts.map((l) => l.count)).toEqual([4, 4, 3]);
    expect(s.total).toBe(9);
    expect(s.layouts[0].posts.at(-1)!.role).toBe("corner");
    expect(s.notes?.[fenceRunId(d.fence!.segments[0].id)]?.value).toBeCloseTo(8 / 3);
    expect(s.notes?.[fenceRunId(d.fence!.segments[2].id)]).toBeUndefined();
  });
  it("the count is the panel count; approval keeps panel counts already written", () => {
    const d = fenceFixture();
    d.fence!.segments[1].panels = "4";
    fenceAdapter.approve(d);
    expect(d.fence!.segments.map((s) => s.panels)).toEqual(["3", "4", "2"]);
    const s = fenceAdapter.suggest(d)!;
    expect(s.approved).toBe(true);
    fenceAdapter.setCounts(d, stepRun(s, fenceRunId(d.fence!.segments[2].id), 1));
    expect(d.fence!.segments[2].panels).toBe("3");
  });
});

describe("wall cap posts", () => {
  it("suggests rows per run, corner shared with the run before, and writes blank rows on approval", () => {
    const d = newMeasureData("wall_cap", 1), w = d.wallCap!;
    w.runs[0].length = "240";
    w.runs.push(newWallCapRun(2, { length: "96", turn: "90", turnDir: "left" }));
    const s = wallCapAdapter.suggest(d)!;
    expect(s.layouts.map((l) => l.count)).toEqual([5, 3]);
    expect(s.total).toBe(7);
    wallCapAdapter.approve(d);
    expect(w.runs.map((r) => r.posts.length)).toEqual([5, 2]);
  });
  it("never re-spaces a run whose posts hold readings", () => {
    const d = newMeasureData("wall_cap", 1), w = d.wallCap!;
    w.runs[0].length = "240";
    w.runs[0].posts[0].capWidth = "10";
    const s = wallCapAdapter.suggest(d)!;
    expect(s.layouts[0].count).toBe(2);
    expect(s.layouts[0].maxCount).toBe(2);
    wallCapAdapter.approve(d);
    expect(w.runs[0].posts).toHaveLength(2);
    expect(stepRun(s, wallCapRunId(w.runs[0].id), 1)[wallCapRunId(w.runs[0].id)]).toBe(2);
  });
});

describe("balcony posts", () => {
  it("corners and wall ends fixed; the returns step together", () => {
    const d = balconyFixture(), s = balconyAdapter.suggest(d)!;
    expect(s.layouts.map((l) => [l.run.id, l.count])).toEqual([["bal:returnLeft", 2], ["bal:front", 3], ["bal:returnRight", 2]]);
    expect(s.total).toBe(5);
    expect(s.linked).toBe(true);
    const next = stepRun(s, "bal:returnLeft", 1);
    expect(next).toEqual({ "bal:returnLeft": 3, "bal:returnRight": 3 });
  });
  it("a Juliet is one line between its end posts", () => {
    const d = newMeasureData("balcony", 1);
    Object.assign(d.balcony!, { kind: "juliet", doorOpening: "60", projection: "4" });
    const s = balconyAdapter.suggest(d)!;
    expect(s.layouts).toHaveLength(1);
    expect(s.layouts[0].count).toBe(2);
  });
});

describe("ramp posts", () => {
  const ramp = () => {
    const d = newMeasureData("ramp", 1), r = d.segments[0];
    if (r.kind === "ramp") Object.assign(r, { runH: "144", rise: "12", width: "48", length: "144 1/2" });
    d.rail.height = "36";
    return d;
  };
  it("both sides, bottom and top fixed, mirrored; ghosts until approved; real posts that follow the ramp", () => {
    const d = ramp(), s = rampAdapter.suggest(d)!;
    expect(s.layouts.map((l) => [l.run.id, l.count])).toEqual([["left", 3], ["right", 3]]);
    expect(stepRun(s, "left", 1)).toEqual({ left: 4, right: 4 });
    expect(withRunGhosts(d, "ramp").posts.filter((p) => p.suggested === "ghost")).toHaveLength(6);
    rampAdapter.approve(d);
    expect(d.posts).toHaveLength(6);
    const lay = postLayout(d)!;
    expect(lay.posts).toHaveLength(6);
    // Rail parallel to the ramp: every post is the rail height above the surface it stands on.
    for (const p of lay.posts) expect(p.height).toBeCloseTo(36);
    expect(Math.max(...lay.posts.map((p) => p.base.z))).toBeGreaterThan(10);
  });
  it("untouched posts re-space when the ramp is re-measured; edited ones stay", () => {
    const d = ramp();
    rampAdapter.approve(d);
    d.posts[0].fromEdge = "3"; // the measurer's own now
    const r = d.segments[0];
    if (r.kind === "ramp") r.runH = "216";
    expect(reconcileRunSuggestions(d, "ramp")).toBe(true);
    expect(d.posts.find((p) => p.fromEdge === "3")).toBeTruthy();
    expect(d.posts.filter((p) => p.side === "right")).toHaveLength(4);
  });
});

describe("custom (drawn) posts", () => {
  it("start, corners and end fixed per drawn run; keeps posts the measurer placed", () => {
    const d = customFixture(), s = customAdapter.suggest(d)!;
    const path = d.plan!.paths![0];
    const l = s.layouts.find((x) => x.run.id === customRunId(path.id))!;
    expect(l.posts.filter((p) => p.anchor).map((p) => p.at)).toEqual([0, 120, 192, 225]);
    expect(l.count).toBe(5);
    expect(s.approved).toBe(false);
    customAdapter.approve(d);
    // The two hand-placed posts (start, the 192" corner) are kept; three suggested join them.
    expect(d.posts.filter((p) => p.pathId === path.id)).toHaveLength(5);
    expect(d.posts.filter((p) => p.suggested && p.suggested !== "ghost")).toHaveLength(3);
    expect(d.rail.runPlan?.approved).toBe(true);
  });
  it("re-spaces untouched suggested posts when a line is re-measured", () => {
    const d = customFixture();
    d.posts = [];
    customAdapter.approve(d);
    expect(d.posts).toHaveLength(5);
    d.plan!.paths![0].segs[0].len = "200";
    expect(reconcileRunSuggestions(d, "custom")).toBe(true);
    expect(d.posts).toHaveLength(6);
  });
});
