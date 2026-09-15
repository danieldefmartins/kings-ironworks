<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


## Shop business rules

- When Daniel says a job is **won**, find its existing lead/customer and move it to `Awarded`, or create the job in the shop if none exists. Check for duplicates first. Do not wait for missing financial details to create the won job: leave unknown contract/payment amounts null, never assume a 50% payment from estimate terms.
- Company financial details, project pricing, material costs, and ledger controls are restricted to Daniel Martins and Kayky via `canViewOwnerFinancials` (both admin and price permission). No other KIW worker may have `can_see_prices`. Crew see fabrication descriptions and installation dates, and may see their own hours and earnings. Strip pricing from all client payloads, including measurement screens.
- Project Money belongs at the top of Today, visible only to Daniel and Kayky.
- Record contract changes and actual payments through `kiw_shop_money_change`, with the session owner's worker ID, tenant/job IDs, and a stable UUID for each new entry. Do not overwrite `contract_amount` or `deposit_amount`: database triggers derive them from the ledger. Void mistakes with a reason; never delete history.
- After importing a structured estimate, reconcile it as additional scope, already included, or excluded (unsigned/replaced/reference). Never sum every PDF indiscriminately: an invoice can bill an existing estimate. Unresolved scope remains `review` and must be visibly flagged.
- Done jobs with a known zero balance and no unreviewed estimates archive automatically. Unknown or outstanding balances stay visible. A later correction or unreviewed estimate reopens an automatically archived job; manually archived history stays separate.
- Keep the Jobs money summary in three columns, including on phones.

## Delivery preference

- Daniel wants app changes deployed after implementation and successful checks. Commit and push the intended changes, run `npm run deploy`, and verify deployment success; do not stop at local changes unless deployment is blocked.
