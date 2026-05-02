import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Phone,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  MapPin,
  Wrench,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalPhone } from "@/lib/useLocalPhone";
import { PhoneLink } from "@/components/PhoneLink";
import {
  getStaircaseType,
  getRelatedTypes,
  STAIRCASE_TYPES,
  type GalleryPhoto,
} from "@/lib/staircase-data";

// ---------------------------------------------------------------------------
// Lightbox (adapted from Portfolio.tsx)
// ---------------------------------------------------------------------------

function Lightbox({
  photos,
  initialIndex,
  onClose,
}: {
  photos: GalleryPhoto[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDeltaRef = useRef({ x: 0, y: 0 });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const localPhone = useLocalPhone();

  const photo = photos[currentIndex];
  const prev = useCallback(
    () => setCurrentIndex((i) => (i === 0 ? photos.length - 1 : i - 1)),
    [photos.length]
  );
  const next = useCallback(
    () => setCurrentIndex((i) => (i === photos.length - 1 ? 0 : i + 1)),
    [photos.length]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  useEffect(() => {
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = o;
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    touchDeltaRef.current = { x: 0, y: 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    touchDeltaRef.current = { x: dx, y: dy };
    if (Math.abs(dx) > Math.abs(dy)) setSwipeOffset(dx * 0.4);
  };
  const onTouchEnd = () => {
    const { x: dx, y: dy } = touchDeltaRef.current;
    setSwipeOffset(0);
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      dx > 0 ? prev() : next();
    }
    if (dy > 100 && Math.abs(dy) > Math.abs(dx)) onClose();
    touchStartRef.current = null;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1"
          >
            <X className="w-6 h-6" />
          </button>
          <span className="text-white/40 text-sm font-display">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>
      </div>
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        onClick={onClose}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 text-white/30 hover:text-white p-2 rounded-full hover:bg-white/10"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <AnimatePresence mode="wait">
          <motion.img
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, x: swipeOffset }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="max-h-[78vh] max-w-[94vw] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </AnimatePresence>
        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 text-white/30 hover:text-white p-2 rounded-full hover:bg-white/10"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      </div>
      <div className="shrink-0 px-4 py-3 flex items-center justify-between gap-3 border-t border-white/10">
        <p className="text-white/60 text-sm truncate flex-1">{photo.alt}</p>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/contact">
            <Button
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-display font-bold text-xs h-9 px-3"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Quote
            </Button>
          </Link>
          <PhoneLink tel={localPhone.tel}>
            <Button
              size="sm"
              variant="outline"
              className="border-white/20 text-white/70 hover:text-white font-display text-xs h-9 px-3"
            >
              <Phone className="w-3.5 h-3.5 mr-1.5" />
              Call
            </Button>
          </PhoneLink>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// StaircaseDetail Page
// ---------------------------------------------------------------------------

export default function StaircaseDetail() {
  const [, params] = useRoute("/staircases/:type");
  const [, setLocation] = useLocation();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const staircaseType = getStaircaseType(params?.type ?? "");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params?.type]);

  if (!staircaseType) {
    setLocation("/staircases");
    return null;
  }

  const relatedTypes = getRelatedTypes(staircaseType.relatedTypes);
  const hasGallery = staircaseType.galleryPhotos.length > 0;

  return (
    <>
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-[60vh] lg:min-h-[70vh] bg-sidebar overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={staircaseType.heroImage}
            alt={staircaseType.name}
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/80 to-sidebar/40" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-24 lg:py-32 flex flex-col justify-end min-h-[60vh] lg:min-h-[70vh]">
          {/* Breadcrumb */}
          <Link href="/staircases">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[3px] uppercase text-accent/60 hover:text-accent transition-colors cursor-pointer mb-6">
              <ArrowLeft className="w-3.5 h-3.5" />
              All Staircases
            </span>
          </Link>

          <motion.h1
            className="font-display text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.05] mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {staircaseType.name}
          </motion.h1>

          <motion.p
            className="text-lg lg:text-xl text-white/50 max-w-2xl leading-relaxed"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            {staircaseType.tagline}
          </motion.p>
        </div>
      </section>

      {/* ═══════════ DESCRIPTION ═══════════ */}
      <section className="bg-background py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <p className="text-xs font-semibold tracking-[4px] uppercase text-accent mb-4">
                About This Style
              </p>
              <p className="text-foreground/70 text-base lg:text-lg leading-relaxed">
                {staircaseType.description}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Features */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <p className="text-xs font-semibold tracking-[3px] uppercase text-foreground/50">
                    Features
                  </p>
                </div>
                <ul className="space-y-2">
                  {staircaseType.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-foreground/60"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Materials + Best For */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Wrench className="w-4 h-4 text-accent" />
                    <p className="text-xs font-semibold tracking-[3px] uppercase text-foreground/50">
                      Materials
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {staircaseType.materials.map((m) => (
                      <span
                        key={m}
                        className="px-3 py-1 text-xs font-display font-semibold tracking-wide bg-accent/10 text-accent border border-accent/20"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-4 h-4 text-accent" />
                    <p className="text-xs font-semibold tracking-[3px] uppercase text-foreground/50">
                      Best For
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {staircaseType.bestFor.map((b) => (
                      <span
                        key={b}
                        className="px-3 py-1 text-xs font-display font-semibold tracking-wide bg-foreground/5 text-foreground/50 border border-foreground/10"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ GALLERY ═══════════ */}
      {hasGallery && (
        <section className="bg-sidebar py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <p className="text-xs font-semibold tracking-[4px] uppercase text-accent/60 mb-4">
              Our Work
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-black tracking-tight text-white mb-12">
              {staircaseType.name} Portfolio
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              {staircaseType.galleryPhotos.map((photo, i) => (
                <motion.button
                  key={photo.src}
                  onClick={() => setLightboxIndex(i)}
                  className="relative overflow-hidden group cursor-pointer aspect-[3/4]"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  viewport={{ once: true, amount: 0.2 }}
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading={i < 6 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-xs leading-snug line-clamp-2">
                      {photo.alt}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ CTA ═══════════ */}
      <section className="bg-accent py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight text-accent-foreground mb-4">
            Ready to Build Your{" "}
            {staircaseType.name.split(" ")[0]} Staircase?
          </h2>
          <p className="text-accent-foreground/70 text-lg mb-8 max-w-xl mx-auto">
            Every project starts with a free consultation. Tell us about your
            space and vision — we'll handle the engineering, fabrication, and
            installation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-sidebar text-white hover:bg-sidebar/90 font-display font-bold text-sm tracking-wide uppercase px-8 h-12"
              >
                Get a Free Quote
              </Button>
            </Link>
            <a
              href="tel:+16173003530"
              className="inline-flex items-center gap-2 px-8 h-12 border-2 border-accent-foreground/30 text-accent-foreground font-display font-bold text-sm tracking-wide uppercase hover:border-accent-foreground/60 transition-colors"
            >
              <Phone className="w-4 h-4" />
              (617) 300-3530
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════ RELATED TYPES ═══════════ */}
      {relatedTypes.length > 0 && (
        <section className="bg-background py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <p className="text-xs font-semibold tracking-[4px] uppercase text-accent mb-4">
              Explore More
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-black tracking-tight text-foreground mb-12">
              Related Staircase Styles
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedTypes.map((rt) => (
                <Link key={rt.slug} href={`/staircases/${rt.slug}`}>
                  <div className="group cursor-pointer overflow-hidden border border-foreground/10 hover:border-accent/30 transition-colors">
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={rt.heroImage}
                        alt={rt.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                    <div className="p-5 bg-sidebar">
                      <h3 className="font-display text-lg font-bold text-white mb-1">
                        {rt.name}
                      </h3>
                      <p className="text-sm text-white/40 line-clamp-2">
                        {rt.tagline}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-3 text-xs font-semibold tracking-wide uppercase text-accent">
                        View Collection
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ LIGHTBOX ═══════════ */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            photos={staircaseType.galleryPhotos}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
