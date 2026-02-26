import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { MapPin, Phone, Clock, ArrowRight, Building2, Wrench, Shield, Flame, Paintbrush } from "lucide-react";
import { PHONE_NUMBERS } from "@/lib/constants";
import { useLocalPhone } from "@/lib/useLocalPhone";

const CAPABILITIES = [
  { icon: Wrench, label: "Custom Fabrication", description: "Gates, railings, fences, and architectural metalwork built to spec" },
  { icon: Flame, label: "In-House Welding", description: "MIG, TIG, and stick welding for steel, iron, and aluminum" },
  { icon: Shield, label: "Structural Steel", description: "Fire escapes, beams, columns, and load-bearing installations" },
  { icon: Paintbrush, label: "Powder Coating", description: "Durable, weather-resistant finishes applied on-site" },
];

const SERVICE_AREAS = [
  { state: "Massachusetts", areas: ["Greater Boston Area", "Beacon Hill, South End, Back Bay", "Cambridge & Somerville", "Cape Cod & Islands", "Worcester & Central MA", "North Shore & South Shore"] },
  { state: "New York", areas: ["New York City (All Boroughs)", "Long Island", "Westchester County", "Upstate New York"] },
  { state: "Connecticut", areas: ["Hartford & Central CT", "New Haven & Shoreline", "Stamford & Fairfield County", "Bridgeport & Surrounding Areas"] },
  { state: "Rhode Island", areas: ["Providence & Metro Area", "Newport & Aquidneck Island", "Warwick, Cranston & Pawtucket"] },
  { state: "New Hampshire", areas: ["Manchester & Nashua", "Concord & Central NH", "Seacoast Region"] },
  { state: "Maine", areas: ["Portland & Southern Maine", "Bangor & Central Maine", "Augusta & Lewiston"] },
  { state: "Florida", areas: ["Miami-Dade County", "Broward County", "Palm Beach County", "South Florida Region"] },
];

export default function Locations() {
  const localPhone = useLocalPhone();
  const isDefaultLocation = localPhone.label === "Main" || localPhone.label === "Boston";

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center bg-sidebar text-sidebar-foreground pt-4">
        <div className="container">
          <h1 className="text-display text-5xl md:text-7xl mb-6">
            BUILT IN EVERETT.<br />DELIVERED TO YOUR DOOR.
          </h1>
          <p className="text-xl md:text-2xl text-sidebar-foreground/80 max-w-2xl">
            Every piece of ironwork we install is fabricated in our 10,000+ sq ft Everett shop —
            then delivered and installed wherever you are.
          </p>
        </div>
      </section>

      {/* Everett Facility Showcase */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <Card className="border-8 border-accent p-8 md:p-12">
            <div className="flex items-start gap-4 mb-8">
              <div className="w-14 h-14 bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-7 h-7 text-accent" />
              </div>
              <div>
                <h2 className="text-display text-3xl md:text-4xl mb-1">EVERETT HEADQUARTERS</h2>
                <p className="text-accent font-heading text-sm tracking-wider">
                  Fabrication Shop & Main Office
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-heading text-sm mb-1">ADDRESS</div>
                    <p className="text-muted-foreground">
                      69 Norman St, Unit 20<br />Everett, MA 02149
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-heading text-sm mb-1">HOURS</div>
                    <p className="text-muted-foreground text-sm">
                      Monday - Friday: 7:00 AM - 5:00 PM<br />
                      Saturday: By Appointment<br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-heading text-sm mb-1">PHONE</div>
                    <a
                      href={`tel:${PHONE_NUMBERS.BOSTON.tel}`}
                      className="text-accent hover:underline"
                    >
                      {PHONE_NUMBERS.BOSTON.display}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Capabilities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {CAPABILITIES.map((cap) => (
                <div key={cap.label} className="bg-accent/5 border-2 border-border p-4">
                  <cap.icon className="w-6 h-6 text-accent mb-2" />
                  <div className="font-heading text-sm mb-1">{cap.label.toUpperCase()}</div>
                  <p className="text-muted-foreground text-sm">{cap.description}</p>
                </div>
              ))}
            </div>

            <div className="bg-accent/5 border-l-4 border-accent p-4">
              <p className="text-sm font-medium">
                <strong>Schedule a Shop Tour:</strong> Visit our state-of-the-art fabrication facility to see our
                capabilities and discuss your project with our team. Call us or{" "}
                <Link href="/contact">
                  <span className="text-accent hover:underline cursor-pointer">request a consultation</span>
                </Link>.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Your Local Office - Dynamic */}
      <section className="diagonal-cut-top bg-secondary text-secondary-foreground py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-display text-4xl md:text-5xl mb-6">YOUR LOCAL OFFICE</h2>
            <div className="bg-secondary-foreground/5 border-4 border-secondary-foreground/20 p-8 md:p-12 mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <MapPin className="w-6 h-6 text-accent" />
                <span className="text-display text-2xl md:text-3xl">
                  {isDefaultLocation ? "Boston / Everett" : localPhone.label}
                </span>
              </div>
              <a
                href={`tel:${localPhone.tel}`}
                className="inline-flex items-center gap-2 text-accent text-xl hover:underline mb-6"
              >
                <Phone className="w-5 h-5" />
                {localPhone.display}
              </a>
              <p className="text-secondary-foreground/80 text-lg max-w-2xl mx-auto">
                No matter where you are, we bring Everett-built craftsmanship to you.
                Every project is fabricated in our shop and installed by our own crew.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Service Areas / Delivery Reach */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-center mb-4">WHERE WE DELIVER</h2>
          <p className="text-center text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
            Fabricated in Everett, installed across the Northeast and Florida
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {SERVICE_AREAS.map((area) => (
              <div key={area.state}>
                <h3 className="text-heading text-2xl mb-4">{area.state.toUpperCase()}</h3>
                <ul className="space-y-2 text-muted-foreground">
                  {area.areas.map((a) => (
                    <li key={a}>• {a}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-display text-4xl md:text-5xl mb-6">READY TO GET STARTED?</h2>
            <p className="text-xl mb-8 opacity-90">
              Call your local number or request a free quote — we'll handle the rest.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" variant="outline" className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-lg px-8 py-6 thick-border">
                  REQUEST QUOTE
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href={`tel:${localPhone.tel}`}>
                <Button size="lg" variant="outline" className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-lg px-8 py-6 thick-border">
                  <Phone className="mr-2 w-5 h-5" />
                  {localPhone.display}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
