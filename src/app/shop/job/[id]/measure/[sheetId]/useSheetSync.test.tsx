// Lifecycle tests for the measure sheet's save path.
//
// These exist because a refactor that was byte-identical inside the hook still
// broke behaviour at its edge: deleteSheet stopped clearing the dirty flag, and
// the unmount flush went on to POST an update for a row that had just been
// deleted. Nothing about what rendered changed, so no structural check could
// have seen it. Test 9 is that exact case, and 9b proves 9 is not vacuous.
//
// No fake timers in this file. Ordering, recovery, conflicts and failures are
// event-loop behaviour, and faking the clock underneath them would hide the
// very thing being protected. Saves are triggered through requestSave() — the
// same entry point the debounce uses — and awaited on the hook's own queue.
// The debounce itself is tested separately, where a fake clock is the point.
//
// What is asserted: the contents of the durable queue, the order and bodies of
// the requests that actually left, and the state the worker is shown. Not
// snapshots — a snapshot of this hook would pass while every one of those was
// wrong.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "@testing-library/react";
import { allEdits, clearAllEdits, getEdit, queueEdit } from "@/lib/shop/outbox";
import {
  HOLD_OPEN,
  JOB_ID,
  NETWORK_DOWN,
  SHEET_ID,
  installFetch,
  mount,
  ok,
  riseOf,
  setOnline,
  testSheet,
  typeRise,
  type Net,
} from "./useSheetSync.harness";

let net: Net;

