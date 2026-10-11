import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { newMeasureData, type MeasureData } from "@/lib/shop/measure";
import { applyKind, blankCanopy } from "@/lib/shop/measure-canopy";
import CanopySections from "./CanopySections";
import CanopySketch from "./CanopySketch";
import CanopyPrint from "./CanopyPrint";

afterEach(cleanup);

function harness(initial: MeasureData) {
  let data = initial;
  const set = (fn: (d: MeasureData) => void) => {
    const next = structuredClone(data);
    fn(next);
    data = next;
    view.rerender(<CanopySections lang="en" data={data} set={set} />);
  };
  const view = render(<CanopySections lang="en" data={data} set={set} />);
  return { get: () => data };
}

it("an empty canopy sheet asks one question, then opens the sheet for that kind", () => {
  const h = harness(newMeasureData("canopy", 0));
  expect(screen.getByText("What are we covering?")).toBeTruthy();
  fireEvent.click(screen.getByText("Door hood"));
  expect(h.get().canopy?.kind).toBe("door_hood");
  expect(h.get().canopy?.support).toBe("brackets");
  expect(screen.getByText("Wall it mounts to")).toBeTruthy();
  expect(screen.getByText("Door under it")).toBeTruthy();
});

it("adds posts and records each height", () => {
  const d = newMeasureData("canopy", 0);
  d.canopy = blankCanopy();
  applyKind(d.canopy, "carport");
  const h = harness(d);
  expect(h.get().canopy?.posts).toHaveLength(2);
  fireEvent.click(screen.getByText(/Add post/));
  expect(h.get().canopy?.posts).toHaveLength(3);
});

it("draws water running into the house in red, in both views and in print", () => {
  const c = blankCanopy();
  applyKind(c, "entry");
  Object.assign(c, { width: "72", projection: "48", mount: "92", fall: "2", drain: "toward", soffitL: "110", soffitR: "110", roof: "glass" });
  const side = render(<CanopySketch c={c} lang="en" view="side" />);
  expect(side.container.querySelector('text[fill="#dc2626"]')?.textContent).toContain('/ft');
  side.unmount();
  render(<CanopySketch c={c} lang="en" view="front" />);
  expect(screen.getByRole("img", { name: "Front" })).toBeTruthy();
  cleanup();
  render(<CanopyPrint c={c} lang="en" />);
  expect(screen.getByText("Pitched toward the wall — water into the house")).toBeTruthy();
  expect(screen.getByText(/Snow load \(New England\)/)).toBeTruthy();
});
