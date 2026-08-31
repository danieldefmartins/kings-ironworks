"use client";

// The job screen, rethought.
//
// What was wrong with the old one, measured on a real job at tablet size:
// 1,605px of scroll, 31 interactive controls, 202 words. Control-dense and
// information-sparse — the worst combination for someone holding a tablet in
// the shop. Seven section headers all shouted in the same orange caps, so
// nothing said what to do next. Four of them were EMPTY and still took ~40% of
// the height. Taking one photo meant reading eleven category chips first.
// "Materials" and "Material Pull" were two headings for one idea.
//
// The rules here:
//   IDENTITY FIRST     you always know which job you are on, before anything.
//   ONE NEXT ACTION    the screen has a single obvious thing to do, sized for
//                      a gloved thumb, and it changes with the stage.
//   EMPTY IS QUIET     a section with nothing in it is one line, not a heading
//                      plus an empty state plus a hint.
//   COMMON CASE FIRST  take the photo; choose the category only if you want
//                      something other than what you are obviously doing.
//   NOTHING REMOVED    every capability the old screen had is still reachable.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Job, CutItem, Material, QcCheck, Photo } from "@/lib/shop/shared";
import { STAGES } from "@/lib/shop/shared";
import { t, stageLabel } from "@/lib/shop/i18n";
import { mt } from "@/lib/shop/measure-i18n";
import TimeClock from "./TimeClock";
import {
  MaterialAdder,
  SpecsPanel,
  PhotosSection,
  QcRow,
  dueInfo,
} from "./TravelerClient";

