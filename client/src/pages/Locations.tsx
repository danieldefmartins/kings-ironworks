import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { MapPin, Phone, Clock, ArrowRight, Building2 } from "lucide-react";
import { LOCATIONS, PHONE_NUMBERS } from "@/lib/constants";

export default function Locations() {
  const locations = LOCATIONS.map((loc, index) => ({
    ...loc,
    featured: index === 0 // First location (Everett) is featured
  }));

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center bg-sidebar text-sidebar-foreground">
        <div className="container">
          <h1 className="text-display text-5xl md:text-7xl mb-6">OUR LOCATIONS</h1>
          <p className="text-xl md:text-2xl text-sidebar-foreground/80 max-w-2xl">
            Serving Massachusetts and Florida with four convenient locations
          </p>
        </div>
      </section>

      {/* Locations Grid */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {locations.map((location, index) => (
              <Card
                key={index}
                className={`p-8 ${
                  location.featured
                    ? "border-8 border-accent lg:col-span-2"
                    : "border-4 border-border"
                }`}
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-display text-3xl mb-1">{location.name}</h2>
                    <p className="text-accent font-heading text-sm tracking-wider">
                      {location.subtitle}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="flex items-start gap-3 mb-4">
                      <Building2 className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-heading text-sm mb-1">ADDRESS</div>
                        <p className="text-muted-foreground whitespace-pre-line">
                          {location.address}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-heading text-sm mb-1">PHONE</div>
                        <a
                          href={`tel:${location.phone.tel}`}
                          className="text-accent hover:underline"
                        >
                          {location.phone.display}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-heading text-sm mb-1">HOURS</div>
                        <p className="text-muted-foreground whitespace-pre-line text-sm">
                          {location.hours}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed mb-6">
                  {location.description}
                </p>

                {location.featured && (
                  <div className="bg-accent/5 border-l-4 border-accent p-4">
                    <p className="text-sm font-medium">
                      <strong>Visit Our Shop:</strong> Schedule a tour of our state-of-the-art 
                      fabrication facility to see our capabilities and discuss your project with our team.
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="diagonal-cut-top bg-secondary text-secondary-foreground py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-12">SERVICE AREAS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="text-heading text-2xl mb-4">MASSACHUSETTS</h3>
              <ul className="space-y-2 text-secondary-foreground/80">
                <li>• Greater Boston Area</li>
                <li>• Beacon Hill, South End, Back Bay</li>
                <li>• Cambridge & Somerville</li>
                <li>• Cape Cod & Islands</li>
                <li>• Worcester & Central MA</li>
                <li>• North Shore & South Shore</li>
              </ul>
            </div>
            <div>
              <h3 className="text-heading text-2xl mb-4">FLORIDA</h3>
              <ul className="space-y-2 text-secondary-foreground/80">
                <li>• Miami-Dade County</li>
                <li>• Broward County</li>
                <li>• Palm Beach County</li>
                <li>• South Florida Region</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-display text-4xl md:text-5xl mb-6">READY TO GET STARTED?</h2>
            <p className="text-xl mb-8 opacity-90">
              Contact your nearest King Iron Works location for a free consultation
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" variant="outline" className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-lg px-8 py-6 thick-border">
                  REQUEST QUOTE
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href={`tel:${PHONE_NUMBERS.MAIN.tel}`}>
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
