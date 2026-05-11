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

interface ProjectData {
  slug: string;
  title: string;
  subtitle: string;
  description: string[];
  highlights: string[];
  heroImage: string;
  galleryImages: string[];
}

const projects: Record<string, ProjectData> = {
  "medallion-scrollwork": {
    slug: "medallion-scrollwork",
    title: "The Medallion Scrollwork Staircase",
    subtitle: "A Grand Curved Staircase with Hand-Forged Ornamental Ironwork",
    description: [
      "This sweeping curved staircase transformed a new-construction luxury home into a grand estate. Every element — from the ornamental medallion panels to the flowing scrollwork connecting them — was hand-forged in our Everett, MA fabrication shop.",
      "The railing features repeating medallion rosettes with gold-leaf accents, connected by S-scroll balusters that create a continuous rhythm as the staircase curves upward. A warm walnut handrail caps the ironwork, providing both elegance and a natural grip.",
      "Our team installed the railing during the home's construction phase, working closely with the general contractor to ensure perfect alignment with the curved concrete stringer. The result: a staircase that looks like it belongs in a European palace — built right here in New England.",
    ],
    highlights: [
      "Hand-forged ornamental medallion panels with gold accents",
      "Custom-bent continuous walnut handrail following the curve",
      "Installed during new construction for seamless integration",
      "Over 800 hours of fabrication in our Everett shop",
      "Concrete curved stringer with marble-ready treads",
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
    subtitle: "A Showpiece Curved Staircase with Hand-Forged Peacock Scrollwork & Gold Leaf",
    description: [
      "This is the staircase that stops every visitor mid-sentence. Sweeping two full stories through a marble-floored grand foyer, the Peacock Masterpiece features hand-forged ironwork inspired by peacock feather plumes — each scroll and leaf individually shaped by our master craftsmen.",
      "Gold leaf accents bring warmth and dimension to the flowing ironwork, catching light from the crystal chandelier above. The peacock motif panels are interspersed with organic vine scrollwork, creating a design that feels both grand and alive.",
      "From the first sketch to the final installation, this project consumed over 1,200 hours of fabrication. The curved stringer, the railing, the balcony guard above — every component was designed, forged, and fitted as a single cohesive work of art. It's not just a staircase. It's the reason we do what we do.",
    ],
    highlights: [
      "Hand-forged peacock feather scrollwork — one-of-a-kind design",
      "Gold leaf accents on every scroll and leaf detail",
      "Two-story sweeping curve with matching balcony railing",
      "Over 1,200 hours of master craftsmanship",
      "Marble foyer with crystal chandelier integration",
      "Custom walnut handrail with volute termination",
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

      {/* Story */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <p className="section-eyebrow mb-4">The Story</p>
            <div className="space-y-6">
              {project.description.map((p, i) => (
                <p key={i} className="text-lg text-muted-foreground leading-relaxed">{p}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-16 lg:py-24 bg-sidebar text-sidebar-foreground">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <p className="section-eyebrow mb-4" style={{ color: "var(--accent)" }}>Project Highlights</p>
            <h2 className="text-display text-2xl md:text-4xl mb-8">What Makes This Special</h2>
            <div className="space-y-4">
              {project.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-accent font-display font-bold text-sm">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <p className="text-sidebar-foreground/80 leading-relaxed">{h}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10">
            <div>
              <p className="section-eyebrow mb-4">Gallery</p>
              <h2 className="text-display text-2xl md:text-4xl">
                {project.galleryImages.length} Photos
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mt-2 md:mt-0">Tap any image to view full size</p>
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
      <section className="py-16 lg:py-24 bg-accent text-accent-foreground">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-display text-2xl md:text-4xl mb-4">
              Want a Staircase Like This?
            </h2>
            <p className="text-lg opacity-80 mb-8 leading-relaxed">
              Every masterpiece starts with a conversation. Tell us your vision —
              we'll engineer and forge it into reality.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" className="bg-sidebar text-sidebar-foreground hover:bg-sidebar/90 font-display font-bold px-8 py-5">
                  Get a Free Quote
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <PhoneLink tel={localPhone.tel}>
                <Button size="lg" variant="outline" className="border-accent-foreground/30 text-accent-foreground hover:bg-accent-foreground/10 font-display font-bold px-8 py-5">
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
        <section className="py-16 lg:py-24 bg-sidebar text-sidebar-foreground">
          <div className="container">
            <p className="section-eyebrow mb-4" style={{ color: "var(--accent)" }}>See Also</p>
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
                    View Project <ArrowRight className="w-4 h-4" />
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
