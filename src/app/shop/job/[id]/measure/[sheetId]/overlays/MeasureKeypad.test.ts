import { describe, expect, it } from "vitest";
import { padBackspace, padType } from "./MeasureKeypad";

const keys = (seq: string[], inch = true) => seq.reduce((v, k) => padType(v, k, inch), "");

describe("measuring keypad", () => {
  it("writes a tape reading the way the shop reads it", () => {
    expect(keys(["7", "1/2"])).toBe('7 1/2"');
    expect(keys(["1", "0", "3/16"])).toBe('10 3/16"');
    expect(keys(["3", "'", "6", "1/2"])).toBe(`3' 6 1/2"`);
    expect(keys(["3/4"])).toBe('3/4"');
  });
  it("a second fraction corrects the first instead of stacking", () => {
    expect(keys(["7", "1/2", "1/4"])).toBe('7 1/4"');
  });
  it("ignores keys that would make a number nobody can read", () => {
    expect(keys(["7", "1/2", "3"])).toBe('7 1/2"');
    expect(keys(["'"])).toBe("");
    expect(keys(["3", "'", "'"])).toBe("3' ");
    expect(keys(["3", ".", "."])).toBe("3.");
    expect(keys(["."])).toBe("");
  });
  it("types decimals and angles without an inch mark", () => {
    expect(keys(["3", "4", ".", "5"], false)).toBe("34.5");
  });
  it("backspace removes a fraction in one tap, then a character at a time", () => {
    expect(padBackspace('7 1/2"')).toBe("7");
    expect(padBackspace("72")).toBe("7");
    expect(padBackspace("3' 6")).toBe("3'");
    expect(padBackspace("")).toBe("");
  });
});
