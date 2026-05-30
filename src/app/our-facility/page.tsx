import type { Metadata } from "next";
import FacilityClient from "./FacilityClient";

export const metadata: Metadata = {
  title: "Our Fabrication Facility | 15,000 sq ft Shop | Everett MA",
  description:
    "Tour our state-of-the-art 15,000 sq ft fabrication facility in Everett, MA. Professional welding (MIG, TIG, stick, flux-core), in-house powder coating, quality control. Call (617) 404-2589.",
  alternates: { canonical: "https://kingsironworks.com/our-facility" },
  openGraph: {
    title: "Our Fabrication Facility | King Iron Works",
    description: "15,000 sq ft facility. Professional MIG, TIG, stick & flux-core welding. In-house powder coat paint booth. 100% in-house fabrication.",
    url: "https://kingsironworks.com/our-facility",
    images: [{ url: "/images/portfolio-organized/Shop-Process/king-iron-works-shop-interior-webp.webp", width: 1200, height: 630, alt: "King Iron Works fabrication facility" }],
  },
};

export default function FacilityPage() {
  return <FacilityClient />;
}
