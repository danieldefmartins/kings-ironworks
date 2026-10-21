import type { Metadata } from "next";
import MaineClient from "./MaineClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in Maine | King Iron Works",
  description:
    "Maine's trusted ironwork specialists. Custom gates, railings, fire escapes, and historic restoration. Serving Portland, Bangor, Augusta, and all of Maine. Call +1 207-503-4700",
  keywords:
    "maine ironwork, fire escape maine, custom gates maine, railings maine, historic restoration maine, ironwork portland me",
  alternates: {
    canonical: "https://kingsironworks.com/maine",
  },
  openGraph: {
    type: "website",
    images: [{ url: "/images/og-default.jpg", width: 1200, height: 630, alt: "King Iron Works custom metalwork" }],
    title: "Custom Ironwork & Fire Escapes in Maine | King Iron Works",
    description:
      "Maine's trusted ironwork specialists. Custom gates, railings, fire escapes, and historic restoration.",
    url: "https://kingsironworks.com/maine",
  },
};

export default function MainePage() {
  return <MaineClient />;
}
