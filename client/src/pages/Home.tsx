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

const HUB = "/images/staircase-hub";

const heroSlides = [
  {
    desktop: `${HUB}/heroes/desktop/king-iron-works-curved-staircase.jpg`,
    mobile: `${HUB}/heroes/mobile/king-iron-works-curved-staircase.jpg`,
    alt: "Sweeping curved staircase — King Iron Works signature craftsmanship",
  },
  {
    desktop: `${HUB}/heroes/desktop/king-iron-works-floating-cantilever-staircase.jpg`,
    mobile: `${HUB}/heroes/mobile/king-iron-works-floating-cantilever-staircase.jpg`,
    alt: "Floating cantilever staircase — gravity-defying engineering and design",
  },
  {
    desktop: "/images/portfolio-organized/Staircases/Grand-Ornamental/king-iron-works-staircase-grand-project2-hero.jpg",
    mobile: "/images/portfolio-organized/Staircases/Grand-Ornamental/king-iron-works-staircase-grand-project2-hero.jpg",
    alt: "Grand curved staircase with ornate medallion scrollwork and crystal chandelier",
  },
  {
    desktop: `${HUB}/heroes/desktop/king-iron-works-spiral-staircase.jpg`,
    mobile: `${HUB}/heroes/mobile/king-iron-works-spiral-staircase.jpg`,
    alt: "Sculptural spiral staircase — a work of art that happens to be a staircase",
  },
  {
    desktop: `${HUB}/heroes/desktop/king-iron-works-mono-stringer-staircase.jpg`,
    mobile: `${HUB}/heroes/mobile/king-iron-works-mono-stringer-staircase.jpg`,
    alt: "Mono-stringer staircase — one bold steel spine supporting every step",
  },
  {
    desktop: `${HUB}/heroes/desktop/king-iron-works-traditional-staircase.jpg`,
    mobile: `${HUB}/heroes/mobile/king-iron-works-traditional-staircase.jpg`,
    alt: "Traditional staircase elevated to stunning — timeless craft done right",
  },
];

