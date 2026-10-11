"use client";

// The pro shot list: a progress ring, one "take next shot" button, and every
// shot for this kind of work as a row. Tapping any row opens the camera on
// that shot with its ghost; the camera then walks the remaining shots.

import { shotList, shotProgress, formatGps, type ShotDef } from "@/lib/shop/measure-shots";
import type { MeasureData, MeasureShape } from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import ShotGhost from "../overlays/ShotGhost";
import { useEffect, useState } from "react";
import { capturedPreview, type ShotRequest } from "../overlays/ShotCamera";

function fill(s: string, vars: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export function ProgressRing({ done, total, complete, size = 64 }: { done: number; total: number; complete: boolean; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const frac = total ? done / total : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${done}/${total}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={6} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={complete ? "#22a06b" : "#4087ed"}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${c * frac} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray .4s ease" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size / 3.6} fontWeight={700} fill="currentColor">
        {done}/{total}
      </text>
    </svg>
  );
}

/** The taken photo itself, with a small check; falls back to a plain check. */
function ShotThumb({ path, sheetId }: { path: string; sheetId?: string }) {
  const [failed, setFailed] = useState(false);
  const src = capturedPreview.get(path) || (sheetId ? `/shop/api/measure-photo?sheetId=${encodeURIComponent(sheetId)}&path=${encodeURIComponent(path)}` : "");
  return (
    <>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="text-xl text-white">✓</span>
      )}
      {src && !failed && (
        <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: "#22a06b", boxShadow: "0 0 0 2px #fff" }}>
          ✓
        </span>
      )}
    </>
  );
}

function when(iso: string, lang: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ShotList({
  lang,
  data,
  shape,
  onShoot,
  err,
}: {
  lang: string;
  data: MeasureData;
  shape: MeasureShape;
  onShoot: (req: ShotRequest) => void;
  err?: string | null;
}) {
  // The sheet id comes from the URL after mount (keeps SSR and hydration identical).
  const [sheetId, setSheetId] = useState<string | undefined>();
  useEffect(() => {
    const m = window.location.pathname.match(/\/measure\/([0-9a-f-]{36})/i);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (m) setSheetId(m[1]);
  }, []);
  const shots = shotList(shape, data);
  const prog = shotProgress(data, shape);
  const filled = data.photos.map((p) => p.slot);
  const reqLeft = prog.requiredTotal - prog.requiredDone;
  const open = (s: ShotDef) =>
    onShoot({ slot: s.slot, label: mt(lang, `slot_${s.slot}`), shots, filled });

  return (
    <div data-testid="shot-list">
      <div className="flex items-center gap-4">
        <ProgressRing done={prog.done} total={prog.total} complete={reqLeft === 0} />
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-semibold text-neutral-100">
            {fill(mt(lang, "shotsOf"), { n: prog.done, t: prog.total })}
          </div>
          <div className={`text-[15px] ${reqLeft ? "text-amber-300" : "text-emerald-300"}`}>
            {reqLeft ? fill(mt(lang, "shotsReqLeft"), { n: reqLeft }) : `✓ ${mt(lang, "shotsAllReq")}`}
          </div>
        </div>
      </div>

      {err && <div className="mt-3 text-sm text-red-400">{err}</div>}

      {prog.next && (
        <button
          type="button"
          onClick={() => open(prog.next!)}
          className="mt-4 min-h-14 w-full rounded-2xl bg-indigo-600 px-4 text-[17px] font-semibold text-white"
        >
          📷 {mt(lang, "shotStart")}
          <span className="block text-[13px] font-normal opacity-85 truncate">{mt(lang, `slot_${prog.next.slot}`)}</span>
        </button>
      )}

      <ul className="mt-4 divide-y divide-neutral-800 rounded-2xl border border-neutral-800 bg-neutral-950/40 overflow-hidden">
        {shots.map((s) => {
          const ph = data.photos.find((p) => p.slot === s.slot);
          return (
            <li key={s.slot}>
              <button
                type="button"
                onClick={() => open(s)}
                data-shot={s.slot}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left min-h-16"
              >
                <span
                  className="relative flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                  style={{ background: ph ? "#22a06b" : "#1f2430" }}
                >
                  {ph ? (
                    <ShotThumb key={ph.path} path={ph.path} sheetId={sheetId} />
                  ) : (
                    <ShotGhost ghost={s.ghost} className="h-full w-full p-0.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-snug text-neutral-100">
                    {mt(lang, `slot_${s.slot}`)}
                  </span>
                  <span className="block text-[13px] text-neutral-500">
                    {ph ? (
                      <>
                        <span suppressHydrationWarning>{when(ph.takenAt, lang)}</span>
                        {ph.lat !== undefined && ph.lng !== undefined && (
                          <span className="block truncate">📍 {formatGps(ph.lat, ph.lng)}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className={s.tier === "required" ? "text-amber-300" : ""}>
                          {mt(lang, s.tier === "required" ? "shotRequired" : "shotRecommended")}
                        </span>
                        {s.tape ? ` · 📏 ${mt(lang, "shotTape")}` : ""}
                      </>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-[15px] text-neutral-500">{ph ? mt(lang, "retake") : "›"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
