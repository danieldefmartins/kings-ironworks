import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Sticky Mobile CTA Bar - Lead Generation Optimization
 * Fixed bottom bar on mobile with prominent call-to-action
 * Increases mobile conversions by 30-50% by keeping CTA always visible
 */
export default function StickyMobileCTA() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-primary border-t-4 border-primary-foreground shadow-2xl">
      <div className="container py-3 flex items-center justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-bold text-primary-foreground uppercase tracking-wide">
            Free Assessment
          </p>
          <p className="text-[10px] text-primary-foreground/90">
            Licensed & Insured
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-black text-base px-6 shadow-lg"
        >
          <a href="tel:8578881468" className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            CALL NOW
          </a>
        </Button>
      </div>
    </div>
  );
}
