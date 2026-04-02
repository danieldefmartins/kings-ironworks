import { PHONE_NUMBERS } from "@/lib/constants";
import { PhoneLink } from "@/components/PhoneLink";
import { Card } from "@/components/ui/card";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import GHLForm from "@/components/GHLForm";
import { useLocalPhone } from "@/lib/useLocalPhone";

export default function Contact() {
  const localPhone = useLocalPhone();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-center bg-sidebar text-sidebar-foreground pt-4">
        <div className="container">
          <h1 className="text-display text-5xl md:text-7xl mb-6">CONTACT US</h1>
          <p className="text-xl md:text-2xl text-sidebar-foreground/80 max-w-2xl">
            Get a free consultation and quote for your ironwork project
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="diagonal-cut-top bg-card py-24">
        <div className="w-full px-[3%] max-w-[1800px] mx-auto">
          <h2 className="text-display text-3xl md:text-4xl mb-8 text-center">REQUEST A QUOTE</h2>

          {/* Full-width Form */}
          <div className="w-full mb-12">
            <GHLForm />
            <div className="mt-6 text-sm text-muted-foreground text-center">
              <p>
                By submitting this form, you agree to our{" "}
                <a href="/privacy" className="text-accent hover:underline font-medium">
                  Privacy Policy
                </a>
                {" "}and{" "}
                <a href="/terms" className="text-accent hover:underline font-medium">
                  Terms of Service
                </a>
                .
              </p>
            </div>
          </div>

          {/* Contact Info Cards Below Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              <Card className="p-6 border-4 border-accent bg-accent/5">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-heading text-lg mb-1">YOUR LOCAL NUMBER</h3>
                    <p className="text-xs text-muted-foreground mb-2">{localPhone.label} Office</p>
                    <PhoneLink tel={localPhone.tel}
                      className="text-accent hover:underline text-lg font-medium"
                    >
                      {localPhone.display}
                    </PhoneLink>
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
                      href="mailto:info@kingsironsworks.com"
                      className="text-accent hover:underline break-all"
                    >
                      info@kingsironsworks.com
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
      </section>

      {/* Locations Quick Reference */}
      <section className="diagonal-cut-top bg-secondary text-secondary-foreground py-24">
        <div className="container">
          <h2 className="text-display text-4xl text-center mb-12">ALL LOCATIONS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">Everett, MA</h3>
              <p className="text-sm text-muted-foreground mb-3">Headquarters</p>
              <PhoneLink tel={PHONE_NUMBERS.BOSTON.tel} className="text-accent hover:underline text-sm">
                {PHONE_NUMBERS.BOSTON.display}
              </PhoneLink>
            </Card>
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">Cape Cod, MA</h3>
              <p className="text-sm text-muted-foreground mb-3">By Appointment</p>
              <PhoneLink tel={PHONE_NUMBERS.CAPE_COD.tel} className="text-accent hover:underline text-sm">
                {PHONE_NUMBERS.CAPE_COD.display}
              </PhoneLink>
            </Card>
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">Worcester, MA</h3>
              <p className="text-sm text-muted-foreground mb-3">By Appointment</p>
              <PhoneLink tel={PHONE_NUMBERS.WORCESTER.tel} className="text-accent hover:underline text-sm">
                {PHONE_NUMBERS.WORCESTER.display}
              </PhoneLink>
            </Card>
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">Miami, FL</h3>
              <p className="text-sm text-muted-foreground mb-3">By Appointment</p>
              <PhoneLink tel={PHONE_NUMBERS.MIAMI.tel} className="text-accent hover:underline text-sm">
                {PHONE_NUMBERS.MIAMI.display}
              </PhoneLink>
            </Card>
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">New Hampshire</h3>
              <p className="text-sm text-muted-foreground mb-3">By Appointment</p>
              <PhoneLink tel={PHONE_NUMBERS.NEW_HAMPSHIRE.tel} className="text-accent hover:underline text-sm">
                {PHONE_NUMBERS.NEW_HAMPSHIRE.display}
              </PhoneLink>
            </Card>
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">Maine</h3>
              <p className="text-sm text-muted-foreground mb-3">By Appointment</p>
              <PhoneLink tel={PHONE_NUMBERS.MAINE.tel} className="text-accent hover:underline text-sm">
                {PHONE_NUMBERS.MAINE.display}
              </PhoneLink>
            </Card>
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">Rhode Island</h3>
              <p className="text-sm text-muted-foreground mb-3">By Appointment</p>
              <PhoneLink tel={PHONE_NUMBERS.RHODE_ISLAND.tel} className="text-accent hover:underline text-sm">
                {PHONE_NUMBERS.RHODE_ISLAND.display}
              </PhoneLink>
            </Card>
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">New York</h3>
              <p className="text-sm text-muted-foreground mb-3">By Appointment</p>
              <PhoneLink tel={PHONE_NUMBERS.NEW_YORK.tel} className="text-accent hover:underline text-sm">
                {PHONE_NUMBERS.NEW_YORK.display}
              </PhoneLink>
            </Card>
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">Connecticut</h3>
              <p className="text-sm text-muted-foreground mb-3">By Appointment</p>
              <PhoneLink tel={PHONE_NUMBERS.CONNECTICUT.tel} className="text-accent hover:underline text-sm">
                {PHONE_NUMBERS.CONNECTICUT.display}
              </PhoneLink>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
