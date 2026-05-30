import type { Metadata } from "next";
import RhodeIslandClient from "./RhodeIslandClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in Rhode Island | King Iron Works",
  description:
    "Rhode Island's premier ironwork specialists. Custom gates, railings, fire escapes, and historic restoration. Serving Providence, Newport, and all of RI. Call +1 401-535-7979",
  keywords:
    "rhode island ironwork, fire escape rhode island, custom gates RI, railings rhode island, historic restoration providence, ironwork newport ri",
  alternates: {
    canonical: "https://kingsironworks.com/rhode-island",
  },
  openGraph: {
    title: "Custom Ironwork & Fire Escapes in Rhode Island | King Iron Works",
    description:
      "Rhode Island's premier ironwork specialists. Custom gates, railings, fire escapes, and historic restoration.",
    url: "https://kingsironworks.com/rhode-island",
  },
};

export default function RhodeIslandPage() {
  return <RhodeIslandClient />;
}
