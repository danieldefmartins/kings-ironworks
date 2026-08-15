// API contract tests for the measure route: auth, Zod validation, row
// verification, compare-and-swap, conditional completeness gate, photo
// verification, and the submit → approve lifecycle with independent review.
//
// Requires TWO workers: SHOP_WORKER_ID must be an ADMIN, SHOP_WORKER2_ID a
// non-admin (submits sheets so the admin can approve them).
const BASE = process.env.SHOP_BASE_URL || "http://localhost:3457";
const WORKER = process.env.SHOP_WORKER_ID;
const PIN = process.env.SHOP_PIN;
const JOB = process.env.SHOP_JOB_ID;
const WORKER2 = process.env.SHOP_WORKER2_ID;
const PIN2 = process.env.SHOP_PIN2;
if (!WORKER || !PIN || !JOB || !WORKER2 || !PIN2) {
  console.error(
    "Set SHOP_WORKER_ID (admin), SHOP_PIN, SHOP_JOB_ID, SHOP_WORKER2_ID (non-admin), SHOP_PIN2"
  );
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

const cookie = await loginCookie(WORKER, PIN); // admin
const cookie2 = await loginCookie(WORKER2, PIN2); // measurer
const api = (body, ck = cookie) =>
  fetch(`${BASE}/shop/api/measure`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: ck },
    body: JSON.stringify(body),
  });

// tiny valid JPEG so photo uploads are real storage objects
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64"
);
async function uploadPhoto(label) {
  const form = new FormData();
  form.append("file", new File([JPEG], "t.jpg", { type: "image/jpeg" }));
  form.append("jobId", JOB);
  form.append("category", "Measurements");
  form.append("label", label);
  const res = await fetch(`${BASE}/shop/api/photo`, {
    method: "POST",
    headers: { cookie: cookie2 },
    body: form,
  });
  const d = await res.json();
  if (!res.ok || !d.path) throw new Error("photo upload failed");
  return d.path;
}

let pass = 0,
  fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) {
    pass++;
    console.log(`  ok  ${name}`);
  } else {
    fail++;
    console.log(`FAIL  ${name} ${extra}`);
  }
};

// Fully-valid, fully-complete straight-stair payload; control dims agree.
function completeData(photos) {
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
        rake: "",
        ctrlRise: "",
        ctrlRun: "",
      },
    ],
    posts: [],
    spiral: null,
    rail: {
      kind: "Guardrail",
      height: "36",
      side: "Both",
      extensions: "",
      returns: "loop ends",
      brackets: "",
    },
    materials: {
      post: '1-1/2" sq tube',
      topRail: "Molded cap rail",
      picket: '1/2" sq solid',
      picketSpacing: "4",
      bottomRail: "",
      finish: "DTM Epoxy",
      color: "Black",
      notes: "",
    },
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
      bottomSurface: "",
      topSurface: "",
      futureTopping: "",
      treadCovering: "",
      wallFinish: "",
      demoPending: "",
      verifyAfterFinishes: false,
      notes: "",
    },
    fab: {
      corners: "",
      flightConnection: "",
      bottomClearance: "",
      infill: "",
      splices: "one piece",
      maxPiece: "fits van",
      access: "",
      gate: "",
      touchup: "",
    },
    photos,
    annotations: {},
    connections: [],
  };
}

const SLOTS = ["overall_bottom", "overall_top", "bottom_term", "top_term", "left_side", "right_side"];
console.log("uploading real checklist photos…");
const realPaths = {};
for (const slot of SLOTS) realPaths[slot] = await uploadPhoto(`e2e ${slot}`);
const realPhotos = SLOTS.map((slot) => ({
  slot,
  path: realPaths[slot],
  takenAt: "2026-01-01T00:00:00Z",
}));
const fakePhotos = SLOTS.map((slot) => ({
  slot,
  path: `bogus/${slot}.jpg`,
  takenAt: "2026-01-01T00:00:00Z",
}));

