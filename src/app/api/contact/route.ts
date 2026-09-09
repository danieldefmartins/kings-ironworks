import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Routing stays on the server; visitors cannot choose another CRM account.
const GHL_LOCATION_ID = "rJsKSnzzxWdCgDCq21rI";
const CUSTOM_FIELDS = {
  serviceType: "nuvjob3P8tJaWYgTM7Ij",
  projectAddress: "JLi4GRVaRao06kcNtBhA",
  projectDescription: "PcBIetyHt2Jm57sMQIqD",
  timeline: "7okj02EErxszzbHAEYvB",
  source: "UCThj36vlVaeVXvC4JWB",
};
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
}).superRefine((data, ctx) => {
  if (data.preferredContact === "email" && !z.email().safeParse(data.email).success) {
    ctx.addIssue({ code: "custom", path: ["email"], message: "Please enter a valid email address." });
  }
  const digits = data.phone.replace(/\D/g, "");
  if (data.preferredContact === "phone" && (!/^[+()0-9 .-]+$/.test(data.phone) || digits.length < 7 || digits.length > 15)) {
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
  const token = process.env.GHL_PIT_TOKEN;
  if (!token) {
    return NextResponse.json({ success: false, error: "Please call (617) 404-2589 to request your quote." }, { status: 503 });
  }
  const data = parsed.data;
  const [firstName, ...rest] = data.name.split(/\s+/);
  const smsConsent = data.preferredContact === "phone" && data.consent;
  const description = `${data.projectDescription}\n\nPreferred contact: ${data.preferredContact === "phone" ? "Phone call" : "Email"}\nSMS consent: ${smsConsent ? "Yes — appointment reminders, project updates, and follow-ups" : "Not given"}\nSubmitted: ${new Date().toISOString()}`;
  try {
    const res = await fetch("https://services.leadconnectorhq.com/contacts/", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28", "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName, ...(rest.length ? { lastName: rest.join(" ") } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.email ? { email: data.email } : {}),
        locationId: GHL_LOCATION_ID,
        tags: ["website-form", data.serviceType.toLowerCase().replace(/\s+/g, "-"), `preferred-contact-${data.preferredContact}`],
        // Never enable SMS automatically when permission was not given.
        ...(!smsConsent ? { dndSettings: { SMS: { status: "active", message: "SMS consent not provided on website quote form" } } } : {}),
        customFields: Object.entries(CUSTOM_FIELDS).map(([key, id]) => ({
          id, fieldValue: key === "projectDescription" ? description : data[key as keyof typeof CUSTOM_FIELDS],
        })),
        source: "website-form",
      }),
      signal: AbortSignal.timeout(15000),
    });
    const result = await res.json();
    if (!res.ok || !result.contact?.id) {
      return NextResponse.json({ success: false, error: "We could not save your request. Please try again or call (617) 404-2589." }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "We could not save your request. Please try again or call (617) 404-2589." }, { status: 502 });
  }
}
