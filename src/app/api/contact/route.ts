import { NextRequest, NextResponse } from "next/server";

const GHL_PIT = process.env.GHL_PIT_TOKEN || "";
const GHL_CUSTOM_FIELDS = {
  serviceType: "nuvjob3P8tJaWYgTM7Ij",
  projectAddress: "JLi4GRVaRao06kcNtBhA",
  projectDescription: "PcBIetyHt2Jm57sMQIqD",
  timeline: "7okj02EErxszzbHAEYvB",
  source: "UCThj36vlVaeVXvC4JWB",
};

interface ContactFormData {
  locationId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  serviceType: string;
  projectAddress: string;
  projectDescription: string;
  timeline: string;
  source: string;
}

async function createGHLContact(data: ContactFormData) {
  const body = {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    email: data.email,
    locationId: data.locationId,
    tags: ["website-form", data.serviceType.toLowerCase().replace(/\s+/g, "-")],
    customFields: [
      { id: GHL_CUSTOM_FIELDS.serviceType, value: data.serviceType },
      { id: GHL_CUSTOM_FIELDS.projectAddress, value: data.projectAddress },
      { id: GHL_CUSTOM_FIELDS.projectDescription, value: data.projectDescription },
      { id: GHL_CUSTOM_FIELDS.timeline, value: data.timeline },
      { id: GHL_CUSTOM_FIELDS.source, value: data.source },
    ],
    source: "website-form",
  };

  const res = await fetch("https://services.leadconnectorhq.com/contacts/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GHL_PIT}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const data: ContactFormData = await request.json();
    const result = await createGHLContact(data);

    if (result.contact) {
      return NextResponse.json({ success: true, contactId: result.contact.id });
    } else {
      return NextResponse.json(
        { success: false, error: result.message || "Failed to create contact" },
        { status: 400 },
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
