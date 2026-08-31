// Gate, fence run and balcony sheets. Each shape carries one check that is
// the reason it exists, and those are what this exercises:
//
//   gate     a leaf swinging over rising ground binds before it opens
//   fence    the segments have to add up to the run measured end to end
//   balcony  an anchor deeper than the slab breaks straight through it
//
//   SHOP_BASE_URL=http://localhost:3462 \
//   SHOP_WORKER_ID=... SHOP_PIN=... SHOP_JOB_ID=... node e2e/measure.trio.test.mjs

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
async function make(shape, name, count = 1) {
  const r = await api({ type: "create", jobId: JOB, shape, steps1: count, name });
  if (r.status !== 200) throw new Error(`create ${shape} failed ${r.status}`);
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
  return { gaps: (r.json?.gaps || []).map((g) => g.key), reds: r.json?.redChecks || [] };
}

// ---------------------------------------------------------------- gate ----
console.log("\nGATE");
let g = await make("gate", "E2E GATE");
check(!!g.data.gate, "gate block seeded");
check(g.data.segments.length === 0, "no stair segments");

let r = await submit(g);
check(r.gaps.includes("gate_operation"), "operation is required");
check(!r.gaps.some((k) => k.startsWith("span")), "no rail spans on a gate", r.gaps.filter((k) => k.startsWith("span")).join(",") || "none");

// A 12ft double swing over ground that rises 3" across the swing, with only
// 2" under the leaf: it binds.
g = await save(g, (d) => {
  Object.assign(d.gate, {
    use: "driveway", operation: "double_swing",
    widthTop: "144", widthBottom: "144", heightHinge: "72", heightLatch: "72",
    groundClearance: "2", gradeRise: "3", surface: "Asphalt",
    swingDir: "in", hingeSide: "left",
    infill: "3/4 sq pickets", hinges: "Weld-on barrel, 4 per leaf", latch: "Drop rod + padlock eye",
    postSize: "4x4x1/4 HSS", footingDepth: "42",
  });
});
r = await submit(g);
check(r.reds.includes("gate_swing_clearance"), "2\" clearance over a 3\" rise is caught", r.reds.join(",") || "none");

g = await save(g, (d) => void (d.gate.groundClearance = "4"));
r = await submit(g);
check(!r.reds.includes("gate_swing_clearance"), "4\" clearance over the same rise passes", r.reds.join(",") || "none");

// Falling ground never binds.
g = await save(g, (d) => {
  d.gate.groundClearance = "1";
  d.gate.gradeRise = "-2";
});
r = await submit(g);
check(!r.reds.includes("gate_swing_clearance"), "ground that falls away never binds");

// A slider does not swing, so the check does not apply.
g = await save(g, (d) => {
  d.gate.operation = "slide";
  d.gate.groundClearance = "1";
  d.gate.gradeRise = "4";
});
r = await submit(g);
check(!r.reds.includes("gate_swing_clearance"), "a slide gate is not swing-checked");

// Posts out of plumb show up as a width disagreement.
g = await save(g, (d) => {
  d.gate.operation = "single_swing";
  d.gate.widthBottom = "147";
  d.gate.groundClearance = "4";
  d.gate.gradeRise = "1";
});
r = await submit(g);
check(r.reds.includes("gate_width_agree"), "a 3\" top-to-bottom width difference is caught", r.reds.join(",") || "none");

// ---------------------------------------------------------------- fence ----
console.log("\nFENCE");
let f = await make("fence", "E2E FENCE", 3);
check(f.data.fence?.segments.length === 3, "three segments seeded", String(f.data.fence?.segments.length));

// 40 + 32 + 28 = 100, but the run was taped at 112.
f = await save(f, (d) => {
  Object.assign(d.fence, {
    totalRun: "112", height: "72", postSpacing: "96", postSize: "2x2 sq",
    footingDepth: "36", startTerm: "House corner", endTerm: "Existing chain link",
    utilities: "Gas line marked 3 ft off the line", panelWidth: "",
  });
  d.fence.segments[0].length = "40";
  d.fence.segments[1].length = "32";
  d.fence.segments[2].length = "28";
});
r = await submit(f);
check(r.reds.includes("fence_run_sum"), "segments summing to 100 against a 112 run is caught", r.reds.join(",") || "none");

f = await save(f, (d) => void (d.fence.segments[2].length = "40")); // 40+32+40 = 112
r = await submit(f);
check(!r.reds.includes("fence_run_sum"), "segments that add up are accepted", r.reds.join(",") || "none");

// Panels that do not fit their segment.
f = await save(f, (d) => {
  d.fence.panelWidth = "96";
  d.fence.segments[0].panels = "1"; // 96 into a 40" segment
});
r = await submit(f);
check(r.reds.includes("fence_panel_fit"), "a 96\" panel in a 40\" segment is caught");

// Recording a grade change forces the racked-or-stepped decision.
f = await save(f, (d) => {
  d.fence.panelWidth = "";
  d.fence.segments[0].panels = "";
  d.fence.segments[1].gradeChange = "14";
});
r = await submit(f);
check(r.gaps.includes("fence_seg_grade"), "a segment with grade change must say racked or stepped");

// -------------------------------------------------------------- balcony ----
console.log("\nBALCONY");
let b = await make("balcony", "E2E BALCONY");
check(!!b.data.balcony, "balcony block seeded");

// 5" embedment into a 4" slab: it goes straight through.
b = await save(b, (d) => {
  Object.assign(d.balcony, {
    kind: "balcony", mount: "top", edgeLength: "144", guardHeight: "42",
    slabMaterial: "Concrete", slabThickness: "4", anchorType: "1/2 wedge",
    anchorEmbedment: "5", edgeDistance: "6", minCover: "",
    returns: "Both ends into brick", finishedFloor: "Bare slab, no topping",
  });
});
r = await submit(b);
check(r.reds.includes("bal_embedment"), "5\" embedment in a 4\" slab is caught", r.reds.join(",") || "none");

b = await save(b, (d) => void (d.balcony.anchorEmbedment = "2 3/4"));
r = await submit(b);
check(!r.reds.includes("bal_embedment"), "2 3/4\" embedment in the same slab passes", r.reds.join(",") || "none");

// Cover counts against the slab too.
b = await save(b, (d) => void (d.balcony.minCover = "1 1/2"));
r = await submit(b);
check(r.reds.includes("bal_embedment"), "2 3/4\" plus 1 1/2\" cover no longer fits in 4\"");

// Too near the edge.
b = await save(b, (d) => {
  d.balcony.minCover = "";
  d.balcony.edgeDistance = "1 1/2";
});
r = await submit(b);
check(r.reds.includes("bal_edge_distance"), "an anchor 1 1/2\" off the edge is caught");

b = await save(b, (d) => void (d.balcony.edgeDistance = "3"));
r = await submit(b);
check(!r.reds.includes("bal_edge_distance"), "3\" off the edge warns but does not block");

// A juliet has to say what opening it fronts.
b = await save(b, (d) => {
  d.balcony.edgeDistance = "6";
  d.balcony.kind = "juliet";
  d.balcony.doorOpening = "";
});
r = await submit(b);
check(r.gaps.includes("bal_door_opening"), "a juliet must record the door opening");

for (const id of created) await api({ type: "delete", id, jobId: JOB });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
