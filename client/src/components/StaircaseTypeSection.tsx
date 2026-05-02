import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { StaircaseType } from "@/lib/staircase-data";

interface StaircaseTypeSectionProps {
  type: StaircaseType;
  index: number;
  total: number;
}

export default function StaircaseTypeSection({
  type,
  index,
  total,
}: StaircaseTypeSectionProps) {
  const isReversed = index % 2 !== 0;
  const number = String(index + 1).padStart(2, "0");

  return (
    <section
      className="relative h-[100svh] w-full snap-start overflow-hidden bg-sidebar flex items-center"
    >
      {/* Faint number watermark */}
      <div className="absolute top-8 right-8 lg:top-12 lg:right-16 pointer-events-none select-none">
        <span className="font-display text-[80px] lg:text-[160px] font-black leading-none text-white/[0.04]">
          {number}
        </span>
      </div>

      {/* Content grid */}
      <div
        className={`relative z-10 w-full h-full flex flex-col lg:flex-row items-center ${
          isReversed ? "lg:flex-row-reverse" : ""
        }`}
      >
        {/* Image side — 60% on desktop, 55vh on mobile */}
        <div className="w-full lg:w-[60%] h-[55svh] lg:h-full relative overflow-hidden">
          <motion.img
            src={type.heroImage}
            alt={type.name}
            className="w-full h-full object-cover object-center"
            initial={{ scale: 1.1, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            viewport={{ once: true, amount: 0.3 }}
          />
          {/* Gradient overlay for text readability on mobile */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-sidebar lg:hidden" />
          {/* Side gradient on desktop */}
          <div
            className={`absolute inset-0 hidden lg:block ${
              isReversed
                ? "bg-gradient-to-r from-sidebar/60 via-transparent to-transparent"
                : "bg-gradient-to-l from-sidebar/60 via-transparent to-transparent"
            }`}
          />
        </div>

        {/* Text side — 40% on desktop, rest on mobile */}
        <div className="w-full lg:w-[40%] flex-1 lg:flex-none flex flex-col justify-center px-8 py-6 lg:px-16 lg:py-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            viewport={{ once: true, amount: 0.3 }}
          >
            {/* Counter */}
            <p className="text-xs font-semibold tracking-[4px] uppercase text-accent/50 mb-4">
              {number} / {String(total).padStart(2, "0")}
            </p>

            {/* Type name */}
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.05] mb-4 lg:mb-6">
              {type.name}
            </h2>

            {/* Tagline */}
            <p className="text-base lg:text-lg text-white/50 leading-relaxed mb-6 lg:mb-10 max-w-md">
              {type.tagline}
            </p>

            {/* CTA */}
            <Link href={`/staircases/${type.slug}`}>
              <span className="inline-flex items-center gap-3 px-6 py-3 bg-accent text-accent-foreground font-display font-bold text-sm tracking-wide uppercase hover:bg-accent/90 transition-colors cursor-pointer group">
                Explore Collection
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
