import { z } from "zod";

export const APPLICATION_ROLES = ["Fabricator", "Welder", "Installer", "Shop helper", "Painter / finisher", "Driver", "Other"] as const;
export const APPLICATION_SKILLS = ["MIG welding", "TIG welding", "Stick welding", "Fabrication", "Installation", "Reading drawings", "Measuring", "Grinding / finishing", "Painting", "Driving / deliveries"] as const;
const required = (max = 120) => z.string().trim().min(1, "Complete all required fields.").max(max);
const optional = (max = 500) => z.string().trim().max(max).default("");
const phone = required(40).refine(v => /^[+()0-9 .-]+$/.test(v) && v.replace(/\D/g, "").length >= 7 && v.replace(/\D/g, "").length <= 15, "Enter a valid phone number.");
export const applicationSchema = z.object({
  fullName: required(), preferredName: optional(80), phone, email: z.email().trim().max(160),
  street: required(200), unit: optional(50), city: required(100), state: required(80), postalCode: required(20),
  lang: z.enum(["en", "pt", "es"]), languages: optional(150),
  emergencyName: required(), emergencyPhone: phone, emergencyRelationship: required(80),
  position: z.enum(APPLICATION_ROLES), experienceYears: z.number().min(0).max(80),
  skills: z.array(z.enum(APPLICATION_SKILLS)).max(APPLICATION_SKILLS.length), certifications: optional(1000),
  experience: required(2000), previousEmployer: optional(150), previousRole: optional(100),
  referenceName: optional(120), referencePhone: optional(40),
  availableStart: z.iso.date(), availability: required(500), transportation: z.enum(["yes", "no", "discuss"]),
  zelleContact: optional(160).refine(v => !v || z.email().safeParse(v).success || (/^[+()0-9 .-]+$/.test(v) && /^(1)?\d{10}$/.test(v.replace(/\D/g, ""))), "Enter the US phone number or email registered with Zelle."),
  zelleName: optional(120),
  notes: optional(2000), consent: z.literal(true, { error: "Confirm your information before submitting." }),
}).refine(d => !d.zelleContact || !!d.zelleName, { message: "Enter the name registered on the Zelle account.", path: ["zelleName"] });
export type WorkerApplicationData = z.infer<typeof applicationSchema>;
export type WorkerApplication = { id: string; full_name: string; email: string; phone: string; status: "pending" | "approved" | "declined"; data: WorkerApplicationData; created_at: string; reviewed_at: string | null; review_note: string | null; worker_id: string | null };
export const applicationReviewSchema = z.discriminatedUnion("decision", [
  z.object({ id: z.uuid(), decision: z.literal("approved"), role: z.enum(APPLICATION_ROLES), hourlyRate: z.number().positive().max(1000), pin: z.string().regex(/^\d{4,8}$/, "Use a 4–8 digit PIN."), note: optional(1000) }),
  z.object({ id: z.uuid(), decision: z.literal("declined"), note: required(1000) }),
]);
