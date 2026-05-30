import type { Metadata } from "next";
import LawrenceClient from "./LawrenceClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in Lawrence, MA | King Iron Works",
  description:
    "Lawrence MA's trusted ironwork specialists. Custom staircases, railings, gates, fencing, and structural steel. Serving Methuen, Andover, North Andover, Haverhill, and surrounding areas. Call (617) 404-2589.",
  keywords:
    "lawrence ironwork, custom ironwork lawrence ma, railings methuen ma, gates andover ma, structural steel lawrence massachusetts",
  alternates: {
    canonical: "https://kingsironworks.com/lawrence",
  },
  openGraph: {
    title: "Custom Ironwork & Fire Escapes in Lawrence, MA | King Iron Works",
    description:
      "Lawrence MA's trusted ironwork specialists. Custom staircases, railings, gates, and structural steel.",
    url: "https://kingsironworks.com/lawrence",
  },
};

export default function LawrencePage() {
  return <LawrenceClient />;
}
