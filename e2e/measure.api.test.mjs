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
const uploadedPhotoIds = [];
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
  if (d.id) uploadedPhotoIds.push(d.id);
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
    posts: [
      {
        id: "p1", segIdx: 0, stepIdx: 0, pos: "", fromNosing: "3", fromEdge: "2",
        mount: "Core-drill", anchor: "Granite", plate: "", anchors: '1" hole x 4" deep',
        substrate: "granite 6", edgeDist: "", obstruction: "none",
      },
      {
        id: "p2", segIdx: 0, stepIdx: 1, pos: "", fromNosing: "3", fromEdge: "2",
        mount: "Core-drill", anchor: "Granite", plate: "", anchors: '1" hole x 4" deep',
        substrate: "granite 6", edgeDist: "", obstruction: "none",
      },
    ],
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
    spans: [
      {
        id: "sp1",
        label: "main rail",
        topSpan: "60",
        lowerSpan: "",
        start: freeEnd("p1"),
        end: freeEnd("p2"),
        note: "",
      },
    ],
  };
}

function freeEnd(postId = "p1") {
  return {
    attachTo: "free_post", method: "", postId, spanRef: "", material: "", backing: "",
    columnW: "", columnD: "", molding: "", moldingHeight: "", plumb: "",
    hardware: blankHw(), note: "",
  };
}
function blankHw() {
  return {
    fastener: "", qty: "", elevation: "", shopField: "",
    profile: "", thickness: "", holeDia: "", holeSpacing: "",
    edgeDist: "", embedment: "", orientation: "", weldSize: "",
  };
}
function columnEnd(extra = {}) {
  return {
    ...freeEnd(),
    attachTo: "existing_post", method: "clip", material: "Wood",
    columnW: "5 1/2", columnD: "5 1/2", molding: "3/4", moldingHeight: "6",
    hardware: {
      ...blankHw(),
      fastener: '3/8" lag', qty: "2", elevation: "34", shopField: "field_bolt",
      profile: 'L2x2x3/16 x 3"', thickness: "3/16", holeDia: "7/16",
      holeSpacing: "1 1/2", orientation: "vertical leg up",
    },
    ...extra,
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

// open drawing must block (closure can only be verified on closed shapes)
const openPlan = structuredClone(customData);
openPlan.plan.closed = false;
openPlan.plan.segs = openPlan.plan.segs.slice(0, 3);
await api({ type: "update", id: customId, jobId: JOB, data: openPlan }, cookie2);
check("open custom drawing → submit 422", (await api({ type: "submit", id: customId, jobId: JOB }, cookie2)).status === 422);

// custom closure check: one wrong length ⇒ red ⇒ submit blocked
const badClose = structuredClone(customData);
badClose.plan.segs[0].len = "160";
await api({ type: "update", id: customId, jobId: JOB, data: badClose }, cookie2);
check(
  "custom bad closure → submit 422",
  (await api({ type: "submit", id: customId, jobId: JOB }, cookie2)).status === 422
);

// ---- rail spans: mandatory endpoints, valid methods, dual-molding math -----
const cn = await api({ type: "create", jobId: JOB, shape: "straight", steps1: 2, name: "API SPAN" }, cookie2);
const spanId = (await cn.json()).id;
const termPhotoPathStart = await uploadPhoto("e2e term start");
const termPhotoPathEnd = await uploadPhoto("e2e term end");

// no spans at all → blocked
const noSpan = completeData(realPhotos);
noSpan.spans = [];
await api({ type: "update", id: spanId, jobId: JOB, data: noSpan }, cookie2);
check("no span defined → submit 422", (await api({ type: "submit", id: spanId, jobId: JOB }, cookie2)).status === 422);

// endpoint left undefined → blocked
const noEnd = completeData(realPhotos);
noEnd.spans[0].end = { ...freeEnd(), attachTo: "" };
await api({ type: "update", id: spanId, jobId: JOB, data: noEnd }, cookie2);
check("endpoint undefined → submit 422", (await api({ type: "submit", id: spanId, jobId: JOB }, cookie2)).status === 422);

// physically invalid combination (floor + clip fails schema-level? no — gate) → blocked
const badCombo = completeData(realPhotos);
badCombo.spans[0].end = { ...freeEnd(), attachTo: "floor", method: "clip", material: "Concrete" };
await api({ type: "update", id: spanId, jobId: JOB, data: badCombo }, cookie2);
check("floor+clip invalid combo → submit 422", (await api({ type: "submit", id: spanId, jobId: JOB }, cookie2)).status === 422);

// weld into a wood column → blocked
const weldWood = completeData(realPhotos);
weldWood.spans[0].end = columnEnd({ method: "weld" });
await api({ type: "update", id: spanId, jobId: JOB, data: weldWood }, cookie2);
check("weld into wood column → submit 422", (await api({ type: "submit", id: spanId, jobId: JOB }, cookie2)).status === 422);

// clip without hardware/photo → blocked
const noHw = completeData(realPhotos);
noHw.spans[0].end = columnEnd({ hardware: blankHw() });
noHw.spans[0].lowerSpan = "59 1/4";
await api({ type: "update", id: spanId, jobId: JOB, data: noHw }, cookie2);
check("clip without hardware → submit 422", (await api({ type: "submit", id: spanId, jobId: JOB }, cookie2)).status === 422);

// free_post end not linked to a measured post → blocked
const unlinked = completeData(realPhotos);
unlinked.spans[0].end = { ...freeEnd(""), postId: "" };
await api({ type: "update", id: spanId, jobId: JOB, data: unlinked }, cookie2);
check("free post without postId → submit 422", (await api({ type: "submit", id: spanId, jobId: JOB }, cookie2)).status === 422);

// clip without its fabrication dimensions → blocked
const noDims = completeData(realPhotos);
noDims.spans[0].end = columnEnd();
noDims.spans[0].lowerSpan = "59 1/4";
noDims.spans[0].end.hardware.profile = "";
noDims.photos = [
  ...realPhotos,
  { slot: "term_sp1_end", path: termPhotoPathEnd, takenAt: "2026-01-01T00:00:00Z" },
];
await api({ type: "update", id: spanId, jobId: JOB, data: noDims }, cookie2);
check("clip without profile dims → submit 422", (await api({ type: "submit", id: spanId, jobId: JOB }, cookie2)).status === 422);

// dual-molding span: 60 top, 58 1/2 lower, 3/4 + 3/4 moldings → consistent
const dual = completeData(realPhotos);
dual.spans[0].start = columnEnd();
dual.spans[0].end = columnEnd();
dual.spans[0].topSpan = "60";
dual.spans[0].lowerSpan = "58 1/2";
dual.photos = [
  ...realPhotos,
  { slot: "term_sp1_start", path: termPhotoPathStart, takenAt: "2026-01-01T00:00:00Z" },
  { slot: "term_sp1_end", path: termPhotoPathEnd, takenAt: "2026-01-01T00:00:00Z" },
];
await api({ type: "update", id: spanId, jobId: JOB, data: dual }, cookie2);
check("dual-molding consistent span → submit 200", (await api({ type: "submit", id: spanId, jobId: JOB }, cookie2)).status === 200);

// same span with a wrong lower measurement → red → blocked
const dualBad = structuredClone(dual);
dualBad.spans[0].lowerSpan = "57"; // diff 3" vs 1 1/2" of moldings
await api({ type: "update", id: spanId, jobId: JOB, data: dualBad }, cookie2);
check("dual-molding mismatch → submit 422", (await api({ type: "submit", id: spanId, jobId: JOB }, cookie2)).status === 422);
check("delete span sheet → 200", (await api({ type: "delete", id: spanId, jobId: JOB })).status === 200);

// ---- mixed assemblies: builder + curves + winders ---------------------------
const landingPhotoPath = await uploadPhoto("e2e landing");
function mixedData(photos) {
  const base = completeData(photos);
  const st = (w) => ({
    rise: "7", run: "10", nosing: "1",
    ...(w ? { winder: true, runIn: "6", runOut: "14", turnDeg: "30" } : {}),
  });
  base.segments = [
    {
      kind: "flight",
      steps: [st(), st(), st(true), st(true)],
      width: "42", angleDeg: "35", angleBreak: "",
      rake: "48 7/8", ctrlRise: "28", ctrlRun: "40",
    },
    { kind: "platform", length: "40", depth: "40", diag: "56 9/16", slope: "", slopeDir: "", turn: "left" },
    // 90° curve, R=48: chord = 67.88", arc = 75.40"
    { kind: "curve", radius: "48", chord: "67 7/8", arc: "75 3/8", sweepDeg: "90", rise: "", direction: "right", width: "42" },
    {
      kind: "flight",
      steps: [st(), st(), st()],
      width: "42", angleDeg: "35", angleBreak: "",
      rake: "36 5/8", ctrlRise: "21", ctrlRun: "30",
    },
  ];
  base.overall.floorToFloor = "49"; // 7 risers × 7"
  base.overall.totalRise = "49";
  base.posts = base.posts.map((po) => po); // core-drill posts stay on flight 0
  base.photos = [
    ...photos,
    { slot: "landing", path: landingPhotoPath, takenAt: "2026-01-01T00:00:00Z" },
  ];
  return base;
}

const mb = await api({ type: "create", jobId: JOB, shape: "builder", steps1: 4, name: "API MIXED" }, cookie2);
const mixedId = (await mb.json()).id;
check("builder create → 200", mb.status === 200 && !!mixedId);

// winder walkline run inconsistent with inside/outside → red → blocked
const badWinder = mixedData(realPhotos);
badWinder.segments[0].steps[2].runIn = "2";
badWinder.segments[0].steps[2].runOut = "24"; // avg 13 vs walkline 10 → red
await api({ type: "update", id: mixedId, jobId: JOB, data: badWinder }, cookie2);
check("inconsistent winder → submit 422", (await api({ type: "submit", id: mixedId, jobId: JOB }, cookie2)).status === 422);

// winder missing its outside run → gap → blocked
const gapWinder = mixedData(realPhotos);
gapWinder.segments[0].steps[2].runOut = "";
await api({ type: "update", id: mixedId, jobId: JOB, data: gapWinder }, cookie2);
check("winder missing field → submit 422", (await api({ type: "submit", id: mixedId, jobId: JOB }, cookie2)).status === 422);

// curve arc inconsistent with radius → red → blocked
const badCurve = mixedData(realPhotos);
badCurve.segments[2].arc = "82"; // vs calc 75.4 → off 6.6" → red
await api({ type: "update", id: mixedId, jobId: JOB, data: badCurve }, cookie2);
check("inconsistent curve arc → submit 422", (await api({ type: "submit", id: mixedId, jobId: JOB }, cookie2)).status === 422);

// fully consistent mixed assembly (winders, curve, two flights, landing) → OK
await api({ type: "update", id: mixedId, jobId: JOB, data: mixedData(realPhotos) }, cookie2);
const mixedSubmit = await api({ type: "submit", id: mixedId, jobId: JOB }, cookie2);
check("consistent mixed assembly → submit 200", mixedSubmit.status === 200, JSON.stringify(await mixedSubmit.json().catch(() => ({}))));
check("delete mixed → 200", (await api({ type: "delete", id: mixedId, jobId: JOB })).status === 200);

// ---- cleanup ---------------------------------------------------------------
check("delete → 200", (await api({ type: "delete", id, jobId: JOB })).status === 200);
check("delete custom → 200", (await api({ type: "delete", id: customId, jobId: JOB })).status === 200);

// remove the test photos this suite uploaded (records + storage objects)
let photoCleanupOk = true;
for (const pid of uploadedPhotoIds) {
  const r = await fetch(`${BASE}/shop/api/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ type: "photo_delete", id: pid }),
  });
  if (!r.ok) photoCleanupOk = false;
}
check(`test photos cleaned up (${uploadedPhotoIds.length})`, photoCleanupOk);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
