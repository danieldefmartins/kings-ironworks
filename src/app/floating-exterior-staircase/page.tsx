import type { Metadata } from "next";
import FloatingExteriorStaircaseClient from "./FloatingExteriorStaircaseClient";

export const metadata: Metadata = {
  title: "Floating Exterior Staircase | Porcelain, Wood, Concrete & Grating Treads | Boston MA",
  description:
    "Custom-built exterior steel entry staircases. Choose your tread — porcelain, wood, concrete, grating or composite — and your finish: epoxy paint, hot-dip galvanizing or powder coat in any color. Engineered for New England winters. Free design consultation. (617) 404-2589.",
  alternates: {
    canonical: "https://kingsironworks.com/floating-exterior-staircase",
  },
  openGraph: {
    title: "Floating Exterior Staircase | King Iron Works",
    description:
      "One of one. Sculpted steel stringers, open risers, and the tread of your choice — porcelain, wood, concrete, grating or composite. Built to outlast New England weather.",
    url: "https://kingsironworks.com/floating-exterior-staircase",
    images: [
      {
        url: "/images/carousel/floating-exterior-staircase-16x9.jpg",
        width: 2400,
        height: 1350,
        alt: "Custom exterior steel staircase with porcelain treads by King Iron Works",
      },
    ],
  },
};

export default function FloatingExteriorStaircasePage() {
  return <FloatingExteriorStaircaseClient />;
}
