import { chromium } from "playwright";

const BASE = process.env.SHOP_BASE_URL || "http://localhost:3457";
const WORKER = process.env.SHOP_WORKER_ID;
const PIN = process.env.SHOP_PIN;
const JOB = process.env.SHOP_JOB_ID;
if (!WORKER || !PIN || !JOB) {
  console.error("Set SHOP_WORKER_ID, SHOP_PIN, SHOP_JOB_ID (and optionally SHOP_BASE_URL)");
  process.exit(2);
}
const OUT = new URL(".", import.meta.url).pathname;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 834, height: 1100 } });
await ctx.request.post(`${BASE}/shop/api/login`, { data: { workerId: WORKER, pin: PIN } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

const cr = await ctx.request.post(`${BASE}/shop/api/measure`, {
  data: { type: "create", jobId: JOB, shape: "straight", steps1: 3, name: "UI TEST v3" },
});
const { id } = await cr.json();

// 1) autosave round-trip
await page.goto(`${BASE}/shop/job/${JOB}/measure/${id}`, { waitUntil: "networkidle" });
const first = page.locator('input[data-m="1"]').first();
await first.fill("6 3/4");
await page.waitForSelector("text=Unsaved changes", { timeout: 3000 }).catch(() => {});
await page.waitForSelector("text=All changes saved", { timeout: 8000 });
console.log("ok  autosave reaches saved state");

await page.reload({ waitUntil: "networkidle" });
const val = await page.locator('input[data-m="1"]').first().inputValue();
console.log(val === "6 3/4" ? "ok  value persisted after reload" : `FAIL persisted value = ${val}`);

// 2) conflict: another writer bumps updated_at behind this page's back
const sheetRow = await ctx.request.post(`${BASE}/shop/api/measure`, {
  data: { type: "rename", id, jobId: JOB, name: "UI TEST v3 (other device)" },
});
console.log("other-device rename:", sheetRow.status());
await page.locator('input[data-m="1"]').nth(1).fill("11 1/2");
await page.waitForSelector("text=changed on another device", { timeout: 8000 });
console.log("ok  conflict banner appears");
await page.screenshot({ path: OUT + "v3-conflict.png" });

// reload clears conflict and shows server state
await page.reload({ waitUntil: "networkidle" });
const name = await page.locator("input").first().inputValue();
console.log(name.includes("other device") ? "ok  reload shows latest server state" : `note name=${name}`);

await ctx.request.post(`${BASE}/shop/api/measure`, { data: { type: "delete", id, jobId: JOB } });
await browser.close();
console.log("done");
