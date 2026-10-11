"use client";

// Finger / stylus / mouse signature capture. Strokes are kept as points so the
// pad redraws crisply after a resize or rotation, and the export is re-rendered
// at a fixed small size (a few KB of PNG) rather than dumping the screen-size,
// device-pixel-ratio canvas into the sheet.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

type Pt = { x: number; y: number }; // 0..1 of the pad, so strokes survive resizes

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  /** PNG data URL, transparent background, at most `width` px wide. */
  toDataURL: (width?: number) => string;
}

const ASPECT = 3; // width : height

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Pt[][], w: number, h: number, line: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = line;
  for (const s of strokes) {
    if (!s.length) continue;
    if (s.length === 1) {
      ctx.beginPath();
      ctx.arc(s[0].x * w, s[0].y * h, line / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(s[0].x * w, s[0].y * h);
    // Midpoint quadratic smoothing: a signature, not a polyline.
    for (let i = 1; i < s.length - 1; i++) {
      const mx = ((s[i].x + s[i + 1].x) / 2) * w;
      const my = ((s[i].y + s[i + 1].y) / 2) * h;
      ctx.quadraticCurveTo(s[i].x * w, s[i].y * h, mx, my);
    }
    const last = s[s.length - 1];
    ctx.lineTo(last.x * w, last.y * h);
    ctx.stroke();
  }
}

const SignaturePad = forwardRef<SignaturePadHandle, { placeholder: string; clearLabel: string; onInk?: (has: boolean) => void }>(
  function SignaturePad({ placeholder, clearLabel, onInk }, ref) {
    const wrap = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const strokes = useRef<Pt[][]>([]);
    const drawing = useRef(false);
    const [hasInk, setHasInk] = useState(false);
    const [size, setSize] = useState({ w: 0, h: 0 });

    const redraw = useCallback(() => {
      const c = canvas.current;
      if (!c || !size.w) return;
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(size.w * dpr);
      c.height = Math.round(size.h * dpr);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const ink = getComputedStyle(c).color || "#111";
      drawStrokes(ctx, strokes.current, size.w, size.h, 2.6, ink);
    }, [size]);

    useEffect(() => {
      const el = wrap.current;
      if (!el) return;
      const measure = () => {
        const w = el.clientWidth;
        setSize({ w, h: Math.round(Math.max(150, Math.min(260, w / ASPECT))) });
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);
    useEffect(redraw, [redraw]);

    const setInk = (v: boolean) => {
      setHasInk(v);
      onInk?.(v);
    };
    const pt = (e: React.PointerEvent): Pt => {
      const r = canvas.current!.getBoundingClientRect();
      return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
    };

    useImperativeHandle(ref, () => ({
      clear: () => {
        strokes.current = [];
        setInk(false);
        redraw();
      },
      isEmpty: () => strokes.current.length === 0,
      toDataURL: (width = 600) => {
        const off = document.createElement("canvas");
        off.width = width;
        off.height = Math.round(width / ASPECT);
        const ctx = off.getContext("2d");
        if (!ctx) return "";
        drawStrokes(ctx, strokes.current, off.width, off.height, Math.max(2, width / 220), "#111");
        return off.toDataURL("image/png");
      },
    }));

    return (
      <div ref={wrap} className="relative w-full select-none">
        <canvas
          ref={canvas}
          data-testid="signature-pad"
          aria-label={placeholder}
          style={{ width: size.w || "100%", height: size.h || 180, touchAction: "none" }}
          className="block rounded-2xl border border-neutral-700 bg-neutral-950 text-neutral-100"
          onPointerDown={(e) => {
            e.preventDefault();
            canvas.current?.setPointerCapture(e.pointerId);
            drawing.current = true;
            strokes.current.push([pt(e)]);
            if (!hasInk) setInk(true);
            redraw();
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const s = strokes.current[strokes.current.length - 1];
            const p = pt(e);
            const q = s[s.length - 1];
            if (Math.hypot((p.x - q.x) * size.w, (p.y - q.y) * size.h) < 1.5) return;
            s.push(p);
            redraw();
          }}
          onPointerUp={() => (drawing.current = false)}
          onPointerCancel={() => (drawing.current = false)}
        />
        {/* Baseline, the way a paper form has one */}
        <div className="pointer-events-none absolute inset-x-6 bottom-9 flex items-end gap-2 text-neutral-500">
          <span className="text-xl leading-none">×</span>
          <span className="mb-1 h-px flex-1 bg-current opacity-40" />
        </div>
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg text-neutral-500">
            {placeholder}
          </div>
        )}
        {hasInk && (
          <button
            type="button"
            onClick={() => {
              strokes.current = [];
              setInk(false);
              redraw();
            }}
            className="absolute right-2 top-2 min-h-11 rounded-full px-4 text-sm font-semibold text-neutral-400 active:bg-neutral-800"
          >
            {clearLabel}
          </button>
        )}
      </div>
    );
  }
);

export default SignaturePad;
