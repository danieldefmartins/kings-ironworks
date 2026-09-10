import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ usePathname: () => "/shop/jobs" }));
import MenuDirectory from "./MenuDirectory";
import AdminMenu from "./AdminMenu";
vi.stubGlobal("React", React);
afterEach(cleanup);

describe("shop menus", () => {
  it("keeps financial destinations out of the crew menu", () => {
    render(<MenuDirectory scope="crew" lang="en" />);
    expect(screen.getByRole("link", { name: /My timesheet/ }).getAttribute("href")).toBe("/shop/time");
    expect(screen.getByRole("link", { name: /New Field Measurement/ })).toBeTruthy();
    expect(screen.getAllByRole("link").every(link => !link.getAttribute("href")?.startsWith("/shop/admin"))).toBe(true);
    expect(screen.getByRole("link", { name: /^Jobs/ }).getAttribute("aria-current")).toBe("page");
  });
  it("finds localized tools without requiring accents and clears an empty search", () => {
    render(<MenuDirectory scope="crew" lang="pt" />);
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "medicao" } });
    expect(screen.getByRole("link", { name: /Nova Medição/ })).toBeTruthy();
    fireEvent.change(search, { target: { value: "unavailable tool" } });
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
    expect(screen.getAllByRole("link")).toHaveLength(8);
  });
  it("groups owner tools and distinguishes project time from payroll", () => {
    render(<MenuDirectory scope="admin" lang="en" />);
    expect(screen.getByRole("region", { name: "People & payroll" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Project time history/ }).getAttribute("href")).toBe("/shop/admin/labor#sessions");
    expect(screen.getByRole("link", { name: /Review and restore archived jobs/ }).getAttribute("href")).toBe("/shop/admin/labor#archived");
  });
  it("opens an accessible admin dialog and closes after choosing a destination", () => {
    render(<AdminMenu lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Admin" }));
    expect(screen.getByRole("dialog", { name: "Admin" })).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: /^Payroll/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
