import { Button } from "@/components/ui/button";

import { PHONE_NUMBERS } from "@/lib/constants";
import { PhoneLink } from "@/components/PhoneLink";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { 
  Shield, Building2, Wrench, Hammer, 
  CheckCircle2, ArrowRight, Phone, FileCheck 
} from "lucide-react";

export default function Services() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center bg-sidebar text-sidebar-foreground pt-4">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/fabrication-shop-interior.webp"
            alt="Fabrication shop"
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        <div className="container relative z-10">
          <h1 className="text-display text-5xl md:text-7xl mb-6">OUR SERVICES</h1>
          <p className="text-xl md:text-2xl text-sidebar-foreground/80 max-w-2xl">
            Comprehensive ironwork solutions from consultation to installation
          </p>
        </div>
      </section>

      {/* Fire Escape Services */}
      <section id="fire-escape" className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <div className="inline-block px-4 py-2 bg-accent/10 text-accent text-sm font-display font-bold tracking-wider mb-4">
                LICENSED & CERTIFIED
              </div>
              <h2 className="text-display text-4xl md:text-5xl mb-6">FIRE ESCAPE SERVICES</h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                As a licensed fire escape installer in Massachusetts, we provide comprehensive services 
                to ensure your building meets all safety codes and regulations. From new installations to 
                repairs and mandatory inspections, we handle every aspect of fire escape compliance.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span>MA State Building Code compliant installations</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span>5-year inspection certification</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span>Emergency repair services available</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span>Structural engineering coordination</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link href="/fire-escape">
                  <Button size="lg" className="bg-accent hover:bg-accent/90 thick-border">
                    LEARN MORE
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="border-2 border-border hover:border-accent hover:bg-accent hover:text-accent-foreground thick-border">
                    REQUEST INSPECTION
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
            <div>
              <img
                src="/images/fire-escape-installation.webp"
                alt="Fire escape installation"
                className="w-full h-[500px] object-cover border-8 border-border"
              />
            </div>
          </div>

          {/* Fire Escape Service Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border-4 border-border">
              <Shield className="w-10 h-10 text-accent mb-4" />
              <h3 className="text-heading text-xl mb-3">Installation</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                New fire escape design and installation for residential and commercial buildings. 
                Engineered to meet all MA building codes.
              </p>
            </Card>
            <Card className="p-6 border-4 border-border">
              <Wrench className="w-10 h-10 text-accent mb-4" />
              <h3 className="text-heading text-xl mb-3">Repairs</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Structural repairs, rust remediation, stair replacement, and railing restoration. 
                Emergency services available.
              </p>
            </Card>
            <Card className="p-6 border-4 border-border">
              <FileCheck className="w-10 h-10 text-accent mb-4" />
              <h3 className="text-heading text-xl mb-3">Certification</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Mandatory 5-year inspections and certification. Load testing and structural 
                assessment by licensed professionals.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Historic Restoration */}
      <section id="historic" className="diagonal-cut-top bg-secondary text-secondary-foreground py-24">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <img
                src="/images/boston-historic-building.webp"
                alt="Historic building"
                className="w-full h-[500px] object-cover border-8 border-border"
              />
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-block px-4 py-2 bg-accent/20 text-accent text-sm font-display font-bold tracking-wider mb-4">
                ARTISAN CRAFTSMANSHIP
              </div>
              <h2 className="text-display text-4xl md:text-5xl mb-6">HISTORIC BUILDING RESTORATION</h2>
              <p className="text-lg text-secondary-foreground/80 leading-relaxed mb-6">
                Boston's historic buildings deserve authentic restoration that honors their original 
                craftsmanship. Our state-of-the-art Everett facility allows us to recreate any historic 
                ironwork design from scratch—even pieces that are no longer commercially available.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span>Custom replication of unavailable historic designs</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span>Period-accurate materials and techniques</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span>Beacon Hill, South End, Back Bay expertise</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span>Historical commission collaboration</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link href="/building-restoration">
                  <Button size="lg" className="bg-accent hover:bg-accent/90 thick-border">
                    LEARN MORE
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="border-2 border-border hover:border-accent hover:bg-accent hover:text-accent-foreground thick-border">
                    FREE ASSESSMENT
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Ironwork */}
      <section id="custom" className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-accent/10 text-accent text-sm font-display font-bold tracking-wider mb-4">
              DESIGNED & FABRICATED IN-HOUSE
            </div>
            <h2 className="text-display text-4xl md:text-5xl mb-6">CUSTOM IRONWORK</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              From concept to installation, we handle every aspect of custom ironwork fabrication 
              in our state-of-the-art Everett facility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              { href: "/interior-railing", title: "Interior Railings", desc: "Custom staircase railings, balustrades, and interior handrails for homes and commercial spaces." },
              { href: "/exterior-railing", title: "Exterior Railings", desc: "Weather-resistant porch, deck, and exterior railings built to withstand New England conditions." },
              { href: "/cable-railing", title: "Cable Railings", desc: "Modern cable railing systems for decks, balconies, and staircases with sleek, minimalist design." },
              { href: "/deck-railing", title: "Deck Railings", desc: "Durable iron deck railing systems that combine safety with curb appeal." },
              { href: "/handrail", title: "Handrails", desc: "ADA-compliant pipe handrails and custom handrail solutions for stairs and ramps." },
              { href: "/gate", title: "Gates", desc: "Custom entry gates, driveway gates, garden gates, and security gates with optional automation." },
              { href: "/fence", title: "Fences", desc: "Ornamental iron fencing and perimeter enclosures for residential and commercial properties." },
              { href: "/balcony", title: "Balconies", desc: "Custom balcony railings and Juliet balconies crafted for safety and style." },
              { href: "/window", title: "Window Guards", desc: "Decorative and security window grilles, guards, and custom iron window frames." },
              { href: "/window-well", title: "Window Well Covers", desc: "Custom iron window well grates and covers for basement safety and protection." },
              { href: "/structural-steel", title: "Structural Steel", desc: "I-beams, mezzanines, support columns, and structural steel fabrication for commercial applications." },
            ].map((service) => (
              <Link key={service.href} href={service.href}>
                <Card className="p-6 border-4 border-border hover:border-accent transition-all cursor-pointer h-full group">
                  <h3 className="text-heading text-xl mb-3 group-hover:text-accent transition-colors">{service.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {service.desc}
                  </p>
                  <span className="text-accent font-display font-bold text-sm tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    LEARN MORE <ArrowRight className="w-4 h-4" />
                  </span>
                </Card>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <img
              src="/images/custom-iron-gate.webp"
              alt="Custom iron gate"
              className="w-full max-w-2xl mx-auto h-[600px] object-cover border-8 border-border mb-8"
            />
            <Link href="/portfolio">
              <Button size="lg" variant="outline" className="border-2 border-border hover:border-accent hover:bg-accent hover:text-accent-foreground thick-border">
                VIEW CUSTOM WORK GALLERY
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">OUR PROCESS</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-6xl font-display font-black mb-4">01</div>
              <h3 className="text-heading text-xl mb-3">CONSULTATION</h3>
              <p className="opacity-90">
                Free on-site assessment and expert guidance on your ironwork needs
              </p>
            </div>
            <div className="text-center">
              <div className="text-6xl font-display font-black mb-4">02</div>
              <h3 className="text-heading text-xl mb-3">DESIGN</h3>
              <p className="opacity-90">
                Custom designs tailored to your space, style, and requirements
              </p>
            </div>
            <div className="text-center">
              <div className="text-6xl font-display font-black mb-4">03</div>
              <h3 className="text-heading text-xl mb-3">FABRICATION</h3>
              <p className="opacity-90">
                Precision crafting in our state-of-the-art Everett facility
              </p>
            </div>
            <div className="text-center">
              <div className="text-6xl font-display font-black mb-4">04</div>
              <h3 className="text-heading text-xl mb-3">INSTALLATION</h3>
              <p className="opacity-90">
                Professional installation with attention to detail and safety
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="diagonal-cut-top bg-sidebar text-sidebar-foreground py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-display text-4xl md:text-5xl mb-6">START YOUR PROJECT TODAY</h2>
            <p className="text-xl text-sidebar-foreground/80 mb-8">
              Get a free consultation and quote from Boston's premier ironwork specialists
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8 py-6 thick-border">
                  REQUEST QUOTE
                  <ArrowRight className="ml-2 w-5 h-5" />
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
