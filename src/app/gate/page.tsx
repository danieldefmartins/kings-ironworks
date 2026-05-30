import type { Metadata } from "next";
import GateClient from "./GateClient";

export const metadata: Metadata = {
  title: "Custom Iron Gate Design & Fabrication | Boston MA",
  description:
    "Hand-forged iron gates: driveway, pedestrian, garden & automated systems. 500+ gates fabricated. Custom designs in our Everett, MA shop. Call (617) 404-2589.",
  alternates: { canonical: "https://kingsironworks.com/gate" },
  openGraph: {
    title: "Custom Iron Gate Design & Fabrication | King Iron Works",
    description: "500+ gates fabricated. Driveway, pedestrian, garden & security gates. Hand-forged, 100% custom designs. 20+ years.",
    url: "https://kingsironworks.com/gate",
    images: [{ url: "/images/portfolio-organized/Gates/king-iron-works-gate-ornamental-black-gold-scrollwork.jpg", width: 1200, height: 630, alt: "Custom iron gate by King Iron Works" }],
  },
};

export default function GatePage() {
  return <GateClient />;
}
