import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { Phone, ArrowRight, X } from "lucide-react";
import { useLocalPhone } from "@/lib/useLocalPhone";

const IMG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198";
const LOCAL = "/images/portfolio";

/**
 * Pixieset-inspired masonry portfolio gallery
 * - Hero showcase of ~10 featured photos (full masonry, no filter)
 * - Sticky filter bar with all service categories
 * - Filterable masonry grid below
 */

interface Photo {
  src: string;
  alt: string;
  category: string;
  featured?: boolean;
}

const categories = [
  { id: "all", label: "ALL" },
  { id: "fire-escape", label: "FIRE ESCAPES" },
  { id: "gate", label: "GATES" },
  { id: "interior-railing", label: "INTERIOR RAILINGS" },
  { id: "exterior-railing", label: "EXTERIOR RAILINGS" },
  { id: "deck-railing", label: "DECK RAILINGS" },
  { id: "balcony", label: "BALCONY" },
  { id: "pipe-handrail", label: "PIPE & HANDRAIL" },
  { id: "restoration", label: "RESTORATION" },
  { id: "window", label: "WINDOWS" },
  { id: "before-after", label: "BEFORE & AFTER" },
];

const photos: Photo[] = [
  // Fire Escapes
  { category: "fire-escape", src: `${IMG}/VrmKyMuovdgoFRfz.JPG`, alt: "Multi-story fire escape installation", featured: true },
  { category: "fire-escape", src: `${IMG}/PmBUKqXwdDkeqflj.JPG`, alt: "Fire escape structural repair" },
  { category: "fire-escape", src: `${IMG}/LIIMwNaIvkbuwmQE.JPG`, alt: "Commercial fire escape system", featured: true },
  { category: "fire-escape", src: `${IMG}/YgqFSongHOumLnae.JPG`, alt: "Fire escape with landing platform" },
  { category: "fire-escape", src: `${IMG}/aqPLHeShxXujREPn.JPG`, alt: "Precision fire escape welding" },
  { category: "fire-escape", src: `${IMG}/jypAuoqruUncOLCs.JPG`, alt: "Fire escape platform installation" },
  { category: "fire-escape", src: `${LOCAL}/fire-escape-1.jpg`, alt: "Fire escape ladder and platform system" },
  { category: "fire-escape", src: `${LOCAL}/fire-escape-2.jpg`, alt: "Residential fire escape installation" },
  { category: "fire-escape", src: `${LOCAL}/fire-escape-3.jpg`, alt: "Fire escape stairway fabrication" },

  // Gates
  { category: "gate", src: `${IMG}/ldKpYAFGAsEGkCVX.JPG`, alt: "Ornamental wrought iron gate", featured: true },
  { category: "gate", src: `${IMG}/aoFXjvosIbfREama.JPG`, alt: "Hand-forged estate gate" },
  { category: "gate", src: `${IMG}/AzTrmVJOTgNkaNYM.JPG`, alt: "Custom security gate" },
  { category: "gate", src: `${IMG}/ydWQkwicmrXamlMe.JPG`, alt: "Traditional garden gate" },
  { category: "gate", src: `${IMG}/JjzdorsfDKYfzhbn.JPG`, alt: "Heavy-duty driveway gate", featured: true },
  { category: "gate", src: `${IMG}/eXGgruXrInmeQsTe.JPG`, alt: "Decorative pedestrian gate" },
  { category: "gate", src: `${LOCAL}/gate-1.jpg`, alt: "Custom iron gate fabrication" },
  { category: "gate", src: `${LOCAL}/gate-2.jpg`, alt: "Ornamental garden gate" },
  { category: "gate", src: `${LOCAL}/gate-3.jpg`, alt: "Residential entry gate" },

  // Interior Railings
  { category: "interior-railing", src: `${IMG}/apLcldtAeVXzDTCh.JPG`, alt: "Custom interior staircase railing", featured: true },
  { category: "interior-railing", src: `${IMG}/YrJVPkpgGfMkWRdT.JPG`, alt: "Elegant spiral staircase railing" },
  { category: "interior-railing", src: `${IMG}/qOPbckSMBFnciBif.JPG`, alt: "Modern interior railing", featured: true },
  { category: "interior-railing", src: `${IMG}/jSJklBUsKvwOXBaZ.JPG`, alt: "Residential handrail system" },
  { category: "interior-railing", src: `${LOCAL}/interior-railings-1.jpg`, alt: "Custom staircase railing design" },
  { category: "interior-railing", src: `${LOCAL}/interior-railings-2.jpg`, alt: "Interior iron balustrade" },
  { category: "interior-railing", src: `${LOCAL}/interior-railings-3.jpg`, alt: "Wrought iron staircase handrail" },

  // Exterior Railings
  { category: "exterior-railing", src: `${IMG}/KVrQsNoDvGzMAnwj.JPG`, alt: "Weather-resistant exterior railing" },
  { category: "exterior-railing", src: `${IMG}/BtcNBKAOOIKUZnLV.JPG`, alt: "Powder-coated deck railing", featured: true },
  { category: "exterior-railing", src: `${IMG}/gujHFKlEnadUYTxL.JPG`, alt: "Classic New England porch railing" },
  { category: "exterior-railing", src: `${IMG}/IrppZGXOKBxchPDP.JPG`, alt: "Ornamental balcony railing" },
  { category: "exterior-railing", src: `${LOCAL}/exterior-railing-1.jpg`, alt: "Custom exterior porch railing" },
  { category: "exterior-railing", src: `${LOCAL}/exterior-railing-2.jpg`, alt: "Wrought iron exterior handrail" },
  { category: "exterior-railing", src: `${LOCAL}/exterior-railing-3.jpg`, alt: "Decorative exterior balustrade" },

  // Deck Railings
  { category: "deck-railing", src: `${LOCAL}/deck-railings-1.jpg`, alt: "Custom deck railing system", featured: true },
  { category: "deck-railing", src: `${LOCAL}/deck-railings-2.jpg`, alt: "Iron deck railing installation" },
  { category: "deck-railing", src: `${LOCAL}/deck-railings-3.jpg`, alt: "Residential deck railing" },

  // Balcony
  { category: "balcony", src: `${LOCAL}/balcony-1.jpg`, alt: "Custom balcony railing", featured: true },
  { category: "balcony", src: `${LOCAL}/balcony-2.jpg`, alt: "Ornamental balcony ironwork" },
  { category: "balcony", src: `${LOCAL}/balcony-3.jpg`, alt: "Residential balcony installation" },

  // Pipe & Handrail
  { category: "pipe-handrail", src: `${LOCAL}/pipe-handrail-1.jpg`, alt: "Pipe handrail installation", featured: true },
  { category: "pipe-handrail", src: `${LOCAL}/pipe-handrail-2.jpg`, alt: "Commercial pipe railing system" },
  { category: "pipe-handrail", src: `${LOCAL}/pipe-handrail-3.jpg`, alt: "ADA-compliant pipe handrail" },

  // Restoration
  { category: "restoration", src: `${IMG}/buMcGDTPsdJzspea.jpg`, alt: "Historic ironwork restoration detail", featured: true },
  { category: "restoration", src: `${IMG}/ZtrYnxwJFDZSmXOw.jpg`, alt: "Ornamental iron restoration" },
  { category: "restoration", src: `${IMG}/wFpGlEabFZwcJrgX.jpg`, alt: "Boston building restoration" },
  { category: "restoration", src: `${IMG}/XBlMdPEjsPJdjLFa.jpg`, alt: "Historic gate restoration" },
  { category: "restoration", src: `${IMG}/NgBghqHCKpNCJSJs.jpg`, alt: "Landmark architectural ironwork", featured: true },
  { category: "restoration", src: `${IMG}/rsujTYOxZArFMYMR.jpg`, alt: "Victorian period ironwork" },
  { category: "restoration", src: `${IMG}/dgqYFGcJuAYrvKtp.jpg`, alt: "Historic railing replication" },
  { category: "restoration", src: `${IMG}/DPcQhceaLWuEDbpK.jpg`, alt: "South End brownstone restoration" },
  { category: "restoration", src: `${IMG}/SYTGvQjSziYdBQab.jpg`, alt: "Beacon Hill historic district" },
  { category: "restoration", src: `${IMG}/GeAuXhLZDbFMhTPk.jpg`, alt: "Heritage building craftsmanship" },
  { category: "restoration", src: `${IMG}/egdmCLWLFeuifEJv.jpg`, alt: "Custom restoration of unavailable designs" },
  { category: "restoration", src: `${LOCAL}/restoration-1.jpg`, alt: "Historic ironwork restoration project" },

  // Windows
  { category: "window", src: `${LOCAL}/window-1.jpg`, alt: "Custom iron window guard" },
  { category: "window", src: `${LOCAL}/window-2.jpg`, alt: "Decorative window security grille" },
  { category: "window", src: `${LOCAL}/window-3.jpg`, alt: "Iron window frame installation" },

  // Before & After
  { category: "before-after", src: `${LOCAL}/before-after-1.jpg`, alt: "Ironwork restoration before and after" },
  { category: "before-after", src: `${LOCAL}/before-after-2.jpg`, alt: "Railing repair transformation" },
  { category: "before-after", src: `${LOCAL}/before-after-3.jpg`, alt: "Complete ironwork renovation" },
];