beforeEach(async () => {
  net = installFetch();
  setOnline(true);
  await clearAllEdits();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Make an edit and push it at the server now, without waiting out the debounce. */
async function edit(m: ReturnType<typeof mount>, rise: string) {
  await act(async () => {
    typeRise(m.sync, rise);
  });
  await act(async () => {
    m.sync.requestSave();
  });
  await m.drain();
}

describe("useSheetSync — ordering and durability", () => {
  it("1. serializes saves: a second never overlaps the first", async () => {
    const m = mount();
    const started: string[] = [];
    net.reply = (body) => {
      started.push(String(body.type));
      return String(body.type) === "update" ? HOLD_OPEN : ok();
    };

    await act(async () => {
      typeRise(m.sync, '7"');
    });
    // requestSave only after the edit has been flushed — the dirty flag is set
    // by an effect, and a save queued before it would find nothing to do.
    await act(async () => {
      m.sync.requestSave();
    });
    // The update is in flight and being held open.
    await act(async () => {});
    expect(started).toEqual(["update"]);

    // A rename queued behind it must not leave while the update is open.
    let renameDone = false;
    await act(async () => {
      m.sync.mutate({ type: "rename", name: "Rear stairs" }, "Rename failed").then(() => {
        renameDone = true;
      });
    });
    expect(started).toEqual(["update"]);
    expect(renameDone).toBe(false);

    await act(async () => {
      net.release[0]();
    });
    await m.drain();

    expect(started).toEqual(["update", "rename"]);
    expect(net.types()).toEqual(["update", "rename"]);
    expect(renameDone).toBe(true);
  });

  it("2. navigating away immediately after typing flushes the edit with keepalive", async () => {
    const m = mount();
    await act(async () => {
      typeRise(m.sync, '7 3/8"');
    });
    // The worker leaves before anything has been sent.
    expect(net.sent).toHaveLength(0);

    await act(async () => {
      m.unmount();
    });

    expect(net.sent).toHaveLength(1);
    expect(net.sent[0].type).toBe("update");
    expect(net.sent[0].keepalive).toBe(true);
    expect(riseOf(net.sent[0].body.data as never)).toBe('7 3/8"');
  });

  it("3. the edit is durable BEFORE the request, and is recovered on reopen", async () => {
    net.reply = () => HOLD_OPEN;
    const m = mount();
    await act(async () => {
      typeRise(m.sync, '7 5/8"');
    });
    await act(async () => {
      m.sync.requestSave();
    });
    await act(async () => {});

    // Request is out; the measurements are already on the device.
    expect(net.types()).toEqual(["update"]);
    const queued = await getEdit(SHEET_ID);
    expect(queued).not.toBeNull();
    expect(riseOf(queued!.data)).toBe('7 5/8"');
    expect(queued!.baseUpdatedAt).toBe(testSheet().updated_at);
    expect(m.sync.pendingLocal).toBe(true);

    // The tab dies mid-flight.
    await act(async () => {
      m.unmount();
    });

    // Reopening finds the queued payload and shows it in preference to the row
    // the page rendered from — the device's copy is the newer one.
    net.reply = () => ok();
    const again = mount();
    await act(async () => {});

    expect(again.sync.restored).toBe(true);
    expect(riseOf(again.sync.data)).toBe('7 5/8"');
    expect(await allEdits()).toHaveLength(1);

    // Sending it succeeds this time, and the device's copy is dropped only
    // once the server has actually taken it. (Recovery also schedules its own
    // retry; that timer is asserted with a fake clock.)
    await act(async () => {
      again.sync.requestSave();
    });
    await again.drain();

    // Two ordinary saves: the one that was held open, and this retry. The
    // unmount in between fired a third with keepalive — the last-chance flush,
    // which is meant to happen and is pinned here so it cannot quietly stop.
    expect(net.sent.filter((x) => x.type === "update" && !x.keepalive)).toHaveLength(2);
    expect(net.sent.filter((x) => x.keepalive)).toHaveLength(1);
    expect(await allEdits()).toHaveLength(0);
    expect(again.sync.saveState).toBe("saved");
  });

  it("6. submitting straight after the final field submits BEHIND that field's save", async () => {
    const m = mount();
    await act(async () => {
      typeRise(m.sync, '7 1/2"'); // the last thing that was missing
    });
    await act(async () => {
      m.sync.requestSave();
      // The worker taps Submit without waiting for that save to land.
      m.sync.mutate({ type: "submit" }, "Submit failed");
    });
    await m.drain();

    const order = net.types();
    // The server must hold the measurements before it is asked to accept them.
    expect(order.indexOf("update")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("update")).toBeLessThan(order.indexOf("submit"));
  });

  it("reports a server-side status change back to the editor exactly once", async () => {
    net.reply = () => ok({ status: "in_progress" });
    const m = mount({}, "approved");
    await edit(m, '7"');

    expect(m.statuses).toEqual(["in_progress"]);
    expect(m.reopened).toBe(1); // drives the "this reopens an approved sheet" warning
  });
});

describe("useSheetSync — losing and regaining the network", () => {
  it("4. offline edits queue, survive a reload, and go up on reconnect", async () => {
    setOnline(false);
    net.reply = () => NETWORK_DOWN;

    const m = mount();
    await edit(m, '6 7/8"');

    // "Saved on this device", not "save failed" — the work is not gone.
    expect(m.sync.saveState).toBe("queued");
    expect(await allEdits()).toHaveLength(1);

    // Reload while still out of signal.
    await act(async () => {
      m.unmount();
    });
    const m2 = mount();
    await act(async () => {});
    await m2.drain();

    expect(m2.sync.restored).toBe(true);
    expect(riseOf(m2.sync.data)).toBe('6 7/8"');
    // Still owed to the server, and still on the device. (That recovery also
    // schedules its own retry is a timer behaviour, tested with a fake clock.)
    expect(await allEdits()).toHaveLength(1);

    // Signal comes back.
    net.reply = () => ok();
    setOnline(true);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    await m2.drain();

    expect(m2.sync.saveState).toBe("saved");
    expect(m2.sync.online).toBe(true);
    expect(await allEdits()).toHaveLength(0);
  });

  it("4b. returning to the tab retries too — leaving a stairwell fires no online event", async () => {
    net.reply = () => NETWORK_DOWN;
    const m = mount();
    await edit(m, '7"');
    // Online as far as the browser knows, so this reads as a real failure.
    expect(m.sync.saveState).toBe("error");
    const before = net.sent.length;

    net.reply = () => ok();
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await m.drain();

    expect(net.sent.length).toBeGreaterThan(before);
    expect(m.sync.saveState).toBe("saved");
  });

  it("7. a failed save keeps the queue and offers a retry rather than claiming loss", async () => {
    net.reply = () => ({ status: 500, body: { error: "boom" } });
    const m = mount();
    await edit(m, '7 3/4"');

    // This is the state the editor renders "Save now" on.
    expect(m.sync.saveState).toBe("error");
    expect(m.sync.pendingLocal).toBe(true);
    expect(await allEdits()).toHaveLength(1);

    net.reply = () => ok();
    await act(async () => {
      m.sync.requestSave();
    });
    await m.drain();

    expect(m.sync.saveState).toBe("saved");
    expect(m.sync.pendingLocal).toBe(false);
    expect(await allEdits()).toHaveLength(0);
  });

  it("5. a stale-write conflict stops saving and keeps the local copy", async () => {
    net.reply = () => ({ status: 409, body: { error: "conflict" } });
    const m = mount();
    await edit(m, '7 1/8"');

    expect(m.sync.saveState).toBe("conflict");
    // The worker's numbers are still on the device, not discarded.
    expect(await allEdits()).toHaveLength(1);

    // Nothing further is attempted — no silent overwrite of the newer row.
    const after = net.sent.length;
    net.reply = () => ok();
    await act(async () => {
      typeRise(m.sync, '7 1/4"');
    });
    await act(async () => {
      m.sync.requestSave();
      window.dispatchEvent(new Event("online"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await m.drain();

    expect(net.sent).toHaveLength(after);
    // And the reload banner stays up. It is keyed on this state, so reporting
    // "unsaved" after the next keystroke would hide the only way out while
    // the measurer went on typing into a sheet that can never save again.
    expect(m.sync.saveState).toBe("conflict");
  });
});

describe("useSheetSync — the shared tablet", () => {
  it("8. signing out clears the queue: no measurements cross into the next worker's shift", async () => {
    net.reply = () => NETWORK_DOWN;
    const m = mount();
    await edit(m, '7"');
    expect(await allEdits()).toHaveLength(1);

    // A second sheet from the same shift, queued the same way.
    await queueEdit({
      sheetId: "sheet-2",
      jobId: JOB_ID,
      data: testSheet().data,
      baseUpdatedAt: null,
      queuedAt: Date.now(),
    });
    expect(await allEdits()).toHaveLength(2);

    // What ShopTopBar's logout does before dropping the cookie.
    await clearAllEdits();

    expect(await allEdits()).toHaveLength(0);
    expect(await getEdit(SHEET_ID)).toBeNull();

    // And the next worker opening the same sheet is shown the server's copy,
    // not the previous shift's unsent numbers.
    await act(async () => {
      m.unmount();
    });
    net.reply = () => ok();
    const next = mount();
    await act(async () => {});
    expect(next.sync.restored).toBe(false);
    expect(riseOf(next.sync.data)).toBe("");
  });

  it("9. deleting with dirty edits stops saving: no update, and no exit flush after", async () => {
    // The exact regression the refactor introduced, which the structural
    // card-and-string checks were blind to.
    const m = mount();
    await act(async () => {
      typeRise(m.sync, '7 1/4"'); // dirty, nothing sent yet
    });
    expect(net.sent).toHaveLength(0);

    await act(async () => {
      await m.sync.mutate({ type: "delete" }, "Delete failed");
    });
    expect(net.types()).toEqual(["delete"]);

    // Navigating away unmounts the editor. Nothing more may be sent: the row is
    // gone, and an update for it would fail for as long as it is retried.
    await act(async () => {
      m.unmount();
    });

    expect(net.types()).toEqual(["delete"]);
    expect(net.sent.some((s) => s.type === "update")).toBe(false);
  });

  it("9b. any other mutation leaves the flush armed — so test 9 is not vacuous", async () => {
    const m = mount();
    await act(async () => {
      typeRise(m.sync, '7 1/4"');
    });
    // A rename is not a delete: the sheet still exists and still owes a save.
    await act(async () => {
      await m.sync.mutate({ type: "rename", name: "Rear stairs" }, "Rename failed");
    });
    await act(async () => {
      m.unmount();
    });

    expect(net.sent.some((s) => s.type === "update" && s.keepalive)).toBe(true);
  });
});
