import type { Metadata } from "next";
import FireEscapeClient from "./FireEscapeClient";

export const metadata: Metadata = {
  title: "Fire Escape Repair, Installation & Certification | Boston MA",
  description:
    "Licensed fire escape contractor serving Massachusetts & New Hampshire. Emergency repairs, 5-year inspections, code violation corrections, and new installations. Same-week service available. Call (617) 404-2589.",
  alternates: {
    canonical: "https://kingsironworks.com/fire-escape",
  },
  openGraph: {
    title: "Fire Escape Repair & Certification | King Iron Works",
    description:
      "Licensed fire escape repair, inspection & installation. 500+ fire escapes serviced. Same-week emergency service. 20+ years in Massachusetts & New Hampshire.",
    url: "https://kingsironworks.com/fire-escape",
    images: [
      {
        url: "/images/portfolio-organized/Fire-Escape/king-iron-works-fire-escape-website-YgqFSong.jpg",
        width: 1200,
        height: 630,
        alt: "Fire escape installation by King Iron Works in Boston",
      },
    ],
  },
};

export default function FireEscapePage() {
  return <FireEscapeClient />;
}
