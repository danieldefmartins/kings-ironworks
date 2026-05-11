import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { ArrowRight, Phone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneLink } from "@/components/PhoneLink";
import { useLocalPhone } from "@/lib/useLocalPhone";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

const HUB = "/images/staircase-hub";

const heroSlides = [
  {
    desktop: `${HUB}/tiers/desktop/king-iron-works-curved-ultra-luxury.jpg`,
    mobile: `${HUB}/tiers/mobile/king-iron-works-curved-ultra-luxury.jpg`,
    alt: "Ultra-luxury curved staircase with hand-forged ornamental balustrade and gold leaf accents",
  },
  {
    desktop: "/images/portfolio-organized/Staircases/Grand-Ornamental/king-iron-works-staircase-grand-project2-hero.jpg",
    mobile: "/images/portfolio-organized/Staircases/Grand-Ornamental/king-iron-works-staircase-grand-project2-hero.jpg",
    alt: "Grand curved staircase with ornate medallion scrollwork and crystal chandelier",
  },
  {
    desktop: `${HUB}/tiers/desktop/king-iron-works-cantilever-luxury.jpg`,
    mobile: `${HUB}/tiers/mobile/king-iron-works-cantilever-luxury.jpg`,
    alt: "Luxury floating cantilever staircase with frameless glass railing and LED lighting",
  },
  {
    desktop: "/images/portfolio-organized/Staircases/Curved/king-iron-works-staircase-curved-project1-reveal.jpg",
    mobile: "/images/portfolio-organized/Staircases/Curved/king-iron-works-staircase-curved-project1-reveal.jpg",
    alt: "The master craftsman with his finished curved staircase masterpiece",
  },
  {
    desktop: `${HUB}/tiers/desktop/king-iron-works-spiral-luxury.jpg`,
    mobile: `${HUB}/tiers/mobile/king-iron-works-spiral-luxury.jpg`,
    alt: "Luxury spiral staircase with curved glass railing and LED under-tread lighting",
  },
  {
    desktop: `${HUB}/tiers/desktop/king-iron-works-mono-modern.jpg`,
    mobile: `${HUB}/tiers/mobile/king-iron-works-mono-modern.jpg`,
    alt: "Modern mono-stringer staircase with cable railing and open risers",
  },
];

interface CityHeroProps {
  cityName: string;
  stateName?: string;
  tagline?: string;
}

export default function CityHero({ cityName, stateName, tagline }: CityHeroProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const localPhone = useLocalPhone();

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

  const displayLocation = stateName ? `${cityName}, ${stateName}` : cityName;
  const subtext = tagline || `Custom ironwork, staircases, railings, and structural steel for ${displayLocation} homes and businesses. Hand-forged in our Everett, MA shop.`;

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

      <div className="absolute bottom-0 left-0 right-0 z-10 pb-6 sm:pb-10">
        <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto lg:mx-0 lg:ml-8 xl:ml-16">
          <div className="inline-block px-3 py-1.5 bg-accent text-accent-foreground text-xs font-display font-bold tracking-wider mb-3">
            SERVING {cityName.toUpperCase()} &bull; SINCE 2004
          </div>

          <h1 className="text-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-3 leading-[1.1]" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.6)" }}>
            We Make Steel
            <br />
            Dance in {cityName}
            <span className="text-white" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.3)", textShadow: "0 0 30px rgba(0,0,0,0.8), 0 2px 10px rgba(0,0,0,0.9)" }}>.</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-white/80 mb-5 leading-relaxed max-w-xl">
            {subtext}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/contact">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-sm sm:text-base px-6 py-4 font-display font-bold">
                FREE ASSESSMENT
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <PhoneLink tel={localPhone.tel}>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-sm sm:text-base px-6 py-4 font-display font-bold">
                <Phone className="mr-2 w-4 h-4" />
                {localPhone.display}
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
              <span>Serving {cityName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span>Made in USA</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
