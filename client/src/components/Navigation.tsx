import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone } from "lucide-react";
import { useState } from "react";
import { useLocalPhone } from "@/lib/useLocalPhone";
import { PhoneLink } from "@/components/PhoneLink";

export default function Navigation() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const localPhone = useLocalPhone();

  const navItems = [
    { path: "/", label: "HOME" },
    { path: "/services", label: "SERVICES" },
    { path: "/portfolio", label: "PORTFOLIO" },
    { path: "/blog", label: "BLOG" },
    { path: "/locations", label: "OUR FACILITY" },
    { path: "/about", label: "ABOUT" },
    { path: "/contact", label: "CONTACT" },
  ];

  const isActive = (path: string) =>
    path === "/"
      ? location === "/"
      : location === path || location.startsWith(path + "/");

  return (
    <>
      {/* Desktop Navigation - Fixed Horizontal Top Bar */}
      <nav className="hidden lg:block fixed top-0 left-0 right-0 h-20 bg-sidebar border-b-4 border-border z-50">
        <div className="container h-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <img
                src="/images/ughTFDIjdTrgGjGJ.jpeg"
                alt="King Iron Works"
                className="h-14 w-auto object-contain"
              />
            </div>
          </Link>

          {/* Nav Items */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <div
                  className={`
                    px-4 py-2 cursor-pointer transition-all border-b-4
                    ${
                      isActive(item.path)
                        ? "border-accent text-sidebar-accent-foreground"
                        : "border-transparent hover:border-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                    }
                  `}
                >
                  <span className="text-xs font-display font-bold tracking-wider whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Phone CTA */}
          <PhoneLink tel={localPhone.tel}>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-display font-bold tracking-wider">
              <Phone className="w-4 h-4 mr-2" />
              {localPhone.display}
            </Button>
          </PhoneLink>
        </div>
      </nav>

      {/* Mobile Navigation - Top Bar */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b-4 border-border z-50">
        <div className="container h-full flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <img
                src="/images/ughTFDIjdTrgGjGJ.jpeg"
                alt="King Iron Works"
                className="h-12 w-auto object-contain"
              />
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <PhoneLink tel={localPhone.tel}>
              <Button size="sm" variant="default" className="bg-accent hover:bg-accent/90">
                <Phone className="w-4 h-4 mr-2" />
                CALL
              </Button>
            </PhoneLink>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-sidebar-foreground"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-sidebar z-40 pt-16">
          <div className="container py-8">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <div
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      py-4 px-6 border-l-8 cursor-pointer transition-all
                      ${
                        isActive(item.path)
                          ? "border-accent bg-sidebar-accent text-sidebar-accent-foreground"
                          : "border-transparent hover:border-accent/50 hover:bg-sidebar-accent/50 text-sidebar-foreground/70"
                      }
                    `}
                  >
                    <span className="text-lg font-display font-bold tracking-wider">
                      {item.label}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
