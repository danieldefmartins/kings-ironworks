"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CityHero from "@/components/CityHero";
import { Phone, CheckCircle, ArrowRight, Shield, Award, Clock } from "lucide-react";
import { PHONE_NUMBERS } from "@/lib/constants";
import { PhoneLink } from "@/components/PhoneLink";

export default function MiamiClient() {
  const services = [
    {
      title: "Fire Escape Services",
      description: "Licensed installation, repairs, and 5-year certifications for South Florida properties",
      icon: Shield,
    },
    {
      title: "Custom Ironwork",
      description: "Hurricane-rated gates, railings, and decorative ironwork for Miami homes and businesses",
      icon: Award,
    },
    {
      title: "Commercial Projects",
      description: "Structural steel and custom fabrication for Miami's commercial and residential developments",
      icon: Clock,
    },
  ];

  const benefits = [
    "Serving Miami-Dade and Broward Counties",
    "20+ years of ironwork expertise",
    "Hurricane-rated materials and installation",
    "Licensed and fully insured in Florida",
    "Free on-site consultations",
    "Veteran-owned business",
  ];

  return (
    <div className="min-h-screen">
      <CityHero cityName="Miami" stateName="FL" />

      <section className="bg-card py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl mb-4 text-center">OUR MIAMI SERVICES</h2>
          <p className="text-xl text-muted-foreground text-center mb-12 max-w-3xl mx-auto">
            Specialized ironwork solutions designed for South Florida&apos;s climate and building codes
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Link href="/services" key={index}>
                <Card className="p-8 border border-border hover:border-accent transition-colors cursor-pointer h-full">
                  <div className="w-16 h-16 bg-accent/10 flex items-center justify-center mb-6">
                    <service.icon className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-heading text-2xl mb-4">{service.title}</h3>
                  <p className="text-muted-foreground mb-4">{service.description}</p>
                  <span className="text-accent font-bold text-sm flex items-center gap-1">
                    LEARN MORE <ArrowRight className="w-4 h-4" />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-secondary text-secondary-foreground py-24">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-display text-4xl md:text-5xl mb-6">
                WHY MIAMI TRUSTS KINGS IRONWORKS
              </h2>
              <p className="text-xl mb-8">
                Bringing over 20 years of Boston-based ironwork excellence to South Florida.
                Our work meets Florida&apos;s strict building codes and withstands hurricanes, salt air, and extreme heat.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                    <span className="font-medium">{benefit}</span>
                  </div>
                ))}
              </div>

              <PhoneLink tel={PHONE_NUMBERS.MIAMI.tel}>
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Phone className="mr-2 w-5 h-5" />
                  CALL FOR FREE CONSULTATION
                </Button>
              </PhoneLink>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 bg-card text-card-foreground border border-border text-center">
                <div className="text-5xl font-display font-bold text-accent mb-2">20+</div>
                <div className="text-sm text-muted-foreground">Years of Experience</div>
              </Card>
              <Card className="p-6 bg-card text-card-foreground border border-border text-center">
                <div className="text-5xl font-display font-bold text-accent mb-2">100%</div>
                <div className="text-sm text-muted-foreground">Licensed &amp; Insured</div>
              </Card>
              <Card className="p-6 bg-card text-card-foreground border border-border text-center">
                <div className="text-5xl font-display font-bold text-accent mb-2">5yr</div>
                <div className="text-sm text-muted-foreground">Fire Escape Certs</div>
              </Card>
              <Card className="p-6 bg-card text-card-foreground border border-border text-center">
                <div className="text-5xl font-display font-bold text-accent mb-2">10%</div>
                <div className="text-sm text-muted-foreground">Military Discount</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-accent text-accent-foreground py-24">
        <div className="container text-center">
          <h2 className="text-display text-4xl md:text-5xl mb-6">
            READY TO START YOUR PROJECT?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Get a free consultation and quote for your South Florida ironwork project.
            We serve Miami-Dade, Broward, and surrounding counties.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <PhoneLink tel={PHONE_NUMBERS.MIAMI.tel}>
              <Button size="lg" variant="outline" className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-lg px-8 py-6">
                <Phone className="mr-2 w-5 h-5" />
                {PHONE_NUMBERS.MIAMI.display}
              </Button>
            </PhoneLink>
            <Link href="/contact">
              <Button size="lg" className="bg-sidebar hover:bg-sidebar/90 text-sidebar-foreground text-lg px-8 py-6">
                REQUEST FREE QUOTE
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
