import type { Metadata } from "next";
import MiamiClient from "./MiamiClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in Miami, FL | King Iron Works",
  description:
    "South Florida's trusted ironwork specialists. Hurricane-rated gates, railings, fire escapes, and custom fabrication. Serving Miami-Dade and Broward Counties. Call +1 754-240-0082",
  keywords:
    "miami ironwork, fire escape miami, custom gates miami, railings miami, hurricane rated ironwork, ironwork florida, south florida ironwork",
  alternates: {
    canonical: "https://kingsironworks.com/miami",
  },
  openGraph: {
    title: "Custom Ironwork & Fire Escapes in Miami, FL | King Iron Works",
    description:
      "South Florida's trusted ironwork specialists. Hurricane-rated gates, railings, fire escapes, and custom fabrication.",
    url: "https://kingsironworks.com/miami",
  },
};

export default function MiamiPage() {
  return <MiamiClient />;
}
