import { Button } from "@/components/ui/button";

import { PHONE_NUMBERS } from "@/lib/constants";
import { PhoneLink } from "@/components/PhoneLink";
import { Link } from "wouter";
import { ArrowRight, Phone, CheckCircle2 } from "lucide-react";
import Testimonials from "@/components/Testimonials";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useState, useEffect, useCallback } from "react";
import type { CarouselApi } from "@/components/ui/carousel";

const heroSlides = [
  {
    image: "/images/portfolio-organized/Staircases/Curved/king-iron-works-staircase-curved-project1-hero.jpg",
    alt: "Hand-forged peacock scrollwork curved staircase — a King Iron Works masterpiece",
    objectPosition: "center 30%",
  },
  {
    image: "/images/portfolio-organized/Staircases/Grand-Ornamental/king-iron-works-staircase-grand-project2-hero.jpg",
    alt: "Grand curved staircase with ornate medallion scrollwork and crystal chandelier",
    objectPosition: "center center",
  },
  {
    image: "/images/portfolio-organized/Staircases/Curved/king-iron-works-staircase-curved-project1-reveal.jpg",
    alt: "The master craftsman with his finished curved staircase masterpiece",
    objectPosition: "center 40%",
  },
  {
    image: "/images/new-portfolio/staircase/king-iron-works-staircase-curved-ornamental-gold-accents.jpg",
    alt: "Grand curved staircase with crystal chandelier and ornate ironwork",
    objectPosition: "center 20%",
  },
  {
    image: "/images/new-portfolio/staircase/king-iron-works-staircase-curved-modern-rod-railing.jpg",
    alt: "Industrial curved steel spiral staircase in open-concept home",
    objectPosition: "center center",
  },
];

