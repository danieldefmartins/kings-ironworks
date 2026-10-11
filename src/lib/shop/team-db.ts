// Team roster + worker profile records (server-only).
//
// Profile extras and W-9 metadata live in kiw_shop_workers.application_details
// (jsonb), next to what the public application already stored there, so no
// schema change is needed. Every write is a read-merge-write of that object:
// keys this module does not own are always carried over untouched.

import { ORG_ID, sbSelect, sbUpdate } from "./db";
import type { TeamRecord } from "./w9-service";

const COLS = "id,name,role,active,is_admin,can_see_prices,hourly_rate,payroll_excluded,lang,phone,email,address,emergency_contact_name,emergency_contact_phone,application_details";

export async function listTeamRecords(): Promise<TeamRecord[]> {
  return sbSelect<TeamRecord[]>("kiw_shop_workers", `select=${COLS}&org_id=eq.${ORG_ID}&active=eq.true&order=name.asc`);
}

export async function getTeamRecord(id: string): Promise<TeamRecord | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await sbSelect<TeamRecord[]>("kiw_shop_workers", `select=${COLS}&org_id=eq.${ORG_ID}&id=eq.${id}&active=eq.true&limit=1`);
  return rows[0] || null;
}

export async function saveTeamRecord(id: string, patch: { columns?: Record<string, unknown>; details: Record<string, unknown> }): Promise<void> {
  const rows = await sbUpdate<{ id: string }[]>("kiw_shop_workers", `org_id=eq.${ORG_ID}&id=eq.${id}`, {
    ...(patch.columns || {}),
    application_details: patch.details,
  });
  if (!rows?.length) throw new Error("Worker not found");
}
