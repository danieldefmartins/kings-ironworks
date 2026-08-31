// Durable local queue for measurement edits.
//
// Field measuring happens in basement stairwells, steel buildings and rural
// driveways. Autosave posts straight to the server, so a dropped signal used
// to leave a measurer holding a tablet full of numbers with nowhere to put
// them. Every edit is now written to IndexedDB first and only cleared once the
// server has actually taken it, so the work survives the network, a reload, or
// the browser killing the tab.
//
// Client-only. Every call resolves rather than throwing: a browser with
// IndexedDB blocked (private mode, locked-down MDM profile) must degrade to
// today's behaviour, never break the editor.

import type { MeasureData } from "./measure";

const DB_NAME = "kiw-shop";
const DB_VERSION = 1;
const STORE = "measure-outbox";

export interface PendingEdit {
  sheetId: string;
  jobId: string;
  data: MeasureData;
  baseUpdatedAt: string | null;
  queuedAt: number;
}

function supported(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (!supported()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "sheetId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        let store: IDBObjectStore;
        try {
          store = db.transaction(STORE, mode).objectStore(STORE);
        } catch {
          return resolve(null);
        }
        let req: IDBRequest<T>;
        try {
          req = run(store);
        } catch {
          return resolve(null);
        }
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      })
  );
}

/** Record an edit as not-yet-accepted by the server. Overwrites any earlier
 *  pending edit for the same sheet — the newest payload is the whole truth. */
export async function queueEdit(edit: PendingEdit): Promise<void> {
  await tx("readwrite", (s) => s.put(edit) as IDBRequest<IDBValidKey>);
}

/** Drop a sheet's pending edit once the server has taken it. */
export async function clearEdit(sheetId: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(sheetId) as unknown as IDBRequest<undefined>);
}

export async function getEdit(sheetId: string): Promise<PendingEdit | null> {
  const row = await tx<PendingEdit | undefined>("readonly", (s) => s.get(sheetId));
  return row ?? null;
}

/** Everything still waiting to reach the server, oldest first. */
export async function allEdits(): Promise<PendingEdit[]> {
  const rows = await tx<PendingEdit[]>("readonly", (s) => s.getAll());
  return (rows || []).sort((a, b) => a.queuedAt - b.queuedAt);
}

/** Sign-out clears the queue: a shared shop tablet must not carry one
 *  worker's unsent measurements into the next worker's session. */
export async function clearAllEdits(): Promise<void> {
  await tx("readwrite", (s) => s.clear() as unknown as IDBRequest<undefined>);
}
