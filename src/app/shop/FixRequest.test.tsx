import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { FixRequestSheet } from "./FixRequest";
vi.stubGlobal("React", React);
const fetcher = vi.fn();
vi.stubGlobal("fetch", fetcher);
afterEach(cleanup);
beforeEach(() => { fetcher.mockReset(); fetcher.mockResolvedValue(new Response(JSON.stringify({ ok: true, correctionId: "c1" }))); });

const day = (offset: number) => new Date(Date.now() - offset * 86400_000);
const iso = (d: Date, h: number, min = 0) => { const x = new Date(d); x.setHours(h, min, 0, 0); return x.toISOString(); };
const yesterday = day(1);
const shifts = [{ id: "y", startedAt: iso(yesterday, 7, 31), endedAt: null, status: "open" }];
const work = { start: "07:30", end: "17:00" };

it("three steps: the day → Esqueci a saída → the time → Enviar", async () => {
  render(<FixRequestSheet shifts={shifts} lang="pt" approver="Giulia" work={work} onClose={vi.fn()} />);
  expect(screen.getByText("Passo 1 de 3")).toBeTruthy();
  expect(screen.getAllByTestId("fix-day")).toHaveLength(7);
  fireEvent.click(screen.getByRole("button", { name: /^Ontem/ }));
  expect(screen.getByText("Passo 2 de 3")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Esqueci a saída" }));
  expect(screen.getByText("Passo 3 de 3")).toBeTruthy();
  expect((screen.getByLabelText("Saída") as HTMLInputElement).value).toBe("17:00");
  fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
  await screen.findByRole("dialog", { name: "Enviado para a Giulia aprovar" });
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body).toMatchObject({ type: "time_correction_request", shiftId: "y", startedAt: null, reason: "Esqueci a saída" });
  expect(new Date(body.endedAt).getHours()).toBe(17);
});

it("a day with no record: Esqueci a entrada asks both times and adds the day", async () => {
  render(<FixRequestSheet shifts={shifts} lang="pt" approver="Giulia" work={work} onClose={vi.fn()} />);
  fireEvent.click(screen.getAllByTestId("fix-day")[2]);
  expect((screen.getByRole("button", { name: "Esqueci a saída" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Esqueci a entrada" }));
  expect((screen.getByLabelText("Entrada") as HTMLInputElement).value).toBe("07:30");
  expect((screen.getByLabelText("Saída") as HTMLInputElement).value).toBe("17:00");
  fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalled());
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ type: "time_fix_new_day", reason: "Esqueci a entrada" });
});

it("a clock-out before the clock-in is caught before sending", () => {
  render(<FixRequestSheet shifts={shifts} lang="pt" approver="" work={work} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /^Ontem/ }));
  fireEvent.click(screen.getByRole("button", { name: "Esqueci a saída" }));
  fireEvent.change(screen.getByLabelText("Saída"), { target: { value: "06:00" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
  expect(screen.getByRole("alert").textContent).toBe("A saída precisa ser depois da entrada.");
  expect(fetcher).not.toHaveBeenCalled();
});
