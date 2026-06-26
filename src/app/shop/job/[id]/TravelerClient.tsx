"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  STAGES,
  type Job,
  type CutItem,
  type Material,
  type QcCheck,
} from "@/lib/shop/db";

const CUT_NEXT: Record<string, string> = {
  pending: "cut",
  cut: "welded",
  welded: "pending",
};
const CUT_STYLE: Record<string, string> = {
  pending: "bg-neutral-800 border-neutral-700 text-neutral-300",
  cut: "bg-blue-600/20 border-blue-500 text-blue-200",
  welded: "bg-green-600/20 border-green-500 text-green-200",
};
const CUT_LABEL: Record<string, string> = {
  pending: "Pending",
  cut: "Cut ✓",
  welded: "Welded ✓",
};

export default function TravelerClient({
  job,
  cut,
  materials,
  qc,
}: {
  job: Job;
  cut: CutItem[];
  materials: Material[];
  qc: QcCheck[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/shop/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "Action failed");
      } else {
        startTransition(() => router.refresh());
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  const stageIdx = STAGES.indexOf(job.current_stage as (typeof STAGES)[number]);
  const cutDone = cut.filter((c) => c.status !== "pending").length;
  const matDone = materials.filter((m) => m.pulled).length;
  const qcDone = qc.filter((q) => q.passed !== null).length;

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      {err && (
        <div className="text-red-400 bg-red-950/40 border border-red-800 rounded-lg p-3 mb-4 text-sm">
          {err}
        </div>
      )}

      {/* Header card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-5">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-neutral-400">
            Job <span className="text-neutral-200">{job.job_number}</span>
          </span>
          {job.est_number && (
            <span className="text-neutral-400">
              Est <span className="text-neutral-200">{job.est_number}</span>
            </span>
          )}
          {job.finish && (
            <span className="text-neutral-400">
              Finish <span className="text-amber-400">{job.finish}</span>
            </span>
          )}
        </div>
        {job.address && (
          <div className="text-sm text-neutral-400 mt-1">{job.address}</div>
        )}
        {job.scope && (
          <div className="text-sm text-neutral-300 mt-2 leading-relaxed">
            {job.scope}
          </div>
        )}
      </div>

      {/* Stage tracker */}
      <Section title="Stage" sub={job.current_stage}>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s, i) => {
            const done = i < stageIdx;
            const cur = i === stageIdx;
            return (
              <button
                key={s}
                disabled={busy}
                onClick={() => act({ type: "stage_set", jobId: job.id, stage: s })}
                className={`px-3 py-2 rounded-lg text-sm border transition active:scale-95 ${
                  cur
                    ? "bg-amber-500 text-black border-amber-500 font-semibold"
                    : done
                    ? "bg-green-600/20 border-green-700 text-green-300"
                    : "bg-neutral-900 border-neutral-700 text-neutral-400"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          Tap a stage to move the job. Every move is logged with your name.
        </p>
      </Section>

      {/* Cut list */}
      <Section title="Cut List" sub={`${cutDone}/${cut.length} done`}>
        {cut.length === 0 && <Empty>No cut list yet.</Empty>}
        <div className="space-y-2">
          {cut.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg p-3"
            >
              <div className="w-12 shrink-0">
                <div className="text-[10px] text-neutral-500 uppercase">Tag</div>
                <div className="font-mono text-amber-400 text-sm">
                  {c.cut_tag || c.item_no || "—"}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{c.profile}</div>
                <div className="text-xs text-neutral-400 truncate">
                  {c.description}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  Qty <span className="text-neutral-300">{c.qty}</span> · Length{" "}
                  <span className="text-neutral-300">{c.length || "—"}</span>
                </div>
              </div>
              <button
                disabled={busy}
                onClick={() =>
                  act({
                    type: "cut_set",
                    id: c.id,
                    status: CUT_NEXT[c.status] || "pending",
                  })
                }
                className={`shrink-0 w-24 text-center px-2 py-3 rounded-lg border text-sm font-semibold active:scale-95 transition ${
                  CUT_STYLE[c.status] || CUT_STYLE.pending
                }`}
              >
                {CUT_LABEL[c.status] || "Pending"}
              </button>
            </div>
          ))}
        </div>
        {cut.length > 0 && (
          <p className="text-xs text-neutral-500 mt-2">
            Tap status to cycle: Pending → Cut → Welded.
          </p>
        )}
      </Section>

      {/* Materials */}
      <Section title="Material Pull" sub={`${matDone}/${materials.length} pulled`}>
        {materials.length === 0 && <Empty>No material list.</Empty>}
        <div className="space-y-2">
          {materials.map((m) => (
            <button
              key={m.id}
              disabled={busy}
              onClick={() =>
                act({ type: "material_toggle", id: m.id, pulled: !m.pulled })
              }
              className="w-full flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-left active:scale-[0.99] transition"
            >
              <span
                className={`w-7 h-7 shrink-0 rounded-md border flex items-center justify-center text-sm ${
                  m.pulled
                    ? "bg-green-600 border-green-600 text-white"
                    : "border-neutral-600"
                }`}
              >
                {m.pulled ? "✓" : ""}
              </span>
              <span className="flex-1">
                <span
                  className={`font-medium ${
                    m.pulled ? "line-through text-neutral-500" : ""
                  }`}
                >
                  {m.description}
                </span>
                <span className="block text-xs text-neutral-500">{m.qty}</span>
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* QC */}
      <Section title="QC / Precision Sign-off" sub={`${qcDone}/${qc.length} checked`}>
        {qc.length === 0 && <Empty>No QC checklist.</Empty>}
        <div className="space-y-2">
          {qc.map((q) => (
            <QcRow key={q.id} q={q} busy={busy} act={act} />
          ))}
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          Enter the measured value, then Pass or Fail. Sign-off records your name
          and time.
        </p>
      </Section>
    </div>
  );
}

function QcRow({
  q,
  busy,
  act,
}: {
  q: QcCheck;
  busy: boolean;
  act: (p: Record<string, unknown>) => void;
}) {
  const [measured, setMeasured] = useState(q.measured || "");
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">{q.label}</div>
          {q.expected && (
            <div className="text-xs text-neutral-500">Target: {q.expected}</div>
          )}
        </div>
        {q.passed !== null && (
          <span
            className={`shrink-0 text-xs font-semibold px-2 py-1 rounded ${
              q.passed
                ? "bg-green-600/20 text-green-300"
                : "bg-red-600/20 text-red-300"
            }`}
          >
            {q.passed ? "PASS" : "FAIL"}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input
          value={measured}
          onChange={(e) => setMeasured(e.target.value)}
          placeholder="Measured…"
          className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
        />
        <button
          disabled={busy}
          onClick={() => act({ type: "qc_save", id: q.id, measured, passed: true })}
          className="px-3 py-2 rounded-lg bg-green-600/20 border border-green-600 text-green-200 text-sm font-semibold active:scale-95"
        >
          Pass
        </button>
        <button
          disabled={busy}
          onClick={() => act({ type: "qc_save", id: q.id, measured, passed: false })}
          className="px-3 py-2 rounded-lg bg-red-600/20 border border-red-600 text-red-200 text-sm font-semibold active:scale-95"
        >
          Fail
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-amber-500 font-display font-bold uppercase tracking-wide text-sm">
          {title}
        </h2>
        {sub && <span className="text-xs text-neutral-500">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-neutral-600 italic">{children}</p>;
}
