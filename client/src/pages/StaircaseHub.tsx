import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight, Phone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STRUCTURES, type StaircaseStructure, type FinishTier, type RailingOption } from "@/lib/staircase-hub-data";

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i < current ? "w-8 bg-accent" : i === current ? "w-8 bg-accent/60" : "w-4 bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Choose Structure
// ---------------------------------------------------------------------------
function StructureSelector({
  onSelect,
}: {
  onSelect: (s: StaircaseStructure) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToFirst = useCallback(() => {
    if (!scrollRef.current) return;
    const first = scrollRef.current.children[1] as HTMLElement;
    first?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div
      ref={scrollRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory"
    >
      {/* Hero */}
      <section className="h-[100svh] w-full snap-start bg-sidebar flex items-center justify-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(201,169,110,0.05)_0%,_transparent_70%)]" />
        <div className="relative z-10 text-center px-6 max-w-3xl">
          <motion.p
            className="text-[10px] font-semibold tracking-[5px] uppercase text-accent/50 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Step 1 of 3
          </motion.p>
          <motion.h1
            className="font-display text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[0.95] mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1 }}
          >
            Choose Your{" "}
            <em className="italic text-accent font-display">Structure</em>
          </motion.h1>
          <motion.p
            className="text-base md:text-lg text-white/35 max-w-xl mx-auto mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Every dream staircase starts with a shape. Scroll to explore, then
            tap the one that speaks to you.
          </motion.p>
          <motion.button
            onClick={scrollToFirst}
            className="text-white/20 hover:text-accent/50 transition-colors cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ChevronDown className="w-8 h-8" />
            </motion.div>
          </motion.button>
        </div>
      </section>

      {/* Structure cards */}
      {STRUCTURES.map((structure, i) => (
        <section
          key={structure.slug}
          className="h-[100svh] w-full snap-start relative overflow-hidden cursor-pointer group"
          onClick={() => onSelect(structure)}
        >
          {/* Background image — mobile uses 9:16, desktop uses 16:9 */}
          <picture>
            <source media="(min-width: 1024px)" srcSet={structure.heroDesktop} />
            <img
              src={structure.heroMobile}
              alt={structure.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </picture>

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-16 z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <p className="text-[10px] font-semibold tracking-[4px] uppercase text-accent/60 mb-3">
                {String(i + 1).padStart(2, "0")} / {String(STRUCTURES.length).padStart(2, "0")}
              </p>
              <h2 className="font-display text-4xl md:text-6xl font-black tracking-tight text-white mb-2">
                {structure.name}
              </h2>
              <p className="text-sm md:text-base text-white/50 mb-6 max-w-md">
                {structure.tagline}
              </p>
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground font-display font-bold text-xs tracking-wide uppercase group-hover:bg-accent/90 transition-colors">
                Select This Style
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </motion.div>
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Choose Finish Tier
// ---------------------------------------------------------------------------
function TierSelector({
  structure,
  onSelect,
  onBack,
}: {
  structure: StaircaseStructure;
  onSelect: (t: FinishTier) => void;
  onBack: () => void;
}) {
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-sidebar">
      {/* Header */}
      <div className="pt-20 lg:pt-24 px-6 lg:px-16 pb-8">
        <button
          onClick={onBack}
          className="text-[10px] font-semibold tracking-[3px] uppercase text-accent/50 hover:text-accent transition-colors mb-6 cursor-pointer"
        >
          &larr; Back to Structures
        </button>
        <StepIndicator current={1} total={3} />
        <p className="text-[10px] font-semibold tracking-[5px] uppercase text-accent/50 mt-6 mb-3">
          Step 2 of 3 &mdash; {structure.name} Staircase
        </p>
        <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight text-white mb-3">
          Choose Your{" "}
          <em className="italic text-accent font-display">Finish</em>
        </h2>
        <p className="text-sm text-white/35 max-w-lg">
          Same structure, four levels of craftsmanship. From classic charm to
          architectural statement — pick the one that matches your vision.
        </p>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1 px-1 pb-1">
        {structure.tiers.map((tier) => (
          <motion.div
            key={tier.id}
            className="relative cursor-pointer group overflow-hidden"
            style={{ height: "calc(100svh - 280px)", minHeight: "400px" }}
            onClick={() => onSelect(tier)}
            onMouseEnter={() => setHoveredTier(tier.id)}
            onMouseLeave={() => setHoveredTier(null)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <picture>
              <source media="(min-width: 1024px)" srcSet={tier.imageDesktop} />
              <img
                src={tier.imageMobile}
                alt={`${structure.name} - ${tier.name}`}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
              <p className="text-[9px] font-semibold tracking-[3px] uppercase text-accent/60 mb-2">
                {tier.name}
              </p>
              <p className="text-sm text-white/50 mb-4">{tier.description}</p>

              {/* Features — show on hover */}
              <AnimatePresence>
                {hoveredTier === tier.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-4 overflow-hidden"
                  >
                    {tier.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-xs text-white/40 py-0.5">
                        <Check className="w-3 h-3 text-accent/60 shrink-0" />
                        {f}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                Select {tier.name}
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Choose Railing
// ---------------------------------------------------------------------------
function RailingSelector({
  structure,
  tier,
  onSelect,
  onBack,
}: {
  structure: StaircaseStructure;
  tier: FinishTier;
  onSelect: (r: RailingOption) => void;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-sidebar">
      {/* Header */}
      <div className="pt-20 lg:pt-24 px-6 lg:px-16 pb-8">
        <button
          onClick={onBack}
          className="text-[10px] font-semibold tracking-[3px] uppercase text-accent/50 hover:text-accent transition-colors mb-6 cursor-pointer"
        >
          &larr; Back to Finish Level
        </button>
        <StepIndicator current={2} total={3} />
        <p className="text-[10px] font-semibold tracking-[5px] uppercase text-accent/50 mt-6 mb-3">
          Step 3 of 3 &mdash; {structure.name} &middot; {tier.name}
        </p>
        <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight text-white mb-3">
          Choose Your{" "}
          <em className="italic text-accent font-display">Railing</em>
        </h2>
        <p className="text-sm text-white/35 max-w-lg">
          The railing defines the personality. Pick the one that completes your
          vision.
        </p>
      </div>

      {/* Railing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1 px-1 pb-1">
        {structure.railings.map((railing) => (
          <motion.div
            key={railing.id}
            className="relative cursor-pointer group overflow-hidden"
            style={{ height: "calc(100svh - 280px)", minHeight: "450px" }}
            onClick={() => onSelect(railing)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <img
              src={railing.image}
              alt={`${structure.name} with ${railing.name}`}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
              <p className="font-display text-2xl md:text-3xl font-bold text-white mb-2">
                {railing.name}
              </p>
              <p className="text-sm text-white/50 mb-6">{railing.description}</p>
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground font-display font-bold text-xs tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                Complete Selection
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary + CTA
// ---------------------------------------------------------------------------
function Summary({
  structure,
  tier,
  railing,
  onRestart,
}: {
  structure: StaircaseStructure;
  tier: FinishTier;
  railing: RailingOption;
  onRestart: () => void;
}) {
  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center">
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-[10px] font-semibold tracking-[5px] uppercase text-accent/50 mb-6">
            Your Dream Staircase
          </p>
          <h2 className="font-display text-4xl md:text-6xl font-black tracking-tight text-white mb-8">
            {structure.name}
            <br />
            <span className="text-accent">{tier.name}</span>
            <br />
            <span className="text-white/50 text-2xl md:text-3xl">
              with {railing.name}
            </span>
          </h2>

          {/* Selected image */}
          <div className="relative rounded-lg overflow-hidden mb-10 max-w-lg mx-auto">
            <img
              src={railing.image}
              alt={`${structure.name} ${tier.name} with ${railing.name}`}
              className="w-full"
            />
          </div>

          {/* Selection summary */}
          <div className="grid grid-cols-3 gap-4 mb-10 max-w-md mx-auto text-left">
            <div>
              <p className="text-[9px] font-semibold tracking-[3px] uppercase text-accent/50 mb-1">
                Structure
              </p>
              <p className="text-sm text-white/70">{structure.name}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold tracking-[3px] uppercase text-accent/50 mb-1">
                Finish
              </p>
              <p className="text-sm text-white/70">{tier.name}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold tracking-[3px] uppercase text-accent/50 mb-1">
                Railing
              </p>
              <p className="text-sm text-white/70">{railing.name}</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-display font-bold text-sm tracking-wide uppercase px-10 h-14"
              >
                Get a Free Quote
              </Button>
            </Link>
            <a
              href="tel:+16173003530"
              className="inline-flex items-center gap-2 px-8 h-14 border border-white/10 text-white/50 font-display font-bold text-sm tracking-wide uppercase hover:border-accent/30 hover:text-white transition-colors"
            >
              <Phone className="w-4 h-4" />
              (617) 300-3530
            </a>
          </div>

          <button
            onClick={onRestart}
            className="text-xs text-white/20 hover:text-white/50 transition-colors uppercase tracking-wider cursor-pointer"
          >
            Start Over
          </button>
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Hub Page
// ---------------------------------------------------------------------------
export default function StaircaseHub() {
  const [step, setStep] = useState<"structure" | "tier" | "railing" | "summary">("structure");
  const [selectedStructure, setSelectedStructure] = useState<StaircaseStructure | null>(null);
  const [selectedTier, setSelectedTier] = useState<FinishTier | null>(null);
  const [selectedRailing, setSelectedRailing] = useState<RailingOption | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const handleSelectStructure = (s: StaircaseStructure) => {
    setSelectedStructure(s);
    setStep("tier");
  };

  const handleSelectTier = (t: FinishTier) => {
    setSelectedTier(t);
    setStep("railing");
  };

  const handleSelectRailing = (r: RailingOption) => {
    setSelectedRailing(r);
    setStep("summary");
  };

  const restart = () => {
    setStep("structure");
    setSelectedStructure(null);
    setSelectedTier(null);
    setSelectedRailing(null);
  };

  if (step === "structure") {
    return (
      <div className="-mt-16 lg:-mt-20">
        <StructureSelector onSelect={handleSelectStructure} />
      </div>
    );
  }

  if (step === "tier" && selectedStructure) {
    return (
      <TierSelector
        structure={selectedStructure}
        onSelect={handleSelectTier}
        onBack={() => setStep("structure")}
      />
    );
  }

  if (step === "railing" && selectedStructure && selectedTier) {
    return (
      <RailingSelector
        structure={selectedStructure}
        tier={selectedTier}
        onSelect={handleSelectRailing}
        onBack={() => setStep("tier")}
      />
    );
  }

  if (step === "summary" && selectedStructure && selectedTier && selectedRailing) {
    return (
      <Summary
        structure={selectedStructure}
        tier={selectedTier}
        railing={selectedRailing}
        onRestart={restart}
      />
    );
  }

  return null;
}
