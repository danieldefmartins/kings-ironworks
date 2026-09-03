import { describe, expect, it } from "vitest";
import {
  blankCurve,
  insertSegment,
  newPost,
  newPresetMeasureData,
  removeSegment,
  type MeasureData,
} from "./measure";

// A three-flight stair: Flight 1, Landing 1, Flight 2, Landing 2, Flight 3.
function stair(): MeasureData {
  const { data } = newPresetMeasureData("multi_flight", 3, 3);
  return data;
}
const kinds = (d: MeasureData) => d.segments.map((s) => s.kind);

describe("insertSegment", () => {
  it("puts the piece where the stair actually turns, not on top of it", () => {
    const d = stair();
    insertSegment(d, 1, blankCurve());
    expect(kinds(d)).toEqual(["flight", "curve", "platform", "flight", "platform", "flight"]);
  });

  it("carries the posts on the pieces above it along", () => {
    const d = stair();
    d.posts.push(newPost(0, 1)); // on flight 1, below the insert
    d.posts.push(newPost(2, 0)); // on flight 2, above it
    insertSegment(d, 1, blankCurve());
    expect(d.posts.map((p) => p.segIdx)).toEqual([0, 3]);
  });

  it("leaves plan posts alone — their segIdx means nothing", () => {
    const d = stair();
    const plan = { ...newPost(0, null), pathId: "p1" };
    d.posts.push(plan);
    insertSegment(d, 0, blankCurve());
    expect(d.posts[0].segIdx).toBe(0);
  });

  it("keeps measured joints attached to the boundary they describe", () => {
    const d = stair();
    d.joints[0].gap = "1/4";   // Flight 1 → Landing 1
    d.joints[3].gap = "1/2";   // Landing 2 → Flight 3
    insertSegment(d, 3, blankCurve()); // between Flight 2 and Landing 2
    expect(d.joints.length).toBe(5);
    expect(d.joints[0].gap).toBe("1/4");
    // the top joint moved up one boundary with the pieces it joins
    expect(d.joints[4].gap).toBe("1/2");
    expect(d.joints.map((j) => j.afterSegment)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("removeSegment", () => {
  it("takes the piece and everything measured on it", () => {
    const d = stair();
    d.posts.push(newPost(1, null)); // on Landing 1
    d.posts.push(newPost(2, 0));    // on Flight 2
    removeSegment(d, 1);
    expect(kinds(d)).toEqual(["flight", "flight", "platform", "flight"]);
    expect(d.posts.map((p) => p.segIdx)).toEqual([1]);
    expect(d.joints.length).toBe(3);
  });

  it("refuses to empty the stair", () => {
    const d = stair();
    d.segments = [d.segments[0]];
    removeSegment(d, 0);
    expect(d.segments.length).toBe(1);
  });
});
