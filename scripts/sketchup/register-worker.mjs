// Run only after the queue migration is applied. Uses existing server env locally;
// writes a dedicated worker secret to a private file, never stdout or git.
import { randomBytes, createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const [shopUrl, output] = process.argv.slice(2);
if (!shopUrl || !output || !shopUrl.startsWith('https://')) throw new Error('Usage: node --env-file=.env.local scripts/sketchup/register-worker.mjs https://YOUR_SHOP /private/tmp/kiw-worker-config.json');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const org = process.env.SHOP_ORG_ID;
const supabase = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!key || !org || !supabase) throw new Error('Explicit SUPABASE URL, service role key and SHOP_ORG_ID are required');
const token = randomBytes(32).toString('hex');
// Fail before registration if the file exists. Secret is recoverable if registration fails.
await writeFile(output, JSON.stringify({ url: shopUrl.replace(/\/$/, ''), token }, null, 2), { flag: 'wx', mode: 0o600 });
const response = await fetch(`${supabase}/rest/v1/kiw_shop_drawing_workers`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: org, name: 'Mac mini SketchUp', token_hash: createHash('sha256').update(token).digest('hex') }) });
if (!response.ok) throw new Error(`Worker registration failed (HTTP ${response.status}); config file is not active`);
console.log('Worker registered. Private config saved to the specified file.');
