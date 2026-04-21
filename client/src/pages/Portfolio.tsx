import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Grid3X3,
  Home,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalPhone } from "@/lib/useLocalPhone";
import { PhoneLink } from "@/components/PhoneLink";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const IMG = "/images";
const LOCAL = "/images/portfolio";

interface Photo {
  src: string;
  alt: string;
  category: string;
}

const categories = [
  { id: "all", label: "All Work", icon: Grid3X3 },
  { id: "cable-railing", label: "Cable Railings" },
  { id: "structural-steel", label: "Structural Steel" },
  { id: "gate", label: "Gates" },
  { id: "window-well", label: "Window Well" },
  { id: "window", label: "Windows" },
  { id: "balcony", label: "Balcony" },
  { id: "interior-railing", label: "Interior Railings" },
  { id: "fire-escape", label: "Fire Escapes" },
  { id: "deck-railing", label: "Deck Railings" },
  { id: "before-after", label: "Before & After" },
  { id: "handrail", label: "Handrail" },
  { id: "exterior-railing", label: "Exterior Railings" },
  { id: "restoration", label: "Restoration" },
];

const photos: Photo[] = [
  // Structural Steel
  { category: "structural-steel", src: `${LOCAL}/structural-steel/structural-steel-1.jpg`, alt: "Structural steel fabrication" },
  { category: "structural-steel", src: `${LOCAL}/structural-steel/structural-steel-2.jpg`, alt: "Commercial structural steel installation" },
  { category: "structural-steel", src: `${LOCAL}/structural-steel/structural-steel-3.jpg`, alt: "Steel beam construction" },
  // Cable Railings
  { category: "cable-railing", src: `${LOCAL}/cable-railing/cable-railing-1.jpg`, alt: "Custom cable railing system" },
  { category: "cable-railing", src: `${LOCAL}/cable-railing/cable-railing-2.jpg`, alt: "Cable railing installation" },
  // Fire Escapes
  { category: "fire-escape", src: `${IMG}/VrmKyMuovdgoFRfz.JPG`, alt: "Multi-story fire escape installation" },
  { category: "fire-escape", src: `${IMG}/PmBUKqXwdDkeqflj.JPG`, alt: "Fire escape structural repair" },
  { category: "fire-escape", src: `${IMG}/LIIMwNaIvkbuwmQE.JPG`, alt: "Commercial fire escape system" },
  { category: "fire-escape", src: `${IMG}/YgqFSongHOumLnae.JPG`, alt: "Fire escape with landing platform" },
  { category: "fire-escape", src: `${IMG}/aqPLHeShxXujREPn.JPG`, alt: "Precision fire escape welding" },
  { category: "fire-escape", src: `${IMG}/jypAuoqruUncOLCs.JPG`, alt: "Fire escape platform installation" },
  { category: "fire-escape", src: `${LOCAL}/fire-escape/fire-escape-1.jpg`, alt: "Fire escape ladder and platform system" },
  { category: "fire-escape", src: `${LOCAL}/fire-escape/fire-escape-2.jpg`, alt: "Residential fire escape installation" },
  { category: "fire-escape", src: `${LOCAL}/fire-escape/fire-escape-3.jpg`, alt: "Fire escape stairway fabrication" },
  // Gates
  { category: "gate", src: `${IMG}/ldKpYAFGAsEGkCVX.JPG`, alt: "Ornamental wrought iron gate" },
  { category: "gate", src: `${IMG}/aoFXjvosIbfREama.JPG`, alt: "Hand-forged estate gate" },
  { category: "gate", src: `${IMG}/AzTrmVJOTgNkaNYM.JPG`, alt: "Custom security gate" },
  { category: "gate", src: `${IMG}/ydWQkwicmrXamlMe.JPG`, alt: "Traditional garden gate" },
  { category: "gate", src: `${IMG}/JjzdorsfDKYfzhbn.JPG`, alt: "Heavy-duty driveway gate" },
  { category: "gate", src: `${IMG}/eXGgruXrInmeQsTe.JPG`, alt: "Decorative pedestrian gate" },
  { category: "gate", src: `${LOCAL}/gate/gate-1.jpg`, alt: "Custom iron gate fabrication" },
  { category: "gate", src: `${LOCAL}/gate/gate-2.jpg`, alt: "Ornamental garden gate" },
  { category: "gate", src: `${LOCAL}/gate/gate-3.jpg`, alt: "Residential entry gate" },
  // Interior Railings
  { category: "interior-railing", src: `${IMG}/apLcldtAeVXzDTCh.JPG`, alt: "Custom interior staircase railing" },
  { category: "interior-railing", src: `${IMG}/YrJVPkpgGfMkWRdT.JPG`, alt: "Elegant spiral staircase railing" },
  { category: "interior-railing", src: `${IMG}/qOPbckSMBFnciBif.JPG`, alt: "Modern interior railing" },
  { category: "interior-railing", src: `${IMG}/jSJklBUsKvwOXBaZ.JPG`, alt: "Residential handrail system" },
  { category: "interior-railing", src: `${LOCAL}/interior-railing/interior-railings-1.jpg`, alt: "Custom staircase railing design" },
  { category: "interior-railing", src: `${LOCAL}/interior-railing/interior-railings-2.jpg`, alt: "Interior iron balustrade" },
  { category: "interior-railing", src: `${LOCAL}/interior-railing/interior-railings-3.jpg`, alt: "Wrought iron staircase handrail" },
  // Exterior Railings
  { category: "exterior-railing", src: `${IMG}/KVrQsNoDvGzMAnwj.JPG`, alt: "Weather-resistant exterior railing" },
  { category: "exterior-railing", src: `${IMG}/BtcNBKAOOIKUZnLV.JPG`, alt: "Powder-coated deck railing" },
  { category: "exterior-railing", src: `${IMG}/gujHFKlEnadUYTxL.JPG`, alt: "Classic New England porch railing" },
  { category: "exterior-railing", src: `${IMG}/IrppZGXOKBxchPDP.JPG`, alt: "Ornamental balcony railing" },
  { category: "exterior-railing", src: `${LOCAL}/exterior-railing/exterior-railing-1.jpg`, alt: "Custom exterior porch railing" },
  { category: "exterior-railing", src: `${LOCAL}/exterior-railing/exterior-railing-2.jpg`, alt: "Wrought iron exterior handrail" },
  { category: "exterior-railing", src: `${LOCAL}/exterior-railing/exterior-railing-3.jpg`, alt: "Decorative exterior balustrade" },
  // Deck Railings
  { category: "deck-railing", src: `${LOCAL}/deck-railing/deck-railings-1.jpg`, alt: "Custom deck railing system" },
  { category: "deck-railing", src: `${LOCAL}/deck-railing/deck-railings-2.jpg`, alt: "Iron deck railing installation" },
  { category: "deck-railing", src: `${LOCAL}/deck-railing/deck-railings-3.jpg`, alt: "Residential deck railing" },
  // Balcony
  { category: "balcony", src: `${LOCAL}/balcony/balcony-1.jpg`, alt: "Custom balcony railing" },
  { category: "balcony", src: `${LOCAL}/balcony/balcony-2.jpg`, alt: "Ornamental balcony ironwork" },
  { category: "balcony", src: `${LOCAL}/balcony/balcony-3.jpg`, alt: "Residential balcony installation" },
  // Pipe & Handrail
  { category: "handrail", src: `${LOCAL}/handrail/pipe-handrail-1.jpg`, alt: "Pipe handrail installation" },
  { category: "handrail", src: `${LOCAL}/handrail/pipe-handrail-2.jpg`, alt: "Commercial pipe railing system" },
  { category: "handrail", src: `${LOCAL}/handrail/pipe-handrail-3.jpg`, alt: "ADA-compliant pipe handrail" },
  // Restoration
  { category: "restoration", src: `${IMG}/buMcGDTPsdJzspea.jpg`, alt: "Historic ironwork restoration detail" },
  { category: "restoration", src: `${IMG}/ZtrYnxwJFDZSmXOw.jpg`, alt: "Ornamental iron restoration" },
  { category: "restoration", src: `${IMG}/wFpGlEabFZwcJrgX.jpg`, alt: "Boston building restoration" },
  { category: "restoration", src: `${IMG}/XBlMdPEjsPJdjLFa.jpg`, alt: "Historic gate restoration" },
  { category: "restoration", src: `${IMG}/NgBghqHCKpNCJSJs.jpg`, alt: "Landmark architectural ironwork" },
  { category: "restoration", src: `${IMG}/rsujTYOxZArFMYMR.jpg`, alt: "Victorian period ironwork" },
  { category: "restoration", src: `${IMG}/dgqYFGcJuAYrvKtp.jpg`, alt: "Historic railing replication" },
  { category: "restoration", src: `${IMG}/DPcQhceaLWuEDbpK.jpg`, alt: "South End brownstone restoration" },
  { category: "restoration", src: `${IMG}/SYTGvQjSziYdBQab.jpg`, alt: "Beacon Hill historic district" },
  { category: "restoration", src: `${IMG}/GeAuXhLZDbFMhTPk.jpg`, alt: "Heritage building craftsmanship" },
  { category: "restoration", src: `${IMG}/egdmCLWLFeuifEJv.jpg`, alt: "Custom restoration of unavailable designs" },
  { category: "restoration", src: `${LOCAL}/restoration/restoration-1.jpg`, alt: "Historic ironwork restoration project" },
  // Window Well
  { category: "window-well", src: `${LOCAL}/window-well/window-well-1.jpg`, alt: "Custom window well cover" },
  { category: "window-well", src: `${LOCAL}/window-well/window-well-2.jpg`, alt: "Iron window well grate" },
  { category: "window-well", src: `${LOCAL}/window-well/window-well-3.jpg`, alt: "Window well guard installation" },
  { category: "window-well", src: `${LOCAL}/window-well/window-well-4.jpg`, alt: "Decorative window well cover" },
  // Windows
  { category: "window", src: `${LOCAL}/window/window-1.jpg`, alt: "Custom iron window guard" },
  { category: "window", src: `${LOCAL}/window/window-2.jpg`, alt: "Decorative window security grille" },
  { category: "window", src: `${LOCAL}/window/window-3.jpg`, alt: "Iron window frame installation" },
  // Before & After
  { category: "before-after", src: `${LOCAL}/before-after/before-after-1.jpg`, alt: "Ironwork restoration before and after" },
  { category: "before-after", src: `${LOCAL}/before-after/before-after-2.jpg`, alt: "Railing repair transformation" },
  { category: "before-after", src: `${LOCAL}/before-after/before-after-3.jpg`, alt: "Complete ironwork renovation" },
];

