import { Link } from "wouter";
import { Phone, Mail, MapPin } from "lucide-react";
import { useLocalPhone } from "@/lib/useLocalPhone";
import { PhoneLink } from "@/components/PhoneLink";

export default function Footer() {
  const localPhone = useLocalPhone();
  const isDefaultLocation = localPhone.label === "Main" || localPhone.label === "Boston";

  return (
    <footer className="bg-sidebar text-sidebar-foreground border-t-4 border-border">
      <div className="px-4 sm:px-6 lg:px-8 lg:max-w-[1280px] lg:mx-auto py-10 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          {/* Brand */}
          <div>
            <img
              src="/images/ughTFDIjdTrgGjGJ.jpeg"
              alt="King Iron Works"
              className="h-12 sm:h-16 w-auto object-contain mb-4"
            />
            <p className="text-sidebar-foreground/70 text-sm leading-relaxed mb-4">
              Boston's premier historic ironwork restoration and fire escape specialists since 2004.
              20+ years of American craftsmanship and safety excellence.
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-accent/20 border-2 border-accent">
                <span className="text-lg">🇺🇸</span>
                <span className="font-display font-bold text-sidebar-foreground text-xs">PROUD TO BE AMERICAN</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-accent/20 border-2 border-accent">
                <span className="text-lg">🎖️</span>
                <span className="font-display font-bold text-sidebar-foreground text-xs">10% MILITARY DISCOUNT</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-heading text-sm tracking-wider mb-4">QUICK LINKS</h4>
            <ul className="space-y-2">
              {[
                { href: "/services", label: "Services" },
                { href: "/portfolio", label: "Portfolio" },
                { href: "/blog", label: "Blog" },
                { href: "/locations", label: "Our Facility" },
                { href: "/about", label: "About Us" },
                { href: "/contact", label: "Contact" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-sidebar-foreground/70 hover:text-accent transition-colors text-sm cursor-pointer">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Locations */}
          <div>
            <h4 className="text-heading text-sm tracking-wider mb-4">LOCATIONS</h4>
            <ul className="space-y-3 text-sm">
              <li className="text-sidebar-foreground/70">
                <div className="font-medium text-sidebar-foreground">Everett, MA</div>
                <div className="text-xs">Headquarters & Fabrication</div>
              </li>
              {!isDefaultLocation && (
                <li className="text-sidebar-foreground/70">
                  <div className="font-medium text-sidebar-foreground">{localPhone.label}</div>
                  <div className="text-xs">Your Local Office</div>
                  <PhoneLink tel={localPhone.tel} className="text-xs text-accent hover:underline">
                    {localPhone.display}
                  </PhoneLink>
                </li>
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-heading text-sm tracking-wider mb-4">CONTACT</h4>
            <ul className="space-y-3">
              <li>
                <PhoneLink tel={localPhone.tel}
                  className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-accent transition-colors text-sm"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  {localPhone.display}
                </PhoneLink>
              </li>
              <li>
                <a
                  href="mailto:info@kingsironsworks.com"
                  className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-accent transition-colors text-sm"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="break-all">info@kingsironsworks.com</span>
                </a>
              </li>
              <li>
                <div className="flex items-start gap-2 text-sidebar-foreground/70 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>69 Norman St, Unit 20<br />Everett, MA 02149</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-sidebar-foreground/20">
          <div className="flex flex-col gap-2 text-xs sm:text-sm text-sidebar-foreground/50 text-center sm:text-left sm:flex-row sm:justify-between">
            <p>&copy; 2026 King Iron Works. All rights reserved.</p>
            <p>Licensed Fire Escape Installer | MA State Building Code Compliant</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
