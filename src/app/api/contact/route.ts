import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CALL_US, CRM_API, formToken, resetFormCache, toE164 } from "@/lib/crm360";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  preferredContact: z.enum(["phone", "email"]),
  phone: z.string().trim().max(40).default(""),
  email: z.string().trim().max(254).default(""),
  serviceType: z.enum(["Fire Escape", "Stairs", "Railings", "Fences & Gates", "Structural Steel", "Welding & Repairs", "Balconies", "Custom Ironwork", "Other"]),
  projectAddress: z.string().trim().max(300).default(""),
  projectDescription: z.string().trim().min(1).max(5000),
  timeline: z.string().trim().max(100).default(""),
  source: z.string().trim().max(100).default(""),
  consent: z.boolean().default(false),
  website: z.string().max(200).default(""),
}).superRefine((data, ctx) => {
  if (data.email && !z.email().safeParse(data.email).success) {
    ctx.addIssue({ code: "custom", path: ["email"], message: "Please enter a valid email address." });
  }
  if (data.preferredContact === "email" && !data.email) {
    ctx.addIssue({ code: "custom", path: ["email"], message: "Please enter a valid email address." });
  }
  const digits = data.phone.replace(/\D/g, "");
  if ((data.preferredContact === "phone" || data.phone) && (!/^[+()0-9 .-]+$/.test(data.phone) || digits.length < 7 || digits.length > 15)) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: "Please enter a valid phone number." });
  }
});

export async function POST(request: NextRequest) {
  let input: unknown;
  try { input = await request.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
  }
  // Accept the previous form during deployments or from an already-open tab.
  if (input && typeof input === "object" && !("name" in input)) {
    const legacy = input as Record<string, unknown>;
    input = { ...legacy,
      name: [legacy.firstName, legacy.lastName].filter(v => typeof v === "string").join(" "),
      preferredContact: legacy.phone ? "phone" : "email",
    };
  }
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }
  const data = parsed.data;
  const [firstName, ...rest] = data.name.split(/\s+/);
  const answers: Record<string, string> = {
    first_name: firstName,
    preferred: data.preferredContact === "phone" ? "Phone call" : "Email",
    service: data.serviceType,
    details: data.projectDescription,
  };
  if (rest.length) answers.last_name = rest.join(" ");
  if (data.phone) answers.phone = toE164(data.phone);
  if (data.email) answers.email = data.email;
  if (data.projectAddress) answers.address = data.projectAddress;
  if (data.timeline) answers.timeline = data.timeline;
  if (data.source) answers.source = data.source;
  try {
    const submit = async () => fetch(`${CRM_API}/direct-submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: await formToken(),
        key: randomUUID(),
        answers,
        attribution: {},
        // Text permission only when the visitor asked to be called and ticked the box.
        smsConsent: data.preferredContact === "phone" && data.consent,
        emailConsent: false,
        consent: false,
        website: data.website,
        turnstileToken: "",
      }),
      signal: AbortSignal.timeout(15000),
    });
    let res = await submit();
    if (res.status === 401 || res.status === 403) {
      // The form was republished or its token expired early: fetch a fresh token once.
      resetFormCache();
      res = await submit();
    }
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `We could not save your request. ${CALL_US}` }, { status: res.status === 429 ? 429 : 502 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: `We could not save your request. ${CALL_US}` }, { status: 502 });
  }
}
