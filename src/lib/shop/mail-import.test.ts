// The Mac mini mailbox importer (scripts/mail-import) — parsing and the rules
// it applies, on synthetic .emlx files.
import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readEmlx, readEmlxHeaders, decodeWords, parseParams } from "../../../scripts/mail-import/emlx.mjs";
import { inboundMatch, planMessage, refreshIndex } from "../../../scripts/mail-import/import-mail.mjs";

const root = mkdtempSync(join(tmpdir(), "emlx-test-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const photo = Buffer.alloc(40_000, 7);
const tinyLogo = Buffer.alloc(2_000, 1);

function emlx(dir: string, name: string, rfc822: string) {
  mkdirSync(dir, { recursive: true });
  const body = Buffer.from(rfc822.replace(/\n/g, "\r\n"), "latin1");
  const path = join(dir, name);
  writeFileSync(path, Buffer.concat([Buffer.from(`${body.length}\n`), body, Buffer.from("<?xml version=\"1.0\"?><plist></plist>")]));
  return path;
}

const msgDir = join(root, "All Mail.mbox", "X", "Data", "1", "Messages");
const full = emlx(msgDir, "101.emlx", `From: =?UTF-8?Q?Rachel_McVittie?= <rachel@gmail.com>
To: Kings Iron works <info@kingsironworks.com>
Cc: Elizabeth <esmcvittie@comcast.net>
Subject: Re: design
Date: Fri, 9 Oct 2026 15:23:50 -0400
Message-ID: <abc@mail.gmail.com>
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="B1"

--B1
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: quoted-printable

We approve option B. The deposit of $2,000 is on the way.=20

On Thu, Oct 8, 2026 at 2:16 PM Kings Iron works <info@kingsironworks.com> wrote:
> Total is $9,000
--B1
Content-Type: image/jpeg; name="IMG_1.jpg"
Content-Disposition: attachment; filename="IMG_1.jpg"
Content-Transfer-Encoding: base64

${photo.toString("base64")}
--B1
Content-Type: image/png
Content-Disposition: inline; filename="image001.png"
Content-Transfer-Encoding: base64

${tinyLogo.toString("base64")}
--B1
Content-Type: application/pdf; name="estimate.pdf"
Content-Disposition: attachment; filename="estimate.pdf"
Content-Transfer-Encoding: base64

${Buffer.alloc(50_000, 3).toString("base64")}
--B1--
`);

// A partial message: Mail stored the attachment as a file beside it.
const partial = emlx(msgDir, "102.partial.emlx", `From: Rachel <rachel@gmail.com>
To: info@kingsironworks.com
Cc: esmcvittie@comcast.net
Subject: =?utf-8?B?UGhvdG9zIOKAkyBzdGFpcnM=?=
Message-ID: <def@mail.gmail.com>
Content-Type: multipart/mixed; boundary="B2"

--B2
Content-Type: text/plain

Here are the stairs.
--B2
Content-Type: image/png; name="Screenshot.png"
Content-Disposition: attachment; filename*=utf-8''Screenshot%20at%207.24%E2%80%AFPM.png

--B2--
`);
const attDir = join(root, "All Mail.mbox", "X", "Data", "1", "Attachments", "102", "2");
mkdirSync(attDir, { recursive: true });
writeFileSync(join(attDir, "Screenshot at 7.24 PM.png"), photo);

const outbound = emlx(msgDir, "103.emlx", `From: Kings Iron works <info@kingsironworks.com>
To: esmcvittie@comcast.net
Subject: Estimate
Message-ID: <ours@mail.gmail.com>
Content-Type: text/plain

Approved estimate attached, total $9,000.
`);

describe("emlx parsing", () => {
  it("decodes headers, text and inline attachments", () => {
    const m = readEmlx(full);
    expect(m.from).toBe("Rachel McVittie <rachel@gmail.com>");
    expect(m.messageId).toBe("<abc@mail.gmail.com>");
    expect(m.text).toContain("We approve option B");
    expect(m.files.map((f: { name: string }) => f.name)).toEqual(["IMG_1.jpg", "image001.png", "estimate.pdf"]);
    expect(m.files[0].bytes.length).toBe(photo.length);
  });
  it("finds attachment files Mail stored beside a partial message", () => {
    const m = readEmlx(partial);
    expect(m.subject).toBe("Photos – stairs");
    expect(m.files.map((f: { name: string }) => f.name)).toEqual(["Screenshot at 7.24 PM.png"]);
  });
  it("reads headers cheaply for the index", () => {
    expect(readEmlxHeaders(partial).cc).toBe("esmcvittie@comcast.net");
  });
  it("decodes RFC 2047 words and RFC 2231 params", () => {
    expect(decodeWords("=?utf-8?Q?Ol=C3=A1?=")).toBe("Olá");
    expect((parseParams("attachment; filename*=utf-8''a%20b.jpg").params as Record<string, string>).filename).toBe("a b.jpg");
  });
});

describe("mail import rules", () => {
  const jobEmails = ["esmcvittie@comcast.net"];
  it("matches inbound mail where the job address is sender or copied, never our own mail", () => {
    expect(inboundMatch(readEmlxHeaders(full), jobEmails)).toBe(true);
    expect(inboundMatch(readEmlxHeaders(outbound), jobEmails)).toBe(false);
    expect(inboundMatch(readEmlxHeaders(full), ["someone@else.com"])).toBe(false);
  });
  it("imports the photo, skips the logo and PDF, and redacts the approval note", () => {
    const plan = planMessage(readEmlx(full));
    expect(plan.images.map((i: { name: string }) => i.name)).toEqual(["IMG_1.jpg"]);
    expect(plan.images[0].sourceRef).toMatch(/^email:sha1:[0-9a-f]{40}$/);
    expect(plan.note?.body).toContain("approve option B");
    expect(plan.note?.body).not.toMatch(/2,000|9,000/);
  });
  it("a message without approval language yields photos but no note", () => {
    const plan = planMessage(readEmlx(partial));
    expect(plan.images).toHaveLength(1);
    expect(plan.note).toBeNull();
  });
  it("indexes incrementally", () => {
    const state = { index: {}, done: {} };
    expect(refreshIndex(state, [join(root, "All Mail.mbox")])).toBe(3);
    expect(refreshIndex(state, [join(root, "All Mail.mbox")])).toBe(0);
  });
});
