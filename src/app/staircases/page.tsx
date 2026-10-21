import type { Metadata } from "next";
import StaircaseHubClient from "@/components/StaircaseHubClient";

export const metadata: Metadata = {
  title: "Custom Staircases — Design Your Dream Staircase | King Iron Works",
  description:
    "Design your dream staircase with King Iron Works. Choose from curved, floating cantilever, mono-stringer, spiral, traditional, and L-shaped structures. 20+ years of master craftsmanship in New England.",
  alternates: {
    canonical: "https://kingsironworks.com/staircases",
  },
  openGraph: {
    images: [{ url: "/images/og-default.jpg", width: 1200, height: 630, alt: "King Iron Works custom metalwork" }],
    title: "Custom Staircases — Design Your Dream Staircase | King Iron Works",
    description:
      "Design your dream staircase with King Iron Works. Choose from curved, floating cantilever, mono-stringer, spiral, traditional, and L-shaped structures.",
    url: "https://kingsironworks.com/staircases",
    siteName: "King Iron Works",
    type: "website",
  },
};

export default function StaircasesPage() {
  return <StaircaseHubClient />;
}
