import type { Metadata } from "next";
import WorcesterClient from "./WorcesterClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in Worcester, MA | King Iron Works",
  description:
    "Central Massachusetts' trusted ironwork specialists. Licensed fire escape installation, custom gates, railings, and historic restoration. Serving Worcester and surrounding areas. Call +1 508-955-5006",
  keywords:
    "worcester ironwork, fire escape worcester, custom gates worcester, railings worcester, historic restoration worcester, ironwork central massachusetts",
  alternates: {
    canonical: "https://kingsironworks.com/worcester",
  },
  openGraph: {
    title: "Custom Ironwork & Fire Escapes in Worcester, MA | King Iron Works",
    description:
      "Central Massachusetts' trusted ironwork specialists. Licensed fire escape installation, custom gates, railings, and historic restoration.",
    url: "https://kingsironworks.com/worcester",
  },
};

export default function WorcesterPage() {
  return <WorcesterClient />;
}
