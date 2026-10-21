import type { Metadata } from "next";
import NashuaClient from "./NashuaClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in Nashua, NH | King Iron Works",
  description:
    "Nashua NH's trusted ironwork specialists. Custom staircases, railings, gates, fencing, and structural steel. Serving Hudson, Merrimack, Milford, Amherst, and surrounding areas. Call +1 603-691-3012.",
  keywords:
    "nashua ironwork, custom ironwork nashua nh, railings hudson nh, gates merrimack nh, structural steel nashua new hampshire",
  alternates: {
    canonical: "https://kingsironworks.com/nashua",
  },
  openGraph: {
    type: "website",
    images: [{ url: "/images/og-default.jpg", width: 1200, height: 630, alt: "King Iron Works custom metalwork" }],
    title: "Custom Ironwork & Fire Escapes in Nashua, NH | King Iron Works",
    description:
      "Nashua NH's trusted ironwork specialists. Custom staircases, railings, gates, and structural steel.",
    url: "https://kingsironworks.com/nashua",
  },
};

export default function NashuaPage() {
  return <NashuaClient />;
}
