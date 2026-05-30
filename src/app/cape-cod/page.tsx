import type { Metadata } from "next";
import CapeCodeClient from "./CapeCodeClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in Cape Cod, MA | King Iron Works",
  description:
    "Cape Cod's premier ironwork specialists. Licensed fire escape installation, custom gates, railings, and historic restoration. Serving all of Cape Cod and the Islands. Call +1 508-955-5006",
  keywords:
    "cape cod ironwork, fire escape cape cod, custom gates cape cod, railings cape cod, historic restoration cape cod, ironwork massachusetts",
  alternates: {
    canonical: "https://kingsironworks.com/cape-cod",
  },
  openGraph: {
    title: "Custom Ironwork & Fire Escapes in Cape Cod, MA | King Iron Works",
    description:
      "Cape Cod's premier ironwork specialists. Licensed fire escape installation, custom gates, railings, and historic restoration. Serving all of Cape Cod and the Islands.",
    url: "https://kingsironworks.com/cape-cod",
  },
};

export default function CapeCodePage() {
  return <CapeCodeClient />;
}
