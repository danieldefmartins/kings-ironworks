// Window / egress well sheets: the 4" sphere solver against a house wall that
// is not a single plane, plus the deliverable-driven submit gate.
//
//   SHOP_BASE_URL=http://localhost:3462 \
//   SHOP_WORKER_ID=... SHOP_PIN=... SHOP_JOB_ID=... node e2e/measure.well.test.mjs

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
async function newWell(name) {
  const r = await api({ type: "create", jobId: JOB, shape: "window_well", steps1: 1, name });
  if (r.status !== 200) throw new Error(`create failed ${r.status}`);
  created.push(r.json.id);
  return r.json.sheet;
}

async function save(sheet, mutate) {
  const data = structuredClone(sheet.data);
  mutate(data);
  const r = await api({ type: "update", id: sheet.id, jobId: JOB, data, baseUpdatedAt: sheet.updated_at });
  if (r.status !== 200) throw new Error(`save failed ${r.status} ${JSON.stringify(r.json)}`);
  return { ...sheet, data, updated_at: r.json?.updated_at ?? r.json?.sheet?.updated_at ?? null };
}

function baseWell(w) {
  w.construction = "poured_concrete";
  w.lengthAtHouse = "96";
  w.projection = "42";
  w.wallThickness = "8";
  w.insideLength = "80";
  w.insideProjection = "34";
  w.depth = "56";
  w.diagA = "87";
  w.diagB = "87";
  w.windowW = "36";
  w.windowH = "48";
  w.sillToFloor = "6";
  w.windowSwing = "out";
}

console.log("\n1) the shape exists and seeds a well block");
let sheet = await newWell("E2E WELL solver");
check(sheet.shape === "window_well", "sheet created with shape window_well", sheet.shape);
check(!!sheet.data.well, "data.well seeded");
check(Array.isArray(sheet.data.well?.bands) && sheet.data.well.bands.length === 0, "starts with no wall bands");
check(sheet.data.well?.maxSphere === "4", "code sphere defaults to 4", sheet.data.well?.maxSphere);
check(sheet.data.segments.length === 0, "no stair segments on a well sheet");

console.log("\n2) the 4\" solver — post measured off the proud trim");
// trim is the proud face (0 back); siding 3/4" back; foundation 1 1/4" back.
// deepest = 1 1/4"  ->  allowed off the trim = 4 - 1 1/4 = 2 3/4"
sheet = await save(sheet, (d) => {
  baseWell(d.well);
  d.well.deliverables = ["guard", "gate", "ladder"];
  d.well.wallRef = "Water table trim";
  d.well.guardHeight = "42";
  d.well.bands = [
    { id: "b1", label: "Water table trim", setback: "0", fromTop: "", toTop: "" },
    { id: "b2", label: "Lap siding", setback: "3/4", fromTop: "", toTop: "" },
    { id: "b3", label: "Foundation", setback: "1 1/4", fromTop: "", toTop: "" },
  ];
  d.well.postToWall = "3 1/2"; // too far — 4 3/4" at the foundation
});

// A failing clearance must block the submit.
let r = await api({ type: "submit", id: sheet.id, jobId: JOB });
const reds = () => r.json?.redChecks || [];
check(r.status === 422, "post at 3 1/2\" off the trim is rejected", `status ${r.status}`);
check(reds().includes("well_clearance"), "rejected specifically on well_clearance", reds().join(",") || "none");

console.log("\n3) the allowance is exactly sphere minus the deepest setback");
// 4" - 1 1/4" = 2 3/4". Walk the boundary from both sides: this proves the
// computed allowance without reaching inside the module.
async function tripsAt(gap) {
  sheet = await save(sheet, (d) => void (d.well.postToWall = gap));
  const res = await api({ type: "submit", id: sheet.id, jobId: JOB });
  return (res.json?.redChecks || []).includes("well_clearance");
}
check((await tripsAt("2 3/4")) === false, "2 3/4\" off the trim passes (exactly on the limit)");
check((await tripsAt("2 13/16")) === true, "2 13/16\" fails — 1/16 over the limit");
check((await tripsAt("2 1/2")) === false, "2 1/2\" passes comfortably");

console.log("\n4) a wall profile that cannot pass at all");
sheet = await save(sheet, (d) => {
  d.well.bands = [
    { id: "b1", label: "Brick band", setback: "0", fromTop: "", toTop: "" },
    { id: "b2", label: "Deep recess", setback: "5", fromTop: "", toTop: "" },
  ];
});
r = await api({ type: "submit", id: sheet.id, jobId: JOB });
check((r.json?.redChecks || []).includes("well_clearance"),
  "a 5\" recess is flagged as impossible for any post position");

console.log("\n5) grate-only wells do not demand guardrail data");
const grate = await newWell("E2E WELL grate only");
const saved = await save(grate, (d) => {
  baseWell(d.well);
  d.well.deliverables = ["grate"];
  d.well.grateBearing = "angle_frame";
  d.well.grateInfill = "1 1/4 x 3/16 bar @ 1 3/16 clear";
  d.well.grateLoad = "Egress, 100 psf";
  d.materials.finish = "Hot-dip galvanized";
  d.fab.maxPiece = "96";
});
r = await api({ type: "submit", id: saved.id, jobId: JOB });
const gapKeys = (r.json?.gaps || []).map((g) => g.key);
check(!gapKeys.some((k) => k.startsWith("span")), "no rail-span requirement on a grate-only sheet", gapKeys.filter((k) => k.startsWith("span")).join(",") || "none");
check(!gapKeys.includes("mat_post"), "no railing post material required", "");
check(!gapKeys.includes("floor_change"), "no stair floor-change question", "");
check(gapKeys.some((k) => k === "photo"), "photo checklist still enforced");

console.log("\n6) deliverables drive what is required");
const bare = await newWell("E2E WELL bare");
r = await api({ type: "submit", id: bare.id, jobId: JOB });
const bareGaps = (r.json?.gaps || []).map((g) => g.key);
check(bareGaps.includes("well_deliverable"), "must tick at least one deliverable");
check(bareGaps.includes("well_depth"), "well depth is required");
check(!bareGaps.includes("well_gate_width"), "gate fields not demanded when no gate is ticked");

for (const id of created) await api({ type: "delete", id, jobId: JOB });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
