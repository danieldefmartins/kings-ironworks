import { Button } from "@/components/ui/button";
import { PHONE_NUMBERS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Shield, Clock, Award, Phone, Wrench, Lock, DoorOpen } from "lucide-react";
import GHLFormPlaceholder from "@/components/GHLFormPlaceholder";

/**
 * DESIGN PHILOSOPHY: Industrial Heritage Brutalism
 * Gate Landing Page - High-converting, SEO-optimized
 * Focus: Custom iron gates, driveway gates, automated gate systems
 */

export default function GateLanding() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center bg-sidebar text-sidebar-foreground overflow-hidden pt-4">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/ldKpYAFGAsEGkCVX.JPG"
            alt="Custom iron gate design and fabrication"
            className="w-full h-full object-cover opacity-40"
          />
        </div>

        <div className="container relative z-10">
          <div className="max-w-4xl">
            <div className="inline-block px-4 py-2 bg-accent text-accent-foreground text-sm font-display font-bold tracking-wider mb-6">
              HAND-CRAFTED IRONWORK
            </div>

            <h1 className="text-display text-3xl md:text-7xl lg:text-8xl mb-4 md:mb-6 leading-tight">
              CUSTOM IRON GATE DESIGN & FABRICATION
            </h1>

            <p className="text-base md:text-2xl text-sidebar-foreground/90 mb-6 md:mb-8 max-w-3xl leading-relaxed">
              Make a statement with a hand-forged iron gate built to your exact specifications.
              From grand driveway entrances to elegant garden gates, every piece is custom
              designed and fabricated in our Everett, MA shop.
            </p>

            {/* Dual CTA */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <a href={`tel:${PHONE_NUMBERS.MAIN.tel}`}>
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6 thick-border group">
                  <Phone className="mr-2 w-6 h-6" />
                  CALL NOW: {PHONE_NUMBERS.MAIN.display}
                </Button>
              </a>
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
              { stat: "500+", label: "Gates Fabricated" },
              { stat: "100%", label: "Custom Designs" },
              { stat: "20+", label: "Years Experience" },
              { stat: "100%", label: "Hand Forged" },
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
            OUR GATE SERVICES
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: DoorOpen,
                title: "Driveway Gates",
                description: "Grand entrance gates that combine security with curb appeal. Swing or sliding designs custom-built to fit your driveway and architectural style.",
                features: ["Swing & sliding styles", "Custom sizing", "Ornamental designs", "Heavy-duty hardware"]
              },
              {
                icon: DoorOpen,
                title: "Pedestrian Gates",
                description: "Welcoming yet secure walkway gates for side yards, front entries, and pathways. Designed to complement your property's fencing and railings.",
                features: ["Self-closing hinges", "Custom height & width", "Matching fence styles", "Locking options"]
              },
              {
                icon: Award,
                title: "Garden & Estate Gates",
                description: "Elegant ornamental gates for gardens, estates, and historic properties. Intricate scrollwork and decorative elements hand-forged by master craftsmen.",
                features: ["Hand-forged scrollwork", "Period-accurate designs", "Estate-grade quality", "Ornamental finials"]
              },
              {
                icon: Lock,
                title: "Automated Gate Systems",
                description: "Seamless automation for new or existing gates. Remote controls, keypads, intercoms, and smart home integration for effortless access.",
                features: ["Remote operation", "Keypad & intercom", "Smart home ready", "Battery backup"]
              },
              {
                icon: Shield,
                title: "Security Gates",
                description: "High-security gates for commercial properties, parking facilities, and sensitive locations. Engineered for maximum protection without sacrificing aesthetics.",
                features: ["Anti-climb design", "Commercial grade", "Access control", "Crash-rated options"]
              },
              {
                icon: Wrench,
                title: "Gate Repair & Restoration",
                description: "Bring your existing gates back to life. From rust repair and repainting to full mechanical overhauls and historic restoration.",
                features: ["Rust treatment", "Hardware replacement", "Motor repair", "Historic restoration"]
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
              GET YOUR FREE GATE QUOTE
            </h2>
            <p className="text-xl text-sidebar-foreground/80 mb-8">
              Free design consultation, on-site measurements, and competitive pricing.
              Serving Boston, Cambridge, Somerville, and all of Massachusetts.
            </p>

            {/* Go High Level Form Integration */}
            <div className="max-w-2xl mx-auto mt-8">
              <GHLFormPlaceholder service="Custom Gate" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8 py-6 thick-border">
                  REQUEST FREE QUOTE <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href={`tel:${PHONE_NUMBERS.MAIN.tel}`}>
                <Button size="lg" variant="outline" className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10 text-lg px-8 py-6 thick-border">
                  <Phone className="mr-2 w-5 h-5" />
                  {PHONE_NUMBERS.MAIN.display}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
