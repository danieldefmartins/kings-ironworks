import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, Shield, Wrench, Building2, MapPin, Phone, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section - Diagonal Split */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://private-us-east-1.manuscdn.com/sessionFile/PiC3jiX2zwECev1AbbjVmI/sandbox/EZosCpyNGdemuQ1YieLnnr-img-1_1770786319000_na1fn_aGVyby1oaXN0b3JpYy1pcm9ud29yaw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUGlDM2ppWDJ6d0VDZXYxQWJialZtSS9zYW5kYm94L0Vab3NDcHlOR2RlbXVRMVlpZUxubnItaW1nLTFfMTc3MDc4NjMxOTAwMF9uYTFmbl9hR1Z5Ynkxb2FYTjBiM0pwWXkxcGNtOXVkMjl5YXcucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=kxtv4l~flN88wu3Helk4mFrSxYlCodg2Dn3VEfp1TRrjgb6fWM0fMf5bnc~2IX~AOg6UMJIxz-UGjcbFwmUOuBfEoMWKN~ZmwEFiFHTF0VDwrxkXXHdeh5nd-qjaqOVp6EFH~NSW7bMGhlTzgcjSHJ0WDJXawS9QHeZeereLSLkCAF3MCVYYOORivNm5OOM4~IX8H7~dj4VOk-~-WxZNZAH2rgj-l15dvfXEq1nVn~bsmfJ2zNCufnBydiYQZJvlsc15Ahr0fUysgkyRWBR1tlp34spiQvol9bvQqwJMxpQXLJJP2tMM0bksphZyYrR9XbBLU~6FdU19y8TOoK1Ybw__"
            alt="Historic ironwork detail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-sidebar/95 via-sidebar/70 to-transparent" />
        </div>

        {/* Content */}
        <div className="container relative z-10">
          <div className="max-w-3xl">
            <div className="inline-block px-4 py-2 bg-accent text-accent-foreground text-sm font-display font-bold tracking-wider mb-6">
              SINCE 2004 • 20+ YEARS OF EXCELLENCE
            </div>
            
            <h1 className="text-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-sidebar-foreground mb-6 leading-tight">
              WHERE HERITAGE MEETS SAFETY
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-sidebar-foreground/80 mb-8 leading-relaxed">
              Boston's premier historic ironwork restoration and licensed fire escape specialists. 
              Custom artisan fabrication meets modern safety standards—all in-house.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6 thick-border">
                  FREE ASSESSMENT
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
            <div className="mt-12 flex flex-wrap gap-4 text-sm text-sidebar-foreground/70">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>Licensed Installer</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>4 Locations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>State-of-the-Art Shop</span>
              </div>
            </div>
            
            {/* American Pride Badges */}
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-accent/20 border-2 border-accent">
                <span className="text-xl sm:text-2xl">🇺🇸</span>
                <span className="font-display font-bold text-sidebar-foreground text-xs sm:text-sm">PROUD TO BE AMERICAN</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-accent/20 border-2 border-accent">
                <span className="text-xl sm:text-2xl">🎖️</span>
                <span className="font-display font-bold text-sidebar-foreground text-xs sm:text-sm">MILITARY DISCOUNT AVAILABLE</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-accent/20 border-2 border-accent">
                <span className="text-xl sm:text-2xl">⚙️</span>
                <span className="font-display font-bold text-sidebar-foreground text-xs sm:text-sm">MADE IN USA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section - Diagonal Cut */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-display text-4xl md:text-6xl mb-4">OUR SERVICES</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive ironwork solutions from historic restoration to modern safety compliance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Fire Escape Services */}
            <Card className="p-8 border-8 border-border hover:border-accent transition-all duration-300 group">
              <div className="mb-6">
                <div className="w-16 h-16 bg-accent/10 flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-heading text-2xl mb-3">FIRE ESCAPE SERVICES</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Licensed installation, repair, inspection, and MA State Building Code certification. 
                  Emergency services available.
                </p>
              </div>
              <Link href="/fire-escape">
                <Button variant="outline" className="w-full border-2 group-hover:border-accent group-hover:bg-accent group-hover:text-accent-foreground transition-all">
                  LEARN MORE
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </Card>

            {/* Historic Restoration */}
            <Card className="p-8 border-8 border-border hover:border-accent transition-all duration-300 group">
              <div className="mb-6">
                <div className="w-16 h-16 bg-accent/10 flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-heading text-2xl mb-3">HISTORIC RESTORATION</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Custom replication of unavailable historic designs. Period-accurate restoration for 
                  Boston's landmark buildings.
                </p>
              </div>
              <Link href="/building-restoration">
                <Button variant="outline" className="w-full border-2 group-hover:border-accent group-hover:bg-accent group-hover:text-accent-foreground transition-all">
                  LEARN MORE
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </Card>

            {/* Custom Ironwork */}
            <Card className="p-8 border-8 border-border hover:border-accent transition-all duration-300 group">
              <div className="mb-6">
                <div className="w-16 h-16 bg-accent/10 flex items-center justify-center mb-4">
                  <Wrench className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-heading text-2xl mb-3">CUSTOM IRONWORK</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Railings, staircases, gates, fences, and ornamental iron. Designed, fabricated, 
                  and installed in-house.
                </p>
              </div>
              <Link href="/structural-steel">
                <Button variant="outline" className="w-full border-2 group-hover:border-accent group-hover:bg-accent group-hover:text-accent-foreground transition-all">
                  LEARN MORE
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose Us - Diagonal Cut */}
      <section className="diagonal-cut-top bg-secondary text-secondary-foreground py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-6xl text-center mb-16">WHY KINGS IRONWORKS</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-6xl font-display font-black text-accent mb-4">20+</div>
              <div className="text-xl font-heading mb-2">YEARS</div>
              <p className="text-secondary-foreground/70">
                Two decades of expertise in Boston ironwork and restoration
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-6xl font-display font-black text-accent mb-4">4</div>
              <div className="text-xl font-heading mb-2">LOCATIONS</div>
              <p className="text-secondary-foreground/70">
                Everett, Cape Cod, Worcester, and Miami coverage
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-6xl font-display font-black text-accent mb-4">100%</div>
              <div className="text-xl font-heading mb-2">IN-HOUSE</div>
              <p className="text-secondary-foreground/70">
                State-of-the-art fabrication shop in Everett, MA
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-6xl font-display font-black text-accent mb-4">✓</div>
              <div className="text-xl font-heading mb-2">LICENSED</div>
              <p className="text-secondary-foreground/70">
                MA licensed fire escape installer and certified
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Work */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-display text-4xl md:text-6xl mb-4">FEATURED WORK</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From historic Beacon Hill restorations to modern fire escape installations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Fire Escape Installation */}
            <div className="relative group overflow-hidden">
              <img
                src="https://private-us-east-1.manuscdn.com/sessionFile/PiC3jiX2zwECev1AbbjVmI/sandbox/EZosCpyNGdemuQ1YieLnnr-img-2_1770786313000_na1fn_ZmlyZS1lc2NhcGUtaW5zdGFsbGF0aW9u.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUGlDM2ppWDJ6d0VDZXYxQWJialZtSS9zYW5kYm94L0Vab3NDcHlOR2RlbXVRMVlpZUxubnItaW1nLTJfMTc3MDc4NjMxMzAwMF9uYTFmbl9abWx5WlMxbGMyTmhjR1V0YVc1emRHRnNiR0YwYVc5dS5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=J1wZIAXxJ5CYN3sWatRc2VXAW4bHXz4LVVZATKfrELWV6IcprfJ2mAwYjhUN6ce1Utg-C0bXWRw759qTZs5QMgT2puBjtEm6oIKy7rBCdwdvWGx5o-2Dw7XKE80k4aM628hNrLxihPa9xwxhl1Gvcq7wLeuuocEuwG4WPCvfSeZFt-xKRxGQucaaWubKs0xj2oYMM3M1zd76Fb7NAlAmOGW~FceWOx-bjqmIMFJyicfF0knyxALBBHOSY4O8LbWTPi5SL7slsoSd3T02TOUIoDiCb3bGbbrs-t~rc-gofOZBE57ZQI2gjVg6FMum1zi4ayiyoNRcnSlS9p5LoPFuCQ__"
                alt="Fire escape installation"
                className="w-full h-[400px] object-cover border-8 border-border"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sidebar/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-8 border-8 border-transparent group-hover:border-accent">
                <div>
                  <h3 className="text-heading text-2xl text-sidebar-foreground mb-2">
                    FIRE ESCAPE INSTALLATION
                  </h3>
                  <p className="text-sidebar-foreground/80">
                    Code-compliant installation on historic Boston building
                  </p>
                </div>
              </div>
            </div>

            {/* Historic Building */}
            <div className="relative group overflow-hidden">
              <img
                src="https://private-us-east-1.manuscdn.com/sessionFile/PiC3jiX2zwECev1AbbjVmI/sandbox/EZosCpyNGdemuQ1YieLnnr-img-5_1770786318000_na1fn_Ym9zdG9uLWhpc3RvcmljLWJ1aWxkaW5n.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUGlDM2ppWDJ6d0VDZXYxQWJialZtSS9zYW5kYm94L0Vab3NDcHlOR2RlbXVRMVlpZUxubnItaW1nLTVfMTc3MDc4NjMxODAwMF9uYTFmbl9ZbTl6ZEc5dUxXaHBjM1J2Y21sakxXSjFhV3hrYVc1bi5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=ujSROZ8t8b1pzboiP7I949WrwNZ8frVGTVkd3pksEu6pzlPPDHRRAS8yPyzycuFUuCDQyj1SnjlmpZScXhCNidraw3V8rcAbbvB84Yn48NUuluMI2p7olqNkCsW3JbjN3CPCxadpCaYxIU0ArzDi5IQb~-47PH9z30Zra5PW1Qf9U6xZhPZjhdkfzp7iJqSaQAyqkOTASks4lcK23OxslxlduyffBbicM~4DMy34n59-sBOBmDNNLyrLyLtc-ywooB9ljD4BQC-ZJeHyYG74C1HN5WH99YuVkgJu8zGNih2cRWBJ3BwVx2YyEv~ODrwVs88dcsTNZLYCkZlL2bhesg__"
                alt="Historic building restoration"
                className="w-full h-[400px] object-cover border-8 border-border"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sidebar/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-8 border-8 border-transparent group-hover:border-accent">
                <div>
                  <h3 className="text-heading text-2xl text-sidebar-foreground mb-2">
                    SOUTH END RESTORATION
                  </h3>
                  <p className="text-sidebar-foreground/80">
                    Complete ironwork restoration on Victorian brownstone
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link href="/portfolio">
              <Button size="lg" variant="outline" className="border-2 border-border hover:border-accent hover:bg-accent hover:text-accent-foreground thick-border">
                VIEW FULL PORTFOLIO
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Locations CTA */}
      <section className="diagonal-cut-top bg-sidebar text-sidebar-foreground py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <MapPin className="w-16 h-16 text-accent mx-auto mb-6" />
            <h2 className="text-display text-4xl md:text-6xl mb-6">SERVING MULTIPLE LOCATIONS</h2>
            <p className="text-xl text-sidebar-foreground/80 mb-8">
              With facilities in Everett, Cape Cod, Worcester, and Miami, we're ready to serve your 
              ironwork and fire escape needs across Massachusetts and Florida.
            </p>
            <Link href="/locations">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6 thick-border">
                FIND YOUR LOCATION
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-display text-4xl md:text-6xl mb-6">READY TO START YOUR PROJECT?</h2>
            <p className="text-xl mb-8 opacity-90">
              Get a free assessment from Boston's premier ironwork and fire escape specialists
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" variant="outline" className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-lg px-8 py-6 thick-border">
                  REQUEST QUOTE
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="tel:8578881468">
                <Button size="lg" variant="outline" className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-lg px-8 py-6 thick-border">
                  <Phone className="mr-2 w-5 h-5" />
                  CALL NOW
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
