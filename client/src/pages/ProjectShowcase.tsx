import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Phone, X, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalPhone } from "@/lib/useLocalPhone";
import { PhoneLink } from "@/components/PhoneLink";

// ---------------------------------------------------------------------------
// Project Data
// ---------------------------------------------------------------------------

const IMG = "/images/portfolio-organized/Staircases/Curved";
const SKETCH = "/images/portfolio-organized/Design-Sketches";
const SHOP = "/images/portfolio-organized/Shop-Process";

interface JourneyPhase {
  title: string;
  subtitle: string;
  description: string;
  image: string;
}

interface ProjectData {
  slug: string;
  title: string;
  subtitle: string;
  intro: string;
  journey: JourneyPhase[];
  challenges: { title: string; description: string }[];
  stats: { label: string; value: string }[];
  heroImage: string;
  galleryImages: string[];
}

const projects: Record<string, ProjectData> = {
  "medallion-scrollwork": {
    slug: "medallion-scrollwork",
    title: "The Medallion Scrollwork Staircase",
    subtitle: "From a pencil sketch on paper to a two-story masterpiece in marble and iron",
    intro: "Every great staircase begins the same way — with a conversation and a blank sheet of paper. The homeowner had a vision: a sweeping curved staircase that would command their new-construction foyer, with ornamental ironwork that felt like it belonged in a European estate. What followed was an 800-hour journey from that first rough sketch to a finished masterpiece.",
    journey: [
      {
        title: "The Rough Sketch",
        subtitle: "Where every masterpiece begins",
        description: "It starts with pencil on paper. Our designer sat with the homeowner and sketched the curve, the proportions, the medallion panel concept — capturing the feeling before worrying about the engineering. This rough sketch became the north star for the entire project.",
        image: `${SKETCH}/king-iron-works-design-project2-sketch-rough.jpg`,
      },
      {
        title: "The Refined Drawing",
        subtitle: "Engineering meets artistry",
        description: "The rough sketch evolved into a detailed architectural rendering. Every scroll, every medallion rosette, every connection point was drawn to scale. This is where we solve the hard problems — how the curve transitions to the balcony, how the handrail terminates, how each panel connects seamlessly to the next.",
        image: `${SKETCH}/king-iron-works-design-project2-sketch-refined.jpg`,
      },
      {
        title: "The Final Design",
        subtitle: "Ready for the forge",
        description: "The approved design, refined to the last detail. From here, our fabrication team creates templates, selects materials, and begins the painstaking process of bringing this two-dimensional drawing into three-dimensional reality. Every element you see in this drawing was hand-forged in our Everett shop.",
        image: `${SKETCH}/king-iron-works-design-project2-design.jpg`,
      },
      {
        title: "Fabrication",
        subtitle: "800 hours in our Everett shop",
        description: "The curved stringer is built first — a massive steel spine that must follow the exact arc of the concrete staircase below. Then come the ornamental panels: each medallion rosette is forged individually, the scrollwork shaped by hand over an anvil, the gold-leaf accents applied one by one. Nothing is mass-produced. Nothing is outsourced.",
        image: `${SHOP}/king-iron-works-shop-curved-frame-fabrication.jpg`,
      },
      {
        title: "Installation",
        subtitle: "The moment of truth",
        description: "The railing arrives at the home in sections, each one carefully fitted to the concrete stringer. Our installation crew works with surgical precision — once the ironwork is bolted in place, the walnut handrail is steam-bent on site to follow the curve perfectly. The homeowner watches their sketch become reality.",
        image: `${IMG}/Project 1/king-iron-works-staircase-website-440.jpg`,
      },
      {
        title: "The Reveal",
        subtitle: "A staircase that stops you mid-sentence",
        description: "The finished staircase commands the foyer exactly as the homeowner imagined. The medallion panels catch the light, the gold accents glow warm against the black iron, and the walnut handrail flows in one continuous curve from floor to floor. This is why we do what we do.",
        image: `${IMG}/Project 1/king-iron-works-staircase-website-425.jpg`,
      },
    ],
    challenges: [
      {
        title: "The Continuous Curve",
        description: "A curved staircase railing can't have any visible joints or seams. Every panel must flow into the next as if the entire railing was forged from a single piece of steel. Our team fabricated the railing in sections that lock together with hidden connections — invisible from every angle.",
      },
      {
        title: "Medallion Consistency",
        description: "Each ornamental medallion rosette must be identical in size, shape, and depth — but they're all hand-forged, not stamped. Our smiths created a master template and forged each one individually, checking dimensions against the template at every stage.",
      },
      {
        title: "Gold Leaf on Iron",
        description: "Applying gold leaf to forged ironwork is delicate work. The surface must be perfectly cleaned, primed, and sized before each leaf is laid. One wrong touch and the leaf tears. Our finisher applied over 200 individual gold accents across the entire railing.",
      },
    ],
    stats: [
      { label: "Fabrication Hours", value: "800+" },
      { label: "Medallion Panels", value: "14" },
      { label: "Gold Leaf Accents", value: "200+" },
      { label: "Total Photos", value: "29" },
    ],
    heroImage: `${IMG}/Project 1/king-iron-works-staircase-website-425.jpg`,
    galleryImages: [
      `${IMG}/Project 1/king-iron-works-staircase-website-425.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-426.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-427.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-428.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-429.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-430.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-431.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-432.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-433.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-434.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-435.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-436.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-437.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-438.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-439.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-440.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-441.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-442.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-443.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-444.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-445.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-446.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-447.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-448.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-449.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-450.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-451.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-452.jpg`,
      `${IMG}/Project 1/king-iron-works-staircase-website-453.jpg`,
    ],
  },
  "peacock-masterpiece": {
    slug: "peacock-masterpiece",
    title: "The Peacock Masterpiece",
    subtitle: "From a rough pencil concept to the most breathtaking staircase we've ever built",
    intro: "Some projects push you beyond what you thought was possible. The homeowner brought us a simple idea — a curved staircase with peacock-inspired ironwork. What we delivered, 1,200 hours later, was a two-story sculptural masterpiece with hand-forged peacock plumes, gold leaf detailing, and a marble foyer that belongs in a museum. This is the project that defines King Iron Works.",
    journey: [
      {
        title: "The First Sketch",
        subtitle: "A dream on paper",
        description: "The homeowner described a vision: peacock feathers flowing through iron, something no one has ever seen before. Our designer picked up a pencil and started drawing — capturing the sweep of the curve, the position of the balcony, the feeling of organic movement. This 20-minute sketch launched a year-long project.",
        image: `${SKETCH}/king-iron-works-design-project1-sketch-rough.jpg`,
      },
      {
        title: "The Refined Design",
        subtitle: "Every feather, every scroll, planned in detail",
        description: "The rough concept evolved into an intricate architectural rendering. Each peacock plume panel was drawn individually. The scrollwork connecting them was designed to flow like vines. The balcony railing above was designed to mirror the staircase below. At this stage, every weld point, every connection, every curve is planned.",
        image: `${SKETCH}/king-iron-works-design-project1-sketch-refined.jpg`,
      },
      {
        title: "Approved for Fabrication",
        subtitle: "The blueprint for a masterpiece",
        description: "The final approved drawing that our fabrication team worked from. Look closely — you can see every peacock feather panel, every scroll, every volute at the handrail termination. This drawing hung on the shop wall for months as our team brought it to life, one piece at a time.",
        image: `${SKETCH}/king-iron-works-design-project1-design.jpg`,
      },
      {
        title: "Building the Spine",
        subtitle: "The curved stringer takes shape",
        description: "Before any ornamental work begins, we build the structural backbone. The curved stringer — a massive steel frame that follows the exact arc of the concrete staircase — is fabricated using a custom wood jig in our shop. Every degree of the curve must match the architect's specifications precisely.",
        image: `${SHOP}/king-iron-works-shop-curved-stringer-install.jpg`,
      },
      {
        title: "Forging the Details",
        subtitle: "1,200 hours of handwork",
        description: "Each peacock plume is forged from flat steel bar stock, heated in the forge, and shaped over the anvil by hand. The scrollwork is bent using traditional blacksmithing techniques passed down through generations. Gold leaf accents are applied to every scroll and leaf — over 300 individual pieces across the full railing.",
        image: `${SHOP}/king-iron-works-shop-curved-frame-fabrication.jpg`,
      },
      {
        title: "The Masterpiece Revealed",
        subtitle: "The staircase that stops every visitor mid-sentence",
        description: "Two stories of flowing ironwork sweep through a marble grand foyer. The peacock plumes catch light from the crystal chandelier above. The gold leaf accents glow warm against the black iron. The walnut handrail follows one continuous curve from the marble floor to the second-story balcony. This isn't a staircase — it's the reason we exist.",
        image: `${IMG}/Project 2/king-iron-works-staircase-curved-project1-hero.jpg`,
      },
    ],
    challenges: [
      {
        title: "One-of-a-Kind Peacock Panels",
        description: "No reference existed for what the homeowner wanted. Our designer created the peacock feather motif from scratch — each panel is a unique composition of plumes, scrolls, and organic curves. There's nothing else like it anywhere in the world.",
      },
      {
        title: "Two-Story Continuous Flow",
        description: "The railing sweeps from the ground floor up to the second-story balcony without a single visual break. This required the railing to be fabricated in sections that connect with invisible joints — a feat of engineering that makes the entire piece look forged from one continuous ribbon of steel.",
      },
      {
        title: "Gold Leaf at Scale",
        description: "Over 300 individual gold leaf accents across the full installation. Each piece of gold leaf is thinner than a human hair and tears at the slightest mishandling. Our finishing specialist spent three weeks on gold leaf application alone — each accent applied by hand with a gilding brush.",
      },
      {
        title: "Matching the Marble",
        description: "The ironwork had to complement the Italian marble floor and treads without competing. We tested dozens of finish combinations before settling on satin black iron with warm-tone gold leaf — a pairing that makes both the marble and the ironwork shine.",
      },
    ],
    stats: [
      { label: "Fabrication Hours", value: "1,200+" },
      { label: "Peacock Panels", value: "One-of-a-Kind" },
      { label: "Gold Leaf Pieces", value: "300+" },
      { label: "Total Photos", value: "64" },
    ],
    heroImage: `${IMG}/Project 2/king-iron-works-staircase-curved-project1-hero.jpg`,
    galleryImages: [
      `${IMG}/Project 2/king-iron-works-staircase-curved-project1-hero.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-curved-ornamental-gold-accents.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-curved-scrollwork-detail.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-curved-ornamental-marble-foyer.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-curved-ornamental-completed.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-curved-ornamental-overhead.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-curved-ornamental-spiral-above.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-curved-peacock-above.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-curved-peacock-chandelier.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-curved-chandelier-below.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-curved-fleur-de-lis.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-curved-project1-reveal.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-1.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-5.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-7.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-12.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-93.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-94.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-95.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-104.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-105.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-308.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-315.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-316.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-327.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-328.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-329.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-330.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-332.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-334.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-335.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-339.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-341.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-342.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-350.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-351.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-352.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-353.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-354.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-355.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-356.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-361.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-362.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-363.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-364.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-365.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-366.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-367.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-368.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-456.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-457.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-458.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-459.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-460.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-462.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-463.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-464.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-465.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-466.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-536.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-538.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-540.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-541.jpg`,
      `${IMG}/Project 2/king-iron-works-staircase-website-542.jpg`,
    ],
  },
};

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

