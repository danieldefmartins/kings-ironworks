import { Phone, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useLocalPhone } from "@/lib/useLocalPhone";
import { PhoneLink } from "@/components/PhoneLink";

export default function StickyMobileCTA() {
  const localPhone = useLocalPhone();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] lg:hidden bg-sidebar border-t border-sidebar-border/30 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      <div className="flex items-stretch">
        <Link href="/contact" className="flex-1">
          <div className="flex items-center justify-center gap-2 py-3.5 bg-accent text-accent-foreground">
            <span className="text-sm font-display font-bold">Free Assessment</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
        <PhoneLink tel={localPhone.tel} className="flex-1">
          <div className="flex items-center justify-center gap-2 py-3.5 text-sidebar-foreground">
            <Phone className="w-4 h-4" />
            <span className="text-sm font-display font-bold">Call Now</span>
          </div>
        </PhoneLink>
      </div>
    </div>
  );
}
