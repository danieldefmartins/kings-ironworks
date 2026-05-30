import type { Metadata } from "next";
import CableRailingClient from "./CableRailingClient";

export const metadata: Metadata = {
  title: "Cable Railing Systems & Installation | Boston MA",
  description:
    "Marine-grade stainless steel cable railing systems for decks, stairs & interiors. Modern design, maximum views. Licensed & insured. Call (617) 404-2589.",
  alternates: { canonical: "https://kingsironworks.com/cable-railing" },
  openGraph: {
    title: "Cable Railing Systems & Installation | King Iron Works",
    description: "200+ cable systems installed. 316 marine-grade stainless steel. Indoor & outdoor applications. 20+ years precision installation.",
    url: "https://kingsironworks.com/cable-railing",
    images: [{ url: "/images/portfolio-organized/Railings/Cable-Railing/king-iron-works-cable-railing-project-1.jpg", width: 1200, height: 630, alt: "Cable railing system by King Iron Works" }],
  },
};

export default function CableRailingPage() {
  return <CableRailingClient />;
}
