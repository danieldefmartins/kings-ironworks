import type { Metadata } from "next";
import ConnecticutClient from "./ConnecticutClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in Connecticut | King Iron Works",
  description:
    "Connecticut's trusted ironwork specialists. Custom gates, railings, fire escapes, and historic restoration. Serving Hartford, New Haven, Stamford, and all of CT. Call +1 860-740-4242",
  keywords:
    "connecticut ironwork, fire escape connecticut, custom gates CT, railings connecticut, historic restoration hartford, ironwork stamford ct",
  alternates: {
    canonical: "https://kingsironworks.com/connecticut",
  },
  openGraph: {
    title: "Custom Ironwork & Fire Escapes in Connecticut | King Iron Works",
    description:
      "Connecticut's trusted ironwork specialists. Custom gates, railings, fire escapes, and historic restoration.",
    url: "https://kingsironworks.com/connecticut",
  },
};

export default function ConnecticutPage() {
  return <ConnecticutClient />;
}
