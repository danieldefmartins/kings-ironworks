import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readOutbox } from "@/lib/shop/punch-outbox";
import type { TimeShift, TimeBreak } from "@/lib/shop/shared";
const router = vi.hoisted(() => ({ refresh: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/shop" }));
import ShopShell from "./ShopShell";
vi.stubGlobal("React", React);

// Owner rule 10/11: no location, no clock-in. Clock-out is never blocked.
const shift = { id: "12345678-1234-4123-8123-123456789012", started_at: "2026-10-10T12:00:00Z", ended_at: null } as TimeShift;
const props = { children: <p>Today</p>, workerId: "worker", workerName: "Worker", lang: "en", shift: null as TimeShift | null, breaks: [] as TimeBreak[], hourlyRate: 25, weekHoursBeforeShift: 0, weekEarningsBeforeShift: 0, clockReady: true };
let fetcher: ReturnType<typeof vi.fn>;
const allBodies = () => fetcher.mock.calls.filter(([url]) => url === "/shop/api/action").map(([, o]) => JSON.parse(o.body));
const actionBodies = () => allBodies().filter((b) => b.type !== "clock_in_blocked");
const blockedReports = () => allBodies().filter((b) => b.type === "clock_in_blocked");
const geo = (impl: (ok: PositionCallback, err: PositionErrorCallback) => void) =>
  vi.stubGlobal("navigator", { ...navigator, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", geolocation: { getCurrentPosition: impl } });

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
  let active: TimeShift | null = null;
  fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    if (url === "/shop/api/clock") return new Response(JSON.stringify({ workerId: "worker", shift: active, breaks: [], hourlyRate: 25, weekHoursBeforeShift: 0, weekEarningsBeforeShift: 0 }));
    const body = JSON.parse(options!.body as string);
    if (body.type === "shift_start") active = shift; else if (body.type === "shift_stop") active = null;
    return new Response(JSON.stringify({ ok: true, shiftId: shift.id, at: body.clientAt }));
  });
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

async function tapClockIn() {
  render(<ShopShell {...props} />);
  await waitFor(() => expect(fetcher).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "Clock in" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Clock in" }).at(-1)!);
}

it("permission denied: no punch is sent and the worker is told how to allow it", async () => {
  geo((_ok, err) => err({ code: 1, message: "denied" } as GeolocationPositionError));
  await tapClockIn();
  await waitFor(() => expect(screen.getByText("Not clocked in — location is required")).toBeDefined());
  expect(screen.getByText(/The office has been notified/)).toBeDefined();
  await waitFor(() => expect(blockedReports()).toMatchObject([{ reason: "denied" }]));
  expect(screen.getByText(/Safari Websites/)).toBeDefined(); // iPhone steps only
  expect(screen.queryByText(/When Chrome asks/)).toBeNull(); // no Android steps on an iPhone
  expect(actionBodies()).toEqual([]);
  expect(readOutbox()).toEqual([]);
});

it("no fix (timeout): no punch is sent", async () => {
  geo((_ok, err) => err({ code: 3, message: "timeout" } as GeolocationPositionError));
  await tapClockIn();
  await waitFor(() => expect(screen.getByText("Not clocked in — location is required")).toBeDefined());
  await waitFor(() => expect(blockedReports()).toMatchObject([{ reason: "timeout" }]));
  expect(actionBodies()).toEqual([]);
});

it("with a fix: the punch carries the ORIGINAL tap time and the location", async () => {
  let answeredAt = 0;
  geo((ok) => { setTimeout(() => { answeredAt = Date.now(); ok({ coords: { latitude: 42.4077, longitude: -71.0672, accuracy: 12 } } as GeolocationPosition); }, 60); });
  const before = Date.now();
  await tapClockIn();
  await waitFor(() => expect(actionBodies().length).toBe(1));
  const body = actionBodies()[0];
  expect(body).toMatchObject({ type: "shift_start", lat: 42.4077, lng: -71.0672, accuracy: 12 });
  expect(Date.parse(body.clientAt)).toBeGreaterThanOrEqual(before - 5);
  expect(Date.parse(body.clientAt)).toBeLessThan(answeredAt);
});

it("clock-out is never blocked by location", async () => {
  geo((_ok, err) => err({ code: 1, message: "denied" } as GeolocationPositionError));
  render(<ShopShell {...props} shift={shift} />);
  fireEvent.click(screen.getByRole("button", { name: /Working/ }));
  fireEvent.click(screen.getByRole("button", { name: "Clock out" }));
  await waitFor(() => expect(actionBodies().some((b) => b.type === "shift_stop")).toBe(true));
  // Saved; then the phone explains how to turn location on for next time.
  await waitFor(() => expect(screen.getByText("Clock-out saved — no location")).toBeDefined());
});

it("a blocked-clock-in report that cannot reach the server is kept and sent on the next open", async () => {
  geo((_ok, err) => err({ code: 1, message: "denied" } as GeolocationPositionError));
  const base = fetcher.getMockImplementation()!;
  let offline = true;
  fetcher.mockImplementation(async (url: string, options?: RequestInit) => {
    if (offline && url === "/shop/api/action" && JSON.parse(options!.body as string).type === "clock_in_blocked") throw new TypeError("offline");
    return base(url, options);
  });
  await tapClockIn();
  await waitFor(() => expect(screen.getByText("Not clocked in — location is required")).toBeDefined());
  expect(JSON.parse(localStorage.getItem("kiw-clockin-blocked") || "[]")).toMatchObject([{ reason: "denied", workerId: "worker" }]);
  cleanup();
  offline = false;
  render(<ShopShell {...props} />);
  await waitFor(() => expect(JSON.parse(localStorage.getItem("kiw-clockin-blocked") || "[]")).toEqual([]));
  expect(actionBodies()).toEqual([]); // never a punch
});

it("shows the rule before anyone taps Clock in", async () => {
  geo((ok) => ok({ coords: { latitude: 1, longitude: 1, accuracy: 5 } } as GeolocationPosition));
  render(<ShopShell {...props} lang="pt" />);
  fireEvent.click(screen.getAllByRole("button").find((b) => /Bater|Entrada|Registrar|ponto/i.test(b.textContent || "")) ?? screen.getAllByRole("button")[0]);
  await waitFor(() => expect(screen.getAllByText(/A localização é obrigatória para bater o ponto/).length).toBeGreaterThan(0));
});
