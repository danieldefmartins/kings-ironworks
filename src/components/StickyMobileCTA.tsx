"use client";

import { useEffect, useRef } from "react";
import { Phone, ArrowRight, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useLocalPhone } from "@/hooks/useLocalPhone";
import { PhoneLink } from "@/components/PhoneLink";
import { PHONE_NUMBERS } from "@/lib/constants";

// Texts go to the main line, the one the office answers by text.
const SMS_HREF = `sms:+${PHONE_NUMBERS.MAIN.tel}?&body=${encodeURIComponent("Hi, I'd like a free estimate")}`;

export default function StickyMobileCTA() {
  const localPhone = useLocalPhone();
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    const element = viewportRef.current;
    if (!viewport || !element) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      // Safari can anchor bottom:0 to a stale layout viewport after its toolbar
      // or keyboard moves. Use a top-anchored, non-interactive viewport instead.
      // Leave pinch zoom to the browser so the bar doesn't chase magnification.
      if (viewport.scale !== 1) {
        element.style.removeProperty("height");
        element.style.removeProperty("top");
        return;
      }
      element.style.height = `${viewport.height}px`;
      element.style.top = `${viewport.offsetTop}px`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    viewport.addEventListener("resize", schedule);
    viewport.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("pageshow", schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pageshow", schedule);
    };
  }, []);

  return (
    <div ref={viewportRef} className="mobile-contact-viewport pointer-events-none fixed left-0 right-0 top-0 z-[60] flex flex-col justify-end lg:hidden">
    <div id="mobile-contact-bar" className="pointer-events-auto shrink-0 bg-sidebar border-t border-sidebar-border/30 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch">
        <PhoneLink tel={localPhone.tel} className="flex-1" aria-label="Call Now">
          <div className="flex items-center justify-center gap-1.5 py-3.5 text-sidebar-foreground">
            <Phone className="w-4 h-4" />
            <span className="text-sm font-display font-bold">Call</span>
          </div>
        </PhoneLink>
        <a href={SMS_HREF} className="flex-1 border-l border-sidebar-border/30" aria-label="Text us">
          <div className="flex items-center justify-center gap-1.5 py-3.5 text-sidebar-foreground">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-display font-bold">Text</span>
          </div>
        </a>
        <Link href="/contact" className="flex-[1.8]">
          <div className="flex items-center justify-center gap-2 py-3.5 bg-accent text-accent-foreground">
            <span className="text-sm font-display font-bold">Get a Free Estimate</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </div>
    </div>
  );
}
