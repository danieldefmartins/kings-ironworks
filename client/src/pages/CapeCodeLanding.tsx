import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Phone, MapPin, CheckCircle, ArrowRight, Shield, Award, Clock } from "lucide-react";
import { PHONE_NUMBERS } from "@/lib/constants";
import LocationSEO from "@/components/LocationSEO";

/**
 * Cape Cod Location Landing Page
 * SEO-optimized for Cape Cod, MA area searches
 */
export default function CapeCodeLanding() {
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
      <LocationSEO location="cape-cod" />
      {/* Hero Section */}
      <section
        className="relative min-h-[90vh] flex items-center bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?w=1600&h=1200&fit=crop')`,
        }}
      >
        <div className="container">
          <div className="max-w-3xl">
            <div className="inline-block bg-accent px-4 py-2 mb-6">
              <div className="flex items-center gap-2 text-accent-foreground">
                <MapPin className="w-5 h-5" />
                <span className="font-heading font-bold">SERVING CAPE COD, MA</span>
              </div>
            </div>
            
            <h1 className="text-display text-5xl md:text-7xl mb-6 text-white">
              CAPE COD'S PREMIER IRONWORK SPECIALISTS
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Custom ironwork, fire escape services, and historic restoration for Cape Cod homes and businesses. 
              Licensed, insured, and built to withstand coastal conditions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <a href={`tel:${PHONE_NUMBERS.CAPE_COD.tel}`}>
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6 thick-border w-full sm:w-auto">
                  <Phone className="mr-2 w-5 h-5" />
                  CALL {PHONE_NUMBERS.CAPE_COD.display}
                </Button>
              </a>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-sidebar text-lg px-8 py-6 thick-border w-full sm:w-auto">
                  FREE QUOTE
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-4 text-white/80">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>Licensed Installer</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>20+ Years Experience</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>Veteran Owned</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl mb-4 text-center">OUR CAPE COD SERVICES</h2>
          <p className="text-xl text-muted-foreground text-center mb-12 max-w-3xl mx-auto">
            Specialized ironwork solutions designed for Cape Cod's unique coastal environment
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="p-8 border-4 border-border hover:border-accent transition-colors">
                <div className="w-16 h-16 bg-accent/10 flex items-center justify-center mb-6">
                  <service.icon className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-heading text-2xl mb-4">{service.title}</h3>
                <p className="text-muted-foreground">{service.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="diagonal-cut-top bg-secondary text-secondary-foreground py-24">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-display text-4xl md:text-5xl mb-6">
                WHY CAPE COD TRUSTS KINGS IRONWORKS
              </h2>
              <p className="text-xl mb-8">
                For over 20 years, we've been the go-to ironwork specialists for Cape Cod homeowners, 
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

              <a href={`tel:${PHONE_NUMBERS.CAPE_COD.tel}`}>
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground thick-border">
                  <Phone className="mr-2 w-5 h-5" />
                  CALL FOR FREE CONSULTATION
                </Button>
              </a>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 bg-card text-card-foreground border-4 border-border text-center">
                <div className="text-5xl font-display font-bold text-accent mb-2">20+</div>
                <div className="text-sm text-muted-foreground">Years of Experience</div>
              </Card>
              <Card className="p-6 bg-card text-card-foreground border-4 border-border text-center">
                <div className="text-5xl font-display font-bold text-accent mb-2">100%</div>
                <div className="text-sm text-muted-foreground">Licensed & Insured</div>
              </Card>
              <Card className="p-6 bg-card text-card-foreground border-4 border-border text-center">
                <div className="text-5xl font-display font-bold text-accent mb-2">5yr</div>
                <div className="text-sm text-muted-foreground">Fire Escape Certs</div>
              </Card>
              <Card className="p-6 bg-card text-card-foreground border-4 border-border text-center">
                <div className="text-5xl font-display font-bold text-accent mb-2">10%</div>
                <div className="text-sm text-muted-foreground">Military Discount</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-24">
        <div className="container text-center">
          <h2 className="text-display text-4xl md:text-5xl mb-6">
            READY TO START YOUR PROJECT?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Get a free consultation and quote for your Cape Cod ironwork project. 
            We serve all of Cape Cod and the Islands.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={`tel:${PHONE_NUMBERS.CAPE_COD.tel}`}>
              <Button size="lg" variant="outline" className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-lg px-8 py-6 thick-border">
                <Phone className="mr-2 w-5 h-5" />
                {PHONE_NUMBERS.CAPE_COD.display}
              </Button>
            </a>
            <Link href="/contact">
              <Button size="lg" className="bg-sidebar hover:bg-sidebar/90 text-sidebar-foreground text-lg px-8 py-6 thick-border">
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
