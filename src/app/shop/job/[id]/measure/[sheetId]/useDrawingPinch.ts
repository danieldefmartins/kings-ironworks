"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/** Own two-finger zoom inside the drawing; keep one-finger browser scrolling. */
export function useDrawingPinch(viewport: RefObject<HTMLDivElement | null>, content: RefObject<HTMLDivElement | null>, zoom: number, setZoom: (zoom: number) => void) {
  const currentZoom = useRef(zoom);
  const anchor = useRef<{ x: number; y: number; fractionX: number; fractionY: number } | null>(null);
  useLayoutEffect(() => {
    currentZoom.current = zoom;
    const el = viewport.current, drawing = content.current, point = anchor.current;
    if (el && drawing && point) {
      el.scrollTo({ left: point.fractionX * drawing.getBoundingClientRect().width - point.x,
        top: point.fractionY * drawing.getBoundingClientRect().height - point.y });
      anchor.current = null;
    }
  }, [zoom, viewport, content]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    let pinch: { distance: number; zoom: number } | null = null;
    let multiTouch = false, suppressUntil = 0;
    let start: { x: number; y: number } | null = null;
    const distance = (touches: TouchList) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    const begin = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        event.preventDefault();
        multiTouch = true;
        suppressUntil = Date.now() + 700;
        pinch = { distance: Math.max(1, distance(event.touches)), zoom: currentZoom.current };
      } else if (!multiTouch && event.touches.length === 1) {
        suppressUntil = 0;
        start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }
    };
    const move = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        event.preventDefault();
        if (!pinch) { begin(event); return; }
        const drawing = content.current;
        if (!drawing) return;
        const rect = el.getBoundingClientRect(), size = drawing.getBoundingClientRect();
        const x = (event.touches[0].clientX + event.touches[1].clientX) / 2 - rect.left;
        const y = (event.touches[0].clientY + event.touches[1].clientY) / 2 - rect.top;
        if (size.width && size.height) anchor.current = { x, y, fractionX: (el.scrollLeft + x) / size.width, fractionY: (el.scrollTop + y) / size.height };
        setZoom(Math.min(4, Math.max(1, pinch.zoom * distance(event.touches) / pinch.distance)));
        suppressUntil = Date.now() + 700;
      } else if (multiTouch) {
        event.preventDefault(); // Lifting one finger must not turn the gesture into a tap.
      } else if (start && event.touches.length && Math.hypot(event.touches[0].clientX - start.x, event.touches[0].clientY - start.y) > 8) {
        suppressUntil = Date.now() + 700;
      }
    };
    const end = (event: TouchEvent) => {
      if (multiTouch) { event.preventDefault(); suppressUntil = Date.now() + 700; }
      if (event.touches.length < 2) pinch = null;
      if (!event.touches.length || event.type === 'touchcancel') { pinch = null; multiTouch = false; start = null; anchor.current = null; }
    };
    const click = (event: MouseEvent) => {
      if (event.detail !== 0 && (multiTouch || Date.now() < suppressUntil)) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    el.addEventListener('touchstart', begin, { passive: false });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('touchcancel', end, { passive: false });
    el.addEventListener('click', click, true);
    return () => {
      el.removeEventListener('touchstart', begin); el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end); el.removeEventListener('touchcancel', end);
      el.removeEventListener('click', click, true);
    };
  }, [viewport, content, setZoom]);
}
