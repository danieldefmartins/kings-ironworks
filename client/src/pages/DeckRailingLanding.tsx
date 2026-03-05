import { Button } from "@/components/ui/button";
import { PHONE_NUMBERS } from "@/lib/constants";
import { PhoneLink } from "@/components/PhoneLink";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Shield, Clock, Award, Phone, Wrench, Fence } from "lucide-react";
import GHLFormPlaceholder from "@/components/GHLFormPlaceholder";

/**
 * DESIGN PHILOSOPHY: Industrial Heritage Brutalism
 * Deck Railing Landing Page - High-converting, SEO-optimized
 * Focus: Custom deck railings, wood & iron combos, weather-resistant finishes
 */

export default function DeckRailingLanding() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center bg-sidebar text-sidebar-foreground overflow-hidden pt-4">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/portfolio/deck-railings-1.jpg"
            alt="Custom deck railing design and installation"
            className="w-full h-full object-cover opacity-40"
          />
        </div>

        <div className="container relative z-10">
          <div className="max-w-4xl">
            <div className="inline-block px-4 py-2 bg-accent text-accent-foreground text-sm font-display font-bold tracking-wider mb-6">
              CUSTOM FABRICATION
            </div>

            <h1 className="text-display text-3xl md:text-7xl lg:text-8xl mb-4 md:mb-6 leading-tight">
              CUSTOM DECK RAILING DESIGN & INSTALLATION
            </h1>

            <p className="text-base md:text-2xl text-sidebar-foreground/90 mb-6 md:mb-8 max-w-3xl leading-relaxed">
              Elevate your outdoor living space with hand-crafted deck railings built to last.
              From classic wood and iron combos to sleek all-metal designs, every railing is
              custom-built in our Everett, MA fabrication shop.
            </p>

            {/* Dual CTA */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <PhoneLink tel={PHONE_NUMBERS.MAIN.tel}>
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6 thick-border group">
                  <Phone className="mr-2 w-6 h-6" />
                  CALL NOW: {PHONE_NUMBERS.MAIN.display}
                </Button>
              </PhoneLink>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10 text-lg px-8 py-6 thick-border">
                  FREE QUOTE <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                <span>Licensed & Insured</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent" />
                <span>20+ Years Experience</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-accent" />
                <span>Veteran Owned</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-accent/20 border-2 border-accent">
                <span className="text-xl">🎖️</span>
                <span className="font-display font-bold">10% MILITARY DISCOUNT</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-20">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            WHY CHOOSE KINGS IRONWORKS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            {[
              { stat: "300+", label: "Decks Completed" },
              { stat: "100%", label: "Weather Rated" },
              { stat: "20+", label: "Years Experience" },
              { stat: "100%", label: "Custom Built" },
            ].map((item, index) => (
              <div key={index}>
                <div className="text-5xl md:text-6xl font-display font-black mb-2">{item.stat}</div>
                <div className="text-lg font-display tracking-wider">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Cards */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            OUR DECK RAILING SERVICES
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Fence,
                title: "Wood & Iron Combo Railings",
                description: "The perfect blend of warmth and strength. Custom wood-and-iron railings that complement your deck's design while providing unmatched durability.",
                features: ["Custom wood species", "Hand-forged iron balusters", "Stained & sealed", "Fully customizable"]
              },
              {
                icon: Shield,
                title: "All-Metal Deck Railings",
                description: "Sleek, modern, and virtually maintenance-free. All-metal railings fabricated from premium steel or aluminum for a contemporary look.",
                features: ["Steel or aluminum", "Powder-coated finishes", "Low maintenance", "Modern profiles"]
              },
              {
                icon: Wrench,
                title: "Glass Panel Deck Systems",
                description: "Maximize your views with frameless or semi-frameless glass panel railing systems. Perfect for waterfront and scenic properties.",
                features: ["Tempered safety glass", "Frameless options", "Unobstructed views", "Corrosion-resistant hardware"]
              },
              {
                icon: CheckCircle2,
                title: "Code-Compliant Installations",
                description: "Every installation meets or exceeds local building codes. We handle permits, inspections, and engineering requirements so you don't have to.",
                features: ["IRC/IBC compliant", "Permit coordination", "Structural engineering", "Final inspections"]
              },
              {
                icon: Award,
                title: "Weather-Resistant Finishes",
                description: "Built for New England weather. Our finishes withstand rain, snow, salt air, and UV exposure to keep your railings looking great for years.",
                features: ["Hot-dip galvanizing", "Marine-grade coatings", "UV-resistant finishes", "Rust prevention"]
              },
              {
                icon: Wrench,
                title: "Repair & Replacement",
                description: "Restore your existing deck railings or replace outdated systems. We match existing styles or design fresh upgrades for a new look.",
                features: ["Style matching", "Structural assessment", "Component repair", "Full replacement"]
              }
            ].map((service, index) => (
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
                <Link href="/contact">
                  <Button variant="outline" className="w-full thick-border">
                    Get Quote
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="diagonal-cut-top bg-sidebar text-sidebar-foreground py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-display text-4xl md:text-5xl mb-6">
              GET YOUR FREE DECK RAILING QUOTE
            </h2>
            <p className="text-xl text-sidebar-foreground/80 mb-8">
              Free on-site measurements, custom design consultation, and competitive pricing.
              Serving Boston, Cambridge, Somerville, and all of Massachusetts.
            </p>

            {/* Go High Level Form Integration */}
            <div className="max-w-2xl mx-auto mt-8">
              <GHLFormPlaceholder service="Deck Railing" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8 py-6 thick-border">
                  REQUEST FREE QUOTE <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <PhoneLink tel={PHONE_NUMBERS.MAIN.tel}>
                <Button size="lg" variant="outline" className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10 text-lg px-8 py-6 thick-border">
                  <Phone className="mr-2 w-5 h-5" />
                  {PHONE_NUMBERS.MAIN.display}
                </Button>
              </PhoneLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
