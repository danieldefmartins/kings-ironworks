import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, Award, Users, Wrench, Shield } from "lucide-react";

export default function About() {
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
          <h1 className="text-display text-5xl md:text-7xl mb-6">ABOUT KINGS IRONWORKS</h1>
          <p className="text-xl md:text-2xl text-sidebar-foreground/80 max-w-2xl">
            20+ years of craftsmanship, innovation, and dedication to excellence
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="inline-block px-4 py-2 bg-accent/10 text-accent text-sm font-display font-bold tracking-wider mb-6">
              SINCE 2004
            </div>
            <h2 className="text-display text-4xl md:text-5xl mb-8">OUR STORY</h2>
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                King Iron Works was founded in 2004 with a simple mission: to preserve Boston's 
                architectural heritage while providing modern safety solutions. What started as a 
                small operation has grown into one of the region's most trusted names in ironwork 
                and fire escape services.
              </p>
              <p>
                Our journey began with historic restoration projects in Boston's most prestigious 
                neighborhoods—Beacon Hill, the South End, and Back Bay. We quickly discovered that 
                many historic ironwork designs were no longer commercially available, forcing property 
                owners to compromise on authenticity. This challenge became our specialty.
              </p>
              <p>
                Today, our state-of-the-art fabrication facility in Everett, Massachusetts, allows 
                us to recreate any historic design from scratch. We've expanded to four locations 
                across Massachusetts and Florida, but our commitment to artisan craftsmanship and 
                personalized service remains unchanged.
              </p>
              <p>
                As a licensed fire escape installer, we bridge the gap between historic preservation 
                and modern safety requirements. This unique combination of skills makes us the 
                go-to choice for property owners who refuse to compromise on either authenticity or safety.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="diagonal-cut-top bg-secondary text-secondary-foreground py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">OUR VALUES</h2>
          
          {/* American Pride Banner */}
          <div className="max-w-4xl mx-auto mb-12 p-8 bg-accent/20 border-4 border-accent text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className="text-5xl">🇺🇸</span>
              <h3 className="text-display text-3xl">AMERICAN MADE, AMERICAN PROUD</h3>
              <span className="text-5xl">🇺🇸</span>
            </div>
            <p className="text-lg mb-4">
              All fabrication done in our Everett, MA facility. We support American workers, 
              American manufacturing, and American values.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary border-2 border-accent">
                <span className="text-2xl">🎖️</span>
                <span className="font-display font-bold">10% MILITARY DISCOUNT</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary border-2 border-accent">
                <span className="text-2xl">💂</span>
                <span className="font-display font-bold">VETERAN OWNED & OPERATED</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary border-2 border-accent">
                <span className="text-2xl">⭐</span>
                <span className="font-display font-bold">SUPPORTING OUR TROOPS</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-heading text-xl mb-3">CRAFTSMANSHIP</h3>
              <p className="text-secondary-foreground/80">
                Every piece we create reflects our dedication to quality and attention to detail
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-heading text-xl mb-3">SAFETY</h3>
              <p className="text-secondary-foreground/80">
                Licensed and certified to ensure every installation meets the highest safety standards
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-heading text-xl mb-3">AUTHENTICITY</h3>
              <p className="text-secondary-foreground/80">
                Period-accurate restoration that honors Boston's architectural heritage
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-heading text-xl mb-3">SERVICE</h3>
              <p className="text-secondary-foreground/80">
                Personalized attention and expert guidance from consultation to completion
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What Sets Us Apart */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-16">
            WHAT SETS US APART
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 border-4 border-border">
              <h3 className="text-heading text-2xl mb-4">100% In-House Fabrication</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our state-of-the-art Everett facility handles every aspect of fabrication, from 
                initial design to final finishing. This gives us complete control over quality and 
                allows us to tackle projects other shops can't handle.
              </p>
            </Card>

            <Card className="p-8 border-4 border-border">
              <h3 className="text-heading text-2xl mb-4">Custom Design Capability</h3>
              <p className="text-muted-foreground leading-relaxed">
                We can recreate any historic ironwork design from photographs or fragments, even 
                if the original molds and patterns no longer exist. Our artisans combine traditional 
                techniques with modern technology.
              </p>
            </Card>

            <Card className="p-8 border-4 border-border">
              <h3 className="text-heading text-2xl mb-4">Licensed Fire Escape Installer</h3>
              <p className="text-muted-foreground leading-relaxed">
                We're one of the few companies that combines historic ironwork expertise with 
                licensed fire escape installation. This unique combination ensures both authenticity 
                and code compliance.
              </p>
            </Card>

            <Card className="p-8 border-4 border-border">
              <h3 className="text-heading text-2xl mb-4">Multi-Location Convenience</h3>
              <p className="text-muted-foreground leading-relaxed">
                With facilities in Everett, Cape Cod, Worcester, and Miami, we provide consistent 
                quality and service across Massachusetts and Florida. Local presence, expert execution.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-24">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-6xl font-display font-black mb-2">20+</div>
              <div className="text-lg">Years in Business</div>
            </div>
            <div className="text-center">
              <div className="text-6xl font-display font-black mb-2">4</div>
              <div className="text-lg">Locations</div>
            </div>
            <div className="text-center">
              <div className="text-6xl font-display font-black mb-2">1000+</div>
              <div className="text-lg">Projects Completed</div>
            </div>
            <div className="text-center">
              <div className="text-6xl font-display font-black mb-2">100%</div>
              <div className="text-lg">In-House Fabrication</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="diagonal-cut-top bg-sidebar text-sidebar-foreground py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-display text-4xl md:text-5xl mb-6">WORK WITH US</h2>
            <p className="text-xl text-sidebar-foreground/80 mb-8">
              Experience the King Iron Works difference on your next project
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8 py-6 thick-border">
                  GET STARTED
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/services">
                <Button size="lg" variant="outline" className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10 text-lg px-8 py-6 thick-border">
                  VIEW SERVICES
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
