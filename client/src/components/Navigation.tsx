import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone } from "lucide-react";
import { useState } from "react";
import { PHONE_NUMBERS } from "@/lib/constants";

export default function Navigation() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/", label: "HOME" },
    { path: "/services", label: "SERVICES" },
    { path: "/portfolio", label: "PORTFOLIO" },
    { path: "/locations", label: "LOCATIONS" },
    { path: "/about", label: "ABOUT" },
    { path: "/contact", label: "CONTACT" },
  ];

  return (
    <>
      {/* Desktop Navigation - Fixed Vertical Sidebar */}
      <nav className="hidden lg:block fixed left-0 top-0 h-screen w-20 bg-sidebar border-r-8 border-border z-50">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <Link href="/">
            <div className="h-20 flex items-center justify-center border-b-8 border-border cursor-pointer hover:bg-sidebar-accent transition-colors p-2">
              <img 
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/ughTFDIjdTrgGjGJ.jpeg" 
                alt="Kings Ironworks" 
                className="h-12 w-auto object-contain"
              />
            </div>
          </Link>

          {/* Nav Items */}
          <div className="flex-1 flex flex-col py-8">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <div
                  className={`
                    py-6 flex items-center justify-center cursor-pointer
                    border-l-8 transition-all
                    ${
                      location === item.path
                        ? "border-accent bg-sidebar-accent text-sidebar-accent-foreground"
                        : "border-transparent hover:border-accent/50 hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                    }
                  `}
                >
                  <span className="text-xs font-display font-bold tracking-wider [writing-mode:vertical-lr] rotate-180 whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Phone CTA */}
          <a
            href={`tel:${PHONE_NUMBERS.MAIN.tel}`}
            className="h-20 flex items-center justify-center border-t-8 border-border bg-accent hover:bg-accent/90 transition-colors"
          >
            <Phone className="w-6 h-6 text-accent-foreground" />
          </a>
        </div>
      </nav>

      {/* Mobile Navigation - Top Bar */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b-4 border-border z-50">
        <div className="container h-full flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <img 
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198/ughTFDIjdTrgGjGJ.jpeg" 
                alt="Kings Ironworks" 
                className="h-10 w-auto object-contain"
              />
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <a href={`tel:${PHONE_NUMBERS.MAIN.tel}`}>
              <Button size="sm" variant="default" className="bg-accent hover:bg-accent/90">
                <Phone className="w-4 h-4 mr-2" />
                CALL
              </Button>
            </a>
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
                        location === item.path
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
