import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("next/link", () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));
import ClockHome from "./ClockHome";
import { ClockContext, type ClockApi } from "./ClockContext";
vi.stubGlobal("React", React);
afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });

const api = (over: Partial<ClockApi> = {}): ClockApi => ({
  shift: null, breaks: [], onBreak: false, hours: 0, todayHours: 0, weekHours: 0, ready: true, busy: false, needsLogin: false,
  pendingType: null, unconfirmed: false, error: "",
  clockIn: vi.fn(), clockOut: vi.fn(), breakStart: vi.fn(), breakEnd: vi.fn(), openDetails: vi.fn(), ...over,
});
const shift = { id: "s", worker_id: "w", started_at: new Date(Date.now() - 3.2 * 3600_000).toISOString(), ended_at: null, status: "open" } as ClockApi["shift"];
const show = (value: ClockApi) => render(<ClockContext.Provider value={value}><ClockHome lang="pt" /></ClockContext.Provider>);

it("not working: one green Marcar entrada, the plain status, today and week", () => {
  const v = api({ todayHours: 0, weekHours: 31 + 5 / 60 });
  show(v);
  expect(screen.getByTestId("clock-status").textContent).toBe("Você não está trabalhando");
  const main = screen.getByRole("button", { name: "Marcar entrada" });
  expect(main.getAttribute("style")).toContain("rgb(22, 163, 74)");
  expect(screen.getByTestId("clock-week").textContent).toBe("31h05");
  fireEvent.click(main);
  expect(v.clockIn).toHaveBeenCalledOnce();
  expect(screen.queryByRole("button", { name: "Começar intervalo" })).toBeNull();
});

it("working: red Marcar saída with the running time; a break is one tap", () => {
  const v = api({ shift, hours: 3.2, todayHours: 3.2, weekHours: 20 });
  show(v);
  expect(screen.getByTestId("clock-status").textContent).toMatch(/^Você está trabalhando desde /);
  const main = screen.getByRole("button", { name: /Marcar saída/ });
  expect(main.getAttribute("style")).toContain("rgb(220, 38, 38)");
  expect(screen.getByTestId("clock-running").textContent).toBe("Trabalhando há 3h12");
  fireEvent.click(screen.getByRole("button", { name: "Começar intervalo" }));
  expect(v.breakStart).toHaveBeenCalledOnce();
  fireEvent.click(main);
  expect(v.clockOut).toHaveBeenCalledOnce();
});

it("on a break: Voltar do intervalo is the big button, Marcar saída stays", () => {
  const v = api({ shift, onBreak: true, breaks: [{ id: "b", shift_id: "s", started_at: new Date().toISOString(), ended_at: null, paid: false }] });
  show(v);
  fireEvent.click(screen.getByRole("button", { name: /Voltar do intervalo/ }));
  expect(v.breakEnd).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: /Marcar saída/ })).toBeTruthy();
});

it("the reminder link (?saida=1) lands on the Marcar saída button", async () => {
  window.history.replaceState(null, "", "/shop?saida=1");
  Element.prototype.scrollIntoView = vi.fn();
  show(api({ shift, hours: 9 }));
  const main = screen.getByRole("button", { name: /Marcar saída/ });
  await vi.waitFor(() => expect(document.activeElement).toBe(main));
  expect(main.className).toContain("ring-amber-300");
});

it("details opens the full clock sheet", () => {
  const v = api();
  show(v);
  fireEvent.click(screen.getByRole("button", { name: /Detalhes/ }));
  expect(v.openDetails).toHaveBeenCalledOnce();
});
