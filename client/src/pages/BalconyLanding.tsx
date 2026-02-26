import { Button } from "@/components/ui/button";
import { PHONE_NUMBERS } from "@/lib/constants";
import { useLocalPhone } from "@/lib/useLocalPhone";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Shield, Clock, Award, Phone, Wrench, Building } from "lucide-react";
import GHLFormPlaceholder from "@/components/GHLFormPlaceholder";

/**
 * DESIGN PHILOSOPHY: Industrial Heritage Brutalism
 * Balcony Landing Page - High-converting, SEO-optimized
 * Focus: Balcony railings, Juliet balconies, structural support, safety upgrades
 */

export default function BalconyLanding() {
  const phone = useLocalPhone();

  return (
    <div className="min-h-screen">
      {/* SEO-Optimized Hero */}
      <section className="relative min-h-[85vh] flex items-center bg-sidebar text-sidebar-foreground overflow-hidden pt-20 lg:pt-0">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/portfolio/balcony-1.jpg"
            alt="Custom balcony railing and ironwork Boston"
            className="w-full h-full object-cover opacity-40"
          />
        </div>

        <div className="container relative z-10">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="inline-block px-4 py-2 bg-accent text-accent-foreground text-sm font-display font-bold tracking-wider mb-6 thick-border">
              LICENSED & CERTIFIED
            </div>

            <h1 className="text-display text-3xl md:text-7xl lg:text-8xl mb-4 md:mb-6 leading-tight">
              CUSTOM BALCONY RAILING & IRONWORK
            </h1>

            <p className="text-base md:text-2xl text-sidebar-foreground/90 mb-6 md:mb-8 max-w-3xl leading-relaxed">
              Elevate your property with custom balcony railings and ironwork designed for beauty
              and built for safety. From ornamental Juliet balconies to full structural balcony systems,
              every project is 100% code compliant. 20+ years of trusted craftsmanship.
            </p>

            {/* Dual CTA */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <a href={`tel:${phone.tel}`}>
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8 py-6 thick-border group">
                  <Phone className="mr-2 w-6 h-6 group-hover:animate-bounce" />
                  CALL NOW: {phone.display}
                </Button>
              </a>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10 text-lg px-8 py-6 thick-border">
                  FREE CONSULTATION
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>

            {/* Trust Signals */}
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

      {/* Stats Section */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-20">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            WHY BOSTON TRUSTS KINGS IRONWORKS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-6xl font-display font-black mb-2">200+</div>
              <div className="text-lg">Balconies Completed</div>
            </div>
            <div>
              <div className="text-6xl font-display font-black mb-2">100%</div>
              <div className="text-lg">Code Compliant</div>
            </div>
            <div>
              <div className="text-6xl font-display font-black mb-2">20+</div>
              <div className="text-lg">Years Licensed</div>
            </div>
            <div>
              <div className="text-6xl font-display font-black mb-2">1:1</div>
              <div className="text-lg">Custom Designed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Cards */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            BALCONY IRONWORK SERVICES
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Balcony Railings",
                description: "Custom balcony railings engineered for safety and designed for style. Proper height, load capacity, and spacing built to exceed code requirements for every installation.",
                cta: "Get Quote"
              },
              {
                icon: Building,
                title: "Juliet Balconies",
                description: "Elegant Juliet balcony railings that add European charm to any facade. Custom-forged ironwork mounted flush to the building for a timeless architectural accent.",
                cta: "See Designs"
              },
              {
                icon: Wrench,
                title: "Structural Balcony Support",
                description: "Heavy-duty structural steel supports and brackets for balcony systems. Engineered for load-bearing capacity with proper connections to the building structure.",
                cta: "Get Assessment"
              },
              {
                icon: Award,
                title: "Ornamental Balcony Designs",
                description: "Hand-forged ornamental ironwork that transforms balconies into architectural statements. Scrollwork, medallions, and custom motifs crafted to your design vision.",
                cta: "View Portfolio"
              },
              {
                icon: CheckCircle2,
                title: "Safety Upgrades",
                description: "Bring existing balconies up to current code with safety upgrades. Height extensions, infill panels, reinforced connections, and anti-corrosion treatments.",
                cta: "Schedule Inspection"
              },
              {
                icon: Wrench,
                title: "Repair & Restoration",
                description: "Restore aging balcony ironwork to safe, beautiful condition. Structural welding, rust remediation, component replacement, and protective refinishing.",
                cta: "Get Estimate"
              }
            ].map((service, index) => (
              <Card key={index} className="p-8 border-4 border-border hover:border-accent transition-colors">
                <div className="w-16 h-16 bg-accent/20 flex items-center justify-center mb-6">
                  <service.icon className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-heading text-2xl mb-4">{service.title}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">{service.description}</p>
                <Link href="/contact">
                  <Button variant="outline" className="w-full thick-border">
                    {service.cta}
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
              GET YOUR FREE BALCONY CONSULTATION
            </h2>
            <p className="text-xl text-sidebar-foreground/80 mb-8">
              On-site assessment, custom design consultation, and detailed quote—all at no cost.
              Serving Boston, Cambridge, Somerville, and surrounding areas.
            </p>
            {/* Go High Level Form Integration */}
            <div className="max-w-2xl mx-auto mt-8">
              <GHLFormPlaceholder service="Balcony" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8 py-6 thick-border">
                  REQUEST FREE CONSULTATION
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href={`tel:${phone.tel}`}>
                <Button size="lg" variant="outline" className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10 text-lg px-8 py-6 thick-border">
                  <Phone className="mr-2 w-5 h-5" />
                  {phone.display}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
