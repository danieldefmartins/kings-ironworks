"use client";

// Capture a checklist photo and mark dimensions on it. The ORIGINAL photo is
// uploaded untouched (evidence never degrades); the annotation strokes are
// returned to the sheet (stored in its JSON), and a flattened copy is also
// uploaded so the job's Photos tab shows the marked-up version.

import { useEffect, useRef, useState } from "react";
import { mt } from "@/lib/shop/measure-i18n";
import type { AnnotationStroke } from "@/lib/shop/measure";
import { dimGeometry } from "@/lib/shop/measure-shots";
import { Camera, MoveHorizontal, MoveUpRight, Pencil, Slash, Trash2, Type, Undo2, X } from "lucide-react";

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

  const tools: [Tool, string, React.ReactNode][] = [
    ["dim", mt(lang, "dimTool"), <MoveHorizontal key="i" className="h-5 w-5" />],
    ["draw", mt(lang, "draw"), <Pencil key="i" className="h-5 w-5" />],
    ["line", mt(lang, "lineTool"), <Slash key="i" className="h-5 w-5" />],
    ["arrow", mt(lang, "arrowTool"), <MoveUpRight key="i" className="h-5 w-5" />],
    ["text", mt(lang, "textTool"), <Type key="i" className="h-5 w-5" />],
  ];

  // Apple-style sheet: Cancel · title · Save across the top, a segmented tool
  // picker, the photo, and one primary button. Light/dark follow the shop theme.
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 print:hidden sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={slotLabel}>
      <div className="flex h-full w-full flex-col bg-neutral-900 text-neutral-100 sm:h-auto sm:max-h-[94dvh] sm:max-w-3xl sm:rounded-3xl sm:shadow-2xl">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-neutral-800 px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))]">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-2 text-[17px] text-indigo-700">
            {mt(lang, "cancel")}
          </button>
          <div className="min-w-0 text-center">
            <div className="truncate text-[17px] font-semibold">{slotLabel}</div>
            {!initialFile && <div className="truncate text-[13px] text-neutral-500">{slot}</div>}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!hasImage || uploading || !!pendingDim}
            className="min-h-11 rounded-lg px-2 text-[17px] font-semibold text-indigo-700 disabled:opacity-35"
          >
            {mt(lang, "shotSave")}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3 sm:px-6">
          <label className={`${initialFile ? "hidden" : "flex"} min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-neutral-800 text-[17px] font-semibold text-indigo-700 mb-3`}>
            <Camera className="h-5 w-5" /> {mt(lang, "choosePhoto")}
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
              {/* Segmented tool picker */}
              <div className="grid grid-cols-5 gap-1 rounded-2xl bg-neutral-800 p-1" role="radiogroup" aria-label={mt(lang, "shotMarkUp")}>
                {tools.map(([tl, label, icon]) => (
                  <button
                    key={tl}
                    type="button"
                    role="radio"
                    aria-checked={tool === tl}
                    onClick={() => (tl === "text" ? startText() : setTool(tl))}
                    className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[12px] font-semibold ${
                      tool === tl ? "bg-neutral-900 text-indigo-700 shadow-sm" : "text-neutral-400"
                    }`}
                  >
                    {icon}
                    <span className="max-w-full truncate px-1">{label}</span>
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2">
                {COLORS.map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={(lang === "pt" ? ["Vermelho", "Amarelo", "Azul", "Branco"] : lang === "es" ? ["Rojo", "Amarillo", "Azul", "Blanco"] : ["Red", "Yellow", "Blue", "White"])[i]}
                    aria-pressed={color === c}
                    onClick={() => setColor(c)}
                    className="h-11 w-11 shrink-0 rounded-full"
                    style={{
                      background: c,
                      boxShadow: color === c ? `0 0 0 2px var(--shop-card, #fff), 0 0 0 4px ${c === "#ffffff" ? "#9ca3af" : c}` : "inset 0 0 0 1px rgba(0,0,0,.15)",
                    }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setStrokes((s) => s.slice(0, -1))}
                  aria-label={mt(lang, "undo")}
                  disabled={!strokes.length}
                  className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 disabled:opacity-35"
                >
                  <Undo2 className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setStrokes([])}
                  aria-label={mt(lang, "clearAll")}
                  disabled={!strokes.length}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 disabled:opacity-35"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              {pendingDim && (
                <form
                  className="mt-3 flex items-center gap-2"
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
                    className="min-w-0 flex-1 min-h-12 rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-lg font-semibold"
                  />
                  <button type="submit" className="shrink-0 min-h-12 px-4 rounded-xl bg-indigo-600 text-white font-semibold">
                    {mt(lang, "dimAdd")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDim(null)}
                    aria-label={mt(lang, "cancel")}
                    className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800 text-neutral-400"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </form>
              )}

              {pendingText && (
                <div className="mt-3 text-[15px] text-neutral-400">
                  “{pendingText}” — {mt(lang, "tapToPlace")}
                </div>
              )}

              <canvas
                ref={canvasRef}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                className="mt-3 w-full rounded-2xl"
                style={{ touchAction: "none", background: "#000" }}
              />
            </>
          )}

          {err && <div className="text-sm text-red-400 mt-3">{err}</div>}
        </div>

        {hasImage && (
          <div className="border-t border-neutral-800 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <button
              type="button"
              onClick={save}
              disabled={uploading || !!pendingDim}
              className="min-h-14 w-full rounded-2xl bg-indigo-600 text-[17px] font-semibold text-white disabled:opacity-40"
            >
              {uploading ? mt(lang, "uploading") : saveLabel || mt(lang, "savePhoto")}
            </button>
          </div>
        )}
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
