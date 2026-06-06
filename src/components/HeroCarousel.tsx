"use client";

import { Button } from "@/components/ui/button";
import { PHONE_NUMBERS } from "@/lib/constants";
import { PhoneLink } from "@/components/PhoneLink";
import Link from "next/link";
import { ArrowRight, Phone, CheckCircle2 } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useState, useEffect, useCallback } from "react";
import type { CarouselApi } from "@/components/ui/carousel";

export const heroSlides = [
  {
    desktop: "/images/carousel/staircase-grand-16x9.jpg",
    mobile: "/images/portfolio-organized/Staircases/Grand-Ornamental/king-iron-works-staircase-grand-project2-hero.jpg",
    alt: "Grand ornamental staircase — 25+ years of master craftsmanship",
    title: "Custom Staircases",
    subtitle: "25+ Years of Master Craftsmanship",
    description: "From grand ornamental to sleek modern — we've built 1,000+ staircases across 9 states. Licensed, insured, and trusted by homeowners and contractors since 2001.",
    link: "/portfolio/staircases",
  },
  {
    desktop: "/images/carousel/staircase-curved-16x9.jpg",
    mobile: "/images/portfolio-organized/Staircases/Curved/Project 2/king-iron-works-staircase-curved-ornamental-completed.jpg",
    alt: "Curved ornamental iron staircase with gold leaf accents",
    title: "We Make Steel Dance.",
    subtitle: "1,000+ Projects Completed",
    description: "Every curve, every scroll, every weld — handcrafted by our master ironworkers. Your staircase isn't just a way up. It's the centerpiece of your home.",
    link: "/portfolio/staircases",
  },
  {
    desktop: "/images/carousel/structural-steel-16x9.jpg",
    mobile: "/images/portfolio-organized/Structural-Steel/king-iron-works-structural-steel-33.jpg",
    alt: "Structural steel fabrication and erection — commercial and residential",
    title: "Structural Steel",
    subtitle: "Commercial & Residential",
    description: "The backbone of your building. Steel beams, columns, mezzanines, and emergency structural repairs. Certified welders. On-time delivery. Free structural assessments.",
    link: "/structural-steel",
  },
  {
    desktop: "/images/carousel/juliet-balcony-16x9.jpg",
    mobile: "/images/portfolio-organized/Juliet-Balcony/king-iron-works-juliet-balcony-17.jpg",
    alt: "Custom Juliet balcony railing — elegant iron design",
    title: "Juliet Balconies",
    subtitle: "Elegance Meets Safety",
    description: "Add European charm to any window or door. Custom-designed Juliet balconies in ornamental, modern, and classic styles. Code-compliant and built to last a lifetime.",
    link: "/juliet-balcony",
  },
  {
    desktop: "/images/carousel/exterior-railing-16x9.jpg",
    mobile: "/images/portfolio-organized/Railings/Exterior-Railing/king-iron-works-exterior-railing-project-9.jpg",
    alt: "Custom exterior iron railing — built to withstand any weather",
    title: "Exterior Railings",
    subtitle: "Built for New England Weather",
    description: "Stoops, porches, balconies, and walkways. Hot-dip galvanized and powder-coated to resist rust, salt, and snow. 20+ year durability guarantee.",
    link: "/exterior-railing",
  },
  {
    desktop: "/images/carousel/exterior-railing-modern-16x9.jpg",
    mobile: "/images/portfolio-organized/Railings/Exterior-Railing/king-iron-works-exterior-railing-hor-bar-balcony-modern-1.jpg",
    alt: "Modern horizontal bar balcony railing — sleek contemporary design",
    title: "Modern Railings",
    subtitle: "Contemporary Design",
    description: "Clean lines, horizontal bars, cable rail, and glass panels. Modern railing systems for new construction and renovations. Architect-friendly with CAD drawings included.",
    link: "/exterior-railing",
  },
  {
    desktop: "/images/carousel/interior-railing-27-16x9.jpg",
    mobile: "/images/portfolio-organized/Railings/Interior-Railing/king-iron-works-interior-railing-27.jpg",
    alt: "Luxury interior iron railing — the detail guests notice first",
    title: "Interior Railings",
    subtitle: "The Detail Guests Notice First",
    description: "Hand-forged interior railings in ornamental, modern, and transitional styles. From simple straight runs to sweeping curved designs — each one custom-built for your space.",
    link: "/interior-railing",
  },
  {
    desktop: "/images/carousel/interior-railing-32-16x9.jpg",
    mobile: "/images/portfolio-organized/Railings/Interior-Railing/king-iron-works-interior-railing-32.jpg",
    alt: "Custom interior railing with ornamental scrollwork",
    title: "Ornamental Ironwork",
    subtitle: "Handcrafted by Master Artisans",
    description: "Scrolls, medallions, and custom motifs forged by hand. Not mass-produced — every piece is one of a kind. This is the ironwork that turns houses into homes.",
    link: "/interior-railing",
  },
  {
    desktop: "/images/carousel/interior-railing-6-16x9.jpg",
    mobile: "/images/portfolio-organized/Railings/Interior-Railing/king-iron-works-interior-railing-6.jpg",
    alt: "Custom iron railing with wood handrail — transitional style",
    title: "Iron & Wood Railings",
    subtitle: "The Perfect Combination",
    description: "Iron balusters with wood handrails — the most popular railing style in America. We build them better: hand-forged iron, premium hardwood, flawless installation.",
    link: "/interior-railing",
  },
  {
    desktop: "/images/carousel/deck-railing-16x9.jpg",
    mobile: "/images/portfolio-organized/Railings/Deck-Railing/king-iron-works-deck-railing-project-4.jpg",
    alt: "Custom deck railing — iron and wood combination",
    title: "Deck Railings",
    subtitle: "Iron + Wood Perfection",
    description: "Custom deck railings that blend iron strength with wood warmth. Code-compliant, weather-resistant, and designed to match your outdoor living space. Free on-site measurements.",
    link: "/deck-railing",
  },
  {
    desktop: "/images/carousel/spiral-staircase-16x9.jpg",
    mobile: "/images/portfolio-organized/Staircases/Spiral/Interior Spiral/king-iron-works-exterior-railing-project-200.jpg",
    alt: "Custom spiral staircase — space-saving and stunning",
    title: "Spiral Staircases",
    subtitle: "Space-Saving Showpieces",
    description: "Sculptural steel that spirals skyward. Perfect for tight footprints and open lofts. Indoor and outdoor spirals in ornamental, modern, and industrial styles. Engineered to code.",
    link: "/portfolio/staircases",
  },
  {
    desktop: "/images/carousel/fire-escape-16x9.jpg",
    mobile: "/images/portfolio-organized/Fire-Escape/fire_escape_magazine_2x3.jpg",
    alt: "Fire escape installation and repair — code compliant, fully permitted",
    title: "Fire Escapes",
    subtitle: "Code Compliant · Fully Permitted",
    description: "New installations, repairs, and annual inspections. We handle permits, engineering, and city inspections. Serving landlords, property managers, and municipalities across 9 states.",
    link: "/fire-escape",
  },
];

