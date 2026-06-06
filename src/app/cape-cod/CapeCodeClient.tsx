"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import HeroCarousel from "@/components/HeroCarousel";
import { Phone, CheckCircle, ArrowRight, Shield, Award, Clock } from "lucide-react";
import { PHONE_NUMBERS } from "@/lib/constants";
import { PhoneLink } from "@/components/PhoneLink";

export default function CapeCodeClient() {
  const services = [
    {
      title: "Fire Escape Services",
      description: "Licensed installation, repairs, and 5-year certifications for Cape Cod properties",
      icon: Shield,
    },
    {
      title: "Coastal Ironwork",
      description: "Custom gates, railings, and decorative ironwork designed for coastal environments",
      icon: Award,
    },
    {
      title: "Historic Restoration",
      description: "Preserving Cape Cod's architectural heritage with authentic ironwork restoration",
      icon: Clock,
    },
  ];

  const benefits = [
    "Serving all of Cape Cod and the Islands",
    "20+ years of ironwork expertise",
    "Coastal-resistant materials and finishes",
    "Licensed and fully insured",
    "Free on-site consultations",
    "Veteran-owned business",
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroCarousel cityName="Cape Cod" stateName="MA" />

      {/* Services Section */}
      <section className="bg-card py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl mb-4 text-center">OUR CAPE COD SERVICES</h2>
          <p className="text-xl text-muted-foreground text-center mb-12 max-w-3xl mx-auto">
            Specialized ironwork solutions designed for Cape Cod&apos;s unique coastal environment
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

      {/* Why Choose Us Section */}
      <section className="bg-secondary text-secondary-foreground py-24">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-display text-4xl md:text-5xl mb-6">
                WHY CAPE COD TRUSTS KINGS IRONWORKS
              </h2>
              <p className="text-xl mb-8">
                For over 20 years, we&apos;ve been the go-to ironwork specialists for Cape Cod homeowners,
                businesses, and historic properties. Our work stands the test of time—and the coastal elements.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                    <span className="font-medium">{benefit}</span>
                  </div>
                ))}
              </div>

              <PhoneLink tel={PHONE_NUMBERS.CAPE_COD.tel}>
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

      {/* CTA Section */}
      <section className="bg-accent text-accent-foreground py-24">
        <div className="container text-center">
          <h2 className="text-display text-4xl md:text-5xl mb-6">
            READY TO START YOUR PROJECT?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Get a free consultation and quote for your Cape Cod ironwork project.
            We serve all of Cape Cod and the Islands.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <PhoneLink tel={PHONE_NUMBERS.CAPE_COD.tel}>
              <Button size="lg" variant="outline" className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-lg px-8 py-6">
                <Phone className="mr-2 w-5 h-5" />
                {PHONE_NUMBERS.CAPE_COD.display}
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
