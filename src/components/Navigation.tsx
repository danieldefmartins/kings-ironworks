"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone } from "lucide-react";
import { useState } from "react";
import { useLocalPhone } from "@/lib/useLocalPhone";
import { PhoneLink } from "@/components/PhoneLink";

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const localPhone = useLocalPhone();

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/services", label: "Services" },
    { path: "/staircases", label: "Staircases" },
    { path: "/portfolio", label: "Portfolio" },
    { path: "/blog", label: "Blog" },
    { path: "/locations", label: "Locations" },
    { path: "/about", label: "About" },
    { path: "/contact", label: "Contact" },
  ];

  const isActive = (path: string) =>
    path === "/"
      ? pathname === "/"
      : pathname === path || pathname.startsWith(path + "/");

  return (
    <>
      {/* Desktop Navigation - Fixed Horizontal Top Bar */}
      <nav className="hidden lg:block fixed top-0 left-0 right-0 h-28 bg-black/90 backdrop-blur-sm border-b border-white/10 z-50">
        <div className="container h-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <img
                src="/logo.png"
                alt="King Iron Works"
                className="h-20 w-auto object-contain"
              />
            </div>
          </Link>

          {/* Nav Items */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <div
                  className={`
                    px-4 py-2 cursor-pointer transition-all border-b-2
                    ${
                      isActive(item.path)
                        ? "border-accent text-white"
                        : "border-transparent hover:border-accent/50 text-white/70 hover:text-white"
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
      <nav className="lg:hidden fixed top-0 left-0 right-0 h-18 bg-black/90 backdrop-blur-sm border-b border-white/10 z-50">
        <div className="container h-full flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <img
                src="/logo.png"
                alt="King Iron Works"
                className="h-16 w-auto object-contain"
              />
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <PhoneLink tel={localPhone.tel}>
              <Button size="sm" variant="default" className="bg-accent hover:bg-accent/90">
                <Phone className="w-4 h-4 mr-2" />
                Call
              </Button>
            </PhoneLink>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:text-white/80"
            >
              {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-sidebar z-40 flex flex-col">
          {/* Spacer for the fixed top bar */}
          <div className="h-18 shrink-0" />
          {/* Scrollable menu content */}
          <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="container py-4 pb-8">
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <div
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        py-4 px-6 border-l-2 cursor-pointer transition-all
                        ${
                          isActive(item.path)
                            ? "border-accent bg-sidebar-accent/10 text-sidebar-accent-foreground"
                            : "border-transparent hover:border-accent/50 hover:bg-sidebar-accent/5 text-sidebar-foreground/70"
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
        </div>
      )}
    </>
  );
}
