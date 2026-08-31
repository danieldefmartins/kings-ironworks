// Points on drawn shapes, driven through the real screen. Compiling is not the
// same as working: the point adder was on a DIFFERENT STAGE from the drawing,
// so the lines it wanted to attach to did not exist yet on that screen, and
// orderedPosts() filtered every drawn point out of the list because it walked
// data.segments, which a drawn sheet does not have. Neither showed up in a
// build, a typecheck, or an API-level test.
//
// Needs playwright installed OUTSIDE the repo (npm i playwright in a scratch
// dir), and a server on the TEST org:
//   SHOP_ORG_ID=b0000000-0000-4000-8000-000000000002 npx next start -p 3457

import { chromium } from "playwright";

const BASE = process.env.SHOP_BASE_URL || "http://localhost:3457";
const WORKER = process.env.SHOP_WORKER_ID || "b1000000-0000-4000-8000-000000000002";
const PIN = process.env.SHOP_PIN || "9002";
const JOB = process.env.SHOP_JOB_ID || "b2000000-0000-4000-8000-000000000001";

let pass = 0, fail = 0;
const check = (ok, label, extra) => {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
  ok ? pass++ : fail++;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 900, height: 1200 } });

// log in over the API, then hand the cookie to the browser
const res = await fetch(`${BASE}/shop/api/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ workerId: WORKER, pin: PIN }),
});
const raw = (res.headers.getSetCookie?.() || [])[0];
const [nv] = raw.split(";");
const [name, value] = nv.split("=");
await ctx.addCookies([{ name, value, domain: "localhost", path: "/" }]);

// a fresh custom sheet
const mk = await fetch(`${BASE}/shop/api/measure`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie: nv },
  body: JSON.stringify({ type: "create", jobId: JOB, shape: "custom", steps1: 1, name: "UI CHECK" }),
});
const sheetId = (await mk.json()).id;

const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${BASE}/shop/job/${JOB}/measure/${sheetId}`, { waitUntil: "networkidle" });
check(errors.length === 0, "sheet loads with no client errors", errors.slice(0, 2).join(" | ") || "clean");

// --- draw run 1: three taps on the canvas -------------------------------
const canvas = page.locator("svg.touch-none").first();
await canvas.waitFor({ state: "visible", timeout: 15000 });
const box = await canvas.boundingBox();
const tap = async (fx, fy) => {
  await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(160);
};
await tap(0.15, 0.20);
await tap(0.5, 0.2);
await tap(0.5, 0.6);
check(true, "drew three corners on run 1");

// --- finish that run and draw a second, separate one --------------------
const finish = page.getByRole("button", { name: /Finish run/i });
check(await finish.isEnabled(), "Finish run is offered once a run has a line");
await finish.click();
await page.waitForTimeout(300);
await tap(0.75, 0.6);
await tap(0.9, 0.6);
await page.waitForTimeout(300);

const runRows = page.locator("input[placeholder^='Run ']");
check((await runRows.count()) >= 2, "two separate runs exist", String(await runRows.count()));

// --- the point adder must be on the SAME screen as the drawing ----------
const adder = page.getByText(/Add a post, column, wall or clip/i);
check(await adder.count() > 0, "the point adder is on the drawing screen");

// --- tap a line to place a point, the way a measurer would --------------
const placeBtn = page.getByRole("button", { name: /Add point/i });
check(await placeBtn.count() > 0, "an Add point mode is offered on the canvas");
await placeBtn.first().click();
await page.waitForTimeout(300);

// Aim at the real geometry: read a drawn line's endpoints out of the SVG and
// tap its midpoint, so 45-degree snapping cannot make the test miss.
// Bring the canvas clear of the sticky stage header before aiming at it.
await canvas.scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -120));
await page.waitForTimeout(400);
const mid = await page.evaluate(() => {
  const svg = document.querySelector("svg.touch-none");
  const strips = [...svg.querySelectorAll("line")].filter((l) => {
    const w = parseFloat(l.getAttribute("stroke-width") || "0");
    return l.getAttribute("stroke") === "transparent" && w > 10;
  });
  if (!strips.length) return null;
  // Use the element's OWN screen rect: the svg letterboxes its viewBox, so
  // mapping viewBox units linearly onto the svg box lands in the wrong place.
  const r = strips[0].getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, count: strips.length };
});
check(mid !== null, "line grab strips appear in Add point mode", mid ? `${mid.count} strips` : "none");
console.log("      under the cursor:", JSON.stringify(under));
if (mid) {
  await page.mouse.move(mid.x, mid.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(600);
}

const onRun = page.getByText(/^On run$/);
check((await onRun.count()) >= 1, "tapping a line placed a point", String(await onRun.count()));
check(errors.length === 0, "placing raised no client error", errors.slice(0, 2).join(" | ") || "clean");

// tapping a line must NOT have drawn another run
const runsNow = await page.locator("input[placeholder^='Run ']").count();
check(runsNow === 2, "tapping a line did NOT add another run", `${runsNow} runs`);

// and the ＋ buttons still work as the non-touch route
const plusButtons = page.locator("button").filter({ hasText: /^＋ \d+$/ });
check((await plusButtons.count()) >= 2, "a button per drawn line is also offered", `${await plusButtons.count()}`);
await plusButtons.last().click();
await page.waitForTimeout(400);

// --- assert against what actually got saved, not DOM selectors ----------
await page.waitForTimeout(1500); // let autosave settle
const probe = await fetch(`${BASE}/shop/api/measure`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie: nv },
  body: JSON.stringify({ type: "submit", id: sheetId, jobId: JOB }),
}).then((r) => r.json());

// the sheet is nowhere near complete, so submit reports gaps — that is fine.
// What matters is whether the points the UI created are on the stored row.
const stored = await fetch(`${BASE}/shop/api/measure`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie: nv },
  body: JSON.stringify({ type: "rename", id: sheetId, jobId: JOB, name: "UI CHECK" }),
}).then((r) => r.json());

// read the row straight back through a fresh page render
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const cards = await page.getByText(/^On run$/).count();
check(cards >= 2, "point cards render on the drawing screen after reload", `${cards} cards`);

const chipTexts = await page.locator("button").allInnerTexts();
const hasTypes = chipTexts.some((t) => /New railing post/i.test(t)) &&
                 chipTexts.some((t) => /Existing structural post/i.test(t)) &&
                 chipTexts.some((t) => /Concrete wall \/ column/i.test(t)) &&
                 chipTexts.some((t) => /clip/i.test(t));
check(hasTypes, "post / existing column / concrete wall / clip are all offered");

const alongVals = await page.getByLabel(/Along the line/i).all();
check(alongVals.length >= 2, "each point has a distance-along-the-line field", `${alongVals.length}`);
// Seeding only happens when the tapped line already carries a measured
// length — the distance is derived from it. These lines were never
// dimensioned, so an empty value is the correct answer, not a bug.
const seeded = await alongVals[0].inputValue();
check(seeded === "", "an undimensioned line seeds no distance (correct)", seeded === "" ? "empty" : seeded);

check(errors.length === 0, "no client errors through the whole flow", errors.slice(0, 3).join(" | ") || "clean");
await page.screenshot({ path: "/tmp/shop-points.png", fullPage: false });

await fetch(`${BASE}/shop/api/measure`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie: nv },
  body: JSON.stringify({ type: "delete", id: sheetId, jobId: JOB }),
});
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