interface HeroCarouselProps {
  cityName?: string;
  stateName?: string;
}

export default function HeroCarousel({ cityName, stateName }: HeroCarouselProps) {
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
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi, onSelect]);

  // Build the subtitle badge text
  const getSubtitleBadge = () => {
    if (cityName && stateName) {
      return `Serving ${cityName}, ${stateName} · 25+ Years`;
    }
    if (cityName) {
      return `Serving ${cityName} · 25+ Years`;
    }
    // Default: use per-slide subtitle
    return null;
  };

  const locationBadge = getSubtitleBadge();

  return (
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
                  <source
                    media="(min-width: 1024px)"
                    srcSet={slide.desktop}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </Carousel>

      {/* Overlay Content — changes per slide */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-6 sm:pb-10">
        <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto lg:mx-0 lg:ml-8 xl:ml-16">
          <div className="inline-block px-3 py-1.5 bg-accent text-accent-foreground text-xs font-display font-bold tracking-wider mb-3">
            {locationBadge || heroSlides[currentSlide]?.subtitle || "SINCE 2001 · 25+ YEARS OF EXCELLENCE"}
          </div>

          <h1
            className="text-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-3 leading-[1.1] transition-opacity duration-500"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.6)" }}
            key={currentSlide}
          >
            {heroSlides[currentSlide]?.title || "Custom Ironwork"}
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-white/80 mb-5 leading-relaxed max-w-xl transition-opacity duration-500" key={`desc-${currentSlide}`}>
            {heroSlides[currentSlide]?.description || ""}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground text-sm sm:text-base px-6 py-4 font-display font-bold"
              >
                FREE ASSESSMENT
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href={heroSlides[currentSlide]?.link || "/portfolio"}>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 text-sm sm:text-base px-6 py-4 font-display font-bold"
              >
                VIEW OUR WORK
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs sm:text-sm text-white/60">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span>Licensed &amp; Insured</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span>9 States Served</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span>Made in USA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <PhoneLink tel={PHONE_NUMBERS.MAIN.tel} className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-accent" />
                <span>{PHONE_NUMBERS.MAIN.display}</span>
              </PhoneLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
