import type { Metadata } from "next";
import FenceClient from "./FenceClient";

export const metadata: Metadata = {
  title: "Custom Iron Fence Fabrication & Installation | Boston MA",
  description:
    "Custom iron fencing for security, ornamental & pool enclosures. Hand-forged in our Everett, MA shop. Licensed & insured. 20+ years. Call (617) 404-2589.",
  alternates: { canonical: "https://kingsironworks.com/fence" },
  openGraph: {
    title: "Custom Iron Fence Fabrication & Installation | King Iron Works",
    description: "500+ fences installed. Security, ornamental & pool enclosure fencing. Custom designed and fabricated in-house.",
    url: "https://kingsironworks.com/fence",
    images: [{ url: "/images/portfolio-organized/Gates/king-iron-works-gate-ornamental-black-gold-scrollwork.jpg", width: 1200, height: 630, alt: "Custom iron fence by King Iron Works" }],
  },
};

export default function FencePage() {
  return <FenceClient />;
}
