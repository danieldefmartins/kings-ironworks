// Deck perimeter sheets, and drawings made of several separate runs.
//
// The deck shape carries three checks that are the reason it exists:
//
//   anchorage   a post fixed to the deck boards alone levers straight out
//   guard       over 30" above grade the guard has a minimum height
//   turn sum    a closed outline's corners must add to a full turn, which is
//               what catches a corner nobody wrote down on an odd-shaped deck
//
// And the drawing has to hold MORE THAN ONE RUN, each of which may be open:
// a rail from the wall to the steps does not come back on itself.
//
//   SHOP_BASE_URL=http://localhost:3457 \
//   SHOP_WORKER_ID=... SHOP_PIN=... SHOP_JOB_ID=... node e2e/measure.deck.test.mjs

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

// ---------------------------------------------------------------- deck ----
console.log("\nDECK");
let d = await make("deck", "E2E DECK", 4);
check(!!d.data.deck, "deck block seeded");
check(d.data.deck.sides.length === 4, "four sides seeded", String(d.data.deck.sides.length));
check(d.data.segments.length === 0, "no stair segments on a deck");
check(!!d.data.plan, "a deck can be drawn as well");

let r = await submit(d);
check(r.gaps.includes("deck_mount"), "how the posts mount is required");
check(r.gaps.includes("deck_side_height"), "height above grade is required per side");
check(!r.gaps.includes("orientation"), "no stair datum question on a deck");
check(!r.gaps.includes("floor_change"), "no floor-change question on a deck");

// A 3-sided deck, 40" above grade, posts screwed to the decking with nothing
// behind them, and a 34" guard. Two reds: the anchorage and the guard height.
d = await save(d, (data) => {
  const dk = data.deck;
  dk.surface = "wood";
  dk.occupancy = "residential";
  dk.sides = dk.sides.slice(0, 3);
  dk.sides[0] = { ...dk.sides[0], label: "Front", length: "144", railed: true, heightAboveGrade: "40", turnDeg: "90", opening: "none" };
  dk.sides[1] = { ...dk.sides[1], label: "Side", length: "96", railed: true, heightAboveGrade: "38", turnDeg: "90", opening: "stairs", openingWidth: "42" };
  dk.sides[2] = { ...dk.sides[2], label: "House", length: "144", railed: false, heightAboveGrade: "40", turnDeg: "0", opening: "none" };
  dk.totalPerimeter = "240"; // 144 + 96 railed
  dk.mount = "surface";
  dk.blocking = ""; // nothing behind the post — this is the failure
  dk.guardHeight = "34";
  dk.picketSpacing = "3 7/8";
  dk.postSpacing = "72";
  dk.corners = "Post at each corner";
  dk.deckingThickness = "1";
  dk.rimJoistSize = "2x10";
  dk.rimMaterial = "PT SYP";
  dk.stairSheets = "Sheet 2";
});
r = await submit(d);
check(r.reds.includes("deck_post_anchorage"), "a post on the decking alone is red", r.reds.join(",") || "none");
check(r.reds.includes("deck_guard_height"), "34\" guard on a 40\" deck is red");
check(!r.gaps.includes("deck_side_length"), "side lengths accepted");

// Give the post something to hold and raise the guard: both clear.
d = await save(d, (data) => {
  data.deck.blocking = "Solid 2x blocking each bay, through-bolted";
  data.deck.mount = "through_bolt";
  data.deck.guardHeight = "36";
});
r = await submit(d);
check(!r.reds.includes("deck_post_anchorage"), "through-bolted to the rim clears", r.reds.join(",") || "none");
check(!r.reds.includes("deck_guard_height"), "36\" guard clears residential");

// The perimeter has to add up: sides say 240, tape says 268.
d = await save(d, (data) => void (data.deck.totalPerimeter = "268"));
r = await submit(d);
check(r.reds.includes("deck_perimeter_sum"), "sides that do not match the tape are red", r.reds.join(",") || "none");
d = await save(d, (data) => void (data.deck.totalPerimeter = "240"));

// An opening cannot be wider than the side it is cut from.
d = await save(d, (data) => void (data.deck.sides[1].openingWidth = "120"));
r = await submit(d);
check(r.reds.includes("deck_opening_fit"), "an opening wider than its side is red");
d = await save(d, (data) => void (data.deck.sides[1].openingWidth = "42"));

