import { Button } from "@/components/ui/button";
import { PHONE_NUMBERS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Shield, Clock, Award, Phone, AlertTriangle, Wrench, Star } from "lucide-react";
import GHLFormPlaceholder from "@/components/GHLFormPlaceholder";

/**
 * DESIGN PHILOSOPHY: Conversion-First Landing Page
 * Fire Escape Landing — optimized for Google Ads traffic
 * Goal: phone call or form fill within 10 seconds of landing
 * 102 clicks, 0 conversions → this page needs to CLOSE, not inform
 */

export default function FireEscapeLanding() {
  return (
    <div className="min-h-screen">
      {/* Hero — Phone number is the hero, not the background image */}
      <section className="relative min-h-[80vh] flex items-center bg-sidebar text-sidebar-foreground overflow-hidden pt-4">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/YgqFSongHOumLnae.JPG"
            alt="Fire escape installation Boston"
            className="w-full h-full object-cover opacity-30"
          />
        </div>

        <div className="container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Message + CTA */}
            <div>
              <div className="inline-block px-3 py-1.5 bg-destructive text-destructive-foreground text-xs md:text-sm font-display font-bold tracking-wider mb-4">
                LICENSED FIRE ESCAPE CONTRACTOR
              </div>

              <h1 className="text-display text-3xl md:text-6xl lg:text-7xl mb-4 leading-tight">
                FIRE ESCAPE REPAIR & CERTIFICATION
              </h1>

              <p className="text-lg md:text-xl text-sidebar-foreground/90 mb-6 max-w-xl leading-relaxed">
                Got a violation notice? We respond within 24 hours. Licensed, insured, and
                code-compliant — serving Massachusetts & New Hampshire for 20+ years.
              </p>

              {/* Phone — THE primary CTA, large and unmissable */}
              <a href={`tel:${PHONE_NUMBERS.MAIN.tel}`} className="block mb-6">
                <Button size="lg" className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-xl md:text-2xl px-8 py-8 thick-border group">
                  <Phone className="mr-3 w-7 h-7 group-hover:animate-bounce" />
                  {PHONE_NUMBERS.MAIN.display}
                </Button>
              </a>

              <p className="text-sm text-sidebar-foreground/60 mb-8">
                Call now for same-week scheduling. Free phone estimates.
              </p>

              {/* Trust signals — compact */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-accent" />
                  <span>Licensed & Insured</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-accent" />
                  <span>Same-Week Service</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-accent" />
                  <span>20+ Years</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-accent/20 border border-accent">
                  <span className="font-display font-bold text-xs">10% MILITARY DISCOUNT</span>
                </div>
              </div>
            </div>

            {/* Right: Lead form — visible without scrolling */}
            <div className="bg-card text-card-foreground p-6 border-4 border-accent rounded-lg">
              <h2 className="text-heading text-2xl mb-2 text-center">GET YOUR FREE ESTIMATE</h2>
              <p className="text-sm text-muted-foreground text-center mb-4">
                We'll call you back within 2 hours during business hours
              </p>
              <GHLFormPlaceholder service="Fire Escape" variant="compact" />
            </div>
          </div>
        </div>
      </section>

      {/* Urgency Banner — for violation-driven visitors */}
      <section className="bg-destructive text-destructive-foreground py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 flex-shrink-0" />
              <div>
                <p className="font-display font-bold text-lg">Received a violation notice?</p>
                <p className="text-sm opacity-90">We handle emergency inspections & repairs. Call before 5pm for same-week scheduling.</p>
              </div>
            </div>
            <a href={`tel:${PHONE_NUMBERS.MAIN.tel}`} className="flex-shrink-0">
              <Button size="lg" variant="outline" className="border-destructive-foreground text-destructive-foreground hover:bg-destructive-foreground hover:text-destructive px-6 py-4 thick-border whitespace-nowrap">
                <Phone className="mr-2 w-5 h-5" />
                CALL NOW
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* What We Do — 3 cards, not 6. Focus. */}
      <section className="bg-card py-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Wrench,
                title: "Repair & Restoration",
                points: ["Structural rust repair", "Emergency same-week service", "Code violation corrections", "Protective coating & painting"],
              },
              {
                icon: CheckCircle2,
                title: "Inspection & Certification",
                points: ["Mandatory 5-year inspections", "Load testing & assessment", "Certificate issued in 1-2 days", "Compliance documentation"],
              },
              {
                icon: Shield,
                title: "New Installation",
                points: ["Engineered to building code", "Residential & commercial", "In-house fabrication", "Permit coordination included"],
              },
            ].map((service, index) => (
              <Card key={index} className="p-6 border-4 border-border hover:border-accent transition-colors">
                <div className="w-12 h-12 bg-accent/20 flex items-center justify-center mb-4">
                  <service.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-heading text-xl mb-4">{service.title}</h3>
                <ul className="space-y-2">
                  {service.points.map((point, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof — compact stats + review */}
      <section className="bg-sidebar text-sidebar-foreground py-16">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center mb-12">
            <div>
              <div className="text-4xl md:text-5xl font-display font-black text-accent mb-1">500+</div>
              <div className="text-sm">Fire Escapes Serviced</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-display font-black text-accent mb-1">100%</div>
              <div className="text-sm">Code Compliant</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-display font-black text-accent mb-1">4.9</div>
              <div className="text-sm">Google Rating</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-display font-black text-accent mb-1">20+</div>
              <div className="text-sm">Years Licensed</div>
            </div>
          </div>

          {/* Single powerful testimonial */}
          <div className="max-w-2xl mx-auto bg-card text-card-foreground p-8 border-4 border-accent/30 rounded-lg">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-accent text-accent" />
              ))}
            </div>
            <p className="text-lg italic mb-4 leading-relaxed">
              "Our fire escape failed inspection and we needed emergency repairs. Kings came out same-day,
              completed the work, and got us certified within 48 hours. Lifesavers!"
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">Sarah O'Brien</p>
                <p className="text-sm text-muted-foreground">South End, Boston</p>
              </div>
              <span className="text-xs font-bold text-accent uppercase tracking-wide">Verified Google Review</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA — form + phone, no distractions */}
      <section id="quote" className="bg-card py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-display text-3xl md:text-5xl mb-4">
              GET YOUR FREE FIRE ESCAPE QUOTE
            </h2>
            <p className="text-lg text-muted-foreground mb-2">
              Free on-site inspection. Transparent pricing. No obligation.
            </p>
            <p className="text-base text-muted-foreground/70 mb-8">
              Serving Boston, Cambridge, Somerville, Everett, and all of Massachusetts & New Hampshire
            </p>

            <div className="max-w-2xl mx-auto">
              <GHLFormPlaceholder service="Fire Escape" />
            </div>

            <div className="mt-8">
              <p className="text-sm text-muted-foreground mb-3">Prefer to call? We pick up.</p>
              <a href={`tel:${PHONE_NUMBERS.MAIN.tel}`}>
                <Button size="lg" className="bg-destructive hover:bg-destructive/90 text-xl px-8 py-6 thick-border">
                  <Phone className="mr-2 w-6 h-6" />
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
