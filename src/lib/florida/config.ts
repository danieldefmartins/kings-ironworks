import type { CrmConfig } from "./crm";
export const SMS_CONSENT = "By checking this box, I agree to receive text messages from King Iron Works about my estimate, appointments and project updates. Message frequency varies. Message & data rates may apply. Reply STOP to opt out, HELP for help. See our Privacy Policy and Terms.";
/** Server-side configuration is pinned to the existing business form, never visitor-selected. */
export function floridaCrmConfig(): CrmConfig | null {
  const formSlug = process.env.KIW_360_FORM_SLUG;
  const workspaceId = process.env.KIW_360_WORKSPACE_ID;
  const fieldMap = process.env.KIW_360_FIELD_MAP;
  if (!formSlug || !workspaceId || !fieldMap) return null;
  try {
    const fields = JSON.parse(fieldMap);
    if (!["firstName", "phone", "projectType", "message", "photos"].every(k=>typeof fields[k]==="string"&&fields[k])) return null;
    return { apiBase: "/api/360", formSlug, workspaceId, fields };
  } catch { return null; }
}
