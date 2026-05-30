import type { Metadata } from "next";
import PortsmouthClient from "./PortsmouthClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in Portsmouth, NH | King Iron Works",
  description:
    "Portsmouth NH's trusted ironwork specialists. Custom staircases, railings, gates, fencing, and structural steel. Serving Rye, Hampton, Exeter, Dover, and the Seacoast region. Call +1 603-691-3012.",
  keywords:
    "portsmouth ironwork, custom ironwork portsmouth nh, railings rye nh, gates hampton nh, structural steel seacoast new hampshire",
  alternates: {
    canonical: "https://kingsironworks.com/portsmouth",
  },
  openGraph: {
    title: "Custom Ironwork & Fire Escapes in Portsmouth, NH | King Iron Works",
    description:
      "Portsmouth NH's trusted ironwork specialists. Custom staircases, railings, gates, and structural steel.",
    url: "https://kingsironworks.com/portsmouth",
  },
};

export default function PortsmouthPage() {
  return <PortsmouthClient />;
}
