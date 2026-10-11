"use client";
// Owner view of every active worker: profile completeness, W-9 status, year-end
// 1099 readiness, and an edit sheet to type in what a worker handed over.
// Nothing here ever holds more than the last 4 digits of a TIN, except the
// "Enter TIN" inputs while the owner is typing (cleared once saved).
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Download, Send, X } from "lucide-react";
import { formatTin, maskedTin, validateTin, type TinType } from "@/lib/shop/tin";
import { fieldOk, stepDone, type ProfileFields } from "@/lib/shop/w9";
import { w9t } from "@/lib/shop/w9-i18n";
import type { RosterRow } from "@/lib/shop/w9-service";
import { PIN_LENGTH, pinRuleError } from "@/lib/shop/pin";
import { pint } from "@/lib/shop/pin-i18n";

// Owner gives a worker a temporary PIN; the worker is asked to replace it.
function ResetPin({ row, lang }: { row: RosterRow; lang: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const rule = pinRuleError(pin);
  async function save() {
    if (rule) { setMsg({ ok: false, text: pint(lang, `err.${rule}`) }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/shop/api/pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "reset", workerId: row.id, pin }), cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        const code = String(d.code || "server");
        setMsg({ ok: false, text: pint(lang, ["format", "repeated", "sequence", "rate"].includes(code) ? `err.${code}` : "err.server") });
        return;
      }
      setPin("");
      setMsg({ ok: true, text: pint(lang, "resetDone", { name: row.name.split(" ")[0] }) });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: pint(lang, "err.server") });
    } finally { setBusy(false); }
  }
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-neutral-950/50 p-4" data-testid="reset-pin">
      <div>
        <h3 className="font-semibold">{pint(lang, "resetPin")}</h3>
        <p className="mt-0.5 text-xs text-neutral-500">{pint(lang, "resetHint", { name: row.name.split(" ")[0] })}</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-neutral-400">{pint(lang, "resetLabel")}
          <input className={`${input} w-40 font-mono text-lg tracking-[0.5em]`} type="password" inputMode="numeric" pattern="[0-9]*" autoComplete="new-password" data-1p-ignore maxLength={PIN_LENGTH} value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH)); setMsg(null); }} />
        </label>
        <button type="button" disabled={busy || pin.length !== PIN_LENGTH} onClick={save} className="min-h-12 rounded-xl border border-amber-500/50 px-5 text-sm font-semibold text-amber-300 disabled:opacity-40">{pint(lang, "resetSave")}</button>
      </div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p>}
    </section>
  );
}

const input = "mt-1 min-h-12 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-base";
const EDIT_FIELDS: (keyof ProfileFields)[] = ["name", "legalName", "phone", "email", "street", "unit", "city", "state", "postalCode", "emergencyName", "emergencyPhone", "emergencyRelationship", "zelleContact", "zelleName"];
const CLEARABLE = new Set<keyof ProfileFields>(["unit", "zelleContact", "zelleName"]);

function fmtDate(iso: string | null, lang: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });
}

async function post(body: unknown) {
  const r = await fetch("/shop/api/w9", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) throw Object.assign(new Error(d.error || "failed"), { code: d.code, field: d.field });
  return d;
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium ${ok ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-neutral-500"}`}>
      {ok ? <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} /> : <X aria-hidden className="h-3.5 w-3.5" />}{label}
    </span>
  );
}

function W9Line({ row, lang }: { row: RosterRow; lang: string }) {
  const t = (k: string, v?: Record<string, string | number>) => w9t(lang, k, v);
  const w = row.profile.w9;
  if (w.status === "signed" && !w.needsSignature) {
    return <span className="text-sm font-medium text-emerald-300">{t("st_signed")} ✓ {fmtDate(w.signedAt, lang)}{w.tinType && w.tinLast4 ? ` · ${maskedTin(w.tinType, w.tinLast4)}` : ""}</span>;
  }
  if (w.onFile && w.needsSignature) {
    return <span className="text-sm text-amber-300">{t("st_prepared")} · {t("onFileLabel")} {maskedTin(w.onFile.tinType, w.onFile.tinLast4)}</span>;
  }
  if (w.status === "requested") return <span className="text-sm text-amber-300">{t("st_requested")} {fmtDate(w.requestedAt, lang)}</span>;
  return <span className="text-sm text-neutral-500">{t("st_none")}</span>;
}

