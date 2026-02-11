import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    service: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Thank you! We'll contact you within 24 hours.");
    setFormData({
      name: "",
      email: "",
      phone: "",
      location: "",
      service: "",
      message: "",
    });
  };

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
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="p-8 border-4 border-border">
                <h2 className="text-display text-3xl mb-6">REQUEST A QUOTE</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name" className="text-sm font-heading mb-2 block">
                        FULL NAME *
                      </Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="border-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm font-heading mb-2 block">
                        EMAIL *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="border-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="phone" className="text-sm font-heading mb-2 block">
                        PHONE *
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="border-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="location" className="text-sm font-heading mb-2 block">
                        PREFERRED LOCATION *
                      </Label>
                      <Select
                        value={formData.location}
                        onValueChange={(value) => setFormData({ ...formData, location: value })}
                        required
                      >
                        <SelectTrigger className="border-2">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="everett">Everett, MA</SelectItem>
                          <SelectItem value="cape-cod">Cape Cod, MA</SelectItem>
                          <SelectItem value="worcester">Worcester, MA</SelectItem>
                          <SelectItem value="miami">Miami, FL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="service" className="text-sm font-heading mb-2 block">
                      SERVICE NEEDED *
                    </Label>
                    <Select
                      value={formData.service}
                      onValueChange={(value) => setFormData({ ...formData, service: value })}
                      required
                    >
                      <SelectTrigger className="border-2">
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fire-escape">Fire Escape Services</SelectItem>
                        <SelectItem value="historic">Historic Restoration</SelectItem>
                        <SelectItem value="custom">Custom Ironwork</SelectItem>
                        <SelectItem value="railings">Railings & Stairs</SelectItem>
                        <SelectItem value="gates">Gates & Fences</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-sm font-heading mb-2 block">
                      PROJECT DETAILS *
                    </Label>
                    <Textarea
                      id="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us about your project..."
                      className="border-2"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-accent hover:bg-accent/90 thick-border"
                  >
                    SUBMIT REQUEST
                  </Button>
                </form>
              </Card>
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
                      href="tel:8578881468"
                      className="text-accent hover:underline text-lg font-medium"
                    >
                      (857) 888-1468
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
                      href="mailto:info@kingsironworks.com"
                      className="text-accent hover:underline break-all"
                    >
                      info@kingsironworks.com
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
              <a href="tel:8578881468" className="text-accent hover:underline text-sm">
                (857) 888-1468
              </a>
            </Card>
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">Cape Cod, MA</h3>
              <p className="text-sm text-muted-foreground mb-3">By Appointment</p>
              <a href="tel:8578881468" className="text-accent hover:underline text-sm">
                (857) 888-1468
              </a>
            </Card>
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">Worcester, MA</h3>
              <p className="text-sm text-muted-foreground mb-3">By Appointment</p>
              <a href="tel:8578881468" className="text-accent hover:underline text-sm">
                (857) 888-1468
              </a>
            </Card>
            <Card className="p-6 bg-card text-card-foreground border-2">
              <h3 className="text-heading text-xl mb-2">Miami, FL</h3>
              <p className="text-sm text-muted-foreground mb-3">By Appointment</p>
              <a href="tel:8578881468" className="text-accent hover:underline text-sm">
                (857) 888-1468
              </a>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
