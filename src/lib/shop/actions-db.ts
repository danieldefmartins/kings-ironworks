import { ORG_ID, sbSelect } from "./db";
import { buildBusinessActions, type ActionJob, type ActionSheet, type ActionCorrection } from "./actions";

async function allRows<T>(table: string, query: string): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await sbSelect<T[]>(table, `${query}&org_id=eq.${ORG_ID}&order=id.asc&limit=500&offset=${offset}`);
    result.push(...page);
    if (page.length < 500) return result;
  }
}

// Owner page calls this only after authenticating. Fetch metadata, never drawings,
// employee addresses, rates, or the text of private correction requests.
export async function loadBusinessActions() {
  const [jobs, sheets, corrections, workers] = await Promise.all([
    allRows<ActionJob>("kiw_shop_jobs", "select=id,job_number,customer_name,current_stage,due_date,deposit_amount,archived&archived=eq.false&current_stage=neq.Done"),
    allRows<ActionSheet>("kiw_shop_measure_sheets", "select=id,job_id,name,status,updated_at&status=in.(submitted,in_progress)"),
    allRows<ActionCorrection>("kiw_shop_time_corrections", "select=id,worker_id,created_at&status=eq.pending"),
    allRows<{ id: string; name: string }>("kiw_shop_workers", "select=id,name"),
  ]);
  return buildBusinessActions(jobs, sheets, corrections, workers);
}
