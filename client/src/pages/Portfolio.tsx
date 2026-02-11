import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Portfolio() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center bg-sidebar text-sidebar-foreground">
        <div className="container">
          <h1 className="text-display text-5xl md:text-7xl mb-6">OUR PORTFOLIO</h1>
          <p className="text-xl md:text-2xl text-sidebar-foreground/80 max-w-2xl">
            20+ years of exceptional ironwork across Boston and beyond
          </p>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-display text-4xl md:text-5xl mb-6">PORTFOLIO GALLERY COMING SOON</h2>
            <p className="text-xl text-muted-foreground mb-8">
              We're currently updating our portfolio with high-quality photos of our recent projects. 
              In the meantime, contact us to see examples of our work or schedule a visit to our Everett facility.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 thick-border">
                  CONTACT US
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-border thick-border"
                onClick={() => toast.info("Portfolio gallery coming soon!")}
              >
                NOTIFY ME WHEN READY
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
