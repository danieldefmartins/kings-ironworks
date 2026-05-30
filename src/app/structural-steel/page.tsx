import type { Metadata } from "next";
import StructuralSteelClient from "./StructuralSteelClient";

export const metadata: Metadata = {
  title: "Custom Structural Steel Fabrication | Boston MA",
  description:
    "Full-service structural steel fabrication in Everett, MA. Beams, columns, architectural steel, mezzanines & more. 100% American-made steel. Licensed & insured. Call (617) 404-2589.",
  alternates: {
    canonical: "https://kingsironworks.com/structural-steel",
  },
  openGraph: {
    title: "Custom Structural Steel Fabrication | King Iron Works",
    description:
      "State-of-the-art steel fabrication facility. Commercial & residential structural steel. American-made, in-house fabrication. 20+ years experience.",
    url: "https://kingsironworks.com/structural-steel",
    images: [
      {
        url: "/images/portfolio-organized/Shop-Process/king-iron-works-shop-interior-webp.webp",
        width: 1200,
        height: 630,
        alt: "Structural steel fabrication at King Iron Works",
      },
    ],
  },
};

export default function StructuralSteelPage() {
  return <StructuralSteelClient />;
}
