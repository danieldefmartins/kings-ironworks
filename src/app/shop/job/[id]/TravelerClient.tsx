"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  STAGES,
  PHOTO_CATEGORIES,
  PRICE_CATEGORY,
  type Job,
  type CutItem,
  type Material,
  type QcCheck,
  type Photo,
} from "@/lib/shop/db";
import { t, stageLabel, categoryLabel } from "@/lib/shop/i18n";

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

export default function TravelerClient({
  job,
  cut,
  materials,
  qc,
  photos,
  canSeePrices,
  lang,
}: {
  job: Job;
  cut: CutItem[];
  materials: Material[];
  qc: QcCheck[];
  photos: Photo[];
  canSeePrices: boolean;
  lang: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cutLabel: Record<string, string> = {
    pending: t(lang, "stPending"),
    cut: t(lang, "stCut"),
    welded: t(lang, "stWelded"),
  };

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

      {/* Summary header — what's needed to complete the project */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
        {job.project_type && (
          <span className="inline-block bg-amber-500 text-black text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-2">
            {job.project_type}
          </span>
        )}
        <h1 className="text-2xl font-display font-bold leading-tight">
          {job.customer_name}
        </h1>
        {job.address && (
          <div className="text-sm text-neutral-300 mt-2 flex items-start gap-2">
            <span aria-hidden>📍</span>
            <span>{job.address}</span>
          </div>
        )}
        <div className={`text-sm mt-1.5 flex items-center gap-2 ${due.cls}`}>
          <span aria-hidden>🗓️</span>
          <span className="font-semibold">
            {t(lang, "installBy")} {due.text}
          </span>
        </div>
        {job.finish && (
          <div className="text-sm text-neutral-400 mt-1.5">
            {t(lang, "finish")}:{" "}
            <span className="text-amber-400">{job.finish}</span>
          </div>
        )}
        {job.scope && (
          <div className="text-sm text-neutral-300 mt-3 leading-relaxed border-t border-neutral-800 pt-3">
            {job.scope}
          </div>
        )}
        <div className="text-xs text-neutral-600 mt-2">{job.job_number}</div>
      </div>

      {/* Photos — right under the customer information */}
      <HeroCarousel photos={photos} lang={lang} />

      {/* Stage tracker */}
      <Section title={t(lang, "stage")} sub={stageLabel(lang, job.current_stage)}>
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
                {stageLabel(lang, s)}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500 mt-2">{t(lang, "stageNote")}</p>
      </Section>

      {/* Cut list */}
      <Section
        title={t(lang, "cutList")}
        sub={`${cutDone}/${cut.length} ${t(lang, "done")}`}
      >
        {cut.length === 0 && <Empty>{t(lang, "noCutList")}</Empty>}
        <div className="space-y-2">
          {cut.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg p-3"
            >
              <div className="w-12 shrink-0">
                <div className="text-[10px] text-neutral-500 uppercase">
                  {t(lang, "tag")}
                </div>
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
                  {t(lang, "qty")} <span className="text-neutral-300">{c.qty}</span> ·{" "}
                  {t(lang, "length")}{" "}
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
                {cutLabel[c.status] || cutLabel.pending}
              </button>
            </div>
          ))}
        </div>
        {cut.length > 0 && (
          <p className="text-xs text-neutral-500 mt-2">{t(lang, "cutNote")}</p>
        )}
      </Section>

      {/* Materials */}
      <Section
        title={t(lang, "materialPull")}
        sub={`${matDone}/${materials.length} ${t(lang, "pulled")}`}
      >
        {materials.length === 0 && <Empty>{t(lang, "noMaterials")}</Empty>}
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
      <Section
        title={t(lang, "qcTitle")}
        sub={`${qcDone}/${qc.length} ${t(lang, "checked")}`}
      >
        {qc.length === 0 && <Empty>{t(lang, "noQc")}</Empty>}
        <div className="space-y-2">
          {qc.map((q) => (
            <QcRow key={q.id} q={q} busy={busy} act={act} lang={lang} />
          ))}
        </div>
        <p className="text-xs text-neutral-500 mt-2">{t(lang, "qcNote")}</p>
      </Section>

      {/* Photos */}
      <Section title={t(lang, "photos")} sub={`${photos.length}`}>
        <PhotosSection
          jobId={job.id}
          photos={photos}
          canSeePrices={canSeePrices}
          lang={lang}
          refresh={() => startTransition(() => router.refresh())}
        />
      </Section>
    </div>
  );
}

