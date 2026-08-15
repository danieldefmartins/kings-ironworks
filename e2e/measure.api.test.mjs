// API contract tests for the measure route: auth, Zod validation, row
// verification, compare-and-swap, and the submit → approve lifecycle.
const BASE = process.env.SHOP_BASE_URL || "http://localhost:3457";
const WORKER = process.env.SHOP_WORKER_ID;
const PIN = process.env.SHOP_PIN;
const JOB = process.env.SHOP_JOB_ID;
// optional: a non-admin worker to prove approve is admin-only
const WORKER2 = process.env.SHOP_WORKER2_ID;
const PIN2 = process.env.SHOP_PIN2;
if (!WORKER || !PIN || !JOB) {
  console.error("Set SHOP_WORKER_ID, SHOP_PIN, SHOP_JOB_ID (and optionally SHOP_BASE_URL)");
  process.exit(2);
}

async function loginCookie(workerId, pin) {
  const res = await fetch(`${BASE}/shop/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workerId, pin }),
  });
  if (!res.ok) throw new Error(`login failed for ${workerId}`);
  return res.headers.get("set-cookie").split(";")[0];
}

const cookie = await loginCookie(WORKER, PIN);
const api = (body, ck = cookie) =>
  fetch(`${BASE}/shop/api/measure`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: ck },
    body: JSON.stringify(body),
  });

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} ${extra}`); }
};

// A fully-valid, fully-complete payload for a 2-step straight stair.
// Redundant control dims agree with the per-step numbers (checks all green).
function completeData() {
  return {
    units: "in",
    segments: [
      {
        kind: "flight",
        steps: [
          { rise: "7", run: "11", nosing: "1" },
          { rise: "7", run: "11", nosing: "1" },
        ],
        width: "48",
        angleDeg: "32.5",
        angleBreak: "",
      },
    ],
    posts: [],
    spiral: null,
    rail: { kind: "Guardrail", height: "36", side: "Both", extensions: "", returns: "", brackets: "" },
    materials: { post: "", topRail: "", picket: "", picketSpacing: "", bottomRail: "", finish: "DTM Epoxy", color: "Black", notes: "" },
    overall: {
      totalRise: "14",
      totalRun: "22",
      rakeLength: "26 1/8",
      floorToFloor: "14",
      widthBottom: "48",
      widthMid: "48",
      widthTop: "48",
      notes: "",
    },
    datums: {
      orientation: "left_wall",
      bottomDatum: "top of granite, finished",
      topDatum: "porch deck",
      nosingRef: "",
      postRef: "centerline",
      surfaceState: "finished",
    },
    finish: {
      bottomSurface: "", topSurface: "", futureTopping: "", treadCovering: "",
      wallFinish: "", demoPending: "", verifyAfterFinishes: false, notes: "",
    },
    fab: {
      corners: "", flightConnection: "", bottomClearance: "", infill: "",
      splices: "", maxPiece: "", access: "", gate: "", touchup: "",
    },
    photos: [
      "overall_bottom", "overall_top", "bottom_term", "top_term", "left_side", "right_side",
    ].map((slot) => ({ slot, path: `test/${slot}.jpg`, takenAt: "2026-01-01T00:00:00Z" })),
    annotations: {},
  };
}

// no session → 401
const anon = await fetch(`${BASE}/shop/api/measure`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type: "delete", id: "00000000-0000-0000-0000-000000000000" }),
});
check("401 without session", anon.status === 401);

// create
const cr = await api({ type: "create", jobId: JOB, shape: "straight", steps1: 2, name: "API TEST" });
const { id } = await cr.json();
check("create returns id", cr.status === 200 && !!id);
check("create bad jobId → 400", (await api({ type: "create", jobId: "nope", shape: "straight", steps1: 3 })).status === 400);
check("update bad sheet id → 400", (await api({ type: "update", id: "nope", data: {} })).status === 400);

// invalid payloads → 400
check("update junk payload → 400", (await api({ type: "update", id, data: { hacked: true } })).status === 400);
check("update wrong types → 400", (await api({ type: "update", id, data: { ...completeData(), posts: [{ id: 1 }] } })).status === 400);
const big = completeData();
big.overall.notes = "x".repeat(5000);
check("update oversized note → 400", (await api({ type: "update", id, data: big })).status === 400);

// submit while incomplete → 422 with gap list
check("submit incomplete → 422", (await api({ type: "submit", id, jobId: JOB })).status === 422);

// red geometry check blocks submit: risers say 14" but floor-to-floor says 20"
const contradictory = completeData();
contradictory.overall.floorToFloor = "20";
let u = await api({ type: "update", id, jobId: JOB, data: contradictory });
check("contradictory update saves (never auto-corrected)", u.status === 200);
check("submit with red check → 422", (await api({ type: "submit", id, jobId: JOB })).status === 422);

// complete + consistent → submit works
u = await api({ type: "update", id, jobId: JOB, data: completeData() });
const ud = await u.json();
check("complete update → 200", u.status === 200 && !!ud.updated_at);
check("update returns status in_progress", ud.status === "in_progress");

// CAS still enforced
const stale = await api({ type: "update", id, jobId: JOB, data: completeData(), baseUpdatedAt: "2000-01-01T00:00:00+00:00" });
check("CAS with stale base → 409", stale.status === 409);

const sub = await api({ type: "submit", id, jobId: JOB });
check("submit complete sheet → 200", sub.status === 200);

// approve must be admin-only
if (WORKER2 && PIN2) {
  const cookie2 = await loginCookie(WORKER2, PIN2);
  check("approve as non-admin → 403", (await api({ type: "approve", id, jobId: JOB }, cookie2)).status === 403);
} else {
  console.log("  --  skipped non-admin approve test (SHOP_WORKER2_ID/SHOP_PIN2 not set)");
}

// approve (admin) → rev 1; second approve without re-submit → 409
const ap = await api({ type: "approve", id, jobId: JOB });
const apd = await ap.json();
check("approve → 200 rev 1", ap.status === 200 && apd.rev === 1, JSON.stringify(apd));
check("approve again → 409", (await api({ type: "approve", id, jobId: JOB })).status === 409);

// editing an approved sheet drops the approval
u = await api({ type: "update", id, jobId: JOB, data: completeData() });
const ud2 = await u.json();
check("edit after approval → status in_progress", u.status === 200 && ud2.status === "in_progress");

// second approval cycle bumps the revision
await api({ type: "submit", id, jobId: JOB });
const ap2 = await api({ type: "approve", id, jobId: JOB });
const ap2d = await ap2.json();
check("re-approve → rev 2", ap2.status === 200 && ap2d.rev === 2, JSON.stringify(ap2d));

// send back with comment
await api({ type: "update", id, jobId: JOB, data: completeData() });
await api({ type: "submit", id, jobId: JOB });
check("sendback → 200", (await api({ type: "sendback", id, jobId: JOB, comment: "recheck post P1" })).status === 200);

// rename + wrong-job + delete verification
check("rename → 200", (await api({ type: "rename", id, jobId: JOB, name: "API TEST renamed" })).status === 200);
check("update with wrong jobId → 404", (await api({ type: "update", id, jobId: "00000000-0000-0000-0000-000000000000", data: completeData() })).status === 404);
check("rename missing sheet → 404", (await api({ type: "rename", id: "00000000-0000-0000-0000-000000000000", name: "x" })).status === 404);
check("delete → 200", (await api({ type: "delete", id, jobId: JOB })).status === 200);
check("second delete → 404", (await api({ type: "delete", id, jobId: JOB })).status === 404);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
