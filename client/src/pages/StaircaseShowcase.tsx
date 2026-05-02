import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { STAIRCASE_TYPES } from "@/lib/staircase-data";
import StaircaseTypeSection from "@/components/StaircaseTypeSection";

export default function StaircaseShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToFirst = useCallback(() => {
    if (!scrollRef.current) return;
    const firstSection = scrollRef.current.children[1] as HTMLElement;
    firstSection?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div
      ref={scrollRef}
      className="-mt-16 lg:-mt-20 h-screen overflow-y-scroll snap-y snap-mandatory"
      style={{ scrollBehavior: "smooth" }}
    >
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative h-[100svh] w-full snap-start overflow-hidden bg-sidebar flex items-center justify-center">
        {/* Ambient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(201,169,110,0.06)_0%,_transparent_70%)]" />

        <div className="relative z-10 text-center px-6 max-w-4xl">
          {/* Badge */}
          <motion.p
            className="text-xs font-semibold tracking-[5px] uppercase text-accent/60 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {STAIRCASE_TYPES.length} Staircase Styles
          </motion.p>

          {/* Headline */}
          <motion.h1
            className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[0.95] mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.15 }}
          >
            Whatever You{" "}
            <em className="italic text-accent font-display">Dream</em>
            <br />
            We Build
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto leading-relaxed mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            From sweeping curved staircases to floating modern designs, every
            staircase is custom-forged in our shop. Explore our collection.
          </motion.p>

          {/* Scroll indicator */}
          <motion.button
            onClick={scrollToFirst}
            className="inline-flex flex-col items-center gap-2 text-white/30 hover:text-accent/60 transition-colors cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <span className="text-[10px] font-semibold tracking-[3px] uppercase">
              Explore Styles
            </span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="w-6 h-6" />
            </motion.div>
          </motion.button>
        </div>

        {/* Bottom edge gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-sidebar to-transparent pointer-events-none" />
      </section>

      {/* ═══════════ STAIRCASE TYPES ═══════════ */}
      {STAIRCASE_TYPES.map((type, i) => (
        <StaircaseTypeSection
          key={type.slug}
          type={type}
          index={i}
          total={STAIRCASE_TYPES.length}
        />
      ))}

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <section className="h-[100svh] w-full snap-start overflow-hidden bg-sidebar flex items-center justify-center">
        <div className="text-center px-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-semibold tracking-[5px] uppercase text-accent/60 mb-6">
              Ready?
            </p>
            <h2 className="font-display text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.05] mb-6">
              Let's Build Your{" "}
              <em className="italic text-accent font-display">Masterpiece</em>
            </h2>
            <p className="text-lg text-white/40 mb-10 max-w-xl mx-auto">
              Every staircase we build starts with a conversation. Tell us what
              you're dreaming of — we'll engineer and forge it into reality.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/contact"
                className="inline-flex items-center gap-3 px-8 py-4 bg-accent text-accent-foreground font-display font-bold text-sm tracking-wide uppercase hover:bg-accent/90 transition-colors"
              >
                Get a Free Quote
              </a>
              <a
                href="tel:+16173003530"
                className="inline-flex items-center gap-2 px-8 py-4 border border-white/10 text-white/60 font-display font-bold text-sm tracking-wide uppercase hover:border-accent/30 hover:text-white transition-colors"
              >
                Call (617) 300-3530
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
