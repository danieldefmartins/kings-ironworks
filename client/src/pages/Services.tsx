import { Button } from "@/components/ui/button";

import { PHONE_NUMBERS } from "@/lib/constants";
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
      <section className="relative min-h-[60vh] flex items-center bg-sidebar text-sidebar-foreground">
        <div className="absolute inset-0 z-0">
          <img
            src="https://private-us-east-1.manuscdn.com/sessionFile/PiC3jiX2zwECev1AbbjVmI/sandbox/EZosCpyNGdemuQ1YieLnnr-img-3_1770786316000_na1fn_ZmFicmljYXRpb24tc2hvcC1pbnRlcmlvcg.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUGlDM2ppWDJ6d0VDZXYxQWJialZtSS9zYW5kYm94L0Vab3NDcHlOR2RlbXVRMVlpZUxubnItaW1nLTNfMTc3MDc4NjMxNjAwMF9uYTFmbl9abUZpY21sallYUnBiMjR0YzJodmNDMXBiblJsY21sdmNnLnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=JDgZooaXhv5nFgsJWSDW1wUVM7zH60c0~6732ywzUGi2OGfmW153lUcCXh1xblDEwggiM4wQUwH-k61aa78p6AIBwWtzFwFl-pOGtCAdtS9FGH1kt4D050qUbaSXynO0NaK034oDg7YxMNWqwUFuxQuTO~-IGPI3zkdn8wSzOSN~mH25X1wVgLPBoetHfXfCnJytz5F8Dhyy491QGJjAA1~LQoW3csUqx7sDBQwosSGd6832y~9d~7K5B5A2N44qpkuNJAXEAgbBizFwKqF~nGZnFmROY5uSBhuhCxHoLAblzBRxtGOyPgxqHMxn-oyMOJjL6nWFzGJmBqR6deJi2A__"
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
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 thick-border">
                  REQUEST INSPECTION
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
            <div>
              <img
                src="https://private-us-east-1.manuscdn.com/sessionFile/PiC3jiX2zwECev1AbbjVmI/sandbox/EZosCpyNGdemuQ1YieLnnr-img-2_1770786313000_na1fn_ZmlyZS1lc2NhcGUtaW5zdGFsbGF0aW9u.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUGlDM2ppWDJ6d0VDZXYxQWJialZtSS9zYW5kYm94L0Vab3NDcHlOR2RlbXVRMVlpZUxubnItaW1nLTJfMTc3MDc4NjMxMzAwMF9uYTFmbl9abWx5WlMxbGMyTmhjR1V0YVc1emRHRnNiR0YwYVc5dS5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=J1wZIAXxJ5CYN3sWatRc2VXAW4bHXz4LVVZATKfrELWV6IcprfJ2mAwYjhUN6ce1Utg-C0bXWRw759qTZs5QMgT2puBjtEm6oIKy7rBCdwdvWGx5o-2Dw7XKE80k4aM628hNrLxihPa9xwxhl1Gvcq7wLeuuocEuwG4WPCvfSeZFt-xKRxGQucaaWubKs0xj2oYMM3M1zd76Fb7NAlAmOGW~FceWOx-bjqmIMFJyicfF0knyxALBBHOSY4O8LbWTPi5SL7slsoSd3T02TOUIoDiCb3bGbbrs-t~rc-gofOZBE57ZQI2gjVg6FMum1zi4ayiyoNRcnSlS9p5LoPFuCQ__"
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
                src="https://private-us-east-1.manuscdn.com/sessionFile/PiC3jiX2zwECev1AbbjVmI/sandbox/EZosCpyNGdemuQ1YieLnnr-img-5_1770786318000_na1fn_Ym9zdG9uLWhpc3RvcmljLWJ1aWxkaW5n.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUGlDM2ppWDJ6d0VDZXYxQWJialZtSS9zYW5kYm94L0Vab3NDcHlOR2RlbXVRMVlpZUxubnItaW1nLTVfMTc3MDc4NjMxODAwMF9uYTFmbl9ZbTl6ZEc5dUxXaHBjM1J2Y21sakxXSjFhV3hrYVc1bi5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=ujSROZ8t8b1pzboiP7I949WrwNZ8frVGTVkd3pksEu6pzlPPDHRRAS8yPyzycuFUuCDQyj1SnjlmpZScXhCNidraw3V8rcAbbvB84Yn48NUuluMI2p7olqNkCsW3JbjN3CPCxadpCaYxIU0ArzDi5IQb~-47PH9z30Zra5PW1Qf9U6xZhPZjhdkfzp7iJqSaQAyqkOTASks4lcK23OxslxlduyffBbicM~4DMy34n59-sBOBmDNNLyrLyLtc-ywooB9ljD4BQC-ZJeHyYG74C1HN5WH99YuVkgJu8zGNih2cRWBJ3BwVx2YyEv~ODrwVs88dcsTNZLYCkZlL2bhesg__"
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
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 thick-border">
                  FREE ASSESSMENT
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
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
            <Card className="p-6 border-4 border-border hover:border-accent transition-all">
              <Hammer className="w-10 h-10 text-accent mb-4" />
              <h3 className="text-heading text-xl mb-3">Railings & Stairs</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Interior and exterior railings, straight and spiral staircases, balustrades, 
                and handrails for residential and commercial properties.
              </p>
            </Card>

            <Card className="p-6 border-4 border-border hover:border-accent transition-all">
              <Building2 className="w-10 h-10 text-accent mb-4" />
              <h3 className="text-heading text-xl mb-3">Gates & Fences</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Custom entry gates, driveway gates, security gates, decorative fencing, 
                and perimeter enclosures with automated options.
              </p>
            </Card>

            <Card className="p-6 border-4 border-border hover:border-accent transition-all">
              <Wrench className="w-10 h-10 text-accent mb-4" />
              <h3 className="text-heading text-xl mb-3">Ornamental Iron</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Window guards, balcony railings, decorative scrollwork, finials, 
                and custom architectural metalwork elements.
              </p>
            </Card>

            <Card className="p-6 border-4 border-border hover:border-accent transition-all">
              <Shield className="w-10 h-10 text-accent mb-4" />
              <h3 className="text-heading text-xl mb-3">Security Solutions</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Security gates, window bars, door grilles, and protective barriers 
                that combine safety with aesthetic appeal.
              </p>
            </Card>

            <Card className="p-6 border-4 border-border hover:border-accent transition-all">
              <Building2 className="w-10 h-10 text-accent mb-4" />
              <h3 className="text-heading text-xl mb-3">Structural Steel</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                I-beams, mezzanines, support columns, and structural steel fabrication 
                for commercial and industrial applications.
              </p>
            </Card>

            <Card className="p-6 border-4 border-border hover:border-accent transition-all">
              <Hammer className="w-10 h-10 text-accent mb-4" />
              <h3 className="text-heading text-xl mb-3">Custom Projects</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Unique architectural metalwork, artistic installations, and specialty 
                fabrication projects designed to your specifications.
              </p>
            </Card>
          </div>

          <div className="text-center">
            <img
              src="https://private-us-east-1.manuscdn.com/sessionFile/PiC3jiX2zwECev1AbbjVmI/sandbox/EZosCpyNGdemuQ1YieLnnr-img-4_1770786318000_na1fn_Y3VzdG9tLWlyb24tZ2F0ZQ.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUGlDM2ppWDJ6d0VDZXYxQWJialZtSS9zYW5kYm94L0Vab3NDcHlOR2RlbXVRMVlpZUxubnItaW1nLTRfMTc3MDc4NjMxODAwMF9uYTFmbl9ZM1Z6ZEc5dExXbHliMjR0WjJGMFpRLnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=ZEqNf2HrVHpIvRMmxhmSQSD755bSLfcEIfE4FEzcJ-3pUWZUbx2rEDiGeuyH46e~tbrjiRhJ6ooWSa-kp6i359csT9M2V34unq9wX9zNEy9~7NCkXIN6Swqxc2DlFBlnVmPl9U5VMeahi5j6wQsFPMIzdwPWi7fME-VJtNi5XXBEQy5kMDtEVOiu0e-rjdgJ8yDWwmUiKmZrmzSPgxVjqOq25Q0g9SwtL0KFbCOJeoY73tN6AbVHpsHqNecM2k17aEA3gyuHGGREznhWTWHWHtAi8brj~iVNOtzjbdQWlLPBB326s4TFW81MOcfvAaTXbHyEQznYQ-C2Pd1lZhntXA__"
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
