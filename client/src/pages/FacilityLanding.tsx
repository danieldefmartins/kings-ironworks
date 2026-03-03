import { Button } from "@/components/ui/button";
import { PHONE_NUMBERS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  Phone,
  Flame,
  Zap,
  Shield,
  Paintbrush,
  Factory,
  Gauge,
  Award,
  Clock,
} from "lucide-react";
import GHLFormPlaceholder from "@/components/GHLFormPlaceholder";

/**
 * DESIGN PHILOSOPHY: Industrial Heritage Brutalism
 * Facility Landing Page — Showcases our fabrication shop, welding capabilities,
 * and in-house powder coating as competitive advantages.
 */

const facilityImages = [
  { src: "/images/portfolio/facility/FullSizeRender.JPG", alt: "Kings Iron Works fabrication shop" },
  { src: "/images/portfolio/facility/FullSizeRender 2.JPG", alt: "Welding station in our Everett facility" },
  { src: "/images/portfolio/facility/FullSizeRender 3.JPG", alt: "Professional welding equipment" },
  { src: "/images/portfolio/facility/FullSizeRender 4.JPG", alt: "Powder coating booth" },
  { src: "/images/portfolio/facility/FullSizeRender 5.JPG", alt: "Custom ironwork in progress" },
  { src: "/images/portfolio/facility/FullSizeRender 6.JPG", alt: "Finished ironwork pieces" },
  { src: "/images/portfolio/facility/IMG_2443.JPG", alt: "Fabrication shop floor" },
  { src: "/images/portfolio/facility/179be0c7-68dd-41e8-93aa-020f5aee0455.JPG", alt: "Iron fabrication process" },
  { src: "/images/portfolio/facility/9ff15a85-bb6f-4578-a4dd-28aa931a7303.JPG", alt: "Welding in progress" },
  { src: "/images/portfolio/facility/d82e2919-483e-4558-9b25-4ea02b66f361.JPG", alt: "Facility equipment" },
];

const weldingMachines = [
  {
    icon: Flame,
    title: "MIG Welding (GMAW)",
    description:
      "Our go-to for speed and versatility. MIG welders produce clean, strong welds on steel and aluminum with excellent control — perfect for railings, gates, and structural work where efficiency meets quality.",
    strengths: ["Fast production speed", "Clean, consistent beads", "Ideal for thick steel", "Minimal cleanup needed"],
  },
  {
    icon: Zap,
    title: "TIG Welding (GTAW)",
    description:
      "The precision choice. TIG welding gives us pinpoint control for thin materials, ornamental details, and visible joints where aesthetics matter. The result is a flawless, polished weld with zero spatter.",
    strengths: ["Superior finish quality", "Precision on thin metals", "No spatter or slag", "Best for ornamental work"],
  },
  {
    icon: Shield,
    title: "Stick Welding (SMAW)",
    description:
      "Built for heavy-duty structural work and on-site repairs. Stick welding penetrates deep into thick steel, making it essential for fire escapes, structural beams, and outdoor installations where strength is everything.",
    strengths: ["Deep penetration welds", "Works in any condition", "Heavy structural steel", "On-site field repairs"],
  },
  {
    icon: Gauge,
    title: "Flux-Core Welding (FCAW)",
    description:
      "High-deposition welding for large-scale projects. Flux-core combines the speed of MIG with the penetration of stick — ideal for structural steel, heavy gates, and commercial projects that need to move fast without compromising strength.",
    strengths: ["High deposition rate", "Deep weld penetration", "No shielding gas needed", "Large-scale projects"],
  },
];

