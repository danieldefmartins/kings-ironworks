import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readOutbox, writeOutbox } from "@/lib/shop/punch-outbox";
import type { TimeShift, TimeBreak } from "@/lib/shop/shared";
const router = vi.hoisted(() => ({ refresh: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/shop" }));
import ShopShell from "./ShopShell";
vi.stubGlobal("React", React);
const shift = { id: "12345678-1234-4123-8123-123456789012", started_at: "2026-10-10T12:00:00Z", ended_at: null } as TimeShift;
const props = { children: <p>Today</p>, workerId: "worker", workerName: "Worker", lang: "en", shift: null as TimeShift | null, breaks: [] as TimeBreak[], hourlyRate: 25, weekHoursBeforeShift: 0, clockReady: true };
let active: TimeShift | null;
let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) }); active = null;
  fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    if (url === "/shop/api/clock") return new Response(JSON.stringify({ workerId: "worker", shift: active, breaks: [], hourlyRate: 25, weekHoursBeforeShift: 0 }));
    const body = JSON.parse(options!.body as string);
    active = body.type === "shift_start" ? shift : null;
    return new Response(JSON.stringify({ ok: true, shiftId: shift.id, at: new Date().toISOString() }));
  });
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
it("updates the displayed clock from a confirmed save without depending on a page refresh", async () => {
  render(<ShopShell {...props} />);
  await waitFor(() => expect(fetcher).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "Clock in" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Clock in" }).at(-1)!);
  await waitFor(() => expect(screen.getByRole("button", { name: "Clock out" })).toBeDefined());
  expect(readOutbox()).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Clock out" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Clock out" })).toBeNull());
  const requests = fetcher.mock.calls.filter(([url]) => url === "/shop/api/action");
  expect(JSON.parse(requests[1][1]!.body as string).shiftId).toBe(shift.id);
});
it("preserves an unauthorized punch and offers sign-in instead of losing it", async () => {
  writeOutbox([{ punchId: "p", workerId: "worker", type: "shift_start", clientAt: new Date().toISOString() }]);
  fetcher.mockImplementation(async () => new Response(JSON.stringify({ error: "Not signed in" }), { status: 401 }));
  render(<ShopShell {...props} />);
  await waitFor(() => expect(screen.getByRole("link", { name: /Sign in again/ })).toBeDefined());
  expect(readOutbox()).toHaveLength(1);
});
it("does not send another worker's pending punch", async () => {
  writeOutbox([{ punchId: "p", workerId: "someone-else", type: "shift_start", clientAt: new Date().toISOString() }]);
  render(<ShopShell {...props} />);
  await waitFor(() => expect(fetcher).toHaveBeenCalled());
  expect(fetcher.mock.calls.every(([url]) => url === "/shop/api/clock")).toBe(true);
  expect(readOutbox()).toHaveLength(1);
});
it("allows clock-out while on break", async () => {
  active = shift;
  fetcher.mockImplementation(async () => new Response(JSON.stringify({ workerId: "worker", shift, breaks: [{ id: "break", ended_at: null }], hourlyRate: 25, weekHoursBeforeShift: 0 })));
  render(<ShopShell {...props} shift={shift} breaks={[{ id: "break", ended_at: null } as TimeBreak]} />);
  fireEvent.click(screen.getByRole("button", { name: /break/i }));
  expect(screen.getByRole("button", { name: "Clock out" })).toBeDefined();
});
