import type { Metadata } from "next";
import PortfolioClient from "@/components/PortfolioClient";

export const metadata: Metadata = {
  title: "Our Work — Portfolio",
  description:
    "Browse our portfolio of custom ironwork, fire escape installations, historic restorations, staircases, railings, gates, and structural steel projects across the Northeast and Florida.",
  openGraph: {
    title: "Our Work | King Iron Works Portfolio",
    description:
      "Browse our portfolio of custom ironwork, fire escape installations, historic restorations, and structural steel projects across the Northeast and Florida.",
    url: "https://kingsironworks.com/portfolio",
    images: [
      {
        url: "/images/apLcldtAeVXzDTCh.JPG",
        width: 1200,
        height: 630,
        alt: "King Iron Works Portfolio — Custom Ironwork Projects",
      },
    ],
  },
  alternates: {
    canonical: "https://kingsironworks.com/portfolio",
  },
};

export default function PortfolioPage() {
  return <PortfolioClient />;
}
