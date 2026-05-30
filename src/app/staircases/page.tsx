import type { Metadata } from "next";
import StaircaseHubClient from "@/components/StaircaseHubClient";

export const metadata: Metadata = {
  title: "Custom Staircases — Design Your Dream Staircase | King Iron Works",
  description:
    "Design your dream staircase with King Iron Works. Choose from curved, floating cantilever, mono-stringer, spiral, traditional, and L-shaped structures. 20+ years of master craftsmanship in New England.",
  alternates: {
    canonical: "https://www.kingsironworks.com/staircases",
  },
  openGraph: {
    title: "Custom Staircases — Design Your Dream Staircase | King Iron Works",
    description:
      "Design your dream staircase with King Iron Works. Choose from curved, floating cantilever, mono-stringer, spiral, traditional, and L-shaped structures.",
    url: "https://www.kingsironworks.com/staircases",
    siteName: "King Iron Works",
    type: "website",
  },
};

export default function StaircasesPage() {
  return <StaircaseHubClient />;
}
