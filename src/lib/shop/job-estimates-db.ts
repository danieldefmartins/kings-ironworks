import { sbSelect, ORG_ID } from "./db";
import { estimateForViewer, type JobEstimate } from "./job-estimates";

export async function getJobEstimates(jobId: string, owner: boolean) {
  const rows: JobEstimate[] = [];
  for (let offset = 0; ; offset += 200) {
    const page = await sbSelect<JobEstimate[]>("kiw_shop_estimates", `select=id,estimate_number,title,issued_on,is_original,items,total_amount&org_id=eq.${ORG_ID}&job_id=eq.${jobId}&order=issued_on.asc.nullslast,id.asc&limit=200&offset=${offset}`);
    rows.push(...page);
    if (page.length < 200) break;
  }
  return rows.map(row => estimateForViewer(row, owner));
}

export async function getEstimateTotals() {
  type Row = { job_id: string; estimate_number: string; total_amount: number | string; is_original: boolean };
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 200) {
    const page = await sbSelect<Row[]>("kiw_shop_estimates", `select=job_id,estimate_number,total_amount,is_original&org_id=eq.${ORG_ID}&order=issued_on.asc.nullslast,id.asc&limit=200&offset=${offset}`);
    rows.push(...page);
    if (page.length < 200) return rows;
  }
}
