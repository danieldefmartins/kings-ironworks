// Production wiring for w9-service: Supabase rows, the private storage bucket,
// the immutable audit trail and the PIN check. Server-only.
import { ORG_ID, audit, downloadPhotoObject, getOrgSettings, recentLoginFailures, uploadPhotoObject, verifyWorkerPin } from "./db";
import { getTeamRecord, listTeamRecords, saveTeamRecord } from "./team-db";
import type { W9Deps } from "./w9-service";

export function w9Deps(): W9Deps {
  return {
    orgId: ORG_ID,
    getRecord: getTeamRecord,
    listRecords: listTeamRecords,
    saveRecord: saveTeamRecord,
    putObject: (path, bytes) => uploadPhotoObject(path, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, "application/octet-stream"),
    getObject: downloadPhotoObject,
    audit,
    verifyPin: async (id, pin) => !!(await verifyWorkerPin(id, pin)),
    recentPinFailures: id => recentLoginFailures(id, 15),
    org: async () => {
      const b = (await getOrgSettings()).branding;
      return { name: b.name || "", address: b.address || "" };
    },
    now: () => new Date(),
  };
}

export function clientIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || headers.get("x-real-ip") || null;
  return ip ? ip.slice(0, 64) : null;
}
