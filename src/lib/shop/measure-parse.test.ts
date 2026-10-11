import { describe, expect, it } from "vitest";
import { formatMeas, showMeas } from "./measure-parse";

describe("shop notation display", () => {
  it("never echoes a typed decimal", () => {
    expect(showMeas("36.125")).toBe('36 1/8"');
    expect(showMeas("35 7/8")).toBe('35 7/8"');
    expect(showMeas('47.75"')).toBe('47 3/4"');
    expect(showMeas("3' 4.5")).toBe('40 1/2"');
  });
  it("uses feet and inches on a feet+inches sheet", () => {
    expect(showMeas("40.5", "ftin")).toBe(`3' 4 1/2"`);
    expect(showMeas("11.9375", "ftin")).toBe('11 15/16"');
    expect(formatMeas(36, "ftin")).toBe(`3' 0"`);
    expect(formatMeas(11.99, "ftin")).toBe(`1' 0"`);
  });
  it("passes through what is not a length", () => {
    expect(showMeas("")).toBe("");
    expect(showMeas("  ")).toBe("");
    expect(showMeas("32°")).toBe("32°");
    expect(showMeas("approx 3 ft wide")).toBe("approx 3 ft wide");
    expect(showMeas(undefined)).toBe("");
  });
});
