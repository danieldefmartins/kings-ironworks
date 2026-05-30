"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CityHero from "@/components/CityHero";
import { Phone, CheckCircle, ArrowRight, Shield, Award, Clock, Wrench } from "lucide-react";
import { useLocalPhone } from "@/lib/useLocalPhone";
import { PhoneLink } from "@/components/PhoneLink";
import type { LucideIcon } from "lucide-react";

interface ServiceItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

interface CityLandingClientProps {
  cityName: string;
  stateName: string;
  stateFullName: string;
  services: ServiceItem[];
  towns: string[];
}

export default function CityLandingClient({
  cityName,
  stateName,
  stateFullName,
  services,
  towns,
}: CityLandingClientProps) {
  const localPhone = useLocalPhone();

  return (
    <div className="min-h-screen">
      <CityHero cityName={cityName} stateName={stateName} />

      {/* Services */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[4px] uppercase text-accent mb-4">What We Do</p>
            <h2 className="text-display text-3xl md:text-5xl mb-4">
              Custom Ironwork for {cityName}
            </h2>
            <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
              From hand-forged staircases to structural steel, every piece is designed,
              fabricated, and installed by our team in Everett, MA.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, i) => (
              <Card key={i} className="p-6 bg-sidebar text-sidebar-foreground border-border">
                <service.icon className="w-8 h-8 text-accent mb-4" />
                <h3 className="font-display font-bold text-lg mb-2">{service.title}</h3>
                <p className="text-sm text-sidebar-foreground/60">{service.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Areas Served */}
      <section className="py-20 bg-sidebar">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold tracking-[4px] uppercase text-accent mb-4">Service Area</p>
              <h2 className="text-display text-3xl md:text-4xl text-sidebar-foreground mb-6">
                Serving {cityName} &amp; Surrounding Areas
              </h2>
              <p className="text-sidebar-foreground/60 mb-8">
                Based in Everett, MA, we serve all of {stateFullName} with custom ironwork,
                staircase fabrication, and structural steel installation. Every project
                is built in our shop and installed by our licensed team.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {towns.map((town) => (
                  <div key={town} className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
                    <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                    <span>{town}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background p-6 text-center">
                <p className="font-display text-3xl font-bold text-accent">20+</p>
                <p className="text-sm text-foreground/60 mt-1">Years Experience</p>
              </div>
              <div className="bg-background p-6 text-center">
                <p className="font-display text-3xl font-bold text-accent">100%</p>
                <p className="text-sm text-foreground/60 mt-1">In-House</p>
              </div>
              <div className="bg-background p-6 text-center">
                <p className="font-display text-3xl font-bold text-accent">9</p>
                <p className="text-sm text-foreground/60 mt-1">States Served</p>
              </div>
              <div className="bg-background p-6 text-center">
                <p className="font-display text-3xl font-bold text-accent">{stateName}</p>
                <p className="text-sm text-foreground/60 mt-1">Licensed &amp; Insured</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-accent">
        <div className="container text-center">
          <h2 className="text-display text-3xl md:text-5xl text-accent-foreground mb-4">
            Ready to Start Your {cityName} Project?
          </h2>
          <p className="text-lg text-accent-foreground/70 mb-8 max-w-xl mx-auto">
            Free consultation and assessment. We&apos;ll visit your site, take measurements,
            and provide a detailed quote.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="bg-sidebar text-sidebar-foreground hover:bg-sidebar/90 font-display font-bold px-8">
                Get a Free Quote
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <PhoneLink tel={localPhone.tel}>
              <Button size="lg" variant="outline" className="border-accent-foreground/30 text-accent-foreground hover:bg-accent-foreground/10 font-display font-bold px-8">
                <Phone className="mr-2 w-4 h-4" />
                {localPhone.display}
              </Button>
            </PhoneLink>
          </div>
        </div>
      </section>
    </div>
  );
}

// Re-export icons for convenience
export { Shield, Award, Clock, Wrench };
