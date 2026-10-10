"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { APPLICATION_ROLES, type WorkerApplication } from "@/lib/shop/worker-application";
import { fmtDateTime } from "@/lib/shop/shared";
const input = "mt-1 min-h-12 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2";
function Value({ label, children }: { label: string; children: React.ReactNode }) { return <div><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{children || "—"}</dd></div>; }
function ApplicationCard({ application: a }: { application: WorkerApplication }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  async function review(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    const decision = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
    if (decision !== "approved" && decision !== "declined") return;
    const note = String(form.get("note") || "").trim();
    if (decision === "declined" && !note) { setError("Add a review note before declining."); return; }
    const pin = String(form.get("pin") || "");
    const rate = Number(form.get("hourlyRate"));
    if (decision === "approved" && (!/^\d{4,8}$/.test(pin) || !(rate > 0 && rate <= 1000))) { setError("Set an hourly rate and a 4–8 digit login PIN before approving."); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch("/shop/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, decision, role: form.get("role"), hourlyRate: rate, pin, note }) });
      const result = await res.json(); if (!res.ok || !result.ok) throw Error(result.error || "Could not save review.");
      setSuccess(decision === "approved" ? "Approved. The worker profile is ready. Share the login PIN directly with the worker." : "Application declined. The submission stays in the review history.");
      router.refresh();
    } catch(e) { setError(e instanceof Error ? e.message : "Could not save review."); }
    finally { setBusy(false); }
  }
  const d = a.data;
  return <details className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60"><summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-3 p-5"><div><span className="block text-lg font-semibold">{a.full_name}</span><span className="mt-1 block text-sm text-neutral-400">{d.position} · {d.experienceYears} years experience</span><span className="mt-1 block text-xs text-neutral-500">{fmtDateTime(a.created_at, "en")}</span></div><span className="text-sm text-amber-300">Review ▾</span></summary><div className="space-y-6 border-t border-white/10 p-5"><section><h2 className="mb-3 font-semibold">Contact & address</h2><dl className="grid gap-4 sm:grid-cols-2"><Value label="Full legal name">{d.fullName}</Value><Value label="Preferred name">{d.preferredName}</Value><Value label="Phone"><a href={`tel:${d.phone}`} className="underline">{d.phone}</a></Value><Value label="Email"><a href={`mailto:${d.email}`} className="underline">{d.email}</a></Value><Value label="Home address">{[d.street, d.unit, d.city, d.state, d.postalCode].filter(Boolean).join(", ")}</Value><Value label="Languages">{({ en: "English", pt: "Português", es: "Español" })[d.lang]}{d.languages ? ` · ${d.languages}` : ""}</Value></dl></section><section><h2 className="mb-3 font-semibold">Experience & availability</h2><dl className="grid gap-4 sm:grid-cols-2"><Value label="Skills">{d.skills.join(", ")}</Value><Value label="Certifications / training">{d.certifications}</Value><Value label="Experience">{d.experience}</Value><Value label="Previous employer / position">{[d.previousEmployer, d.previousRole].filter(Boolean).join(" · ")}</Value><Value label="Work reference">{[d.referenceName, d.referencePhone].filter(Boolean).join(" · ")}</Value><Value label="Available start">{d.availableStart}</Value><Value label="Days / hours available">{d.availability}</Value><Value label="Reliable transportation">{d.transportation === "discuss" ? "Discuss with applicant" : d.transportation === "yes" ? "Yes" : "No"}</Value><Value label="Additional notes">{d.notes}</Value></dl></section><section><h2 className="mb-3 font-semibold">Emergency contact</h2><dl className="grid gap-4 sm:grid-cols-2"><Value label="Name / relationship">{d.emergencyName} · {d.emergencyRelationship}</Value><Value label="Phone">{d.emergencyPhone}</Value></dl></section><p className="text-xs text-neutral-500">Applicant confirmed their information and agreed to be contacted about joining the team.</p>
  {a.status === "pending" && !success ? <form onSubmit={review} className="space-y-4 rounded-2xl border border-white/10 bg-neutral-800/50 p-4"><h2 className="font-semibold">Owner approval</h2><p className="text-sm text-neutral-400">The new worker can access jobs without prices and their own hours/payroll. Company financials and administration stay restricted to the owners.</p><div className="grid gap-4 sm:grid-cols-3"><label className="text-sm">Role<select className={input} name="role" defaultValue={d.position}>{APPLICATION_ROLES.map(role => <option key={role}>{role}</option>)}</select></label><label className="text-sm">Hourly rate ($)<input className={input} name="hourlyRate" type="number" min="0.01" max="1000" step="0.01" /></label><label className="text-sm">Login PIN<input className={input} name="pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} /></label></div><label className="block text-sm">Review note<textarea className={input} name="note" maxLength={1000} rows={2} /></label>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<div className="flex flex-wrap gap-3"><button type="submit" name="decision" value="approved" disabled={busy} className="min-h-12 rounded-xl bg-emerald-500 px-5 font-semibold text-black disabled:opacity-50">{busy ? "Saving…" : "Approve & create worker"}</button><button type="submit" name="decision" value="declined" formNoValidate disabled={busy} className="min-h-12 rounded-xl border border-neutral-700 px-5 text-sm disabled:opacity-50">Decline application</button></div></form> : <div role="status" className="rounded-xl bg-neutral-800/50 p-4 text-sm"><p>{success || `${a.status === "approved" ? "Approved · worker profile created" : "Declined"}${a.reviewed_at ? ` · ${fmtDateTime(a.reviewed_at, "en")}` : ""}`}</p>{a.review_note && <p className="mt-2 text-neutral-400">{a.review_note}</p>}</div>}</div></details>;
}
export default function ApplicationsClient({ applications }: { applications: WorkerApplication[] }) {
  return applications.length ? <div className="space-y-4">{applications.map(a => <ApplicationCard key={a.id} application={a} />)}</div> : <p className="rounded-2xl border border-white/10 bg-neutral-900/60 p-8 text-center text-neutral-500">No applications in this section.</p>;
}
