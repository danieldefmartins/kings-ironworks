import type { Metadata } from "next";
import ApplicationForm from "./ApplicationForm";
export const metadata: Metadata = { title: "Join Our Team", description: "Apply to work with King Iron Works. Tell us about your experience, skills, and availability.", alternates: { canonical: "https://kingsironworks.com/join-our-team" } };
export default function JoinOurTeam() {
  return <main className="min-h-screen bg-[#f4f5f7] px-4 pb-32 pt-28 text-slate-900 lg:pt-40"><div className="mx-auto max-w-3xl"><p className="text-sm font-semibold uppercase tracking-widest text-amber-800">King Iron Works · Join our team</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Build something lasting.</h1><p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">Tell us about yourself and the work you do. Daniel and Kayky will review your application before adding you to the team.</p><ApplicationForm /></div></main>;
}
