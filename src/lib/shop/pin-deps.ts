// Production wiring for pin-service. Server-only.
import { audit, recentLoginFailures, recentPinChanges, verifyWorkerPin } from "./db";
import { getTeamRecord, saveTeamRecord } from "./team-db";
import type { PinDeps } from "./pin-service";

export function pinDeps(): PinDeps {
  return {
    getRecord: getTeamRecord,
    saveRecord: saveTeamRecord,
    verifyPin: async (id, pin) => !!(await verifyWorkerPin(id, pin)),
    recentPinFailures: id => recentLoginFailures(id, 15),
    recentPinChanges: id => recentPinChanges(id, 15),
    audit,
    now: () => new Date(),
  };
}
