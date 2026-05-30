import type { Metadata } from "next";
import NorthShoreClient from "./NorthShoreClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in North Shore, MA | King Iron Works",
  description:
    "North Shore MA's premier ironwork specialists. Custom staircases, railings, gates, fencing, and structural steel. Serving Salem, Beverly, Peabody, Danvers, Marblehead, and all of North Shore. Call (617) 404-2589.",
  keywords:
    "north shore ironwork, custom ironwork salem ma, railings beverly ma, gates peabody ma, structural steel north shore massachusetts",
  alternates: {
    canonical: "https://kingsironworks.com/north-shore",
  },
  openGraph: {
    title: "Custom Ironwork & Fire Escapes in North Shore, MA | King Iron Works",
    description:
      "North Shore MA's premier ironwork specialists. Custom staircases, railings, gates, and structural steel.",
    url: "https://kingsironworks.com/north-shore",
  },
};

export default function NorthShorePage() {
  return <NorthShoreClient />;
}