function Editor({ row, lang, onDone, self = false }: { row: RosterRow; lang: string; onDone: () => void; self?: boolean }) {
  const t = (k: string, v?: Record<string, string | number>) => w9t(lang, k, v);
  const router = useRouter();
  const p = row.profile;
  const [f, setF] = useState<Record<string, string>>(() => Object.fromEntries(EDIT_FIELDS.map(k => [k, String(p[k] ?? "")])));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tinType, setTinType] = useState<TinType>("ssn");
  const [tin, setTin] = useState("");
  const [tinConfirm, setTinConfirm] = useState("");
  const [tinMsg, setTinMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const tinErr = tin || tinConfirm ? validateTin(tinType, tin, tinConfirm) : "length";

  async function save() {
    const fields: Record<string, string> = {};
    for (const k of EDIT_FIELDS) {
      const v = (f[k] || "").trim();
      if (v === String(p[k] ?? "").trim()) continue;
      if (!v && !CLEARABLE.has(k)) continue;
      fields[k] = v;
    }
    const bad = Object.keys(fields).filter(k => fields[k] && !fieldOk(fields as Partial<ProfileFields>, k as keyof ProfileFields));
    if (bad.length) { setMsg({ ok: false, text: `${t(bad[0])}: ${t("fixField")}` }); return; }
    if (!Object.keys(fields).length) { onDone(); return; }
    setBusy(true); setMsg(null);
    try {
      await post({ type: "profile", workerId: row.id, fields });
      setMsg({ ok: true, text: t("saved") });
      router.refresh();
    } catch (e) {
      const field = (e as { field?: string }).field;
      setMsg({ ok: false, text: field ? `${t(field)}: ${t("fixField")}` : t("saveError") });
    } finally { setBusy(false); }
  }

  async function saveTin() {
    if (tinErr) return;
    setBusy(true); setTinMsg(null);
    try {
      const d = await post({ type: "prepare", workerId: row.id, tinType, tin, tinConfirm });
      setTin(""); setTinConfirm("");
      setTinMsg({ ok: true, text: t("tinSaved", { masked: maskedTin(d.tinType, d.tinLast4) }) });
      router.refresh();
    } catch (e) {
      const code = (e as { code?: string }).code || "";
      setTinMsg({ ok: false, text: code.startsWith("tin.") ? t(code) : code === "key" ? t("err.key") : t("saveError") });
    } finally { setBusy(false); }
  }

  const fld = (k: keyof ProfileFields, cls = "") => (
    <label key={k} className={`text-sm text-neutral-400 ${cls}`}>{k === "name" ? t("displayName") : t(k)}
      <input className={input} value={f[k]} onChange={e => setF(s => ({ ...s, [k]: e.target.value }))} />
    </label>
  );
  return (
    <div className="space-y-5 border-t border-white/10 p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {fld("name")}{fld("legalName")}{fld("phone")}{fld("email")}
        {fld("street", "sm:col-span-2")}{fld("unit")}{fld("city")}{fld("state")}{fld("postalCode")}
        {fld("emergencyName")}{fld("emergencyPhone")}{fld("emergencyRelationship")}
        {fld("zelleContact")}{fld("zelleName")}
      </div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p>}
      <div className="flex gap-3">
        <button type="button" disabled={busy} onClick={save} className="min-h-12 flex-1 rounded-xl bg-amber-500 px-5 font-semibold text-black disabled:opacity-50 sm:flex-none">{t("save")}</button>
        <button type="button" onClick={onDone} className="min-h-12 rounded-xl border border-neutral-700 px-5 text-sm">{t("close")}</button>
      </div>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-neutral-950/50 p-4">
        <div>
          <h3 className="font-semibold">{t("enterTin")}</h3>
          <p className="mt-0.5 text-xs text-neutral-500">{t("enterTinHint")}</p>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1 sm:max-w-xs">
          {(["ssn", "itin", "ein"] as const).map(k => (
            <button key={k} type="button" aria-pressed={tinType === k} onClick={() => { setTinType(k); setTin(""); setTinConfirm(""); }} className={`min-h-10 rounded-lg text-sm font-semibold ${tinType === k ? "bg-neutral-700 text-white" : "text-neutral-400"}`}>{t(`tin_${k}`)}</button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-neutral-400">{t("tinEnter")}<input className={`${input} font-mono tracking-widest`} type="password" inputMode="numeric" autoComplete="off" data-1p-ignore value={tin} onChange={e => setTin(formatTin(tinType, e.target.value))} /></label>
          <label className="text-sm text-neutral-400">{t("tinConfirm")}<input className={`${input} font-mono tracking-widest`} type="password" inputMode="numeric" autoComplete="off" data-1p-ignore value={tinConfirm} onChange={e => setTinConfirm(formatTin(tinType, e.target.value))} /></label>
        </div>
        {tinErr && tinErr !== "length" && tinConfirm.length >= tin.length && <p className="text-sm text-rose-300">{t(`tin.${tinErr}`)}</p>}
        {tinMsg && <p role="status" className={`text-sm ${tinMsg.ok ? "text-emerald-300" : "text-rose-300"}`}>{tinMsg.text}</p>}
        <button type="button" disabled={busy || !!tinErr} onClick={saveTin} className="min-h-12 rounded-xl border border-amber-500/50 px-5 text-sm font-semibold text-amber-300 disabled:opacity-40">{t("enterTin")}</button>
      </section>
      {!self && <ResetPin row={row} lang={lang} />}
    </div>
  );
}

function Row({ row, lang, self = false }: { row: RosterRow; lang: string; self?: boolean }) {
  const t = (k: string, v?: Record<string, string | number>) => w9t(lang, k, v);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const p = row.profile;
  const w = p.w9;
  const signed = w.status === "signed";
  async function request() {
    setBusy(true); setNote("");
    try { await post({ type: "request", workerIds: [row.id] }); setNote(t("requestedOk")); router.refresh(); }
    catch { setNote(t("saveError")); }
    finally { setBusy(false); }
  }
  const legal = p.legalName && p.legalName.trim() !== row.name.trim() ? p.legalName : "";
  return (
    <li className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60" data-worker-row={row.id}>
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold">{row.name}</span>
              {row.isOwner && <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300">{t("owner")}</span>}
              {row.system && <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-neutral-400">{t("system")}</span>}
              {row.payrollExcluded && !row.isOwner && !row.system && <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-neutral-400">{t("notOnPayroll")}</span>}
              {row.pinReset && <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300">{pint(lang, "resetPending")}</span>}
            </div>
            {legal && <div className="mt-0.5 truncate text-sm text-neutral-400">{legal}</div>}
            <div className="mt-0.5 text-sm text-neutral-500">{row.role}{row.hourlyRate != null ? ` · $${row.hourlyRate.toFixed(2)}/h` : ""}</div>
          </div>
          <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)} className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-amber-300 hover:bg-white/5">
            {t("edit")}<ChevronDown aria-hidden className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip ok={fieldOk(p, "phone")} label={t("chip_phone")} />
          <Chip ok={fieldOk(p, "email")} label={t("chip_email")} />
          <Chip ok={stepDone(p, "address")} label={t("chip_address")} />
          <Chip ok={stepDone(p, "emergency")} label={t("chip_emergency")} />
          <Chip ok={stepDone(p, "payment")} label={t("chip_zelle")} />
          <Chip ok={stepDone(p, "w9")} label={t("chip_w9")} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <W9Line row={row} lang={lang} />
          <div className="flex flex-wrap gap-2">
            {signed && (
              <a href={`/shop/api/w9/pdf?worker=${row.id}&download=1`} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-white/10 px-4 text-sm font-semibold"><Download aria-hidden className="h-4 w-4" />{t("download")}</a>
            )}
            {(!signed || w.needsSignature) && !row.complete && (
              <button type="button" disabled={busy} onClick={request} className="flex min-h-11 items-center gap-1.5 rounded-xl border border-amber-500/40 px-4 text-sm font-semibold text-amber-300 disabled:opacity-50"><Send aria-hidden className="h-4 w-4" />{t("requestOne")}</button>
            )}
          </div>
        </div>
        {note && <p role="status" className="text-sm text-emerald-300">{note}</p>}
      </div>
      {open && <Editor row={row} lang={lang} self={self} onDone={() => setOpen(false)} />}
    </li>
  );
}

export default function TeamRoster({ rows, lang, keyConfigured, selfId }: { rows: RosterRow[]; lang: string; keyConfigured: boolean; selfId?: string }) {
  const t = (k: string, v?: Record<string, string | number>) => w9t(lang, k, v);
  const router = useRouter();
  const [showSystem, setShowSystem] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const visible = useMemo(() => rows.filter(r => showSystem || !r.system), [rows, showSystem]);
  const systemCount = rows.filter(r => r.system).length;
  const contractors = rows.filter(r => r.contractor);
  const ready = contractors.filter(r => r.profile.w9.status === "signed");
  const missing = contractors.filter(r => r.profile.w9.status !== "signed");

  async function requestAll() {
    setBusy(true); setNote("");
    try { const d = await post({ type: "request", all: true }); setNote(t("requestedAllOk", { n: d.requested.length })); router.refresh(); }
    catch { setNote(t("saveError")); }
    finally { setBusy(false); }
  }

  return (
    <section className="space-y-5" aria-labelledby="team-h">
      {!keyConfigured && <p role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{t("keyMissing")}</p>}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="team-h" className="text-2xl font-semibold tracking-tight">{t("teamTitle")} <span className="text-base font-normal text-neutral-500">{visible.length}</span></h2>
          <p className="mt-1 text-sm text-neutral-400">{t("teamSub")}</p>
        </div>
        <button type="button" disabled={busy || !missing.length} onClick={requestAll} className="flex min-h-12 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-black disabled:opacity-40"><Send aria-hidden className="h-4 w-4" />{t("requestAll")}</button>
      </header>
      {note && <p role="status" className="text-sm text-emerald-300">{note}</p>}

      <section className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4 sm:p-5" aria-label={t("readiness")}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-semibold">{t("readiness")}</h3>
          <span className="text-sm tabular-nums text-neutral-400">{ready.length}/{contractors.length}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${contractors.length ? (ready.length / contractors.length) * 100 : 0}%` }} /></div>
        <p className="mt-2 text-sm text-neutral-400">{t("readinessSub", { ready: ready.length, total: contractors.length })}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rose-300">{t("readinessMissing")} · {missing.length}</p>
            <ul className="space-y-1 text-sm">{missing.map(r => <li key={r.id} className="flex justify-between gap-2"><span className="truncate">{r.name}</span><span className="shrink-0 text-xs text-neutral-500">{t(`st_${r.profile.w9.status}`)}</span></li>)}</ul>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">{t("readinessReady")} · {ready.length}</p>
            <ul className="space-y-1 text-sm">{ready.map(r => <li key={r.id} className="flex justify-between gap-2"><span className="truncate">{r.name}</span><span className="shrink-0 font-mono text-xs text-neutral-500">{r.profile.w9.tinType && r.profile.w9.tinLast4 ? maskedTin(r.profile.w9.tinType, r.profile.w9.tinLast4) : ""}</span></li>)}</ul>
          </div>
        </div>
      </section>

      {visible.length ? <ul className="space-y-3">{visible.map(r => <Row key={r.id} row={r} lang={lang} self={r.id === selfId} />)}</ul> : <p className="rounded-2xl border border-white/10 p-8 text-center text-neutral-500">{t("noWorkers")}</p>}
      {systemCount > 0 && (
        <label className="flex min-h-12 items-center gap-3 text-sm text-neutral-400">
          <input type="checkbox" className="h-5 w-5 accent-amber-500" checked={showSystem} onChange={e => setShowSystem(e.target.checked)} />
          {t("showSystem")} ({systemCount})
        </label>
      )}
    </section>
  );
}
