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

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Job, CutItem, Material, QcCheck, Photo, CatalogItem } from "@/lib/shop/shared";
import { STAGES } from "@/lib/shop/shared";
import { t, stageLabel } from "@/lib/shop/i18n";
import { mt } from "@/lib/shop/measure-i18n";
import MaterialKit from "./MaterialKit";
import PhotosV2 from "./PhotosV2";
import AddressLink from "../../AddressLink";
import { nextUp } from "@/lib/shop/next-up";
import {
  SpecsPanel,
  QcRow,
  dueInfo,
} from "./TravelerClient";

export default function TravelerV2({
  job, cut, materials, qc, photos, canSeePrices, isAdmin = false, lang,
  myStartedAt, activeWorkers, totalHours, catalog,
}: {
  job: Job; cut: CutItem[]; materials: Material[]; qc: QcCheck[]; photos: Photo[];
  canSeePrices: boolean; isAdmin?: boolean; lang: string;
  myStartedAt: string | null; activeWorkers: string[]; totalHours: number;
  catalog: CatalogItem[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);   // which drawer is open
  const [stagePicker, setStagePicker] = useState(false);

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
  const now = nextUp(job, cut, materials, qc, photos);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32">
      {err && (
        <div className="mb-3 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{err}</div>
      )}

      {/* ── Identity. Before anything else, you know what job this is. ── */}
      <header className="pt-4 pb-3">
        <h1 className="truncate text-[26px] font-display font-bold leading-tight tracking-tight">
          {job.customer_name}
        </h1>
        <div className="mt-0.5 text-[15px] text-neutral-400">
          {job.address ? (
            <AddressLink address={job.address} lang={lang} />
          ) : (
            <p className="truncate">{job.job_number}</p>
          )}
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

      <ClockButton
        lang={lang}
        jobId={job.id}
        myStartedAt={myStartedAt}
        activeWorkers={activeWorkers}
        totalHours={totalHours}
      />

      {/* ── What this job needs now, at the stage it is actually at. ── */}
      <section className="rounded-2xl border border-amber-700/40 bg-neutral-900/70 p-4">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-amber-500">
          {t(lang, "nowTitle")} · {stageLabel(lang, job.current_stage)}
        </div>

        <ul className="space-y-2.5">
          {now.items.map((it) => (
            <li key={it.key} className="flex items-center gap-3">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] ${
                  it.done ? "bg-emerald-500 text-black" : "border-2 border-neutral-600 text-transparent"
                }`}
              >
                ✓
              </span>
              <span className={`flex-1 text-[15px] ${it.done ? "text-neutral-500" : "text-neutral-100"}`}>
                {it.text}
              </span>
              {!it.done && it.action.kind !== "none" && (
                <button
                  onClick={() => {
                    if (it.action.kind === "measure") router.push(`/shop/job/${job.id}/measure`);
                    else if (it.action.kind === "open") setOpen(it.action.row);
                  }}
                  className="min-h-[40px] shrink-0 rounded-xl border border-amber-600/60 px-3 text-[14px] font-semibold text-amber-400 active:bg-amber-500/10"
                >
                  {it.actionText}
                </button>
              )}
            </li>
          ))}
        </ul>

        {next && (
          <button
            onClick={() => act({ type: "stage_set", jobId: job.id, stage: next })}
            disabled={busy}
            className="mt-4 min-h-[60px] w-full rounded-2xl bg-amber-500 text-[17px] font-bold text-black active:scale-[0.99] disabled:opacity-50"
          >
            {t(lang, "moveTo")} {stageLabel(lang, next)} →
          </button>
        )}
      </section>

      {/* ── The work. Each row states what is in it; tap to open. ── */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60">

        <Row
          icon={<Icon name="photo" />}
          label={t(lang, "photos")}
          value={photos.length ? String(photos.length) : ""}
          openState={open === "photos"}
          onClick={() => setOpen(open === "photos" ? null : "photos")}
        >
          <PhotosV2
            jobId={job.id}
            stage={job.current_stage}
            photos={photos}
            canSeePrices={canSeePrices}
            lang={lang}
            refresh={refresh}
          />
        </Row>

        {/* Materials and "material pull" were one idea split across two
            headings. One list; a line is either ordered or pulled. */}
        <Row
          icon={<Icon name="steel" />}
          label={t(lang, "materialsList")}
          value={
            cut.length || materials.length
              ? `${cutDone + matDone}/${cut.length + materials.length}`
              : ""
          }
          openState={open === "materials"}
          onClick={() => setOpen(open === "materials" ? null : "materials")}
        >
          {/* Offer the parts THIS kind of job is made of, not a blank box. */}
          <MaterialKit
            projectType={job.project_type}
            catalog={catalog}
            lang={lang}
            busy={busy}
            onAdd={(item, role) =>
              act({
                type: "cut_add",
                jobId: job.id,
                profile: role.label,
                size: item.display,
                qty: "1",
                length: "",
                catalogId: item.id,
              })
            }
          />
          {cut.length > 0 && (
            <ul className="mt-3 divide-y divide-neutral-800">
              {cut.map((c) => (
                <li key={c.id} className="flex items-center gap-2 py-2.5">
                  {/* quantity is edited here, on the line, where you can see
                      what you already have */}
                  <input
                    defaultValue={String(c.qty ?? 1)}
                    inputMode="decimal"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && Number(v) !== Number(c.qty)) act({ type: "cut_qty", id: c.id, qty: v });
                    }}
                    className="h-11 w-14 shrink-0 rounded-lg border border-neutral-700 bg-neutral-900 text-center text-[15px] text-neutral-100 outline-none focus:border-amber-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[15px] ${c.status !== "pending" ? "text-neutral-500 line-through" : "text-neutral-100"}`}>
                      {c.size}
                    </span>
                    <span className="block truncate text-[12px] text-neutral-500">{c.profile}</span>
                  </span>
                  <button
                    onClick={() => act({ type: "cut_set", id: c.id, status: c.status === "pending" ? "cut" : "pending" })}
                    disabled={busy}
                    className={`h-11 w-11 shrink-0 rounded-full border-2 text-[15px] ${
                      c.status !== "pending" ? "border-emerald-500 bg-emerald-500 text-black" : "border-neutral-600 text-transparent"
                    }`}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => act({ type: "cut_delete", id: c.id })}
                    disabled={busy}
                    className="h-11 w-9 shrink-0 text-[17px] text-neutral-600"
                    aria-label="Delete"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Row>

        <Row
          icon={<Icon name="check" />}
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

        <button
          onClick={() => router.push(`/shop/job/${job.id}/measure`)}
          className="flex min-h-[60px] w-full items-center gap-3 border-b border-neutral-800 px-4 text-left active:bg-neutral-800/60"
        >
          <Icon name="rule" />
          <span className="flex-1 text-[17px] font-semibold">{mt(lang, "fieldMeasure")}</span>
          <span className="text-neutral-600">›</span>
        </button>

        <Row
          icon={<Icon name="spec" />}
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

      {isAdmin && (
        <button
          onClick={() => act({ type: "job_archive", jobId: job.id, archived: !job.archived })}
          disabled={busy}
          className="mt-6 min-h-[48px] w-full rounded-xl border border-neutral-800 text-[15px] text-neutral-500 active:bg-neutral-900 disabled:opacity-50"
        >
          {job.archived ? t(lang, "restoreJob") : t(lang, "archiveJob")}
        </button>
      )}

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
  icon: React.ReactNode; label: string; value: string; openState: boolean;
  onClick: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-neutral-800 last:border-b-0">
      <button
        onClick={onClick}
        className="flex min-h-[60px] w-full items-center gap-3 px-4 text-left active:bg-neutral-800/60"
      >
        <span className="text-neutral-400" aria-hidden>{icon}</span>
        <span className="flex-1 text-[17px] font-semibold">{label}</span>
        <span className="max-w-[45%] truncate text-[15px] text-neutral-500">{value}</span>
        <span className={`text-neutral-600 transition-transform ${openState ? "rotate-90" : ""}`}>›</span>
      </button>
      {openState && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// The clock, once it is a habit, is a status line — not a billboard. Running
// it shows green with the elapsed time; stopped it is one quiet tap. The
// "press START every time you begin" coaching lives in the old screen and in
// training, not permanently on every job for the rest of the shop's life.
// The clock is a real button again. Burying it in a list cost the habit, and
// every labour cost in the business is computed from these presses — but it
// keeps the compact shape: no instruction paragraph, and once it is running it
// becomes a calm green strip with the elapsed time rather than a billboard.
//
// If nobody has started after ten seconds on the screen, it asks once. People
// walk up to a job and start working; the clock is the thing they forget.
function ClockButton({
  lang, jobId, myStartedAt, activeWorkers, totalHours,
}: {
  lang: string; jobId: string; myStartedAt: string | null;
  activeWorkers: string[]; totalHours: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [nudge, setNudge] = useState(false);
  const running = !!myStartedAt;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Ten seconds on the job without clocking in: ask, once, and never again
  // this visit. Long enough that reading a spec is not interrupted.
  useEffect(() => {
    // No setState on the running branch: the banner is already gated on
    // !running when it renders, so there is nothing to clear here.
    if (running) return;
    const id = setTimeout(() => setNudge(true), 10000);
    return () => clearTimeout(id);
  }, [running]);

  async function toggle() {
    setBusy(true);
    setNudge(false);
    try {
      const loc = await new Promise<{ lat: number; lng: number } | null>((res) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) return res(null);
        const done = setTimeout(() => res(null), 6000);
        navigator.geolocation.getCurrentPosition(
          (p) => { clearTimeout(done); res({ lat: p.coords.latitude, lng: p.coords.longitude }); },
          () => { clearTimeout(done); res(null); },
          { timeout: 6000 },
        );
      });
      const r = await fetch("/shop/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: running ? "time_stop" : "time_start", jobId, lat: loc?.lat, lng: loc?.lng }),
      });
      if (r.ok) startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  const mins = running ? Math.floor((nowMs - new Date(myStartedAt!).getTime()) / 60000) : 0;
  const elapsed = `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;

  return (
    <div className="mb-3">
      {nudge && !running && (
        <button
          onClick={() => setNudge(false)}
          className="mb-2 flex w-full items-center gap-2 rounded-xl border border-amber-700/60 bg-amber-500/10 px-3 py-2.5 text-left text-[14px] text-amber-300"
        >
          <span className="flex-1">{t(lang, "clockNudge")}</span>
          <span className="text-amber-500/60">✕</span>
        </button>
      )}

      <button
        onClick={toggle}
        disabled={busy}
        className={`flex min-h-[68px] w-full items-center justify-center gap-3 rounded-2xl text-[19px] font-bold active:scale-[0.99] disabled:opacity-60 ${
          running
            ? "border-2 border-emerald-600 bg-emerald-950/50 text-emerald-300"
            : `bg-emerald-600 text-white ${nudge ? "ring-4 ring-emerald-500/30" : ""}`
        }`}
      >
        <span aria-hidden className="text-[22px] leading-none">{running ? "■" : "▶"}</span>
        {running ? (
          <>
            {t(lang, "projectStop")}
            <span className="font-mono text-[17px] font-bold">{elapsed}</span>
          </>
        ) : (
          t(lang, "projectStart")
        )}
      </button>

      <p className="mt-1.5 px-1 text-[13px] text-neutral-500">
        {activeWorkers.length > 0 && (
          <span className="text-emerald-400">● {activeWorkers.join(", ")} · </span>
        )}
        {totalHours.toFixed(1)} h {t(lang, "logged")}
      </p>
    </div>
  );
}

// One weight, one size, consistent across every device — unlike emoji, which
// are a different typeface on Android, iPadOS and Chrome and read as
// placeholder art in a tool people use all day.
function Icon({ name }: { name: "photo" | "steel" | "check" | "spec" | "rule" }) {
  const d = {
    photo: "M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h4l1.5 2h2A1.5 1.5 0 0 1 17 8.5v6A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-6Z M10 13.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    steel: "M3 6h14 M3 10h14 M3 14h14 M6 6v8 M14 6v8",
    check: "M4 10.5 8 14.5 16 6",
    spec: "M6 3h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z M8 7h4 M8 10h4 M8 13h2",
    rule: "M3 12.5 12.5 3l4.5 4.5L7.5 17 3 12.5Z M6 9.5l1.5 1.5 M8.5 7l1.5 1.5 M11 4.5 12.5 6",
  }[name];
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none"
      stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d.split(" M").map((seg, i) => <path key={i} d={(i ? "M" : "") + seg} />)}
    </svg>
  );
}
