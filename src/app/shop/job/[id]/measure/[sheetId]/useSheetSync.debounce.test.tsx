// The parts of the save path that ARE the clock: the 900ms autosave debounce,
// the 300ms kick after recovering a queued edit, and the 20s backstop that
// retries when neither an online nor a visibility event ever arrives.
//
// Fake timers are confined to this file, and to setTimeout/setInterval only.
// Two reasons. Faking the whole clock globally would hide the event-loop
// ordering the sibling suite exists to protect; and fake-indexeddb schedules
// its own work, so faking everything underneath it simply deadlocks — which is
// exactly how this suite first failed.
//
// Each test advances to an exact boundary rather than waiting, so "nothing has
// happened yet" is as testable as "it happened".

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "@testing-library/react";
import { allEdits, clearAllEdits, queueEdit } from "@/lib/shop/outbox";
import {
  NETWORK_DOWN,
  JOB_ID,
  SHEET_ID,
  installFetch,
  mount,
  riseOf,
  setOnline,
  testSheet,
  typeRise,
  type Net,
} from "./useSheetSync.harness";

const DEBOUNCE_MS = 900;

let net: Net;

beforeEach(async () => {
  net = installFetch();
  setOnline(true);
  // The outbox is prepared under the real clock; only then is time frozen.
  await clearAllEdits();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Advance the clock and let the promise chain the timer started settle. */
async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useSheetSync — the debounce", () => {
  it("sends nothing before the boundary", async () => {
    const m = mount();
    await act(async () => {
      typeRise(m.sync, '7"');
    });

    await tick(DEBOUNCE_MS - 1);
    expect(net.sent).toHaveLength(0);
    expect(m.sync.saveState).toBe("dirty");
  });

  it("sends exactly one save at the boundary", async () => {
    const m = mount();
    await act(async () => {
      typeRise(m.sync, '7"');
    });

    await tick(DEBOUNCE_MS);
    expect(net.types()).toEqual(["update"]);

    // And no second one arrives later on its own.
    await tick(DEBOUNCE_MS * 5);
    expect(net.types()).toEqual(["update"]);
  });

  it("restarts on every keystroke: rapid edits produce one save, carrying the last value", async () => {
    const m = mount();

    for (const rise of ['7"', '7 1/8"', '7 1/4"', '7 3/8"']) {
      await act(async () => {
        typeRise(m.sync, rise);
      });
      // Each edit lands well inside the window, so the previous timer is cancelled.
      await tick(DEBOUNCE_MS - 100);
      expect(net.sent).toHaveLength(0);
    }

    await tick(DEBOUNCE_MS);
    expect(net.types()).toEqual(["update"]);
    expect(riseOf(net.sent[0].body.data as never)).toBe('7 3/8"');
  });

  it("cancels the pending timer on unmount — the flush sends, the timer does not", async () => {
    const m = mount();
    await act(async () => {
      typeRise(m.sync, '7 1/2"');
    });
    await tick(DEBOUNCE_MS / 2);
    expect(net.sent).toHaveLength(0);

    await act(async () => {
      m.unmount();
    });
    // Exactly one request: the last-chance flush, not the debounce as well.
    expect(net.sent).toHaveLength(1);
    expect(net.sent[0].keepalive).toBe(true);

    await tick(DEBOUNCE_MS * 5);
    expect(net.sent).toHaveLength(1);
  });
});

describe("useSheetSync — the retry timers", () => {
  it("recovering a queued edit retries it shortly after, without being asked", async () => {
    // A previous session left an edit on the device that never reached the server.
    vi.useRealTimers();
    const stranded = testSheet().data;
    const seg = stranded.segments[0];
    if (seg.kind === "flight") seg.steps[0].rise = '6 3/4"';
    await queueEdit({
      sheetId: SHEET_ID,
      jobId: JOB_ID,
      data: stranded,
      baseUpdatedAt: "2026-08-01T00:00:00.000Z",
      queuedAt: Date.now(),
    });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });

    const m = mount();
    await act(async () => {});
    expect(m.sync.restored).toBe(true);
    expect(riseOf(m.sync.data)).toBe('6 3/4"');
    expect(net.sent).toHaveLength(0); // not yet — the kick is on a timer

    await tick(400);
    expect(net.types()).toEqual(["update"]);
    expect(await allEdits()).toHaveLength(0);
  });

  it("the 20s backstop retries a stuck edit when no online or visibility event ever fires", async () => {
    net.reply = () => NETWORK_DOWN;
    const m = mount();
    await act(async () => {
      typeRise(m.sync, '7"');
    });
    await tick(DEBOUNCE_MS);
    expect(net.types()).toEqual(["update"]); // failed; still dirty
    expect(m.sync.saveState).toBe("error");

    // Signal quietly returns. No event fires — this is the case the interval
    // exists for.
    net.reply = () => ({ status: 200, body: { ok: true, updated_at: "2026-08-03T00:00:00.000Z" } });
    await tick(20_000);

    expect(net.types()).toEqual(["update", "update"]);
    expect(m.sync.saveState).toBe("saved");
    expect(await allEdits()).toHaveLength(0);
  });

  it("the backstop stays quiet when there is nothing to send", async () => {
    const m = mount();
    await act(async () => {
      typeRise(m.sync, '7"');
    });
    await tick(DEBOUNCE_MS);
    expect(net.types()).toEqual(["update"]);
    expect(m.sync.saveState).toBe("saved");

    // Three intervals go by with a clean sheet: no traffic at all.
    await tick(60_000);
    expect(net.types()).toEqual(["update"]);
  });
});
