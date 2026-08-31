"use client";

// Everything that stands between a measurement being typed and it being safe:
// the local queue, the debounced autosave, the serialized mutation pipeline,
// recovery of edits the device never managed to send, and the reconnect and
// page-exit paths that catch the rest.
//
// It lives apart from the editor because none of it is about measuring, and
// because it is the part that must not be broken by a change to a form field.
//
// The one rule the whole module exists to keep: an edit is durable on the
// device BEFORE the network is attempted, so losing signal in a stairwell
// costs a worker nothing.

import { useEffect, useRef, useState } from "react";
import { normalizeMeasureData, type MeasureData, type MeasureSheet } from "@/lib/shop/measure";
import { queueEdit, clearEdit, getEdit } from "@/lib/shop/outbox";

export type SaveState =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error"
  | "conflict"
  | "queued";

export function useSheetSync({
  sheet,
  jobId,
  status,
  onServerStatus,
  onReopened,
}: {
  sheet: MeasureSheet;
  jobId: string;
  /** The status the editor is showing, so a server-side change can be noticed. */
  status: string;
  onServerStatus: (status: string) => void;
  /** An edit has taken a submitted or approved sheet back to measuring. */
  onReopened: () => void;
}) {
  const [data, setData] = useState<MeasureData>(sheet.data);
  const statusRef = useRef(sheet.status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  // True whenever this sheet has an edit sitting in the local queue that the
  // server has not taken yet.
  const [pendingLocal, setPendingLocal] = useState(false);
  const [restored, setRestored] = useState(false);

  const [online, setOnline] = useState(true);
  const [opErr, setOpErr] = useState<string | null>(null);
  const firstRender = useRef(true);

  // Serialized mutation pipeline: autosave/rename/status/delete run one at a
  // time in order, so responses can't apply out of order and the concurrency
  // base (updated_at) stays fresh.
  const dataRef = useRef(data);
  const dirtyRef = useRef(false);
  const conflictRef = useRef(false);
  const baseUpdatedAt = useRef(sheet.updated_at);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const pendingRef = useRef(false);
  const saveQueuedRef = useRef(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    pendingRef.current = pendingLocal;
  }, [pendingLocal]);

  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const p = queueRef.current.then(fn, fn);
    queueRef.current = p.then(
      () => undefined,
      () => undefined
    );
    return p;
  }

  async function doSave(): Promise<void> {
    if (conflictRef.current) return;
    const payload = dataRef.current;
    // Durable first. If the network call never lands — or the tab dies
    // mid-flight — the measurements are already on the device.
    await queueEdit({
      sheetId: sheet.id,
      jobId,
      data: payload,
      baseUpdatedAt: baseUpdatedAt.current,
      queuedAt: Date.now(),
    });
    setPendingLocal(true);
    setSaveState("saving");
    try {
      const res = await fetch("/shop/api/measure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "update",
          id: sheet.id,
          jobId,
          data: payload,
          baseUpdatedAt: baseUpdatedAt.current,
        }),
      });
      if (res.status === 409) {
        conflictRef.current = true;
        setSaveState("conflict");
        return;
      }
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Save failed");
      if (d.updated_at) baseUpdatedAt.current = d.updated_at;
      // Any edit takes an approved/submitted sheet back to measuring.
      if (d.status && d.status !== statusRef.current) {
        const was = statusRef.current;
        onServerStatus(d.status);
        if (was === "approved" || was === "submitted") onReopened();
      }
      if (dataRef.current === payload) {
        dirtyRef.current = false;
        // The server has it; the local copy is no longer needed.
        await clearEdit(sheet.id);
        setPendingLocal(false);
        setSaveState("saved");
      }
      // else: newer edits exist; their own debounce triggers the next save
    } catch {
      // The edit is safe on the device. Say so, rather than "save failed",
      // which reads like the work is gone.
      setSaveState(navigator.onLine === false ? "queued" : "error");
    }
  }

  // Retry whatever is sitting in the queue for this sheet.
  function flushOutbox() {
    if (conflictRef.current || !dirtyRef.current) return;
    requestSave();
  }

  function requestSave() {
    if (saveQueuedRef.current || conflictRef.current) return;
    saveQueuedRef.current = true;
    enqueue(async () => {
      saveQueuedRef.current = false;
      if (!dirtyRef.current) return;
      await doSave();
    });
  }

  // Autosave (debounced) whenever measurements change.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    dirtyRef.current = true;
    setSaveState("dirty");
    const t = setTimeout(requestSave, 900);
    return () => clearTimeout(t);
    // requestSave reads only refs, so it is stable across renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Recover anything this device queued and never managed to send — after a
  // reload, a crash, or a shift that ended out of signal. The queued payload
  // is newer than the row the page just rendered, so it wins on screen; if the
  // sheet also moved on the server the flush returns 409 and the existing
  // conflict banner takes over. Nothing is overwritten silently.
  useEffect(() => {
    let cancelled = false;
    getEdit(sheet.id).then((pending) => {
      if (cancelled || !pending) return;
      setPendingLocal(true);
      setRestored(true);
      setData(normalizeMeasureData(pending.data));
      dirtyRef.current = true;
      setSaveState("dirty");
      // Try immediately: the reason for the reload is often that signal came back.
      setTimeout(requestSave, 300);
    });
    return () => {
      cancelled = true;
    };
    // runs once for this sheet; requestSave reads only refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.id]);

  // Connectivity: retry the moment the tablet is back, and whenever the
  // measurer returns to the tab (walking out of a stairwell rarely fires an
  // "online" event on its own).
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine !== false);
    sync();
    const onOnline = () => {
      sync();
      flushOutbox();
    };
    const onVisible = () => {
      sync();
      if (document.visibilityState === "visible") flushOutbox();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", sync);
    document.addEventListener("visibilitychange", onVisible);
    // Backstop for the case where neither event fires.
    const t = setInterval(() => {
      if (dirtyRef.current && !conflictRef.current) flushOutbox();
    }, 20000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", sync);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Protect measurements on the way out: warn before closing with unsaved
  // edits, and fire a keepalive save when the page or component goes away.
  useEffect(() => {
    const flush = () => {
      if (!dirtyRef.current || conflictRef.current) return;
      try {
        fetch("/shop/api/measure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            type: "update",
            id: sheet.id,
            jobId,
            data: dataRef.current,
            baseUpdatedAt: baseUpdatedAt.current,
          }),
        });
      } catch {
        // last-chance save; nothing further to do
      }
    };
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current || pendingRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", warn);
      flush(); // in-app navigation unmounts the editor
    };
  }, [sheet.id, jobId]);


  function set(fn: (d: MeasureData) => void) {
    setData((prev) => {
      const next = structuredClone(prev) as MeasureData;
      fn(next);
      return next;
    });
  }

  // Small mutations share the queue and surface failures instead of
  // pretending they worked. Returns the response body, or null on failure.
  async function mutate(
    body: Record<string, unknown>,
    failMsg: string
  ): Promise<Record<string, unknown> | null> {
    return enqueue(async () => {
      try {
        const res = await fetch("/shop/api/measure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, id: sheet.id, jobId }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || failMsg);
        if (d.updated_at) baseUpdatedAt.current = d.updated_at;
        setOpErr(null);
        return d as Record<string, unknown>;
      } catch (e) {
        setOpErr(e instanceof Error ? e.message : failMsg);
        return null;
      }
    });
  }

  return {
    data,
    setData,
    set,
    dataRef,
    saveState,
    pendingLocal,
    restored,
    dismissRestored: () => setRestored(false),
    online,
    opErr,
    setOpErr,
    requestSave,
    enqueue,
    mutate,
    /** Record the concurrency base returned by a mutation this hook did not make. */
    noteUpdatedAt: (at: unknown) => {
      if (typeof at === "string") baseUpdatedAt.current = at;
    },
  };
}
