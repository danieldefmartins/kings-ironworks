import { Button } from "@/components/ui/button";

import { PHONE_NUMBERS } from "@/lib/constants";
import { PhoneLink } from "@/components/PhoneLink";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, Shield, Wrench, Building2, MapPin, Phone, CheckCircle2 } from "lucide-react";
import Testimonials from "@/components/Testimonials";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useState, useEffect, useCallback } from "react";
import type { CarouselApi } from "@/components/ui/carousel";

const heroSlides = [
  {
    image: "/images/new-portfolio/staircase/15414fcf-625a-4e55-860a-ab1fefbb89e6.jpg",
    alt: "Ornate curved staircase with hand-forged scrollwork and copper accents",
  },
  {
    image: "/images/new-portfolio/staircase/IMG_6934.JPEG",
    alt: "Grand curved staircase with crystal chandelier and ornate ironwork",
  },
  {
    image: "/images/new-portfolio/staircase/IMG_3906.JPEG",
    alt: "Modern floating staircase with glass panels and steel mono-stringer",
  },
  {
    image: "/images/new-portfolio/staircase/IMG_7991.JPEG",
    alt: "LED-lit floating staircase with horizontal railings and pendant lights",
  },
  {
    image: "/images/new-portfolio/staircase/FullSizeRender-5.jpg",
    alt: "Industrial curved steel spiral staircase in open-concept home",
  },
];

