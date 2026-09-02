"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import AddressLink from "../../AddressLink";
import {
  STAGES,
  PHOTO_CATEGORIES,
  PRICE_CATEGORY,
  type Job,
  type CutItem,
  type Material,
  type QcCheck,
  type Photo,
} from "@/lib/shop/shared";
import {
  t,
  stageLabel,
  categoryLabel,
  specValue,
  materialTypeLabel,
  MATERIAL_TYPES,
  SIZE_OPTIONS,
  SPEC_OPTIONS,
} from "@/lib/shop/i18n";
import { mt } from "@/lib/shop/measure-i18n";

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

const COLOR_SWATCH: Record<string, string> = {
  Black: "#111114",
  White: "#f3f3f3",
  Bronze: "#8c6239",
};

export default function TravelerClient({
  job,
  cut,
  materials,
  qc,
  photos,
  canSeePrices,
  isAdmin = false,
  lang,
}: {
  job: Job;
  cut: CutItem[];
  materials: Material[];
  qc: QcCheck[];
  photos: Photo[];
  canSeePrices: boolean;
  isAdmin?: boolean;
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

      {job.archived && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-900 p-3">
          <span className="flex-1 text-sm text-neutral-300">📦 {t(lang, "jobArchivedNote")}</span>
          {isAdmin && (
            <button
              onClick={() => act({ type: "job_archive", jobId: job.id, archived: false })}
              disabled={busy}
              className="min-h-[48px] shrink-0 rounded-lg border border-neutral-600 bg-neutral-800 px-4 text-sm font-bold text-neutral-200 disabled:opacity-50"
            >
              {t(lang, "restoreJob")}
            </button>
          )}
        </div>
      )}

      {/* Customer information */}
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
          <div className="text-sm text-neutral-300 mt-2">
            <AddressLink address={job.address} lang={lang} />
          </div>
        )}
        <div className={`text-sm mt-1.5 flex items-center gap-2 ${due.cls}`}>
          <span aria-hidden>🗓️</span>
          <span className="font-semibold">
            {t(lang, "installBy")} {due.text}
          </span>
        </div>

        {/* Fabrication specs — loud & clear */}
        <SpecsPanel job={job} lang={lang} busy={busy} act={act} />

        {job.scope && (
          <div className="text-sm text-neutral-300 mt-3 leading-relaxed border-t border-neutral-800 pt-3">
            {job.scope}
          </div>
        )}
        <div className="text-xs text-neutral-600 mt-2">{job.job_number}</div>
      </div>

      {/* Field measure — pre-fabrication measurement sheets */}
      <button
        onClick={() => router.push(`/shop/job/${job.id}/measure`)}
        className="w-full mb-4 bg-neutral-900 border border-amber-600/60 rounded-xl p-4 flex items-center gap-3 text-left active:bg-neutral-800"
      >
        <span className="text-2xl" aria-hidden>
          📐
        </span>
        <span className="flex-1 font-bold">{mt(lang, "fieldMeasure")}</span>
        <span className="text-amber-400 text-xl" aria-hidden>
          ›
        </span>
      </button>

      {/* Photos — full section directly under the customer info */}
      <Section title={t(lang, "photos")} sub={`${photos.length}`}>
        <PhotosSection
          jobId={job.id}
          photos={photos}
          canSeePrices={canSeePrices}
          lang={lang}
          refresh={() => startTransition(() => router.refresh())}
        />
      </Section>

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

      {/* Materials (build list) */}
      <Section
        title={t(lang, "materialsList")}
        sub={`${cutDone}/${cut.length} ${t(lang, "done")}`}
      >
        <div className="space-y-2">
          {cut.map((c) => {
            const typeLabel = (MATERIAL_TYPES as readonly string[]).includes(
              c.profile || ""
            )
              ? materialTypeLabel(lang, c.profile || "")
              : c.profile;
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {typeLabel}
                    {c.size && (
                      <span className="text-amber-400 font-normal"> · {c.size}</span>
                    )}
                  </div>
                  {c.description && (
                    <div className="text-xs text-neutral-400 truncate">
                      {c.description}
                    </div>
                  )}
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {t(lang, "qty")}{" "}
                    <span className="text-neutral-300">{c.qty}</span> ·{" "}
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
                <button
                  disabled={busy}
                  onClick={() => act({ type: "cut_delete", id: c.id })}
                  className="shrink-0 w-8 h-8 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800"
                  aria-label="delete"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <MaterialAdder jobId={job.id} lang={lang} busy={busy} act={act} />
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

      {/* Administration, deliberately at the bottom and deliberately quiet. */}
      {isAdmin && !job.archived && (
        <div className="mt-8 border-t border-neutral-800 pt-4">
          <button
            onClick={() => {
              if (!window.confirm(t(lang, "archiveJobConfirm"))) return;
              act({ type: "job_archive", jobId: job.id, archived: true });
            }}
            disabled={busy}
            className="min-h-[48px] rounded-lg border border-neutral-700 bg-neutral-900 px-4 text-sm font-bold text-neutral-400 disabled:opacity-50"
          >
            📦 {t(lang, "archiveJob")}
          </button>
          <p className="mt-2 text-xs text-neutral-500">{t(lang, "archiveJobNote")}</p>
        </div>
      )}
    </div>
  );
}

export function MaterialAdder({
  jobId,
  lang,
  busy,
  act,
}: {
  jobId: string;
  lang: string;
  busy: boolean;
  act: (p: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<string>("");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState("1");
  const [length, setLength] = useState("");

  function reset() {
    setStep(1);
    setType("");
    setSize("");
    setQty("1");
    setLength("");
    setOpen(false);
  }

  function add() {
    act({ type: "cut_add", jobId, profile: type, size, qty, length });
    reset();
  }

  // Rapid entry: log this line but stay on the same profile with size/length
  // cleared, so workers can add several sizes of the same steel in a row.
  function addAnother() {
    act({ type: "cut_add", jobId, profile: type, size, qty, length });
    setSize("");
    setLength("");
    setQty("1");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-lg border border-dashed border-neutral-700 text-amber-400 py-2.5 text-sm font-semibold active:scale-[0.99]"
      >
        ➕ {t(lang, "addMaterial")}
      </button>
    );
  }

  const sizes = SIZE_OPTIONS[type] || [];

  return (
    <div className="mt-3 bg-neutral-900 border border-neutral-800 rounded-lg p-3 space-y-3">
      {/* Step 1 — material type */}
      {step === 1 ? (
        <>
          <div className="text-[11px] uppercase tracking-wide text-neutral-400">
            1 · {t(lang, "materialType")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {MATERIAL_TYPES.map((m) => (
              <button
                key={m}
                onClick={() => {
                  setType(m);
                  setSize("");
                  setStep(2);
                }}
                className="px-3 py-3 rounded-lg text-sm border bg-neutral-950 border-neutral-700 text-neutral-200 font-medium active:scale-[0.98]"
              >
                {materialTypeLabel(lang, m)}
              </button>
            ))}
          </div>
          <button
            onClick={reset}
            className="w-full rounded-lg border border-neutral-700 text-neutral-400 py-2 text-sm"
          >
            {t(lang, "cancel")}
          </button>
        </>
      ) : (
        /* Step 2 — size + qty + length */
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-amber-400">
              {materialTypeLabel(lang, type)}
            </span>
            <button
              onClick={() => setStep(1)}
              className="text-xs text-neutral-400 border border-neutral-700 rounded-md px-2 py-1"
            >
              ‹ {t(lang, "materialType")}
            </button>
          </div>
          <div className="text-[11px] uppercase tracking-wide text-neutral-400">
            2 · {t(lang, "size")}
          </div>
          {sizes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`px-2.5 py-1.5 rounded-full text-xs border transition ${
                    size === s
                      ? "bg-amber-500 text-black border-amber-500 font-semibold"
                      : "bg-neutral-950 border-neutral-700 text-neutral-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <input
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder={t(lang, "size")}
            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="numeric"
              placeholder={t(lang, "qty")}
              className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
            />
            <input
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder={t(lang, "length")}
              className="col-span-2 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={busy || !size.trim()}
              onClick={addAnother}
              className="rounded-lg border border-amber-500 text-amber-400 font-semibold py-2.5 text-sm disabled:opacity-40 active:scale-[0.99]"
            >
              ＋ {t(lang, "addAnother")}
            </button>
            <button
              disabled={busy || !size.trim()}
              onClick={add}
              className="rounded-lg bg-amber-500 text-black font-semibold py-2.5 text-sm disabled:opacity-40 active:scale-[0.99]"
            >
              {t(lang, "addBtn")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function SpecsPanel({
  job,
  lang,
  busy,
  act,
}: {
  job: Job;
  lang: string;
  busy: boolean;
  act: (p: Record<string, unknown>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [ft, setFt] = useState(job.finish_type || "");
  const [sheen, setSheen] = useState(job.finish_sheen || "");
  const [color, setColor] = useState(job.color || "");
  const [customColor, setCustomColor] = useState(
    job.color && !["Black", "White", "Bronze"].includes(job.color) ? job.color : ""
  );
  const [mounting, setMounting] = useState(job.mounting || "");

  const swatch = COLOR_SWATCH[job.color || ""] || "#9a7b4f";
  const isCustomColor =
    !!job.color && !["Black", "White", "Bronze"].includes(job.color);

  function save() {
    const finalColor =
      color === "Custom" ? customColor.trim() || "Custom" : color || null;
    act({
      type: "job_spec_set",
      jobId: job.id,
      finish_type: ft || null,
      finish_sheen: ft === "DTM Epoxy" ? sheen || null : null,
      color: finalColor,
      mounting: mounting || null,
    });
    setEditing(false);
  }

  return (
    <div className="mt-3 border-t border-neutral-800 pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-[0.15em] text-amber-500/80 font-bold">
          {t(lang, "specs")}
        </span>
        <button
          onClick={() => setEditing((v) => !v)}
          className="text-xs text-neutral-400 border border-neutral-700 rounded-md px-2 py-1"
        >
          {editing ? t(lang, "cancel") : "✏️ " + t(lang, "editSpecs")}
        </button>
      </div>

      {!editing ? (
        <div className="grid grid-cols-3 gap-2">
          <SpecTile label={t(lang, "finish")}>
            {job.finish_type ? (
              <>
                {specValue(lang, job.finish_type)}
                {job.finish_sheen && (
                  <span className="block text-xs text-neutral-400 font-normal">
                    {specValue(lang, job.finish_sheen)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-neutral-600 font-normal">{t(lang, "notSet")}</span>
            )}
          </SpecTile>
          <SpecTile label={t(lang, "colorLabel")}>
            {job.color ? (
              <span className="flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-neutral-600 shrink-0"
                  style={{ background: swatch }}
                />
                {isCustomColor ? job.color : specValue(lang, job.color)}
              </span>
            ) : (
              <span className="text-neutral-600 font-normal">{t(lang, "notSet")}</span>
            )}
          </SpecTile>
          <SpecTile label={t(lang, "mounting")}>
            {job.mounting ? (
              specValue(lang, job.mounting)
            ) : (
              <span className="text-neutral-600 font-normal">{t(lang, "notSet")}</span>
            )}
          </SpecTile>
        </div>
      ) : (
        <div className="space-y-3">
          <ChipRow
            label={t(lang, "finish")}
            options={SPEC_OPTIONS.finish_type}
            value={ft}
            onPick={setFt}
            display={(o) => specValue(lang, o)}
          />
          {ft === "DTM Epoxy" && (
            <ChipRow
              label={t(lang, "sheen")}
              options={SPEC_OPTIONS.finish_sheen}
              value={sheen}
              onPick={setSheen}
              display={(o) => specValue(lang, o)}
            />
          )}
          <ChipRow
            label={t(lang, "colorLabel")}
            options={SPEC_OPTIONS.color}
            value={color}
            onPick={setColor}
            display={(o) => specValue(lang, o)}
          />
          {color === "Custom" && (
            <input
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder={t(lang, "colorLabel")}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
            />
          )}
          <ChipRow
            label={t(lang, "mounting")}
            options={SPEC_OPTIONS.mounting}
            value={mounting}
            onPick={setMounting}
            display={(o) => specValue(lang, o)}
          />
          <button
            disabled={busy}
            onClick={save}
            className="w-full rounded-lg bg-amber-500 text-black font-semibold py-2.5 active:scale-[0.99] transition disabled:opacity-50"
          >
            {t(lang, "save")}
          </button>
        </div>
      )}
    </div>
  );
}

function SpecTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500 mb-0.5">
        {label}
      </div>
      <div className="text-sm font-bold text-neutral-100 leading-tight">
        {children}
      </div>
    </div>
  );
}

export function ChipRow({
  label,
  options,
  value,
  onPick,
  display,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onPick: (v: string) => void;
  display: (o: string) => string;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onPick(o)}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              value === o
                ? "bg-amber-500 text-black border-amber-500 font-semibold"
                : "bg-neutral-950 border-neutral-700 text-neutral-300"
            }`}
          >
            {display(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PhotosSection({
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
          accept="image/*,video/*"
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
                    {!p.signedUrl ? (
                      <span className="flex items-center justify-center w-full h-full text-xs text-neutral-600">
                        n/a
                      </span>
                    ) : p.kind === "video" ? (
                      <>
                        <video
                          src={p.signedUrl}
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-3xl text-white/90 pointer-events-none">
                          ▶
                        </span>
                      </>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.signedUrl}
                        alt={p.category || "photo"}
                        className="w-full h-full object-cover"
                      />
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
          {viewer.kind === "video" ? (
            <video
              src={viewer.signedUrl}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-full rounded-lg"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={viewer.signedUrl}
              alt={viewer.category || "photo"}
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
            />
          )}
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

export function QcRow({
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

export function dueInfo(due: string | null, lang: string) {
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