export default function TravelerV2({
  job, cut, materials, qc, photos, canSeePrices, isAdmin = false, lang,
  myStartedAt, activeWorkers, totalHours,
}: {
  job: Job; cut: CutItem[]; materials: Material[]; qc: QcCheck[]; photos: Photo[];
  canSeePrices: boolean; isAdmin?: boolean; lang: string;
  myStartedAt: string | null; activeWorkers: string[]; totalHours: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);   // which drawer is open
  const [stagePicker, setStagePicker] = useState(false);
  const [more, setMore] = useState(false);

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

  const due = dueInfo(job.due_date, lang);
  const stageIdx = STAGES.indexOf(job.current_stage as (typeof STAGES)[number]);
  const next = stageIdx >= 0 && stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : null;
  const cutDone = cut.filter((c) => c.status !== "pending").length;
  const matDone = materials.filter((m) => m.pulled).length;
  const qcDone = qc.filter((q) => q.passed !== null).length;
  const refresh = () => startTransition(() => router.refresh());

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32">
      {err && (
        <div className="mb-3 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{err}</div>
      )}

      {/* ── Identity. Before anything else, you know what job this is. ── */}
      <header className="pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[26px] font-display font-bold leading-tight tracking-tight">
              {job.customer_name}
            </h1>
            <p className="mt-0.5 truncate text-[15px] text-neutral-400">
              {job.address || job.job_number}
            </p>
          </div>
          <button
            onClick={() => setMore((v) => !v)}
            className="h-11 w-11 shrink-0 rounded-full border border-neutral-800 text-lg text-neutral-400"
            aria-label={t(lang, "more")}
          >
            ⋯
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px]">
          {job.project_type && (
            <span className="rounded-full bg-neutral-800 px-2.5 py-1 font-semibold text-neutral-300">
              {job.project_type}
            </span>
          )}
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-semibold text-amber-400">
            {stageLabel(lang, job.current_stage)}
          </span>
          {job.due_date && <span className={due.cls}>{t(lang, "installBy")} {due.text}</span>}
          <span className="text-neutral-600">{job.job_number}</span>
        </div>

        {/* progress as progress, not as a menu of nine buttons */}
        <button
          onClick={() => setStagePicker(true)}
          className="mt-3 flex w-full items-center gap-2"
          aria-label={t(lang, "stage")}
        >
          {STAGES.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                i < stageIdx ? "bg-emerald-500" : i === stageIdx ? "bg-amber-500" : "bg-neutral-800"
              }`}
            />
          ))}
        </button>
      </header>

      {more && (
        <div className="mb-4 space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
          <button
            onClick={() => router.push(`/shop/job/${job.id}/measure`)}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 text-left active:bg-neutral-800"
          >
            <span className="text-xl">📐</span>
            <span className="flex-1 font-semibold">{mt(lang, "fieldMeasure")}</span>
            <span className="text-neutral-500">›</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => act({ type: "job_archive", jobId: job.id, archived: !job.archived })}
              disabled={busy}
              className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 text-left text-neutral-400 active:bg-neutral-800 disabled:opacity-50"
            >
              <span className="text-xl">📦</span>
              <span className="flex-1">{job.archived ? t(lang, "restoreJob") : t(lang, "archiveJob")}</span>
            </button>
          )}
        </div>
      )}

      {/* ── The one thing to do right now. ── */}
      <TimeClock
        jobId={job.id}
        lang={lang}
        myStartedAt={myStartedAt}
        activeWorkers={activeWorkers}
        totalHours={totalHours}
      />

      {next && (
        <button
          onClick={() => act({ type: "stage_set", jobId: job.id, stage: next })}
          disabled={busy}
          className="mt-3 flex min-h-[64px] w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 text-[17px] font-bold text-black active:scale-[0.99] disabled:opacity-50"
        >
          {t(lang, "moveTo")} {stageLabel(lang, next)} →
        </button>
      )}

      {/* ── The work. Each row states what is in it; tap to open. ── */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60">
        <Row
          icon="📷"
          label={t(lang, "photos")}
          value={photos.length ? String(photos.length) : ""}
          openState={open === "photos"}
          onClick={() => setOpen(open === "photos" ? null : "photos")}
        >
          <PhotosSection
            jobId={job.id}
            photos={photos}
            canSeePrices={canSeePrices}
            lang={lang}
            refresh={refresh}
          />
        </Row>

        {/* Materials and "material pull" were one idea split across two
            headings. One list; a line is either ordered or pulled. */}
        <Row
          icon="🧱"
          label={t(lang, "materialsList")}
          value={
            cut.length || materials.length
              ? `${cutDone + matDone}/${cut.length + materials.length}`
              : ""
          }
          openState={open === "materials"}
          onClick={() => setOpen(open === "materials" ? null : "materials")}
        >
          <MaterialAdder jobId={job.id} lang={lang} busy={busy} act={act} />
          {materials.length > 0 && (
            <ul className="mt-3 divide-y divide-neutral-800">
              {materials.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <button
                    onClick={() => act({ type: "material_toggle", id: m.id, pulled: !m.pulled })}
                    disabled={busy}
                    className={`h-7 w-7 shrink-0 rounded-full border-2 ${
                      m.pulled ? "border-emerald-500 bg-emerald-500 text-black" : "border-neutral-600"
                    }`}
                  >
                    {m.pulled ? "✓" : ""}
                  </button>
                  <span className={`flex-1 text-[15px] ${m.pulled ? "text-neutral-500 line-through" : ""}`}>
                    {m.qty ? `${m.qty} × ` : ""}{m.description}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Row>

        <Row
          icon="✅"
          label={t(lang, "qcTitle")}
          value={qc.length ? `${qcDone}/${qc.length}` : ""}
          openState={open === "qc"}
          onClick={() => setOpen(open === "qc" ? null : "qc")}
        >
          {qc.length === 0 ? (
            <p className="py-2 text-sm text-neutral-500">{t(lang, "noQc")}</p>
          ) : (
            qc.map((q) => <QcRow key={q.id} q={q} lang={lang} busy={busy} act={act} />)
          )}
        </Row>

        <Row
          icon="📋"
          label={t(lang, "specs")}
          value={[job.finish_type, job.color, job.mounting].filter(Boolean).join(" · ")}
          openState={open === "specs"}
          onClick={() => setOpen(open === "specs" ? null : "specs")}
        >
          <SpecsPanel job={job} lang={lang} busy={busy} act={act} />
          {job.scope && (
            <p className="mt-3 border-t border-neutral-800 pt-3 text-[15px] leading-relaxed text-neutral-300">
              {job.scope}
            </p>
          )}
        </Row>
      </div>

      {/* stage picker: the full list, but only when asked for */}
      {stagePicker && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60"
          onClick={() => setStagePicker(false)}
        >
          <div
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-3xl border-t border-neutral-800 bg-neutral-950 p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-700" />
            <h2 className="mb-3 px-1 text-lg font-bold">{t(lang, "stage")}</h2>
            {STAGES.map((s, i) => (
              <button
                key={s}
                disabled={busy}
                onClick={() => { act({ type: "stage_set", jobId: job.id, stage: s }); setStagePicker(false); }}
                className={`mb-1.5 flex min-h-[56px] w-full items-center gap-3 rounded-xl px-4 text-left text-[17px] ${
                  i === stageIdx ? "bg-amber-500 font-bold text-black"
                  : i < stageIdx ? "bg-emerald-950/40 text-emerald-300"
                  : "bg-neutral-900 text-neutral-300"
                }`}
              >
                <span className="w-6 text-center opacity-70">{i < stageIdx ? "✓" : i + 1}</span>
                <span className="flex-1">{stageLabel(lang, s)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// One line per area of work. Closed, it still says how much is in there, so
// the screen answers "what is left?" without opening anything.
function Row({
  icon, label, value, openState, onClick, children,
}: {
  icon: string; label: string; value: string; openState: boolean;
  onClick: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-neutral-800 last:border-b-0">
      <button
        onClick={onClick}
        className="flex min-h-[60px] w-full items-center gap-3 px-4 text-left active:bg-neutral-800/60"
      >
        <span className="text-xl" aria-hidden>{icon}</span>
        <span className="flex-1 text-[17px] font-semibold">{label}</span>
        <span className="max-w-[45%] truncate text-[15px] text-neutral-500">{value}</span>
        <span className={`text-neutral-600 transition-transform ${openState ? "rotate-90" : ""}`}>›</span>
      </button>
      {openState && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
