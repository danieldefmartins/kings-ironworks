import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Shield, Clock, Award, Phone, AlertTriangle, Wrench } from "lucide-react";
import GHLFormPlaceholder from "@/components/GHLFormPlaceholder";

/**
 * DESIGN PHILOSOPHY: Industrial Heritage Brutalism
 * Fire Escape Landing Page - High-converting, SEO-optimized
 * Focus: Licensed installation, safety compliance, emergency repairs
 */

export default function FireEscapeLanding() {
  return (
    <div className="min-h-screen">
      {/* SEO-Optimized Hero with Urgency */}
      <section className="relative min-h-[85vh] flex items-center bg-sidebar text-sidebar-foreground overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://private-us-east-1.manuscdn.com/sessionFile/PiC3jiX2zwECev1AbbjVmI/sandbox/EZosCpyNGdemuQ1YieLnnr-img-2_1770786316000_na1fn_Zmlyci1lc2NhcGUtaW5zdGFsbGF0aW9u.png"
            alt="Fire escape installation Boston"
            className="w-full h-full object-cover opacity-40"
          />
        </div>
        
        <div className="container relative z-10">
          <div className="max-w-4xl">
            {/* Urgency Badge */}
            <div className="inline-block px-4 py-2 bg-destructive text-destructive-foreground text-sm font-display font-bold tracking-wider mb-6 thick-border animate-pulse">
              ⚠️ LICENSED & CERTIFIED INSTALLER
            </div>
            
            <h1 className="text-display text-5xl md:text-7xl lg:text-8xl mb-6 leading-tight">
              BOSTON FIRE ESCAPE INSTALLATION & REPAIR
            </h1>
            
            <p className="text-xl md:text-2xl text-sidebar-foreground/90 mb-8 max-w-3xl leading-relaxed">
              Licensed fire escape specialists serving Boston for 20+ years. Code-compliant installation, 
              emergency repairs, and 5-year certifications. Same-day emergency service available.
            </p>

            {/* Dual CTA */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <a href="tel:8578881468">
                <Button size="lg" className="bg-destructive hover:bg-destructive/90 text-lg px-8 py-6 thick-border group">
                  <Phone className="mr-2 w-6 h-6 group-hover:animate-bounce" />
                  CALL NOW: (857) 888-1468
                </Button>
              </a>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10 text-lg px-8 py-6 thick-border">
                  FREE ASSESSMENT
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
                <span>24/7 Emergency Service</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-accent" />
                <span>20+ Years Experience</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-accent/20 border-2 border-accent">
                <span className="text-xl">🎖️</span>
                <span className="font-display font-bold">10% MILITARY DISCOUNT</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us - Social Proof */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-20">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            WHY BOSTON TRUSTS KINGS IRONWORKS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-6xl font-display font-black mb-2">500+</div>
              <div className="text-lg">Fire Escapes Installed</div>
            </div>
            <div>
              <div className="text-6xl font-display font-black mb-2">100%</div>
              <div className="text-lg">Code Compliant</div>
            </div>
            <div>
              <div className="text-6xl font-display font-black mb-2">24/7</div>
              <div className="text-lg">Emergency Response</div>
            </div>
            <div>
              <div className="text-6xl font-display font-black mb-2">20+</div>
              <div className="text-lg">Years Licensed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services - Clear Value Props */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            COMPREHENSIVE FIRE ESCAPE SERVICES
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Wrench,
                title: "New Installation",
                description: "Code-compliant fire escape installation for residential and commercial buildings. Engineered to meet all Boston building codes and safety standards.",
                cta: "Get Quote"
              },
              {
                icon: AlertTriangle,
                title: "Emergency Repairs",
                description: "24/7 emergency fire escape repair service. Structural damage, rust repair, and safety violations corrected immediately.",
                cta: "Call Now"
              },
              {
                icon: CheckCircle2,
                title: "5-Year Inspections",
                description: "Required 5-year fire escape inspections and certifications. Ensure compliance with Boston Fire Department regulations.",
                cta: "Schedule Inspection"
              },
              {
                icon: Shield,
                title: "Structural Reinforcement",
                description: "Strengthen aging fire escapes with modern engineering. Extend the life of your existing system while maintaining code compliance.",
                cta: "Learn More"
              },
              {
                icon: Wrench,
                title: "Rust & Corrosion Repair",
                description: "Professional rust removal, surface treatment, and protective coating application. Prevent future deterioration.",
                cta: "Get Assessment"
              },
              {
                icon: Award,
                title: "Certification Services",
                description: "Official fire escape certification for insurance and compliance. Fast turnaround, detailed documentation provided.",
                cta: "Get Certified"
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

      {/* Emergency CTA */}
      <section className="diagonal-cut-top bg-destructive text-destructive-foreground py-20">
        <div className="container text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-6 animate-pulse" />
          <h2 className="text-display text-4xl md:text-5xl mb-6">
            FIRE ESCAPE EMERGENCY?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Structural failure, rust damage, or safety violations require immediate attention. 
            Our licensed team responds 24/7 to emergency calls.
          </p>
          <a href="tel:8578881468">
            <Button size="lg" variant="outline" className="border-destructive-foreground text-destructive-foreground hover:bg-destructive-foreground hover:text-destructive text-xl px-12 py-8 thick-border">
              <Phone className="mr-3 w-8 h-8" />
              CALL EMERGENCY LINE: (857) 888-1468
            </Button>
          </a>
        </div>
      </section>

      {/* Final CTA */}
      <section className="diagonal-cut-top bg-sidebar text-sidebar-foreground py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-display text-4xl md:text-5xl mb-6">
              GET YOUR FREE FIRE ESCAPE ASSESSMENT
            </h2>
            <p className="text-xl text-sidebar-foreground/80 mb-8">
              Licensed inspection, detailed quote, and compliance guidance—all at no cost. 
              Serving Boston, Cambridge, Somerville, and surrounding areas.
            </p>
            {/* Go High Level Form Integration */}
            <div className="max-w-2xl mx-auto mt-8">
              <GHLFormPlaceholder service="Fire Escape" />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8 py-6 thick-border">
                  REQUEST FREE ASSESSMENT
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
