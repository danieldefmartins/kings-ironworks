"use client";

// Camera-first shot capture: a full-screen viewfinder with the shot's name and
// its ghost silhouette, straight into markup (dimension line + typed value)
// after the shutter, then on to the next missing shot. Every saved photo is
// stamped with its capture time and, when the phone gives one, a GPS fix.
//
// When the browser has no live camera (desktop, denied permission, old iOS)
// the same screen falls back to the OS camera sheet.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PhotoMarkup from "../PhotoMarkup";
import ShotGhost from "./ShotGhost";
import { mt } from "@/lib/shop/measure-i18n";
import { stampPhoto, type ShotDef, type ShotFix } from "@/lib/shop/measure-shots";
import type { AnnotationStroke, MeasureData } from "@/lib/shop/measure";

/** What the shot list hands to the photo overlay. */
export interface ShotRequest {
  slot: string;
  label: string;
  shots: ShotDef[];
  filled: string[];
}

/** Just-captured photos by stored path, so the shot list can show them before the sheet syncs. */
export const capturedPreview = new Map<string, string>();

export function isShotRequest(v: unknown): v is ShotRequest {
  return !!v && typeof v === "object" && Array.isArray((v as ShotRequest).shots);
}

function fill(s: string, vars: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export default function ShotCamera({
  lang,
  jobId,
  sheetName,
  req,
  set,
  onClose,
}: {
  lang: string;
  jobId: string;
  sheetName: string;
  req: ShotRequest;
  set: (fn: (d: MeasureData) => void) => void;
  onClose: () => void;
}) {
  const shots = req.shots;
  const [slot, setSlot] = useState(req.slot);
  const [done, setDone] = useState<Set<string>>(() => new Set(req.filled));
  const [file, setFile] = useState<File | null>(null);
  const [live, setLive] = useState<"pending" | "on" | "off">(() =>
    typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function" ? "pending" : "off"
  );
  const [fix, setFix] = useState<ShotFix | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const shot = shots.find((s) => s.slot === slot) || shots[0];
  const index = Math.max(0, shots.findIndex((s) => s.slot === shot.slot));
  const label = mt(lang, `slot_${shot.slot}`);

  const nextMissing = useCallback(
    (after: string, taken: Set<string>) => {
      const i = shots.findIndex((s) => s.slot === after);
      const order = [...shots.slice(i + 1), ...shots.slice(0, Math.max(0, i))];
      const missing = order.filter((s) => !taken.has(s.slot) && s.slot !== after);
      return missing.find((s) => s.tier === "required") || missing[0] || null;
    },
    [shots]
  );

  // GPS: one fix for the session, refreshed while the camera is open.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setFix({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 20_000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Live viewfinder while no photo is being marked up.
  useEffect(() => {
    if (file) return;
    let cancelled = false;
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (typeof md?.getUserMedia !== "function") return;
    md.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.play().catch(() => undefined);
        }
        setLive("on");
      })
      .catch(() => !cancelled && setLive("off"));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [file]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => void (document.body.style.overflow = prev);
  }, []);

  function shutter() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob(
      (b) => b && setFile(new File([b], `${shot.slot}.jpg`, { type: "image/jpeg", lastModified: Date.now() })),
      "image/jpeg",
      0.92
    );
  }

  function onSaved(path: string, strokes: AnnotationStroke[]) {
    const taken = new Set(done);
    taken.add(shot.slot);
    const stamped = stampPhoto(shot.slot, path, fix, new Date(), strokes.length > 0);
    if (file) capturedPreview.set(path, URL.createObjectURL(file));
    set((d) => {
      d.photos = [...d.photos.filter((p) => p.slot !== shot.slot), stamped];
      if (strokes.length > 0) d.annotations[path] = strokes;
    });
    setDone(taken);
    setFile(null);
    const n = nextMissing(shot.slot, taken);
    if (n) setSlot(n.slot);
    else onClose();
  }

  const upcoming = nextMissing(shot.slot, new Set([...done, shot.slot]));

  if (file) {
    return (
      <PhotoMarkup
        jobId={jobId}
        sheetName={sheetName}
        lang={lang}
        slot={shot.slot}
        slotLabel={label}
        initialFile={file}
        saveLabel={upcoming ? mt(lang, "shotSaveNext") : mt(lang, "shotSave")}
        onSaved={onSaved}
        onClose={() => setFile(null)}
      />
    );
  }

  const pickInput = (capture: boolean) => (
    <input
      type="file"
      accept="image/*"
      {...(capture ? { capture: "environment" as const } : {})}
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) setFile(f);
        e.target.value = "";
      }}
    />
  );

  const ui = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      data-testid="shot-camera"
      className="fixed inset-0 z-[60] flex flex-col print:hidden"
      style={{ background: "#000", color: "#fff" }}
    >
      {/* Top bar */}
      <div className="flex items-start gap-3 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label={mt(lang, "shotClose")}
          className="min-h-11 min-w-11 rounded-full text-xl"
          style={{ background: "rgba(255,255,255,.14)" }}
        >
          ✕
        </button>
        <div className="flex-1 min-w-0 text-center">
          <div className="text-[13px] sm:text-[15px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,.65)" }}>
            {fill(mt(lang, "shotOfShots"), { i: index + 1, t: shots.length })}
            {" · "}
            {mt(lang, shot.tier === "required" ? "shotRequired" : "shotRecommended")}
          </div>
          <div className="text-[19px] sm:text-[24px] font-semibold leading-tight mt-0.5">{label}</div>
        </div>
        <div
          className="min-h-11 min-w-11 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,.14)" }}
          aria-label={fix ? "GPS" : undefined}
          title={fix ? `GPS ±${Math.round(fix.acc || 0)} m` : undefined}
        >
          <span
            className="block rounded-full"
            style={{ width: 10, height: 10, background: fix ? "#34c759" : "rgba(255,255,255,.35)" }}
          />
        </div>
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 overflow-hidden mx-2 rounded-3xl" style={{ background: "#111" }}>
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
          style={{ display: live === "on" ? "block" : "none" }}
        />
        <ShotGhost ghost={shot.ghost} className="absolute inset-0 h-full w-full p-6" />
        <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-2 px-4">
          {shot.tape && (
            <span className="rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: "#facc15", color: "#000" }}>
              📏 {mt(lang, "shotTape")}
            </span>
          )}
          <span
            className="rounded-full px-4 py-2 text-[15px] sm:text-[18px] font-medium text-center"
            style={{ background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)" }}
          >
            {mt(lang, `shotHint_${shot.ghost}`)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 items-center px-6 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]">
        <label
          className="justify-self-start min-h-12 px-4 rounded-full flex items-center text-[15px] font-semibold cursor-pointer"
          style={{ background: "rgba(255,255,255,.14)" }}
        >
          {mt(lang, "shotLibrary")}
          {pickInput(false)}
        </label>
        {live === "on" ? (
          <button
            type="button"
            onClick={shutter}
            aria-label={mt(lang, "shotShutter")}
            className="justify-self-center rounded-full"
            style={{ width: 78, height: 78, border: "5px solid #fff", padding: 4, background: "transparent" }}
          >
            <span className="block h-full w-full rounded-full" style={{ background: "#fff" }} />
          </button>
        ) : (
          <label
            aria-label={mt(lang, "shotOpenCamera")}
            className="justify-self-center rounded-full cursor-pointer"
            style={{ width: 78, height: 78, border: "5px solid #fff", padding: 4, display: "block" }}
          >
            <span className="block h-full w-full rounded-full" style={{ background: "#fff" }} />
            {pickInput(true)}
          </label>
        )}
        <button
          type="button"
          disabled={!upcoming}
          onClick={() => upcoming && setSlot(upcoming.slot)}
          aria-label={mt(lang, "shotNext")}
          className="justify-self-end min-h-12 min-w-12 rounded-full text-2xl disabled:opacity-30"
          style={{ background: "rgba(255,255,255,.14)" }}
        >
          ›
        </button>
      </div>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}