function PhotosSection({
  jobId,
  photos,
  canSeePrices,
  lang,
  refresh,
}: {
  jobId: string;
  photos: Photo[];
  canSeePrices: boolean;
  lang: string;
  refresh: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>("Measurements");
  const [custom, setCustom] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Photo | null>(null);

  const cats = PHOTO_CATEGORIES.filter(
    (c) => canSeePrices || c !== PRICE_CATEGORY
  );

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const chosen = custom.trim() || category;
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("jobId", jobId);
      fd.append("category", chosen);
      const res = await fetch("/shop/api/photo", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "Upload failed");
      } else {
        setCustom("");
        refresh();
      }
    } catch {
      setErr("Network error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const groups = new Map<string, Photo[]>();
  for (const p of photos) {
    const k = p.label || p.category || "Other";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(p);
  }

  const chosenLabel = custom.trim() || categoryLabel(lang, category);

  return (
    <div>
      {/* Uploader */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 mb-3">
        <div className="text-xs text-neutral-400 mb-2">{t(lang, "photoIntro")}</div>
        <div className="flex flex-wrap gap-2 mb-2">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCategory(c);
                setCustom("");
              }}
              className={`px-2.5 py-1.5 rounded-full text-xs border transition ${
                category === c && !custom
                  ? "bg-amber-500 text-black border-amber-500 font-semibold"
                  : "bg-neutral-950 border-neutral-700 text-neutral-300"
              }`}
            >
              {categoryLabel(lang, c).replace(/^Inst\w+\s*—\s*/, "")}
              {c === PRICE_CATEGORY ? " 🔒" : ""}
            </button>
          ))}
        </div>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder={t(lang, "photoCustom")}
          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none mb-2"
        />
        {err && <div className="text-red-400 text-sm mb-2">{err}</div>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          className="hidden"
        />
        <button
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-lg bg-amber-500 text-black font-semibold py-3 active:scale-[0.99] transition disabled:opacity-50"
        >
          {uploading ? t(lang, "uploading") : `📷 ${t(lang, "addPhoto")} · ${chosenLabel}`}
        </button>
      </div>

      {/* Gallery grouped by category */}
      {photos.length === 0 ? (
        <Empty>{t(lang, "noPhotos")}</Empty>
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([cat, items]) => (
            <div key={cat}>
              <div className="text-xs uppercase tracking-wide text-neutral-400 mb-2 flex items-center gap-1">
                {categoryLabel(lang, cat)}
                {cat === PRICE_CATEGORY && <span>🔒</span>}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setViewer(p)}
                    className="relative aspect-square rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900"
                  >
                    {p.signedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.signedUrl}
                        alt={p.category || "photo"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-xs text-neutral-600">
                        n/a
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen viewer */}
      {viewer && viewer.signedUrl && (
        <div
          onClick={() => setViewer(null)}
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewer.signedUrl}
            alt={viewer.category || "photo"}
            className="max-h-[85vh] max-w-full object-contain rounded-lg"
          />
          <div className="text-sm text-neutral-300 mt-3 text-center">
            {viewer.label || categoryLabel(lang, viewer.category || "")}
            {viewer.uploaderName ? ` · ${viewer.uploaderName}` : ""}
          </div>
          <button className="mt-2 text-neutral-400 text-sm">{t(lang, "tapClose")}</button>
        </div>
      )}
    </div>
  );
}

