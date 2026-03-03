import { Button } from "@/components/ui/button";
import { PHONE_NUMBERS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Clock,
  Award,
  Phone,
  Hammer,
  Fence,
  Columns3,
  Grid3X3,
  Sparkles,
  Wrench,
} from "lucide-react";
import GHLFormPlaceholder from "@/components/GHLFormPlaceholder";
import Testimonials from "@/components/Testimonials";

/**
 * DESIGN PHILOSOPHY: Industrial Heritage Brutalism
 * Custom Ironwork Landing Page — High-converting Google Ads landing page
 * Focus: Persuasion, portfolio proof, multiple CTAs, lead capture
 */

const portfolioImages = [
  { src: "/images/portfolio/gate/gate-1.jpg", alt: "Custom iron gate fabrication" },
  { src: "/images/portfolio/gate/gate-2.jpg", alt: "Ornamental iron gate design" },
  { src: "/images/portfolio/exterior-railing/exterior-railing-1.jpg", alt: "Custom exterior iron railing" },
  { src: "/images/portfolio/interior-railing/interior-railings-1.jpg", alt: "Interior iron railing craftsmanship" },
  { src: "/images/portfolio/before-after/before-after-1.jpg", alt: "Iron restoration before and after" },
  { src: "/images/portfolio/balcony/balcony-1.jpg", alt: "Custom iron balcony railing" },
];

const services = [
  {
    icon: Fence,
    title: "Custom Gates & Fences",
    description:
      "Driveway gates, garden gates, and iron fences — designed and hand-forged in our shop to your exact specifications.",
    features: ["Swing & sliding gates", "Driveway & pedestrian", "Ornamental designs", "Automated options"],
  },
  {
    icon: Columns3,
    title: "Railings (Interior & Exterior)",
    description:
      "From elegant staircase railings to code-compliant exterior railings, every piece is built to last and look stunning.",
    features: ["Staircase railings", "Porch & deck railings", "ADA compliant", "Custom balusters"],
  },
  {
    icon: Grid3X3,
    title: "Balconies & Balustrades",
    description:
      "Juliet balconies, full balcony railings, and decorative balustrades that add character and safety to any building.",
    features: ["Juliet balconies", "Full balcony systems", "Load-rated designs", "Historic reproductions"],
  },
  {
    icon: Shield,
    title: "Window Guards & Grilles",
    description:
      "Security window guards and decorative grilles that protect without sacrificing style. Code-compliant for residential and commercial.",
    features: ["Security-rated", "Fire code compliant", "Decorative options", "Quick-release models"],
  },
  {
    icon: Sparkles,
    title: "Spiral Staircases",
    description:
      "Show-stopping spiral staircases engineered for safety and built as functional art. Interior and exterior designs available.",
    features: ["Interior & exterior", "Custom diameters", "Code compliant", "Ornamental details"],
  },
  {
    icon: Hammer,
    title: "Decorative & Ornamental Work",
    description:
      "Scrollwork, finials, custom brackets, furniture, and artistic metalwork. If you can imagine it, we can forge it.",
    features: ["Hand-forged scrollwork", "Custom brackets", "Metal furniture", "Artistic commissions"],
  },
];

const processSteps = [
  {
    step: "01",
    title: "Free Consultation",
    description: "We visit your property, discuss your vision, take measurements, and provide expert recommendations — at no cost.",
  },
  {
    step: "02",
    title: "Design & Quote",
    description: "You receive a detailed design proposal and transparent quote. No hidden fees, no surprises.",
  },
  {
    step: "03",
    title: "Fabrication",
    description: "Your piece is hand-crafted in our 15,000 sq ft Everett, MA shop by our team of experienced ironworkers.",
  },
  {
    step: "04",
    title: "Installation",
    description: "Our crew handles professional installation, cleanup, and a final walkthrough to make sure you're 100% satisfied.",
  },
];

