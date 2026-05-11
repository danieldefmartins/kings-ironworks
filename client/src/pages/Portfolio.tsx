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
  Home,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalPhone } from "@/lib/useLocalPhone";
import { PhoneLink } from "@/components/PhoneLink";
import {
  categories as portfolioCategories,
  getCategoryLabel,
} from "@/lib/portfolio-data";

// ---------------------------------------------------------------------------
// Parent / Sub-category structure
// ---------------------------------------------------------------------------

interface ParentCategory {
  id: string;
  label: string;
  children: string[]; // portfolio-data category IDs
}

const parentCategories: ParentCategory[] = [
  {
    id: "staircases",
    label: "Staircases",
    children: [
      "curved-staircases", "curved-project-1", "curved-project-2",
      "floating-full", "floating-mono-stringer", "floating-dual-stringer",
      "spiral-interior", "spiral-exterior", "grand-ornamental",
    ],
  },
  {
    id: "railings",
    label: "Railings",
    children: [
      "exterior-railings", "interior-railings", "cable-railings",
      "deck-railings", "commercial-railings", "small-railings",
    ],
  },
  { id: "gates", label: "Gates", children: ["gates"] },
  { id: "fire-escapes", label: "Fire Escapes", children: ["fire-escapes"] },
  { id: "balconies-group", label: "Balconies", children: ["balconies", "juliet-balconies"] },
  { id: "fences", label: "Fences", children: ["fences"] },
  { id: "structural-steel", label: "Structural Steel", children: ["structural-steel"] },
  { id: "window-wells", label: "Window Wells", children: ["window-wells", "window-guards"] },
  { id: "ada-ramps", label: "ADA Ramps", children: ["ada-ramps"] },
  { id: "shop-process", label: "Shop & Process", children: ["shop-process"] },
];

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

interface Photo { src: string; category: string; }

const photos: Photo[] = portfolioCategories.flatMap((c) =>
  c.photos.map((src) => ({ src, category: c.id })),
);

function getPhotosForParent(parentId: string): Photo[] {
  const parent = parentCategories.find((p) => p.id === parentId);
  if (!parent) return [];
  return photos.filter((p) => parent.children.includes(p.category));
}

