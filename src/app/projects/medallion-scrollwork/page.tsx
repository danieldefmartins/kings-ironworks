import type { Metadata } from "next";
import ProjectShowcaseClient from "@/components/ProjectShowcaseClient";

export const metadata: Metadata = {
  title: "The Medallion Scrollwork Staircase — King Iron Works",
  description:
    "From a pencil sketch to a two-story masterpiece in marble and iron. 800+ hours of fabrication, 14 medallion panels, 200+ gold leaf accents. See the full journey from sketch to reality.",
  alternates: {
    canonical: "https://kingsironworks.com/projects/medallion-scrollwork",
  },
  openGraph: {
    images: [{ url: "/images/og-default.jpg", width: 1200, height: 630, alt: "King Iron Works custom metalwork" }],
    title: "The Medallion Scrollwork Staircase — King Iron Works",
    description:
      "From a pencil sketch to a two-story masterpiece in marble and iron. 800+ hours of fabrication, 14 medallion panels, 200+ gold leaf accents.",
    url: "https://kingsironworks.com/projects/medallion-scrollwork",
    siteName: "King Iron Works",
    type: "website",
  },
};

export default function MedallionScrollworkPage() {
  return <ProjectShowcaseClient projectSlug="medallion-scrollwork" />;
}
