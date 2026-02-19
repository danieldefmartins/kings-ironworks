import { Link } from "wouter";

import { PHONE_NUMBERS } from "@/lib/constants";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-sidebar text-sidebar-foreground border-t-8 border-border">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <img 
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/ughTFDIjdTrgGjGJ.jpeg" 
              alt="Kings Ironworks" 
              className="h-16 w-auto object-contain mb-4"
            />
            <p className="text-sidebar-foreground/70 text-sm leading-relaxed mb-4">
              Boston's premier historic ironwork restoration and fire escape specialists since 2004. 
              20+ years of American craftsmanship and safety excellence.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-accent/20 border-2 border-accent inline-flex">
                <span className="text-xl">🇺🇸</span>
                <span className="font-display font-bold text-sidebar-foreground text-xs">PROUD TO BE AMERICAN</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-accent/20 border-2 border-accent inline-flex">
                <span className="text-xl">🎖️</span>
                <span className="font-display font-bold text-sidebar-foreground text-xs">10% MILITARY DISCOUNT</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-heading text-sm tracking-wider mb-4">QUICK LINKS</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/services">
                  <span className="text-sidebar-foreground/70 hover:text-accent transition-colors text-sm cursor-pointer">
                    Services
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/portfolio">
                  <span className="text-sidebar-foreground/70 hover:text-accent transition-colors text-sm cursor-pointer">
                    Portfolio
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/locations">
                  <span className="text-sidebar-foreground/70 hover:text-accent transition-colors text-sm cursor-pointer">
                    Locations
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/about">
                  <span className="text-sidebar-foreground/70 hover:text-accent transition-colors text-sm cursor-pointer">
                    About Us
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <span className="text-sidebar-foreground/70 hover:text-accent transition-colors text-sm cursor-pointer">
                    Contact
                  </span>
                </Link>
              </li>
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
              <li className="text-sidebar-foreground/70">
                <div className="font-medium text-sidebar-foreground">Cape Cod, MA</div>
              </li>
              <li className="text-sidebar-foreground/70">
                <div className="font-medium text-sidebar-foreground">Worcester, MA</div>
              </li>
              <li className="text-sidebar-foreground/70">
                <div className="font-medium text-sidebar-foreground">Miami, FL</div>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-heading text-sm tracking-wider mb-4">CONTACT</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href={`tel:${PHONE_NUMBERS.MAIN.tel}`}
                  className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-accent transition-colors text-sm"
                >
                  <Phone className="w-4 h-4" />
                  {PHONE_NUMBERS.MAIN.display}
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@kingsironworks.com"
                  className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-accent transition-colors text-sm"
                >
                  <Mail className="w-4 h-4" />
                  info@kingsironworks.com
                </a>
              </li>
              <li>
                <div className="flex items-start gap-2 text-sidebar-foreground/70 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>69 Norman St, Unit 20<br />Everett, MA 02149</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-sidebar-foreground/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-sidebar-foreground/50">
            <p>© 2026 Kings Ironworks. All rights reserved.</p>
            <p>Licensed Fire Escape Installer | MA State Building Code Compliant</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