export default function CustomIronworkLanding() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center bg-sidebar text-sidebar-foreground overflow-hidden pt-4">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/custom-iron-gate.webp"
            alt="Custom ironwork built in our fabrication shop"
            className="w-full h-full object-cover opacity-40"
          />
        </div>

        <div className="container relative z-10">
          <div className="max-w-4xl">
            <div className="inline-block px-4 py-2 bg-accent text-accent-foreground text-sm font-display font-bold tracking-wider mb-6">
              CUSTOM IRONWORK SPECIALISTS
            </div>

            <h1 className="text-display text-3xl md:text-7xl lg:text-8xl mb-4 md:mb-6 leading-tight">
              CUSTOM IRONWORK BUILT IN OUR SHOP
            </h1>

            <p className="text-base md:text-2xl text-sidebar-foreground/90 mb-6 md:mb-8 max-w-3xl leading-relaxed">
              From gates and railings to staircases and ornamental work — every piece is
              designed, hand-forged, and finished in our own 15,000 sq ft fabrication shop in
              Everett, MA. Over 20 years of craftsmanship. Free estimates.
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
                <Wrench className="w-5 h-5 text-accent" />
                <span>OWN FABRICATION SHOP</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent" />
                <span>20+ YEARS</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-accent/20 border-2 border-accent">
                <span className="text-xl">🎖️</span>
                <span className="font-display font-bold">10% MILITARY DISCOUNT</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Gallery */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-4">
            OUR RECENT WORK
          </h2>
          <p className="text-center text-lg text-accent-foreground/80 mb-12 max-w-2xl mx-auto">
            Every project is custom designed and built in our Everett, MA shop. Here's a sample of what we can do for you.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {portfolioImages.map((image, index) => (
              <div
                key={index}
                className="aspect-square overflow-hidden border-4 border-accent-foreground/20 hover:border-accent-foreground/50 transition-colors"
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

          <div className="text-center mt-10">
            <Link href="/portfolio">
              <Button
                size="lg"
                variant="outline"
                className="border-accent-foreground/30 text-accent-foreground hover:bg-accent-foreground/10 text-lg px-8 py-6 thick-border"
              >
                VIEW FULL PORTFOLIO <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* What We Build */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-4">
            WHAT WE BUILD
          </h2>
          <p className="text-center text-lg text-muted-foreground mb-16 max-w-2xl mx-auto">
            If it's made of iron or steel, we can design, fabricate, and install it. All work is done in-house — no outsourcing, no middlemen.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="p-8 border-4 border-border hover:border-accent transition-colors">
                <div className="w-16 h-16 bg-accent/20 flex items-center justify-center mb-6">
                  <service.icon className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-heading text-2xl mb-4">{service.title}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">{service.description}</p>
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="#quote">
                  <Button variant="outline" className="w-full thick-border">
                    Get Quote <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="diagonal-cut-top bg-sidebar text-sidebar-foreground py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            WHY CHOOSE KINGS IRON WORKS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-accent/20 flex items-center justify-center mx-auto mb-6">
                <Wrench className="w-10 h-10 text-accent" />
              </div>
              <h3 className="text-heading text-2xl mb-4">Our Own Fabrication Shop</h3>
              <p className="text-sidebar-foreground/80 leading-relaxed">
                We don't outsource. Every piece is designed and hand-forged in our 15,000 sq ft
                facility in Everett, MA. This means better quality control, faster turnaround,
                and lower costs for you.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-accent/20 flex items-center justify-center mx-auto mb-6">
                <Award className="w-10 h-10 text-accent" />
              </div>
              <h3 className="text-heading text-2xl mb-4">20+ Years of Craftsmanship</h3>
              <p className="text-sidebar-foreground/80 leading-relaxed">
                Since 2004, we've completed thousands of custom ironwork projects across
                Massachusetts and New England. Our experience means we get it right the first time.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-accent/20 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-accent" />
              </div>
              <h3 className="text-heading text-2xl mb-4">5-Star Google Reviews</h3>
              <p className="text-sidebar-foreground/80 leading-relaxed">
                With a 4.9/5.0 average rating from 200+ verified Google reviews, our customers
                consistently praise our craftsmanship, reliability, and fair pricing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* Process */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-4">
            HOW IT WORKS
          </h2>
          <p className="text-center text-lg text-muted-foreground mb-16 max-w-2xl mx-auto">
            From your first call to final installation — here's what to expect when you work with us.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((item, index) => (
              <div key={index} className="relative">
                <div className="text-7xl font-display font-black text-accent/20 mb-4">
                  {item.step}
                </div>
                <h3 className="text-heading text-xl mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA with Lead Form */}
      <section id="quote" className="diagonal-cut-top bg-sidebar text-sidebar-foreground py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-display text-4xl md:text-5xl mb-6">
              GET YOUR FREE CUSTOM IRONWORK QUOTE
            </h2>
            <p className="text-xl text-sidebar-foreground/80 mb-4">
              We're currently booking projects 4–6 weeks out. Request your free estimate today to
              secure your spot.
            </p>
            <p className="text-lg text-sidebar-foreground/60 mb-8">
              Free on-site consultations · Transparent pricing · No obligation
            </p>

            {/* Go High Level Form Integration */}
            <div className="max-w-2xl mx-auto mt-8">
              <GHLFormPlaceholder service="Custom Ironwork" />
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
