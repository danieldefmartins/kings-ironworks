import { PHONE_NUMBERS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import GHLForm from "@/components/GHLForm";

export default function Contact() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-center bg-sidebar text-sidebar-foreground">
        <div className="container">
          <h1 className="text-display text-5xl md:text-7xl mb-6">CONTACT US</h1>
          <p className="text-xl md:text-2xl text-sidebar-foreground/80 max-w-2xl">
            Get a free consultation and quote for your ironwork project
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="container max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Form - GHL Integration */}
            <div className="lg:col-span-2">
              <h2 className="text-display text-3xl mb-6">REQUEST A QUOTE</h2>
              <div className="w-full">
                <GHLForm />
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              <Card className="p-6 border-4 border-border">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-heading text-lg mb-2">PHONE</h3>
                    <a
                      href={`tel:${PHONE_NUMBERS.MAIN.tel}`}
                      className="text-accent hover:underline text-lg font-medium"
                    >
                      {PHONE_NUMBERS.MAIN.display}
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">
                      Monday - Friday: 7AM - 5PM
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-4 border-border">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-heading text-lg mb-2">EMAIL</h3>
                    <a
                      href="mailto:info@kingirongroup.com"
                      className="text-accent hover:underline break-all"
                    >
                      info@kingirongroup.com
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">
                      We respond within 24 hours
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-4 border-border">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-heading text-lg mb-2">HEADQUARTERS</h3>
                    <p className="text-muted-foreground">
                      69 Norman St, Unit 20<br />
                      Everett, MA 02149
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Visit our fabrication shop by appointment
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-4 border-border">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-heading text-lg mb-2">HOURS</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Monday - Friday: 7:00 AM - 5:00 PM</p>
                      <p>Saturday: By Appointment</p>
                      <p>Sunday: Closed</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-4 border-accent bg-accent/5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">🎖️</span>
                  <h3 className="text-heading text-lg">MILITARY DISCOUNT</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>10% OFF for active duty military, veterans, and their families.</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Thank you for your service. Mention this discount when requesting a quote.
                </p>
              </Card>
              
              <Card className="p-6 border-4 border-border bg-card">
                <h3 className="text-heading text-lg mb-2">EMERGENCY SERVICES</h3>
                <p className="text-sm text-muted-foreground">
                  Fire escape emergency repairs available. Call our main line for urgent assistance.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Locations Quick Reference */}
      <section className="diagonal-cut-top bg-secondary text-secondary-foreground py-24">
        <div className="container">
          <h2 className="text-display text-4xl text-center mb-12">ALL LOCATIONS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">Everett, MA</h3>
              <p className="text-sm text-muted-foreground mb-3">Headquarters</p>
              <a href={`tel:${PHONE_NUMBERS.BOSTON.tel}`} className="text-accent hover:underline text-sm">
                {PHONE_NUMBERS.BOSTON.display}
              </a>
            </Card>
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">Cape Cod, MA</h3>
              <p className="text-sm text-muted-foreground mb-3">By Appointment</p>
              <a href={`tel:${PHONE_NUMBERS.CAPE_COD.tel}`} className="text-accent hover:underline text-sm">
                {PHONE_NUMBERS.CAPE_COD.display}
              </a>
            </Card>
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">Worcester, MA</h3>
              <p className="text-sm text-muted-foreground mb-3">By Appointment</p>
              <a href={`tel:${PHONE_NUMBERS.BOSTON.tel}`} className="text-accent hover:underline text-sm">
                {PHONE_NUMBERS.BOSTON.display}
              </a>
            </Card>
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">Miami, FL</h3>
              <p className="text-sm text-muted-foreground mb-3">By Appointment</p>
              <a href={`tel:${PHONE_NUMBERS.MIAMI.tel}`} className="text-accent hover:underline text-sm">
                {PHONE_NUMBERS.MIAMI.display}
              </a>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
