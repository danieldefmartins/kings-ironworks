import { describe, expect, it } from "vitest";
import { keyboardInset, orderTokens } from "./FractionBar";

describe("FractionBar", () => {
  it("rides on top of the iPhone keyboard", () => {
    expect(keyboardInset(844, { height: 844, offsetTop: 0 })).toBe(0); // no keyboard
    expect(keyboardInset(844, { height: 508, offsetTop: 0 })).toBe(336); // keypad up
    expect(keyboardInset(844, { height: 508, offsetTop: 40 })).toBe(296); // page scrolled
    expect(keyboardInset(844, null)).toBe(0);
  });
  it("puts eighths first so 3/4 is in reach without scrolling", () => {
    const t = orderTokens(['1/16"', '1/8"', '3/16"', '1/4"', '3/4"', "°"]);
    expect(t.slice(0, 3)).toEqual(['1/8"', '1/4"', '3/4"']);
    expect(t).toContain('1/16"');
    expect(orderTokens(["'", '"', '1/8"'])).toEqual(["'", '"', '1/8"']);
  });
});