function Lightbox({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initialIndex);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDeltaRef = useRef({ x: 0, y: 0 });
  const [swipeOffset, setSwipeOffset] = useState(0);

  const prev = useCallback(() => setIdx((i) => (i === 0 ? images.length - 1 : i - 1)), [images.length]);
  const next = useCallback(() => setIdx((i) => (i === images.length - 1 ? 0 : i + 1)), [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowLeft") prev(); if (e.key === "ArrowRight") next(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  useEffect(() => { const o = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = o; }; }, []);

  const onTouchStart = (e: React.TouchEvent) => { touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; touchDeltaRef.current = { x: 0, y: 0 }; };
  const onTouchMove = (e: React.TouchEvent) => { if (!touchStartRef.current) return; const dx = e.touches[0].clientX - touchStartRef.current.x; const dy = e.touches[0].clientY - touchStartRef.current.y; touchDeltaRef.current = { x: dx, y: dy }; if (Math.abs(dx) > Math.abs(dy)) setSwipeOffset(dx * 0.4); };
  const onTouchEnd = () => { const { x: dx, y: dy } = touchDeltaRef.current; setSwipeOffset(0); if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) { dx > 0 ? prev() : next(); } if (dy > 100 && Math.abs(dy) > Math.abs(dx)) onClose(); touchStartRef.current = null; };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black flex flex-col" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-white/60 hover:text-white p-1"><X className="w-6 h-6" /></button>
          <span className="text-white/40 text-sm font-display">{idx + 1} / {images.length}</span>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center relative overflow-hidden" onClick={onClose}>
        <button onClick={(e) => { e.stopPropagation(); prev(); }} className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 text-white/30 hover:text-white p-2 rounded-full hover:bg-white/10"><ChevronLeft className="w-7 h-7" /></button>
        <AnimatePresence mode="wait">
          <motion.img key={images[idx]} src={images[idx]} alt="" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1, x: swipeOffset }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="max-h-[80vh] max-w-[94vw] object-contain select-none" onClick={(e) => e.stopPropagation()} draggable={false} />
        </AnimatePresence>
        <button onClick={(e) => { e.stopPropagation(); next(); }} className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 text-white/30 hover:text-white p-2 rounded-full hover:bg-white/10"><ChevronRight className="w-7 h-7" /></button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Project Page
// ---------------------------------------------------------------------------

export default function ProjectShowcase({ projectSlug }: { projectSlug: string }) {
  const project = projects[projectSlug];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const localPhone = useLocalPhone();

  useEffect(() => { window.scrollTo(0, 0); }, [projectSlug]);

  if (!project) return <div className="min-h-screen flex items-center justify-center"><p>Project not found.</p></div>;

  const otherProject = Object.values(projects).find((p) => p.slug !== projectSlug);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative h-[70vh] sm:h-[80vh] overflow-hidden">
        <img src={project.heroImage} alt={project.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-16">
          <div className="max-w-4xl">
            <p className="section-eyebrow mb-3" style={{ color: "var(--accent)" }}>Featured Project</p>
            <h1 className="text-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-3 leading-[1.05]">
              {project.title}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-white/70 max-w-2xl">
              {project.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {project.intro}
            </p>
          </div>
        </div>
      </section>

      {/* Journey — From Sketch to Reality */}
      <section className="bg-sidebar text-sidebar-foreground">
        <div className="container py-16 lg:py-24">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="section-eyebrow mb-4" style={{ color: "var(--accent)" }}>The Journey</p>
            <h2 className="text-display text-3xl md:text-5xl">From Sketch to Reality</h2>
          </div>
        </div>

        {project.journey.map((phase, i) => {
          const isEven = i % 2 === 0;
          return (
            <div key={i} className="relative">
              <div className="container">
                <div className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} gap-0 lg:gap-16 items-center pb-16 lg:pb-24`}>
                  {/* Image */}
                  <div className="w-full lg:w-1/2 mb-8 lg:mb-0">
                    <div className="relative overflow-hidden">
                      <img
                        src={phase.image}
                        alt={phase.title}
                        className="w-full h-[400px] sm:h-[500px] object-cover"
                        loading={i < 2 ? "eager" : "lazy"}
                      />
                      <div className="absolute top-4 left-4 bg-accent text-accent-foreground px-3 py-1 text-xs font-display font-bold">
                        {String(i + 1).padStart(2, "0")} / {String(project.journey.length).padStart(2, "0")}
                      </div>
                    </div>
                  </div>

                  {/* Text */}
                  <div className="w-full lg:w-1/2 px-1 lg:px-0">
                    <p className="text-accent text-xs font-display font-bold tracking-wider uppercase mb-2">
                      {phase.subtitle}
                    </p>
                    <h3 className="text-display text-2xl md:text-3xl mb-4">
                      {phase.title}
                    </h3>
                    <p className="text-sidebar-foreground/70 leading-relaxed text-base md:text-lg">
                      {phase.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Challenges */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <p className="section-eyebrow mb-4">The Hard Parts</p>
            <h2 className="text-display text-3xl md:text-4xl mb-12">What Made This Project Exceptional</h2>
            <div className="space-y-8">
              {project.challenges.map((c, i) => (
                <div key={i} className="flex gap-5">
                  <div className="w-10 h-10 bg-accent/10 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-accent font-display font-bold text-sm">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div>
                    <h3 className="text-display text-lg md:text-xl mb-2">{c.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{c.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 lg:py-20 bg-accent text-accent-foreground">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {project.stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl lg:text-4xl font-display font-bold mb-1">{stat.value}</div>
                <div className="text-sm opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10">
            <div>
              <p className="section-eyebrow mb-4">Full Gallery</p>
              <h2 className="text-display text-2xl md:text-4xl">
                Every Angle, Every Detail
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mt-2 md:mt-0">{project.galleryImages.length} photos — tap to view full size</p>
          </div>

          <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
            {project.galleryImages.map((src, i) => (
              <div
                key={src}
                className="mb-3 break-inside-avoid cursor-pointer group overflow-hidden rounded-sm"
                onClick={() => setLightboxIndex(i)}
              >
                <img
                  src={src}
                  alt={`${project.title} — photo ${i + 1}`}
                  className="w-full block transition-transform duration-500 group-hover:scale-105"
                  loading={i < 8 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-sidebar text-sidebar-foreground">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <p className="section-eyebrow mb-4" style={{ color: "var(--accent)" }}>Your Turn</p>
            <h2 className="text-display text-2xl md:text-4xl mb-4">
              What Will Your Staircase Look Like?
            </h2>
            <p className="text-lg text-sidebar-foreground/60 mb-8 leading-relaxed">
              Every masterpiece starts with a conversation. Tell us your vision —
              we'll sketch it, engineer it, forge it, and install it.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-display font-bold px-8 py-5">
                  Start Your Project
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <PhoneLink tel={localPhone.tel}>
                <Button size="lg" variant="outline" className="border-sidebar-foreground/20 text-sidebar-foreground hover:bg-sidebar-foreground/10 font-display font-bold px-8 py-5">
                  <Phone className="mr-2 w-4 h-4" />
                  Call Now
                </Button>
              </PhoneLink>
            </div>
          </div>
        </div>
      </section>

      {/* Other Project */}
      {otherProject && (
        <section className="py-16 lg:py-24 bg-background">
          <div className="container">
            <p className="section-eyebrow mb-4">See Also</p>
            <Link href={`/projects/${otherProject.slug}`}>
              <div className="relative group overflow-hidden rounded-sm cursor-pointer max-w-4xl mx-auto">
                <img
                  src={otherProject.heroImage}
                  alt={otherProject.title}
                  className="w-full h-[300px] sm:h-[400px] object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
                  <h3 className="text-display text-2xl md:text-3xl text-white mb-2">{otherProject.title}</h3>
                  <p className="text-sm text-white/60 mb-4 max-w-lg">{otherProject.subtitle}</p>
                  <span className="inline-flex items-center gap-2 text-sm font-display font-bold text-accent group-hover:gap-3 transition-all">
                    View This Project <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox images={project.galleryImages} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
