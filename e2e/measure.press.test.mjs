// Verifies the "add existing column / wall / post" flow on the sketch works
// with a real TOUCH pointer: tap opens the choices, long-press opens them too,
// and long-pressing an item already on the sketch picks it up to move.
import { chromium } from "playwright";

const BASE = process.env.SHOP_BASE_URL;
const WORKER = process.env.SHOP_WORKER_ID;
const PIN = process.env.SHOP_PIN;
const JOB = process.env.SHOP_JOB_ID;
const OUT = process.env.PRESS_OUT_DIR || new URL(".", import.meta.url).pathname;

let fails = 0;
const check = (ok, label) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) fails++;
};

const browser = await chromium.launch();
// A real tablet profile: touch pointer, no mouse.
const ctx = await browser.newContext({
  viewport: { width: 820, height: 1180 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 2,
});
await ctx.request.post(`${BASE}/shop/api/login`, { data: { workerId: WORKER, pin: PIN } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

const cr = await ctx.request.post(`${BASE}/shop/api/measure`, {
  data: { type: "create", jobId: JOB, shape: "straight", steps1: 4, name: "HOLD CHECK" },
});
const { id } = await cr.json();
const url = `${BASE}/shop/job/${JOB}/measure/${id}`;

async function firstTreadBox() {
  // the transparent per-tread press targets in the plan sketch
  const r = page.locator('svg rect[key], svg rect').filter({ hasNot: page.locator("nope") });
  const target = page.locator("svg").first().locator("rect[fill='transparent']").first();
  await target.waitFor({ state: "attached", timeout: 10000 });
  return target;
}

// --- 1) TAP on the sketch in the Existing Structures stage --------------
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

const structures = page.getByText("Existing", { exact: false }).first();
await structures.scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(300);

const tread = await firstTreadBox();
const box = await tread.boundingBox();
if (!box) {
  console.log("FAIL could not locate a tread press target");
  process.exit(1);
}
const cx = box.x + box.width / 2;
const cy = box.y + box.height / 2;

await page.touchscreen.tap(cx, cy);
await page.waitForTimeout(400);
const menuAfterTap = await page.getByText("What is located here?").isVisible().catch(() => false);
check(menuAfterTap, "tap on the sketch opens the point-type choices");
await page.screenshot({ path: OUT + "hold-1-tap-menu.png" });

// pick "Existing column / post"
if (menuAfterTap) {
  await page.getByRole("button", { name: "Concrete wall / column" }).tap();
  await page.waitForTimeout(500);
}
const added = await page.getByText(/E1 — Concrete wall/).isVisible().catch(() => false);
check(added, "chosen structure is added to the list");
await page.screenshot({ path: OUT + "hold-2-added.png" });

// --- 2) LONG PRESS with a touch pointer ---------------------------------
// Playwright has no long-press helper, so drive raw touch pointer events.
async function longPress(x, y, ms = 800) {
  await page.evaluate(
    async ([px, py, hold]) => {
      const el = document.elementFromPoint(px, py);
      if (!el) throw new Error("no element at point");
      const opts = { pointerId: 1, pointerType: "touch", isPrimary: true, bubbles: true, cancelable: true, clientX: px, clientY: py };
      el.dispatchEvent(new PointerEvent("pointerdown", opts));
      await new Promise((r) => setTimeout(r, hold));
      el.dispatchEvent(new PointerEvent("pointerup", opts));
    },
    [x, y, ms]
  );
}

const tread2 = await firstTreadBox();
const b2 = await tread2.boundingBox();
await longPress(b2.x + b2.width / 2, b2.y + b2.height / 2, 800);
await page.waitForTimeout(400);
const menuAfterHold = await page.getByText("What is located here?").isVisible().catch(() => false);
check(menuAfterHold, "long press on the sketch opens the point-type choices");
await page.screenshot({ path: OUT + "hold-3-longpress-menu.png" });
if (menuAfterHold) {
  await page.getByRole("button", { name: /cancel/i }).last().tap();
  await page.waitForTimeout(300);
}

// --- 3) a hold that the finger jitters through must still register -------
async function longPressWithJitter(x, y) {
  await page.evaluate(
    async ([px, py]) => {
      const el = document.elementFromPoint(px, py);
      const mk = (t, dx, dy) =>
        new PointerEvent(t, { pointerId: 1, pointerType: "touch", isPrimary: true, bubbles: true, cancelable: true, clientX: px + dx, clientY: py + dy });
      el.dispatchEvent(mk("pointerdown", 0, 0));
      for (const d of [2, -3, 4, -2, 3]) {
        await new Promise((r) => setTimeout(r, 90));
        el.dispatchEvent(mk("pointermove", d, -d));
      }
      await new Promise((r) => setTimeout(r, 500));
      el.dispatchEvent(mk("pointerup", 0, 0));
    },
    [x, y]
  );
}
const tread3 = await firstTreadBox();
const b3 = await tread3.boundingBox();
await longPressWithJitter(b3.x + b3.width / 2, b3.y + b3.height / 2);
await page.waitForTimeout(400);
const menuJitter = await page.getByText("What is located here?").isVisible().catch(() => false);
check(menuJitter, "finger jitter during a hold does not cancel it");
if (menuJitter) {
  await page.getByRole("button", { name: /cancel/i }).last().tap();
  await page.waitForTimeout(300);
}

// --- 3b) holding an item already on the sketch picks it up to move ------
const marker = page.locator("svg circle[fill='transparent']").first();
const mb = await marker.boundingBox();
if (!mb) {
  check(false, "point marker has its own press target (not covered by the area target)");
} else {
  await longPress(mb.x + mb.width / 2, mb.y + mb.height / 2, 800);
  await page.waitForTimeout(400);
  const moving = await page.getByText(/Post selected/i).isVisible().catch(() => false);
  check(moving, "long press on an existing item picks it up to move");
  await page.screenshot({ path: OUT + "hold-4-move.png" });
  if (moving) {
    await page.getByRole("button", { name: /cancel/i }).first().tap().catch(() => {});
    await page.waitForTimeout(300);
  }
}

// --- 4) touch-action is actually set on the press targets ---------------
const ta = await page.locator("svg rect[fill='transparent']").first().evaluate((el) => getComputedStyle(el).touchAction);
check(ta === "none", `press targets set touch-action:none (got "${ta}")`);

await ctx.request.post(`${BASE}/shop/api/measure`, { data: { type: "delete", id, jobId: JOB } });
await browser.close();
console.log(fails ? `\n${fails} FAILED` : "\nall checks passed");
process.exit(fails ? 1 : 0);
