import { Button } from "@/components/ui/button";
import { PHONE_NUMBERS } from "@/lib/constants";
import { useLocalPhone } from "@/lib/useLocalPhone";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Shield, Clock, Award, Phone, Wrench, Paintbrush } from "lucide-react";
import GHLFormPlaceholder from "@/components/GHLFormPlaceholder";

/**
 * DESIGN PHILOSOPHY: Industrial Heritage Brutalism
 * Interior Railing Landing Page - High-converting, SEO-optimized
 * Focus: Custom staircase railings, modern & traditional designs, code-compliant installation
 */

export default function InteriorRailingLanding() {
  const phone = useLocalPhone();

  return (
    <div className="min-h-screen">
      {/* SEO-Optimized Hero */}
      <section className="relative min-h-[85vh] flex items-center bg-sidebar text-sidebar-foreground overflow-hidden pt-4">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/apLcldtAeVXzDTCh.JPG"
            alt="Custom interior railing installation Boston"
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
              CUSTOM INTERIOR RAILING DESIGN & INSTALLATION
            </h1>

            <p className="text-base md:text-2xl text-sidebar-foreground/90 mb-6 md:mb-8 max-w-3xl leading-relaxed">
              Transform your home with handcrafted interior railings built to last a lifetime.
              From modern cable systems to classic wrought iron, every railing is 100% custom
              designed and fabricated in our shop. 20+ years of trusted craftsmanship.
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
              <div className="text-6xl font-display font-black mb-2">500+</div>
              <div className="text-lg">Railings Installed</div>
            </div>
            <div>
              <div className="text-6xl font-display font-black mb-2">100%</div>
              <div className="text-lg">Custom Designed</div>
            </div>
            <div>
              <div className="text-6xl font-display font-black mb-2">20+</div>
              <div className="text-lg">Years Licensed</div>
            </div>
            <div>
              <div className="text-6xl font-display font-black mb-2">∞</div>
              <div className="text-lg">Lifetime Warranty</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Cards */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            INTERIOR RAILING SERVICES
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Wrench,
                title: "Custom Staircase Railings",
                description: "Handcrafted staircase railings designed to complement your home's architecture. Every detail—from balusters to newel posts—is custom fabricated to your specifications.",
                cta: "Get Quote"
              },
              {
                icon: Wrench,
                title: "Spiral Staircase Railings",
                description: "Precision-engineered spiral staircase railings that combine structural integrity with stunning design. Built to code with flawless curves and transitions.",
                cta: "Get Quote"
              },
              {
                icon: Paintbrush,
                title: "Modern & Contemporary Designs",
                description: "Clean lines, minimalist profiles, and premium materials. Stainless steel, glass panel, and cable railing systems for modern interiors.",
                cta: "See Designs"
              },
              {
                icon: Shield,
                title: "Traditional Wrought Iron",
                description: "Classic wrought iron railings with hand-forged scrollwork, twists, and ornamental details. Timeless craftsmanship that adds character and value to any home.",
                cta: "Learn More"
              },
              {
                icon: CheckCircle2,
                title: "Balustrade Systems",
                description: "Complete balustrade systems including handrails, balusters, and newel posts. Designed as a unified system for seamless integration with your staircase.",
                cta: "Get Quote"
              },
              {
                icon: Award,
                title: "Code-Compliant Installation",
                description: "Every installation meets or exceeds local building codes and safety standards. Licensed installers, proper permits, and final inspection coordination included.",
                cta: "Schedule Consultation"
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
              GET YOUR FREE INTERIOR RAILING CONSULTATION
            </h2>
            <p className="text-xl text-sidebar-foreground/80 mb-8">
              Custom design consultation, detailed quote, and material samples—all at no cost.
              Serving Boston, Cambridge, Somerville, and surrounding areas.
            </p>
            {/* Go High Level Form Integration */}
            <div className="max-w-2xl mx-auto mt-8">
              <GHLFormPlaceholder service="Interior Railing" />
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
