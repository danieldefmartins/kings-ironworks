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
  ChevronDown,
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
  { id: "all", label: "All Work" },
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
// CTA messages
// ---------------------------------------------------------------------------

const ctaMessages = [
  {
    headline: "Love what you see?",
    body: "Every piece is custom-built to your exact vision. Let\u2019s talk about yours.",
    cta: "Free Consultation",
    href: "/contact",
    icon: Calendar,
  },
  {
    headline: "Picture this at your home?",
    body: "20+ years of craftsmanship. Yours could be next.",
    cta: "Get a Free Quote",
    href: "/contact",
    icon: ArrowRight,
  },
  {
    headline: "Ready to start?",
    body: "From conversation to masterpiece \u2014 we make it easy.",
    cta: "Book Appointment",
    href: "/contact",
    icon: Sparkles,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BATCH_SIZE = 24;
const CTA_INTERVAL = 12;

function getCategoryLabel(id: string) {
  return categories.find((c) => c.id === id)?.label ?? id;
}

// ---------------------------------------------------------------------------
// MasonryImage
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.2) }}
      className="break-inside-avoid cursor-pointer group"
      style={{ marginBottom: "2px" }}
      onClick={onClick}
    >
      <div className="relative overflow-hidden bg-neutral-200 dark:bg-neutral-800">
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-neutral-300 dark:bg-neutral-700" />
        )}
        <img
          ref={imgRef}
          src={photo.src}
          alt={photo.alt}
          loading={index < 8 ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`w-full block transition-all duration-300 group-hover:scale-[1.02] ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Hover overlay — desktop only */}
        <div className="hidden sm:flex absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 items-end p-2.5">
          <span className="text-white text-[10px] font-display font-bold tracking-wider uppercase">
            {getCategoryLabel(photo.category)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// InlineCTA — compact card in the grid
// ---------------------------------------------------------------------------

function InlineCTA({ index }: { index: number }) {
  const msg = ctaMessages[index % ctaMessages.length];
  const Icon = msg.icon;

  return (
    <div className="break-inside-avoid" style={{ marginBottom: "2px" }}>
      <div className="bg-accent/10 p-3 sm:p-4 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-accent">
          <Icon className="w-4 h-4 shrink-0" />
          <span className="text-xs font-display font-bold leading-tight">
            {msg.headline}
          </span>
        </div>
        <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
          {msg.body}
        </p>
        <Link href={msg.href}>
          <Button
            size="sm"
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-display font-bold text-[10px] sm:text-xs h-7 sm:h-8"
          >
            {msg.cta}
            <ArrowRight className="ml-1 w-3 h-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategoryPicker — dropdown on mobile, pill bar on desktop
// ---------------------------------------------------------------------------

function CategoryPicker({
  activeCategory,
  photoCounts,
  onSelect,
}: {
  activeCategory: string;
  photoCounts: Record<string, number>;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <>
      {/* Mobile: dropdown button */}
      <div ref={dropdownRef} className="md:hidden relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between bg-card border border-border rounded-md px-3 py-2.5 text-sm font-display font-bold"
        >
          <span>{getCategoryLabel(activeCategory)}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-normal">
              {photoCounts[activeCategory]} photos
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-xl z-50 max-h-[60vh] overflow-y-auto"
            >
              {categories.map((cat) => {
                const count = photoCounts[cat.id];
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onSelect(cat.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? "bg-accent/10 text-accent font-bold"
                        : count === 0
                          ? "text-muted-foreground/40"
                          : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="font-display">{cat.label}</span>
                    <span className={`text-xs ${isActive ? "text-accent" : "text-muted-foreground"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: scrollable pill bar */}
      <div className="hidden md:flex gap-1.5 overflow-x-auto scrollbar-hide">
        {categories.map((cat) => {
          const count = photoCounts[cat.id];
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`
                px-3 py-1.5 text-xs font-display font-bold tracking-wide whitespace-nowrap
                transition-all rounded-full flex-shrink-0
                ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : count === 0
                      ? "text-muted-foreground/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
                }
              `}
            >
              {cat.label}
              {count > 0 && !isActive && (
                <span className="ml-1 text-[10px] text-muted-foreground/50">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Lightbox
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
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
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
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 sm:px-6 sm:py-3 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-white/60 hover:text-white p-1">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <span className="text-white/40 text-xs sm:text-sm font-display">
            {currentIndex + 1} / {lbPhotos.length}
          </span>
        </div>
        <span className="text-white/30 text-[10px] sm:text-xs font-display uppercase tracking-wider">
          {getCategoryLabel(photo.category)}
        </span>
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        onClick={onClose}
      >
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 text-white/30 hover:text-white p-2 rounded-full hover:bg-white/10"
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
            className="max-h-[82vh] max-w-[96vw] sm:max-w-[90vw] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </AnimatePresence>

        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 text-white/30 hover:text-white p-2 rounded-full hover:bg-white/10"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 border-t border-white/10">
        <p className="text-white/60 text-xs sm:text-sm truncate flex-1">{photo.alt}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <Link href="/contact">
            <Button
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-display font-bold text-[10px] sm:text-xs h-7 sm:h-8 px-2.5 sm:px-3"
            >
              <Calendar className="w-3 h-3 mr-1" />
              Quote
            </Button>
          </Link>
          <PhoneLink tel={localPhone.tel}>
            <Button
              size="sm"
              variant="outline"
              className="border-white/20 text-white/70 hover:text-white font-display text-[10px] sm:text-xs h-7 sm:h-8 px-2.5 sm:px-3"
            >
              <Phone className="w-3 h-3 mr-1" />
              Call
            </Button>
          </PhoneLink>
        </div>
      </div>

      {/* Thumbnail strip — desktop */}
      <div className="hidden md:block shrink-0 border-t border-white/5 px-6 py-1.5">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide justify-center max-w-4xl mx-auto">
          {lbPhotos.map((p, i) => (
            <button
              key={p.src}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
              className={`shrink-0 w-10 h-10 rounded-sm overflow-hidden transition-all ${
                i === currentIndex
                  ? "ring-2 ring-accent opacity-100"
                  : "opacity-30 hover:opacity-60"
              }`}
            >
              <img src={p.src} alt="" className="w-full h-full object-cover" loading="lazy" />
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
  const localPhone = useLocalPhone();

  const filteredPhotos = useMemo(
    () =>
      activeCategory === "all"
        ? photos
        : photos.filter((p) => p.category === activeCategory),
    [activeCategory],
  );

  const photoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of categories) {
      counts[c.id] = c.id === "all" ? photos.length : photos.filter((p) => p.category === c.id).length;
    }
    return counts;
  }, []);

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [activeCategory]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredPhotos.length));
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredPhotos.length]);

  const setCategory = useCallback(
    (id: string) => {
      setLocation(id === "all" ? "/portfolio" : `/portfolio/${id}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setLocation],
  );

  // Build masonry items with interleaved CTAs
  const visiblePhotos = filteredPhotos.slice(0, visibleCount);
  const masonryItems: Array<
    { type: "photo"; photo: Photo; globalIndex: number } | { type: "cta"; ctaIndex: number }
  > = [];
  let ctaCounter = 0;
  for (let i = 0; i < visiblePhotos.length; i++) {
    masonryItems.push({ type: "photo", photo: visiblePhotos[i], globalIndex: i });
    if ((i + 1) % CTA_INTERVAL === 0 && i + 1 < visiblePhotos.length) {
      masonryItems.push({ type: "cta", ctaIndex: ctaCounter++ });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Compact header — minimal on mobile */}
      <div className="sticky top-16 lg:top-20 z-30 bg-background border-b border-border">
        <div className="px-2 sm:px-4 lg:px-8 lg:max-w-[1280px] lg:mx-auto py-2 sm:py-2.5">
          {/* Mobile: category dropdown + quick link */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex-1">
              <CategoryPicker
                activeCategory={activeCategory}
                photoCounts={photoCounts}
                onSelect={setCategory}
              />
            </div>
            <Link href="/contact">
              <Button
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-display font-bold text-[10px] h-[38px] px-3 shrink-0"
              >
                Free Quote
              </Button>
            </Link>
          </div>

          {/* Desktop: breadcrumb + pills + links */}
          <div className="hidden md:block">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
                  <Home className="w-3 h-3" />
                  Home
                </Link>
                <span>/</span>
                {activeCategory !== "all" ? (
                  <>
                    <Link href="/portfolio" className="hover:text-foreground transition-colors">
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
                <span className="text-muted-foreground/50 ml-1">
                  ({filteredPhotos.length} projects)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/services">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-display font-bold tracking-wider h-7"
                  >
                    Services
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="sm"
                    className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-display font-bold tracking-wider h-7"
                  >
                    Free Quote
                    <ArrowRight className="ml-1 w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </div>
            <CategoryPicker
              activeCategory={activeCategory}
              photoCounts={photoCounts}
              onSelect={setCategory}
            />
          </div>
        </div>
      </div>

      {/* Masonry Grid — tight gaps, edge-to-edge on mobile */}
      <div className="px-0.5 sm:px-2 lg:px-8 lg:max-w-[1280px] lg:mx-auto py-0.5 sm:py-3">
        {filteredPhotos.length > 0 ? (
          <>
            <style>{`
              .portfolio-masonry { column-count: 2; column-gap: 2px; }
              @media (min-width: 768px) { .portfolio-masonry { column-count: 3; column-gap: 4px; } }
              @media (min-width: 1280px) { .portfolio-masonry { column-count: 4; column-gap: 6px; } }
            `}</style>
            <div className="portfolio-masonry">
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
            </div>
          </>
        ) : (
          <div className="text-center py-32">
            <p className="text-lg text-muted-foreground mb-4">
              No projects in this category yet.
            </p>
            <Button variant="outline" onClick={() => setCategory("all")} className="font-display font-bold">
              View All Work
            </Button>
          </div>
        )}

        {visibleCount < filteredPhotos.length && (
          <div ref={loadMoreRef} className="flex justify-center py-10">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="w-4 h-4 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
              Loading more...
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <section className="border-t-4 border-accent bg-accent text-accent-foreground py-12 sm:py-16">
        <div className="px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto text-center">
          <h2 className="text-display text-xl sm:text-2xl lg:text-3xl mb-3">
            Like What You See?
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-6 leading-relaxed">
            Every project started with a conversation. Tell us your vision and
            we&apos;ll bring it to life with the same craftsmanship you see here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-sm sm:text-base px-6 py-4 thick-border font-display font-bold tracking-wider"
              >
                Book Free Consultation
                <Calendar className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <PhoneLink tel={localPhone.tel}>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-sm sm:text-base px-6 py-4 thick-border font-display font-bold tracking-wider"
              >
                <Phone className="mr-2 w-4 h-4" />
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
