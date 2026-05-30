import type { Metadata } from "next";
import InteriorRailingClient from "./InteriorRailingClient";

export const metadata: Metadata = {
  title: "Custom Interior Railing Design & Installation | Boston MA",
  description:
    "Handcrafted interior railings for staircases, lofts & mezzanines. Modern cable systems, classic wrought iron, custom balusters. Licensed & insured. 20+ years. Call (617) 404-2589.",
  alternates: {
    canonical: "https://kingsironworks.com/interior-railing",
  },
  openGraph: {
    title: "Custom Interior Railing Design & Installation | King Iron Works",
    description:
      "Transform your home with handcrafted interior railings. 500+ railings installed. Modern & traditional designs. Free consultation.",
    url: "https://kingsironworks.com/interior-railing",
    images: [
      {
        url: "/images/portfolio-organized/Railings/Interior-Railing/king-iron-works-interior-railing-1.jpg",
        width: 1200,
        height: 630,
        alt: "Custom interior railing by King Iron Works",
      },
    ],
  },
};

export default function InteriorRailingPage() {
  return <InteriorRailingClient />;
}
