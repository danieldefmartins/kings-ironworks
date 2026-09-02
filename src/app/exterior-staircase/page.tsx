import type { Metadata } from "next";
import ExteriorStaircaseClient from "./ExteriorStaircaseClient";

export const metadata: Metadata = {
  title: "Custom Exterior Steel Staircases | Porcelain, Wood & Composite Treads | Boston MA",
  description:
    "Custom-built exterior steel entry staircases. Choose your tread — porcelain, wood, concrete, grating or composite — and your finish: epoxy paint, hot-dip galvanizing or powder coat in any color. Engineered for New England winters. Free design consultation. (617) 404-2589.",
  alternates: {
    canonical: "https://kingsironworks.com/exterior-staircase",
  },
  openGraph: {
    title: "Custom Exterior Steel Staircases | King Iron Works",
    description:
      "One of one. Sculpted steel stringers, open risers, and the tread of your choice — porcelain, wood, concrete, grating or composite. Built to outlast New England weather.",
    url: "https://kingsironworks.com/exterior-staircase",
    images: [
      {
        url: "/images/carousel/exterior-staircase-16x9.jpg",
        width: 2400,
        height: 1350,
        alt: "Custom exterior steel staircase with porcelain treads by King Iron Works",
      },
    ],
  },
};

export default function ExteriorStaircasePage() {
  return <ExteriorStaircaseClient />;
}