// An irregular closed deck: the corners must come to a full turn. Three 90s
// and a 45 is 315 — a corner is missing.
d = await save(d, (data) => {
  const dk = data.deck;
  dk.closedLoop = true;
  dk.sides[0].turnDeg = "90";
  dk.sides[1].turnDeg = "90";
  dk.sides[2].turnDeg = "135";
});
r = await submit(d);
check(r.reds.includes("deck_turn_sum"), "corners that do not close are red", r.reds.join(",") || "none");
d = await save(d, (data) => {
  data.deck.sides[0].turnDeg = "90";
  data.deck.sides[1].turnDeg = "135";
  data.deck.sides[2].turnDeg = "135";
});
r = await submit(d);
check(!r.reds.includes("deck_turn_sum"), "90 + 135 + 135 = 360 closes", r.reds.join(",") || "none");

// A side left unrailed that is high enough to need a guard warns but never
// blocks — it is usually the house wall, and only the measurer knows.
check(!r.reds.includes("deck_unrailed_height"), "an unrailed high side warns, never blocks");

// ------------------------------------------------------- separate runs ----
console.log("\nDRAWN RUNS");
let c = await make("custom", "E2E RUNS");

// Two runs, both OPEN: wall-to-steps, then the run continuing past them.
c = await save(c, (data) => {
  data.plan = {
    points: [], closed: false, segs: [],
    paths: [
      {
        id: "run-a", label: "Wall to steps", closed: false,
        points: [{ x: 20, y: 20 }, { x: 100, y: 20 }, { x: 100, y: 90 }],
        segs: [
          { len: "84", note: "", kind: "level", steps: "", rise: "", run: "", width: "", stepMeasures: [] },
          { len: "60", note: "", kind: "level", steps: "", rise: "", run: "", width: "", stepMeasures: [] },
        ],
      },
      {
        id: "run-b", label: "Past the steps", closed: false,
        points: [{ x: 160, y: 90 }, { x: 240, y: 90 }],
        segs: [{ len: "72", note: "", kind: "level", steps: "", rise: "", run: "", width: "", stepMeasures: [] }],
      },
    ],
  };
});
r = await submit(c);
check(!r.reds.includes("plan_closure"), "two OPEN runs are not a closure failure", r.reds.join(",") || "none");

// Persistence is proved through behaviour, not by reading internals. Closing
// the SECOND run with a length that cannot close it can only raise a closure
// failure if run B survived the save with its own points and segments.
c = await save(c, (data) => {
  data.plan.paths[1].closed = true;
  data.plan.paths[1].points = [{ x: 160, y: 90 }, { x: 240, y: 90 }, { x: 240, y: 150 }];
  data.plan.paths[1].segs = [
    { len: "72", note: "", kind: "level", steps: "", rise: "", run: "", width: "", stepMeasures: [] },
    { len: "54", note: "", kind: "level", steps: "", rise: "", run: "", width: "", stepMeasures: [] },
    { len: "10", note: "", kind: "level", steps: "", rise: "", run: "", width: "", stepMeasures: [] },
  ];
});
r = await submit(c);
check(r.reds.includes("plan_closure"), "run B closing badly is caught — the second run persisted", r.reds.join(",") || "none");

// Put run B back to what it was: an ordinary open run, which is never a failure.
c = await save(c, (data) => {
  data.plan.paths[1].closed = false;
  data.plan.paths[1].points = [{ x: 160, y: 90 }, { x: 240, y: 90 }];
  data.plan.paths[1].segs = [{ len: "72", note: "", kind: "level", steps: "", rise: "", run: "", width: "", stepMeasures: [] }];
});
r = await submit(c);
check(!r.reds.includes("plan_closure"), "and reopening it clears again", r.reds.join(",") || "none");

// A run the measurer DID close still has to close with the lengths entered:
// a 100x70 rectangle drawn but dimensioned 84/60/84/60 does not.
c = await save(c, (data) => {
  data.plan.paths.push({
    id: "run-c", label: "Deck outline", closed: true,
    points: [{ x: 20, y: 140 }, { x: 120, y: 140 }, { x: 120, y: 210 }, { x: 20, y: 210 }],
    segs: [
      { len: "84", note: "", kind: "level", steps: "", rise: "", run: "", width: "", stepMeasures: [] },
      { len: "60", note: "", kind: "level", steps: "", rise: "", run: "", width: "", stepMeasures: [] },
      { len: "120", note: "", kind: "level", steps: "", rise: "", run: "", width: "", stepMeasures: [] },
      { len: "60", note: "", kind: "level", steps: "", rise: "", run: "", width: "", stepMeasures: [] },
    ],
  });
});
r = await submit(c);
check(r.reds.includes("plan_closure"), "a CLOSED run that does not close is still red", r.reds.join(",") || "none");

