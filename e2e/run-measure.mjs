// Dedicated TEST tenant only. Sequential execution also avoids PIN throttling
// and language changes racing other browser tests.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const base = process.env.SHOP_BASE_URL || 'http://localhost:3471';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use a local server started with the TEST SHOP_ORG_ID');
const env = { ...process.env, SHOP_BASE_URL: base,
 SHOP_WORKER_ID:'b1000000-0000-4000-8000-000000000001', SHOP_PIN:'9001',
 SHOP_WORKER2_ID:'b1000000-0000-4000-8000-000000000002', SHOP_PIN2:'9002',
 SHOP_JOB_ID:'b2000000-0000-4000-8000-000000000001' };
const requested = process.argv.slice(2);
const files = readdirSync(new URL('.', import.meta.url)).filter(n => /^measure\..*\.test\.mjs$/.test(n) && (!requested.length || requested.some(q => n.includes(q)))).sort();
let failed = 0;
for (const file of files) {
 console.log(`\n=== ${file} ===`);
 const result = spawnSync(process.execPath, [new URL(file, import.meta.url).pathname], { env, stdio:'inherit', timeout:file === 'measure.audit.test.mjs' ? 1800000 : 900000 });
 if (result.status !== 0) { failed++; console.error(result.error?.message || `${file}: exit ${result.status}`); }
}
console.log(`\n${files.length - failed}/${files.length} suites passed`);
process.exitCode = failed ? 1 : 0;
