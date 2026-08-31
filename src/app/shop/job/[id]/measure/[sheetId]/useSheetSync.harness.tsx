// Test harness for useSheetSync.
//
// The hook is driven directly rather than through MeasureEditor: what these
// tests are about is the save path — ordering, durability, recovery — and
// mounting three thousand lines of form to reach it would only add ways for a
// test to fail for reasons that have nothing to do with saving.

import { useEffect } from "react";
import { act, render } from "@testing-library/react";
import { vi } from "vitest";
import { useSheetSync } from "./useSheetSync";
import { newMeasureData, type MeasureData, type MeasureSheet } from "@/lib/shop/measure";

export const JOB_ID = "job-1";
export const SHEET_ID = "sheet-1";

export function testSheet(over: Partial<MeasureSheet> = {}): MeasureSheet {
  return {
    id: SHEET_ID,
    job_id: JOB_ID,
    name: "Front stairs",
    shape: "straight",
    status: "in_progress",
    data: newMeasureData("straight", 4),
    review_comment: null,
    submitted_by: null,
    submitted_at: null,
    approved_by: null,
    approved_at: null,
    current_rev: 0,
    created_by: "w1",
    updated_by: "w1",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...over,
  };
}

export type Sync = ReturnType<typeof useSheetSync>;

// ---- the request log -------------------------------------------------------

export interface Sent {
  type: string;
  body: Record<string, unknown>;
  keepalive: boolean;
}

/** What a stubbed request should do. -1 holds it open for the test to resolve. */
export type Reply = { status: number; body?: Record<string, unknown> };

export interface Net {
  sent: Sent[];
  /** Requests the test is holding open, in the order they were made. */
  release: ((body?: Record<string, unknown>) => void)[];
  reply: (body: Record<string, unknown>) => Reply;
  /** Names of the requests that actually left, in order. */
  types: () => string[];
}

export function ok(body: Record<string, unknown> = {}): Reply {
  return { status: 200, body: { ok: true, updated_at: "2026-08-02T00:00:00.000Z", ...body } };
}
export const NETWORK_DOWN: Reply = { status: 0 };
export const HOLD_OPEN: Reply = { status: -1 };

export function installFetch(): Net {
  const net: Net = {
    sent: [],
    release: [],
    reply: () => ok(),
    types: () => net.sent.map((s) => s.type),
  };
  vi.stubGlobal("fetch", (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    net.sent.push({ type: String(body.type), body, keepalive: !!init.keepalive });
    const r = net.reply(body);
    if (r.status === -1) {
      return new Promise<Response>((resolve) => {
        net.release.push((over = {}) =>
          resolve({
            ok: true,
            status: 200,
            json: async () => ({ ...ok().body, ...over }),
          } as Response)
        );
      });
    }
    if (r.status === 0) return Promise.reject(new Error("network"));
    return Promise.resolve({
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.body ?? {},
    } as Response);
  });
  return net;
}

// ---- mounting --------------------------------------------------------------

export interface Mounted {
  sync: Sync;
  /** Statuses the hook reported back to the editor, in order. */
  statuses: string[];
  /** How many times an edit reopened a submitted/approved sheet. */
  reopened: number;
  unmount: () => void;
  /**
   * Wait for the serialized queue to drain. This is the deterministic barrier
   * the suite is built on: enqueue() chains onto the same promise the saves
   * use, so when this resolves every save queued before it has finished — no
   * clock advancing, no arbitrary sleeps.
   */
  drain: () => Promise<void>;
}

export function mount(over: Partial<MeasureSheet> = {}, status = "in_progress"): Mounted {
  const m = {
    sync: null as unknown as Sync,
    statuses: [] as string[],
    reopened: 0,
    unmount: () => {},
    drain: async () => {},
  } satisfies Mounted;

  function Probe() {
    const sync = useSheetSync({
      sheet: testSheet(over),
      jobId: JOB_ID,
      status,
      onServerStatus: (s) => m.statuses.push(s),
      onReopened: () => {
        m.reopened += 1;
      },
    });
    m.sync = sync;
    useEffect(() => {
      m.sync = sync;
    });
    return null;
  }

  const r = render(<Probe />);
  m.unmount = r.unmount;
  m.drain = async () => {
    await act(async () => {
      await m.sync.enqueue(async () => {});
    });
  };
  return m;
}

/** Type a rise into the first step — the smallest real edit a measurer makes. */
export function typeRise(sync: Sync, value: string) {
  sync.set((d: MeasureData) => {
    const seg = d.segments[0];
    if (seg.kind === "flight") seg.steps[0].rise = value;
  });
}

export function riseOf(d: MeasureData): string {
  const seg = d.segments[0];
  return seg.kind === "flight" ? seg.steps[0].rise : "";
}

export function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
}
