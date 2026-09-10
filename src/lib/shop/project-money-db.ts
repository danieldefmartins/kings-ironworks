import { ORG_ID, sbSelect } from "./db";
import type { MoneyJob } from "./project-money";
// Owners only at call sites. Independent of board visibility and search filters.
export async function loadProjectMoney(): Promise<MoneyJob[]> {
  const rows: MoneyJob[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await sbSelect<MoneyJob[]>("kiw_shop_jobs", `select=id,job_number,customer_name,current_stage,archived,contract_amount,deposit_amount&org_id=eq.${ORG_ID}&current_stage=neq.Lead&order=job_number.asc,id.asc&limit=500&offset=${offset}`);
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
