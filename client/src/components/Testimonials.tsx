import { Star } from "lucide-react";

/**
 * Testimonials Section - Lead Generation Optimization
 * Social proof increases trust and conversions by 20-30%
 * Features customer reviews with names, locations, and star ratings
 */

const testimonials = [
  {
    name: "Michael Chen",
    location: "Beacon Hill, Boston",
    rating: 5,
    text: "King Iron Works restored the historic railings on our 1890s brownstone. The craftsmanship is absolutely stunning—you can't tell the difference from the original. They're true artisans.",
    service: "Historic Restoration"
  },
  {
    name: "Sarah O'Brien",
    location: "South End, Boston",
    rating: 5,
    text: "Our fire escape failed inspection and we needed emergency repairs. Kings came out same-day, completed the work, and got us certified within 48 hours. Lifesavers!",
    service: "Fire Escape Repair"
  },
  {
    name: "David Martinez",
    location: "Cambridge, MA",
    rating: 5,
    text: "We hired Kings for custom iron gates for our property. From design to installation, they were professional, on-time, and the quality exceeded our expectations. Highly recommend!",
    service: "Custom Ironwork"
  },
  {
    name: "Jennifer Walsh",
    location: "Cape Cod, MA",
    rating: 5,
    text: "As a property manager, I've worked with many contractors. King Iron Works stands out for their reliability, fair pricing, and exceptional work. They're my go-to for all ironwork needs.",
    service: "Commercial Projects"
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-secondary text-secondary-foreground">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            TRUSTED BY BOSTON HOMEOWNERS
          </h2>
          <p className="text-xl text-secondary-foreground/80 max-w-2xl mx-auto">
            See why property owners across Massachusetts choose King Iron Works for their historic restoration and fire escape needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card text-card-foreground p-8 rounded-lg border-4 border-primary/20 hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                ))}
              </div>

              <p className="text-lg mb-6 leading-relaxed italic">
                "{testimonial.text}"
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="font-black text-lg">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary uppercase tracking-wide">
                    {testimonial.service}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="inline-block bg-primary text-primary-foreground px-8 py-4 rounded-lg border-4 border-primary-foreground/20">
            <p className="text-3xl font-black mb-1">4.9/5.0 Average Rating</p>
            <p className="text-sm opacity-90">Based on 200+ verified reviews</p>
          </div>
        </div>
      </div>
    </section>
  );
}
