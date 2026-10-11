import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readOutbox } from "@/lib/shop/punch-outbox";
import type { TimeShift, TimeBreak } from "@/lib/shop/shared";
const router = vi.hoisted(() => ({ refresh: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/shop" }));
import ShopShell from "./ShopShell";
vi.stubGlobal("React", React);

// A tap is never dropped (André, Sat 10/10: clock-out tapped while a
// background sync was running never reached the server).
const shift = { id: "12345678-1234-4123-8123-123456789012", started_at: "2026-10-10T12:00:00Z", ended_at: null } as TimeShift;
const props = { children: <p>Today</p>, workerId: "worker", workerName: "Worker", lang: "en", shift, breaks: [] as TimeBreak[], hourlyRate: 25, weekHoursBeforeShift: 0, weekEarningsBeforeShift: 0, clockReady: true };
let active: TimeShift | null;
let fetcher: ReturnType<typeof vi.fn>;
const clockResponse = () => new Response(JSON.stringify({ workerId: "worker", shift: active, breaks: [], hourlyRate: 25, weekHoursBeforeShift: 0, weekEarningsBeforeShift: 0 }));
const actionResponse = (options?: RequestInit) => {
  const body = JSON.parse(options!.body as string);
  active = body.type === "shift_start" ? shift : null;
  return new Response(JSON.stringify({ ok: true, shiftId: shift.id, at: new Date().toISOString() }));
};
const actionCalls = () => fetcher.mock.calls.filter(([url]) => url === "/shop/api/action");
beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
  active = shift;
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("never drops a clock-out tapped while a background sync is still running", async () => {
  let releaseClock: () => void = () => {};
  const gate = new Promise<void>((resolve) => { releaseClock = resolve; });
  fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    if (url === "/shop/api/clock") { await gate; return clockResponse(); } // weak signal: the open-sync hangs
    return actionResponse(options);
  });
  vi.stubGlobal("fetch", fetcher);
  render(<ShopShell {...props} />);
  await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/shop/api/clock", expect.anything()));
  fireEvent.click(screen.getByRole("button", { name: /Working/ }));
  fireEvent.click(screen.getByRole("button", { name: "Clock out" }));
  // Saved on the phone at once and shown as sending — not a dead tap.
  expect(readOutbox()).toMatchObject([{ type: "shift_stop", shiftId: shift.id }]);
  await waitFor(() => expect(screen.getAllByRole("button", { name: /Sending/ }).length).toBeGreaterThan(0));
  fireEvent.click(screen.getAllByRole("button", { name: /Sending/ }).at(-1)!); // impatient second tap
  expect(readOutbox()).toHaveLength(1);
  releaseClock();
  await waitFor(() => expect(actionCalls().some(([, o]) => JSON.parse(o.body).type === "shift_stop")).toBe(true));
  await waitFor(() => expect(readOutbox()).toHaveLength(0));
  expect(actionCalls()).toHaveLength(1);
});

it("lets a worker queue a clock-out before the clock status has loaded", async () => {
  fetcher = vi.fn(async (url: string, options?: RequestInit) => (url === "/shop/api/clock" ? clockResponse() : actionResponse(options)));
  vi.stubGlobal("fetch", fetcher);
  render(<ShopShell {...props} clockReady={false} />);
  fireEvent.click(screen.getByRole("button", { name: /Working/ }));
  const button = screen.getByRole("button", { name: "Clock out" }) as HTMLButtonElement;
  expect(button.disabled).toBe(false);
  fireEvent.click(button);
  expect(readOutbox()).toMatchObject([{ type: "shift_stop" }]);
  await waitFor(() => expect(readOutbox()).toHaveLength(0));
});

it("says 'not confirmed yet' when the server has not confirmed within 5 seconds", async () => {
  fetcher = vi.fn(async (url: string) => (url === "/shop/api/clock" ? clockResponse() : new Promise<Response>(() => {})));
  vi.stubGlobal("fetch", fetcher);
  render(<ShopShell {...props} />);
  await waitFor(() => expect(fetcher).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: /Working/ }));
  fireEvent.click(screen.getByRole("button", { name: "Clock out" }));
  await waitFor(() => expect(screen.getByText("Not confirmed yet — keep the app open")).toBeDefined(), { timeout: 7000 });
  // Still on the clock: nothing looks clocked out before the server says so.
  expect(readOutbox()).toHaveLength(1);
  expect(screen.getAllByRole("button", { name: /Sending/ }).length).toBeGreaterThan(0);
}, 10000);