// ---------------------------------------------------------------------------
// CTA messages that appear between photos
// ---------------------------------------------------------------------------

const ctaMessages = [
  {
    headline: "Love what you see?",
    body: "Every piece is custom-built to your exact vision. Let\u2019s talk about yours.",
    cta: "Schedule a Free Consultation",
    href: "/contact",
    icon: Calendar,
  },
  {
    headline: "Imagining something like this for your home?",
    body: "Our craftsmen have 20+ years of experience bringing ideas to life. Yours could be next.",
    cta: "Get a Free Quote",
    href: "/contact",
    icon: ArrowRight,
  },
  {
    headline: "Ready to start your project?",
    body: "From a quick conversation to a finished masterpiece \u2014 we make the process easy.",
    cta: "Book Your Appointment",
    href: "/contact",
    icon: Sparkles,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BATCH_SIZE = 20;
const CTA_INTERVAL = 10; // show a CTA card every N photos

function getCategoryLabel(id: string) {
  return categories.find((c) => c.id === id)?.label ?? id;
}

// ---------------------------------------------------------------------------
// MasonryImage — single image tile with fade-in on load
// ---------------------------------------------------------------------------

function MasonryImage({
  photo,
  index,
  onClick,
}: {
  photo: Photo;
  index: number;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalHeight > 0) {
      setLoaded(true);
    }
  }, []);

  if (failed) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.3) }}
      className="mb-3 break-inside-avoid cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative overflow-hidden rounded-lg bg-muted/30">
        {/* Blur placeholder */}
        {!loaded && (
          <div className="absolute inset-0 bg-muted/50 animate-pulse rounded-lg" />
        )}
        <img
          ref={imgRef}
          src={photo.src}
          alt={photo.alt}
          loading={index < 8 ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`w-full block transition-all duration-500 group-hover:scale-[1.03] group-hover:brightness-110 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-end p-3">
          <span className="text-white text-xs font-display font-bold tracking-wider uppercase">
            {getCategoryLabel(photo.category)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// InlineCTA — appointment prompt card inside the masonry grid
// ---------------------------------------------------------------------------

function InlineCTA({ index }: { index: number }) {
  const msg = ctaMessages[index % ctaMessages.length];
  const Icon = msg.icon;

  return (
    <div className="mb-3 break-inside-avoid">
      <div className="rounded-lg border-2 border-accent/30 bg-accent/5 p-5 sm:p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-accent">
          <Icon className="w-5 h-5" />
          <span className="text-sm font-display font-bold tracking-wider uppercase">
            {msg.headline}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {msg.body}
        </p>
        <Link href={msg.href}>
          <Button
            size="sm"
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-display font-bold tracking-wider text-xs"
          >
            {msg.cta}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lightbox — immersive full-screen viewer
// ---------------------------------------------------------------------------

function Lightbox({
  photos: lbPhotos,
  initialIndex,
  onClose,
}: {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDeltaRef = useRef({ x: 0, y: 0 });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const localPhone = useLocalPhone();

  const photo = lbPhotos[currentIndex];

  const prev = useCallback(() => {
    setCurrentIndex((i) => (i === 0 ? lbPhotos.length - 1 : i - 1));
  }, [lbPhotos.length]);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i === lbPhotos.length - 1 ? 0 : i + 1));
  }, [lbPhotos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  // Lock body scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Touch handlers for swipe
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
    // Horizontal swipe — show offset
    if (Math.abs(dx) > Math.abs(dy)) {
      setSwipeOffset(dx * 0.4);
    }
  };

  const onTouchEnd = () => {
    const { x: dx, y: dy } = touchDeltaRef.current;
    setSwipeOffset(0);
    // Horizontal swipe
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) prev();
      else next();
    }
    // Vertical swipe down to close
    if (dy > 100 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
    }
    touchStartRef.current = null;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/97 flex flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-1"
          >
            <X className="w-6 h-6" />
          </button>
          <span className="text-white/40 text-sm font-display">
            {currentIndex + 1} / {lbPhotos.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-white/30 text-xs font-display uppercase tracking-wider">
            {getCategoryLabel(photo.category)}
          </span>
        </div>
      </div>

      {/* Main image area */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden px-2 sm:px-16"
        onClick={onClose}
      >
        {/* Prev button — desktop */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className="hidden sm:flex absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 text-white/30 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        <AnimatePresence mode="wait">
          <motion.img
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: swipeOffset,
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="max-h-[80vh] max-w-full object-contain rounded-sm select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </AnimatePresence>

        {/* Next button — desktop */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="hidden sm:flex absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 text-white/30 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>

      {/* Bottom bar — info + CTA */}
      <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
        <div className="text-center sm:text-left">
          <p className="text-white/80 text-sm">{photo.alt}</p>
          <p className="text-white/30 text-xs font-display uppercase tracking-wider mt-0.5">
            {getCategoryLabel(photo.category)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/contact">
            <Button
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-display font-bold tracking-wider text-xs"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Get a Free Quote
            </Button>
          </Link>
          <PhoneLink tel={localPhone.tel}>
            <Button
              size="sm"
              variant="outline"
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40 font-display text-xs"
            >
              <Phone className="w-3.5 h-3.5 mr-1.5" />
              Call
            </Button>
          </PhoneLink>
        </div>
      </div>

      {/* Thumbnail strip — desktop */}
      <div className="hidden sm:block shrink-0 border-t border-white/5 px-6 py-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide justify-center max-w-4xl mx-auto">
          {lbPhotos.map((p, i) => (
            <button
              key={p.src}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(i);
              }}
              className={`shrink-0 w-12 h-12 rounded overflow-hidden transition-all ${
                i === currentIndex
                  ? "ring-2 ring-accent opacity-100"
                  : "opacity-40 hover:opacity-70"
              }`}
            >
              <img
                src={p.src}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Portfolio Page
// ---------------------------------------------------------------------------

export default function Portfolio() {
  const [, setLocation] = useLocation();
  const [matchCategory, params] = useRoute("/portfolio/:category");
  const categoryFromUrl = matchCategory ? params.category : "all";

  const activeCategory =
    categories.find((c) => c.id === categoryFromUrl)?.id ?? "all";

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const localPhone = useLocalPhone();

  // Filter photos by category
  const filteredPhotos = useMemo(
    () =>
      activeCategory === "all"
        ? photos
        : photos.filter((p) => p.category === activeCategory),
    [activeCategory],
  );

  // Count per category
  const photoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of categories) {
      counts[c.id] =
        c.id === "all" ? photos.length : photos.filter((p) => p.category === c.id).length;
    }
    return counts;
  }, []);

  // Reset visible count when category changes
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [activeCategory]);

  // Infinite scroll observer
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + BATCH_SIZE, filteredPhotos.length),
          );
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredPhotos.length]);

  // Navigate categories via URL
  const setCategory = useCallback(
    (id: string) => {
      setLocation(id === "all" ? "/portfolio" : `/portfolio/${id}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setLocation],
  );

  // Build masonry items (photos + CTA cards interleaved)
  const visiblePhotos = filteredPhotos.slice(0, visibleCount);
  const masonryItems: Array<
    { type: "photo"; photo: Photo; globalIndex: number } | { type: "cta"; ctaIndex: number }
  > = [];
  let ctaCounter = 0;
  for (let i = 0; i < visiblePhotos.length; i++) {
    masonryItems.push({
      type: "photo",
      photo: visiblePhotos[i],
      globalIndex: i,
    });
    // Insert CTA after every CTA_INTERVAL photos (but not at the very end)
    if (
      (i + 1) % CTA_INTERVAL === 0 &&
      i + 1 < visiblePhotos.length
    ) {
      masonryItems.push({ type: "cta", ctaIndex: ctaCounter++ });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header / Breadcrumb */}
      <div className="border-b border-border bg-background">
        <div className="container py-4 sm:py-5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
              <Home className="w-3 h-3" />
              Home
            </Link>
            <span>/</span>
            {activeCategory !== "all" ? (
              <>
                <Link
                  href="/portfolio"
                  className="hover:text-foreground transition-colors"
                >
                  Portfolio
                </Link>
                <span>/</span>
                <span className="text-foreground font-medium">
                  {getCategoryLabel(activeCategory)}
                </span>
              </>
            ) : (
              <span className="text-foreground font-medium">Portfolio</span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-display text-2xl sm:text-3xl lg:text-4xl">
                {activeCategory === "all"
                  ? "Our Portfolio"
                  : getCategoryLabel(activeCategory)}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {filteredPhotos.length} project
                {filteredPhotos.length !== 1 ? "s" : ""} showcasing our
                craftsmanship
              </p>
            </div>

            {/* Quick links */}
            <div className="flex items-center gap-2">
              <Link href="/services">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-display font-bold tracking-wider"
                >
                  Our Services
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-display font-bold tracking-wider"
                >
                  Free Quote
                  <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Category Filter Bar */}
      <div
        ref={filterBarRef}
        className="sticky top-16 lg:top-20 z-30 bg-background/95 backdrop-blur-sm border-b border-border"
      >
        <div className="container py-2.5">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {categories.map((cat) => {
              const count = photoCounts[cat.id];
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`
                    px-3.5 py-1.5 text-[11px] font-display font-bold tracking-wider whitespace-nowrap
                    transition-all rounded-full flex-shrink-0 flex items-center gap-1.5
                    ${
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : count === 0
                          ? "bg-transparent text-muted-foreground/40 border border-border/50"
                          : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
                    }
                  `}
                >
                  {cat.label.toUpperCase()}
                  {count > 0 && (
                    <span
                      className={`text-[9px] ${
                        isActive ? "text-accent-foreground/70" : "text-muted-foreground/50"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Masonry Grid */}
      <div className="container py-6">
        {filteredPhotos.length > 0 ? (
          <div className="columns-2 md:columns-3 xl:columns-4 gap-3">
            <AnimatePresence mode="popLayout">
              {masonryItems.map((item, idx) => {
                if (item.type === "cta") {
                  return <InlineCTA key={`cta-${item.ctaIndex}`} index={item.ctaIndex} />;
                }
                return (
                  <MasonryImage
                    key={item.photo.src}
                    photo={item.photo}
                    index={idx}
                    onClick={() => setLightboxIndex(item.globalIndex)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-32">
            <p className="text-xl text-muted-foreground mb-4">
              No projects in this category yet.
            </p>
            <Button
              variant="outline"
              onClick={() => setCategory("all")}
              className="font-display font-bold tracking-wider"
            >
              View All Work
            </Button>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        {visibleCount < filteredPhotos.length && (
          <div ref={loadMoreRef} className="flex justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="w-5 h-5 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
              Loading more...
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <section className="border-t-4 border-accent bg-accent text-accent-foreground py-16 sm:py-20">
        <div className="container text-center max-w-2xl">
          <h2 className="text-display text-2xl sm:text-3xl lg:text-4xl mb-4">
            Like What You See?
          </h2>
          <p className="text-lg opacity-90 mb-8 leading-relaxed">
            Every project in our portfolio started with a conversation. Tell us
            about your vision and we&apos;ll bring it to life with the same
            care and precision you see here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-base px-8 py-5 thick-border font-display font-bold tracking-wider"
              >
                Book Your Free Consultation
                <Calendar className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <PhoneLink tel={localPhone.tel}>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-base px-8 py-5 thick-border font-display font-bold tracking-wider"
              >
                <Phone className="mr-2 w-5 h-5" />
                {localPhone.display}
              </Button>
            </PhoneLink>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
          <Lightbox
            photos={filteredPhotos}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
