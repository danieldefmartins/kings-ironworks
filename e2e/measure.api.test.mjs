// API contract tests for the hardened measure route.
const BASE = process.env.SHOP_BASE_URL || "http://localhost:3457";
const WORKER = process.env.SHOP_WORKER_ID;
const PIN = process.env.SHOP_PIN;
const JOB = process.env.SHOP_JOB_ID;
if (!WORKER || !PIN || !JOB) {
  console.error("Set SHOP_WORKER_ID, SHOP_PIN, SHOP_JOB_ID (and optionally SHOP_BASE_URL)");
  process.exit(2);
}

const login = await fetch(`${BASE}/shop/api/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ workerId: WORKER, pin: PIN }),
});
const cookie = login.headers.get("set-cookie").split(";")[0];
const api = (body) =>
  fetch(`${BASE}/shop/api/measure`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(body),
  });

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} ${extra}`); }
};

// no session → 401
const anon = await fetch(`${BASE}/shop/api/measure`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type: "delete", id: "00000000-0000-0000-0000-000000000000" }),
});
check("401 without session", anon.status === 401);

// create
const cr = await api({ type: "create", jobId: JOB, shape: "straight", steps1: 4, name: "API TEST" });
const { id } = await cr.json();
check("create returns id", cr.status === 200 && !!id);

// bad ids / shapes
check("create bad jobId → 400", (await api({ type: "create", jobId: "nope", shape: "straight", steps1: 3 })).status === 400);
check("update bad sheet id → 400", (await api({ type: "update", id: "nope", data: {} })).status === 400);

// fetch a valid payload shape by building one client-side (mirror of newMeasureData)
const goodData = {
  units: "in",
  segments: [
    { kind: "flight", steps: [{ rise: "7", run: "11", nosing: "1" }], width: "48", angleDeg: "32", angleBreak: "" },
  ],
  posts: [],
  spiral: null,
  rail: { kind: "Guardrail", height: "36", side: "Both", extensions: "", returns: "", brackets: "" },
  materials: { post: "", topRail: "", picket: "", picketSpacing: "", bottomRail: "", finish: "DTM Epoxy", color: "Black", notes: "" },
  overall: { totalRise: "", totalRun: "", rakeLength: "", notes: "" },
};

// invalid payloads → 400
check("update junk payload → 400", (await api({ type: "update", id, data: { hacked: true } })).status === 400);
check("update wrong types → 400", (await api({ type: "update", id, data: { ...goodData, posts: [{ id: 1 }] } })).status === 400);
const big = { ...goodData, overall: { ...goodData.overall, notes: "x".repeat(5000) } };
check("update oversized note → 400", (await api({ type: "update", id, data: big })).status === 400);

// valid update without base (first save path) → 200 + updated_at
const u1 = await api({ type: "update", id, jobId: JOB, data: goodData });
const u1d = await u1.json();
check("valid update → 200 + updated_at", u1.status === 200 && !!u1d.updated_at, JSON.stringify(u1d));

// CAS: correct base → 200; stale base → 409
const u2 = await api({ type: "update", id, jobId: JOB, data: goodData, baseUpdatedAt: u1d.updated_at });
const u2d = await u2.json();
check("CAS with fresh base → 200", u2.status === 200 && !!u2d.updated_at);
const u3 = await api({ type: "update", id, jobId: JOB, data: goodData, baseUpdatedAt: u1d.updated_at });
check("CAS with stale base → 409", u3.status === 409);

// wrong job association → 404
const u4 = await api({ type: "update", id, jobId: "00000000-0000-0000-0000-000000000000", data: goodData });
check("update with wrong jobId → 404", u4.status === 404);

// rename + status return updated_at; missing sheet → 404
const rn = await api({ type: "rename", id, jobId: JOB, name: "API TEST renamed" });
const rnd = await rn.json();
check("rename → 200 + updated_at", rn.status === 200 && !!rnd.updated_at);
check("status → 200", (await api({ type: "status", id, jobId: JOB, status: "ready" })).status === 200);
check("rename missing sheet → 404", (await api({ type: "rename", id: "00000000-0000-0000-0000-000000000000", name: "x" })).status === 404);

// delete verifies a row; second delete → 404
check("delete → 200", (await api({ type: "delete", id, jobId: JOB })).status === 200);
check("second delete → 404", (await api({ type: "delete", id, jobId: JOB })).status === 404);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
