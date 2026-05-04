import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CityHero from "@/components/CityHero";
import { Link } from "wouter";
import { Phone, CheckCircle, ArrowRight, Shield, Award, Clock, Wrench } from "lucide-react";
import { useLocalPhone } from "@/lib/useLocalPhone";
import { PhoneLink } from "@/components/PhoneLink";
import LocationSEO from "@/components/LocationSEO";

export default function LowellLanding() {
  const localPhone = useLocalPhone();
  const services = [
    {
      title: "Custom Staircases",
      description: "Curved, floating, spiral, and traditional staircases custom-designed for Lowell homes",
      icon: Award,
    },
    {
      title: "Railings & Balustrades",
      description: "Interior and exterior railings — glass panel, cable, ornamental iron, and modern rod styles",
      icon: Shield,
    },
    {
      title: "Gates & Fencing",
      description: "Driveway gates, pedestrian gates, and decorative iron fencing for Lowell properties",
      icon: Wrench,
    },
    {
      title: "Structural Steel",
      description: "Structural steel and commercial ironwork for Greater Lowell properties",
      icon: Clock,
    },
  ];

  return (
    <div className="min-h-screen">
      <LocationSEO location="boston" />
      {/* Hero Section */}
      <CityHero cityName="Lowell" stateName="MA" />

      {/* Services */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[4px] uppercase text-accent mb-4">What We Do</p>
            <h2 className="text-display text-3xl md:text-5xl mb-4">
              Custom Ironwork for Lowell
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
                Serving Lowell & Surrounding Areas
              </h2>
              <p className="text-sidebar-foreground/60 mb-8">
                Based in Everett, MA, we serve all of Massachusetts with custom ironwork,
                staircase fabrication, and structural steel installation. Every project
                is built in our shop and installed by our licensed team.
              </p>
              <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                  <span>Chelmsford</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                  <span>Dracut</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                  <span>Tewksbury</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                  <span>Billerica</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                  <span>Wilmington</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                  <span>Tyngsborough</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                  <span>Westford</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                  <span>Littleton</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                  <span>Acton</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                  <span>Groton</span>
                </div>
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
                <p className="font-display text-3xl font-bold text-accent">MA</p>
                <p className="text-sm text-foreground/60 mt-1">Licensed & Insured</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-accent">
        <div className="container text-center">
          <h2 className="text-display text-3xl md:text-5xl text-accent-foreground mb-4">
            Ready to Start Your Lowell Project?
          </h2>
          <p className="text-lg text-accent-foreground/70 mb-8 max-w-xl mx-auto">
            Free consultation and assessment. We'll visit your site, take measurements,
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
