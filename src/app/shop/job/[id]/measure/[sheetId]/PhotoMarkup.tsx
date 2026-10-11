"use client";

// Capture a checklist photo and mark dimensions on it. The ORIGINAL photo is
// uploaded untouched (evidence never degrades); the annotation strokes are
// returned to the sheet (stored in its JSON), and a flattened copy is also
// uploaded so the job's Photos tab shows the marked-up version.

import { useEffect, useRef, useState } from "react";
import { mt } from "@/lib/shop/measure-i18n";
import type { AnnotationStroke } from "@/lib/shop/measure";
import { dimGeometry } from "@/lib/shop/measure-shots";

type Tool = "draw" | "line" | "arrow" | "text" | "dim";

const COLORS = ["#ff2d2d", "#ffd400", "#2d7dff", "#ffffff"];
const MAX_DIM = 2000;

export default function PhotoMarkup({
  jobId,
  sheetName,
  lang,
  slot,
  slotLabel,
  onSaved,
  onClose,
  initialFile,
  saveLabel,
}: {
  jobId: string;
  sheetName: string;
  lang: string;
  slot: string;
  slotLabel: string;
  onSaved: (path: string, strokes: AnnotationStroke[]) => void;
  onClose: () => void;
  /** Shot-list flow: the photo was just captured — open straight into markup. */
  initialFile?: File | null;
  /** Overrides the save button text (e.g. "Save · Next"). */
  saveLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<File | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [tool, setTool] = useState<Tool>(initialFile ? "dim" : "draw");
  // A dimension line waiting for its typed value.
  const [pendingDim, setPendingDim] = useState<AnnotationStroke | null>(null);
  const [dimValue, setDimValue] = useState("");
  const sizeRef = useRef<{ w: number; h: number } | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [strokes, setStrokes] = useState<AnnotationStroke[]>([]);
  const [draft, setDraft] = useState<AnnotationStroke | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function loadFile(file: File) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      // The canvas only mounts once there is an image; size it in the draw effect.
      sizeRef.current = { w: Math.round(img.naturalWidth * scale), h: Math.round(img.naturalHeight * scale) };
      imgRef.current = img;
      fileRef.current = file;
      setStrokes([]);
      setDraft(null);
      setErr(null);
      setHasImage(true);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  useEffect(() => {
    if (initialFile) loadFile(initialFile);
  }, [initialFile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !hasImage) return;
    const sz = sizeRef.current;
    if (sz && (canvas.width !== sz.w || canvas.height !== sz.h)) {
      canvas.width = sz.w;
      canvas.height = sz.h;
    }
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const lw = Math.max(2.5, canvas.width / 260);
    const font = Math.max(18, canvas.width / 24);
    for (const s of [...strokes, ...(draft ? [draft] : []), ...(pendingDim ? [pendingDim] : [])]) {
      drawStroke(ctx, s, lw, font);
    }
  }, [strokes, draft, pendingDim, hasImage]);

  function toCanvas(e: React.PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  }

  function onDown(e: React.PointerEvent) {
    if (!hasImage || pendingDim) return;
    e.preventDefault();
    const p = toCanvas(e);
    if (tool === "text") {
      if (pendingText) {
        setStrokes((s) => [...s, { tool: "text", color, points: [p], text: pendingText }]);
        setPendingText(null);
      }
      return;
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraft({ tool, color, points: tool === "draw" ? [p] : [p, p] });
  }

  function onMove(e: React.PointerEvent) {
    if (!draft) return;
    e.preventDefault();
    const p = toCanvas(e);
    setDraft((d) => {
      if (!d) return d;
      if (d.tool === "draw") return { ...d, points: [...d.points, p] };
      return { ...d, points: [d.points[0], p] };
    });
  }

  function onUp() {
    if (!draft) return;
    const [a, b] = [draft.points[0], draft.points[draft.points.length - 1]];
    const long = draft.points.length > 1 && Math.hypot(b.x - a.x, b.y - a.y) > 8;
    if (draft.tool === "dim") {
      if (long) {
        setPendingDim(draft);
        setDimValue("");
      }
    } else if (draft.points.length > 1) setStrokes((s) => [...s, draft]);
    setDraft(null);
  }

  function commitDim() {
    if (!pendingDim) return;
    const v = dimValue.trim();
    setStrokes((s) => [...s, v ? { ...pendingDim, text: v } : pendingDim]);
    setPendingDim(null);
    setDimValue("");
  }

  function startText() {
    setTool("text");
    const txt = window.prompt(mt(lang, "addTextPrompt"));
    if (txt && txt.trim()) setPendingText(txt.trim());
  }

  async function upload(file: File, label: string): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    form.append("jobId", jobId);
    form.append("category", "Measurements");
    form.append("label", label);
    const res = await fetch("/shop/api/photo", { method: "POST", body: form });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.path) throw new Error(d.error || "Upload failed");
    return d.path as string;
  }

  async function save() {
    const canvas = canvasRef.current;
    const original = fileRef.current;
    if (!canvas || !original) return;
    setUploading(true);
    setErr(null);
    try {
      const label = `${sheetName} — ${slotLabel}`;
      const path = await upload(original, label);
      if (strokes.length > 0) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.9)
        );
        if (blob) {
          await upload(
            new File([blob], "marked.jpg", { type: "image/jpeg" }),
            `${label} (marked)`
          );
        }
      }
      onSaved(path, strokes);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 overflow-y-auto p-4 print:hidden">
      <div className="max-w-3xl mx-auto bg-neutral-900 border border-neutral-700 rounded-2xl p-4">
        <div className="flex items-center mb-3">
          <div className="font-bold">
            📷 {slotLabel}
            {!initialFile && <span className="block text-xs font-normal text-neutral-500">{slot}</span>}
          </div>
          <button
            onClick={onClose}
            className="ml-auto px-3 py-2 rounded-lg border border-neutral-700 text-neutral-300 text-sm"
          >
            ✕ {mt(lang, "cancel")}
          </button>
        </div>

        <label className={`${initialFile ? "hidden" : "block"} w-full text-center bg-neutral-800 border border-dashed border-neutral-600 rounded-xl py-4 text-sm font-semibold text-neutral-200 cursor-pointer mb-3`}>
          📷 {mt(lang, "choosePhoto")}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadFile(f);
              e.target.value = "";
            }}
          />
        </label>

        {hasImage && (
          <>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {(
                [
                  ["dim", mt(lang, "dimTool"), "↔"],
                  ["draw", mt(lang, "draw"), "✏️"],
                  ["line", mt(lang, "lineTool"), "／"],
                  ["arrow", mt(lang, "arrowTool"), "↗"],
                ] as [Tool, string, string][]
              ).map(([tl, label, icon]) => (
                <button
                  key={tl}
                  onClick={() => setTool(tl)}
                  className={`px-3 py-2 rounded-lg border text-xs font-bold ${
                    tool === tl
                      ? "border-amber-500 bg-amber-500/10 text-amber-300"
                      : "border-neutral-700 bg-neutral-800 text-neutral-300"
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
              <button
                onClick={startText}
                className={`px-3 py-2 rounded-lg border text-xs font-bold ${
                  tool === "text"
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-neutral-700 bg-neutral-800 text-neutral-300"
                }`}
              >
                T {mt(lang, "textTool")}
              </button>
              <span className="mx-1 flex gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      color === c ? "border-white" : "border-neutral-700"
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </span>
              <button
                onClick={() => setStrokes((s) => s.slice(0, -1))}
                className="px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs text-neutral-300"
              >
                ↩ {mt(lang, "undo")}
              </button>
              <button
                onClick={() => setStrokes([])}
                className="px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs text-neutral-300"
              >
                🗑 {mt(lang, "clearAll")}
              </button>
            </div>

            {pendingDim && (
              <form
                className="flex items-center gap-2 mb-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  commitDim();
                }}
              >
                <input
                  autoFocus
                  value={dimValue}
                  onChange={(e) => setDimValue(e.target.value)}
                  placeholder={mt(lang, "dimPrompt")}
                  aria-label={mt(lang, "dimPrompt")}
                  className="min-w-0 flex-1 min-h-12 rounded-xl border border-amber-500 bg-neutral-950 px-3 text-lg font-semibold"
                />
                <button type="submit" className="shrink-0 min-h-12 px-4 rounded-xl bg-amber-500 text-black font-bold">
                  {mt(lang, "dimAdd")}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDim(null)}
                  aria-label={mt(lang, "cancel")}
                  className="shrink-0 min-h-12 px-3 rounded-xl border border-neutral-700 text-neutral-300"
                >
                  ✕
                </button>
              </form>
            )}

            {pendingText && (
              <div className="text-xs text-amber-300 mb-2">
                “{pendingText}” — {mt(lang, "tapToPlace")}
              </div>
            )}

            <canvas
              ref={canvasRef}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              className="w-full rounded-lg border border-neutral-700"
              style={{ touchAction: "none" }}
            />

            <button
              onClick={save}
              disabled={uploading || !!pendingDim}
              className="w-full mt-3 bg-amber-500 text-black font-bold rounded-xl py-3 disabled:opacity-50"
            >
              {uploading ? mt(lang, "uploading") : saveLabel || `💾 ${mt(lang, "savePhoto")}`}
            </button>
          </>
        )}

        {err && <div className="text-sm text-red-400 mt-2">{err}</div>}
      </div>
    </div>
  );
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  s: AnnotationStroke,
  lw: number,
  font: number
) {
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (s.tool === "text" && s.text) {
    ctx.font = `bold ${font}px sans-serif`;
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.lineWidth = font / 6;
    ctx.strokeText(s.text, s.points[0].x, s.points[0].y);
    ctx.fillText(s.text, s.points[0].x, s.points[0].y);
    return;
  }

  if (s.tool === "dim") {
    const [a, b] = [s.points[0], s.points[s.points.length - 1]];
    const g = dimGeometry(a, b, lw);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = lw * 1.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    for (const [x1, y1, x2, y2] of g.ticks) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    for (const h of g.heads) {
      ctx.moveTo(h[0][0], h[0][1]);
      ctx.lineTo(h[1][0], h[1][1]);
      ctx.lineTo(h[2][0], h[2][1]);
    }
    ctx.stroke();
    ctx.restore();
    if (s.text) {
      ctx.save();
      ctx.translate(g.label.x, g.label.y);
      ctx.rotate((g.label.angle * Math.PI) / 180);
      ctx.font = `bold ${font}px -apple-system, sans-serif`;
      const tw = ctx.measureText(s.text).width;
      const ph = font * 1.35;
      const pw = tw + font * 0.8;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2);
      ctx.fill();
      ctx.fillStyle = s.color === "#ffffff" || s.color === "#ffd400" ? "#000" : "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(s.text, 0, 1);
      ctx.restore();
    }
    return;
  }

  if (s.tool === "draw") {
    ctx.beginPath();
    s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    return;
  }

  const [a, b] = [s.points[0], s.points[s.points.length - 1]];
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();

  if (s.tool === "arrow") {
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const size = lw * 4.5;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - size * Math.cos(ang - 0.45), b.y - size * Math.sin(ang - 0.45));
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - size * Math.cos(ang + 0.45), b.y - size * Math.sin(ang + 0.45));
    ctx.stroke();
  }
}