function QcRow({
  q,
  busy,
  act,
  lang,
}: {
  q: QcCheck;
  busy: boolean;
  act: (p: Record<string, unknown>) => void;
  lang: string;
}) {
  const [measured, setMeasured] = useState(q.measured || "");
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">{q.label}</div>
          {q.expected && (
            <div className="text-xs text-neutral-500">
              {t(lang, "target")}: {q.expected}
            </div>
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
            {q.passed ? t(lang, "pass").toUpperCase() : t(lang, "fail").toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input
          value={measured}
          onChange={(e) => setMeasured(e.target.value)}
          placeholder={t(lang, "measured")}
          className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
        />
        <button
          disabled={busy}
          onClick={() => act({ type: "qc_save", id: q.id, measured, passed: true })}
          className="px-3 py-2 rounded-lg bg-green-600/20 border border-green-600 text-green-200 text-sm font-semibold active:scale-95"
        >
          {t(lang, "pass")}
        </button>
        <button
          disabled={busy}
          onClick={() => act({ type: "qc_save", id: q.id, measured, passed: false })}
          className="px-3 py-2 rounded-lg bg-red-600/20 border border-red-600 text-red-200 text-sm font-semibold active:scale-95"
        >
          {t(lang, "fail")}
        </button>
      </div>
    </div>
  );
}

function dueInfo(due: string | null, lang: string) {
  if (!due) return { text: "—", cls: "text-neutral-400" };
  const d = new Date(due + "T00:00:00");
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  const date = d.toLocaleDateString(
    lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US",
    { weekday: "short", month: "short", day: "numeric" }
  );
  const unit = Math.abs(days) === 1 ? t(lang, "dayLeft") : t(lang, "daysLeft");
  if (days < 0)
    return { text: `${date} · ${t(lang, "overdue")}`, cls: "text-red-400" };
  if (days <= 7)
    return { text: `${date} · ${days} ${unit}`, cls: "text-amber-400" };
  return { text: `${date} · ${days} ${unit}`, cls: "text-neutral-200" };
}

function HeroCarousel({ photos, lang }: { photos: Photo[]; lang: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Photo | null>(null);
  const shots = photos.filter((p) => p.signedUrl);

  if (shots.length === 0) {
    return (
      <div className="mb-5 h-40 rounded-xl border border-dashed border-neutral-800 bg-neutral-900 flex items-center justify-center text-sm text-neutral-600">
        {t(lang, "noPhotos")}
      </div>
    );
  }

  function scrollBy(dir: number) {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <div className="relative mb-5">
      <div
        ref={scroller}
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory rounded-xl scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {shots.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpen(p)}
            className="relative shrink-0 w-[85%] sm:w-[60%] aspect-video snap-center rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.signedUrl}
              alt={p.category || "photo"}
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-[11px] text-neutral-200 px-2 py-1 text-left">
              {p.label || categoryLabel(lang, p.category || "")}
            </span>
          </button>
        ))}
      </div>
      {shots.length > 1 && (
        <>
          <button
            onClick={() => scrollBy(-1)}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 border border-neutral-700 text-lg"
            aria-label="prev"
          >
            ‹
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 border border-neutral-700 text-lg"
            aria-label="next"
          >
            ›
          </button>
        </>
      )}
      {open && open.signedUrl && (
        <div
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open.signedUrl}
            alt={open.category || "photo"}
            className="max-h-[85vh] max-w-full object-contain rounded-lg"
          />
          <div className="text-sm text-neutral-300 mt-3 text-center">
            {open.label || categoryLabel(lang, open.category || "")}
            {open.uploaderName ? ` · ${open.uploaderName}` : ""}
          </div>
          <button className="mt-2 text-neutral-400 text-sm">
            {t(lang, "tapClose")}
          </button>
        </div>
      )}
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
