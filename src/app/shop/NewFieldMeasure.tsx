"use client";

// Seller flow: start a field measurement for a project that is not in the
// shop yet. Basic project info → lead job → straight into measure sheets.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mt } from "@/lib/shop/measure-i18n";

export default function NewFieldMeasure({
  lang,
  startOpen = false,
}: {
  lang: string;
  startOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(startOpen);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [projectType, setProjectType] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    if (!customer.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/shop/api/measure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "create_lead",
          customer,
          phone,
          address,
          projectType,
          notes,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.jobId) {
        setErr(d.error || "Failed");
      } else {
        router.push(`/shop/job/${d.jobId}/measure`);
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full mb-4 bg-neutral-900 border border-amber-600/60 rounded-xl p-4 flex items-center gap-3 text-left active:bg-neutral-800"
      >
        <span className="text-2xl" aria-hidden>
          📐
        </span>
        <span className="flex-1 min-w-0">
          <span className="font-bold block">+ {mt(lang, "newFieldMeasure")}</span>
          <span className="text-xs text-neutral-500 block">{mt(lang, "leadHint")}</span>
        </span>
        <span className="text-amber-400 text-xl" aria-hidden>
          ›
        </span>
      </button>
    );
  }

  const input =
    "w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-3 text-base";

  return (
    <div className="mb-4 bg-neutral-900 border border-amber-600/60 rounded-xl p-4">
      <div className="font-bold mb-3">📐 {mt(lang, "newFieldMeasure")}</div>
      {err && (
        <div className="text-red-400 bg-red-950/40 border border-red-800 rounded-lg p-3 mb-3 text-sm">
          {err}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] text-neutral-400 block mb-1">
            {mt(lang, "customerName")} *
          </span>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} className={input} autoFocus />
        </label>
        <label className="block">
          <span className="text-[11px] text-neutral-400 block mb-1">{mt(lang, "phoneLbl")}</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} inputMode="tel" />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[11px] text-neutral-400 block mb-1">{mt(lang, "addressLbl")}</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={input} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[11px] text-neutral-400 block mb-1">
            {mt(lang, "projectTypeLbl")}
          </span>
          <input value={projectType} onChange={(e) => setProjectType(e.target.value)} className={input} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[11px] text-neutral-400 block mb-1">{mt(lang, "leadNotes")}</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={input} />
        </label>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={create}
          disabled={!customer.trim() || busy}
          className="flex-1 bg-amber-500 text-black font-bold rounded-xl py-3 disabled:opacity-40"
        >
          {busy ? "…" : `📐 ${mt(lang, "startMeasuring")}`}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-5 rounded-xl border border-neutral-700 text-neutral-300"
        >
          {mt(lang, "cancel")}
        </button>
      </div>
    </div>
  );
}
