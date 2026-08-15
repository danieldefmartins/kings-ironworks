// Tenant isolation proof. Run TWO app instances against the same database:
//   ORG_A_BASE — the primary org (e.g. KIW),          default http://localhost:3457
//   ORG_B_BASE — the TEST org (SHOP_ORG_ID=test org), default http://localhost:3458
// Verifies that org B's instance can see NOTHING belonging to org A and vice
// versa: logins, jobs, sheets, photos, approvals.
//
// Env: A_WORKER/A_PIN (org A worker+pin), A_JOB (org A job id),
//      B_WORKER/B_PIN (org B ADMIN), B_JOB (org B job id).
const A = process.env.ORG_A_BASE || "http://localhost:3457";
const B = process.env.ORG_B_BASE || "http://localhost:3458";
const A_WORKER = process.env.A_WORKER;
const A_PIN = process.env.A_PIN;
const A_JOB = process.env.A_JOB;
const B_WORKER = process.env.B_WORKER;
const B_PIN = process.env.B_PIN;
const B_JOB = process.env.B_JOB;
if (!A_WORKER || !A_PIN || !A_JOB || !B_WORKER || !B_PIN || !B_JOB) {
  console.error("Set A_WORKER, A_PIN, A_JOB, B_WORKER, B_PIN, B_JOB");
  process.exit(2);
}

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} ${extra}`); }
};

async function login(base, workerId, pin) {
  const res = await fetch(`${base}/shop/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workerId, pin }),
  });
  return { status: res.status, cookie: res.headers.get("set-cookie")?.split(";")[0] || "" };
}
const api = (base, cookie, body) =>
  fetch(`${base}/shop/api/measure`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(body),
  });

// 1) logins are org-scoped: an org-A worker cannot log into org-B's instance
const aOnA = await login(A, A_WORKER, A_PIN);
check("org A worker logs into org A", aOnA.status === 200);
const aOnB = await login(B, A_WORKER, A_PIN);
check("org A worker REJECTED by org B instance", aOnB.status === 401);
const bOnB = await login(B, B_WORKER, B_PIN);
check("org B worker logs into org B", bOnB.status === 200);
const bOnA = await login(A, B_WORKER, B_PIN);
check("org B worker REJECTED by org A instance", bOnA.status === 401);

// 2) jobs are invisible across orgs
const crossCreate = await api(B, bOnB.cookie, {
  type: "create", jobId: A_JOB, shape: "straight", steps1: 2, name: "CROSS",
});
check("org B cannot create a sheet on org A's job", crossCreate.status === 404);

// 3) a sheet created in org B is unreachable from org A
const mk = await api(B, bOnB.cookie, {
  type: "create", jobId: B_JOB, shape: "straight", steps1: 2, name: "ISO TEST",
});
const { id: bSheet } = await mk.json();
check("org B creates its own sheet", mk.status === 200 && !!bSheet);

const crossRead = await api(A, aOnA.cookie, {
  type: "rename", id: bSheet, name: "stolen",
});
check("org A cannot touch org B's sheet", crossRead.status === 404);
const crossDelete = await api(A, aOnA.cookie, { type: "delete", id: bSheet });
check("org A cannot delete org B's sheet", crossDelete.status === 404);
const crossSubmit = await api(A, aOnA.cookie, { type: "submit", id: bSheet });
check("org A cannot submit org B's sheet", crossSubmit.status === 404);
const crossApprove = await api(A, aOnA.cookie, { type: "approve", id: bSheet });
check("org A cannot approve org B's sheet", [403, 404].includes(crossApprove.status));

// 4) photos cannot be attached to another org's job
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64"
);
const form = new FormData();
form.append("file", new File([JPEG], "x.jpg", { type: "image/jpeg" }));
form.append("jobId", A_JOB);
form.append("category", "Measurements");
form.append("label", "cross-org attempt");
const crossPhoto = await fetch(`${B}/shop/api/photo`, {
  method: "POST",
  headers: { cookie: bOnB.cookie },
  body: form,
});
check("org B cannot upload a photo to org A's job", crossPhoto.status === 404);

// 5) revision pages are org-scoped (any rev URL under org A for B's sheet → 404)
const revPage = await fetch(`${A}/shop/job/${B_JOB}/measure/${bSheet}/rev/1`, {
  headers: { cookie: aOnA.cookie },
});
check("org A cannot open org B revision URL", revPage.status === 404);

// cleanup
await api(B, bOnB.cookie, { type: "delete", id: bSheet, jobId: B_JOB });

// 6) login throttling: 5 bad PINs lock a (dedicated) worker temporarily
const LOCK_WORKER = process.env.B_LOCK_WORKER;
if (LOCK_WORKER) {
  for (let i = 0; i < 5; i++) await login(B, LOCK_WORKER, "0000");
  const locked = await login(B, LOCK_WORKER, process.env.B_LOCK_PIN || "9003");
  check("5 failed PINs → temporary lockout (429)", locked.status === 429, `${locked.status}`);
} else {
  console.log("  --  skipped lockout test (B_LOCK_WORKER not set)");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
