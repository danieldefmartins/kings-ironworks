import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ShopAppearance, { useShopAppearance } from "./ShopAppearance";
vi.stubGlobal("React", React);
function Fixture() { const theme = useShopAppearance(); return <><output>{theme}</output><ShopAppearance lang="en" /></>; }
beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("defaults to Light and synchronizes a saved choice across mounted surfaces and reopening", () => {
  const { unmount } = render(<Fixture />);
  expect(screen.getByRole("status").textContent).toBe("light");
  fireEvent.click(screen.getByRole("button", { name: "Dark" }));
  expect(screen.getByRole("status").textContent).toBe("dark");
  expect(localStorage.getItem("kiw-shop-appearance")).toBe("dark");
  unmount(); render(<Fixture />);
  expect(screen.getByRole("button", { name: "Dark" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Light" }));
  expect(screen.getByRole("status").textContent).toBe("light");
});
it("keeps the choice usable when device storage is blocked", () => {
  vi.stubGlobal("localStorage", { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); } });
  render(<Fixture />);
  fireEvent.click(screen.getByRole("button", { name: "Dark" }));
  expect(screen.getByRole("status").textContent).toBe("dark");
  fireEvent.click(screen.getByRole("button", { name: "Light" }));
});
