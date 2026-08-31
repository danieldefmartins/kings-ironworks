// Fire escape sheets. The point of this shape is that one structure gets
// measured three different ways depending on why KIW is there, and that a
// condition finding on an inspection must never be mistaken for a bad
// measurement and block the sheet.
//
//   SHOP_BASE_URL=http://localhost:3462 \
//   SHOP_WORKER_ID=... SHOP_PIN=... SHOP_JOB_ID=... node e2e/measure.fire.test.mjs

const BASE = process.env.SHOP_BASE_URL || "http://localhost:3457";
const WORKER = process.env.SHOP_WORKER_ID;
const PIN = process.env.SHOP_PIN;
const JOB = process.env.SHOP_JOB_ID;
if (!WORKER || !PIN || !JOB) {
  console.error("Set SHOP_WORKER_ID, SHOP_PIN, SHOP_JOB_ID");
  process.exit(2);
}

let pass = 0;
let fail = 0;
const check = (ok, label, extra) => {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
  ok ? pass++ : fail++;
};

let cookie = "";
async function api(data) {
  const res = await fetch(`${BASE}/shop/api/measure`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(data),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* some errors have no body */
  }
  return { status: res.status, json };
}

const login = await fetch(`${BASE}/shop/api/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ workerId: WORKER, pin: PIN }),
});
cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
if (!cookie) {
  console.error("login failed", login.status);
  process.exit(1);
}

const created = [];
async function newFire(name, levels = 3) {
  const r = await api({ type: "create", jobId: JOB, shape: "fire_escape", steps1: levels, name });
  if (r.status !== 200) throw new Error(`create failed ${r.status}`);
  created.push(r.json.id);
  return r.json.sheet;
}
async function save(sheet, mutate) {
  const data = structuredClone(sheet.data);
  mutate(data);
  const r = await api({ type: "update", id: sheet.id, jobId: JOB, data, baseUpdatedAt: sheet.updated_at });
  if (r.status !== 200) throw new Error(`save failed ${r.status} ${JSON.stringify(r.json)}`);
  return { ...sheet, data, updated_at: r.json.updated_at };
}
async function submit(sheet) {
  const r = await api({ type: "submit", id: sheet.id, jobId: JOB });
  return {
    status: r.status,
    gaps: (r.json?.gaps || []).map((g) => g.key),
    reds: r.json?.redChecks || [],
  };
}

console.log("\n1) the shape seeds one level per storey");
let sheet = await newFire("E2E FIRE inspect", 3);
check(sheet.shape === "fire_escape", "sheet created", sheet.shape);
check(sheet.data.fire?.levels.length === 3, "three levels seeded", String(sheet.data.fire?.levels.length));
check(sheet.data.fire?.purpose === "", "purpose starts unset");
check(sheet.data.fire?.ladder.present === true, "a drop ladder is assumed present");

console.log("\n2) purpose is required before anything else makes sense");
let r = await submit(sheet);
check(r.gaps.includes("fire_purpose"), "purpose is a gap until chosen");

console.log("\n3) an INSPECTION asks for condition, not fabrication geometry");
sheet = await save(sheet, (d) => {
  const f = d.fire;
  f.purpose = "inspect";
  f.wallMaterial = "Brick";
  f.totalHeight = "312";
  f.levels.forEach((l, i) => {
    l.platLength = "72";
    l.platWidth = "44";
    l.heightAboveGrade = String(96 + (f.levels.length - 1 - i) * 108);
    l.floorToFloor = i === f.levels.length - 1 ? "" : "108";
    l.condition.rating = "monitor";
    l.condition.anchors = "Two of six anchors weeping rust";
  });
  f.ladder.type = "counterbalance";
  f.ladder.landingSurface = "Sidewalk";
  f.ladder.operates = "seized";
  f.overall.rating = "fail";
  f.loadTest = "Not performed — access blocked";
});
r = await submit(sheet);
check(!r.gaps.some((g) => g.startsWith("fire_stair")), "no stair geometry demanded on an inspection", r.gaps.filter((g) => g.startsWith("fire_stair")).join(",") || "none");
check(!r.gaps.some((g) => g.startsWith("mat_")), "no fabrication materials demanded", r.gaps.filter((g) => g.startsWith("mat_")).join(",") || "none");
check(!r.gaps.some((g) => g.startsWith("span")), "no rail spans demanded", r.gaps.filter((g) => g.startsWith("span")).join(",") || "none");
check(!r.gaps.includes("max_piece"), "no transport max-piece demanded");
check(!r.gaps.includes("floor_change"), "no stair floor-change question");

console.log("\n4) a seized ladder is a FINDING, not a blocked sheet");
check(!r.reds.includes("fe_ladder_seized"), "seized ladder does not red-block an inspection", r.reds.join(",") || "none");
check(r.gaps.every((g) => !g.startsWith("fire_ladder_")) || r.gaps.includes("fire_ladder_operates") === false,
  "ladder operation was recorded, so it is not a gap");

console.log("\n5) the same defect DOES block a new installation");
const fresh = await newFire("E2E FIRE new", 2);
let ns = await save(fresh, (d) => {
  const f = d.fire;
  f.purpose = "new";
  f.ladder.operates = "seized";
  f.ladder.deployedAboveGrade = "30"; // does not reach the ground
});
r = await submit(ns);
check(r.reds.includes("fe_ladder_seized"), "seized ladder red-blocks a new install", r.reds.join(",") || "none");
check(r.reds.includes("fe_ladder_reach"), "a ladder that cannot reach grade red-blocks a new install");

console.log("\n6) new installs demand the geometry an inspection does not");
check(r.gaps.some((g) => g.startsWith("fire_stair")), "stair geometry is required", r.gaps.filter((g) => g.startsWith("fire_stair")).join(",") || "none");
check(r.gaps.includes("fire_deck"), "deck type is required");
check(r.gaps.includes("fire_anchor_type"), "anchor type is required");
check(!r.gaps.includes("fire_level_rating"), "no condition verdict demanded on a new install");

console.log("\n7) risers have to add up to the floor-to-floor they span");
ns = await save(ns, (d) => {
  const l = d.fire.levels[0];
  l.floorToFloor = "108";
  l.stairRisers = "14";
  l.stairRise = "7"; // 14 x 7 = 98, not 108
  l.stairRun = "9";
  l.stairWidth = "24";
});
r = await submit(ns);
check(r.reds.includes("fe_riser_sum"), "14 × 7\" against a 108\" floor-to-floor is caught", r.reds.join(",") || "none");

ns = await save(ns, (d) => {
  const l = d.fire.levels[0];
  l.floorToFloor = "105";
  l.stairRise = "7 1/2"; // 14 x 7 1/2 = 105 exactly
});
r = await submit(ns);
check(!r.reds.includes("fe_riser_sum"), "14 × 7 1/2\" against 105\" is accepted", r.reds.join(",") || "none");

console.log("\n8) guard height and picket spacing warn without blocking");
ns = await save(ns, (d) => {
  d.fire.levels[0].guardHeight = "36";
  d.fire.levels[0].picketSpacing = "6";
});
r = await submit(ns);
check(!r.reds.includes("fe_guard_height"), "a 36\" guard warns but never blocks");
check(!r.reds.includes("fe_picket_spacing"), "6\" picket spacing warns but never blocks");

for (const id of created) await api({ type: "delete", id, jobId: JOB });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