const featuredWork = [
  {
    image: "/images/portfolio-organized/Staircases/Grand-Ornamental/king-iron-works-staircase-grand-project2-hero.jpg",
    title: "Grand Ornamental Staircase",
    category: "Staircases",
    link: "/portfolio/staircases",
  },
  {
    image: "/images/portfolio-organized/Railings/Interior-Railing/king-iron-works-interior-railing-1.jpg",
    title: "Modern Farmhouse Railing",
    category: "Railings",
    link: "/portfolio/railings",
  },
  {
    image: "/images/portfolio-organized/Gates/king-iron-works-gate-ornamental-black-gold-scrollwork.jpg",
    title: "Ornamental Entry Gate",
    category: "Gates",
    link: "/portfolio/gates",
  },
  {
    image: "/images/portfolio-organized/Fire-Escape/king-iron-works-fire-escape-website-VrmKyMuo.jpg",
    title: "Fire Escape System",
    category: "Fire Escapes",
    link: "/portfolio/fire-escapes",
  },
  {
    image: "/images/portfolio-organized/Balcony/king-iron-works-balcony-ornamental-boston-brick.jpg",
    title: "Boston Balcony Railing",
    category: "Balconies",
    link: "/portfolio/balconies",
  },
  {
    image: "/images/portfolio-organized/Structural-Steel/king-iron-works-structural-steel-10.jpg",
    title: "Commercial Steel Fabrication",
    category: "Structural Steel",
    link: "/portfolio/structural-steel",
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
                  <picture>
                    <source media="(min-width: 1024px)" srcSet={slide.desktop} />
                    <img
                      src={slide.mobile}
                      alt={slide.alt}
                      className="w-full h-full object-cover"
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                  </picture>
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

      {/* More Than Staircases — Marketing Section */}
      <section className="py-24 lg:py-32 bg-background">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <p className="section-eyebrow mb-4">More Than Staircases</p>
            <h2 className="text-display text-3xl md:text-5xl mb-6">
              If We Can Make Steel Dance,<br />
              <span className="text-accent">Imagine What We Can Do for You.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Our staircases stop people mid-sentence — but that's just where we start.
              The same master craftsmen who forge luxury staircases also build the railings,
              gates, balconies, and fire escapes that protect and beautify properties across
              nine states. If it's steel, we make it extraordinary.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {[
              {
                title: "Interior Railings",
                desc: "Custom staircase railings, balustrades, and handrails for homes and commercial spaces",
                image: "/images/portfolio-organized/Railings/Interior-Railing/king-iron-works-interior-railing-grid-pattern.jpg",
                link: "/interior-railing",
              },
              {
                title: "Exterior Railings",
                desc: "Weather-resistant porch, deck, and balcony railings built for New England",
                image: "/images/portfolio-organized/Railings/Exterior-Railing/king-iron-works-exterior-railing-8.jpg",
                link: "/exterior-railing",
              },
              {
                title: "Gates",
                desc: "Entry gates, driveway gates, garden gates, and security gates with optional automation",
                image: "/images/portfolio-organized/Gates/king-iron-works-gate-21.jpg",
                link: "/gate",
              },
              {
                title: "Fire Escapes",
                desc: "Licensed MA installer — new installation, repair, inspection, and certification",
                image: "/images/portfolio-organized/Fire-Escape/fire_escape_magazine_16x9.jpg",
                link: "/fire-escape",
              },
              {
                title: "Structural Steel",
                desc: "I-beams, mezzanines, support columns, and commercial steel fabrication",
                image: "/images/portfolio-organized/Structural-Steel/king-iron-works-structural-steel-20.jpg",
                link: "/structural-steel",
              },
              {
                title: "More",
                desc: "Fences, balconies, window guards, ADA ramps — if it's steel, we build it",
                image: "/images/portfolio-organized/Shop-Process/king-iron-works-shop-interior-webp.webp",
                link: "/services",
              },
            ].map((item, i) => (
              <Link key={i} href={item.link}>
                <div className="group cursor-pointer relative overflow-hidden rounded-sm">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-[280px] sm:h-[320px] object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                    <h3 className="text-display text-base sm:text-lg text-white mb-1">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-white/60 leading-snug mb-3 line-clamp-2">{item.desc}</p>
                    <span className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-accent group-hover:gap-2.5 transition-all">
                      Explore <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/services">
              <Button size="lg" variant="outline" className="border-border hover:border-accent hover:bg-accent hover:text-accent-foreground font-display font-bold">
                View All Services
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
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

      {/* Featured Projects — From Sketch to Reality */}
      <section className="py-24 lg:py-32 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <p className="section-eyebrow mb-4">Featured Projects</p>
            <h2 className="text-display text-3xl md:text-5xl mb-6">From Sketch to Reality</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              See how a pencil sketch on paper becomes a masterpiece in iron and gold.
              Follow the full journey — from first idea to final reveal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "The Peacock Masterpiece",
                desc: "1,200 hours of hand-forged peacock scrollwork with gold leaf accents",
                image: "/images/portfolio-organized/Staircases/Curved/Project 2/king-iron-works-staircase-curved-project1-hero.jpg",
                link: "/projects/peacock-masterpiece",
              },
              {
                title: "The Medallion Scrollwork",
                desc: "800 hours of ornamental medallion panels with gold-leaf rosettes",
                image: "/images/portfolio-organized/Staircases/Curved/Project 1/king-iron-works-staircase-website-425.jpg",
                link: "/projects/medallion-scrollwork",
              },
            ].map((project, i) => (
              <Link key={i} href={project.link}>
                <div className="group cursor-pointer relative overflow-hidden rounded-sm">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-[350px] sm:h-[420px] object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-4 left-4 bg-accent/90 text-accent-foreground px-3 py-1 text-[10px] font-display font-bold tracking-wider uppercase">
                    From Sketch to Reality
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-display text-xl sm:text-2xl text-white mb-2">{project.title}</h3>
                    <p className="text-sm text-white/60 mb-4">{project.desc}</p>
                    <span className="inline-flex items-center gap-2 text-sm font-display font-bold text-accent group-hover:gap-3 transition-all">
                      See the Full Journey <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
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
              <Link key={i} href={work.link}>
                <div className="relative group overflow-hidden cursor-pointer">
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
              </Link>
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