const featuredWork = [
  {
    image: "/images/portfolio-organized/Fire-Escape/king-iron-works-fire-escape-website-VrmKyMuo.jpg",
    title: "Fire Escape Installation",
    category: "Commercial",
  },
  {
    image: "/images/portfolio-organized/Gates/king-iron-works-gate-ornamental-black-gold-scrollwork.jpg",
    title: "Custom Ornamental Gate",
    category: "Residential",
  },
  {
    image: "/images/portfolio-organized/Interior-Railing/king-iron-works-interior-railing-grid-pattern.jpg",
    title: "Interior Railing",
    category: "Residential",
  },
  {
    image: "/images/portfolio-organized/Exterior-Railing/king-iron-works-exterior-railing-vert-picket-stone-4.jpg",
    title: "Exterior Railing",
    category: "Residential",
  },
  {
    image: "/images/portfolio-organized/Before-After/king-iron-works-before-after-curved-staircase-before.jpg",
    title: "Historic Restoration",
    category: "Commercial",
  },
  {
    image: "/images/portfolio-organized/Gates/king-iron-works-iron-glass-entry-doors.jpg",
    title: "Iron & Glass Doors",
    category: "Residential",
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
                <div className="relative h-[92vh] sm:h-[90vh] bg-black overflow-hidden">
                  <img
                    src={slide.image}
                    alt={slide.alt}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: slide.objectPosition }}
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/5" />
                  <div className="hidden lg:block absolute inset-y-0 left-0 w-[35%] bg-gradient-to-r from-black via-black/50 to-transparent" />
                  <div className="hidden lg:block absolute inset-y-0 right-0 w-[35%] bg-gradient-to-l from-black via-black/50 to-transparent" />
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

        {/* Overlay Content */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pb-6 sm:pb-10">
          <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto lg:mx-0 lg:ml-8 xl:ml-16">
            <div className="inline-block px-3 py-1.5 bg-accent text-accent-foreground text-xs font-display font-bold tracking-wider mb-3">
              SINCE 2004 &bull; 20+ YEARS OF EXCELLENCE
            </div>

            <h1 className="text-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-3 leading-[1.1]" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.6)" }}>
              We Make Steel
              <br />
              <span className="text-white" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.3)", textShadow: "0 0 30px rgba(0,0,0,0.8), 0 2px 10px rgba(0,0,0,0.9)" }}>Dance.</span>
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

      {/* Services Section */}
      <section className="py-24 lg:py-32 bg-background">
        <div className="container">
          <div className="text-center mb-20">
            <p className="section-eyebrow mb-4">What We Do</p>
            <h2 className="text-display text-3xl md:text-5xl mb-6">Crafted by Hand,<br />Built to Last</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              From custom staircases to structural steel, every piece leaves our Everett shop
              with the precision and care of twenty years of mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
            {[
              {
                title: "Custom Staircases & Railings",
                description: "Curved, floating, spiral, and traditional staircases. Glass, cable, and ornamental iron railings. Designed to your exact vision.",
                link: "/staircases",
              },
              {
                title: "Fire Escape Services",
                description: "Licensed installation, repair, inspection, and MA State Building Code certification. Emergency services available across New England.",
                link: "/fire-escape",
              },
              {
                title: "Structural Steel & Restoration",
                description: "Commercial fabrication, historic building restoration, and custom metalwork. Period-accurate replication for landmark properties.",
                link: "/structural-steel",
              },
            ].map((service, i) => (
              <Link key={i} href={service.link}>
                <div className="group cursor-pointer">
                  <div className="w-12 h-[2px] bg-accent mb-8 group-hover:w-20 transition-all duration-300" />
                  <h3 className="text-display text-xl md:text-2xl mb-4 group-hover:text-accent transition-colors">{service.title}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">{service.description}</p>
                  <span className="inline-flex items-center gap-2 text-sm font-display font-bold text-accent">
                    Learn More
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 lg:py-24 bg-sidebar text-sidebar-foreground">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {[
              { number: "20+", label: "Years", desc: "of expertise in custom ironwork" },
              { number: "9", label: "States", desc: "served across the East Coast" },
              { number: "100%", label: "In-House", desc: "fabrication in our Everett shop" },
              { number: "MA", label: "Licensed", desc: "fire escape installer & certified" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl lg:text-5xl font-display font-bold text-accent mb-2">{stat.number}</div>
                <div className="text-sm font-display font-bold tracking-wider uppercase mb-2">{stat.label}</div>
                <p className="text-sm text-sidebar-foreground/50">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Work */}
      <section className="py-24 lg:py-32 bg-background">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16">
            <div>
              <p className="section-eyebrow mb-4">Portfolio</p>
              <h2 className="text-display text-3xl md:text-5xl">Featured Work</h2>
            </div>
            <Link href="/portfolio">
              <span className="inline-flex items-center gap-2 text-sm font-display font-bold text-accent mt-4 md:mt-0 hover:gap-3 transition-all">
                View Full Portfolio
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredWork.map((work, i) => (
              <div key={i} className="relative group overflow-hidden cursor-pointer">
                <img
                  src={work.image}
                  alt={work.title}
                  className="w-full h-[380px] object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <p className="text-xs text-accent font-bold tracking-wider uppercase mb-1">{work.category}</p>
                  <h3 className="text-lg font-display font-bold text-white">{work.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* Locations */}
      <section className="py-24 lg:py-32 bg-sidebar text-sidebar-foreground">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <p className="section-eyebrow mb-4" style={{ color: "var(--accent)" }}>Locations</p>
            <h2 className="text-display text-3xl md:text-5xl mb-6">Serving the Entire East Coast</h2>
            <p className="text-lg text-sidebar-foreground/60 mb-10 leading-relaxed">
              With our fabrication shop in Everett, MA and service teams across nine states,
              we bring master craftsmanship to your doorstep.
            </p>
            <Link href="/locations">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-display font-bold px-8">
                Find Your Location
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 lg:py-32 bg-accent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-display text-3xl md:text-5xl text-accent-foreground mb-6">Ready to Start<br />Your Project?</h2>
            <p className="text-lg text-accent-foreground/70 mb-10 leading-relaxed">
              Free consultation and assessment. Tell us what you're dreaming of —
              we'll engineer and forge it into reality.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" className="bg-sidebar text-sidebar-foreground hover:bg-sidebar/90 font-display font-bold px-8 py-5">
                  Request a Quote
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <PhoneLink tel={PHONE_NUMBERS.MAIN.tel}>
                <Button size="lg" variant="outline" className="border-accent-foreground/30 text-accent-foreground hover:bg-accent-foreground/10 font-display font-bold px-8 py-5">
                  <Phone className="mr-2 w-4 h-4" />
                  Call Now
                </Button>
              </PhoneLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