function getSubcategories(parentId: string) {
  const parent = parentCategories.find((p) => p.id === parentId);
  if (!parent || parent.children.length <= 1) return [];
  return parent.children
    .map((id) => {
      const cat = portfolioCategories.find((c) => c.id === id);
      return cat ? { id: cat.id, label: cat.label, count: cat.photos.length } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null && c.count > 0);
}

// ---------------------------------------------------------------------------
// CTA + constants
// ---------------------------------------------------------------------------

const ctaMessages = [
  { headline: "Love what you see?", body: "Every piece is custom-built to your exact vision.", cta: "Free Consultation", href: "/contact", icon: Calendar },
  { headline: "Picture this at your home?", body: "20+ years of craftsmanship. Yours could be next.", cta: "Get a Free Quote", href: "/contact", icon: ArrowRight },
  { headline: "Ready to start?", body: "From conversation to masterpiece — we make it easy.", cta: "Book Appointment", href: "/contact", icon: Sparkles },
];

const BATCH_SIZE = 24;
const CATEGORY_SUGGEST_AFTER = 18;

// ---------------------------------------------------------------------------
// Masonry distribution
// ---------------------------------------------------------------------------

type MasonryItem = { type: "photo"; photo: Photo; globalIndex: number } | { type: "cta"; ctaIndex: number };

const COLUMNS_WITH_INITIAL_CTA = [1];
const COLUMN_CTA_OFFSETS = [3, 6, 4, 7];
const COLUMN_CTA_INTERVALS = [5, 7, 6, 8];

function distributeToColumns(items: MasonryItem[], colCount: number): MasonryItem[][] {
  const cols: MasonryItem[][] = Array.from({ length: colCount }, () => []);
  const photoCountPerCol = new Array(colCount).fill(0);
  let ctaCounter = 0;

  for (const colIdx of COLUMNS_WITH_INITIAL_CTA) {
    if (colIdx < colCount) {
      cols[colIdx].push({ type: "cta", ctaIndex: ctaCounter++ });
    }
  }

  items.forEach((item, i) => {
    const col = i % colCount;
    cols[col].push(item);

    if (item.type === "photo") {
      photoCountPerCol[col]++;
      const count = photoCountPerCol[col];
      const offset = COLUMN_CTA_OFFSETS[col % COLUMN_CTA_OFFSETS.length];
      const interval = COLUMN_CTA_INTERVALS[col % COLUMN_CTA_INTERVALS.length];

      if (count === offset || (count > offset && (count - offset) % interval === 0)) {
        cols[col].push({ type: "cta", ctaIndex: ctaCounter++ });
      }
    }
  });

  return cols;
}

// ---------------------------------------------------------------------------
// MasonryImage
// ---------------------------------------------------------------------------

function MasonryImage({ photo, index, onClick }: { photo: Photo; index: number; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalHeight > 0) setLoaded(true);
  }, []);

  if (failed) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.2) }}
      className="cursor-pointer mb-4 md:mb-5"
      onClick={onClick}
    >
      <div className="relative overflow-hidden rounded-[16px] bg-neutral-200 dark:bg-neutral-800">
        {!loaded && <div className="absolute inset-0 animate-pulse bg-neutral-300 dark:bg-neutral-700 rounded-[16px]" />}
        <img
          ref={imgRef}
          src={photo.src}
          alt={getCategoryLabel(photo.category)}
          loading={index < 8 ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`w-full block transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>
      <div className="mt-1.5 px-0.5">
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {getCategoryLabel(photo.category)}
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// InlineCTA
// ---------------------------------------------------------------------------

function InlineCTA({ index }: { index: number }) {
  const msg = ctaMessages[index % ctaMessages.length];
  const Icon = msg.icon;
  return (
    <div className="mb-2 md:mb-3">
      <div className="bg-accent/10 rounded-[16px] p-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-accent">
          <Icon className="w-5 h-5 shrink-0" />
          <span className="text-sm font-display font-bold">{msg.headline}</span>
        </div>
        <p className="text-sm text-muted-foreground leading-snug">{msg.body}</p>
        <Link href={msg.href}>
          <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-display font-bold text-sm h-10">
            {msg.cta} <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategorySuggestions
// ---------------------------------------------------------------------------

function CategorySuggestions({ activeParent, onSelect }: { activeParent: string; onSelect: (id: string) => void }) {
  const otherParents = parentCategories.filter((p) => p.id !== activeParent).slice(0, 6);
  if (otherParents.length === 0) return null;

  return (
    <div className="py-5 overflow-hidden">
      <p className="text-lg font-display font-bold text-foreground mb-4">
        Explore more of our work
      </p>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mr-4">
        {otherParents.map((parent) => {
          const parentPhotos = getPhotosForParent(parent.id);
          const preview = parentPhotos[0];
          return (
            <button
              key={parent.id}
              onClick={() => onSelect(parent.id)}
              className="shrink-0 group relative rounded-[16px] overflow-hidden"
              style={{ width: "44vw", maxWidth: "200px", aspectRatio: "3/4" }}
            >
              {preview && (
                <img
                  src={preview.src}
                  alt={parent.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white text-base font-display font-bold text-left leading-tight drop-shadow-lg">
                  {parent.label}
                </p>
                <p className="text-white/50 text-xs mt-1">{parentPhotos.length} photos</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

function Lightbox({ photos: lbPhotos, initialIndex, onClose }: { photos: Photo[]; initialIndex: number; onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDeltaRef = useRef({ x: 0, y: 0 });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const localPhone = useLocalPhone();

  const [thumbRatios, setThumbRatios] = useState<Record<string, number>>({});
  const onThumbLoad = useCallback((src: string, img: HTMLImageElement) => {
    if (img.naturalWidth && img.naturalHeight) {
      setThumbRatios((prev) => prev[src] ? prev : { ...prev, [src]: img.naturalWidth / img.naturalHeight });
    }
  }, []);

  const photo = lbPhotos[currentIndex];
  const prev = useCallback(() => setCurrentIndex((i) => (i === 0 ? lbPhotos.length - 1 : i - 1)), [lbPhotos.length]);
  const next = useCallback(() => setCurrentIndex((i) => (i === lbPhotos.length - 1 ? 0 : i + 1)), [lbPhotos.length]);

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black flex flex-col" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-white/60 hover:text-white p-1"><X className="w-6 h-6" /></button>
          <span className="text-white/40 text-sm font-display">{currentIndex + 1} / {lbPhotos.length}</span>
        </div>
        <span className="text-white/40 text-xs font-display uppercase tracking-wider">{getCategoryLabel(photo.category)}</span>
      </div>
      <div className="flex-1 flex items-center justify-center relative overflow-hidden" onClick={onClose}>
        <button onClick={(e) => { e.stopPropagation(); prev(); }} className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 text-white/30 hover:text-white p-2 rounded-full hover:bg-white/10"><ChevronLeft className="w-7 h-7" /></button>
        <AnimatePresence mode="wait">
          <motion.img key={photo.src} src={photo.src} alt={getCategoryLabel(photo.category)} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1, x: swipeOffset }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="max-h-[78vh] max-w-[94vw] object-contain select-none" onClick={(e) => e.stopPropagation()} draggable={false} />
        </AnimatePresence>
        <button onClick={(e) => { e.stopPropagation(); next(); }} className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 text-white/30 hover:text-white p-2 rounded-full hover:bg-white/10"><ChevronRight className="w-7 h-7" /></button>
      </div>
      <div className="shrink-0 px-4 py-3 flex items-center justify-between gap-3 border-t border-white/10">
        <p className="text-white/60 text-sm truncate flex-1">{getCategoryLabel(photo.category)}</p>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/contact"><Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 font-display font-bold text-xs h-9 px-3"><Calendar className="w-3.5 h-3.5 mr-1.5" />Quote</Button></Link>
          <PhoneLink tel={localPhone.tel}><Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white font-display text-xs h-9 px-3"><Phone className="w-3.5 h-3.5 mr-1.5" />Call</Button></PhoneLink>
        </div>
      </div>
      <div className="hidden md:block shrink-0 border-t border-white/5 px-6 py-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide justify-center max-w-5xl mx-auto items-end">
          {lbPhotos.map((p, i) => { const r = thumbRatios[p.src]; const h = 48; const w = r ? Math.round(h * r) : h; return (
            <button key={p.src} onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }} className={`shrink-0 rounded-md overflow-hidden transition-all ${i === currentIndex ? "ring-2 ring-accent opacity-100" : "opacity-30 hover:opacity-60"}`} style={{ width: w, height: h }}>
              <img src={p.src} alt="" className="w-full h-full object-cover" loading="lazy" onLoad={(e) => onThumbLoad(p.src, e.target as HTMLImageElement)} />
            </button>
          ); })}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// MasonryGrid
// ---------------------------------------------------------------------------

function MasonryGrid({ items, onImageClick }: { items: MasonryItem[]; onImageClick: (globalIndex: number) => void }) {
  const [colCount, setColCount] = useState(2);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setColCount(w >= 1280 ? 4 : w >= 768 ? 3 : 2);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const columns = distributeToColumns(items, colCount);

  return (
    <div className="flex gap-2 md:gap-3">
      {columns.map((col, colIdx) => (
        <div key={colIdx} className="flex-1 min-w-0">
          {col.map((item, idx) => {
            if (item.type === "cta") return <InlineCTA key={`cta-${item.ctaIndex}`} index={item.ctaIndex} />;
            return (
              <MasonryImage
                key={item.photo.src}
                photo={item.photo}
                index={idx}
                onClick={() => onImageClick(item.globalIndex)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Portfolio Page
// ---------------------------------------------------------------------------

export default function Portfolio() {
  const [, setLocation] = useLocation();
  const [matchCategory, params] = useRoute("/portfolio/:category");
  const categoryFromUrl = matchCategory ? params.category : "all";

  // Determine if URL is a parent or sub-category
  const activeParent = parentCategories.find((p) => p.id === categoryFromUrl)?.id
    ?? parentCategories.find((p) => p.children.includes(categoryFromUrl))?.id
    ?? "all";
  const activeSubcategory = parentCategories.some((p) => p.id === categoryFromUrl) ? null : categoryFromUrl;

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const localPhone = useLocalPhone();

  // Get filtered photos
  const filteredPhotos = useMemo(() => {
    if (activeParent === "all") return photos;
    if (activeSubcategory) return photos.filter((p) => p.category === activeSubcategory);
    return getPhotosForParent(activeParent);
  }, [activeParent, activeSubcategory]);

  // Get subcategories for the active parent
  const subcategories = useMemo(() => {
    if (activeParent === "all") return [];
    return getSubcategories(activeParent);
  }, [activeParent]);

  // Parent-level photo counts
  const parentCounts = useMemo(() => {
    const c: Record<string, number> = { all: photos.length };
    for (const p of parentCategories) c[p.id] = getPhotosForParent(p.id).length;
    return c;
  }, []);

  useEffect(() => { setVisibleCount(BATCH_SIZE); }, [activeParent, activeSubcategory]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisibleCount((p) => Math.min(p + BATCH_SIZE, filteredPhotos.length)); }, { rootMargin: "600px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [filteredPhotos.length]);

  const setCategory = useCallback((id: string) => {
    setLocation(id === "all" ? "/portfolio" : `/portfolio/${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setLocation]);

  const visiblePhotos = filteredPhotos.slice(0, visibleCount);
  const splitAt = Math.min(CATEGORY_SUGGEST_AFTER, visiblePhotos.length);

  function buildItems(batch: Photo[], startIdx: number): MasonryItem[] {
    return batch.map((photo, i) => ({ type: "photo" as const, photo, globalIndex: startIdx + i }));
  }

  const firstItems = buildItems(visiblePhotos.slice(0, splitAt), 0);
  const secondBatch = visiblePhotos.slice(splitAt);
  const secondItems = buildItems(secondBatch, splitAt);

  const activeParentLabel = activeParent === "all" ? "Portfolio" : parentCategories.find((p) => p.id === activeParent)?.label ?? "Portfolio";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Main Category Bar */}
      <div className="bg-background border-b border-border">
        {/* Mobile + Tablet */}
        <div className="lg:hidden overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5 px-3 py-2">
            {[{ id: "all", label: "All" }, ...parentCategories].map((cat) => {
              const count = parentCounts[cat.id] ?? 0;
              if (count === 0 && cat.id !== "all") return null;
              const isActive = activeParent === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`shrink-0 px-3.5 py-1.5 text-[14px] font-display font-bold whitespace-nowrap rounded-full transition-colors ${
                    isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
        {/* Desktop */}
        <div className="hidden lg:block px-8 max-w-[1280px] mx-auto py-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1"><Home className="w-3 h-3" /> Home</Link>
              <span>/</span>
              {activeParent !== "all" ? (
                <>
                  <Link href="/portfolio" className="hover:text-foreground transition-colors">Portfolio</Link>
                  <span>/</span>
                  <span className="text-foreground font-medium">{activeParentLabel}</span>
                  {activeSubcategory && (
                    <>
                      <span>/</span>
                      <span className="text-foreground font-medium">{getCategoryLabel(activeSubcategory)}</span>
                    </>
                  )}
                </>
              ) : (
                <span className="text-foreground font-medium">Portfolio</span>
              )}
              <span className="text-muted-foreground/50 ml-1">({filteredPhotos.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/services"><Button variant="outline" size="sm" className="text-xs font-display font-bold h-7">Services</Button></Link>
              <Link href="/contact"><Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-display font-bold h-7">Free Quote <ArrowRight className="ml-1 w-3 h-3" /></Button></Link>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {[{ id: "all", label: "All" }, ...parentCategories].map((cat) => {
              const count = parentCounts[cat.id] ?? 0;
              const isActive = activeParent === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs font-display font-bold tracking-wide whitespace-nowrap transition-all rounded-full flex-shrink-0 ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : count === 0
                        ? "text-muted-foreground/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
                  }`}
                >
                  {cat.label}
                  {count > 0 && !isActive && <span className="ml-1 text-[10px] text-muted-foreground/50">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subcategory pills — shown when a parent with children is active */}
      {subcategories.length > 0 && (
        <div className="bg-background border-b border-border/50">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 px-3 lg:px-8 lg:max-w-[1280px] lg:mx-auto py-2">
              <button
                onClick={() => setCategory(activeParent)}
                className={`shrink-0 px-3 py-1 text-xs font-display font-bold rounded-full transition-colors ${
                  !activeSubcategory
                    ? "bg-sidebar text-sidebar-foreground"
                    : "text-muted-foreground hover:bg-muted border border-border"
                }`}
              >
                All {activeParentLabel}
              </button>
              {subcategories.map((sub) => {
                const isActive = activeSubcategory === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setCategory(sub.id)}
                    className={`shrink-0 px-3 py-1 text-xs font-display font-bold rounded-full transition-colors ${
                      isActive
                        ? "bg-sidebar text-sidebar-foreground"
                        : "text-muted-foreground hover:bg-muted border border-border"
                    }`}
                  >
                    {sub.label}
                    <span className="ml-1 text-[10px] opacity-50">{sub.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      <div className="px-3 md:px-4 lg:px-8 lg:max-w-[1280px] lg:mx-auto pt-2 pb-6">
        {filteredPhotos.length > 0 ? (
          <>
            <MasonryGrid items={firstItems} onImageClick={setLightboxIndex} />

            {secondBatch.length > 0 && (
              <CategorySuggestions activeParent={activeParent} onSelect={setCategory} />
            )}

            {secondItems.length > 0 && (
              <MasonryGrid items={secondItems} onImageClick={setLightboxIndex} />
            )}
          </>
        ) : (
          <div className="text-center py-24">
            <p className="text-lg text-muted-foreground mb-4">No projects in this category yet.</p>
            <Button variant="outline" onClick={() => setCategory("all")} className="font-display font-bold">View All Work</Button>
          </div>
        )}

        {visibleCount < filteredPhotos.length && (
          <div ref={loadMoreRef} className="flex justify-center py-10">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="w-5 h-5 border-2 border-accent/40 border-t-accent rounded-full animate-spin" /> Loading more...
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <section className="bg-accent text-accent-foreground py-10">
        <div className="px-6 max-w-lg mx-auto text-center">
          <h2 className="text-display text-xl sm:text-2xl mb-2">Like What You See?</h2>
          <p className="text-sm opacity-90 mb-5 leading-relaxed">
            Every project started with a conversation. Tell us your vision
            and we&apos;ll bring it to life with the same craftsmanship you see here.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link href="/contact">
              <Button size="lg" variant="outline" className="w-full bg-transparent border-2 border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-sm py-3.5 font-display font-bold">
                Book Free Consultation <Calendar className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <PhoneLink tel={localPhone.tel}>
              <Button size="lg" variant="outline" className="w-full bg-transparent border-2 border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-sm py-3.5 font-display font-bold">
                <Phone className="mr-2 w-4 h-4" /> {localPhone.display}
              </Button>
            </PhoneLink>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
          <Lightbox photos={filteredPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
