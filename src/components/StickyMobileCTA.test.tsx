import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import StickyMobileCTA from "./StickyMobileCTA";
vi.mock("@/hooks/useLocalPhone", () => ({ useLocalPhone: () => ({ tel: "16174042589" }) }));
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it("keeps contact actions at the visible bottom as Safari toolbars and keyboard change the viewport", () => {
  vi.useFakeTimers();
  const viewport = Object.assign(new EventTarget(), { height: 760, offsetTop: 0, scale: 1 });
  vi.stubGlobal("visualViewport", viewport);
  const { container, unmount } = render(<StickyMobileCTA />);
  const layer = container.querySelector(".mobile-contact-viewport") as HTMLElement;
  expect(layer.style.height).toBe("760px");
  // Toolbar collapse expands the visible page; keyboard focus then reduces it.
  for (const [height, offsetTop] of [[844, 0], [420, 24], [760, 0]]) {
    act(() => { Object.assign(viewport, { height, offsetTop }); viewport.dispatchEvent(new Event("resize")); viewport.dispatchEvent(new Event("scroll")); vi.advanceTimersByTime(20); });
    expect(Number.parseFloat(layer.style.top) + Number.parseFloat(layer.style.height)).toBe(height + offsetTop);
  }
  expect(screen.getByRole("link", { name: "Get a Free Quote" }).getAttribute("href")).toBe("/contact");
  expect(screen.getByRole("link", { name: "Call Now" }).getAttribute("href")).toBe("tel:16174042589");
  act(() => { viewport.scale = 2; viewport.dispatchEvent(new Event("resize")); vi.advanceTimersByTime(20); });
  expect(layer.style.height).toBe(""); expect(layer.style.top).toBe("");
  act(() => { viewport.scale = 1; viewport.dispatchEvent(new Event("resize")); });
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it("keeps CSS fallback and both actions available without VisualViewport", () => {
  vi.stubGlobal("visualViewport", undefined);
  const { container } = render(<StickyMobileCTA />);
  expect(container.querySelector(".mobile-contact-viewport")?.getAttribute("style")).toBeNull();
  expect(screen.getByRole("link", { name: "Get a Free Quote" })).toBeTruthy();
});
