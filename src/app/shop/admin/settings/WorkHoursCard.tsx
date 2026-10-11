"use client";

// Payroll work hours + who gets the text when a worker says extra time was
// requested. Owner-only (the settings page is). Each contact is texted in
// their own language.

import type { ApprovalContact, WorkHoursSettings } from "@/lib/shop/work-hours";

const LANGS: [ApprovalContact["lang"], string][] = [["pt", "Português"], ["en", "English"], ["es", "Español"]];

export default function WorkHoursCard({ value, onChange }: { value: WorkHoursSettings; onChange: (v: WorkHoursSettings) => void }) {
  const input = "w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-base";
  const setContact = (i: number, patch: Partial<ApprovalContact>) =>
    onChange({ ...value, contacts: value.contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-bold">🕢 Work hours (payroll clock)</div>
          <div className="text-xs text-neutral-500 mt-0.5">Before start or after end counts at the edge unless the team leader asked.</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value.enabled}
          aria-label="Use work hours"
          onClick={() => onChange({ ...value, enabled: !value.enabled })}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${value.enabled ? "bg-emerald-500" : "bg-neutral-700"}`}
        >
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${value.enabled ? "left-7" : "left-1"}`} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label>
          <span className="text-[11px] text-neutral-400 block mb-1">Start</span>
          <input type="time" className={input} value={value.start} aria-label="Work start" onChange={(e) => onChange({ ...value, start: e.target.value })} />
        </label>
        <label>
          <span className="text-[11px] text-neutral-400 block mb-1">End</span>
          <input type="time" className={input} value={value.end} aria-label="Work end" onChange={(e) => onChange({ ...value, end: e.target.value })} />
        </label>
      </div>

      <div className="mt-5 text-sm font-semibold">Text when extra time is requested</div>
      <div className="mt-2 space-y-2">
        {value.contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_1.3fr_auto] gap-2 items-center">
            <input className={input} placeholder="Name" aria-label="Contact name" value={c.name} onChange={(e) => setContact(i, { name: e.target.value })} />
            <input className={input} inputMode="tel" placeholder="(617) 555-0100" aria-label="Contact phone" value={c.phone} onChange={(e) => setContact(i, { phone: e.target.value })} />
            <button type="button" aria-label={`Remove ${c.name || "contact"}`} onClick={() => onChange({ ...value, contacts: value.contacts.filter((_, j) => j !== i) })}
              className="h-11 w-11 rounded-lg bg-neutral-800 text-neutral-400">✕</button>
            <div className="col-span-3 -mt-1 mb-1 flex gap-1 rounded-lg bg-neutral-800 p-1" role="radiogroup" aria-label={`Language for ${c.name || "contact"}`}>
              {LANGS.map(([l, label]) => (
                <button key={l} type="button" role="radio" aria-checked={c.lang === l} onClick={() => setContact(i, { lang: l })}
                  className={`flex-1 min-h-9 rounded-md text-sm font-semibold ${c.lang === l ? "bg-neutral-900 text-neutral-100" : "text-neutral-500"}`}>{label}</button>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...value, contacts: [...value.contacts, { name: "", phone: "", lang: "pt" }] })}
          className="min-h-11 w-full rounded-lg border border-dashed border-neutral-700 text-sm font-semibold text-neutral-300">+ Add contact</button>
      </div>
    </div>
  );
}
