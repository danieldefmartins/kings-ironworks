// Missed clock-outs get caught the same evening, not at payroll time.
//
// A shift that has been open longer than STALE_SHIFT_HOURS is almost always a
// clock-out that never reached the server. Left alone it silently becomes a
// 24-hour day that gets approved in a batch (Kaio 9/9, 9/23, 9/24). This runs
// opportunistically on shop API traffic — the crew punches from 6am to 10pm,
// so there is always traffic when it matters — throttled per process, and
// deduplicated through the immutable audit trail so a restart cannot re-alert.

import { ORG_ID, audit, sbSelect } from "./db";
import { sendTelegram, tgEscape } from "./notify";
import { fmtDateTime, type TimeShift } from "./shared";
import { STALE_SHIFT_HOURS } from "./punch";

const THROTTLE_MS = 10 * 60 * 1000;
let lastRun = 0;

export async function alertStaleShifts(now = Date.now()): Promise<void> {
  if (now - lastRun < THROTTLE_MS) return;
  lastRun = now;
  try {
    const cutoff = new Date(now - STALE_SHIFT_HOURS * 3600 * 1000).toISOString();
    const shifts = await sbSelect<Pick<TimeShift, "id" | "worker_id" | "started_at">[]>(
      "kiw_shop_shifts",
      `select=id,worker_id,started_at&org_id=eq.${ORG_ID}&ended_at=is.null&started_at=lt.${encodeURIComponent(cutoff)}`
    );
    if (!shifts.length) return;
    const ids = shifts.map((s) => s.id);
    const already = await sbSelect<{ entity_id: string }[]>(
      "kiw_shop_audit",
      `select=entity_id&org_id=eq.${ORG_ID}&action=eq.shift_stale_alert&entity_id=in.(${ids.join(",")})`
    );
    const done = new Set(already.map((a) => a.entity_id));
    const fresh = shifts.filter((s) => !done.has(s.id));
    if (!fresh.length) return;
    const workers = await sbSelect<{ id: string; name: string }[]>(
      "kiw_shop_workers",
      `select=id,name&org_id=eq.${ORG_ID}&id=in.(${[...new Set(fresh.map((s) => s.worker_id))].join(",")})`
    );
    const names = new Map(workers.map((w) => [w.id, w.name]));
    for (const s of fresh) {
      const hours = (now - Date.parse(s.started_at)) / 3600000;
      const name = names.get(s.worker_id) || "A worker";
      const text =
        `⚠️ <b>KIW payroll</b>: ${tgEscape(name)} has been clocked in for <b>${hours.toFixed(1)}h</b> ` +
        `(since ${tgEscape(fmtDateTime(s.started_at))}). Almost certainly a missed clock-out — ` +
        `the phone probably dropped the punch. Fix the end time in Shop › Payroll › Time.`;
      const sent = await sendTelegram(text);
      // Record the attempt either way: a failing Telegram must not turn into a
      // retry storm every ten minutes, and the audit row is the dedupe key.
      await audit("shift_stale_alert", { workerId: s.worker_id, entity: "shift", entityId: s.id, detail: { hours: Number(hours.toFixed(2)), sent } });
    }
  } catch (err) {
    console.error("[stale-alert] failed:", err);
  }
}
