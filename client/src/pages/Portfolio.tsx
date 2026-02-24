import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Phone, ArrowRight, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocalPhone } from "@/lib/useLocalPhone";

const IMG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198";
const LOCAL = "/images/portfolio";

interface Photo {
  src: string;
  alt: string;
  category: string;
}

const categories = [
  { id: "all", label: "ALL" },
  { id: "cable-railing", label: "CABLE RAILINGS" },
  { id: "structural-steel", label: "STRUCTURAL STEEL" },
  { id: "gate", label: "GATES" },
  { id: "window-well", label: "WINDOW WELL" },
  { id: "window", label: "WINDOWS" },
  { id: "balcony", label: "BALCONY" },
  { id: "interior-railing", label: "INTERIOR RAILINGS" },
  { id: "fire-escape", label: "FIRE ESCAPES" },
  { id: "deck-railing", label: "DECK RAILINGS" },
  { id: "before-after", label: "BEFORE & AFTER" },
  { id: "handrail", label: "HANDRAIL" },
  { id: "exterior-railing", label: "EXTERIOR RAILINGS" },
  { id: "restoration", label: "RESTORATION" },
];

const photos: Photo[] = [
  // Fire Escapes
  { category: "fire-escape", src: `${IMG}/VrmKyMuovdgoFRfz.JPG`, alt: "Multi-story fire escape installation" },
  { category: "fire-escape", src: `${IMG}/PmBUKqXwdDkeqflj.JPG`, alt: "Fire escape structural repair" },
  { category: "fire-escape", src: `${IMG}/LIIMwNaIvkbuwmQE.JPG`, alt: "Commercial fire escape system" },
  { category: "fire-escape", src: `${IMG}/YgqFSongHOumLnae.JPG`, alt: "Fire escape with landing platform" },
  { category: "fire-escape", src: `${IMG}/aqPLHeShxXujREPn.JPG`, alt: "Precision fire escape welding" },
  { category: "fire-escape", src: `${IMG}/jypAuoqruUncOLCs.JPG`, alt: "Fire escape platform installation" },
  { category: "fire-escape", src: `${LOCAL}/fire-escape-1.jpg`, alt: "Fire escape ladder and platform system" },
  { category: "fire-escape", src: `${LOCAL}/fire-escape-2.jpg`, alt: "Residential fire escape installation" },
  { category: "fire-escape", src: `${LOCAL}/fire-escape-3.jpg`, alt: "Fire escape stairway fabrication" },

  // Gates
  { category: "gate", src: `${IMG}/ldKpYAFGAsEGkCVX.JPG`, alt: "Ornamental wrought iron gate" },
  { category: "gate", src: `${IMG}/aoFXjvosIbfREama.JPG`, alt: "Hand-forged estate gate" },
  { category: "gate", src: `${IMG}/AzTrmVJOTgNkaNYM.JPG`, alt: "Custom security gate" },
  { category: "gate", src: `${IMG}/ydWQkwicmrXamlMe.JPG`, alt: "Traditional garden gate" },
  { category: "gate", src: `${IMG}/JjzdorsfDKYfzhbn.JPG`, alt: "Heavy-duty driveway gate" },
  { category: "gate", src: `${IMG}/eXGgruXrInmeQsTe.JPG`, alt: "Decorative pedestrian gate" },
  { category: "gate", src: `${LOCAL}/gate-1.jpg`, alt: "Custom iron gate fabrication" },
  { category: "gate", src: `${LOCAL}/gate-2.jpg`, alt: "Ornamental garden gate" },
  { category: "gate", src: `${LOCAL}/gate-3.jpg`, alt: "Residential entry gate" },

  // Interior Railings
  { category: "interior-railing", src: `${IMG}/apLcldtAeVXzDTCh.JPG`, alt: "Custom interior staircase railing" },
  { category: "interior-railing", src: `${IMG}/YrJVPkpgGfMkWRdT.JPG`, alt: "Elegant spiral staircase railing" },
  { category: "interior-railing", src: `${IMG}/qOPbckSMBFnciBif.JPG`, alt: "Modern interior railing" },
  { category: "interior-railing", src: `${IMG}/jSJklBUsKvwOXBaZ.JPG`, alt: "Residential handrail system" },
  { category: "interior-railing", src: `${LOCAL}/interior-railings-1.jpg`, alt: "Custom staircase railing design" },
  { category: "interior-railing", src: `${LOCAL}/interior-railings-2.jpg`, alt: "Interior iron balustrade" },
  { category: "interior-railing", src: `${LOCAL}/interior-railings-3.jpg`, alt: "Wrought iron staircase handrail" },

  // Exterior Railings
  { category: "exterior-railing", src: `${IMG}/KVrQsNoDvGzMAnwj.JPG`, alt: "Weather-resistant exterior railing" },
  { category: "exterior-railing", src: `${IMG}/BtcNBKAOOIKUZnLV.JPG`, alt: "Powder-coated deck railing" },
  { category: "exterior-railing", src: `${IMG}/gujHFKlEnadUYTxL.JPG`, alt: "Classic New England porch railing" },
  { category: "exterior-railing", src: `${IMG}/IrppZGXOKBxchPDP.JPG`, alt: "Ornamental balcony railing" },
  { category: "exterior-railing", src: `${LOCAL}/exterior-railing-1.jpg`, alt: "Custom exterior porch railing" },
  { category: "exterior-railing", src: `${LOCAL}/exterior-railing-2.jpg`, alt: "Wrought iron exterior handrail" },
  { category: "exterior-railing", src: `${LOCAL}/exterior-railing-3.jpg`, alt: "Decorative exterior balustrade" },

  // Deck Railings
  { category: "deck-railing", src: `${LOCAL}/deck-railings-1.jpg`, alt: "Custom deck railing system" },
  { category: "deck-railing", src: `${LOCAL}/deck-railings-2.jpg`, alt: "Iron deck railing installation" },
  { category: "deck-railing", src: `${LOCAL}/deck-railings-3.jpg`, alt: "Residential deck railing" },

  // Balcony
  { category: "balcony", src: `${LOCAL}/balcony-1.jpg`, alt: "Custom balcony railing" },
  { category: "balcony", src: `${LOCAL}/balcony-2.jpg`, alt: "Ornamental balcony ironwork" },
  { category: "balcony", src: `${LOCAL}/balcony-3.jpg`, alt: "Residential balcony installation" },

  // Pipe & Handrail
  { category: "handrail", src: `${LOCAL}/pipe-handrail-1.jpg`, alt: "Pipe handrail installation" },
  { category: "handrail", src: `${LOCAL}/pipe-handrail-2.jpg`, alt: "Commercial pipe railing system" },
  { category: "handrail", src: `${LOCAL}/pipe-handrail-3.jpg`, alt: "ADA-compliant pipe handrail" },

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

export default function Portfolio() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const localPhone = useLocalPhone();

  const filteredPhotos =
    activeCategory === "all"
      ? photos
      : photos.filter((p) => p.category === activeCategory);

  // Count photos per category for badge display
  const photoCounts = categories.reduce((acc, c) => {
    acc[c.id] = c.id === "all" ? photos.length : photos.filter((p) => p.category === c.id).length;
    return acc;
  }, {} as Record<string, number>);

  // Lightbox navigation
  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevPhoto = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex === 0 ? filteredPhotos.length - 1 : lightboxIndex - 1);
    }
  };
  const nextPhoto = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex === filteredPhotos.length - 1 ? 0 : lightboxIndex + 1);
    }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevPhoto();
      if (e.key === "ArrowRight") nextPhoto();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  // Scroll to top when category changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeCategory]);

  return (
    <div className="min-h-screen bg-black">
      {/* Fixed Filter Bar */}
      <div className="fixed top-16 lg:top-0 left-0 lg:left-20 right-0 z-40 bg-black/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-4 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 text-[11px] font-bold tracking-wider whitespace-nowrap transition-all rounded-full flex-shrink-0 ${
                  activeCategory === cat.id
                    ? "bg-accent text-accent-foreground"
                    : photoCounts[cat.id] === 0
                      ? "bg-transparent text-white/30 border border-white/10"
                      : "bg-transparent text-white/60 hover:text-white hover:bg-white/10 border border-white/20"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Full-width Vertical Photo Stream */}
      <div className="pt-28 lg:pt-16">
        {filteredPhotos.map((photo, i) => (
          <div
            key={`${activeCategory}-${i}`}
            className="w-full cursor-pointer group"
            onClick={() => openLightbox(i)}
          >
            <img
              src={photo.src}
              alt={photo.alt}
              loading={i < 3 ? "eager" : "lazy"}
              className="w-full block group-hover:brightness-90 transition-all duration-300"
            />
          </div>
        ))}

        {filteredPhotos.length === 0 && (
          <div className="text-center py-40">
            <p className="text-xl text-white/40">
              No projects in this category yet.
            </p>
          </div>
        )}
      </div>

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

      {/* Lightbox with Navigation */}
      {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center cursor-zoom-out"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-white/70 hover:text-white z-50"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Previous */}
          <button
            onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white z-50 p-2"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>

          {/* Image */}
          <img
            src={filteredPhotos[lightboxIndex].src}
            alt={filteredPhotos[lightboxIndex].alt}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white z-50 p-2"
          >
            <ChevronRight className="w-10 h-10" />
          </button>

          {/* Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm">
            {lightboxIndex + 1} / {filteredPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
}
