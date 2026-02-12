import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Landmark, Palette, History, Phone, Award, Shield } from "lucide-react";
import GHLFormPlaceholder from "@/components/GHLFormPlaceholder";

/**
 * DESIGN PHILOSOPHY: Industrial Heritage Brutalism
 * Building Restoration Landing Page - High-converting, SEO-optimized
 * Focus: Historic restoration, custom ironwork, before/after projects
 */

export default function BuildingRestorationLanding() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center bg-sidebar text-sidebar-foreground overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://private-us-east-1.manuscdn.com/sessionFile/PiC3jiX2zwECev1AbbjVmI/sandbox/EZosCpyNGdemuQ1YieLnnr-img-5_1770786316000_na1fn_Ym9zdG9uLWhpc3RvcmljLWJ1aWxkaW5n.png"
            alt="Historic building restoration Boston"
            className="w-full h-full object-cover opacity-40"
          />
        </div>
        
        <div className="container relative z-10">
          <div className="max-w-4xl">
            <div className="inline-block px-4 py-2 bg-accent/20 border-2 border-accent text-sm font-display font-bold tracking-wider mb-6">
              🏛️ BOSTON HISTORIC RESTORATION SPECIALISTS
            </div>
            
            <h1 className="text-display text-5xl md:text-7xl lg:text-8xl mb-6 leading-tight">
              HISTORIC BUILDING RESTORATION & CUSTOM IRONWORK
            </h1>
            
            <p className="text-xl md:text-2xl text-sidebar-foreground/90 mb-8 max-w-3xl leading-relaxed">
              Preserving Boston's architectural heritage since 2004. Custom artisan fabrication for 
              historic ironwork that's no longer commercially available. From Beacon Hill to the South End.
            </p>

            {/* Dual CTA */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8 py-6 thick-border">
                  VIEW OUR PORTFOLIO
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
                <span className="text-2xl">🏛️</span>
                <span className="font-display font-bold">HISTORIC SPECIALISTS</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-accent/20 border-2 border-accent">
                <span className="text-2xl">🎖️</span>
                <span className="font-display font-bold">10% MILITARY DISCOUNT</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-accent/20 border-2 border-accent">
                <span className="text-2xl">⚙️</span>
                <span className="font-display font-bold">IN-HOUSE ARTISANS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Restore */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            HISTORIC IRONWORK RESTORATION SERVICES
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Landmark,
                title: "Ornamental Railings",
                description: "Victorian, Art Nouveau, and Art Deco railings recreated from photographs or fragments. Period-accurate casting and finishing.",
                examples: ["Stair railings", "Balcony railings", "Porch railings", "Roof railings"]
              },
              {
                icon: Palette,
                title: "Decorative Gates & Fences",
                description: "Custom wrought iron gates and fencing that match original designs. Hand-forged scrollwork and ornamental details.",
                examples: ["Entry gates", "Garden gates", "Property fencing", "Courtyard gates"]
              },
              {
                icon: History,
                title: "Window Guards & Grilles",
                description: "Historic window protection recreated to original specifications. Decorative security that preserves architectural character.",
                examples: ["Window guards", "Basement grilles", "Security bars", "Decorative screens"]
              },
              {
                icon: Landmark,
                title: "Architectural Details",
                description: "Finials, brackets, corbels, and ornamental elements. Custom fabrication when originals are damaged or missing.",
                examples: ["Finials", "Brackets", "Corbels", "Rosettes"]
              },
              {
                icon: Shield,
                title: "Structural Restoration",
                description: "Repair and reinforce historic iron beams, columns, and supports while maintaining original appearance.",
                examples: ["Cast iron columns", "Structural beams", "Support brackets", "Lintels"]
              },
              {
                icon: Award,
                title: "Custom Replication",
                description: "Exact replicas of unavailable historic ironwork. We work from photos, drawings, or existing fragments.",
                examples: ["Missing elements", "Damaged pieces", "Period additions", "Matching sets"]
              }
            ].map((service, index) => (
              <Card key={index} className="p-8 border-4 border-border hover:border-accent transition-colors">
                <div className="w-16 h-16 bg-accent/20 flex items-center justify-center mb-6">
                  <service.icon className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-heading text-2xl mb-4">{service.title}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">{service.description}</p>
                <ul className="space-y-2 mb-6">
                  {service.examples.map((example, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/contact">
                  <Button variant="outline" className="w-full thick-border">
                    Discuss Project
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Before/After Projects Placeholder */}
      <section className="diagonal-cut-top bg-secondary text-secondary-foreground py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-8">
            RESTORATION PROJECTS
          </h2>
          <p className="text-center text-xl text-secondary-foreground/80 mb-16 max-w-3xl mx-auto">
            See how we've preserved Boston's architectural heritage through meticulous restoration 
            and custom fabrication. Each project tells a story of craftsmanship and attention to detail.
          </p>
          
          {/* Project Showcase - Ready for real photos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {[
              {
                title: "Beacon Hill Brownstone Railings",
                location: "Beacon Hill, Boston",
                year: "2023",
                description: "Complete restoration of 1890s Victorian railings. Custom cast ornamental details recreated from historical photographs.",
                scope: ["Hand-forged scrollwork", "Period-accurate finials", "Rust removal & coating", "Structural reinforcement"]
              },
              {
                title: "South End Fire Escape Restoration",
                location: "South End, Boston",
                year: "2023",
                description: "Historic fire escape restoration maintaining original decorative elements while ensuring modern safety compliance.",
                scope: ["Ornamental brackets", "Cast iron details", "Safety upgrades", "Historic certification"]
              },
              {
                title: "Back Bay Window Guards",
                location: "Back Bay, Boston",
                year: "2022",
                description: "Recreated Art Nouveau window guards from fragments. Custom casting to match 1910 original design.",
                scope: ["Pattern recreation", "Custom casting", "Hand finishing", "Period paint analysis"]
              },
              {
                title: "Cambridge Historic Gate",
                location: "Cambridge, MA",
                year: "2022",
                description: "Complete fabrication of missing entrance gate based on architectural drawings and period research.",
                scope: ["Historical research", "CAD design", "Hand forging", "Patina matching"]
              }
            ].map((project, index) => (
              <Card key={index} className="p-8 border-4 border-border bg-card text-card-foreground">
                <div className="mb-6">
                  <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground mb-4">
                    <div className="text-center">
                      <Landmark className="w-16 h-16 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Before/After Photos Coming Soon</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">{project.location}</span>
                  <span className="text-sm text-muted-foreground">{project.year}</span>
                </div>
                
                <h3 className="text-heading text-2xl mb-4">{project.title}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">{project.description}</p>
                
                <div className="space-y-2">
                  <p className="text-sm font-heading">Project Scope:</p>
                  <ul className="space-y-2">
                    {project.scope.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link href="/portfolio">
              <Button size="lg" variant="outline" className="border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10 thick-border">
                VIEW FULL PORTFOLIO
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Our Process */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-20">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            OUR RESTORATION PROCESS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Assessment & Research", description: "Document existing conditions, research historical records, and analyze original construction methods." },
              { step: "02", title: "Design & Approval", description: "Create detailed drawings, obtain historical commission approval, and coordinate with preservation authorities." },
              { step: "03", title: "Artisan Fabrication", description: "Hand-forge, cast, or machine custom elements in our shop. Traditional techniques meet modern precision." },
              { step: "04", title: "Installation & Finishing", description: "Professional installation, period-appropriate finishing, and final inspection with documentation." }
            ].map((phase, index) => (
              <div key={index} className="text-center">
                <div className="text-6xl font-display font-black mb-4">{phase.step}</div>
                <h3 className="text-heading text-xl mb-3">{phase.title}</h3>
                <p className="text-accent-foreground/80 text-sm">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            WHY PROPERTY OWNERS CHOOSE KINGS IRONWORKS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 border-4 border-border">
              <h3 className="text-heading text-2xl mb-4">Custom Fabrication</h3>
              <p className="text-muted-foreground leading-relaxed">
                We recreate ironwork that's no longer available. From fragments or photos, our artisans 
                craft period-accurate replicas indistinguishable from originals.
              </p>
            </Card>

            <Card className="p-8 border-4 border-border">
              <h3 className="text-heading text-2xl mb-4">Historic Expertise</h3>
              <p className="text-muted-foreground leading-relaxed">
                20+ years working with Boston's historic properties. We understand preservation guidelines, 
                historical commission requirements, and period construction methods.
              </p>
            </Card>

            <Card className="p-8 border-4 border-border">
              <h3 className="text-heading text-2xl mb-4">In-House Artisans</h3>
              <p className="text-muted-foreground leading-relaxed">
                All work done in our Everett facility by skilled craftsmen. Complete control over quality, 
                timeline, and authenticity. No outsourcing, no compromises.
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
              START YOUR RESTORATION PROJECT
            </h2>
            <p className="text-xl text-sidebar-foreground/80 mb-8">
              Free consultation and project assessment. We'll review your historic property, 
              discuss restoration options, and provide detailed proposals.
            </p>
            
            {/* Go High Level Form Integration */}
            <div className="max-w-2xl mx-auto mb-8">
              <GHLFormPlaceholder service="Building Restoration" />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8 py-6 thick-border">
                  SCHEDULE CONSULTATION
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