const featuredPhotos = photos.filter((p) => p.featured);

export default function Portfolio() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [filterSticky, setFilterSticky] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const localPhone = useLocalPhone();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setFilterSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    if (filterRef.current) observer.observe(filterRef.current);
    return () => observer.disconnect();
  }, []);

  // Close lightbox on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const filteredPhotos =
    activeCategory === "all"
      ? photos
      : photos.filter((p) => p.category === activeCategory);

  // Only show categories that have photos
  const activeCategories = categories.filter(
    (c) => c.id === "all" || photos.some((p) => p.category === c.id)
  );

  return (
    <div className="min-h-screen bg-black">
      {/* Minimal Hero */}
      <section className="relative flex items-end pb-12 pt-32 lg:pt-24 px-6 lg:px-12">
        <div>
          <h1 className="text-display text-5xl md:text-7xl text-white mb-3">
            OUR WORK
          </h1>
          <p className="text-lg text-white/60 max-w-xl">
            20+ years of craftsmanship. Over 500 projects across the Northeast and Florida.
          </p>
        </div>
      </section>

      {/* Featured Showcase — Masonry, no filter */}
      <section className="px-3 lg:px-6 pb-4">
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
          {featuredPhotos.map((photo, i) => (
            <div
              key={`feat-${i}`}
              className="break-inside-avoid mb-3 cursor-pointer group"
              onClick={() => setLightbox(photo.src)}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading="eager"
                className="w-full rounded-sm group-hover:brightness-110 transition-all duration-300"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Filter Anchor (for intersection observer) */}
      <div ref={filterRef} />

      {/* Sticky Filter Bar */}
      <div
        className={`${
          filterSticky
            ? "fixed top-16 lg:top-0 lg:left-20 right-0 z-40 shadow-2xl"
            : ""
        } bg-zinc-900 border-b border-white/10 py-4 transition-all`}
      >
        <div className="px-3 lg:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {activeCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-5 py-2 text-xs font-display font-bold tracking-wider whitespace-nowrap transition-all rounded-sm ${
                  activeCategory === cat.id
                    ? "bg-white text-black"
                    : "bg-transparent text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtered Masonry Grid */}
      <section className="px-3 lg:px-6 py-8">
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
          {filteredPhotos.map((photo, i) => (
            <div
              key={`${activeCategory}-${i}`}
              className="break-inside-avoid mb-3 cursor-pointer group relative"
              onClick={() => setLightbox(photo.src)}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                className="w-full rounded-sm group-hover:brightness-110 transition-all duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 rounded-sm">
                <p className="text-white text-sm font-medium">{photo.alt}</p>
              </div>
            </div>
          ))}
        </div>

        {filteredPhotos.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl text-white/40">
              No projects in this category yet.
            </p>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-accent text-accent-foreground py-24">
        <div className="container text-center">
          <h2 className="text-display text-4xl md:text-5xl mb-6">
            READY TO START YOUR PROJECT?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            From fire escapes to custom ornamental ironwork, we bring 20+ years
            of expertise to every project.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-lg px-8 py-6 thick-border"
              >
                GET FREE QUOTE
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </a>
            <a href={`tel:${localPhone.tel}`}>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-lg px-8 py-6 thick-border"
              >
                <Phone className="mr-2 w-5 h-5" />
                {localPhone.display}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white z-50"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightbox}
            alt="Portfolio photo"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
