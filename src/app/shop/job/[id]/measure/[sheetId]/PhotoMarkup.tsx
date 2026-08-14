"use client";

// Mark up a site photo with dimension lines, arrows and text — like a paper
// field sheet — then flatten and save it to the job's photos (Measurements).

import { useEffect, useRef, useState } from "react";
import { mt } from "@/lib/shop/measure-i18n";

type Tool = "draw" | "line" | "arrow" | "text";

interface Stroke {
  tool: Tool;
  color: string;
  points: { x: number; y: number }[]; // draw: path; line/arrow: [from, to]; text: [pos]
  text?: string;
}

const COLORS = ["#ff2d2d", "#ffd400", "#2d7dff", "#ffffff"];
const MAX_DIM = 2000;

export default function PhotoMarkup({
  jobId,
  sheetName,
  lang,
}: {
  jobId: string;
  sheetName: string;
  lang: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState(COLORS[0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function loadFile(file: File) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = canvasRef.current!;
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      imgRef.current = img;
      setStrokes([]);
      setDraft(null);
      setMsg(null);
      setHasImage(true);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // Redraw whenever anything changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !hasImage) return;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const lw = Math.max(2.5, canvas.width / 260);
    const font = Math.max(18, canvas.width / 24);
    for (const s of [...strokes, ...(draft ? [draft] : [])]) {
      drawStroke(ctx, s, lw, font);
    }
  }, [strokes, draft, hasImage]);

  function toCanvas(e: React.PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  }

  function onDown(e: React.PointerEvent) {
    if (!hasImage) return;
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
    if (draft.points.length > 1) setStrokes((s) => [...s, draft]);
    setDraft(null);
  }

  function startText() {
    setTool("text");
    const txt = window.prompt(mt(lang, "addTextPrompt"));
    if (txt && txt.trim()) setPendingText(txt.trim());
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setUploading(true);
    setMsg(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );
      if (!blob) throw new Error("Canvas export failed");
      const form = new FormData();
      form.append("file", new File([blob], "measure-markup.jpg", { type: "image/jpeg" }));
      form.append("jobId", jobId);
      form.append("category", "Measurements");
      form.append("label", sheetName);
      const res = await fetch("/shop/api/photo", { method: "POST", body: form });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Upload failed");
      }
      setMsg(mt(lang, "uploadDone"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block w-full text-center bg-neutral-800 border border-dashed border-neutral-600 rounded-xl py-4 text-sm font-semibold text-neutral-200 cursor-pointer mb-3">
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
            disabled={uploading}
            className="w-full mt-3 bg-amber-500 text-black font-bold rounded-xl py-3 disabled:opacity-50"
          >
            {uploading ? mt(lang, "uploading") : `💾 ${mt(lang, "savePhoto")}`}
          </button>
        </>
      )}

      {msg && <div className="text-sm text-green-400 mt-2">{msg}</div>}
    </div>
  );
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  s: Stroke,
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
