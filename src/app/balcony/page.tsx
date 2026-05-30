import type { Metadata } from "next";
import BalconyClient from "./BalconyClient";

export const metadata: Metadata = {
  title: "Custom Balcony Railing & Ironwork | Boston MA",
  description:
    "Custom balcony railings, Juliet balconies & structural support. Ornamental designs, safety upgrades, code-compliant installation. 20+ years. Call (617) 404-2589.",
  alternates: { canonical: "https://kingsironworks.com/balcony" },
  openGraph: {
    title: "Custom Balcony Railing & Ironwork | King Iron Works",
    description: "200+ balconies completed. Custom railings, Juliet balconies, structural support & safety upgrades. 100% code compliant.",
    url: "https://kingsironworks.com/balcony",
    images: [{ url: "/images/portfolio-organized/Balcony/king-iron-works-balcony-ornamental-boston-brick.jpg", width: 1200, height: 630, alt: "Custom balcony railing by King Iron Works" }],
  },
};

export default function BalconyPage() {
  return <BalconyClient />;
}
