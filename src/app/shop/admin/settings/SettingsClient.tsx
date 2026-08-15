"use client";

// Organization settings (admin-only): branding on printouts, measurement
// tolerances (shop policy), material presets and option lists, and whether a
// measurer may approve their own sheet. Every save is audited with previous
// and new values.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrgSettings } from "@/lib/shop/shared";

const TOL_LABELS: [keyof OrgSettings["tolerances"] & string, string, string][] = [
  ["riseSum", "Riser sum vs floor-to-floor", "in"],
  ["runSum", "Run sum vs total run", "in"],
  ["rake", "Diagonal vs rake / landing diag / ramp slope", "in"],
  ["angle", "Calculated vs measured angle", "deg"],
  ["widthVar", "Width variation", "in"],
];

export default function SettingsClient({ initial }: { initial: OrgSettings }) {
  const router = useRouter();
  const [branding, setBranding] = useState(initial.branding);
  const [tol, setTol] = useState(initial.tolerances);
  const [presets, setPresets] = useState({
    post: (initial.presets.post || []).join("\n"),
    topRail: (initial.presets.topRail || []).join("\n"),
    picket: (initial.presets.picket || []).join("\n"),
    bottomRail: (initial.presets.bottomRail || []).join("\n"),
  });
  const [options, setOptions] = useState({
    anchors: (initial.options.anchors || []).join("\n"),
    finishes: (initial.options.finishes || []).join("\n"),
    colors: (initial.options.colors || []).join("\n"),
  });
  const [allowSelf, setAllowSelf] = useState(initial.rules.allowSelfApproval);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const toList = (v: string) =>
      v.split("\n").map((x) => x.trim()).filter(Boolean);
    try {
      const res = await fetch("/shop/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "org_settings_set",
          settings: {
            branding,
            tolerances: tol,
            presets: {
              post: toList(presets.post),
              topRail: toList(presets.topRail),
              picket: toList(presets.picket),
              bottomRail: toList(presets.bottomRail),
            },
            options: {
              anchors: toList(options.anchors),
              finishes: toList(options.finishes),
              colors: toList(options.colors),
            },
            rules: { allowSelfApproval: allowSelf },
          },
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Save failed");
      }
      setMsg("✓ Saved");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm";
  const label = "text-[11px] text-neutral-400 block mb-1";

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24 space-y-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <div className="font-bold mb-3">🏷 Branding (printouts & letterhead)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              ["name", "Company name"],
              ["address", "Address"],
              ["phone", "Phone"],
              ["website", "Website"],
            ] as const
          ).map(([k, lbl]) => (
            <label key={k} className={k === "address" ? "sm:col-span-2" : ""}>
              <span className={label}>{lbl}</span>
              <input
                className={input}
                value={branding[k]}
                onChange={(e) => setBranding({ ...branding, [k]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <div className="font-bold mb-1">🎯 Measurement tolerances</div>
        <div className="text-xs text-neutral-500 mb-3">
          Shop policy: within green = OK, within yellow = VERIFY (reviewer must
          acknowledge), beyond yellow = INCONSISTENT (cannot submit). The app
          never edits a measurement — it only flags disagreement.
        </div>
        <div className="space-y-2">
          {TOL_LABELS.map(([k, lbl, unit]) => (
            <div key={k} className="grid grid-cols-[1fr_5.5rem_5.5rem] gap-2 items-center">
              <span className="text-sm text-neutral-300">
                {lbl} <span className="text-neutral-500">({unit})</span>
              </span>
              <input
                className={input}
                inputMode="decimal"
                value={String(tol[k].green)}
                onChange={(e) =>
                  setTol({ ...tol, [k]: { ...tol[k], green: Number(e.target.value) || 0 } })
                }
              />
              <input
                className={input}
                inputMode="decimal"
                value={String(tol[k].yellow)}
                onChange={(e) =>
                  setTol({ ...tol, [k]: { ...tol[k], yellow: Number(e.target.value) || 0 } })
                }
              />
            </div>
          ))}
          <div className="grid grid-cols-[1fr_5.5rem_5.5rem] gap-2 text-[11px] text-neutral-500">
            <span />
            <span>green ≤</span>
            <span>yellow ≤</span>
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <div className="font-bold mb-3">🔩 Material presets (one per line)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              ["post", "Posts"],
              ["topRail", "Top rail / cap"],
              ["picket", "Pickets"],
              ["bottomRail", "Bottom rail"],
            ] as const
          ).map(([k, lbl]) => (
            <label key={k}>
              <span className={label}>{lbl}</span>
              <textarea
                rows={4}
                className={input}
                value={presets[k]}
                onChange={(e) => setPresets({ ...presets, [k]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <div className="font-bold mb-3">⚓ Option lists (one per line)</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              ["anchors", "Anchor / substrate materials"],
              ["finishes", "Finishes"],
              ["colors", "Colors"],
            ] as const
          ).map(([k, lbl]) => (
            <label key={k}>
              <span className={label}>{lbl}</span>
              <textarea
                rows={5}
                className={input}
                value={options[k]}
                onChange={(e) => setOptions({ ...options, [k]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <div className="font-bold mb-2">✅ Approval rules</div>
        <button
          onClick={() => setAllowSelf((v) => !v)}
          className={`px-3 py-2.5 rounded-lg border text-sm font-semibold ${
            allowSelf
              ? "border-amber-500 bg-amber-500/10 text-amber-300"
              : "border-neutral-700 bg-neutral-800 text-neutral-300"
          }`}
        >
          {allowSelf ? "☑" : "☐"} Allow a measurer to approve their own sheet
        </button>
        <div className="text-xs text-neutral-500 mt-2">
          Off (recommended): independent review — the person who submitted a
          sheet can never approve it.
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="bg-amber-500 text-black font-bold rounded-xl px-6 py-3 disabled:opacity-50"
        >
          {busy ? "…" : "Save settings"}
        </button>
        {msg && <span className="text-sm text-green-400">{msg}</span>}
      </div>
    </div>
  );
}