export default function Home() {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const onSelect = useCallback(() => {
    if (!carouselApi) return;
    setCurrentSlide(carouselApi.selectedScrollSnap());
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi) return;
    onSelect();
    carouselApi.on("select", onSelect);
    return () => { carouselApi.off("select", onSelect); };
  }, [carouselApi, onSelect]);

  return (
    <div className="min-h-screen">
      {/* Hero Section - Staircase Showcase Carousel */}
      <section className="relative overflow-hidden">
        <Carousel
          opts={{ loop: true }}
          plugins={[Autoplay({ delay: 5000, stopOnInteraction: false })]}
          setApi={setCarouselApi}
          className="w-full"
        >
          <CarouselContent className="ml-0">
            {heroSlides.map((slide, i) => (
              <CarouselItem key={i} className="pl-0 relative">
                <div className="relative h-[85vh] sm:h-[90vh]">
                  <img
                    src={slide.image}
                    alt={slide.alt}
                    className="w-full h-full object-cover"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Dot indicators */}
          <div className="absolute bottom-32 sm:bottom-40 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => carouselApi?.scrollTo(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentSlide ? "bg-white w-6" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </Carousel>

        {/* Overlay Content — positioned over the carousel */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pb-6 sm:pb-10">
          <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto lg:mx-0 lg:ml-8 xl:ml-16">
            <div className="inline-block px-3 py-1.5 bg-accent text-accent-foreground text-xs font-display font-bold tracking-wider mb-3">
              SINCE 2004 &bull; 20+ YEARS OF EXCELLENCE
            </div>

            <h1 className="text-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-3 leading-[1.1]">
              We Make Steel
              <br />
              <span className="text-accent">Dance.</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-white/80 mb-5 leading-relaxed max-w-xl">
              If we can make steel dance in a beautiful rhythm, imagine what we
              can do for your railings, staircases, and all your ironwork needs.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-sm sm:text-base px-6 py-4 font-display font-bold">
                  FREE ASSESSMENT
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <PhoneLink tel={PHONE_NUMBERS.MAIN.tel}>
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-sm sm:text-base px-6 py-4 font-display font-bold">
                  <Phone className="mr-2 w-4 h-4" />
                  {PHONE_NUMBERS.MAIN.display}
                </Button>
              </PhoneLink>
            </div>

            {/* Trust Badges */}
            <div className="mt-5 flex flex-wrap gap-3 text-xs sm:text-sm text-white/60">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span>Licensed Installer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span>4 Locations</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span>Made in USA</span>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {/* Fire Escape Installation */}
            <div className="relative group overflow-hidden">
              <img
                src="/images/VrmKyMuovdgoFRfz.JPG"
                alt="Fire escape installation"
                className="w-full h-[350px] object-cover border-8 border-border"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sidebar/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6 border-8 border-transparent group-hover:border-accent">
                <div>
                  <h3 className="text-heading text-xl text-sidebar-foreground mb-2">
                    FIRE ESCAPE INSTALLATION
                  </h3>
                  <p className="text-sidebar-foreground/80 text-sm">
                    Code-compliant installation on Boston building
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Gate */}
            <div className="relative group overflow-hidden">
              <img
                src="/images/ldKpYAFGAsEGkCVX.JPG"
                alt="Custom ornamental gate"
                className="w-full h-[350px] object-cover border-8 border-border"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sidebar/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6 border-8 border-transparent group-hover:border-accent">
                <div>
                  <h3 className="text-heading text-xl text-sidebar-foreground mb-2">
                    CUSTOM ORNAMENTAL GATE
                  </h3>
                  <p className="text-sidebar-foreground/80 text-sm">
                    Hand-crafted wrought iron gate design
                  </p>
                </div>
              </div>
            </div>

            {/* Interior Railing */}
            <div className="relative group overflow-hidden">
              <img
                src="/images/apLcldtAeVXzDTCh.JPG"
                alt="Interior iron railing"
                className="w-full h-[350px] object-cover border-8 border-border"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sidebar/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6 border-8 border-transparent group-hover:border-accent">
                <div>
                  <h3 className="text-heading text-xl text-sidebar-foreground mb-2">
                    INTERIOR RAILING
                  </h3>
                  <p className="text-sidebar-foreground/80 text-sm">
                    Custom staircase railing installation
                  </p>
                </div>
              </div>
            </div>

            {/* Exterior Railing */}
            <div className="relative group overflow-hidden">
              <img
                src="/images/KVrQsNoDvGzMAnwj.JPG"
                alt="Exterior railing"
                className="w-full h-[350px] object-cover border-8 border-border"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sidebar/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6 border-8 border-transparent group-hover:border-accent">
                <div>
                  <h3 className="text-heading text-xl text-sidebar-foreground mb-2">
                    EXTERIOR RAILING
                  </h3>
                  <p className="text-sidebar-foreground/80 text-sm">
                    Durable outdoor railing system
                  </p>
                </div>
              </div>
            </div>

            {/* Before & After */}
            <div className="relative group overflow-hidden">
              <img
                src="/images/FXhStnQxPmvbQEEX.JPG"
                alt="Restoration project"
                className="w-full h-[350px] object-cover border-8 border-border"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sidebar/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6 border-8 border-transparent group-hover:border-accent">
                <div>
                  <h3 className="text-heading text-xl text-sidebar-foreground mb-2">
                    HISTORIC RESTORATION
                  </h3>
                  <p className="text-sidebar-foreground/80 text-sm">
                    Period-accurate ironwork restoration
                  </p>
                </div>
              </div>
            </div>

            {/* Gate Detail */}
            <div className="relative group overflow-hidden">
              <img
                src="/images/aoFXjvosIbfREama.JPG"
                alt="Ornamental gate detail"
                className="w-full h-[350px] object-cover border-8 border-border"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sidebar/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6 border-8 border-transparent group-hover:border-accent">
                <div>
                  <h3 className="text-heading text-xl text-sidebar-foreground mb-2">
                    ORNAMENTAL IRONWORK
                  </h3>
                  <p className="text-sidebar-foreground/80 text-sm">
                    Intricate custom metalwork design
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

      {/* Testimonials Section - Lead Generation Optimization */}
      <Testimonials />

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
              <PhoneLink tel={PHONE_NUMBERS.MAIN.tel}>
                <Button size="lg" variant="outline" className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-lg px-8 py-6 thick-border">
                  <Phone className="mr-2 w-5 h-5" />
                  CALL NOW
                </Button>
              </PhoneLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
