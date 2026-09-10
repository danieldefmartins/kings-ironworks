import { shopDateKey, type Job } from "./shared";

export type ActionJob = Pick<Job, "id" | "job_number" | "customer_name" | "current_stage" | "due_date" | "deposit_amount" | "archived">;
export interface ActionSheet { id: string; job_id: string; name: string | null; status: string; updated_at: string }
export interface ActionCorrection { id: string; worker_id: string; created_at: string }
export const ACTION_GROUPS = ["overdue", "soon", "undated", "deposits", "review", "drafts", "corrections"] as const;
export type ActionGroup = typeof ACTION_GROUPS[number];
export interface BusinessAction { id: string; href: string; title: string; date: string | null; detail: string | null }

export function buildBusinessActions(jobs: ActionJob[], sheets: ActionSheet[], corrections: ActionCorrection[], workers: { id: string; name: string }[], now = Date.now()) {
  const today = shopDateKey(now);
  // Calendar arithmetic after converting to shop time avoids UTC/DST due-date drift.
  const soon = new Date(Date.parse(`${today}T12:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
  const groups: Record<ActionGroup, BusinessAction[]> = { overdue: [], soon: [], undated: [], deposits: [], review: [], drafts: [], corrections: [] };
  const live = jobs.filter(j => !j.archived && j.current_stage !== "Done");
  const byId = new Map(live.map(j => [j.id, j]));
  const title = (j: ActionJob) => `${j.job_number} · ${j.customer_name}`;
  for (const job of live.filter(j => j.current_stage !== "Lead")) {
    const row = { id: job.id, href: `/shop/job/${job.id}`, title: title(job), date: job.due_date, detail: job.current_stage };
    if (!job.due_date) groups.undated.push(row);
    else if (job.due_date < today) groups.overdue.push(row);
    else if (job.due_date <= soon) groups.soon.push(row);
    if (job.deposit_amount === null || Number(job.deposit_amount) <= 0) groups.deposits.push({ ...row, date: null });
  }
  for (const sheet of sheets) {
    const job = byId.get(sheet.job_id);
    if (!job || !["submitted", "in_progress"].includes(sheet.status)) continue;
    groups[sheet.status === "submitted" ? "review" : "drafts"].push({
      id: sheet.id, href: `/shop/job/${job.id}/measure/${sheet.id}`, title: title(job), date: shopDateKey(sheet.updated_at), detail: sheet.name,
    });
  }
  const names = new Map(workers.map(w => [w.id, w.name]));
  for (const c of corrections) groups.corrections.push({ id: c.id, href: `/shop/admin/time#correction-${c.id}`, title: names.get(c.worker_id) || "—", date: shopDateKey(c.created_at), detail: null });
  for (const rows of Object.values(groups)) rows.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") || a.title.localeCompare(b.title));
  return { today, groups };
}
