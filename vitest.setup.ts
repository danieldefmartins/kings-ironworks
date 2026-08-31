// IndexedDB is the whole point of the outbox, so it is provided for real
// (in memory) rather than mocked — a stub would prove nothing about durability.
// Note this is deliberately NOT combined with global fake timers: fake-indexeddb
// schedules its own work, and faking the clock underneath it deadlocks.
import "fake-indexeddb/auto";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export {};