// ---- validation basics -----------------------------------------------------
const anon = await fetch(`${BASE}/shop/api/measure`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type: "delete", id: "00000000-0000-0000-0000-000000000000" }),
});
check("401 without session", anon.status === 401);

const cr = await api({ type: "create", jobId: JOB, shape: "straight", steps1: 2, name: "API TEST" }, cookie2);
const { id } = await cr.json();
check("create returns id", cr.status === 200 && !!id);
check("update junk payload → 400", (await api({ type: "update", id, data: { hacked: true } })).status === 400);
check("submit incomplete → 422", (await api({ type: "submit", id, jobId: JOB }, cookie2)).status === 422);

// ---- red geometry blocks; contradictions save but can't submit -------------
const contradictory = completeData(realPhotos);
contradictory.overall.floorToFloor = "20";
check(
  "contradictory update saves (never auto-corrected)",
  (await api({ type: "update", id, jobId: JOB, data: contradictory }, cookie2)).status === 200
);
check("submit with red check → 422", (await api({ type: "submit", id, jobId: JOB }, cookie2)).status === 422);

// ---- photo verification ----------------------------------------------------
check(
  "fake photo paths save",
  (await api({ type: "update", id, jobId: JOB, data: completeData(fakePhotos) }, cookie2)).status === 200
);
check(
  "submit with unverifiable photos → 422",
  (await api({ type: "submit", id, jobId: JOB }, cookie2)).status === 422
);

// ---- clean submit by the measurer ------------------------------------------
const u = await api({ type: "update", id, jobId: JOB, data: completeData(realPhotos) }, cookie2);
const ud = await u.json();
check("complete update → 200 + in_progress", u.status === 200 && ud.status === "in_progress");
check(
  "CAS with stale base → 409",
  (
    await api(
      { type: "update", id, jobId: JOB, data: completeData(realPhotos), baseUpdatedAt: "2000-01-01T00:00:00+00:00" },
      cookie2
    )
  ).status === 409
);
check("submit complete sheet → 200", (await api({ type: "submit", id, jobId: JOB }, cookie2)).status === 200);

// ---- approval rules --------------------------------------------------------
check("approve as non-admin → 403", (await api({ type: "approve", id, jobId: JOB }, cookie2)).status === 403);

const ap = await api({ type: "approve", id, jobId: JOB });
const apd = await ap.json();
check("independent approve → 200 rev 1", ap.status === 200 && apd.rev === 1, JSON.stringify(apd));
check("approve again → 409 (not submitted)", (await api({ type: "approve", id, jobId: JOB })).status === 409);

// editing drops the approval
const e1 = await api({ type: "update", id, jobId: JOB, data: completeData(realPhotos) }, cookie2);
check("edit after approval → in_progress", e1.status === 200 && (await e1.json()).status === "in_progress");

// self-approval blocked: ADMIN submits, then tries to approve own sheet
check("admin submit → 200", (await api({ type: "submit", id, jobId: JOB })).status === 200);
const self = await api({ type: "approve", id, jobId: JOB });
check("self-approval → 409", self.status === 409, `${self.status}`);

// measurer resubmits → admin approves → rev bumps to 2
await api({ type: "update", id, jobId: JOB, data: completeData(realPhotos) }, cookie2);
await api({ type: "submit", id, jobId: JOB }, cookie2);
const ap2 = await api({ type: "approve", id, jobId: JOB });
check("re-approve → rev 2", ap2.status === 200 && (await ap2.json()).rev === 2);

// ---- yellow warnings need acknowledgment -----------------------------------
const yellow = completeData(realPhotos);
yellow.overall.floorToFloor = "14 1/2"; // riser sum 14 → off by 1/2 = VERIFY
await api({ type: "update", id, jobId: JOB, data: yellow }, cookie2);
await api({ type: "submit", id, jobId: JOB }, cookie2);
const noAck = await api({ type: "approve", id, jobId: JOB });
const noAckD = await noAck.json();
check("approve with yellow, no ack → 409 needsAck", noAck.status === 409 && noAckD.needsAck === true);
const acked = await api({ type: "approve", id, jobId: JOB, ackWarnings: true });
check("approve with ack → 200 rev 3", acked.status === 200 && (await acked.json()).rev === 3);

