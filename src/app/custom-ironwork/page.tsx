import type { Metadata } from "next";
import CustomIronworkClient from "./CustomIronworkClient";

export const metadata: Metadata = {
  title: "Custom Ironwork Specialists | Gates, Railings, Staircases | Boston MA",
  description:
    "Custom ironwork designed, hand-forged & finished in our 15,000 sq ft Everett, MA shop. Gates, railings, staircases, ornamental work. 20+ years. Free estimates. Call (617) 404-2589.",
  alternates: { canonical: "https://kingsironworks.com/custom-ironwork" },
  openGraph: {
    title: "Custom Ironwork Specialists | King Iron Works",
    description: "Gates, railings, staircases & ornamental work. All designed and hand-forged in our own fabrication shop. 20+ years, 4.9/5 Google rating.",
    url: "https://kingsironworks.com/custom-ironwork",
    images: [{ url: "/images/portfolio-organized/Gates/king-iron-works-gate-custom-iron-webp.webp", width: 1200, height: 630, alt: "Custom ironwork by King Iron Works" }],
  },
};

export default function CustomIronworkPage() {
  return <CustomIronworkClient />;
}
