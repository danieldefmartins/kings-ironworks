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

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const IMG = "/images";
const LOCAL = "/images/portfolio";

interface Photo { src: string; alt: string; category: string; }

const categories = [
  { id: "all", label: "All" },
  { id: "staircase", label: "Staircases" },
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

const NEW = "/images/New%20Portfolio/staircase";

const photos: Photo[] = [
  // Staircases — curated from 605 photos
  { category: "staircase", src: `${NEW}/15414fcf-625a-4e55-860a-ab1fefbb89e6.jpg`, alt: "Where artistry meets architecture \u2014 a spiral masterpiece viewed from above" },
  { category: "staircase", src: `${NEW}/9DC80090-2970-42FC-AAA9-73CF9F5CD276.jpg`, alt: "Hand-forged scrollwork that turns a staircase into a masterpiece" },
  { category: "staircase", src: `${NEW}/85f3d185-6628-421c-916c-b94e6affc98f.jpg`, alt: "Two stories of hand-forged artistry winding through a luxury foyer" },
  { category: "staircase", src: `${NEW}/c8112adf-ebb3-46e7-af71-19ed1d2f8c68.jpg`, alt: "The grand entrance redefined \u2014 iron, marble, and crystal in harmony" },
  { category: "staircase", src: `${NEW}/IMG_6934.JPEG`, alt: "Every scroll tells a story \u2014 over 1,000 hours of hand-forged ironwork" },
  { category: "staircase", src: `${NEW}/IMG_6953.JPEG`, alt: "Where old-world artistry meets new-world luxury" },
  { category: "staircase", src: `${NEW}/IMG_7895.JPEG`, alt: "A grand curved staircase that commands the room from the moment you walk in" },
  { category: "staircase", src: `${NEW}/IMG_8609.JPG`, alt: "Every curve tells a story \u2014 forged copper leaves and flowing iron in perfect harmony" },
  { category: "staircase", src: `${NEW}/IMG_8750.JPG`, alt: "The details that stop you mid-step \u2014 hand-forged artistry you can feel" },
  { category: "staircase", src: `${NEW}/IMG_8615.JPG`, alt: "Where old-world craftsmanship meets new-world luxury \u2014 our signature curved railing" },
  { category: "staircase", src: `${NEW}/FullSizeRender-5.jpg`, alt: "A sculptural spiral that commands every room it enters" },
  { category: "staircase", src: `${NEW}/FullSizeRender-6.jpg`, alt: "Raw steel, refined design \u2014 an industrial spiral that owns the room" },
  { category: "staircase", src: `${NEW}/FullSizeRender.jpg`, alt: "When steel curves like silk \u2014 our signature curved railing" },
  { category: "staircase", src: `${NEW}/IMG_3906.JPEG`, alt: "Where engineering meets elegance \u2014 a mono-stringer floating staircase wrapped in glass" },
  { category: "staircase", src: `${NEW}/IMG_3907.JPEG`, alt: "Looking down through glass \u2014 an open staircase that connects every level" },
  { category: "staircase", src: `${NEW}/IMG_3276.JPEG`, alt: "Every step glows \u2014 LED-lit floating treads that redefine what a staircase can be" },
  { category: "staircase", src: `${NEW}/IMG_7991.JPEG`, alt: "Floating treads meet LED lighting \u2014 modern luxury that glows from within" },
  { category: "staircase", src: `${NEW}/IMG_7963.JPEG`, alt: "A bird's-eye view of floating treads bathed in light \u2014 architecture as art" },
  { category: "staircase", src: `${NEW}/IMG_4789.JPEG`, alt: "Bold steel, warm oak \u2014 a switchback staircase that commands the room" },
  { category: "staircase", src: `${NEW}/IMG_4842.JPEG`, alt: "Architectural drama from basement to sky \u2014 a three-story statement piece" },
  { category: "staircase", src: `${NEW}/IMG_4934.JPEG`, alt: "Stainless steel and glass turn sunlight into sculpture" },
  { category: "staircase", src: `${NEW}/IMG_4726.JPG`, alt: "Gold-tone steel and glass \u2014 luxury detailing that elevates every entrance" },
  { category: "staircase", src: `${NEW}/IMG_5329.JPEG`, alt: "Clean lines, bold contrast \u2014 the modern staircase that anchors a luxury home" },
  { category: "staircase", src: `${NEW}/IMG_6519.JPEG`, alt: "Three stories of floating perfection \u2014 oak treads, steel spine, glass railings" },
  { category: "staircase", src: `${NEW}/IMG_9430.JPEG`, alt: "Modern farmhouse meets industrial steel \u2014 floating treads on a shiplap backdrop" },
  { category: "staircase", src: `${NEW}/IMG_9449.JPEG`, alt: "Thick-cut oak floating on a single steel spine \u2014 the staircase that anchors the room" },
  { category: "staircase", src: `${NEW}/IMG_0863.JPEG`, alt: "Designed to float, built to last \u2014 modern craftsmanship at its finest" },
  { category: "staircase", src: `${NEW}/IMG_0577.JPEG`, alt: "Clean lines, open living \u2014 a staircase built for the modern home" },
  { category: "staircase", src: `${NEW}/142ec8ae-fff5-44e3-9b6f-2b2121b099d6.jpg`, alt: "Three flights of floating precision \u2014 steel and wood in perfect balance" },
  { category: "staircase", src: `${NEW}/592e2faf-48d6-44e5-8b91-03d4457231f4.jpg`, alt: "Glass, steel, and light wood \u2014 a staircase that disappears into the architecture" },
  { category: "staircase", src: `${NEW}/IMG_2633.JPEG`, alt: "Where glass meets steel \u2014 a floating staircase bathed in natural light" },
  { category: "staircase", src: `${NEW}/IMG_0777.jpg`, alt: "Reclaimed timber, forged steel \u2014 where rustic warmth meets modern craft" },
  { category: "staircase", src: `${NEW}/IMG_2103.JPG`, alt: "Step into the glow \u2014 LED-lit floating treads for dramatic nighttime impact" },
  { category: "staircase", src: `${NEW}/IMG_2559.JPEG`, alt: "The zigzag stringer \u2014 structural art hiding in plain sight" },
  { category: "staircase", src: `${NEW}/IMG_8334.JPEG`, alt: "A grand entrance deserves grand ironwork \u2014 sweeping scrolls and gold accents" },
  { category: "staircase", src: `${NEW}/IMG_8352.JPEG`, alt: "When the railing is the centerpiece \u2014 ornate ironwork commanding a double-height foyer" },
  { category: "staircase", src: `${NEW}/IMG_8247.JPEG`, alt: "Floating treads meet horizontal iron \u2014 contemporary railing that lets light pour through" },
  { category: "staircase", src: `${NEW}/IMG_5273.JPEG`, alt: "Where it all begins \u2014 sparks fly as our craftsmen shape raw steel into art" },
  { category: "staircase", src: `${NEW}/IMG_4146.JPEG`, alt: "Crafted by hand in our shop \u2014 a curved stringer ready for its new home" },
  { category: "staircase", src: `${NEW}/IMG_8464.JPEG`, alt: "Born in the shop, built for a lifetime \u2014 every staircase starts with raw steel" },
  // Structural Steel
  { category: "structural-steel", src: `${LOCAL}/structural-steel/structural-steel-1.jpg`, alt: "Structural steel fabrication" },
  { category: "structural-steel", src: `${LOCAL}/structural-steel/structural-steel-2.jpg`, alt: "Commercial structural steel installation" },
  { category: "structural-steel", src: `${LOCAL}/structural-steel/structural-steel-3.jpg`, alt: "Steel beam construction" },
  { category: "cable-railing", src: `${LOCAL}/cable-railing/cable-railing-1.jpg`, alt: "Custom cable railing system" },
  { category: "cable-railing", src: `${LOCAL}/cable-railing/cable-railing-2.jpg`, alt: "Cable railing installation" },
  { category: "fire-escape", src: `${IMG}/VrmKyMuovdgoFRfz.JPG`, alt: "Multi-story fire escape installation" },
  { category: "fire-escape", src: `${IMG}/PmBUKqXwdDkeqflj.JPG`, alt: "Fire escape structural repair" },
  { category: "fire-escape", src: `${IMG}/LIIMwNaIvkbuwmQE.JPG`, alt: "Commercial fire escape system" },
  { category: "fire-escape", src: `${IMG}/YgqFSongHOumLnae.JPG`, alt: "Fire escape with landing platform" },
  { category: "fire-escape", src: `${IMG}/aqPLHeShxXujREPn.JPG`, alt: "Precision fire escape welding" },
  { category: "fire-escape", src: `${IMG}/jypAuoqruUncOLCs.JPG`, alt: "Fire escape platform installation" },
  { category: "fire-escape", src: `${LOCAL}/fire-escape/fire-escape-1.jpg`, alt: "Fire escape ladder and platform system" },
  { category: "fire-escape", src: `${LOCAL}/fire-escape/fire-escape-2.jpg`, alt: "Residential fire escape installation" },
  { category: "fire-escape", src: `${LOCAL}/fire-escape/fire-escape-3.jpg`, alt: "Fire escape stairway fabrication" },
  { category: "gate", src: `${IMG}/ldKpYAFGAsEGkCVX.JPG`, alt: "Ornamental wrought iron gate" },
  { category: "gate", src: `${IMG}/aoFXjvosIbfREama.JPG`, alt: "Hand-forged estate gate" },
  { category: "gate", src: `${IMG}/AzTrmVJOTgNkaNYM.JPG`, alt: "Custom security gate" },
  { category: "gate", src: `${IMG}/ydWQkwicmrXamlMe.JPG`, alt: "Traditional garden gate" },
  { category: "gate", src: `${IMG}/JjzdorsfDKYfzhbn.JPG`, alt: "Heavy-duty driveway gate" },
  { category: "gate", src: `${IMG}/eXGgruXrInmeQsTe.JPG`, alt: "Decorative pedestrian gate" },
  { category: "gate", src: `${LOCAL}/gate/gate-1.jpg`, alt: "Custom iron gate fabrication" },
  { category: "gate", src: `${LOCAL}/gate/gate-2.jpg`, alt: "Ornamental garden gate" },
  { category: "gate", src: `${LOCAL}/gate/gate-3.jpg`, alt: "Residential entry gate" },
  { category: "interior-railing", src: `${IMG}/apLcldtAeVXzDTCh.JPG`, alt: "Custom interior staircase railing" },
  { category: "interior-railing", src: `${IMG}/YrJVPkpgGfMkWRdT.JPG`, alt: "Elegant spiral staircase railing" },
  { category: "interior-railing", src: `${IMG}/qOPbckSMBFnciBif.JPG`, alt: "Modern interior railing" },
  { category: "interior-railing", src: `${IMG}/jSJklBUsKvwOXBaZ.JPG`, alt: "Residential handrail system" },
  { category: "interior-railing", src: `${LOCAL}/interior-railing/interior-railings-1.jpg`, alt: "Custom staircase railing design" },
  { category: "interior-railing", src: `${LOCAL}/interior-railing/interior-railings-2.jpg`, alt: "Interior iron balustrade" },
  { category: "interior-railing", src: `${LOCAL}/interior-railing/interior-railings-3.jpg`, alt: "Wrought iron staircase handrail" },
  { category: "exterior-railing", src: `${IMG}/KVrQsNoDvGzMAnwj.JPG`, alt: "Weather-resistant exterior railing" },
  { category: "exterior-railing", src: `${IMG}/BtcNBKAOOIKUZnLV.JPG`, alt: "Powder-coated deck railing" },
  { category: "exterior-railing", src: `${IMG}/gujHFKlEnadUYTxL.JPG`, alt: "Classic New England porch railing" },
  { category: "exterior-railing", src: `${IMG}/IrppZGXOKBxchPDP.JPG`, alt: "Ornamental balcony railing" },
  { category: "exterior-railing", src: `${LOCAL}/exterior-railing/exterior-railing-1.jpg`, alt: "Custom exterior porch railing" },
  { category: "exterior-railing", src: `${LOCAL}/exterior-railing/exterior-railing-2.jpg`, alt: "Wrought iron exterior handrail" },
  { category: "exterior-railing", src: `${LOCAL}/exterior-railing/exterior-railing-3.jpg`, alt: "Decorative exterior balustrade" },
  { category: "deck-railing", src: `${LOCAL}/deck-railing/deck-railings-1.jpg`, alt: "Custom deck railing system" },
  { category: "deck-railing", src: `${LOCAL}/deck-railing/deck-railings-2.jpg`, alt: "Iron deck railing installation" },
  { category: "deck-railing", src: `${LOCAL}/deck-railing/deck-railings-3.jpg`, alt: "Residential deck railing" },
  { category: "balcony", src: `${LOCAL}/balcony/balcony-1.jpg`, alt: "Custom balcony railing" },
  { category: "balcony", src: `${LOCAL}/balcony/balcony-2.jpg`, alt: "Ornamental balcony ironwork" },
  { category: "balcony", src: `${LOCAL}/balcony/balcony-3.jpg`, alt: "Residential balcony installation" },
  { category: "handrail", src: `${LOCAL}/handrail/pipe-handrail-1.jpg`, alt: "Pipe handrail installation" },
  { category: "handrail", src: `${LOCAL}/handrail/pipe-handrail-2.jpg`, alt: "Commercial pipe railing system" },
  { category: "handrail", src: `${LOCAL}/handrail/pipe-handrail-3.jpg`, alt: "ADA-compliant pipe handrail" },
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
  { category: "window-well", src: `${LOCAL}/window-well/window-well-1.jpg`, alt: "Custom window well cover" },
  { category: "window-well", src: `${LOCAL}/window-well/window-well-2.jpg`, alt: "Iron window well grate" },
  { category: "window-well", src: `${LOCAL}/window-well/window-well-3.jpg`, alt: "Window well guard installation" },
  { category: "window-well", src: `${LOCAL}/window-well/window-well-4.jpg`, alt: "Decorative window well cover" },
  { category: "window", src: `${LOCAL}/window/window-1.jpg`, alt: "Custom iron window guard" },
  { category: "window", src: `${LOCAL}/window/window-2.jpg`, alt: "Decorative window security grille" },
  { category: "window", src: `${LOCAL}/window/window-3.jpg`, alt: "Iron window frame installation" },
  { category: "before-after", src: `${LOCAL}/before-after/before-after-1.jpg`, alt: "Ironwork restoration before and after" },
  { category: "before-after", src: `${LOCAL}/before-after/before-after-2.jpg`, alt: "Railing repair transformation" },
  { category: "before-after", src: `${LOCAL}/before-after/before-after-3.jpg`, alt: "Complete ironwork renovation" },
];

// ---------------------------------------------------------------------------
// CTA + constants
// ---------------------------------------------------------------------------

const ctaMessages = [
  { headline: "Love what you see?", body: "Every piece is custom-built to your exact vision.", cta: "Free Consultation", href: "/contact", icon: Calendar },
  { headline: "Picture this at your home?", body: "20+ years of craftsmanship. Yours could be next.", cta: "Get a Free Quote", href: "/contact", icon: ArrowRight },
  { headline: "Ready to start?", body: "From conversation to masterpiece \u2014 we make it easy.", cta: "Book Appointment", href: "/contact", icon: Sparkles },
];

const BATCH_SIZE = 24;
const CATEGORY_SUGGEST_AFTER = 18;

function getCategoryLabel(id: string) {
  return categories.find((c) => c.id === id)?.label ?? id;
}

// ---------------------------------------------------------------------------
// Distribute items into columns (Pinterest shortest-column-first)
// ---------------------------------------------------------------------------

type MasonryItem = { type: "photo"; photo: Photo; globalIndex: number } | { type: "cta"; ctaIndex: number };

// Staggered CTA insertion intervals per column — different for each column
// so images never align side by side
// Column indices that get a CTA prepended before any photos (breaks first-row alignment)
const COLUMNS_WITH_INITIAL_CTA = [1]; // col B starts offset
const COLUMN_CTA_OFFSETS = [3, 6, 4, 7]; // first CTA after N photos
const COLUMN_CTA_INTERVALS = [5, 7, 6, 8]; // then every N photos after that

function distributeToColumns(items: MasonryItem[], colCount: number): MasonryItem[][] {
  const cols: MasonryItem[][] = Array.from({ length: colCount }, () => []);
  const photoCountPerCol = new Array(colCount).fill(0);
  let ctaCounter = 0;

  // Prepend a CTA to specific columns so the very first row is already offset
  for (const colIdx of COLUMNS_WITH_INITIAL_CTA) {
    if (colIdx < colCount) {
      cols[colIdx].push({ type: "cta", ctaIndex: ctaCounter++ });
    }
  }

  // Round-robin distribute photos into columns
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
          alt={photo.alt}
          loading={index < 8 ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`w-full block transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>
      <div className="mt-1.5 px-0.5">
        <p className="text-[13px] font-display font-bold text-foreground leading-snug line-clamp-2">
          {photo.alt}
        </p>
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

function CategorySuggestions({ activeCategory, onSelect }: { activeCategory: string; onSelect: (id: string) => void }) {
  const otherCategories = categories.filter(
    (c) => c.id !== "all" && c.id !== activeCategory && photos.some((p) => p.category === c.id),
  ).slice(0, 6);

  if (otherCategories.length === 0) return null;

  return (
    <div className="py-5 overflow-hidden">
      <p className="text-lg font-display font-bold text-foreground mb-4">
        Explore more of our work
      </p>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mr-4">
        {otherCategories.map((cat) => {
          const preview = photos.find((p) => p.category === cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className="shrink-0 group relative rounded-[16px] overflow-hidden"
              style={{ width: "44vw", maxWidth: "200px", aspectRatio: "3/4" }}
            >
              {preview && (
                <img
                  src={preview.src}
                  alt={cat.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white text-base font-display font-bold text-left leading-tight drop-shadow-lg">
                  {cat.label}
                </p>
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
          <motion.img key={photo.src} src={photo.src} alt={photo.alt} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1, x: swipeOffset }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="max-h-[78vh] max-w-[94vw] object-contain select-none" onClick={(e) => e.stopPropagation()} draggable={false} />
        </AnimatePresence>
        <button onClick={(e) => { e.stopPropagation(); next(); }} className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 text-white/30 hover:text-white p-2 rounded-full hover:bg-white/10"><ChevronRight className="w-7 h-7" /></button>
      </div>
      <div className="shrink-0 px-4 py-3 flex items-center justify-between gap-3 border-t border-white/10">
        <p className="text-white/60 text-sm truncate flex-1">{photo.alt}</p>
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
// MasonryGrid — true Pinterest layout with alternating columns
// ---------------------------------------------------------------------------

function MasonryGrid({ items, onImageClick }: { items: MasonryItem[]; onImageClick: (globalIndex: number) => void }) {
  // Use 2 cols on mobile, 3 on md, 4 on xl
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
  const activeCategory = categories.find((c) => c.id === categoryFromUrl)?.id ?? "all";

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const localPhone = useLocalPhone();

  const filteredPhotos = useMemo(
    () => activeCategory === "all" ? photos : photos.filter((p) => p.category === activeCategory),
    [activeCategory],
  );

  const photoCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const cat of categories) c[cat.id] = cat.id === "all" ? photos.length : photos.filter((p) => p.category === cat.id).length;
    return c;
  }, []);

  useEffect(() => { setVisibleCount(BATCH_SIZE); }, [activeCategory]);

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

  // Build items with CTAs interleaved
  const visiblePhotos = filteredPhotos.slice(0, visibleCount);
  const splitAt = Math.min(CATEGORY_SUGGEST_AFTER, visiblePhotos.length);

  function buildItems(batch: Photo[], startIdx: number): MasonryItem[] {
    return batch.map((photo, i) => ({ type: "photo" as const, photo, globalIndex: startIdx + i }));
  }

  const firstItems = buildItems(visiblePhotos.slice(0, splitAt), 0);
  const secondBatch = visiblePhotos.slice(splitAt);
  const secondItems = buildItems(secondBatch, splitAt);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ── Category Tabs ── no extra spacing, sits right under nav */}
      <div className="bg-background border-b border-border">
        {/* Mobile + Tablet */}
        <div className="lg:hidden overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5 px-3 py-2">
            {categories.map((cat) => {
              const count = photoCounts[cat.id];
              if (count === 0) return null;
              const isActive = activeCategory === cat.id;
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
              {activeCategory !== "all" ? (<><Link href="/portfolio" className="hover:text-foreground transition-colors">Portfolio</Link><span>/</span><span className="text-foreground font-medium">{getCategoryLabel(activeCategory)}</span></>) : (<span className="text-foreground font-medium">Portfolio</span>)}
              <span className="text-muted-foreground/50 ml-1">({filteredPhotos.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/services"><Button variant="outline" size="sm" className="text-xs font-display font-bold h-7">Services</Button></Link>
              <Link href="/contact"><Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-display font-bold h-7">Free Quote <ArrowRight className="ml-1 w-3 h-3" /></Button></Link>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => { const count = photoCounts[cat.id]; const isActive = activeCategory === cat.id; return (
              <button key={cat.id} onClick={() => setCategory(cat.id)} className={`px-3 py-1.5 text-xs font-display font-bold tracking-wide whitespace-nowrap transition-all rounded-full flex-shrink-0 ${isActive ? "bg-accent text-accent-foreground" : count === 0 ? "text-muted-foreground/30" : "text-muted-foreground hover:text-foreground hover:bg-muted border border-border"}`}>
                {cat.label}{count > 0 && !isActive && <span className="ml-1 text-[10px] text-muted-foreground/50">{count}</span>}
              </button>
            ); })}
          </div>
        </div>
      </div>

      {/* ── Photo Grid ── */}
      <div className="px-3 md:px-4 lg:px-8 lg:max-w-[1280px] lg:mx-auto pt-2 pb-6">
        {filteredPhotos.length > 0 ? (
          <>
            <MasonryGrid items={firstItems} onImageClick={setLightboxIndex} />

            {secondBatch.length > 0 && (
              <CategorySuggestions activeCategory={activeCategory} onSelect={setCategory} />
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

      {/* ── Bottom CTA ── */}
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