// ---- custom drawings need reference confirmation ---------------------------
const cc = await api({ type: "create", jobId: JOB, shape: "custom", name: "API CUSTOM" }, cookie2);
const customId = (await cc.json()).id;
const CSLOTS = ["overall_bottom", "overall_top", "bottom_term", "top_term"];
const customPhotos = CSLOTS.map((slot) => ({ slot, path: realPaths[slot], takenAt: "2026-01-01T00:00:00Z" }));
const customData = completeData(customPhotos);
customData.segments = [];
customData.plan = {
  points: [
    { x: 20, y: 20 },
    { x: 120, y: 20 },
    { x: 120, y: 120 },
    { x: 20, y: 120 },
  ],
  closed: true,
  segs: [
    { len: "100", note: "" },
    { len: "100", note: "" },
    { len: "100", note: "" },
    { len: "100", note: "" },
  ],
};
await api({ type: "update", id: customId, jobId: JOB, data: customData }, cookie2);
check("custom submit → 200", (await api({ type: "submit", id: customId, jobId: JOB }, cookie2)).status === 200);
const noRef = await api({ type: "approve", id: customId, jobId: JOB });
const noRefD = await noRef.json();
check("custom approve w/o confirm → 409 needsReference", noRef.status === 409 && noRefD.needsReference === true);
check(
  "custom approve with confirm → 200",
  (await api({ type: "approve", id: customId, jobId: JOB, confirmReference: true })).status === 200
);

// custom closure check: one wrong length ⇒ red ⇒ submit blocked
const badClose = structuredClone(customData);
badClose.plan.segs[0].len = "160";
await api({ type: "update", id: customId, jobId: JOB, data: badClose }, cookie2);
check(
  "custom bad closure → submit 422",
  (await api({ type: "submit", id: customId, jobId: JOB }, cookie2)).status === 422
);

// ---- connections & molding cross-check -------------------------------------
const cn = await api({ type: "create", jobId: JOB, shape: "straight", steps1: 2, name: "API CONN" }, cookie2);
const connId = (await cn.json()).id;
const connData = completeData(realPhotos);
connData.connections = [
  {
    id: "c1", where: "top right", attachTo: "existing_post", method: "clip",
    material: "Wood", columnSize: "5 1/2", molding: "3/4",
    lenAtTop: "60", lenAtMolding: "59 1/4", note: "",
  },
];
await api({ type: "update", id: connId, jobId: JOB, data: connData }, cookie2);
check("conn w/ consistent molding → submit 200", (await api({ type: "submit", id: connId, jobId: JOB }, cookie2)).status === 200);

const badConn = structuredClone(connData);
badConn.connections[0].lenAtMolding = "58"; // diff 2" vs molding 3/4" → red
await api({ type: "update", id: connId, jobId: JOB, data: badConn }, cookie2);
check("molding mismatch → submit 422", (await api({ type: "submit", id: connId, jobId: JOB }, cookie2)).status === 422);

const noMethod = structuredClone(connData);
noMethod.connections[0].method = "";
await api({ type: "update", id: connId, jobId: JOB, data: noMethod }, cookie2);
check("connection missing method → submit 422", (await api({ type: "submit", id: connId, jobId: JOB }, cookie2)).status === 422);
check("delete conn sheet → 200", (await api({ type: "delete", id: connId, jobId: JOB })).status === 200);

// ---- cleanup ---------------------------------------------------------------
check("delete → 200", (await api({ type: "delete", id, jobId: JOB })).status === 200);
check("delete custom → 200", (await api({ type: "delete", id: customId, jobId: JOB })).status === 200);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