// Fix only the closed run; the open ones were never the problem.
c = await save(c, (data) => {
  const outline = data.plan.paths.find((p) => p.id === "run-c");
  outline.segs[2].len = "84";
});
r = await submit(c);
check(!r.reds.includes("plan_closure"), "correcting the closed run clears it", r.reds.join(",") || "none");

// ------------------------------------------------ points on drawn lines ----
// Custom sheets could never carry posts, columns, walls or clips: the post
// model addressed a tread, which a drawn line does not have.
console.log("\nPOINTS ON DRAWN LINES");
c = await save(c, (data) => {
  data.posts = [
    {
      id: "pt-1", pointType: "railing_post", side: "",
      segIdx: 0, stepIdx: null,
      pathId: "run-a", planSegIdx: 1,
      pos: "36", distanceFromFirst: "", fromNosing: "", fromEdge: "2",
      mount: "Base plate", anchor: "Concrete",
      plate: "", anchors: "", substrate: "", edgeDist: "", obstruction: "",
      existingW: "", existingD: "", skirtProjection: "", skirtHeight: "",
      infillGap: "", columnToWall: "", columnToPlatformEdge: "", clipDetail: "",
    },
    {
      id: "pt-2", pointType: "existing_post", side: "",
      segIdx: 0, stepIdx: null,
      pathId: "run-b", planSegIdx: 0,
      pos: "12", distanceFromFirst: "", fromNosing: "", fromEdge: "1",
      mount: "", anchor: "Wood",
      plate: "", anchors: "", substrate: "", edgeDist: "", obstruction: "",
      existingW: "6", existingD: "6",
      // a trim that projects proud of the column face — the sphere check
      // must still run on a drawn shape, not just on stairs
      skirtProjection: "3/4", skirtHeight: "8",
      infillGap: "4", columnToWall: "", columnToPlatformEdge: "", clipDetail: "",
    },
  ];
});
r = await submit(c);
check(
  r.reds.includes("skirt_clearance"),
  "a trimmed column on a DRAWN run still fails the 4\" sphere — the point persisted",
  r.reds.join(",") || "none"
);
c = await save(c, (data) => void (data.posts[1].infillGap = "3 1/4"));
r = await submit(c);
check(!r.reds.includes("skirt_clearance"), "and 3 1/4\" to the trim face clears", r.reds.join(",") || "none");

// A legacy single-run drawing still loads.
let legacy = await make("custom", "E2E LEGACY");
legacy = await save(legacy, (data) => {
  data.plan = {
    closed: true,
    points: [{ x: 20, y: 20 }, { x: 120, y: 20 }, { x: 120, y: 90 }, { x: 20, y: 90 }],
    segs: [
      { len: "84", note: "", kind: "level", steps: "", rise: "", run: "", width: "", stepMeasures: [] },
      { len: "60", note: "", kind: "level", steps: "", rise: "", run: "", width: "", stepMeasures: [] },
      { len: "84", note: "", kind: "level", steps: "", rise: "", run: "", width: "", stepMeasures: [] },
      { len: "60", note: "", kind: "level", steps: "", rise: "", run: "", width: "", stepMeasures: [] },
    ],
  };
});
// The legacy drawing above closes correctly (84/60/84/60 on a 100x70 sketch is
// scale-independent), so it must read as closed and pass — proving the
// single-run fields are still understood without a `paths` array.
let rl = await submit(legacy);
check(!rl.reds.includes("plan_closure"), "a legacy single-run drawing still checks out", rl.reds.join(",") || "none");
legacy = await save(legacy, (data) => void (data.plan.segs[2].len = "120"));
rl = await submit(legacy);
check(rl.reds.includes("plan_closure"), "and breaking it is still caught", rl.reds.join(",") || "none");

// ---------------------------------------------------------------- clean ----
for (const id of created) await api({ type: "delete", id, jobId: JOB });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
