import type { Metadata } from "next";
import ExteriorRailingClient from "./ExteriorRailingClient";

export const metadata: Metadata = {
  title: "Exterior Railing Installation & Fabrication | Boston MA",
  description:
    "Custom exterior railings for porches, decks & stairways. Weather-resistant coatings, ADA-compliant designs, powder-coated finishes. Licensed & insured. Call (617) 404-2589.",
  alternates: {
    canonical: "https://kingsironworks.com/exterior-railing",
  },
  openGraph: {
    title: "Exterior Railing Installation & Fabrication | King Iron Works",
    description:
      "Built to withstand New England weather. Custom exterior railings with weather-resistant coatings. ADA-compliant. 20+ years experience.",
    url: "https://kingsironworks.com/exterior-railing",
    images: [
      {
        url: "/images/portfolio-organized/Railings/Exterior-Railing/king-iron-works-exterior-railing-10.jpg",
        width: 1200,
        height: 630,
        alt: "Exterior railing installation by King Iron Works",
      },
    ],
  },
};

export default function ExteriorRailingPage() {
  return <ExteriorRailingClient />;
}