export default function FacilityLanding() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center bg-sidebar text-sidebar-foreground overflow-hidden pt-4">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/fabrication-shop-interior.webp"
            alt="Kings Iron Works fabrication facility in Everett, MA"
            className="w-full h-full object-cover opacity-40"
          />
        </div>

        <div className="container relative z-10">
          <div className="max-w-4xl">
            <div className="inline-block px-4 py-2 bg-accent text-accent-foreground text-sm font-display font-bold tracking-wider mb-6">
              OUR FABRICATION FACILITY
            </div>

            <h1 className="text-display text-3xl md:text-7xl lg:text-8xl mb-4 md:mb-6 leading-tight">
              STATE-OF-THE-ART SHOP. FLAWLESS RESULTS.
            </h1>

            <p className="text-base md:text-2xl text-sidebar-foreground/90 mb-6 md:mb-8 max-w-3xl leading-relaxed">
              Our 15,000 sq ft Everett, MA facility is equipped with professional-grade welding
              machines and an in-house powder coat paint booth — so every piece that leaves our
              shop has perfect welds and a factory-quality finish.
            </p>

            {/* Dual CTA */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="#quote">
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6 thick-border group"
                >
                  GET FREE ESTIMATE <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href={`tel:${PHONE_NUMBERS.MAIN.tel}`}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10 text-lg px-8 py-6 thick-border"
                >
                  <Phone className="mr-2 w-6 h-6" />
                  CALL NOW: {PHONE_NUMBERS.MAIN.display}
                </Button>
              </a>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-accent" />
                <span>15,000 SQ FT FACILITY</span>
              </div>
              <div className="flex items-center gap-2">
                <Paintbrush className="w-5 h-5 text-accent" />
                <span>IN-HOUSE POWDER COATING</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent" />
                <span>20+ YEARS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Our Facility Matters */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-4">
            WHY OUR FACILITY MATTERS
          </h2>
          <p className="text-center text-lg text-accent-foreground/80 mb-16 max-w-3xl mx-auto">
            Most ironwork companies outsource their welding or painting. We do everything
            under one roof — which means better quality, faster turnaround, and lower costs for you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="text-6xl font-display font-black mb-4">100%</div>
              <div className="text-xl font-display tracking-wider mb-2">IN-HOUSE</div>
              <p className="text-accent-foreground/80">
                No outsourcing. Every cut, weld, grind, and paint job happens in our shop under our quality control.
              </p>
            </div>
            <div className="text-center">
              <div className="text-6xl font-display font-black mb-4">15K</div>
              <div className="text-xl font-display tracking-wider mb-2">SQ FT FACILITY</div>
              <p className="text-accent-foreground/80">
                Enough space to handle large-scale commercial projects and multiple residential jobs simultaneously.
              </p>
            </div>
            <div className="text-center">
              <div className="text-6xl font-display font-black mb-4">4+</div>
              <div className="text-xl font-display tracking-wider mb-2">WELDING PROCESSES</div>
              <p className="text-accent-foreground/80">
                MIG, TIG, stick, and flux-core — we match the right process to your project for the best possible result.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Facility Photo Gallery */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-4">
            INSIDE OUR SHOP
          </h2>
          <p className="text-center text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Take a look inside our Everett, MA fabrication facility — where your project is designed, welded, painted, and finished.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {facilityImages.map((image, index) => (
              <div
                key={index}
                className="aspect-square overflow-hidden border-4 border-border hover:border-accent transition-colors"
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Welding Machines */}
      <section className="diagonal-cut-top bg-sidebar text-sidebar-foreground py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-4">
            PROFESSIONAL WELDING EQUIPMENT
          </h2>
          <p className="text-center text-lg text-sidebar-foreground/80 mb-6 max-w-3xl mx-auto">
            The quality of your ironwork is only as good as the equipment and skill behind it.
            Our shop runs state-of-the-art welding machines that produce cleaner, stronger,
            and more visually appealing welds than standard equipment.
          </p>
          <p className="text-center text-base text-sidebar-foreground/60 mb-16 max-w-3xl mx-auto">
            Better machines mean smoother weld beads, less grinding, and a finished product
            that looks professionally manufactured — not rough or uneven. We match the right
            welding process to each project so you get the perfect result every time.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {weldingMachines.map((machine, index) => (
              <Card key={index} className="p-8 border-4 border-sidebar-foreground/10 hover:border-accent transition-colors bg-sidebar-foreground/5">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <machine.icon className="w-8 h-8 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-heading text-2xl mb-3">{machine.title}</h3>
                    <p className="text-sidebar-foreground/80 mb-5 leading-relaxed">{machine.description}</p>
                    <ul className="grid grid-cols-2 gap-2">
                      {machine.strengths.map((strength, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Powder Coating */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-block px-4 py-2 bg-accent text-accent-foreground text-sm font-display font-bold tracking-wider mb-6">
                  IN-HOUSE POWDER COATING
                </div>
                <h2 className="text-display text-4xl md:text-5xl mb-6">
                  A PROFESSIONAL FINISH MAKES ALL THE DIFFERENCE
                </h2>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  Powder coating isn't just paint — it's a baked-on, electrostatically applied
                  finish that's <strong>harder, thicker, and more durable</strong> than any
                  spray or brush-on paint. It resists chipping, scratching, fading, and rust
                  for years longer than traditional finishes.
                </p>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Because we have our own powder coat booth in-house, we control the entire
                  finishing process. Your project gets a smooth, even, factory-quality coating
                  that elevates the entire look — turning good ironwork into something that
                  looks truly premium.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Electrostatically applied for even, full coverage",
                    "Baked at 400°F for a rock-hard, durable finish",
                    "Resists rust, chips, scratches, and UV fading",
                    "Hundreds of colors and textures available",
                    "No drips, runs, or brush marks — ever",
                    "Environmentally friendly — no solvents or VOCs",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-base">
                      <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="aspect-square overflow-hidden border-4 border-border">
                  <img
                    src="/images/portfolio/facility/FullSizeRender 4.JPG"
                    alt="Powder coating in our facility"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="aspect-square overflow-hidden border-4 border-border">
                  <img
                    src="/images/portfolio/facility/FullSizeRender 5.JPG"
                    alt="Professional powder coat finish"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="aspect-square overflow-hidden border-4 border-border col-span-2">
                  <img
                    src="/images/portfolio/facility/FullSizeRender 6.JPG"
                    alt="Finished powder coated ironwork"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Difference */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            THE KINGS IRON WORKS DIFFERENCE
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8 border-4 border-accent-foreground/20 bg-accent-foreground/10">
              <h3 className="text-heading text-2xl mb-4 flex items-center gap-3">
                <Award className="w-7 h-7" />
                Our Shop
              </h3>
              <ul className="space-y-3">
                {[
                  "State-of-the-art MIG, TIG, stick & flux-core welders",
                  "In-house powder coat paint booth",
                  "15,000 sq ft dedicated facility",
                  "Every piece quality-inspected before delivery",
                  "20+ years of professional experience",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-8 border-4 border-accent-foreground/20 bg-accent-foreground/5 opacity-70">
              <h3 className="text-heading text-2xl mb-4">Typical Competitors</h3>
              <ul className="space-y-3">
                {[
                  "Basic welding equipment, limited processes",
                  "Outsource painting to third parties",
                  "Small garage or mobile-only operations",
                  "No quality control process",
                  "Limited experience, part-time crews",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-accent-foreground/70">
                    <span className="w-5 h-5 flex-shrink-0 text-center">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA with Lead Form */}
      <section id="quote" className="diagonal-cut-top bg-sidebar text-sidebar-foreground py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-display text-4xl md:text-5xl mb-6">
              SEE THE DIFFERENCE FOR YOURSELF
            </h2>
            <p className="text-xl text-sidebar-foreground/80 mb-4">
              Schedule a free consultation and we'll show you exactly how your project will be
              designed, welded, and finished in our facility.
            </p>
            <p className="text-lg text-sidebar-foreground/60 mb-8">
              Free estimates · Shop tours available · No obligation
            </p>

            {/* Go High Level Form Integration */}
            <div className="max-w-2xl mx-auto mt-8">
              <GHLFormPlaceholder service="Facility Tour / Quote" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <a href={`tel:${PHONE_NUMBERS.MAIN.tel}`}>
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6 thick-border"
                >
                  <Phone className="mr-2 w-5 h-5" />
                  CALL NOW: {PHONE_NUMBERS.MAIN.display}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
