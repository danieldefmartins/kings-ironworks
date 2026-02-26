import { Button } from "@/components/ui/button";
import { PHONE_NUMBERS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Shield, Clock, Award, Phone, Wrench, Lock, Palette } from "lucide-react";
import GHLFormPlaceholder from "@/components/GHLFormPlaceholder";

/**
 * DESIGN PHILOSOPHY: Industrial Heritage Brutalism
 * Window Guards & Security Grilles Landing Page - High-converting, SEO-optimized
 * Focus: Window security guards, decorative grilles, child safety, code compliance
 */

export default function WindowLanding() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center bg-sidebar text-sidebar-foreground overflow-hidden pt-4">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/portfolio/window-1.jpg"
            alt="Custom window guards and security grilles"
            className="w-full h-full object-cover opacity-40"
          />
        </div>

        <div className="container relative z-10">
          <div className="max-w-4xl">
            <div className="inline-block px-4 py-2 bg-accent text-accent-foreground text-sm font-display font-bold tracking-wider mb-6">
              SECURITY & SAFETY
            </div>

            <h1 className="text-display text-3xl md:text-7xl lg:text-8xl mb-4 md:mb-6 leading-tight">
              CUSTOM WINDOW GUARDS & SECURITY GRILLES
            </h1>

            <p className="text-base md:text-2xl text-sidebar-foreground/90 mb-6 md:mb-8 max-w-3xl leading-relaxed">
              Protect your property without sacrificing style. Custom window guards and
              decorative security grilles designed, fabricated, and installed by our expert
              team in Everett, MA. Code-compliant and built to last.
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
              { stat: "300+", label: "Guards Installed" },
              { stat: "100%", label: "Code Compliant" },
              { stat: "20+", label: "Years Experience" },
              { stat: "100%", label: "Custom Designs" },
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
            OUR WINDOW GUARD SERVICES
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Lock,
                title: "Window Security Guards",
                description: "Heavy-duty security guards that deter break-ins while allowing ventilation and natural light. Custom-fitted to your window openings for a clean, professional look.",
                features: ["Tamper-resistant mounts", "Custom sizing", "Ventilation-friendly", "Quick-release options"]
              },
              {
                icon: Palette,
                title: "Decorative Window Grilles",
                description: "Beautiful ornamental grilles that add architectural character and security. Choose from classic, colonial, Mediterranean, and modern design styles.",
                features: ["Ornamental scrollwork", "Period-accurate styles", "Powder-coated finishes", "Custom patterns"]
              },
              {
                icon: Shield,
                title: "Basement Window Guards",
                description: "Protect vulnerable basement windows from intrusion. Heavy-gauge steel guards custom-fitted with hinged or removable options for emergency egress.",
                features: ["Heavy-gauge steel", "Hinged access", "Removable designs", "Rust-proof coating"]
              },
              {
                icon: Shield,
                title: "Emergency Egress Windows",
                description: "Code-compliant window guard systems with quick-release mechanisms for emergency escape. Meets fire code requirements while maintaining security.",
                features: ["Quick-release latches", "Fire code compliant", "Interior operation", "No tools needed"]
              },
              {
                icon: Shield,
                title: "Child Safety Guards",
                description: "Protect children from window falls with code-compliant safety guards. Proper bar spacing and secure mounting to meet all child safety regulations.",
                features: ["4\" max bar spacing", "Secure mounting", "Code compliant", "Tamper-resistant"]
              },
              {
                icon: Palette,
                title: "Custom Ornamental Designs",
                description: "One-of-a-kind window guard designs hand-crafted to match your property's unique architectural style. From historic reproductions to contemporary art pieces.",
                features: ["Hand-forged elements", "Architectural matching", "Historic reproductions", "Artist collaborations"]
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
              GET YOUR FREE WINDOW GUARD QUOTE
            </h2>
            <p className="text-xl text-sidebar-foreground/80 mb-8">
              Free on-site measurements, custom design consultation, and competitive pricing.
              Serving Boston, Cambridge, Somerville, and all of Massachusetts.
            </p>

            {/* Go High Level Form Integration */}
            <div className="max-w-2xl mx-auto mt-8">
              <GHLFormPlaceholder service="Window Guards" />
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
