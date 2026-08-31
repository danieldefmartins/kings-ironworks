#!/usr/bin/env node
// Deploy the current HEAD to the Railway `kiw` service and wait for it.
//
//   node scripts/deploy.mjs            # deploy HEAD
//   node scripts/deploy.mjs <sha>      # deploy a specific commit
//
// Auth, in order of preference:
//
//   1. RAILWAY_TOKEN — a project token from the Railway dashboard
//      (Project → Settings → Tokens). These do NOT expire, which is the
//      whole point: the CLI login token dies after about three days and has
//      interrupted every deploy session so far.
//   2. ~/.railway/config.json — whatever `railway login` last wrote. Works,
//      but expect to re-run `railway login` every few days.
//
// The commit must already be pushed: Railway builds from GitHub, not from
// the working tree. `railway up` is not an option here — public/ is ~1.6 GB
// and blows the upload limit.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const API = "https://backboard.railway.com/graphql/v2";
const SERVICE_ID = "693109ba-ad77-4b15-9040-e05ed2e14dec";
const ENVIRONMENT_ID = "1ea4e56d-8b75-456c-81bb-9525dd16ba2a";
const PROJECT_ID = "71f01ca9-22d5-47ac-b7ef-3eba571c78f7";

function token() {
  if (process.env.RAILWAY_TOKEN) return { value: process.env.RAILWAY_TOKEN, from: "RAILWAY_TOKEN" };
  try {
    const cfg = JSON.parse(readFileSync(join(homedir(), ".railway", "config.json"), "utf8"));
    const t = cfg?.user?.accessToken || cfg?.user?.token;
    if (t) return { value: t, from: "railway login" };
  } catch {
    /* fall through to the error below */
  }
  return null;
}

async function gql(auth, query) {
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json().catch(() => null);
  if (!json || json.errors) {
    const msg = json?.errors?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json.data;
}

const auth = token();
if (!auth) {
  console.error("No Railway credentials.\n  Set RAILWAY_TOKEN (a non-expiring project token), or run: railway login");
  process.exit(1);
}

const sha = process.argv[2] || execSync("git rev-parse HEAD").toString().trim();
const subject = execSync(`git log -1 --format=%s ${sha}`).toString().trim();

// Refuse to deploy something the remote has never seen — Railway would build
// a commit that does not exist and fail confusingly.
const onRemote = execSync(`git branch -r --contains ${sha} 2>/dev/null || true`).toString().trim();
if (!onRemote) {
  console.error(`${sha.slice(0, 7)} is not on any remote branch. Push first.`);
  process.exit(1);
}

console.log(`auth:   ${auth.from}`);
console.log(`deploy: ${sha.slice(0, 7)} — ${subject}`);

let id;
try {
  const d = await gql(
    auth.value,
    `mutation{serviceInstanceDeployV2(serviceId:"${SERVICE_ID}",environmentId:"${ENVIRONMENT_ID}",commitSha:"${sha}")}`
  );
  id = d.serviceInstanceDeployV2;
} catch (e) {
  const hint =
    auth.from === "railway login"
      ? "\n  The CLI token expires after a few days. Run `railway login`, or set a project token as RAILWAY_TOKEN to stop this recurring."
      : "";
  console.error(`Deploy request rejected: ${e.message}${hint}`);
  process.exit(1);
}

process.stdout.write(`status: ${id} `);
const started = Date.now();
for (;;) {
  const d = await gql(auth.value, `query{deployment(id:"${id}"){status}}`);
  const s = d.deployment?.status;
  if (s === "SUCCESS") {
    console.log(`\n✓ SUCCESS in ${Math.round((Date.now() - started) / 1000)}s`);
    break;
  }
  if (s === "FAILED" || s === "CRASHED") {
    console.log(`\n✗ ${s} — https://railway.com/project/${PROJECT_ID}`);
    process.exit(1);
  }
  process.stdout.write(".");
  await new Promise((r) => setTimeout(r, 15000));
}
