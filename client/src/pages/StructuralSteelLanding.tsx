import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Building2, Ruler, Zap, Phone, Award, Shield } from "lucide-react";

/**
 * DESIGN PHILOSOPHY: Industrial Heritage Brutalism
 * Structural Steel Landing Page - High-converting, SEO-optimized
 * Focus: Custom fabrication, commercial projects, American-made steel
 */

export default function StructuralSteelLanding() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center bg-sidebar text-sidebar-foreground overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://private-us-east-1.manuscdn.com/sessionFile/PiC3jiX2zwECev1AbbjVmI/sandbox/EZosCpyNGdemuQ1YieLnnr-img-3_1770786316000_na1fn_ZmFicmljYXRpb24tc2hvcC1pbnRlcmlvcg.png"
            alt="Structural steel fabrication Boston"
            className="w-full h-full object-cover opacity-40"
          />
        </div>
        
        <div className="container relative z-10">
          <div className="max-w-4xl">
            <div className="inline-block px-4 py-2 bg-accent/20 border-2 border-accent text-sm font-display font-bold tracking-wider mb-6">
              🇺🇸 100% AMERICAN-MADE STEEL
            </div>
            
            <h1 className="text-display text-5xl md:text-7xl lg:text-8xl mb-6 leading-tight">
              CUSTOM STRUCTURAL STEEL FABRICATION
            </h1>
            
            <p className="text-xl md:text-2xl text-sidebar-foreground/90 mb-8 max-w-3xl leading-relaxed">
              State-of-the-art fabrication facility in Everett, MA. From architectural steel to 
              heavy structural beams—engineered, fabricated, and installed by American craftsmen.
            </p>

            {/* Dual CTA */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8 py-6 thick-border">
                  GET PROJECT QUOTE
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="tel:8578881468">
                <Button size="lg" variant="outline" className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10 text-lg px-8 py-6 thick-border">
                  <Phone className="mr-2 w-5 h-5" />
                  (857) 888-1468
                </Button>
              </a>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-accent/20 border-2 border-accent">
                <span className="text-2xl">⚙️</span>
                <span className="font-display font-bold">MADE IN USA</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-accent/20 border-2 border-accent">
                <span className="text-2xl">🎖️</span>
                <span className="font-display font-bold">10% MILITARY DISCOUNT</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-accent/20 border-2 border-accent">
                <span className="text-2xl">⭐</span>
                <span className="font-display font-bold">20+ YEARS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            FULL-SERVICE STEEL FABRICATION
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Building2,
                title: "Structural Beams & Columns",
                description: "Heavy structural steel for commercial and residential construction. Custom-cut beams, columns, and load-bearing elements engineered to specification.",
                features: ["W-beams & I-beams", "HSS columns", "Load calculations", "Seismic design"]
              },
              {
                icon: Ruler,
                title: "Architectural Steel",
                description: "Decorative and functional steel elements for modern architecture. Staircases, mezzanines, canopies, and custom architectural features.",
                features: ["Steel staircases", "Mezzanine platforms", "Canopy systems", "Feature walls"]
              },
              {
                icon: Zap,
                title: "Custom Fabrication",
                description: "From concept to installation. Our in-house team handles design, engineering, fabrication, and on-site installation.",
                features: ["CAD design", "CNC cutting", "Precision welding", "On-site install"]
              },
              {
                icon: Shield,
                title: "Industrial Steel",
                description: "Heavy-duty steel fabrication for industrial applications. Equipment supports, platforms, railings, and safety systems.",
                features: ["Equipment frames", "Access platforms", "Safety railings", "Pipe supports"]
              },
              {
                icon: Building2,
                title: "Commercial Projects",
                description: "Large-scale commercial steel fabrication. Multi-story buildings, retail spaces, warehouses, and mixed-use developments.",
                features: ["Multi-story framing", "Retail storefronts", "Warehouse structures", "Parking structures"]
              },
              {
                icon: Award,
                title: "Residential Steel",
                description: "Modern residential steel elements. Open-plan supports, loft conversions, basement underpinning, and structural reinforcement.",
                features: ["Loft conversions", "Basement support", "Open-plan beams", "Structural repair"]
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

      {/* Process */}
      <section className="diagonal-cut-top bg-secondary text-secondary-foreground py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            OUR FABRICATION PROCESS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Consultation & Design", description: "Review your project requirements, provide engineering consultation, and create detailed CAD drawings." },
              { step: "02", title: "Engineering & Approval", description: "Structural calculations, load analysis, and building department approval coordination." },
              { step: "03", title: "Fabrication", description: "Precision cutting, welding, and finishing in our state-of-the-art Everett facility." },
              { step: "04", title: "Installation", description: "Professional on-site installation by our licensed team. Final inspection and certification." }
            ].map((phase, index) => (
              <div key={index} className="text-center">
                <div className="text-6xl font-display font-black text-accent mb-4">{phase.step}</div>
                <h3 className="text-heading text-xl mb-3">{phase.title}</h3>
                <p className="text-secondary-foreground/80 text-sm">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-20">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            WHY KINGS IRONWORKS FOR STRUCTURAL STEEL
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 border-4 border-border bg-card text-card-foreground">
              <h3 className="text-heading text-2xl mb-4">In-House Fabrication</h3>
              <p className="text-muted-foreground leading-relaxed">
                Complete control over quality and timeline. Our 15,000 sq ft Everett facility handles 
                everything from design to finishing—no outsourcing.
              </p>
            </Card>

            <Card className="p-8 border-4 border-border bg-card text-card-foreground">
              <h3 className="text-heading text-2xl mb-4">Licensed & Insured</h3>
              <p className="text-muted-foreground leading-relaxed">
                Fully licensed structural steel contractor. $2M liability insurance. All work meets 
                Massachusetts building codes and AISC standards.
              </p>
            </Card>

            <Card className="p-8 border-4 border-border bg-card text-card-foreground">
              <h3 className="text-heading text-2xl mb-4">American Made</h3>
              <p className="text-muted-foreground leading-relaxed">
                100% American steel, American workers, American quality. Supporting local manufacturing 
                and delivering superior craftsmanship.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="diagonal-cut-top bg-sidebar text-sidebar-foreground py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-display text-4xl md:text-5xl mb-6">
              START YOUR STRUCTURAL STEEL PROJECT
            </h2>
            <p className="text-xl text-sidebar-foreground/80 mb-8">
              Free consultation, detailed engineering drawings, and competitive pricing. 
              Serving Boston, Cambridge, Somerville, and all of Massachusetts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8 py-6 thick-border">
                  REQUEST PROJECT QUOTE
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="tel:8578881468">
                <Button size="lg" variant="outline" className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10 text-lg px-8 py-6 thick-border">
                  <Phone className="mr-2 w-5 h-5" />
                  (857) 888-1468
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
