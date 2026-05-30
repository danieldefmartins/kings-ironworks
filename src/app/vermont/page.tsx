import type { Metadata } from "next";
import VermontClient from "./VermontClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in Vermont | King Iron Works",
  description:
    "Vermont's trusted ironwork specialists. Custom gates, railings, fire escapes, and historic restoration. Serving Burlington, Montpelier, Rutland, and all of VT. Call +1 860-740-4242",
  keywords:
    "vermont ironwork, fire escape vermont, custom gates VT, railings vermont, historic restoration burlington, ironwork montpelier vt",
  alternates: {
    canonical: "https://kingsironworks.com/vermont",
  },
  openGraph: {
    title: "Custom Ironwork & Fire Escapes in Vermont | King Iron Works",
    description:
      "Vermont's trusted ironwork specialists. Custom gates, railings, fire escapes, and historic restoration.",
    url: "https://kingsironworks.com/vermont",
  },
};

export default function VermontPage() {
  return <VermontClient />;
}
