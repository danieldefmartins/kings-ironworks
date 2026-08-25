import { chromium } from "playwright";

const BASE = process.env.SHOP_BASE_URL || "http://localhost:3458";
const WORKER = process.env.SHOP_WORKER_ID;
const PIN = process.env.SHOP_PIN;
const JOB = process.env.SHOP_JOB_ID;
if (!WORKER || !PIN || !JOB) throw new Error("Set SHOP_WORKER_ID, SHOP_PIN and SHOP_JOB_ID");

const cases = [
  ["straight", null, 4, 0, 0],
  ["stair_platform", null, 4, 0, 0],
  ["l_shape", null, 3, 5, 0],
  ["u_shape", null, 3, 5, 0],
  ["builder", "winder_l", 4, 4, 0],
  ["builder", "winder_u", 4, 4, 0],
  ["builder", "three_flight", 2, 7, 2],
  ["builder", "bifurcated", 4, 5, 6],
  ["builder", "curved_helical", 4, 0, 0],
  ["builder", "irregular_stoop", 4, 0, 0],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 900, height: 1100 } });
const login = await ctx.request.post(`${BASE}/shop/api/login`, { data: { workerId: WORKER, pin: PIN } });
if (!login.ok()) throw new Error(`Login failed: ${login.status()}`);
const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
const created = [];

try {
  await page.goto(`${BASE}/shop/job/${JOB}/measure`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /new sheet/i }).click();
  const pickerIcons = await page.locator("svg").count();
  if (pickerIcons < 10) throw new Error(`Shape picker rendered only ${pickerIcons} icons`);

  for (const [shape, preset, steps1, steps2, steps3] of cases) {
    const res = await ctx.request.post(`${BASE}/shop/api/measure`, {
      data: { type: "create", jobId: JOB, shape, preset, steps1, steps2, steps3, name: `SHAPE AUDIT ${preset || shape}` },
    });
    const body = await res.json();
    if (!res.ok() || !body.id) throw new Error(`Create failed for ${preset || shape}: ${res.status()} ${JSON.stringify(body)}`);
    created.push(body.id);
    await page.goto(`${BASE}/shop/job/${JOB}/measure/${body.id}`, { waitUntil: "networkidle" });
    const svg = page.locator("svg").first();
    if (!(await svg.isVisible())) throw new Error(`No visible sketch for ${preset || shape}`);
    const box = await svg.boundingBox();
    if (!box || box.width < 150 || box.height < 40) throw new Error(`Bad sketch bounds for ${preset || shape}`);
  }
  if (pageErrors.length) throw new Error(`Browser errors: ${pageErrors.join(" | ")}`);
  console.log(`ok  rendered ${cases.length} staircase layouts and the full icon picker`);
} finally {
  for (const id of created) {
    await ctx.request.post(`${BASE}/shop/api/measure`, { data: { type: "delete", id, jobId: JOB } });
  }
  await browser.close();
}
