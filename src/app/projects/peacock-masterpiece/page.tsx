import type { Metadata } from "next";
import ProjectShowcaseClient from "@/components/ProjectShowcaseClient";

export const metadata: Metadata = {
  title: "The Peacock Masterpiece — King Iron Works",
  description:
    "From a rough pencil concept to the most breathtaking staircase we've ever built. 1,200+ hours of fabrication, one-of-a-kind peacock panels, 300+ gold leaf pieces. The project that defines King Iron Works.",
  alternates: {
    canonical: "https://www.kingsironworks.com/projects/peacock-masterpiece",
  },
  openGraph: {
    title: "The Peacock Masterpiece — King Iron Works",
    description:
      "From a rough pencil concept to the most breathtaking staircase we've ever built. 1,200+ hours of fabrication, one-of-a-kind peacock panels, 300+ gold leaf pieces.",
    url: "https://www.kingsironworks.com/projects/peacock-masterpiece",
    siteName: "King Iron Works",
    type: "website",
  },
};

export default function PeacockMasterpiecePage() {
  return <ProjectShowcaseClient projectSlug="peacock-masterpiece" />;
}
