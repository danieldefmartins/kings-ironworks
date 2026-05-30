import type { Metadata } from "next";
import BuildingRestorationClient from "./BuildingRestorationClient";

export const metadata: Metadata = {
  title: "Historic Building Restoration & Custom Ironwork | Boston MA",
  description:
    "Boston historic building restoration specialists since 2004. Custom artisan fabrication for historic ironwork, ornamental railings, decorative gates & architectural details. Call (617) 404-2589.",
  alternates: {
    canonical: "https://kingsironworks.com/building-restoration",
  },
  openGraph: {
    title: "Historic Building Restoration | King Iron Works",
    description:
      "Preserving Boston's architectural heritage. Custom ironwork replication, ornamental railings, decorative gates & structural restoration. 20+ years experience.",
    url: "https://kingsironworks.com/building-restoration",
    images: [
      {
        url: "/images/portfolio-organized/Branding/king-iron-works-boston-historic-building.webp",
        width: 1200,
        height: 630,
        alt: "Historic building restoration by King Iron Works",
      },
    ],
  },
};

export default function BuildingRestorationPage() {
  return <BuildingRestorationClient />;
}
