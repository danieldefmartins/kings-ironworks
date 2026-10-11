import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { newMeasureData } from "@/lib/shop/measure";
import OpeningElevation from "./OpeningElevation";
import { MeasUnits } from "../MeasUnits";

afterEach(cleanup);

describe("opening elevation", () => {
  it("draws every typed dimension in shop notation, never the raw decimal", () => {
    const data = newMeasureData("opening", 1);
    const o = data.opening!;
    Object.assign(o.units[0], { wTop: "36.125", wMid: "35 7/8", hLeft: "47.75", diagA: '59.875"' });
    const { container } = render(<OpeningElevation opening={o} unit={o.units[0]} lang="en" />);
    const text = container.textContent || "";
    expect(text).toContain('36 1/8"');
    expect(text).toContain('35 7/8"');
    expect(text).toContain('47 3/4"');
    expect(text).toContain('59 7/8"');
    expect(text).not.toMatch(/\d\.\d/);
  });
  it("follows a feet+inches sheet", () => {
    const data = newMeasureData("opening", 1);
    const o = data.opening!;
    o.units[0].wTop = "36.125";
    const { container } = render(<MeasUnits.Provider value="ftin"><OpeningElevation opening={o} unit={o.units[0]} lang="en" /></MeasUnits.Provider>);
    expect(container.textContent).toContain(`3' 1/8"`);
  });
});
