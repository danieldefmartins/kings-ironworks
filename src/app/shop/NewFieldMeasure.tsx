"use client";

// Seller flow: start a field measurement. First asks whether this is a NEW
// project or an EXISTING one (existing → jump to that project's measure list).
// New-project form warns when the address matches a project already in the
// system, and can fill the address from the device's GPS fix.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { mt } from "@/lib/shop/measure-i18n";

export interface ExistingProject {
  id: string;
  jobNumber: string;
  customer: string;
  address: string;
}

// Loose street-address normalizer so "12 Main Street" matches "12 main st.".
const SUFFIXES: Record<string, string> = {
  street: "st", road: "rd", avenue: "ave", drive: "dr", lane: "ln",
  boulevard: "blvd", court: "ct", place: "pl", terrace: "ter", circle: "cir",
  square: "sq", highway: "hwy", parkway: "pkwy",
};
function normAddress(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => SUFFIXES[w] || w)
    .join(" ");
}

export default function NewFieldMeasure({
  lang,
  startOpen = false,
  existing = [],
}: {
  lang: string;
  startOpen?: boolean;
  existing?: ExistingProject[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(startOpen);
  const [mode, setMode] = useState<"choose" | "new" | "existing">("choose");
  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [projectType, setProjectType] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Live duplicate-address check against every project already in the system.
  const dupe = useMemo(() => {
    const n = normAddress(address);
    if (n.length < 6) return null;
    return (
      existing.find((p) => {
        const pn = normAddress(p.address || "");
        return pn.length >= 6 && (pn.startsWith(n) || n.startsWith(pn));
      }) || null
    );
  }, [address, existing]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return existing.slice(0, 12);
    return existing
      .filter((p) =>
        `${p.customer} ${p.address} ${p.jobNumber}`.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [search, existing]);

  function useLocation() {
    if (!navigator.geolocation) {
      setErr(mt(lang, "locFailed"));
      return;
    }
    setLocating(true);
    setErr(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/shop/api/measure", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "reverse_geocode",
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });
          const d = await res.json().catch(() => ({}));
          if (res.ok && d.address) setAddress(d.address);
          else setErr(mt(lang, "locFailed"));
        } catch {
          setErr(mt(lang, "locFailed"));
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setErr(mt(lang, "locFailed"));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

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

  if (mode === "choose") {
    return (
      <div className="mb-4 bg-neutral-900 border border-amber-600/60 rounded-xl p-4">
        <div className="font-bold mb-3">📐 {mt(lang, "newOrExisting")}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setMode("new")}
            className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-left active:bg-neutral-700"
          >
            <span className="text-2xl block mb-1" aria-hidden>🆕</span>
            <span className="font-bold block">{mt(lang, "newProjectOpt")}</span>
            <span className="text-xs text-neutral-500 block">{mt(lang, "newProjectHint")}</span>
          </button>
          <button
            onClick={() => setMode("existing")}
            className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-left active:bg-neutral-700"
          >
            <span className="text-2xl block mb-1" aria-hidden>📂</span>
            <span className="font-bold block">{mt(lang, "existingProjectOpt")}</span>
            <span className="text-xs text-neutral-500 block">{mt(lang, "existingProjectHint")}</span>
          </button>
        </div>
        {!startOpen && (
          <button
            onClick={() => setOpen(false)}
            className="w-full mt-3 py-2 rounded-xl border border-neutral-700 text-neutral-300"
          >
            {mt(lang, "cancel")}
          </button>
        )}
      </div>
    );
  }

  if (mode === "existing") {
    return (
      <div className="mb-4 bg-neutral-900 border border-amber-600/60 rounded-xl p-4">
        <div className="font-bold mb-3">📂 {mt(lang, "existingProjectOpt")}</div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={mt(lang, "searchProjects")}
          className={input}
          autoFocus
        />
        <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="text-sm text-neutral-500 py-2">{mt(lang, "noProjectsFound")}</div>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/shop/job/${p.id}/measure`)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-3 text-left active:bg-neutral-700"
            >
              <span className="font-bold block">{p.customer}</span>
              <span className="text-xs text-neutral-400 block">
                {p.jobNumber}
                {p.address ? ` · ${p.address}` : ""}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setMode("choose")}
          className="w-full mt-3 py-2 rounded-xl border border-neutral-700 text-neutral-300"
        >
          ← {mt(lang, "cancel")}
        </button>
      </div>
    );
  }

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
        <div className="block sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-neutral-400">{mt(lang, "addressLbl")}</span>
            <button
              type="button"
              onClick={useLocation}
              disabled={locating}
              className="text-[11px] text-amber-400 border border-amber-600/60 rounded-md px-2 py-0.5 disabled:opacity-50"
            >
              {locating ? mt(lang, "locating") : `📍 ${mt(lang, "useMyLocation")}`}
            </button>
          </div>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={input} />
          {dupe && (
            <div className="mt-2 bg-amber-950/40 border border-amber-700 rounded-lg p-3 text-sm">
              <div className="text-amber-300 font-bold mb-1">
                ⚠ {mt(lang, "sameAddressTitle")}
              </div>
              <div className="text-neutral-300 mb-2">
                {dupe.jobNumber} — {dupe.customer}
                {dupe.address ? ` · ${dupe.address}` : ""}
              </div>
              <button
                type="button"
                onClick={() => router.push(`/shop/job/${dupe.id}/measure`)}
                className="bg-amber-500 text-black font-bold rounded-lg px-4 py-2"
              >
                {mt(lang, "openProject")} →
              </button>
            </div>
          )}
        </div>
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
          onClick={() => setMode("choose")}
          className="px-5 rounded-xl border border-neutral-700 text-neutral-300"
        >
          {mt(lang, "cancel")}
        </button>
      </div>
    </div>
  );
}
